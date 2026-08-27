// localStorageをDB代わりに使うシンプルなデータ層(プロトタイプ用)

const STORAGE_KEYS = {
  users: "sns_users",
  posts: "sns_posts",
  comments: "sns_comments",
  likes: "sns_likes",
  follows: "sns_follows",
  session: "sns_session",
};

function loadArray(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveArray(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}

function nextId(arr) {
  return arr.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

function hashPassword(plain) {
  return btoa(unescape(encodeURIComponent(plain)));
}

// ---- users ----
function getUsers() {
  return loadArray(STORAGE_KEYS.users);
}
function saveUsers(users) {
  saveArray(STORAGE_KEYS.users, users);
}
function findUserById(id) {
  return getUsers().find((u) => u.id === Number(id));
}
function findUserByEmail(email) {
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}
function findUserByUsername(username) {
  return getUsers().find((u) => u.username.toLowerCase() === username.toLowerCase());
}
function createUser({ username, email, password, displayName, bio, avatarUrl }) {
  const users = getUsers();
  const user = {
    id: nextId(users),
    username,
    email,
    passwordHash: hashPassword(password),
    displayName: displayName || username,
    bio: bio || "",
    avatarUrl: avatarUrl || "",
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  return user;
}
function updateUser(userId, patch) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === Number(userId));
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...patch };
  saveUsers(users);
  return users[idx];
}
function searchUsers(keyword) {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return [];
  return getUsers().filter(
    (u) => u.username.toLowerCase().includes(kw) || u.displayName.toLowerCase().includes(kw)
  );
}

// ---- session ----
function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
function setSession(userId) {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify({ currentUserId: userId }));
}
function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.session);
}
function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  return findUserById(session.currentUserId) || null;
}

// ---- posts ----
function getPosts() {
  return loadArray(STORAGE_KEYS.posts);
}
function savePosts(posts) {
  saveArray(STORAGE_KEYS.posts, posts);
}
function findPostById(id) {
  return getPosts().find((p) => p.id === Number(id));
}
function createPost({ userId, content, images }) {
  const posts = getPosts();
  const post = {
    id: nextId(posts),
    userId,
    content,
    images: (images || []).map((dataUrl, i) => ({ dataUrl, sortOrder: i })),
    createdAt: new Date().toISOString(),
  };
  posts.push(post);
  savePosts(posts);
  return post;
}
function deletePost(postId) {
  postId = Number(postId);
  savePosts(getPosts().filter((p) => p.id !== postId));
  saveArray(STORAGE_KEYS.comments, getComments().filter((c) => c.postId !== postId));
  saveArray(STORAGE_KEYS.likes, getLikes().filter((l) => l.postId !== postId));
}

// ---- comments ----
function getComments() {
  return loadArray(STORAGE_KEYS.comments);
}
function saveComments(comments) {
  saveArray(STORAGE_KEYS.comments, comments);
}
function getCommentsForPost(postId) {
  return getComments()
    .filter((c) => c.postId === Number(postId))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}
function getCommentCount(postId) {
  return getComments().filter((c) => c.postId === Number(postId)).length;
}
function createComment({ postId, userId, content }) {
  const comments = getComments();
  const comment = {
    id: nextId(comments),
    postId: Number(postId),
    userId,
    content,
    createdAt: new Date().toISOString(),
  };
  comments.push(comment);
  saveComments(comments);
  return comment;
}

// ---- likes ----
function getLikes() {
  return loadArray(STORAGE_KEYS.likes);
}
function saveLikes(likes) {
  saveArray(STORAGE_KEYS.likes, likes);
}
function getLikeCount(postId) {
  return getLikes().filter((l) => l.postId === Number(postId)).length;
}
function isLikedByUser(postId, userId) {
  return getLikes().some((l) => l.postId === Number(postId) && l.userId === userId);
}
function toggleLike(postId, userId) {
  postId = Number(postId);
  const likes = getLikes();
  const idx = likes.findIndex((l) => l.postId === postId && l.userId === userId);
  if (idx === -1) {
    likes.push({ postId, userId });
  } else {
    likes.splice(idx, 1);
  }
  saveLikes(likes);
}

