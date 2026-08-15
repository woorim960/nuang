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

`wrangler.toml` is a secret-free deployment skeleton for Wrangler 4.123. It
contains no Cloudflare account identifier and deliberately disables
`workers.dev`. Before deployment:

1. Activate `nuang.app` as a Cloudflare zone and create the private
   `nuang-feed-media` R2 bucket. Do not enable `r2.dev` or an R2 custom domain.
2. Authenticate Wrangler interactively. Never commit the generated login state.
3. Add `FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET` as a Worker secret. Use the same
   32+ character secret in the server environment. Do not rotate the current
   and previous values with sequential `secret put` commands: an intermediate
   deployment can reject every old link or make equal secrets fail closed.
   Instead, create a version with one encrypted `--secrets-file` containing
   `current=new` and `previous=old`, deploy that version, switch the app signer
   to `new`, wait at least one hour, then use one `wrangler secret bulk` JSON
   request containing `current=new` and `previous=null`. Keep the temporary
   file outside the repository with mode `0600`, then securely remove it.
4. Validate the config with `npm run r2:worker:validate` before the first real
   deployment. This wraps Wrangler's local `deploy --dry-run`; the committed
   route reserves `media.nuang.app` as a Worker Custom Domain.
5. Deploy the Worker only after the bucket, zone, and cost alerts are verified.

No credential, account identifier, or signing secret belongs in a Wrangler
config file.

## Blackout smoke test

`scripts/smoke-feed-media-r2.mjs` is a fail-closed, destructive-but-cleaning
probe for the private bucket and signed delivery Worker. It accepts exactly one
mode:

```sh
npm run r2:smoke:dry-run
npm run r2:smoke
npm run r2:smoke:test
```

The script loads `.env`, then `.env.local`, then exported process variables
(highest precedence), matching the production monitor convention. `--dry-run`
validates the complete R2 environment without making network requests. It can
run in dark-smoke mode while `FEED_MEDIA_WRITE_PROVIDER=supabase` and no canary
account is configured. The validation requires a separate analytics token and
keeps both all-customer rollout flags explicitly false. Selecting R2 as the
write provider also requires `FEED_MEDIA_R2_PRIVACY_REVIEW_APPROVED=true`, which
asserts that the Cloudflare DPA and privacy notice review are complete.
`--execute` additionally requires those values and then:

- uploads a tiny valid WebP under a unique, immutable, non-personal test key;
- verifies invalid signatures, private cache bypass, public cache fill/hit, and
  the exact response digest and byte length;
- deletes the object, confirms a private read returns 404, and attempts cleanup
  again in `finally` on every path.

The script writes one aggregate JSON result only. It never prints credentials,
object keys, signed URLs or query strings, or response bodies. Run it only from
an approved operator environment. A successful dry run is not proof that the
external Worker or bucket exists.
