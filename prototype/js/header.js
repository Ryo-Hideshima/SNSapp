// 各ページ共通のヘッダーナビを #header-root に描画する
function renderHeader(activeKey) {
  const root = document.getElementById("header-root");
  if (!root) return;
  const user = getCurrentUser();
  if (!user) return;

  const navItem = (key, href, label) =>
    `<a href="${href}" class="app-header__link${activeKey === key ? " is-active" : ""}">${label}</a>`;

  root.innerHTML = `
    <header class="app-header">
      <a class="app-header__brand" href="timeline.html">SNS Mock</a>
      <nav class="app-header__nav">
        ${navItem("timeline", "timeline.html", "タイムライン")}
        ${navItem("post-new", "post-new.html", "投稿する")}
        ${navItem("search", "search.html", "検索")}
        ${navItem("profile", `profile.html?user=${user.id}`, "プロフィール")}
      </nav>
      <div class="app-header__user">
        ${avatarHTML(user, "avatar--sm")}
        <span class="app-header__username">${escapeHTML(user.displayName)}</span>
        <button id="logout-btn" class="btn btn--ghost">ログアウト</button>
      </div>
    </header>
  `;

  document.getElementById("logout-btn").addEventListener("click", () => {
    clearSession();
    window.location.href = "index.html";
  });
}
