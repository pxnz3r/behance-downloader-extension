const scanButton = document.querySelector("#scan");
const continueButton = document.querySelector("#continue");
const quickMode = document.querySelector("#quick-mode");
const keepOriginal = document.querySelector("#keep-original");
const projectFolder = document.querySelector("#project-folder");
const status = document.querySelector("#status");
const optionsKey = "popupOptions";
let images = [];
let title = "";

function setStatus(message) {
  status.textContent = message;
}

function updateDownloadButton() {
  if (!images.length) {
    continueButton.disabled = true;
    continueButton.textContent = "Choose folder & download";
    return;
  }

  continueButton.disabled = false;
  continueButton.textContent = quickMode.checked
    ? `Download ${images.length} image${images.length === 1 ? "" : "s"} to Downloads`
    : `Choose folder & download ${images.length} image${images.length === 1 ? "" : "s"}`;
}

function saveOptions() {
  void chrome.storage.local.set({ [optionsKey]: {
    quickMode: quickMode.checked,
    keepOriginal: keepOriginal.checked,
    projectFolder: projectFolder.checked
  } });
}

for (const toggle of [quickMode, keepOriginal, projectFolder]) toggle.addEventListener("change", saveOptions);
quickMode.addEventListener("change", updateDownloadButton);

void chrome.storage.local.get(optionsKey).then(({ [optionsKey]: options }) => {
  if (!options) return;
  quickMode.checked = options.quickMode;
  keepOriginal.checked = options.keepOriginal;
  projectFolder.checked = options.projectFolder;
  updateDownloadButton();
});

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

scanButton.addEventListener("click", async () => {
  try {
    const tab = await activeTab();
    if (!tab?.id || !tab.url?.startsWith("https://www.behance.net/")) {
      throw new Error("Open a Behance project page first.");
    }

    setStatus("Scanning loaded page...");
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["scanner.js"]
    });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => globalThis.collectBehanceProjectImages()
    });
    ({ title, images } = result);
    updateDownloadButton();
    setStatus(images.length ? `Found ${images.length} project image${images.length === 1 ? "" : "s"}.` : "No project images found.");
  } catch (error) {
    images = [];
    title = "";
    updateDownloadButton();
    setStatus(error.message || "Could not scan this page.");
  }
});

continueButton.addEventListener("click", async () => {
  if (!images.length) return;

  if (quickMode.checked) {
    continueButton.disabled = true;
    try {
      const response = await chrome.runtime.sendMessage({
        type: "quickDownload",
        title,
        images,
        keepOriginalNames: keepOriginal.checked,
        projectFolder: projectFolder.checked
      });
      if (response?.error) throw new Error(response.error);
      setStatus(response?.failed ? `Started ${images.length - response.failed}; ${response.failed} failed.` : `Started ${images.length} downloads.`);
    } catch (error) {
      setStatus(error.message || "Could not start downloads.");
    } finally {
      updateDownloadButton();
    }
    return;
  }

  await chrome.storage.session.set({
    scannedBehanceImages: images,
    scannedBehanceTitle: title,
    keepOriginalNames: keepOriginal.checked,
    projectFolder: projectFolder.checked
  });
  await chrome.tabs.create({ url: chrome.runtime.getURL("downloader.html") });
  window.close();
});
