# Blog Create

Custom Obsidian plugin for the Blog publishing area.

It adds four separate ribbon entries for:

- creating a post;
- creating a food note;
- creating a gallery;
- managing albums created by the iPhone Shortcut.

The published-album manager opens in a wide modal so album titles, links and
actions remain visible. It also includes links for the website and public
gallery.

The upload token is entered once in the album manager and stored in this
plugin's local `data.json` settings file. It is not committed to the blog source
repository. Use **更换令牌** to clear the stored value.

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
