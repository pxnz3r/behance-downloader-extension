# Behance Downloader Extension

A Manifest V3 Chrome extension for downloading the image modules from the Behance project currently open in your browser.

It finds only Behance project image modules, removes size duplicates, prefers the highest-quality available variant, preserves the project order, and saves files with either simple numbered names or their original CDN names.

> Only download content you are authorized to use.

## Features

- Scans the current Behance project in project order.
- Restricts discovery to Behance image-module containers to avoid recommendation and cached-page assets.
- Deduplicates size variants and prefers `max_3840`, then `2800`, `1400`, and `fs_webp`.
- **Quick mode** downloads directly to Chrome's Downloads folder.
- **Folder mode** opens the native Windows folder picker, so you can choose any destination.
- Choose between `image 1.jpg`, `image 2.jpg`, and so on, or the original Behance CDN filenames.
- Avoids overwriting files in folder mode by adding a suffix when needed.

## Install

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository folder.

After any code change, click the extension's **Reload** button on the extensions page.

## Use

1. Open a Behance project and scroll through it once so the project images load.
2. Open the extension and choose your options:
   - Enable **Quick mode** to save to Downloads immediately.
   - Enable **Keep original image names** to retain Behance's filenames.
3. Click **Scan page**.
4. Click the download button:
   - In Quick mode, downloads start in Chrome's Downloads folder.
   - Otherwise, choose any folder in the native picker, then confirm the download.

## Permissions

- `activeTab` and `scripting`: scan the currently open Behance project.
- `storage`: pass the scanned image list and filename preference between extension pages.
- `downloads`: save Quick mode files to the Chrome Downloads folder.
- Behance and its image CDN host permissions: access project markup and image files.

## Development

No build step or third-party packages are required. Validate the JavaScript files with:

```powershell
node --check popup.js
node --check scanner.js
node --check downloader.js
node --check background.js
```

See [codebase documentation](docs/ARCHITECTURE.md) for the component map and data flow.
