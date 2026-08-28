import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, listFollowers, listFollowing, toggleFollow, type UserSummary } from "../api/users";
import { AppHeader } from "../components/AppHeader";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../auth/AuthContext";

interface FollowListPageProps {
  type: "following" | "followers";
}

export function FollowListPage({ type }: FollowListPageProps) {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    const fetcher = type === "following" ? listFollowing : listFollowers;
    fetcher(username)
      .then((result) => {
        if (!cancelled) setUsers(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "一覧の取得に失敗しました。");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [username, type]);

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
          @{username} の{type === "following" ? "フォロー中" : "フォロワー"}
        </h1>
        <div className="tabs">
          <Link to={`/users/${username}/following`} className={type === "following" ? "is-active" : ""}>
            フォロー中
          </Link>
          <Link to={`/users/${username}/followers`} className={type === "followers" ? "is-active" : ""}>
            フォロワー
          </Link>
        </div>

        {loading && <p className="timeline-status">読み込み中...</p>}
        {!loading && error && <p className="timeline-status timeline-status--error">{error}</p>}
        {!loading && !error && users.length === 0 && (
          <p className="timeline-status">
            {type === "following" ? "フォロー中のユーザーはいません。" : "フォロワーはいません。"}
          </p>
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
              {u.username !== user?.username && (
                <button
                  type="button"
                  className={`btn btn--inline${u.followedByCurrentUser ? " btn--following" : ""}`}
                  onClick={() => handleToggleFollow(u.username)}
                >
                  {u.followedByCurrentUser ? "フォロー中" : "フォローする"}
                </button>
              )}
            </div>
          ))}
      </main>
    </>
  );
}
