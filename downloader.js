const title = document.querySelector("#title");
const status = document.querySelector("#status");
const saveButton = document.querySelector("#save");
const grid = document.querySelector("#grid");
const selectAll = document.querySelector("#select-all");
const count = document.querySelector("#count");
const destinations = document.querySelectorAll('input[name="destination"]');
const projectFolder = document.querySelector("#project-folder");
const keepOriginal = document.querySelector("#keep-original");
const optionsKey = "saveOptions";
const parallelDownloads = 4;
const minColumnWidth = 260;
const tickIcons = '<svg class="ok" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m2.5 6.3 2.3 2.2 4.7-5"/></svg><svg class="alert" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 2.5v4.2M6 9.3v.2"/></svg>';
let images = [];
let projectTitle = "";
let tiles = [];
let selected = new Set();
let lastToggled = null;
// ready: can save, saving: in progress, done: finished, retry: some failed.
let mode = "ready";
let run = [];
let directory;
let directoryPath = "";
let columnCount = 0;

const quickMode = () => document.querySelector('input[name="destination"]:checked').value === "downloads";
const selectedInOrder = () => [...selected].sort((left, right) => left - right);

function filenameFor(index, order) {
  return imageFilename(images[index].url, order.indexOf(index), order.length, keepOriginal.checked);
}

function showPath() {
  const order = selectedInOrder();
  if (!order.length) {
    status.textContent = "Select the images you want to save.";
    return;
  }
  const parts = [quickMode() ? "Downloads" : "the folder you pick"];
  if (projectFolder.checked) parts.push(projectFolderName(projectTitle));
  parts.push(filenameFor(order[0], order));
  status.replaceChildren("Saves to ", ...parts.flatMap((part, index) => {
    const bold = document.createElement("b");
    bold.textContent = part;
    return index ? [" / ", bold] : [bold];
  }));
}

function saveLabel() {
  if (!selected.size) return "Save images";
  return `Save ${plural(selected.size, "image")}${quickMode() ? "" : " to…"}`;
}

// Any change after a finished save starts over from a fresh "Save" state.
function refresh() {
  const total = images.length;
  count.textContent = `${selected.size} of ${total}`;
  selectAll.checked = selected.size === total;
  selectAll.indeterminate = selected.size > 0 && selected.size < total;
  if (mode === "saving") return;
  mode = "ready";
  saveButton.dataset.state = "ready";
  saveButton.removeAttribute("aria-disabled");
  saveButton.disabled = !selected.size;
  setLabel(saveButton, saveLabel());
  showPath();
}

function setSelected(index, value) {
  if (value) selected.add(index);
  else selected.delete(index);
  tiles[index].setAttribute("aria-pressed", String(value));
}

function toggle(index, range) {
  if (mode === "saving") return;
  const value = !selected.has(index);
  if (range && lastToggled !== null) {
    const [from, to] = [Math.min(lastToggled, index), Math.max(lastToggled, index)];
    for (let current = from; current <= to; current += 1) setSelected(current, value);
  } else {
    setSelected(index, value);
  }
  lastToggled = index;
  refresh();
}

function setAll(value) {
  if (mode === "saving") return;
  images.forEach((_image, index) => setSelected(index, value));
  lastToggled = null;
  refresh();
}

function saveOptions() {
  void chrome.storage.local.set({ [optionsKey]: {
    quickMode: quickMode(),
    keepOriginal: keepOriginal.checked,
    projectFolder: projectFolder.checked
  } });
}

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

// Streams the response straight to disk instead of holding the whole image in memory.
async function writeImage(index) {
  const response = await fetch(images[index].url);
  if (!response.ok) throw new Error(`Image ${index + 1} failed (${response.status}).`);
  const file = await directory.getFileHandle(await unusedFilename(filenameFor(index, run)), { create: true });
  await response.body.pipeTo(await file.createWritable());
}

async function chooseDirectory() {
  if (!window.showDirectoryPicker) throw new Error("This version of Chrome has no folder picker.");
  const destination = await window.showDirectoryPicker({ mode: "readwrite" });
  if (projectFolder.checked) {
    const folder = projectFolderName(projectTitle);
    directory = await destination.getDirectoryHandle(folder, { create: true });
    directoryPath = `${destination.name} / ${folder}`;
  } else {
    directory = destination;
    directoryPath = destination.name;
  }
}

function finish(label, message) {
  mode = "done";
  saveButton.dataset.state = "done";
  saveButton.setAttribute("aria-disabled", "true");
  saveButton.style.removeProperty("--progress");
  setLabel(saveButton, label);
  status.textContent = message;
}

