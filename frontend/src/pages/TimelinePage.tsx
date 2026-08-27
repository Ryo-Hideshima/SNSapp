import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, deletePost, listNewPosts, listPosts, type Post } from "../api/posts";
import { AppHeader } from "../components/AppHeader";
import { PostCard } from "../components/PostCard";

const POLL_INTERVAL_MS = 20000;

export function TimelinePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingNewPosts, setPendingNewPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // ポーリングのタイマーが古いclosureのpostsを参照しないよう、最新の先頭投稿IDをrefで保持する
  const newestIdRef = useRef<number | null>(null);
  useEffect(() => {
    newestIdRef.current = posts[0]?.id ?? null;
  }, [posts]);

  useEffect(() => {
    let cancelled = false;

    listPosts({ size: 20 })
      .then((result) => {
        if (!cancelled) setPosts(result.posts);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "タイムラインの取得に失敗しました。");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 定期ポーリング: 新着があっても自動では差し込まず、バナーで知らせるだけに留める(X/Twitter方式)
  useEffect(() => {
    const timer = window.setInterval(() => {
      const sinceId = newestIdRef.current;
      if (sinceId == null) return;

      listNewPosts(sinceId)
        .then((result) => {
          if (result.posts.length > 0) {
            setPendingNewPosts(result.posts);
          }
        })
        .catch(() => {
          // ポーリングの失敗は画面に出さず静かに次回へ持ち越す
        });
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  const showPendingPosts = () => {
    setPosts((prev) => [...pendingNewPosts, ...prev]);
    setPendingNewPosts([]);
  };

  const handleManualRefresh = async () => {
    const sinceId = newestIdRef.current;
    if (sinceId == null) return;

    setRefreshing(true);
    try {
      const result = await listNewPosts(sinceId);
      if (result.posts.length > 0) {
        setPosts((prev) => [...result.posts, ...prev]);
      }
      setPendingNewPosts([]);
    } catch {
      // 手動更新の失敗は静かに無視する(既存表示はそのまま)
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deletePost(id);
      setPosts((prev) => prev.filter((post) => post.id !== id));
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "削除に失敗しました。");
    }
  };

  return (
    <>
      <AppHeader onRefresh={handleManualRefresh} refreshing={refreshing} />
      <main className="page page--timeline">
        <div className="timeline-toolbar">
          <h1 className="timeline-title">タイムライン</h1>
          <Link to="/posts/new" className="btn btn--inline">
            投稿する
          </Link>
        </div>

        {pendingNewPosts.length > 0 && (
          <button type="button" className="new-posts-banner" onClick={showPendingPosts}>
            新着{pendingNewPosts.length}件を表示
          </button>
        )}

        {loading && <p className="timeline-status">読み込み中...</p>}
        {!loading && error && <p className="timeline-status timeline-status--error">{error}</p>}
        {!loading && !error && posts.length === 0 && (
          <p className="timeline-status">まだ投稿がありません。最初の投稿をしてみましょう。</p>
        )}

        {!loading &&
          !error &&
          posts.map((post) => <PostCard key={post.id} post={post} onDelete={handleDelete} />)}
      </main>
    </>
  );
}
