import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/auth";
import { useAuth } from "../auth/AuthContext";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register({
        username,
        email,
        password,
        displayName: displayName.trim() === "" ? undefined : displayName,
      });
      navigate("/timeline");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "登録に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page">
      <div className="card">
        <h1>新規登録</h1>
        <p className="card__sub">メールアドレスとパスワードで登録します</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="username">ユーザー名（@username）</label>
            <input
              id="username"
              type="text"
              required
              pattern="[A-Za-z0-9_]+"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="半角英数字とアンダースコア"
            />
          </div>
          <div className="form-field">
            <label htmlFor="display-name">表示名（任意）</label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="未入力の場合はユーザー名を使用"
            />
          </div>
          <div className="form-field">
            <label htmlFor="email">メールアドレス</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">パスワード（8文字以上）</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <p className="form-error">{error}</p>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? "登録中..." : "登録する"}
          </button>
        </form>

        <p className="card__footer">
          すでにアカウントをお持ちですか？ <Link to="/login">ログイン</Link>
        </p>
      </div>
    </main>
  );
}
