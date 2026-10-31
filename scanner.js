// This file is injected into the active page by popup.js.
globalThis.collectBehanceProjectImages = function collectBehanceProjectImages() {
  // Project images live under /project_modules/. Recommendation covers use
  // /projects/ and avatars use /user/, so the path alone keeps them out.
  const moduleUrl = /https:\/\/[a-z0-9-]+\.behance\.net\/project_modules\/[^\s"'<>\\),]+/g;
  const imageExtension = /\.(?:jpe?g|png|gif|webp)(?:\?|$)/i;
  const candidates = new Map();

  const assetIdFor = (url) => {
    if (!imageExtension.test(url)) return null;
    return new URL(url).pathname.split("/").at(-1).replace(/\.[a-z]+$/i, "");
  };

  const addText = (value, order) => {
    if (!value) return;
    const text = String(value)
      .replaceAll("\\u002F", "/")
      .replaceAll("\\/", "/")
      .replaceAll("&amp;", "&");
    for (const match of text.match(moduleUrl) || []) {
      const url = match.replace(/[;,]+$/, "");
      if (assetIdFor(url) && !candidates.has(url)) candidates.set(url, order);
    }
  };

  // Read rendered image elements only, in page order. Their markup holds src,
  // srcset and lazy-load data attributes; scripts and hidden page state do not
  // count, because they include other projects' data.
  document.querySelectorAll("img, source").forEach((element, order) => {
    addText(element.outerHTML, order);
    addText(element.currentSrc, order);
  });

  // Resource entries can supply a larger variant, but only for an image that
  // was already found on the page.
  const orderByAsset = new Map();
  for (const [url, order] of candidates) {
    const assetId = assetIdFor(url);
    if (!orderByAsset.has(assetId)) orderByAsset.set(assetId, order);
  }
  performance.getEntriesByType("resource").forEach((entry) => {
    if (!entry.name.includes("/project_modules/")) return;
    const order = orderByAsset.get(assetIdFor(entry.name));
    if (order !== undefined) addText(entry.name, order);
  });

  // The size segment after /project_modules/ is "source", "fs" (1920 wide),
  // "disp" (600 wide) or names with a width such as max_3840, 1400_opt_1.
  const quality = (url) => {
    const size = url.match(/\/project_modules\/([^/]+)\//)?.[1] || "";
    if (size === "source") return 100000;
    if (size.startsWith("fs")) return 1920;
    if (size === "disp") return 600;
    return Number(size.match(/\d+/)?.[0] || 0);
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
