// Injected into the active Behance tab by popup.js. The value of the last
// expression is what executeScript returns.
(() => {
  // Project images live under /project_modules/. Recommendation covers use
  // /projects/ and avatars use /user/, so the path alone keeps them out.
  const moduleUrl = /https:\/\/[a-z0-9-]+\.behance\.net\/project_modules\/[^\s"'<>\\),]+/g;
  const imageExtension = /\.(?:jpe?g|png|gif|webp)(?:\?|$)/i;
  const assets = new Map();

  const assetIdFor = (url) => {
    if (!imageExtension.test(url)) return null;
    return new URL(url).pathname.split("/").at(-1).replace(/\.[a-z]+$/i, "");
  };

  const add = (text, order, aspect) => {
    if (!text) return;
    const normalized = String(text)
      .replaceAll("\\u002F", "/")
      .replaceAll("\\/", "/")
      .replaceAll("&amp;", "&");
    for (const match of normalized.match(moduleUrl) || []) {
      const url = match.replace(/[;,]+$/, "");
      const assetId = assetIdFor(url);
      if (!assetId) continue;
      if (!assets.has(assetId)) assets.set(assetId, { order, aspect: 0, urls: new Set() });
      const asset = assets.get(assetId);
      asset.urls.add(url);
      if (!asset.aspect && aspect) asset.aspect = aspect;
    }
  };

  // Width / height of the rendered image, so the extension page can size each
  // tile before its preview loads.
  const aspectOf = (element) => {
    const image = element.tagName === "IMG" ? element : element.parentElement?.querySelector("img");
    if (!image) return 0;
    const width = image.naturalWidth || Number(image.getAttribute("width"));
    const height = image.naturalHeight || Number(image.getAttribute("height"));
    return width && height ? width / height : 0;
  };

  // Read rendered image elements only, in page order. Their markup holds src,
  // srcset and lazy-load data attributes; scripts and hidden page state do not
  // count, because they include other projects' data.
  document.querySelectorAll("img, source").forEach((element, order) => {
    const aspect = aspectOf(element);
    add(element.outerHTML, order, aspect);
    add(element.currentSrc, order, aspect);
  });

  // Resource entries can supply a larger variant, but only for an image that
  // was already found on the page.
  performance.getEntriesByType("resource").forEach((entry) => {
    if (!entry.name.includes("/project_modules/")) return;
    const asset = assets.get(assetIdFor(entry.name));
    if (asset) add(entry.name, asset.order, 0);
  });

  // The size segment after /project_modules/ is "source", "fs" (1920 wide),
  // "disp" (600 wide) or names with a width such as max_3840, 1400_opt_1.
  const width = (url) => {
    const size = url.match(/\/project_modules\/([^/]+)\//)?.[1] || "";
    if (size === "source") return 100000;
    if (size.startsWith("fs")) return 1920;
    if (size === "disp") return 600;
    return Number(size.match(/\d+/)?.[0] || 0);
  };

  const images = [...assets.entries()]
    .sort(([, left], [, right]) => left.order - right.order)
    .map(([assetId, asset]) => {
      const urls = [...asset.urls].sort((left, right) => width(left) - width(right));
      // Smallest variant that still looks sharp in a ~300px tile.
      const preview = urls.find((url) => width(url) >= 600) || urls.at(-1);
      return { assetId, url: urls.at(-1), preview, aspect: asset.aspect };
    });

  const title = document.querySelector('meta[property="og:title"]')?.content
    || document.title.replace(/\s*::\s*Behance\s*$/i, "");
  return { title, images };
})();
