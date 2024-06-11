import {NextRequest, NextResponse} from 'next/server';
import {pipe} from 'next-route-handler-pipe';
import {MersenneTwister19937, integer} from 'random-js';
import {z} from 'zod';

import {validateParams} from '@/lib/validation';

export const dynamic = 'force-dynamic';

const parser = /(?<num>\d+)?d(?<sides>\d+)(?<mod>[\+\-]\d+)?/i;
const schema = z.object({
  notation: z
    .string()
    .regex(parser)
    .transform(value => {
      const match = parser.exec(value)?.groups;
      return {
        num: parseInt(match?.num ?? '1'),
        sides: parseInt(match?.sides ?? '6'),
        mod: match?.mod ? parseInt(match.mod) : undefined,
      };
    })
    .pipe(
      z.object({
        num: z.number().min(1, 'must roll at least 1 dice').max(100, 'cannot roll more than 100 dice'),
        sides: z.number().min(2, 'dice must have at least 2 sides').max(120, 'dice cannot have more than 120 sides'),
        mod: z.number().default(0),
      }),
    ),
});

type Roll = z.infer<typeof schema>;

export const GET = pipe(validateParams(schema, true), async (request: NextRequest & {data: Roll}) => {
  console.log(request.data, request.data.notation);
  const {num, sides, mod} = request.data.notation;
  const engine = MersenneTwister19937.autoSeed();
  const distribution = integer(1, sides);

  const dice = Array.from({length: num}, () => distribution(engine));
  const total = dice.reduce((acc, roll) => acc + roll, 0) + mod;

  return NextResponse.json({dice, total}, {status: 200});
});
