/**
 * A fetch that never responds until aborted. Holds a timer open the way a real pending
 * socket does; AbortSignal.timeout's own timer is unref'd and would otherwise let Node exit.
 */
export const hangingFetch: typeof fetch = (_url, init) =>
  new Promise((_resolve, reject) => {
    const keepAlive = setTimeout(() => {}, 60_000);
    init?.signal?.addEventListener("abort", () => {
      clearTimeout(keepAlive);
      reject(init.signal?.reason);
    });
  });
