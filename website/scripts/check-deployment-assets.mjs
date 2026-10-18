import { fileURLToPath } from "node:url";
import { getPlatformProxy } from "wrangler";

// Use the platform's asset manifest rules, including the generated exclusions.
const platform = await getPlatformProxy({
  configPath: fileURLToPath(new URL("../wrangler.toml", import.meta.url)),
  persist: false,
  remoteBindings: false,
  envFiles: [],
});
try {
  const response = await platform.env.ASSETS.fetch("http://assets/robots.txt");
  if (response.status !== 200) {
    throw new Error(
      `Built assets are not readable: robots.txt returned ${response.status}`,
    );
  }
  console.log("Cloudflare deployment assets validated.");
} finally {
  await platform.dispose();
}
