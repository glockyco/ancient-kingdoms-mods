import { expect, test, vi } from "vitest";
import { fetchGameVersion } from "./game-version";

test("returns a failure result when the Steam request times out", async () => {
  const nativeTimeout = AbortSignal.timeout.bind(AbortSignal);
  const timeout = vi
    .spyOn(AbortSignal, "timeout")
    .mockImplementation(() => nativeTimeout(10));
  let aborted = false;
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
    (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => {
            aborted = true;
            reject(init.signal?.reason);
          },
          { once: true },
        );
      }),
  );

  try {
    expect(await fetchGameVersion()).toEqual({ ok: false });
    expect(aborted).toBe(true);
  } finally {
    fetchSpy.mockRestore();
    timeout.mockRestore();
  }
});
