# Development Notes

## Local workflow

1. Edit the extension files directly.
2. Run the JavaScript syntax checks from the repository root.
3. Open `chrome://extensions` and click **Reload** on the unpacked extension.
4. Test a Behance project after scrolling through it so image modules are loaded.

## Important constraints

- Chrome's Downloads API can save only under the browser's configured Downloads directory. That is why arbitrary-folder downloads use the File System Access API on `downloader.html`.
- The native folder picker must be opened from a user click; do not move that call behind an automatic action.
- Keep `scanner.js` scoped to `.js-project-module--image`. Scanning the full document or every network resource overcounts unrelated assets.
- The service worker stores temporary Quick mode filenames in `chrome.storage.session` so the filename-determination event can use them.

## Manual test checklist

- Scan shows the intended project image count rather than recommendation assets.
- Quick mode saves to Downloads.
- Folder mode opens the native chooser and saves to the selected folder.
- Numbered mode starts with `image 1` (zero-padded when there are 10 or more images).
- Project-folder mode creates a folder named after the project in both modes.
- Popup toggles keep their state after closing and reopening the popup.
- Original-name mode retains the CDN filename.
- Existing destination files are not overwritten in folder mode.
