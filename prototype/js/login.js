document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("form-error");
  errorEl.textContent = "";

  const user = findUserByEmail(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    errorEl.textContent = "メールアドレスまたはパスワードが正しくありません。";
    return;
  }

  setSession(user.id);
  window.location.href = "timeline.html";
});
