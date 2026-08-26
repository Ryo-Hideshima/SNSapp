renderHeader("profile");

const params = new URLSearchParams(window.location.search);
const profileUserId = Number(params.get("user"));
const me = getCurrentUser();

function renderProfile() {
  const user = findUserById(profileUserId);
  const root = document.getElementById("profile-root");

  if (!user) {
    root.innerHTML = `<p class="empty-state">ユーザーが見つかりません。</p>`;
    return;
  }

  const isMe = user.id === me.id;
  const following = isFollowing(me.id, user.id);
  const followingCount = getFollowingIds(user.id).length;
  const followerCount = getFollowerIds(user.id).length;

  root.innerHTML = `
    <div class="card">
      <div class="profile-header">
        ${avatarHTML(user, "avatar--lg")}
        <div class="profile-header__info">
          <p class="profile-header__name">${escapeHTML(user.displayName)}</p>
          <p class="profile-header__username">@${escapeHTML(user.username)}</p>
          <p class="profile-header__bio">${escapeHTML(user.bio || "")}</p>
          <div class="profile-stats">
            <a href="follow-list.html?user=${user.id}&type=following"><strong>${followingCount}</strong> フォロー中</a>
            <a href="follow-list.html?user=${user.id}&type=followers"><strong>${followerCount}</strong> フォロワー</a>
          </div>
          ${
            isMe
              ? `<button id="edit-profile-btn" class="btn btn--outline">プロフィールを編集</button>`
              : `<button id="follow-btn" class="btn ${following ? "btn--following" : ""}">${following ? "フォロー中" : "フォローする"}</button>`
          }
        </div>
      </div>
      <div id="edit-profile-form"></div>
    </div>
  `;

  if (isMe) {
    document.getElementById("edit-profile-btn").addEventListener("click", () => {
      renderEditForm(user);
    });
  } else {
    document.getElementById("follow-btn").addEventListener("click", () => {
      toggleFollow(me.id, user.id);
      renderProfile();
    });
  }
}

function renderEditForm(user) {
  const formRoot = document.getElementById("edit-profile-form");
  formRoot.innerHTML = `
    <form id="profile-edit-form" style="margin-top:16px;border-top:1px solid var(--color-border);padding-top:16px;">
      <div class="form-field">
        <label for="edit-display-name">表示名</label>
        <input type="text" id="edit-display-name" value="${escapeHTML(user.displayName)}">
      </div>
      <div class="form-field">
        <label for="edit-bio">自己紹介</label>
        <textarea id="edit-bio" rows="3" maxlength="160">${escapeHTML(user.bio || "")}</textarea>
      </div>
      <div class="form-field">
        <label for="edit-avatar">アイコン画像</label>
        <input type="file" id="edit-avatar" accept="image/*">
      </div>
      <div style="display:flex;gap:8px;">
        <button type="submit" class="btn">保存する</button>
        <button type="button" id="cancel-edit-btn" class="btn btn--ghost">キャンセル</button>
      </div>
    </form>
  `;

  let newAvatarUrl = user.avatarUrl;
  document.getElementById("edit-avatar").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      newAvatarUrl = reader.result;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("cancel-edit-btn").addEventListener("click", () => {
    formRoot.innerHTML = "";
  });

  document.getElementById("profile-edit-form").addEventListener("submit", (e) => {
    e.preventDefault();
    updateUser(user.id, {
      displayName: document.getElementById("edit-display-name").value.trim() || user.username,
      bio: document.getElementById("edit-bio").value.trim(),
      avatarUrl: newAvatarUrl,
    });
    renderProfile();
  });
}

function renderProfilePosts() {
  const posts = getPosts()
    .filter((p) => p.userId === profileUserId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const listEl = document.getElementById("post-list");
  if (posts.length === 0) {
    listEl.innerHTML = `<p class="empty-state">まだ投稿がありません。</p>`;
    return;
  }
  listEl.innerHTML = posts.map(postCardHTML).join("");
  bindPostCardEvents(listEl);
}

renderProfile();
renderProfilePosts();
