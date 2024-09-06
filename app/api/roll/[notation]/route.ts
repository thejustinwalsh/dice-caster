import {NextRequest, NextResponse} from 'next/server';
import {pipe} from 'next-route-handler-pipe';
import {MersenneTwister19937, integer} from 'random-js';
import {z} from 'zod';

import {validateParams} from '@/lib/validation';

export const dynamic = 'force-dynamic';

const parser = /(?<num>\d+)d(?<sides>\d+)(?<mod>[\+\-]\d+)?/i;
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
        num: z
          .number()
          .min(1, 'must roll at least 1 dice')
          .max(100, 'cannot roll more than 100 dice'),
        sides: z
          .number()
          .min(2, 'dice must have at least 2 sides')
          .max(120, 'dice cannot have more than 120 sides'),
        mod: z.number().default(0),
      }),
    ),
});

type RollData = z.infer<typeof schema>;

/**
 * @openapi
 * /api/roll/{num}d{sides}{mod}:
 *   get:
 *     description: Roll a number of dice with a given notation
 *     tags: [roll]
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: num
 *         in: path
 *         description: Number of dice to roll
 *         required: true
 *         schema:
 *           type: integer
 *       - name: sides
 *         in: path
 *         description: Number of sides on each die
 *         required: true
 *         schema:
 *           type: integer
 *       - name: mod
 *         in: path
 *         description: Modifier to add or subtract from the total
 *         required: false
 *         allowReserved: true
 *         allowEmptyValue: true
 *         schema:
 *           type: string
 *           pattern: ^[\+\-]\d+$
 *         examples:
 *           zero:
 *            summary: No Modifier
 *           postive:
 *             value: "+1"
 *             summary: Add 1 to the total
 *           negative:
 *             value: "-1"
 *             summary: Subtract 1 from the total
 *     responses:
 *       200:
 *         description: OK
 */
export const GET = pipe(
  validateParams(schema, true),
  async (req: NextRequest & {data: RollData}) => {
    const {num, sides, mod} = req.data.notation;
    const engine = MersenneTwister19937.autoSeed();
    const distribution = integer(1, sides);

    const dice = Array.from({length: num}, () => distribution(engine));
    const total = dice.reduce((acc, roll) => acc + roll, 0) + mod;

    return NextResponse.json({dice, total}, {status: 200});
  },
);
