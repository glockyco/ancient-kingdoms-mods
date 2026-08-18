import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { scripts: Record<string, string> };

describe("package scripts", () => {
  test("development and production builds publish configured mods", () => {
    expect(packageJson.scripts["publish:mods"]).toBe(
      "dotnet run --project ../build-tool publish-mods",
    );
    expect(packageJson.scripts.predev).toContain("pnpm publish:mods");
    expect(packageJson.scripts.prebuild).toContain("pnpm publish:mods");
  });

  test("cf-deploy deploys the existing build output without rebuilding", () => {
    const script = packageJson.scripts["cf-deploy"];

    expect(script).toContain("wrangler deploy");
    expect(script).not.toMatch(/(^|&&|\()\s*pnpm\s+build\b/);
    expect(script).not.toMatch(/(^|&&|\()\s*vite\s+build\b/);
  });
});
