importScripts("filenames.js");

const plannedNamesKey = "quickBehanceDownloadNames";

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  let suggested = false;
  const finish = (suggestion) => {
    if (suggested) return;
    suggested = true;
    suggest(suggestion);
  };

  void chrome.storage.session.get(plannedNamesKey)
    .then(({ [plannedNamesKey]: names = {} }) => {
      const filename = names[item.url];
      finish(filename ? { filename, conflictAction: "uniquify" } : undefined);
    })
    .catch(() => finish());
  return true;
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "quickDownload") return;

  void (async () => {
    const { images, keepOriginalNames, projectFolder } = message;
    const folder = projectFolder ? `${projectFolderName(message.title)}/` : "";
    const names = Object.fromEntries(images.map(({ url }, index) => [
      url,
      folder + imageFilename(url, index, images.length, keepOriginalNames)
    ]));
    // Merge so an earlier batch that is still starting keeps its names.
    const { [plannedNamesKey]: planned = {} } = await chrome.storage.session.get(plannedNamesKey);
    await chrome.storage.session.set({ [plannedNamesKey]: { ...planned, ...names } });

    const results = await Promise.allSettled(images.map(({ url }) =>
      chrome.downloads.download({ url, filename: names[url], conflictAction: "uniquify", saveAs: false })
    ));
    sendResponse({ failed: results.filter((result) => result.status === "rejected").length });
  })().catch((error) => sendResponse({ error: error.message || "Could not start downloads." }));

  return true;
});
