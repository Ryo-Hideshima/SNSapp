import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, getProfile, toggleFollow, updateProfile, type UserProfile } from "../api/users";
import { deletePost, listPosts, toggleLike, type Post } from "../api/posts";
import { AppHeader } from "../components/AppHeader";
import { Avatar } from "../components/Avatar";
import { PostCard } from "../components/PostCard";
import { useAuth } from "../auth/AuthContext";

const MAX_BIO_LENGTH = 160;

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const isOwnProfile = user?.username === username;

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([getProfile(username), listPosts({ authorUsername: username })])
      .then(([profileResult, postsResult]) => {
        if (cancelled) return;
        setProfile(profileResult);
        setPosts(postsResult.posts);
        setDisplayName(profileResult.displayName);
        setBio(profileResult.bio ?? "");
        setAvatarUrl(profileResult.avatarUrl);
        setEditing(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "プロフィールの取得に失敗しました。");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setSavingProfile(true);
    try {
      const result = await updateProfile({ displayName, bio, avatarUrl });
      setProfile(result);
      setEditing(false);
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : "プロフィールの更新に失敗しました。");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!profile) return;
    try {
      const result = await toggleFollow(profile.username);
      setProfile({ ...profile, followedByCurrentUser: result.followed, followerCount: result.followerCount });
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "フォロー操作に失敗しました。");
    }
  };

  const handleDeletePost = async (id: number) => {
    try {
      await deletePost(id);
      setPosts((prev) => prev.filter((post) => post.id !== id));
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "削除に失敗しました。");
    }
  };

  const handleToggleLikeOnPost = async (id: number) => {
    try {
      const result = await toggleLike(id);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === id ? { ...post, likedByCurrentUser: result.liked, likeCount: result.likeCount } : post
        )
      );
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "いいねに失敗しました。");
    }
  };

  return (
    <>
      <AppHeader />
      <main className="page page--profile">
        {loading && <p className="timeline-status">読み込み中...</p>}
        {!loading && error && <p className="timeline-status timeline-status--error">{error}</p>}

        {!loading && !error && profile && (
          <>
            <div className="card">
              <div className="profile-header">
                <Avatar userId={profile.id} displayName={profile.displayName} avatarUrl={profile.avatarUrl} size="lg" />
                <div className="profile-header__info">
                  <p className="profile-header__name">{profile.displayName}</p>
                  <p className="profile-header__username">@{profile.username}</p>
                  <p className="profile-header__bio">{profile.bio}</p>
                  <div className="profile-stats">
                    <Link to={`/users/${profile.username}/following`}>
                      <strong>{profile.followingCount}</strong> フォロー中
                    </Link>
                    <Link to={`/users/${profile.username}/followers`}>
                      <strong>{profile.followerCount}</strong> フォロワー
                    </Link>
                  </div>
                  {isOwnProfile ? (
                    <button type="button" className="btn btn--outline btn--inline" onClick={() => setEditing((v) => !v)}>
                      プロフィールを編集
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`btn btn--inline${profile.followedByCurrentUser ? " btn--following" : ""}`}
                      onClick={handleToggleFollow}
                    >
                      {profile.followedByCurrentUser ? "フォロー中" : "フォローする"}
                    </button>
                  )}
                </div>
              </div>

              {isOwnProfile && editing && (
                <form onSubmit={handleSaveProfile} noValidate style={{ marginTop: 16, borderTop: "1px solid #e1e8ed", paddingTop: 16 }}>
                  <div className="form-field">
                    <label htmlFor="display-name">表示名</label>
                    <input
                      id="display-name"
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="bio">自己紹介</label>
                    <textarea id="bio" rows={3} maxLength={MAX_BIO_LENGTH} value={bio} onChange={(e) => setBio(e.target.value)} />
                    <span className="form-hint">
                      {bio.length}/{MAX_BIO_LENGTH}
                    </span>
                  </div>
                  <div className="form-field">
                    <label htmlFor="avatar">アイコン画像</label>
                    <input id="avatar" type="file" accept="image/*" onChange={handleAvatarChange} />
                  </div>
                  <p className="form-error">{profileError}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="submit" className="btn btn--inline" disabled={savingProfile}>
                      {savingProfile ? "保存中..." : "保存する"}
                    </button>
                    <button type="button" className="btn btn--ghost btn--inline" onClick={() => setEditing(false)}>
                      キャンセル
                    </button>
                  </div>
                </form>
              )}
            </div>

            <h2 className="section-title">投稿</h2>
            {posts.length === 0 ? (
              <p className="timeline-status">まだ投稿がありません。</p>
            ) : (
              posts.map((post) => (
                <PostCard key={post.id} post={post} onDelete={handleDeletePost} onToggleLike={handleToggleLikeOnPost} />
              ))
            )}
          </>
        )}
      </main>
    </>
  );
}
