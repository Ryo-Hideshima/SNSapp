renderHeader("post-new");

let selectedImages = []; // data URLの配列

const contentEl = document.getElementById("content");
const charCountEl = document.getElementById("char-count");
contentEl.addEventListener("input", () => {
  charCountEl.textContent = contentEl.value.length;
});

document.getElementById("images").addEventListener("change", (e) => {
  const files = Array.from(e.target.files || []);
  const readers = files.map(
    (file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      })
  );
  Promise.all(readers).then((dataUrls) => {
    selectedImages = selectedImages.concat(dataUrls);
    renderPreview();
    e.target.value = "";
  });
});

function renderPreview() {
  const previewEl = document.getElementById("image-preview");
  previewEl.innerHTML = selectedImages
    .map(
      (dataUrl, i) => `
      <div class="image-preview__item">
        <img src="${dataUrl}" alt="添付画像プレビュー">
        <button type="button" class="image-preview__remove" data-index="${i}">×</button>
      </div>
    `
    )
    .join("");

  previewEl.querySelectorAll(".image-preview__remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedImages.splice(Number(btn.dataset.index), 1);
      renderPreview();
    });
  });
}

document.getElementById("post-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("form-error");
  errorEl.textContent = "";

  const content = contentEl.value.trim();
  if (!content && selectedImages.length === 0) {
    errorEl.textContent = "本文または画像のいずれかを入力してください。";
    return;
  }

  createPost({ userId: getCurrentUser().id, content, images: selectedImages });
  window.location.href = "timeline.html";
});
