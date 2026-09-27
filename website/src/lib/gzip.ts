/** First two bytes of a gzip member (RFC 1952). */
const GZIP_MAGIC = [0x1f, 0x8b];

/**
 * The bytes of a pre-compressed asset, inflated unless the transport already
 * did it.
 *
 * A host that maps the `.gz` extension to `Content-Encoding: gzip` makes the
 * browser inflate the body before we see it. Sniffing the magic bytes keeps
 * one code path correct on every host, in dev and in production alike.
 */
export async function inflatedBytes(response: Response): Promise<Uint8Array> {
  const body = await response.arrayBuffer();
  const head = new Uint8Array(body, 0, Math.min(2, body.byteLength));
  if (head[0] !== GZIP_MAGIC[0] || head[1] !== GZIP_MAGIC[1]) {
    return new Uint8Array(body);
  }
  const inflated = new Response(body).body!.pipeThrough(
    new DecompressionStream("gzip"),
  );
  return new Uint8Array(await new Response(inflated).arrayBuffer());
}
