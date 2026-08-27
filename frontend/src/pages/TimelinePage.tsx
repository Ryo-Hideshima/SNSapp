import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, deletePost, listNewPosts, listPosts, type Post } from "../api/posts";
import { AppHeader } from "../components/AppHeader";
import { PostCard } from "../components/PostCard";

const PAGE_SIZE = 20;
const POLL_INTERVAL_MS = 20000;

export function TimelinePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingNewPosts, setPendingNewPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // ポーリング・無限スクロールのタイマー/observerが古いclosureの値を参照しないよう、refでも保持する
  const newestIdRef = useRef<number | null>(null);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const nextPageRef = useRef(1);

  useEffect(() => {
    newestIdRef.current = posts[0]?.id ?? null;
  }, [posts]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  useEffect(() => {
    let cancelled = false;

    listPosts({ size: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setPosts(result.posts);
        setHasMore(result.hasMore);
        nextPageRef.current = 1;
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

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await listPosts({ page: nextPageRef.current, size: PAGE_SIZE });
      setPosts((prev) => [...prev, ...result.posts]);
      setHasMore(result.hasMore);
      nextPageRef.current += 1;
    } catch {
      // 追加読み込みの失敗は静かに無視する(再度スクロールすれば再試行される)
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  // 無限スクロール: リスト末尾のセンチネル要素が見えたら次ページを読み込む。
  // センチネルはローディング完了後にしか描画されないため、useEffect+refではなく
  // callback refでDOMへのアタッチ/デタッチのタイミングに合わせてobserverを付け替える。
  const sentinelObserverRef = useRef<IntersectionObserver | null>(null);
  const sentinelCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      sentinelObserverRef.current?.disconnect();
      sentinelObserverRef.current = null;

      if (!node) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            loadMore();
          }
        },
        { rootMargin: "300px" }
      );
      observer.observe(node);
      sentinelObserverRef.current = observer;
    },
    [loadMore]
  );

  useEffect(() => () => sentinelObserverRef.current?.disconnect(), []);

  const showPendingPosts = () => {
    setPosts((prev) => [...pendingNewPosts, ...prev]);
    setPendingNewPosts([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      window.scrollTo({ top: 0, behavior: "smooth" });
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

      {pendingNewPosts.length > 0 && (
        <button type="button" className="new-posts-banner" onClick={showPendingPosts}>
          新着{pendingNewPosts.length}件を表示
        </button>
      )}

      <main className="page page--timeline">
        <div className="timeline-toolbar">
          <h1 className="timeline-title">タイムライン</h1>
          <Link to="/posts/new" className="btn btn--inline">
            投稿する
          </Link>
        </div>

        {loading && <p className="timeline-status">読み込み中...</p>}
        {!loading && error && <p className="timeline-status timeline-status--error">{error}</p>}
        {!loading && !error && posts.length === 0 && (
          <p className="timeline-status">まだ投稿がありません。最初の投稿をしてみましょう。</p>
        )}

        {!loading &&
          !error &&
          posts.map((post) => <PostCard key={post.id} post={post} onDelete={handleDelete} />)}

        {!loading && !error && posts.length > 0 && (
          <div ref={sentinelCallbackRef} className="timeline-sentinel">
            {loadingMore && <span>読み込み中...</span>}
            {!hasMore && <span>これ以上の投稿はありません</span>}
          </div>
        )}
      </main>
    </>
  );
}
