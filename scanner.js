// This file is injected into the active page by popup.js.
globalThis.collectBehanceProjectImages = function collectBehanceProjectImages() {
  const prefix = "https://mir-s3-cdn-cf.behance.net/project_modules/";
  const imageExtension = /\.(?:jpe?g|png|webp)(?:\?|$)/i;
  const candidates = new Map();

  const assetIdFor = (url) => {
    if (!url.startsWith(prefix) || !imageExtension.test(url)) return null;
    return new URL(url).pathname
      .split("/")
      .at(-1)
      .replace(/\.(?:jpe?g|png|webp)$/i, "");
  };

  const addText = (value, order) => {
    if (!value) return;
    const text = String(value)
      .replaceAll("\\u002F", "/")
      .replaceAll("\\/", "/")
      .replaceAll("&amp;", "&");
    const matches = text.match(/https:\/\/mir-s3-cdn-cf\.behance\.net\/project_modules\/[^\s"'<>\\)]+/g) || [];

    for (const match of matches) {
      const url = match.replace(/[;,]+$/, "");
      if (assetIdFor(url) && !candidates.has(url)) candidates.set(url, order);
    }
  };

  // Only Behance's actual project-image modules count. Do not scan the entire
  // page source: it includes recommendations, hidden data, and cached assets.
  const modules = [...document.querySelectorAll(".js-project-module--image")];
  modules.forEach((module, order) => {
    addText(module.innerHTML, order);
    module.querySelectorAll("img, source").forEach((element) => {
      addText(element.src, order);
      addText(element.currentSrc, order);
      addText(element.getAttribute("src"), order);
      addText(element.getAttribute("srcset"), order);
    });
  });

  // Resource entries can supply a larger variant, but only for an image that
  // was already found in a visible project module.
  const moduleOrderByAsset = new Map();
  for (const [url, order] of candidates) {
    const assetId = assetIdFor(url);
    if (!moduleOrderByAsset.has(assetId)) moduleOrderByAsset.set(assetId, order);
  }
  performance.getEntriesByType("resource").forEach((entry) => {
    const assetId = assetIdFor(entry.name);
    const order = moduleOrderByAsset.get(assetId);
    if (order !== undefined) addText(entry.name, order);
  });

  const quality = (url) => {
    if (url.includes("/max_3840/")) return 5;
    if (url.includes("/2800/")) return 4;
    if (url.includes("/1400/")) return 3;
    if (url.includes("/fs_webp/")) return 2;
    return 1;
  };

  const bestByAsset = new Map();
  for (const [url, order] of candidates) {
    const assetId = assetIdFor(url);
    const previous = bestByAsset.get(assetId);
    if (!previous || quality(url) > quality(previous.url)) {
      bestByAsset.set(assetId, { url, order: previous?.order ?? order });
    }
  }

  const images = [...bestByAsset.entries()]
    .sort(([, left], [, right]) => left.order - right.order)
    .map(([assetId, image]) => ({ assetId, url: image.url }));
  const title = document.querySelector('meta[property="og:title"]')?.content
    || document.title.replace(/\s*::\s*Behance\s*$/i, "");
  return { title, images };
};
