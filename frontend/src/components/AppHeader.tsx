import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

interface AppHeaderProps {
  /** 指定された場合のみ「更新」ボタンを表示する(タイムライン画面のみで使う想定)。 */
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function AppHeader({ onRefresh, refreshing = false }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="app-header">
      <Link to="/timeline" className="app-header__brand">
        SNS App
      </Link>
      <div className="app-header__actions">
        {onRefresh && (
          <button
            type="button"
            className="btn btn--ghost btn--inline"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? "更新中..." : "更新"}
          </button>
        )}
        {user && (
          <Link to={`/users/${user.username}`} className="app-header__user">
            @{user.username}
          </Link>
        )}
        <button type="button" className="btn btn--ghost btn--inline" onClick={handleLogout}>
          ログアウト
        </button>
      </div>
    </header>
  );
}
