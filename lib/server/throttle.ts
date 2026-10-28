/**
 * Runs jobs one at a time with a minimum gap between starts.
 * Used for public Nominatim, whose policy allows at most 1 request/second for the whole app.
 */
export class ThrottleBusyError extends Error {
  constructor() {
    super("Too many queued requests");
    this.name = "ThrottleBusyError";
  }
}

export type Scheduler = <T>(job: () => Promise<T>) => Promise<T>;

export function createSerialThrottle(opts: {
  minIntervalMs: number;
  maxQueue: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}): Scheduler {
  const now = opts.now ?? (() => Date.now());
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let chain: Promise<unknown> = Promise.resolve();
  let lastStart = -Infinity;
  let pending = 0;

  return function schedule<T>(job: () => Promise<T>): Promise<T> {
    if (pending >= opts.maxQueue) return Promise.reject(new ThrottleBusyError());
    pending += 1;
    const run = async (): Promise<T> => {
      try {
        const wait = lastStart + opts.minIntervalMs - now();
        if (wait > 0) await sleep(wait);
        lastStart = now();
        return await job();
      } finally {
        pending -= 1;
      }
    };
    const p = chain.then(run, run);
    chain = p.catch(() => undefined);
    return p;
  };
}
