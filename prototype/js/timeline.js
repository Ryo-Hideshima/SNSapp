renderHeader("timeline");

function renderTimeline() {
  const me = getCurrentUser();
  const followingIds = new Set(getFollowingIds(me.id));
  followingIds.add(me.id); // 自分自身の投稿もタイムラインに含める

  const posts = getPosts()
    .filter((p) => followingIds.has(p.userId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const listEl = document.getElementById("post-list");

  if (posts.length === 0) {
    listEl.innerHTML = `<p class="empty-state">タイムラインに表示できる投稿がありません。<br>ユーザー検索でフォローするか、投稿してみましょう。</p>`;
    return;
  }

  listEl.innerHTML = posts.map(postCardHTML).join("");
  bindPostCardEvents(listEl);
}

renderTimeline();
