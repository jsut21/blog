<%*
const activeLeaf = app.workspace.activeLeaf;
if (activeLeaf?.view?.editor) {
  const editor = activeLeaf.view.editor;
  const selection = editor.getSelection();
  const match = selection.match(/!\[\[(.+?)\]\]/);
  if (match) {
    const imgName = match[1].replace(/ /g, '%20');
    const replacement = `<div style="text-align: center;">
<img src="${imgName}" style="max-width: 100%; height: auto;">
</div>`;
    editor.replaceSelection(replacement);
  }
}
%>
