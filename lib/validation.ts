import {NextResponse} from 'next/server';
import {PipeFunction} from 'next-route-handler-pipe';
import {z} from 'zod';

export const validateParams = (
  zodSchema: z.ZodSchema,
  hint: boolean = false,
): PipeFunction<{data: any}> => {
  return async function (req, params, next) {
    const validation = zodSchema.safeParse(params?.params);
    if (validation.success) {
      req.data = validation.data;
      return await next();
    }

    console.error(`${req.url} - validation error: ${validation.error}`);
    return NextResponse.json(
      {error: 'validation error', hint: hint ? validation.error : undefined},
      {status: 400},
    );
  };
};

export const validateSearch = (
  zodSchema: z.ZodSchema,
  hint: boolean = false,
): PipeFunction<{data: any}> => {
  return async function (req, _, next) {
    const {searchParams} = new URL(req.url);
    const validation = zodSchema.safeParse(Object.fromEntries(searchParams));
    if (validation.success) {
      req.data = validation.data;
      return await next();
    }

    console.error(`${req.url} - validation error: ${validation.error}`);
    return NextResponse.json(
      {error: 'validation error', hint: hint ? validation.error : undefined},
      {status: 400},
    );
  };
};

export const validateBody = (
  zodSchema: z.ZodSchema,
  hint: boolean = false,
): PipeFunction<{data: any}> => {
  return async function (req, _, next) {
    const validation = zodSchema.safeParse(await req.json());
    if (validation.success) {
      req.data = validation.data;
      return await next();
    }

    console.error(`${req.url} - validation error: ${validation.error}`);
    return NextResponse.json(
      {error: 'validation error', hint: hint ? validation.error : undefined},
      {status: 400},
    );
  };
};
