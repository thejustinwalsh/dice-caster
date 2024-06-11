# DiceCaster

> Dice rolling api with nice distribution 🎲

## API

### GET /roll/[dice]d[faces]+[modifier]?

> Roll a `dice` with **_d_** `faces` and add a `modifier` to the result

```json5
// https://localhost:3000/roll/2d6+1
{
  dice: [4, 6],
  total: 11,
}
```

## Getting Started

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```
