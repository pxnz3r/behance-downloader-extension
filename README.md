<p align="center">
  <img src="icons/icon.svg" width="72" height="72" alt="">
</p>

<h1 align="center">Behance Downloader</h1>

<p align="center">
  Pick the images you want from any Behance project and save them in order, at full size.<br>
  A Chrome extension. No account, no tracking, no build step.
</p>

<br>

## How it works

1. **Open a project** on Behance and scroll through it once so every image loads.
2. **Click the extension.** It finds the project's images and shows how many.
3. **Choose images.** A grid opens with every image selected. Click to leave one out, shift-click for a range.
4. **Save.** To your Downloads folder in one click, or to any folder you pick.

## What you get

**Only the project.** Recommendations, avatars and other projects on the page are left out.

**The largest size available.** Behance serves each image in several sizes. The extension saves the biggest one the page offers (up to the original upload), and uses a small one for the preview grid.

**Files in order.** Names follow the project order: `image 01.jpg`, `image 02.jpg`, and so on. You can keep Behance's original filenames instead.

**One folder per project.** Files go into a folder named after the project, so several projects never mix. You can turn this off.

**Nothing overwritten.** If a file already exists, the new one gets a ` (1)` suffix.

**Failures you can see.** When saving to a folder, images that fail are marked in the grid and can be retried on their own.

## Install

The extension isn't on the Chrome Web Store yet. Load it from source:

1. Download this repository ([zip](../../archive/refs/heads/main.zip)) and unzip it, or clone it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the folder.
4. Pin the extension from the puzzle-piece menu so it stays in the toolbar.

## Keyboard

| Key | Action |
| --- | --- |
| Click | Select or deselect an image |
| Shift + click | Select or deselect a range |
| Ctrl + A | Select all |
| Esc | Deselect all |

## Permissions

| Permission | Why |
| --- | --- |
| `activeTab`, `scripting` | Read the images on the Behance tab you clicked the extension on |
| `downloads` | Save to your Downloads folder |
| `storage` | Remember your options and pass the image list to the picker page |
| `*.behance.net` | Fetch images from Behance's CDN when saving to a folder |

The extension makes no requests outside Behance and collects nothing.

> Only download work you have the right to use.

## Development

Plain HTML, CSS and JavaScript (Manifest V3). Edit the files, then click **Reload** on `chrome://extensions`. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explains the data flow; [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) has the manual test checklist.

## License

[MIT](LICENSE). Instrument Sans is bundled under the [SIL Open Font License](fonts/OFL.txt).
