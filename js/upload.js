export function initUpload({ onFiles }) {
  const dz = document.getElementById("dropzone");
  const input = document.getElementById("fileInput");
  const choose = document.getElementById("chooseFileBtn");

  choose.addEventListener("click", e => { e.stopPropagation(); input.click(); });
  dz.addEventListener("click", e => {
    if (e.target.tagName !== "BUTTON") input.click();
  });
  dz.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") input.click();
  });
  input.addEventListener("change", () => onFiles([...input.files]));

  ["dragenter","dragover"].forEach(name => dz.addEventListener(name, e => {
    e.preventDefault(); dz.classList.add("dragover");
  }));
  ["dragleave","drop"].forEach(name => dz.addEventListener(name, e => {
    e.preventDefault(); dz.classList.remove("dragover");
  }));
  dz.addEventListener("drop", e => onFiles([...e.dataTransfer.files]));
}
