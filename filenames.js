// Shared by background.js (importScripts) and downloader.html.
const unsafeFilenameCharacters = /[<>:"/\\|?*\u0000-\u001F]/g;

function originalFilename(url) {
  return decodeURIComponent(new URL(url).pathname.split("/").at(-1))
    .replace(unsafeFilenameCharacters, "_");
}

function numberedFilename(url, index, total) {
  const extension = url.match(/\.(jpe?g|png|gif|webp)(?:\?|$)/i)[1].toLowerCase();
  const number = String(index + 1).padStart(String(total).length, "0");
  return `image ${number}.${extension}`;
}

function imageFilename(url, index, total, keepOriginalNames) {
  return keepOriginalNames ? originalFilename(url) : numberedFilename(url, index, total);
}

// Windows rejects trailing dots and spaces, and Chrome rejects some leading
// characters, so a page title needs more than character replacement.
function projectFolderName(title) {
  const name = String(title || "")
    .replace(unsafeFilenameCharacters, "_")
    .replace(/\s+/g, " ")
    .slice(0, 80)
    .replace(/^[\s.~]+|[\s.]+$/g, "");
  return name || "Behance project";
}
