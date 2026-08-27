import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [helloMessage, setHelloMessage] = useState<string | null>(null);
  const [helloError, setHelloError] = useState("");

  useEffect(() => {
    let cancelled = false;

    authFetch("/api/hello")
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setHelloError("認証確認用エンドポイントの呼び出しに失敗しました。");
          return;
        }
        const data = (await response.json()) as { message: string };
        setHelloMessage(data.message);
      })
      .catch(() => {
        if (!cancelled) {
          setHelloError("認証確認用エンドポイントの呼び出しに失敗しました。");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <main className="page">
      <div className="card home-card">
        <p className="home-card__success">ログイン成功</p>
        <p className="card__sub">
          {user ? `@${user.username} としてログインしています` : ""}
        </p>
        <p className="home-card__message">
          {helloError ? helloError : helloMessage ?? "確認中..."}
        </p>
        <button type="button" className="btn btn--ghost" onClick={handleLogout}>
          ログアウト
        </button>
      </div>
    </main>
  );
}
