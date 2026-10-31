# Development Notes

## Local workflow

1. Edit the extension files directly.
2. Run the JavaScript syntax checks from the repository root.
3. Open `chrome://extensions` and click **Reload** on the unpacked extension.
4. Test a Behance project after scrolling through it so its images load.

## Important constraints

- Chrome's Downloads API can save only under the browser's Downloads directory. Saving anywhere else uses the File System Access API on `downloader.html`.
- The native folder picker must be opened from a user click; do not move that call behind an automatic action.
- `scanner.js` reads rendered `img`/`source` elements and keeps only `/project_modules/` URLs. It does not rely on Behance class names (the old `.js-project-module--image` selector stopped matching). Do not scan script tags or every network resource: they include other projects' images.
- The grid must not load the full-size URLs; use the scanned `preview`. Full-size files are 3840 px wide and made the page slow.
- The service worker stores planned filenames in `chrome.storage.session` so the filename-determination event can use them.
- `fonts/InstrumentSans-latin.woff2` is bundled under the SIL Open Font License (`fonts/OFL.txt`). Extension pages cannot load remote fonts.

## Manual test checklist

- The popup on a project shows its title and image count without a click; on another site it says to open a project.
- The grid shows previews in a masonry layout with no jumps as they load; empty tiles shimmer.
- Click toggles a tile, shift-click selects a range, Select all and Ctrl+A select everything, Esc clears.
- The save button and path line follow the selection and options.
- Downloads: the button ends on "Started N downloads".
- Any folder: picking a folder starts saving, only changed digits animate in the progress label, failures are marked and "Retry N failed" retries only them.
- Numbering follows project order among the selected images and is zero-padded.
- Light and dark system themes both read correctly; nothing animates on first paint.
- Existing destination files are not overwritten in folder mode.
