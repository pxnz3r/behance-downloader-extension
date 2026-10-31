const title = document.querySelector("#title");
const status = document.querySelector("#status");
const saveButton = document.querySelector("#save");
const destinations = document.querySelectorAll('input[name="destination"]');
const keepOriginal = document.querySelector("#keep-original");
const projectFolder = document.querySelector("#project-folder");
const path = document.querySelector("#path");
const optionsKey = "popupOptions";
let scan = { title: "", images: [] };
// idle: nothing to save, empty: scan found nothing, ready: can save, done: downloads started.
let mode = "idle";

function quickMode() {
  return document.querySelector('input[name="destination"]:checked').value === "downloads";
}

function saveLabel() {
  return `Save ${plural(scan.images.length, "image")}${quickMode() ? "" : " to…"}`;
}

// Shows where the first file will land, so the switches explain themselves.
function showPath() {
  const [first] = scan.images;
  const file = keepOriginal.checked && first ? originalFilename(first.url) : first
    ? imageFilename(first.url, 0, scan.images.length, false)
    : keepOriginal.checked ? "original name.jpg" : "image 01.jpg";
  const parts = [quickMode() ? "Downloads" : "Your folder"];
  if (projectFolder.checked) parts.push(projectFolderName(scan.title));
  parts.push(file);
  path.replaceChildren("Saves as ", ...parts.flatMap((part, index) => {
    const bold = document.createElement("b");
    bold.textContent = part;
    return index ? ["/", bold] : [bold];
  }));
}

function setMode(nextMode, label) {
  mode = nextMode;
  saveButton.disabled = mode === "idle";
  saveButton.dataset.state = mode;
  if (mode === "done") saveButton.setAttribute("aria-disabled", "true");
  else saveButton.removeAttribute("aria-disabled");
  setLabel(saveButton, label);
}

function saveOptions() {
  void chrome.storage.local.set({ [optionsKey]: {
    quickMode: quickMode(),
    keepOriginal: keepOriginal.checked,
    projectFolder: projectFolder.checked
  } });
}

async function scanPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith("https://www.behance.net/")) {
    status.textContent = "Open a Behance project to save its images.";
    setMode("idle", "Save images");
    return;
  }

  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["scanner.js"] });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => globalThis.collectBehanceProjectImages()
    });
    scan = result;
  } catch (error) {
    status.textContent = error.message || "Could not read this page.";
    setMode("empty", "Scan again");
    return;
  }

  title.textContent = scan.title || "Behance project";
  title.title = title.textContent;
  if (!scan.images.length) {
    status.textContent = "No project images found. Scroll to the end of the project so every image loads, then scan again.";
    setMode("empty", "Scan again");
    return;
  }
  status.textContent = `${plural(scan.images.length, "image")} in project order`;
  setMode("ready", saveLabel());
}

async function startQuickDownload() {
  saveButton.disabled = true;
  setLabel(saveButton, "Starting downloads…");
  try {
    const response = await chrome.runtime.sendMessage({
      type: "quickDownload",
      title: scan.title,
      images: scan.images,
      keepOriginalNames: keepOriginal.checked,
      projectFolder: projectFolder.checked
    });
    if (response?.error) throw new Error(response.error);
    const started = scan.images.length - response.failed;
    setMode("done", response.failed ? `Started ${started}, ${response.failed} failed` : `Started ${plural(started, "download")}`);
  } catch (error) {
    status.textContent = error.message || "Could not start downloads.";
    setMode("ready", saveLabel());
  }
}

saveButton.addEventListener("click", async () => {
  if (mode === "empty") {
    await scanPage();
    showPath();
    return;
  }
  if (mode !== "ready") return;

  if (quickMode()) {
    await startQuickDownload();
    return;
  }

  await chrome.storage.session.set({
    scannedBehanceImages: scan.images,
    scannedBehanceTitle: scan.title,
    keepOriginalNames: keepOriginal.checked,
    projectFolder: projectFolder.checked
  });
  await chrome.tabs.create({ url: chrome.runtime.getURL("downloader.html") });
  window.close();
});

for (const input of [...destinations, keepOriginal, projectFolder]) {
  input.addEventListener("change", saveOptions);
  input.addEventListener("change", showPath);
}
for (const input of destinations) {
  input.addEventListener("change", () => {
    if (mode === "ready") setLabel(saveButton, saveLabel());
  });
}

void chrome.storage.local.get(optionsKey).then(({ [optionsKey]: options }) => {
  if (options) {
    destinations[options.quickMode ? 0 : 1].checked = true;
    keepOriginal.checked = options.keepOriginal;
    projectFolder.checked = options.projectFolder;
  }
  showPath();
  requestAnimationFrame(() => document.body.classList.add("ready"));
  return scanPage().then(showPath);
});
