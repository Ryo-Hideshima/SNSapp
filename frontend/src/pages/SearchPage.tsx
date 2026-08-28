import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, searchUsers, toggleFollow, type UserSummary } from "../api/users";
import { AppHeader } from "../components/AppHeader";
import { Avatar } from "../components/Avatar";

export function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = keyword.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    try {
      const result = await searchUsers(trimmed);
      setUsers(result);
      setSearched(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "検索に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async (targetUsername: string) => {
    try {
      const result = await toggleFollow(targetUsername);
      setUsers((prev) =>
        prev.map((u) => (u.username === targetUsername ? { ...u, followedByCurrentUser: result.followed } : u))
      );
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "フォロー操作に失敗しました。");
    }
  };

  return (
    <>
      <AppHeader />
      <main className="page page--profile">
        <h1 className="section-title" style={{ marginTop: 0 }}>
          ユーザー検索
        </h1>

        <form onSubmit={handleSearch} noValidate style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <div className="form-field" style={{ flex: 1, marginBottom: 0 }}>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="ユーザー名または表示名で検索"
            />
          </div>
          <button type="submit" className="btn btn--inline" disabled={loading || !keyword.trim()}>
            {loading ? "検索中..." : "検索"}
          </button>
        </form>

        {!loading && error && <p className="timeline-status timeline-status--error">{error}</p>}
        {!loading && !error && searched && users.length === 0 && (
          <p className="timeline-status">該当するユーザーが見つかりませんでした。</p>
        )}

        {!loading &&
          !error &&
          users.map((u) => (
            <div key={u.id} className="user-row">
              <Link to={`/users/${u.username}`}>
                <Avatar userId={u.id} displayName={u.displayName} avatarUrl={u.avatarUrl} />
              </Link>
              <div className="user-row__info">
                <Link to={`/users/${u.username}`} className="user-row__name">
                  {u.displayName}
                </Link>
                <div className="user-row__username">@{u.username}</div>
              </div>
              <button
                type="button"
                className={`btn btn--inline${u.followedByCurrentUser ? " btn--following" : ""}`}
                onClick={() => handleToggleFollow(u.username)}
              >
                {u.followedByCurrentUser ? "フォロー中" : "フォローする"}
              </button>
            </div>
          ))}
      </main>
    </>
  );
}
