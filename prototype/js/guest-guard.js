// ログイン・新規登録画面の先頭で読み込む。ログイン済みならタイムラインへリダイレクトする。
(function () {
  seedIfEmpty();
  const user = getCurrentUser();
  if (user) {
    window.location.href = "timeline.html";
  }
})();
