const chooseFolderButton = document.querySelector("#choose-folder");
const downloadButton = document.querySelector("#download");
const status = document.querySelector("#status");
const folderName = document.querySelector("#folder");
let images = [];
let destination;
let keepOriginalNames = false;

function setStatus(message) {
  status.textContent = message;
}

function extensionFor(url) {
  return url.match(/\.(jpe?g|png|webp)(?:\?|$)/i)[1].toLowerCase();
}

function originalFilename(url) {
  return decodeURIComponent(new URL(url).pathname.split("/").at(-1))
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
}

async function unusedFilename(filename) {
  let suffix = 0;
  while (true) {
    const dot = filename.lastIndexOf(".");
    const base = dot > 0 ? filename.slice(0, dot) : filename;
    const extension = dot > 0 ? filename.slice(dot) : "";
    const candidate = suffix ? `${base} (${suffix})${extension}` : filename;
    try {
      await destination.getFileHandle(candidate);
      suffix += 1;
    } catch (error) {
      if (error.name === "NotFoundError") return candidate;
      throw error;
    }
  }
}

async function writeImage(url, index) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image ${index + 1} failed (${response.status}).`);

  const requestedName = keepOriginalNames ? originalFilename(url) : `image ${index + 1}.${extensionFor(url)}`;
  const filename = await unusedFilename(requestedName);
  const file = await destination.getFileHandle(filename, { create: true });
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
    folderName.textContent = `Selected: ${destination.name}`;
    downloadButton.disabled = images.length === 0;
  } catch (error) {
    if (error.name !== "AbortError") setStatus(error.message || "Could not select the folder.");
  }
});

downloadButton.addEventListener("click", async () => {
  if (!destination || !images.length) return;

  chooseFolderButton.disabled = true;
  downloadButton.disabled = true;
  let failed = 0;

  for (let index = 0; index < images.length; index += 1) {
    setStatus(`Saving image ${index + 1} of ${images.length}...`);
    try {
      await writeImage(images[index].url, index);
    } catch (error) {
      failed += 1;
    }
  }

  setStatus(failed ? `Saved ${images.length - failed}; ${failed} failed.` : `Saved ${images.length} images.`);
  chooseFolderButton.disabled = false;
  downloadButton.disabled = false;
});

void chrome.storage.session.get(["scannedBehanceImages", "keepOriginalNames"]).then(({
  scannedBehanceImages = [],
  keepOriginalNames: storedKeepOriginalNames = false
}) => {
  images = scannedBehanceImages;
  keepOriginalNames = storedKeepOriginalNames;
  downloadButton.textContent = `Download ${images.length} image${images.length === 1 ? "" : "s"}`;
  setStatus(images.length ? `Ready: ${images.length} project image${images.length === 1 ? "" : "s"}. Choose any folder.` : "No scanned images found. Return to Behance and scan first.");
});
