(() => {
  'use strict';

  const SAMPLE = '5 6 2 + * 12 4 / -';
  const OPS = new Set(['+', '-', '*', '/', '^', '%']);
  const $ = (id) => document.getElementById(id);
  const expressionInput = $('expressionInput');
  const loadBtn = $('loadBtn');
  const exampleBtn = $('exampleBtn');
  const message = $('message');
  const tokenStrip = $('tokenStrip');
  const stepBadge = $('stepBadge');
  const progressBar = $('progressBar');
  const actionIcon = $('actionIcon');
  const actionLabel = $('actionLabel');
  const actionTitle = $('actionTitle');
  const actionDescription = $('actionDescription');
  const operationBreakdown = $('operationBreakdown');
  const leftOperand = $('leftOperand');
  const operatorSymbol = $('operatorSymbol');
  const rightOperand = $('rightOperand');
  const operationResult = $('operationResult');
  const stackItems = $('stackItems');
  const stackTopHint = $('stackTopHint');
  const stackCount = $('stackCount');
  const finalResult = $('finalResult');
  const finalValue = $('finalValue');
  const traceBody = $('traceBody');
  const resetBtn = $('resetBtn');
  const prevBtn = $('prevBtn');
  const playBtn = $('playBtn');
  const playIcon = $('playIcon');
  const playText = $('playText');
  const nextBtn = $('nextBtn');
  const speedInput = $('speedInput');
  const speedLabel = $('speedLabel');

  let tokens = [];
  let history = [];
  let currentStep = 0;
  let timer = null;
  let ready = false;
  let lastMessageIsError = false;

  const fmt = (n) => {
    if (Object.is(n, -0)) n = 0;
    if (Number.isInteger(n)) return String(n);
    return String(Number(n.toFixed(6)));
  };

  function setMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle('error', isError);
    lastMessageIsError = isError;
  }

  function parseTokens(source) {
    const trimmed = source.trim();
    if (!trimmed) throw new Error('Please enter a postfix expression first.');
    const parts = trimmed.split(/\s+/);
    const bad = parts.find((part) => !isNumber(part) && !OPS.has(part));
    if (bad !== undefined) {
      throw new Error(`Unknown token “${bad}”. Use numbers and the operators +, -, *, /, ^, or %.`);
    }
    return parts;
  }

  function isNumber(token) {
    return /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(token) && Number.isFinite(Number(token));
  }

  function applyOperator(op, left, right) {
    let result;
    switch (op) {
      case '+': result = left + right; break;
      case '-': result = left - right; break;
      case '*': result = left * right; break;
      case '/':
        if (right === 0) throw new Error('Division by zero is not allowed. Change the expression and try again.');
        result = left / right;
        break;
      case '^': result = left ** right; break;
      case '%':
        if (right === 0) throw new Error('Modulo by zero is not allowed. Change the expression and try again.');
        result = left % right;
        break;
      default: throw new Error(`Unsupported operator: ${op}`);
    }
    if (!Number.isFinite(result)) throw new Error(`The operation ${fmt(left)} ${op} ${fmt(right)} produced a non-finite result.`);
    return result;
  }

  function buildHistory(inputTokens) {
    const stack = [];
    const frames = [{
      step: 0, token: '—', kind: 'start', action: 'Start with an empty stack',
      description: 'The expression is ready. Process one token from left to right.',
      before: [], after: [], operands: null
    }];

    inputTokens.forEach((token, index) => {
      const before = stack.slice();
      if (isNumber(token)) {
        stack.push(Number(token));
        frames.push({
          step: index + 1, token, kind: 'push', action: `Push ${fmt(Number(token))}`,
          description: `“${token}” is an operand, so it is pushed directly onto the top of the stack.`,
          before, after: stack.slice(), operands: null
        });
      } else {
        if (stack.length < 2) {
          throw new Error(`Token “${token}” at position ${index + 1} needs two operands, but the stack has only ${stack.length}.`);
        }
        const right = stack.pop();
        const left = stack.pop();
        const result = applyOperator(token, left, right);
        stack.push(result);
        frames.push({
          step: index + 1, token, kind: 'operator', action: `Calculate ${fmt(left)} ${token} ${fmt(right)}`,
          description: `Pop ${fmt(right)} first as the right operand, then pop ${fmt(left)} as the left operand. Calculate ${fmt(left)} ${token} ${fmt(right)} = ${fmt(result)}, then push ${fmt(result)}.`,
          before, after: stack.slice(), operands: { left, right, op: token, result }
        });
      }
    });

    if (stack.length !== 1) {
      throw new Error(`The expression ends with ${stack.length} values on the stack. A valid postfix expression must leave exactly one value.`);
    }
    return frames;
  }

  function haltPlayback() {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    playIcon.textContent = '▶';
    playText.textContent = 'Play animation';
  }

  function loadExpression() {
    haltPlayback();
    ready = false;
    currentStep = 0;
    history = [];
    tokens = [];
    finalResult.classList.add('hidden');
    operationBreakdown.classList.add('hidden');
    try {
      tokens = parseTokens(expressionInput.value);
      history = buildHistory(tokens);
      ready = true;
      setMessage(`Valid postfix expression • ${tokens.length} tokens • result ${fmt(history[history.length - 1].after[0])}`);
      renderTokenStrip();
      renderTrace();
      renderFrame(0);
      resetBtn.disabled = false;
      prevBtn.disabled = true;
      nextBtn.disabled = false;
      playBtn.disabled = false;
      return true;
    } catch (error) {
      renderTokenStrip();
      renderTrace();
      showInitialState();
      setMessage(error.message, true);
      resetBtn.disabled = true;
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      playBtn.disabled = true;
      ready = false;
      return false;
    }
  }

  function renderTokenStrip() {
    tokenStrip.replaceChildren();
    if (!tokens.length) {
      const span = document.createElement('span');
      span.className = 'muted';
      span.textContent = 'Your tokens will appear here.';
      tokenStrip.append(span);
      return;
    }
    tokens.forEach((token, i) => {
      const el = document.createElement('span');
      el.className = 'token upcoming';
      el.textContent = token;
      el.dataset.tokenIndex = String(i + 1);
      tokenStrip.append(el);
    });
  }

  function renderStack(values) {
    stackItems.replaceChildren();
    stackCount.textContent = `${values.length} ${values.length === 1 ? 'item' : 'items'}`;
    stackTopHint.style.opacity = values.length ? '1' : '.35';
    if (!values.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-stack';
      const symbol = document.createElement('span'); symbol.textContent = '∅';
      const label = document.createElement('p'); label.textContent = 'Stack is empty';
      empty.append(symbol, label);
      stackItems.append(empty);
      return;
    }
    values.slice().reverse().forEach((value, visualIndex) => {
      const item = document.createElement('div');
      item.className = `stack-value${visualIndex === 0 ? ' top-value' : ''}`;
      const valueSpan = document.createElement('span'); valueSpan.textContent = fmt(value);
      const position = document.createElement('span');
      position.className = 'value-position';
      position.textContent = visualIndex === 0 ? 'TOP' : `#${values.length - visualIndex}`;
      item.append(valueSpan, position);
      stackItems.append(item);
    });
  }

  function renderFrame(step) {
    if (!ready || !history[step]) return;
    currentStep = step;
    const frame = history[step];
    renderStack(frame.after);
    stepBadge.textContent = `Step ${step} / ${tokens.length}`;
    progressBar.style.width = `${tokens.length ? (step / tokens.length) * 100 : 0}%`;
    prevBtn.disabled = step === 0;
    nextBtn.disabled = step === tokens.length;
    playBtn.disabled = tokens.length === 0;

    [...tokenStrip.querySelectorAll('.token')].forEach((el) => {
      const tokenIndex = Number(el.dataset.tokenIndex);
      el.classList.toggle('processed', tokenIndex < step + 1 && tokenIndex <= step);
      el.classList.toggle('current', tokenIndex === step && step > 0);
      el.classList.toggle('upcoming', tokenIndex > step);
    });

    if (step === 0) {
      actionIcon.className = 'action-icon neutral'; actionIcon.textContent = 'Ⅱ';
      actionLabel.textContent = 'READY TO BEGIN';
      actionTitle.textContent = 'Start with an empty stack';
      actionDescription.textContent = 'The evaluator reads tokens from left to right. Advance to process the first operand.';
    } else if (frame.kind === 'push') {
      actionIcon.className = 'action-icon push'; actionIcon.textContent = '↑';
      actionLabel.textContent = `TOKEN ${step} • OPERAND`;
      actionTitle.textContent = frame.action;
      actionDescription.textContent = frame.description;
    } else {
      actionIcon.className = 'action-icon operation'; actionIcon.textContent = frame.token;
      actionLabel.textContent = `TOKEN ${step} • OPERATOR`;
      actionTitle.textContent = frame.action;
      actionDescription.textContent = frame.description;
    }

    if (frame.operands) {
      operationBreakdown.classList.remove('hidden');
      leftOperand.textContent = fmt(frame.operands.left);
      operatorSymbol.textContent = frame.operands.op;
      rightOperand.textContent = fmt(frame.operands.right);
      operationResult.textContent = fmt(frame.operands.result);
    } else {
      operationBreakdown.classList.add('hidden');
    }

    if (step === tokens.length) {
      actionIcon.className = 'action-icon done'; actionIcon.textContent = '✓';
      actionLabel.textContent = 'EVALUATION COMPLETE';
      actionTitle.textContent = `Final answer: ${fmt(frame.after[0])}`;
      actionDescription.textContent = 'Exactly one value remains on the stack. That value is the expression result.';
      finalValue.textContent = fmt(frame.after[0]);
      finalResult.classList.remove('hidden');
      if (!lastMessageIsError) setMessage(`Evaluation complete • final result = ${fmt(frame.after[0])}`);
      haltPlayback();
    } else {
      finalResult.classList.add('hidden');
      if (!lastMessageIsError && step > 0) setMessage(`Step ${step} of ${tokens.length} • ${frame.action}`);
    }
    renderTraceHighlight();
  }

  function renderTrace() {
    traceBody.replaceChildren();
    if (!history.length) {
      const tr = document.createElement('tr'); const td = document.createElement('td');
      td.colSpan = 4; td.className = 'trace-empty'; td.textContent = 'Enter a valid expression to generate the processing trace.';
      tr.append(td); traceBody.append(tr); return;
    }
    history.forEach((frame) => {
      const tr = document.createElement('tr');
      tr.dataset.step = String(frame.step);
      const stepTd = document.createElement('td'); stepTd.textContent = String(frame.step);
      const tokenTd = document.createElement('td'); tokenTd.textContent = frame.token;
      const actionTd = document.createElement('td');
      const tag = document.createElement('span');
      tag.className = `action-tag${frame.kind === 'operator' ? ' op' : ''}`;
      tag.textContent = frame.kind === 'start' ? 'START' : frame.kind === 'push' ? 'PUSH' : 'POP + CALCULATE + PUSH';
      actionTd.append(tag);
      const stackTd = document.createElement('td'); stackTd.className = 'stack-inline';
      stackTd.textContent = frame.after.length ? `[${frame.after.map(fmt).join(', ')}]` : '[]';
      tr.append(stepTd, tokenTd, actionTd, stackTd);
      tr.addEventListener('click', () => { haltPlayback(); renderFrame(frame.step); });
      traceBody.append(tr);
    });
    renderTraceHighlight();
  }

  function renderTraceHighlight() {
    [...traceBody.querySelectorAll('tr[data-step]')].forEach((tr) => {
      tr.classList.toggle('active-row', Number(tr.dataset.step) === currentStep);
    });
  }

  function showInitialState() {
    renderStack([]);
    stepBadge.textContent = 'Step 0 / 0';
    progressBar.style.width = '0%';
    actionIcon.className = 'action-icon neutral'; actionIcon.textContent = 'Ⅱ';
    actionLabel.textContent = 'WAITING FOR INPUT';
    actionTitle.textContent = 'Ready to start';
    actionDescription.textContent = 'Correct the expression, then select Evaluate expression.';
    operationBreakdown.classList.add('hidden');
    finalResult.classList.add('hidden');
    tokenStrip.replaceChildren();
    const span = document.createElement('span'); span.className = 'muted'; span.textContent = 'Your tokens will appear here.'; tokenStrip.append(span);
  }

  function stepForward() {
    if (!ready || currentStep >= tokens.length) return;
    lastMessageIsError = false;
    renderFrame(currentStep + 1);
  }
  function stepBackward() {
    if (!ready || currentStep <= 0) return;
    haltPlayback();
    lastMessageIsError = false;
    renderFrame(currentStep - 1);
  }
  function reset() {
    if (!ready) return;
    haltPlayback(); lastMessageIsError = false; renderFrame(0);
    setMessage(`Expression loaded • ${tokens.length} tokens • ready to play`);
  }
  function togglePlayback() {
    if (!ready) return;
    if (timer !== null) { haltPlayback(); return; }
    if (currentStep >= tokens.length) renderFrame(0);
    playIcon.textContent = 'Ⅱ'; playText.textContent = 'Pause animation';
    timer = window.setInterval(() => {
      if (currentStep >= tokens.length) { haltPlayback(); return; }
      lastMessageIsError = false;
      renderFrame(currentStep + 1);
    }, Number(speedInput.value));
  }
  function updateSpeedLabel() {
    const ms = Number(speedInput.value);
    speedLabel.textContent = ms <= 700 ? 'Fast' : ms >= 1500 ? 'Slow' : 'Normal';
    if (timer !== null) {
      haltPlayback();
      togglePlayback();
    }
  }

  loadBtn.addEventListener('click', loadExpression);
  exampleBtn.addEventListener('click', () => { expressionInput.value = SAMPLE; loadExpression(); });
  expressionInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') loadExpression(); });
  resetBtn.addEventListener('click', reset);
  prevBtn.addEventListener('click', stepBackward);
  nextBtn.addEventListener('click', stepForward);
  playBtn.addEventListener('click', togglePlayback);
  speedInput.addEventListener('input', updateSpeedLabel);

  // Load the assignment's example immediately so the page is ready for a live demonstration.
  loadExpression();
})();
