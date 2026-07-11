# Codebase Architecture

## Component map

| File | Responsibility |
| --- | --- |
| `manifest.json` | Declares the Manifest V3 extension, permissions, popup, and service worker. |
| `popup.html` / `popup.js` | Provides scan controls and the Quick mode / naming toggles. |
| `scanner.js` | Runs in the active Behance page and returns ordered, deduplicated project image URLs. |
| `background.js` | Runs Quick mode through `chrome.downloads` and enforces the selected filename. |
| `downloader.html` / `downloader.js` | Runs folder mode, opens the native directory picker, fetches image blobs, and writes them to the selected directory. |

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

The popup stores the scan result in `chrome.storage.session` and opens `downloader.html`. That page calls `showDirectoryPicker({ mode: "readwrite" })` after the user clicks **Choose folder**. It fetches each image and writes its blob to the selected `FileSystemDirectoryHandle`.

Folder mode does not overwrite existing files. A collision becomes `image 1 (1).jpg`, for example.

## Naming

With the original-name toggle off, names are `image 1.ext`, `image 2.ext`, and so on. With it on, the extension uses the final filename segment from the Behance CDN URL. Both modes preserve the image order returned by the scanner.

## Validation

Run syntax checks after JavaScript changes:

```powershell
node --check popup.js
node --check scanner.js
node --check downloader.js
node --check background.js
```

Then reload the unpacked extension in Chrome and manually test one Behance project in both download modes.
