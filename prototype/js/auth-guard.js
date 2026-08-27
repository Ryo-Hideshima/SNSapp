// ログイン必須ページの先頭で読み込む。未ログインならログイン画面へリダイレクトする。
(function () {
  seedIfEmpty();
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  ensureDemoTestUsers();
})();
