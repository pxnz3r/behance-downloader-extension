const plannedNamesKey = "quickBehanceDownloadNames";

function originalFilename(url) {
  return decodeURIComponent(new URL(url).pathname.split("/").at(-1))
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
}

function numberedFilename(url, index) {
  const extension = url.match(/\.(jpe?g|png|webp)(?:\?|$)/i)[1].toLowerCase();
  return `image ${index + 1}.${extension}`;
}

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
    const names = Object.fromEntries(message.images.map(({ url }, index) => [
      url,
      message.keepOriginalNames ? originalFilename(url) : numberedFilename(url, index)
    ]));
    await chrome.storage.session.set({ [plannedNamesKey]: names });

    const results = await Promise.allSettled(message.images.map(({ url }) =>
      chrome.downloads.download({ url, filename: names[url], conflictAction: "uniquify", saveAs: false })
    ));
    sendResponse({ failed: results.filter((result) => result.status === "rejected").length });
  })().catch((error) => sendResponse({ error: error.message || "Could not start downloads." }));

  return true;
});
