renderHeader("search");

function runSearch(keyword) {
  const resultEl = document.getElementById("search-result");

  if (!keyword.trim()) {
    resultEl.innerHTML = "";
    return;
  }

  const results = searchUsers(keyword).filter((u) => u.id !== getCurrentUser().id);

  if (results.length === 0) {
    resultEl.innerHTML = `<p class="empty-state">該当するユーザーが見つかりません。</p>`;
    return;
  }

  resultEl.innerHTML = results.map(userRowHTML).join("");
  bindUserRowEvents(resultEl);
}

document.getElementById("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  runSearch(document.getElementById("keyword").value);
});
