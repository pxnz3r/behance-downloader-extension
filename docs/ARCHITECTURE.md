# Codebase Architecture

## Component map

| File | Responsibility |
| --- | --- |
| `manifest.json` | Declares the Manifest V3 extension, permissions, icons, popup, and service worker. |
| `popup.html` / `popup.js` | Launcher. Scans the active tab when opened, shows the project title and image count, and opens the picker page. Offers **Scan again** when nothing loaded. |
| `scanner.js` | Injected into the Behance tab; its last expression is the result. Returns the project title and, per image, the largest URL, a small preview URL, and the aspect ratio. |
| `downloader.html` / `downloader.js` | The picker page: masonry grid of previews, selection (click, shift-click range, select all, Ctrl+A, Esc), destination and naming options remembered in `chrome.storage.local` (`saveOptions`), and saving. |
| `background.js` | Saves to Downloads through `chrome.downloads` and enforces the planned filenames. |
| `filenames.js` | Numbered and original filenames, and the sanitized project folder name. Loaded by `background.js` (`importScripts`) and `downloader.html`. |
| `ui.css` / `ui.js` | Shared tokens (warm monochrome, light and dark), the bundled Instrument Sans face, the primary button with its progress fill, and `setLabel()`, which blurs in only the characters that changed. |

## Scan pipeline

1. The popup injects `scanner.js` into the active Behance tab with one `executeScript` call.
2. The scanner reads every rendered `img` and `source` element in DOM order, including `srcset` and lazy-load attributes.
3. Only URLs under `/project_modules/` count; recommendation covers (`/projects/`) and avatars (`/user/`) are skipped by path.
4. Network resource entries are added only for images already found, which can supply a larger variant.
5. Variants are grouped by asset filename and ranked by the width in the size segment (`source`, `max_3840`, `fs` = 1920, `1400`, `disp` = 600). The largest is saved; the smallest at least 600 wide is the preview.
6. The aspect ratio comes from the rendered image (`naturalWidth`/`naturalHeight`, else its `width`/`height` attributes; 4:5 when unknown).

## Picker page

Tiles get their aspect ratio before the preview loads, so the masonry layout is computed once (each tile into the shortest column) and nothing shifts while images arrive. Unloaded tiles show a shimmer; loaded previews fade in. The layout is recomputed only when the column count changes.

## Saving

Images are numbered in project order among the selected ones, so picking 12 images gives `image 01` to `image 12`.

- **Downloads:** the page sends the selected images to `background.js`, which calls `chrome.downloads.download()` for each. `onDeterminingFilename` applies the planned name.
- **Any folder:** `showDirectoryPicker()` runs on the save click and saving starts at once, four images at a time. Each response body is piped straight into the file's writable stream. Failed images are marked on their tiles and can be retried into the same folder. Existing files are never overwritten; a collision becomes `image 01 (1).jpg`.

With **Project folder** on (the default), both destinations use a subfolder named after the project title (`og:title`, sanitized for Windows).

## Validation

Run syntax checks after JavaScript changes:

```powershell
node --check popup.js
node --check scanner.js
node --check downloader.js
node --check filenames.js
node --check background.js
node --check ui.js
```

Then reload the unpacked extension in Chrome and test one Behance project with both destinations.
