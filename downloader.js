const title = document.querySelector("#title");
const status = document.querySelector("#status");
const saveButton = document.querySelector("#save");
const grid = document.querySelector("#grid");
const parallelDownloads = 4;
const failedIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.2v.3"/></svg>';
let images = [];
let projectTitle = "";
let keepOriginalNames = false;
let projectFolder = true;
let directory;
let directoryPath = "";
let busy = false;
let tiles = [];

async function unusedFilename(filename) {
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

async function writeImage(index) {
  const { url } = images[index];
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image ${index + 1} failed (${response.status}).`);

  const filename = await unusedFilename(imageFilename(url, index, images.length, keepOriginalNames));
  const file = await directory.getFileHandle(filename, { create: true });
  const writable = await file.createWritable();
  try {
    await writable.write(await response.blob());
  } finally {
    await writable.close();
  }
}

function indicesIn(state) {
  return tiles.flatMap((tile, index) => tile.dataset.state === state ? [index] : []);
}

async function chooseDirectory() {
  if (!window.showDirectoryPicker) throw new Error("This version of Chrome has no folder picker.");
  const destination = await window.showDirectoryPicker({ mode: "readwrite" });
  if (projectFolder) {
    const folder = projectFolderName(projectTitle);
    directory = await destination.getDirectoryHandle(folder, { create: true });
    directoryPath = `${destination.name}/${folder}`;
  } else {
    directory = destination;
    directoryPath = destination.name;
  }
}

async function save(indices) {
  busy = true;
  saveButton.setAttribute("aria-disabled", "true");
  saveButton.dataset.state = "saving";
  delete saveButton.dataset.tone;
  for (const index of indices) tiles[index].dataset.state = "pending";
  status.textContent = `Saving into ${directoryPath}`;

  let done = 0;
  let next = 0;
  const progress = () => {
    saveButton.style.setProperty("--progress", done / indices.length);
    setLabel(saveButton, `Saving ${done} of ${indices.length}`);
  };
  progress();

  const worker = async () => {
    while (next < indices.length) {
      const index = indices[next];
      next += 1;
      try {
        await writeImage(index);
        tiles[index].dataset.state = "saved";
      } catch (error) {
        tiles[index].dataset.state = "failed";
      }
      done += 1;
      progress();
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallelDownloads, indices.length) }, worker));

  busy = false;
  saveButton.removeAttribute("aria-disabled");
  saveButton.style.removeProperty("--progress");
  const failed = indicesIn("failed");
  const saved = indicesIn("saved").length;
  if (failed.length) {
    status.textContent = `Saved ${saved} of ${images.length} to ${directoryPath}. ${failed.length} failed.`;
    saveButton.dataset.state = "retry";
    setLabel(saveButton, `Retry ${failed.length} failed`);
  } else {
    status.textContent = `Saved ${plural(saved, "image")} to ${directoryPath}.`;
    saveButton.dataset.state = "finished";
    saveButton.dataset.tone = "quiet";
    setLabel(saveButton, "Save to another folder");
  }
}

saveButton.addEventListener("click", async () => {
  if (busy || !images.length) return;

  if (saveButton.dataset.state === "retry") {
    await save(indicesIn("failed"));
    return;
  }

  try {
    await chooseDirectory();
  } catch (error) {
    if (error.name !== "AbortError") status.textContent = error.message || "Could not open that folder.";
    return;
  }
  await save(images.map((_image, index) => index));
});

function renderTiles() {
  tiles = images.map(({ url }, index) => {
    const tile = document.createElement("figure");
    tile.className = "tile";
    const image = document.createElement("img");
    image.src = url;
    image.alt = `Image ${index + 1}`;
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("load", () => tile.classList.add("loaded"), { once: true });
    tile.append(image);
    tile.insertAdjacentHTML("beforeend", `<span class="failed">${failedIcon}<span class="visually-hidden">Failed</span></span>`);
    return tile;
  });
  layoutGrid();
  new ResizeObserver(layoutGrid).observe(grid);
}

// Masonry: tiles keep their natural height and are dealt left to right into
// columns, so reading order stays the project order. Heights are unknown
// until images load, so placement does not depend on them.
let columnCount = 0;
function layoutGrid() {
  const count = Math.max(2, Math.floor(grid.clientWidth / 280));
  if (count === columnCount) return;
  columnCount = count;
  const columns = Array.from({ length: count }, () => {
    const column = document.createElement("div");
    column.className = "column";
    return column;
  });
  tiles.forEach((tile, index) => columns[index % count].append(tile));
  grid.replaceChildren(...columns);
}

void chrome.storage.session.get(["scannedBehanceImages", "scannedBehanceTitle", "keepOriginalNames", "projectFolder"]).then(({
  scannedBehanceImages = [],
  scannedBehanceTitle = "",
  keepOriginalNames: storedKeepOriginalNames = false,
  projectFolder: storedProjectFolder = true
}) => {
  images = scannedBehanceImages;
  projectTitle = scannedBehanceTitle;
  keepOriginalNames = storedKeepOriginalNames;
  projectFolder = storedProjectFolder;

  if (!images.length) {
    status.textContent = "Nothing to save. Scan a Behance project from the extension first.";
    saveButton.hidden = true;
    return;
  }

  title.textContent = projectTitle || "Behance project";
  document.title = `Save ${title.textContent}`;
  status.textContent = projectFolder
    ? `${plural(images.length, "image")}, not saved yet. They go into a new “${projectFolderName(projectTitle)}” folder inside the folder you pick.`
    : `${plural(images.length, "image")}, not saved yet. They go straight into the folder you pick.`;
  saveButton.querySelector(".label").textContent = "";
  setLabel(saveButton, `Save ${plural(images.length, "image")} to…`);
  renderTiles();
});
