# Postfix Expression Stack Visualizer

A browser-based college activity demo for stack-based postfix expression evaluation. It animates operand pushes, operator pops, calculations, and the resulting stack state after each token.

## Run locally on Windows

1. Extract the ZIP file to a folder.
2. Double-click `run_localhost.bat`.
3. When the server starts, open **http://localhost:8000** in Chrome or Edge.
4. Keep the black command window open while using the webpage. Press `Ctrl+C` in that window to stop the local server.

Python is needed for the local-server launcher. Alternatively, open `index.html` directly in a modern browser; the visualizer itself has no package installation or build step.

## How to demonstrate it

1. The assignment expression is already loaded: `5 6 2 + * 12 4 / -`.
2. Select **Evaluate expression** after entering an expression. The webpage validates the tokens and builds the processing log.
3. Use **Play animation**, **Step forward**, **Step backward**, and **Reset** to walk through each operation.
4. Click any row in the processing log to jump to that exact step.
5. Adjust the animation speed or type a different expression to show that the evaluation is dynamic.

## Supported input

- Integers, decimals, and negative values: `12`, `3.5`, `-4`, `.25`
- Operators: `+`, `-`, `*`, `/`, `^` (power), `%` (remainder)
- Separate every number and operator with whitespace.

Example:

```text
5 6 2 + * 12 4 / -
```

Expected result: `37`

## Input validation

The evaluator reports unknown tokens, insufficient operands, division/modulo by zero, non-finite results, and expressions that do not leave exactly one value on the stack.

## Algorithm and complexity

Read tokens from left to right. Push each operand. For an operator, pop the right operand first and then the left operand, calculate `left operator right`, and push the result. A valid expression ends with exactly one stack value. With `n` tokens, time complexity is `O(n)` and worst-case auxiliary space is `O(n)`.
