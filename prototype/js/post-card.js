// 投稿カードのHTML生成とイベントバインド(タイムライン・プロフィールで共用)
function postCardHTML(post) {
  const author = findUserById(post.userId);
  if (!author) return "";
  const liked = isLikedByUser(post.id, getCurrentUser().id);
  const likeCount = getLikeCount(post.id);
  const commentCount = getCommentCount(post.id);
  const images = (post.images || [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img) => `<img src="${img.dataUrl}" alt="投稿画像">`)
    .join("");

  return `
    <article class="post" data-post-id="${post.id}">
      <a href="profile.html?user=${author.id}">${avatarHTML(author)}</a>
      <div class="post__body">
        <div class="post__header">
          <a class="post__author-name" href="profile.html?user=${author.id}">${escapeHTML(author.displayName)}</a>
          <span class="post__author-username">@${escapeHTML(author.username)}</span>
          <span class="post__time">・${formatDateTime(post.createdAt)}</span>
        </div>
        <a class="post__content" href="post-detail.html?post=${post.id}" style="color:inherit;text-decoration:none;display:block;">${escapeHTML(post.content)}</a>
        ${images ? `<div class="post__images">${images}</div>` : ""}
        <div class="post__actions">
          <button class="post-action js-like-btn ${liked ? "is-liked" : ""}" data-post-id="${post.id}">
            <span class="js-like-icon">${liked ? "❤" : "♡"}</span>
            <span class="js-like-count">${likeCount}</span>
          </button>
          <a class="post-action post-action--link" href="post-detail.html?post=${post.id}">
            💬 <span>${commentCount}</span>
          </a>
        </div>
      </div>
    </article>
  `;
}

function bindPostCardEvents(container) {
  container.querySelectorAll(".js-like-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const postId = btn.dataset.postId;
      toggleLike(postId, getCurrentUser().id);
      const liked = isLikedByUser(postId, getCurrentUser().id);
      btn.classList.toggle("is-liked", liked);
      btn.querySelector(".js-like-icon").textContent = liked ? "❤" : "♡";
      btn.querySelector(".js-like-count").textContent = getLikeCount(postId);
    });
  });
}
