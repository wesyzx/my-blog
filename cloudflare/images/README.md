# Blog image WebP Worker

This Worker exposes a WebP view of the existing `blog-images` R2 bucket and the
authenticated gallery endpoints used by the iPhone Shortcut.
The original JPEG, PNG and other R2 objects stay unchanged. The public URL keeps
the original object key, so the Obsidian plugin can insert a `.webp` public URL
without renaming or overwriting the uploaded object.

## Why a separate service

The existing public image domain is fronted by EdgeOne and returns the original
JPEG even when the browser sends `Accept: image/webp`. Cloudflare's Images
transformation URL also failed to return WebP for this zone, while image resizing
was active. A dedicated Worker avoids weakening the existing CDN cache and gives
the blog an explicit WebP URL contract.

The Worker uses the `/webp/*` route on the existing Cloudflare-owned image origin.
This leaves the origin's original object paths untouched while allowing the
EdgeOne-backed `img.guanyan.me/webp/*` address to be tested separately.

## Request contract

The current contract is the versioned variant route emitted by
`lib/blog-images.mjs`:

```
/webp/v2/{preset}/{width}/{focus}/blog/obsidian/{key}
/webp/v2/original/blog/obsidian/{key}
/webp/v2/info/blog/obsidian/{key}
```

`preset` controls framing, `width` is the requested box, and `focus` selects the
crop anchor. `fit` and `full` keep the source aspect ratio (so `focus` is pinned
to `center`); the others crop to a fixed ratio:

| preset | ratio | used by |
| --- | --- | --- |
| `fit` | source | body images, covers, gallery rows |
| `full` | source, long edge ≤ 3840 | lightbox |
| `square` | 1:1 | short-note photo tiles |
| `landscape` | 4:3 | food cards, two-up gallery moments |
| `wide` | 16:9 | single-column wide frames |
| `cover` | 3:1 | list-page post cover stream |
| `banner` | 2:1 | article and food detail heroes |
| `content` | 16:10 | inline `cover` images |

Cropping uses `fit: crop` with `gravity` (`auto`, `face`, `center`, `top`).
`crop` fills and crops like `cover` but never upscales, so a small source is not
blown up into blur; the card CSS still covers whatever comes back. `full` caps
both width and height at 3840, because bounding only the width would let a
portrait decode to roughly 5760 px tall in the lightbox.

For `center`, gravity is omitted to use the documented default; crop anchors
are sent only for `auto`, `face`, or `top`.

Quality is part of the preset contract: 75 for tiles and cards, 82 for `full`.

- Versioned raster variants always return `image/webp`, regardless of `Accept`.
  Live validation showed EdgeOne reusing a cached WebP for `Accept: image/jpeg`
  despite `Vary: Accept`. Fixed-format paths remove this cache-key dependency.
  The Images binding was verified to encode WebP for generic Accept requests.
- The public link may retain `.webp`; the Worker maps it to the original `.jpg`,
  `.jpeg`, `.png`, `.gif`, `.svg` or `.webp` object.
- `/webp/v2/original/...` explicitly serves stored bytes, and is also the target
  for temporary conversion-error fallbacks. Legacy negotiation is retained only
  on old `/webp/blog/...` URLs; the blog emits v2 URLs.
- Encoder errors (including exhausted quota) redirect to the same separate
  original route with `Cache-Control: no-store`; original bytes never receive a
  variant ETag or get stored under the thumbnail URL. R2 outages still return
  a non-cacheable 502. Redirects are relative to preserve the public EdgeOne host.
- `/webp/v2/info/...` reports real dimensions (plus format and size) via the
  free `.info()` call, for layout-stable `width`/`height` attributes.
- SVG sources are passed through untouched: Cloudflare Images cannot decode
  vectors, and `info` answers `415` for them.
- `HEAD` returns the same metadata for either representation, without a body.
- `/health` is a small, uncached health check.
- `/internal/gallery/albums` creates a private album record. The Shortcut then
  uploads each converted JPEG to `/internal/gallery/albums/{id}/photos`.
- `/internal/gallery/albums/{id}/publish` marks the album public before calling
  `EDGEONE_DEPLOY_WEBHOOK`. A webhook failure restores the prior private state.
- `/webp/gallery-manifest` returns only published albums and uses
  `Cache-Control: no-store`. The site combines them with Obsidian albums.

All `/internal/gallery/*` requests require
`Authorization: Bearer $GALLERY_UPLOAD_TOKEN`. The Worker route must therefore
cover both:

```text
img.215320.xyz/webp/*
img.215320.xyz/internal/gallery/*
```

Album records stay under the private R2 prefix `internal/gallery/albums/`.
Photos retain their uploaded bytes under
`blog/obsidian/gallery/{year}/{month}/{slug}/`; `.webp` is a public view generated
at request time. The API allows 100 photos per album and 20 MiB per photo, the
Images binding's documented input limit. The iPhone Shortcut converts HEIC to
JPEG first. The Worker also accepts `image/heic` and `image/heif` for Enterprise
Cloudflare Images plans that can decode them.

Legacy links (`/webp/blog/obsidian/...`) keep working. The old Next.js loader
appends `?imageMogr2/thumbnail/{w}x/quality/{q}/format/webp`; the Worker parses
those two numbers and snaps them onto fixed ladders: the requested width rounds
up to the next Next.js size (32 … 384, 640 … 2400) and quality rounds to the
nearest of 60/70/75/80/82/90. For legacy links the non-WebP fallback stays
`Cache-Control: no-store` with `Vary: Accept`, since there is no separate URL to
send it to.

## Cache keys and quota

Every transformed response variant carries an ETag that includes the preset, width, focus and
quality, so a tile and a hero never share a validator. Successful variants are
`public, max-age=31536000, immutable`.

Widths outside the ladder are rejected (`404`) rather than snapped, because the
URL is the cache key and must describe exactly one output. Clamping alone would
still leave 2,400 possible widths per image, so a crawler walking
`thumbnail/1x` … `thumbnail/2400x` could exhaust the monthly quota.

Cloudflare Images Free includes 5,000 unique transformations per month. Repeated
requests for the same image and parameters count once per calendar month, and the
site emits a fixed set of widths for its `srcset`, so normal browsing requests only the sizes actually selected by browsers.
The theoretical ceiling remains hundreds of combinations per image across all
presets and focal points: bounded widths are not a monthly spending cap.
Quality and format do not create separate billable transformations under the
current pricing rules. Free-plan overage rejects new conversions; an Images
Paid plan charges $0.50 per 1,000 beyond the included 5,000. Worker, R2 and
EdgeOne costs are separate. Versioned variants are explicit WebP resources and do not negotiate output format.

Deploy with:

```sh
pnpm dlx wrangler@latest secret put GALLERY_UPLOAD_TOKEN --config cloudflare/images/wrangler.jsonc
pnpm dlx wrangler@latest secret put EDGEONE_DEPLOY_WEBHOOK --config cloudflare/images/wrangler.jsonc
pnpm dlx wrangler@latest deploy --config cloudflare/images/wrangler.jsonc
```

No credentials belong in this directory. Authentication stays in the local
Wrangler profile or the Cloudflare dashboard.

## Rollout and verification

See [the deployment assessment](../../docs/image-pipeline.md) for observed live
responses, required EdgeOne rules, deploy order, visual checks and rollback.
Deploy the v2 Worker before publishing a site that emits v2 URLs. The deployment
assessment records verification and the rollback version.