// ---- follows ----
function getFollows() {
  return loadArray(STORAGE_KEYS.follows);
}
function saveFollows(follows) {
  saveArray(STORAGE_KEYS.follows, follows);
}
function isFollowing(followerId, followeeId) {
  return getFollows().some((f) => f.followerId === followerId && f.followeeId === followeeId);
}
function toggleFollow(followerId, followeeId) {
  if (followerId === followeeId) return;
  const follows = getFollows();
  const idx = follows.findIndex(
    (f) => f.followerId === followerId && f.followeeId === followeeId
  );
  if (idx === -1) {
    follows.push({ followerId, followeeId, createdAt: new Date().toISOString() });
  } else {
    follows.splice(idx, 1);
  }
  saveFollows(follows);
}
function getFollowingIds(userId) {
  return getFollows()
    .filter((f) => f.followerId === userId)
    .map((f) => f.followeeId);
}
function getFollowerIds(userId) {
  return getFollows()
    .filter((f) => f.followeeId === userId)
    .map((f) => f.followerId);
}

// ---- avatar helper ----
const AVATAR_COLORS = ["#1d9bf0", "#f91880", "#ff7a00", "#00ba7c", "#7856ff", "#e0245e"];
function colorForUser(userId) {
  return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}
function avatarHTML(user, sizeClass) {
  if (!user) return "";
  if (user.avatarUrl) {
    return `<img class="avatar ${sizeClass || ""}" src="${user.avatarUrl}" alt="${escapeHTML(user.displayName)}">`;
  }
  const initial = (user.displayName || user.username || "?").charAt(0).toUpperCase();
  return `<div class="avatar ${sizeClass || ""}" style="background:${colorForUser(user.id)}">${initial}</div>`;
}
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}
function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ---- seed ----
function seedIfEmpty() {
  if (getUsers().length > 0) return;

  const users = [
    { username: "alice", email: "alice@example.com", password: "password", displayName: "Alice", bio: "写真とコーヒーが好きです。" },
    { username: "bob", email: "bob@example.com", password: "password", displayName: "Bob", bio: "エンジニアです。学習中。" },
    { username: "carol", email: "carol@example.com", password: "password", displayName: "Carol", bio: "旅行記録用アカウント。" },
  ].map((u) => createUser(u));

  const [alice, bob, carol] = users;

  toggleFollow(alice.id, bob.id);
  toggleFollow(alice.id, carol.id);
  toggleFollow(bob.id, alice.id);
  toggleFollow(carol.id, alice.id);
  toggleFollow(bob.id, carol.id);

  const p1 = createPost({ userId: bob.id, content: "SNSアプリのプロトタイプを作成中です。タイムライン表示、できました。", images: [] });
  const p2 = createPost({ userId: carol.id, content: "今日は良い天気でした！投稿機能のテストです。", images: [] });
  const p3 = createPost({ userId: alice.id, content: "みなさんフォローありがとうございます。よろしくお願いします。", images: [] });

  createComment({ postId: p1.id, userId: alice.id, content: "いい感じですね！" });
  createComment({ postId: p1.id, userId: carol.id, content: "私も見てみます。" });
  createComment({ postId: p2.id, userId: alice.id, content: "羨ましいです！" });

  toggleLike(p1.id, alice.id);
  toggleLike(p1.id, carol.id);
  toggleLike(p2.id, alice.id);
  toggleLike(p3.id, bob.id);
}

// テスト用ユーザーを追加し、ログイン中ユーザーにフォローさせてタイムラインに表示する
function ensureDemoTestUsers() {
  const testUserSpecs = [
    { username: "test1", displayName: "Test User 1", bio: "テスト用アカウント1です。" },
    { username: "test2", displayName: "Test User 2", bio: "テスト用アカウント2です。" },
    { username: "test3", displayName: "Test User 3", bio: "テスト用アカウント3です。" },
    { username: "test4", displayName: "Test User 4", bio: "テスト用アカウント4です。" },
  ];

  testUserSpecs.forEach((spec, i) => {
    let user = findUserByUsername(spec.username);
    if (!user) {
      user = createUser({
        username: spec.username,
        email: `${spec.username}@example.com`,
        password: "password",
        displayName: spec.displayName,
        bio: spec.bio,
      });
      createPost({
        userId: user.id,
        content: `${spec.displayName}からのテスト投稿です。よろしくお願いします！(#${i + 1})`,
        images: [],
      });
    }
  });

  const me = getCurrentUser();
  if (!me) return;
  testUserSpecs.forEach((spec) => {
    const user = findUserByUsername(spec.username);
    if (user && user.id !== me.id && !isFollowing(me.id, user.id)) {
      toggleFollow(me.id, user.id);
    }
  });
}
