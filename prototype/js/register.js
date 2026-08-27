document.getElementById("register-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const displayName = document.getElementById("display-name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("form-error");
  errorEl.textContent = "";

  if (!/^[A-Za-z0-9_]+$/.test(username)) {
    errorEl.textContent = "ユーザー名は半角英数字とアンダースコアのみ使用できます。";
    return;
  }
  if (findUserByUsername(username)) {
    errorEl.textContent = "このユーザー名は既に使用されています。";
    return;
  }
  if (findUserByEmail(email)) {
    errorEl.textContent = "このメールアドレスは既に登録されています。";
    return;
  }
  if (password.length < 8) {
    errorEl.textContent = "パスワードは8文字以上で入力してください。";
    return;
  }

  const user = createUser({ username, email, password, displayName });
  setSession(user.id);
  window.location.href = "profile.html?user=" + user.id;
});
