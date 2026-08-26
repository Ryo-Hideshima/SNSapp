renderHeader(null);

const params = new URLSearchParams(window.location.search);
const postId = Number(params.get("post"));
const me = getCurrentUser();

function renderPostDetail() {
  const post = findPostById(postId);
  const root = document.getElementById("post-detail-root");

  if (!post) {
    root.innerHTML = `<p class="empty-state">投稿が見つかりません（削除された可能性があります）。</p>`;
    document.getElementById("comment-form").style.display = "none";
    return;
  }

  const author = findUserById(post.userId);
  const liked = isLikedByUser(post.id, me.id);
  const likeCount = getLikeCount(post.id);
  const commentCount = getCommentCount(post.id);
  const images = (post.images || [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img) => `<img src="${img.dataUrl}" alt="投稿画像">`)
    .join("");
  const isOwner = author.id === me.id;

  root.innerHTML = `
    <article class="post">
      <a href="profile.html?user=${author.id}">${avatarHTML(author)}</a>
      <div class="post__body">
        <div class="post__header">
          <a class="post__author-name" href="profile.html?user=${author.id}">${escapeHTML(author.displayName)}</a>
          <span class="post__author-username">@${escapeHTML(author.username)}</span>
          <span class="post__time">・${formatDateTime(post.createdAt)}</span>
        </div>
        <p class="post__content">${escapeHTML(post.content)}</p>
        ${images ? `<div class="post__images">${images}</div>` : ""}
        <div class="post__actions">
          <button class="post-action js-like-btn ${liked ? "is-liked" : ""}" data-post-id="${post.id}">
            <span class="js-like-icon">${liked ? "❤" : "♡"}</span>
            <span class="js-like-count">${likeCount}</span>
          </button>
          <span class="post-action">💬 <span>${commentCount}</span></span>
          ${isOwner ? `<button class="post-action btn--danger" id="delete-post-btn" style="margin-left:auto;border-radius:8px;">投稿を削除</button>` : ""}
        </div>
      </div>
    </article>
  `;

  bindPostCardEvents(root);

  if (isOwner) {
    document.getElementById("delete-post-btn").addEventListener("click", () => {
      if (confirm("この投稿を削除しますか？関連するコメント・いいねも削除されます。")) {
        deletePost(post.id);
        window.location.href = "timeline.html";
      }
    });
  }
}

function renderComments() {
  const comments = getCommentsForPost(postId);
  const listEl = document.getElementById("comment-list");

  if (comments.length === 0) {
    listEl.innerHTML = `<p class="empty-state">まだコメントはありません。</p>`;
    return;
  }

  listEl.innerHTML = comments
    .map((c) => {
      const author = findUserById(c.userId);
      if (!author) return "";
      return `
        <div class="comment">
          <a href="profile.html?user=${author.id}">${avatarHTML(author, "avatar--sm")}</a>
          <div class="comment__body">
            <div class="comment__header">
              <a class="comment__author" href="profile.html?user=${author.id}">${escapeHTML(author.displayName)}</a>
              <span class="comment__username">@${escapeHTML(author.username)}</span>
              <span class="comment__time">・${formatDateTime(c.createdAt)}</span>
            </div>
            <p class="comment__content">${escapeHTML(c.content)}</p>
          </div>
        </div>
      `;
    })
    .join("");
}

document.getElementById("comment-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const contentEl = document.getElementById("comment-content");
  const errorEl = document.getElementById("comment-error");
  const content = contentEl.value.trim();
  errorEl.textContent = "";

  if (!findPostById(postId)) {
    errorEl.textContent = "対象の投稿が見つかりません。";
    return;
  }
  if (!content) {
    errorEl.textContent = "コメント内容を入力してください。";
    return;
  }

  createComment({ postId, userId: me.id, content });
  contentEl.value = "";
  renderComments();
  renderPostDetail();
});

renderPostDetail();
renderComments();
