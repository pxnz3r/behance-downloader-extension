// Shared by popup.html and downloader.html.

// Keeps the characters the old and new labels share and blurs in only the
// rest, so "Save 24 images" -> "Save 24 images to…" grows just " to…".
function setLabel(button, text) {
  const label = button.querySelector(".label");
  const previous = label.textContent;
  if (previous === text) return;

  let shared = 0;
  while (shared < previous.length && previous[shared] === text[shared]) shared += 1;

  label.textContent = text.slice(0, shared);
  [...text.slice(shared)].forEach((character, index) => {
    if (!previous) {
      label.append(character);
      return;
    }
    const span = document.createElement("span");
    span.className = "char";
    span.textContent = character;
    span.style.animationDelay = `${index * 18}ms`;
    label.append(span);
  });
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
