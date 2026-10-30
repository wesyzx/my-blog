# Blog Create

Custom Obsidian plugin for the Blog publishing area.

It adds one **发布管理** ribbon entry and command. From that hub you can:

- create a post, food note, or gallery from the templates in `Blog/templates/`;
- open the website and public gallery;
- load albums created by the iPhone Shortcut;
- permanently delete a Private or published album.

The upload token is entered in the album manager and kept only in memory for
the current Obsidian session. It is never written to plugin settings, the
Vault, LiveSync, or Git.

## Install

Copy `main.js`, `manifest.json`, and `styles.css` into:

```text
<Vault>/.obsidian/plugins/blog-create/
```

Then run **Reload app without saving** from the Obsidian command palette, or
disable and re-enable **Blog Create** under Community plugins.

The album manager calls `https://img.215320.xyz/internal/gallery/albums`. Those
endpoints require the same `GALLERY_UPLOAD_TOKEN` used by the iPhone Shortcut.
Deleting a published album triggers an EdgeOne rebuild.
