// Shared by popup.html and downloader.html.

// Keeps the start and end the old and new labels share and blurs in only
// what changed: "Saving 10 of 48" -> "Saving 11 of 48" moves just one digit.
function setLabel(button, text) {
  const label = button.querySelector(".label");
  const previous = label.textContent;
  if (previous === text) return;
  if (!previous) {
    label.textContent = text;
    return;
  }

  let start = 0;
  while (start < previous.length && start < text.length && previous[start] === text[start]) start += 1;
  let end = 0;
  while (
    end < previous.length - start && end < text.length - start
    && previous.at(-1 - end) === text.at(-1 - end)
  ) end += 1;

  const changed = [...text.slice(start, text.length - end)].map((character, index) => {
    const span = document.createElement("span");
    span.className = "char";
    span.textContent = character;
    span.style.animationDelay = `${index * 18}ms`;
    return span;
  });
  label.replaceChildren(text.slice(0, start), ...changed, text.slice(text.length - end));
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
