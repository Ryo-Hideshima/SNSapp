// ユーザー一覧行のHTML生成とイベントバインド(フォロー一覧・検索で共用)
function userRowHTML(user) {
  const me = getCurrentUser();
  const isMe = user.id === me.id;
  const following = isFollowing(me.id, user.id);

  return `
    <div class="user-row" data-user-id="${user.id}">
      <a href="profile.html?user=${user.id}">${avatarHTML(user)}</a>
      <div class="user-row__info">
        <a class="user-row__name" href="profile.html?user=${user.id}">${escapeHTML(user.displayName)}</a>
        <div class="user-row__username">@${escapeHTML(user.username)}</div>
      </div>
      ${
        isMe
          ? ""
          : `<button class="btn js-follow-btn ${following ? "btn--following" : ""}" data-user-id="${user.id}">${following ? "フォロー中" : "フォローする"}</button>`
      }
    </div>
  `;
}

function bindUserRowEvents(container) {
  container.querySelectorAll(".js-follow-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const userId = Number(btn.dataset.userId);
      toggleFollow(getCurrentUser().id, userId);
      const following = isFollowing(getCurrentUser().id, userId);
      btn.classList.toggle("btn--following", following);
      btn.textContent = following ? "フォロー中" : "フォローする";
    });
  });
}
