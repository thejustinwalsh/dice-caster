# DiceCaster

> Dice rolling api with nice distribution 🎲

## ENV

```env
HOST=https://<origin>
REDIS_URL=https://<upstash-project>.upstash.io
REDIS_TOKEN=<upstash-token>
```

## API

### GET /api/roll/`{dice}`d`{faces}`+`{modifier}`

> Roll a `dice` with **_d_** `faces` and add an optional `modifier` to the result

```json5
// https://localhost:3000/api/roll/3d6
{
  dice: [1, 2, 3],
  total: 6,
}

// https://localhost:3000/api/roll/3d6+1
{
  dice: [1, 2, 3],
  total: 7,
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
