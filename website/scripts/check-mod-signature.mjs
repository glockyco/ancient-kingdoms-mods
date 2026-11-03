import { constants, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const manifestPath = fileURLToPath(
  new URL("../static/mods/manifest.json", import.meta.url),
);
const signaturePath = `${manifestPath}.sig`;
const publicKeyPath = fileURLToPath(
  new URL("../../mods/Shared/Updates/release-key.txt", import.meta.url),
);

function readRequired(path, description) {
  try {
    return readFileSync(path);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`${description} is missing: ${path}`, { cause: error });
    }
    throw error;
  }
}

try {
  const signature = readRequired(signaturePath, "Mod list signature");
  const publicKey = createPublicKey({
    key: Buffer.from(
      readRequired(publicKeyPath, "Release public key")
        .toString("ascii")
        .trim(),
      "base64",
    ),
    format: "der",
    type: "spki",
  });
  if (
    !verify(
      "sha256",
      readRequired(manifestPath, "Mod list"),
      { key: publicKey, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(signature.toString("ascii"), "base64"),
    )
  ) {
    throw new Error(
      "Mod list signature does not verify with the release public key.",
    );
  }
} catch (error) {
  console.error(`Cannot deploy mod updates: ${error.message}`);
  process.exitCode = 1;
}
