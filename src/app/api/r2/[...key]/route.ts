// Public R2 read proxy. DB stores only the R2 key; every read routes
// through this Worker proxy. Combined with content-addressable nanoid keys
// and `cache-control: public, max-age=31536000, immutable`, this is
// effectively a CDN. See canonical.md Topic 10.
import { env } from "cloudflare:workers";

export async function GET(
  _req: Request,
  { params }: { params: { key: string[] } },
): Promise<Response> {
  const cfEnv = env as unknown as CloudflareEnv;

  if (!cfEnv.STORAGE) {
    return new Response("STORAGE binding not available", { status: 503 });
  }

  // params.key is the catch-all segments array, e.g. ["og", "abc.png"]
  const key = params.key.join("/");
  if (!key) {
    return new Response("Missing key", { status: 400 });
  }

  const object = await cfEnv.STORAGE.get(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  // Fallback content-type if not stored on the object.
  if (!headers.get("content-type")) {
    if (key.endsWith(".png")) headers.set("content-type", "image/png");
    else if (key.endsWith(".jpg") || key.endsWith(".jpeg"))
      headers.set("content-type", "image/jpeg");
    else if (key.endsWith(".webp")) headers.set("content-type", "image/webp");
    else if (key.endsWith(".ico")) headers.set("content-type", "image/x-icon");
    else if (key.endsWith(".svg"))
      headers.set("content-type", "image/svg+xml");
  }
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
}
