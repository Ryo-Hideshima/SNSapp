renderHeader(null);

const params = new URLSearchParams(window.location.search);
const targetUserId = Number(params.get("user"));
let type = params.get("type") === "followers" ? "followers" : "following";

function render() {
  const user = findUserById(targetUserId);
  if (!user) {
    document.getElementById("page-title").textContent = "ユーザーが見つかりません";
    document.getElementById("tabs").innerHTML = "";
    document.getElementById("user-list").innerHTML = `<p class="empty-state">ユーザーが見つかりません。</p>`;
    return;
  }

  document.getElementById("page-title").textContent = `@${user.username} の${type === "following" ? "フォロー中" : "フォロワー"}`;

  document.getElementById("tabs").innerHTML = `
    <a href="follow-list.html?user=${user.id}&type=following" class="${type === "following" ? "is-active" : ""}">フォロー中</a>
    <a href="follow-list.html?user=${user.id}&type=followers" class="${type === "followers" ? "is-active" : ""}">フォロワー</a>
  `;

  const ids = type === "following" ? getFollowingIds(user.id) : getFollowerIds(user.id);
  const users = ids.map(findUserById).filter(Boolean);

  const listEl = document.getElementById("user-list");
  if (users.length === 0) {
    listEl.innerHTML = `<p class="empty-state">${type === "following" ? "フォロー中のユーザーはいません。" : "フォロワーはいません。"}</p>`;
    return;
  }

  listEl.innerHTML = users.map(userRowHTML).join("");
  bindUserRowEvents(listEl);
}

render();
