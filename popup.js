const title = document.querySelector("#title");
const status = document.querySelector("#status");
const openButton = document.querySelector("#open");
let scan = { title: "", images: [] };
// idle: nothing to do here, empty: scan found nothing, ready: images found.
let mode = "idle";

function setMode(nextMode, label) {
  mode = nextMode;
  openButton.disabled = mode === "idle";
  setLabel(openButton, label);
}

async function scanPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith("https://www.behance.net/")) {
    status.textContent = "Open a Behance project to save its images.";
    setMode("idle", "Choose images");
    return;
  }

  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["scanner.js"] });
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
  status.textContent = plural(scan.images.length, "image");
  setMode("ready", "Choose images");
}

openButton.addEventListener("click", async () => {
  if (mode === "empty") {
    await scanPage();
    return;
  }
  if (mode !== "ready") return;

  await chrome.storage.session.set({ scannedBehanceImages: scan.images, scannedBehanceTitle: scan.title });
  await chrome.tabs.create({ url: chrome.runtime.getURL("downloader.html") });
  window.close();
});

void scanPage();
