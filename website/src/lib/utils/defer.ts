export interface DeferredTaskScheduler {
  setTimeout(callback: () => void, delay: number): unknown;
  clearTimeout(handle: unknown): void;
}

const defaultScheduler: DeferredTaskScheduler = {
  setTimeout: globalThis.setTimeout.bind(globalThis),
  clearTimeout: globalThis.clearTimeout.bind(globalThis),
};

export function scheduleDeferredTask(
  callback: () => void,
  scheduler: DeferredTaskScheduler = defaultScheduler,
): () => void {
  const handle = scheduler.setTimeout(callback, 0);
  return () => scheduler.clearTimeout(handle);
}
