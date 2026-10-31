# Behance Downloader Extension

Chrome extension that saves every image in the Behance project you have open, in project order, at the best available size.

> Only download content you are authorized to use.

## What it does

- Reads only the project's image modules, so recommendations and cached page assets are skipped.
- Keeps one file per image and picks the largest variant found (`max_3840`, then `2800`, `1400`, `fs_webp`).
- Scans the project as soon as you open the popup.
- Saves straight to Chrome's Downloads folder, or to any folder you pick.
- In folder mode, a preview grid shows each image as it saves (four at a time); failed images can be retried on their own.
- Saves into a folder named after the project, so several projects don't mix (can be turned off).
- Names files `image 01.jpg`, `image 02.jpg`, ... or keeps Behance's original filenames.
- Never overwrites existing files; collisions get a ` (1)` suffix.
- Remembers your settings between uses. Monochrome UI that follows the system light or dark theme.

## Install

1. Download or clone this repository.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the repository folder.

## Use

1. Open a Behance project and scroll through it once so all images load.
2. Click the extension icon. It shows the project and how many images it found.
3. Pick **Downloads** or **Any folder**, then click **Save**.
4. For **Any folder**, click **Save images to…** in the tab that opens and choose a folder. Saving starts right away.

## Permissions

- `activeTab`, `scripting`: scan the open Behance project.
- `storage`: remember settings and pass the scan result between extension pages.
- `downloads`: save to the Downloads folder.
- `behance.net` and its image CDN: read project markup and fetch images.

## Development

No build step or dependencies. Edit the files, then click **Reload** on `chrome://extensions`. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data flow and [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the manual test checklist.

## License

[MIT](LICENSE)
