# Behance Downloader Extension

Chrome extension that saves every image in the Behance project you have open, in project order, at the best available size.

> Only download content you are authorized to use.

## What it does

- Reads only the project's image modules, so recommendations and cached page assets are skipped.
- Keeps one file per image and picks the largest variant found (`max_3840`, then `2800`, `1400`, `fs_webp`).
- Quick mode saves straight to Chrome's Downloads folder.
- Folder mode opens the native folder picker so you can save anywhere, four images at a time.
- Saves into a folder named after the project, so several projects don't mix (can be turned off).
- Names files `image 01.jpg`, `image 02.jpg`, ... or keeps Behance's original filenames.
- Never overwrites existing files; collisions get a ` (1)` suffix.
- Remembers your toggles between uses.

## Install

1. Download or clone this repository.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the repository folder.

## Use

1. Open a Behance project and scroll through it once so all images load.
2. Click the extension icon and set the toggles.
3. Click **Scan page**, then the download button.
4. In folder mode, pick a folder in the new tab and click **Download**.

## Permissions

- `activeTab`, `scripting`: scan the open Behance project.
- `storage`: remember toggles and pass the scan result between extension pages.
- `downloads`: Quick mode saves.
- `behance.net` and its image CDN: read project markup and fetch images.

## Development

No build step or dependencies. Edit the files, then click **Reload** on `chrome://extensions`. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data flow and [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the manual test checklist.

## License

[MIT](LICENSE)
