const chooseFolderButton = document.querySelector("#choose-folder");
const downloadButton = document.querySelector("#download");
const status = document.querySelector("#status");
const folderName = document.querySelector("#folder");
const parallelDownloads = 4;
let images = [];
let title = "";
let destination;
let keepOriginalNames = false;
let projectFolder = true;

function setStatus(message) {
  status.textContent = message;
}

async function unusedFilename(directory, filename) {
  let suffix = 0;
  while (true) {
    const dot = filename.lastIndexOf(".");
    const base = dot > 0 ? filename.slice(0, dot) : filename;
    const extension = dot > 0 ? filename.slice(dot) : "";
    const candidate = suffix ? `${base} (${suffix})${extension}` : filename;
    try {
      await directory.getFileHandle(candidate);
      suffix += 1;
    } catch (error) {
      if (error.name === "NotFoundError") return candidate;
      throw error;
    }
  }
}

async function writeImage(directory, url, index) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image ${index + 1} failed (${response.status}).`);

  const filename = await unusedFilename(directory, imageFilename(url, index, images.length, keepOriginalNames));
  const file = await directory.getFileHandle(filename, { create: true });
  const writable = await file.createWritable();
  try {
    await writable.write(await response.blob());
  } finally {
    await writable.close();
  }
}

chooseFolderButton.addEventListener("click", async () => {
  if (!window.showDirectoryPicker) {
    setStatus("Your Chrome version does not support the folder picker.");
    return;
  }

  try {
    destination = await window.showDirectoryPicker({ mode: "readwrite" });
    folderName.textContent = projectFolder
      ? `Selected: ${destination.name}/${projectFolderName(title)}`
      : `Selected: ${destination.name}`;
    downloadButton.disabled = images.length === 0;
  } catch (error) {
    if (error.name !== "AbortError") setStatus(error.message || "Could not select the folder.");
  }
});

downloadButton.addEventListener("click", async () => {
  if (!destination || !images.length) return;

  chooseFolderButton.disabled = true;
  downloadButton.disabled = true;
  const failed = [];
  let saved = 0;
  let next = 0;

  try {
    const directory = projectFolder
      ? await destination.getDirectoryHandle(projectFolderName(title), { create: true })
      : destination;

    setStatus(`Saving 0 of ${images.length}...`);
    const worker = async () => {
      while (next < images.length) {
        const index = next;
        next += 1;
        try {
          await writeImage(directory, images[index].url, index);
          saved += 1;
          setStatus(`Saving ${saved} of ${images.length}...`);
        } catch (error) {
          failed.push(index + 1);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(parallelDownloads, images.length) }, worker));

    failed.sort((left, right) => left - right);
    setStatus(failed.length
      ? `Saved ${saved}; failed: image ${failed.join(", ")}.`
      : `Saved ${saved} images.`);
  } catch (error) {
    setStatus(error.message || "Could not write to the selected folder.");
  } finally {
    chooseFolderButton.disabled = false;
    downloadButton.disabled = false;
  }
});

void chrome.storage.session.get(["scannedBehanceImages", "scannedBehanceTitle", "keepOriginalNames", "projectFolder"]).then(({
  scannedBehanceImages = [],
  scannedBehanceTitle = "",
  keepOriginalNames: storedKeepOriginalNames = false,
  projectFolder: storedProjectFolder = true
}) => {
  images = scannedBehanceImages;
  title = scannedBehanceTitle;
  keepOriginalNames = storedKeepOriginalNames;
  projectFolder = storedProjectFolder;
  downloadButton.textContent = `Download ${images.length} image${images.length === 1 ? "" : "s"}`;
  setStatus(images.length ? `Ready: ${images.length} project image${images.length === 1 ? "" : "s"}. Choose any folder.` : "No scanned images found. Return to Behance and scan first.");
});