async function saveToFolder(indices) {
  mode = "saving";
  saveButton.dataset.state = "saving";
  saveButton.setAttribute("aria-disabled", "true");
  status.textContent = `Saving into ${directoryPath}`;
  for (const index of indices) delete tiles[index].dataset.state;

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
      } catch (error) {
        tiles[index].dataset.state = "failed";
      }
      done += 1;
      progress();
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallelDownloads, indices.length) }, worker));

  const failed = run.filter((index) => tiles[index].dataset.state === "failed");
  if (!failed.length) {
    finish(`Saved ${plural(run.length, "image")}`, `Saved to ${directoryPath}.`);
    return;
  }
  mode = "retry";
  saveButton.dataset.state = "retry";
  saveButton.removeAttribute("aria-disabled");
  saveButton.style.removeProperty("--progress");
  setLabel(saveButton, `Retry ${failed.length} failed`);
  status.textContent = `Saved ${run.length - failed.length} of ${run.length} to ${directoryPath}. Failed images are marked.`;
}

async function saveToDownloads() {
  mode = "saving";
  saveButton.setAttribute("aria-disabled", "true");
  setLabel(saveButton, "Starting downloads…");
  try {
    const response = await chrome.runtime.sendMessage({
      type: "quickDownload",
      title: projectTitle,
      images: run.map((index) => images[index]),
      keepOriginalNames: keepOriginal.checked,
      projectFolder: projectFolder.checked
    });
    if (response?.error) throw new Error(response.error);
    const started = run.length - response.failed;
    const folder = projectFolder.checked ? ` / ${projectFolderName(projectTitle)}` : "";
    finish(
      response.failed ? `Started ${started}, ${response.failed} failed` : `Started ${plural(started, "download")}`,
      `Downloading to Downloads${folder}.`
    );
  } catch (error) {
    mode = "ready";
    refresh();
    status.textContent = error.message || "Could not start downloads.";
  }
}

saveButton.addEventListener("click", async () => {
  if (mode === "retry") {
    await saveToFolder(run.filter((index) => tiles[index].dataset.state === "failed"));
    return;
  }
  if (mode !== "ready" || !selected.size) return;

  run = selectedInOrder();
  if (quickMode()) {
    await saveToDownloads();
    return;
  }
  try {
    await chooseDirectory();
  } catch (error) {
    if (error.name !== "AbortError") status.textContent = error.message || "Could not open that folder.";
    return;
  }
  await saveToFolder(run);
});

selectAll.addEventListener("change", () => setAll(selectAll.checked));
for (const input of [...destinations, keepOriginal, projectFolder]) {
  input.addEventListener("change", () => {
    saveOptions();
    refresh();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input")) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
    event.preventDefault();
    setAll(true);
  } else if (event.key === "Escape") {
    setAll(false);
  }
});

function renderTiles() {
  tiles = images.map(({ url, preview, aspect }, index) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile";
    tile.style.aspectRatio = String(aspect || 0.8);
    tile.setAttribute("aria-pressed", "true");
    const image = document.createElement("img");
    image.alt = `Image ${index + 1}`;
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("load", () => tile.classList.add("loaded"), { once: true });
    image.src = preview || url;
    const tick = document.createElement("span");
    tick.className = "tick";
    tick.setAttribute("aria-hidden", "true");
    tick.innerHTML = tickIcons;
    tile.append(image, tick);
    tile.addEventListener("click", (event) => toggle(index, event.shiftKey));
    return tile;
  });
  layoutGrid();
  new ResizeObserver(layoutGrid).observe(grid);
}

// Masonry: each tile goes into the currently shortest column. Heights come
// from the scanned aspect ratios, so this runs once, before any image loads.
function layoutGrid() {
  const gap = 12;
  const nextCount = Math.max(2, Math.floor((grid.clientWidth + gap) / (minColumnWidth + gap)));
  if (nextCount === columnCount) return;
  columnCount = nextCount;
  const columns = Array.from({ length: columnCount }, () => {
    const column = document.createElement("div");
    column.className = "column";
    return column;
  });
  const heights = columns.map(() => 0);
  tiles.forEach((tile, index) => {
    const shortest = heights.indexOf(Math.min(...heights));
    columns[shortest].append(tile);
    heights[shortest] += 1 / (images[index].aspect || 0.8);
  });
  grid.replaceChildren(...columns);
}

void Promise.all([
  chrome.storage.session.get(["scannedBehanceImages", "scannedBehanceTitle"]),
  chrome.storage.local.get(optionsKey)
]).then(([{ scannedBehanceImages = [], scannedBehanceTitle = "" }, { [optionsKey]: options }]) => {
  if (options) {
    destinations[options.quickMode ? 0 : 1].checked = true;
    keepOriginal.checked = options.keepOriginal;
    projectFolder.checked = options.projectFolder;
  }
  images = scannedBehanceImages;
  projectTitle = scannedBehanceTitle;
  requestAnimationFrame(() => document.body.classList.add("ready"));

  if (!images.length) {
    status.textContent = "Nothing to choose from. Open a Behance project and click the extension.";
    document.querySelector(".actions").hidden = true;
    document.querySelector(".toolbar").hidden = true;
    return;
  }

  title.textContent = projectTitle || "Behance project";
  document.title = title.textContent;
  selected = new Set(images.map((_image, index) => index));
  renderTiles();
  refresh();
});
