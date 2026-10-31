# Codebase Architecture

## Component map

| File | Responsibility |
| --- | --- |
| `manifest.json` | Declares the Manifest V3 extension, permissions, popup, and service worker. |
| `popup.html` / `popup.js` | Scans the active tab when opened. Holds the destination choice (Downloads or any folder, stored as `quickMode`), naming, and project-folder switches, remembered in `chrome.storage.local`. One primary button carries the flow: save, scan again, or downloads started. |
| `ui.css` / `ui.js` | Shared monochrome tokens (light and dark), the primary button with its progress fill, and `setLabel()`, which blurs in only the characters that change in a button label. |
| `scanner.js` | Runs in the active Behance page and returns the project title plus ordered, deduplicated project image URLs. |
| `filenames.js` | Shared filename helpers: numbered and original names, and the sanitized project folder name. Loaded by `background.js` (`importScripts`) and `downloader.html`. |
| `background.js` | Runs Quick mode through `chrome.downloads` and enforces the selected filename. |
| `downloader.html` / `downloader.js` | Runs folder mode: shows the images as a grid, opens the native directory picker on the first click and starts saving at once, four at a time. Tiles turn solid as each file is written; failed ones can be retried into the same folder. |

## Scan pipeline

1. The popup injects `scanner.js` into the active Behance tab.
2. The scanner reads only `.js-project-module--image` containers, in DOM order.
3. Each image module contributes its loaded image URLs.
4. Network resource entries are considered only when they match an image already found in a project module; this lets the scanner upgrade an image to a better CDN size without adding unrelated page assets.
5. Variants are grouped by their asset filename. The preferred path order is `max_3840`, `2800`, `1400`, then `fs_webp`.

## Download modes

### Quick mode

The popup sends the scan result to `background.js`. The service worker uses `chrome.downloads.download()` to save each URL in the standard Chrome Downloads location. `onDeterminingFilename` applies either the numbered or original filename option.

### Folder mode

The popup stores the scan result in `chrome.storage.session` and opens `downloader.html`. That page calls `showDirectoryPicker({ mode: "readwrite" })` after the user clicks **Save images to…**, then starts writing right away. It fetches each image and writes its blob to the selected `FileSystemDirectoryHandle`.

Folder mode does not overwrite existing files. A collision becomes `image 1 (1).jpg`, for example.

## Naming

With the project-folder toggle on (the default), both modes save into a subfolder named after the project title (`og:title`, sanitized for Windows). Quick mode puts it under Downloads; folder mode creates it inside the chosen folder. Numbered names are zero-padded to the image count, so `image 01.jpg` sorts before `image 10.jpg`.

With the original-name toggle off, names are `image 1.ext`, `image 2.ext`, and so on. With it on, the extension uses the final filename segment from the Behance CDN URL. Both modes preserve the image order returned by the scanner.

## Validation

Run syntax checks after JavaScript changes:

```powershell
node --check popup.js
node --check scanner.js
node --check downloader.js
node --check filenames.js
node --check background.js
```

Then reload the unpacked extension in Chrome and manually test one Behance project in both download modes.
