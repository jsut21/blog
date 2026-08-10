<%*
const originalSelection = tp.file.selection();
const selection = originalSelection.trim();

const extractImagePath = (value) => {
  const wikiLink = value.match(/^!\[\[([^|\]]+)(?:\|[^\]]+)?\]\]$/);
  if (wikiLink) return wikiLink[1].trim();

  const markdownImage = value.match(/^!\[[^\]]*\]\((?:<([^>]+)>|([^)]+))\)$/);
  if (markdownImage) return (markdownImage[1] ?? markdownImage[2]).trim();

  if (/\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(value)) return value;
  return "";
};

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

let imagePath = extractImagePath(selection);
if (!imagePath) {
  imagePath = await tp.system.prompt("이미지 파일명 또는 상대 경로", selection);
}

if (!imagePath) {
  tR += originalSelection;
  return;
}

const caption = await tp.system.prompt("이미지 설명 또는 출처", "");
if (caption === null) {
  tR += originalSelection;
  return;
}

const src = escapeAttribute(imagePath.trim().replaceAll(" ", "%20"));
tR += '<div style="text-align: center;">\n';
tR += '<img src="' + src + '" style="max-width: 100%; height: auto;">\n';
if (caption.trim()) {
  tR += "<br>\n";
  tR += "<small>" + escapeHtml(caption.trim()) + "</small>\n";
}
tR += "</div>";
%>
