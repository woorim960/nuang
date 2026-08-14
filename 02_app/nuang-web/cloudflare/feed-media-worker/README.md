# NUANG private feed media Worker

This Worker is the only delivery path for objects in the private `FEED_MEDIA`
R2 bucket. It deliberately does not expose R2/S3 presigned GET URLs.

- Every `GET` and `HEAD` requires a short-lived HMAC link created by the NUANG
  server.
- `mode=public` links remain valid for one hour so delayed lazy loading works,
  while the canonical object cache expires after 60 seconds. This limits stale
  bytes after an object is deleted. Signature query parameters are verified
  before the cache is read and are never part of the cache key.
- `mode=private` responses bypass the edge cache and return `private, no-store`.
- `X-Nuang-Cache` reports `HIT`, `MISS`, or `BYPASS`.
- All other methods, non-canonical paths, expired links, duplicate parameters,
  and invalid signatures are rejected.

## Deployment boundary

`wrangler.toml.example` is intentionally not deployable configuration. Before
deployment, create a private R2 bucket, bind it as `FEED_MEDIA`, attach a custom
domain, and add `FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET` with Wrangler secrets.
Use the same secret in the server environment and rotate both sides together.
