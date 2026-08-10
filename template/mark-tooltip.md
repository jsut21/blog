<%*
const originalSelection = tp.file.selection();
let text = originalSelection.trim();

if (!text) {
  text = await tp.system.prompt("강조할 텍스트", "");
}

if (!text) {
  tR += originalSelection;
  return;
}

const tooltip = await tp.system.prompt("마우스를 올렸을 때 표시할 설명", "");
if (tooltip === null) {
  tR += originalSelection;
  return;
}

const escapeAttribute = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const title = tooltip.trim()
  ? ' title="' + escapeAttribute(tooltip.trim()) + '"'
  : "";

tR += '<mark style="background:#d4b106"' + title + ">";
tR += escapeHtml(text);
tR += "</mark>";
%>
