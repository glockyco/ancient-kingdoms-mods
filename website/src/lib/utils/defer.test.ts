import { describe, expect, test } from "vitest";

import { scheduleDeferredTask } from "./defer";

describe("scheduleDeferredTask", () => {
  test("runs work in a later timer task", () => {
    let queuedCallback: (() => void) | undefined;
    let scheduledDelay: number | undefined;
    let ran = false;

    scheduleDeferredTask(
      () => {
        ran = true;
      },
      {
        setTimeout(callback: () => void, delay: number) {
          queuedCallback = callback;
          scheduledDelay = delay;
          return 1;
        },
        clearTimeout() {},
      },
    );

    expect(scheduledDelay).toBe(0);
    expect(ran).toBe(false);
    if (!queuedCallback) throw new Error("Expected callback to be queued");
    queuedCallback();
    expect(ran).toBe(true);
  });

  test("cancels queued work", () => {
    let queuedCallback: (() => void) | undefined;
    let clearedHandle: number | undefined;
    let ran = false;

    const cancel = scheduleDeferredTask(
      () => {
        ran = true;
      },
      {
        setTimeout(callback: () => void) {
          queuedCallback = callback;
          return 42;
        },
        clearTimeout(handle: number) {
          clearedHandle = handle;
          queuedCallback = undefined;
        },
      },
    );

    cancel();
    queuedCallback?.();

    expect(clearedHandle).toBe(42);
    expect(ran).toBe(false);
  });
});
