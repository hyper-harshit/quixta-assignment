/**
 * Returns a function that runs async tasks one after another, in the order
 * they were handed in. Storage helpers use it so a read-change-write never
 * interleaves with another one on the same key.
 */
export function createSerial(): <T>(task: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();
  return function inOrder<T>(task: () => Promise<T>): Promise<T> {
    const run = tail.then(task, task);
    tail = run.catch(() => undefined);
    return run;
  };
}
