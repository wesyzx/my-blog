# Server publishing

The existing LiveSync database remains the source. The exporter uses the existing
encryption key, so the server can decrypt the Vault. Only `Blog/posts/*.md`,
`Blog/food/*.md`, and `Blog/gallery/*.md` with boolean `published: true` and their
referenced files in `Blog/attachments/` are
exported. A transport guard blocks database writes and cross-origin redirects.
No mirror writes back to CouchDB.

The installed reader bundle pins LiveSync tag `1.0.38` (commit
`69105b600a850d14efc991175d3d2c89f8fa4faa`) and Commonlib `0.1.42`.
`DirectFileManipulatorV2` is an internal API: rebuild and validate before updating.
Runtime: verified official Node.js 24.10.0 Linux x64.

After installing dependencies with the official checkout's lockfile and this
repository's lockfile, build and test the actual deployment bundles:

```sh
LIVESYNC_SOURCE_DIR=/path/to/pinned/livesync \
PUBLISHER_BUILD_DIR=/private/build-output \
node ops/obsidian-publisher/build.mjs
PUBLISHER_TEST_SCRIPT=/private/build-output/publish.mjs \
node --test test/obsidian-publish.test.mjs
```

## Installation layout

- `/opt/obsidian-blog-publisher`: root-owned reader and publisher bundles, Python
  wrappers, and the Node executable.
- `/etc/obsidian-blog-publisher`: private reader configuration and one-repository
  writable GitHub deploy key. Never commit or log these files.
- `/var/lib/obsidian-blog-publisher`: private exported snapshot, Git checkout and
  status, owned by the dedicated `obsidian-publisher` account.
- `/var/lib/obsidian-blog-alerts`: root-only notification state.

The oneshot service limits memory to 256 MiB and CPU to 35%; system directories
are read-only. The timer checks once per minute and requires 90 seconds of stable
article content before publishing. Git commits include only `content/obsidian`.
Unrelated changes, conflicts, invalid metadata, missing attachments, or a snapshot
changing during export stop publication and preserve the previous site.
Empty publication and emptying an existing section are rejected to prevent
accidental mass deletion. Templates and nested directories are not exported.

The publisher notices article changes, commits and pushes them to `main`.
EdgeOne must use this repository's `main` branch and must not force
`CONTENT_SOURCE=notion`, `FOOD_CONTENT_SOURCE=notion`, or
`GALLERY_CONTENT_SOURCE=notion`. Its build and deployment are separate from Git
delivery. The checked-in source configuration selects Obsidian for all three
sections.

## Alerts

The existing secure Bark helper sends one notification after three consecutive
failed cycles and one on recovery. Healthy unchanged checks remain silent.
Delivery failure is retried. Messages identify reading/validation or Git submission
failures without note titles, content, secrets or file paths.
These alerts do not detect EdgeOne build failures or guarantee a published page
is reachable. Existing LiveSync monitoring continues separately.

## Operations

```sh
systemctl status obsidian-blog-publisher.timer
systemctl start obsidian-blog-publisher.service
journalctl -u obsidian-blog-publisher.service -n 20 --no-pager
systemctl disable --now obsidian-blog-publisher.timer
```

Keep the old Mac publisher disabled. Never point this process at the original
iCloud or Nutstore Vault. To recover a publication, first stop the timer, inspect
the published files and Git status, and resolve a conflict manually. Do not reset
or overwrite the source database.

R2 backup is independent and is not configured by these files.
