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
An entirely empty source is rejected. If only one section becomes empty, its
previous published Markdown and referenced attachments are retained while other
sections continue updating. The status records `held_sections` and
`effective_counts`, and notifications identify the hold. Shared attachment paths
with different bytes stop publication rather than overwriting retained content.
Templates and nested directories are not exported.

`Blog/gallery/相册同步记录.md` is the sole unpublished control-file exception.
The reader validates its version/type/album IDs and exports it with the approved
snapshot. The publisher includes it in the content revision and Git commit.
IDs are monotonic: loss of a previously exported registry/ID stops publication.
Once claimed, a phone album uses only its editable top-level Vault note.
Removing a media embed, unpublishing a note, emptying its media list, or deleting
the note removes the corresponding public content at the next build; the R2
manifest cannot restore it. Keep this record when deleting an album.
R2 objects remain available for recovery and are not garbage-collected here.
Video embeds retain media metadata and use the same pipeline as photos.
Reader/publisher/site/plugin must be upgraded together for this control contract.

Only pending commits with the publisher's known commit subject, touching only
`content/obsidian`, and containing no merge commits may be replayed. If remote
history changed any publication path, automatic reconciliation stops. Independent
website changes are fetched and pending publisher commits are replayed before a
normal push, including a bounded retry when a push races with a remote update.
No force push or source database write is used.

The publisher notices article changes, commits and pushes them to `main`.
EdgeOne must use this repository's `main` branch and must not force
`CONTENT_SOURCE=notion`, `FOOD_CONTENT_SOURCE=notion`, or
`GALLERY_CONTENT_SOURCE=notion`. Its build and deployment are separate from Git
delivery. The checked-in configuration selects Obsidian for posts and food, and
hybrid Obsidian/R2 for gallery. Keep the server as the only automatic Obsidian Git
writer; the iPhone uploader writes album records to R2, not this checkout.

## Publication verification

`publication-result.json` contains only content digests, counts and held section
names. `status.json` separates `git_status: submitted` from `site.status`:
`waiting`, `verified`, or `delayed` after 15 minutes without confirmation.
`verify_site.py` checks the deployed `/publish-status.json` with a cache-busting
query and compares the approved content digest. It runs on idle cycles too, so
verification continues after the Git delivery has completed. Network failure
leaves the site unverified without changing the Git delivery result.

The build marker contains only the Git revision, approved-content digest and
public album IDs/digests. No private titles, paths, credentials or source note
contents are included. R2 manifest fetches fail the build by default; the
explicit `GALLERY_ALLOW_STALE=1` preview mode marks its gallery unverified.
For phone albums, the Worker also checks the actual album page's content
revision before reporting `site_updated`. Existing shortcuts open the returned
status page without needing reinstallation; `albumUrl` is the canonical album URL.

## Alerts

The existing secure Bark helper sends one notification after three consecutive
failed cycles and one on recovery. Healthy unchanged checks remain silent.
Delivery failure is retried. Messages identify reading/validation or Git submission
failures without note titles, content, secrets or file paths.
Held sections and a deployment unverified for over 15 minutes are deduplicated
notices. Site verification detects missing content versions, not the provider's
internal build job status. Existing LiveSync monitoring continues separately.

Upgrade the publisher bundle and its Python helpers together. A gallery-control
upgrade also requires explicitly rebuilding and validating the pinned reader;
preserve its pinned LiveSync/Commonlib versions.
The helpers include `failure_reasons.py` and `verify_site.py`. Keep a root-only
backup, pause the timer, wait for the running service to finish, validate the new
publisher with `--dry-run` as `obsidian-publisher`, then restore the timer.

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
