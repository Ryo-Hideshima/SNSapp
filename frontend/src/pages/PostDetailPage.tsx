import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, deletePost, getPost, toggleLike, type Post } from "../api/posts";
import { createComment, deleteComment, listComments, type Comment } from "../api/comments";
import { AppHeader } from "../components/AppHeader";
import { useAuth } from "../auth/AuthContext";

const MAX_COMMENT_LENGTH = 140;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [commentError, setCommentError] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getPost(postId), listComments(postId)])
      .then(([postResult, commentsResult]) => {
        if (cancelled) return;
        setPost(postResult);
        setComments(commentsResult);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "投稿の取得に失敗しました。");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [postId]);

  const handleToggleLike = async () => {
    if (!post) return;
    try {
      const result = await toggleLike(post.id);
      setPost({ ...post, likedByCurrentUser: result.liked, likeCount: result.likeCount });
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "いいねに失敗しました。");
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    if (!window.confirm("この投稿を削除しますか？")) return;
    try {
      await deletePost(post.id);
      navigate("/timeline");
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "削除に失敗しました。");
    }
  };

  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();
    setCommentError("");
    setSubmittingComment(true);
    try {
      const created = await createComment(postId, commentContent);
      setComments((prev) => [...prev, created]);
      setCommentContent("");
      setPost((prev) => (prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev));
    } catch (err) {
      setCommentError(err instanceof ApiError ? err.message : "コメントの投稿に失敗しました。");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm("このコメントを削除しますか？")) return;
    try {
      await deleteComment(postId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setPost((prev) => (prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : prev));
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "削除に失敗しました。");
    }
  };

  return (
    <>
      <AppHeader />
      <main className="page page--timeline">
        {loading && <p className="timeline-status">読み込み中...</p>}
        {!loading && error && <p className="timeline-status timeline-status--error">{error}</p>}

        {!loading && !error && post && (
          <>
            <article className="post-card">
              <div className="post-card__header">
                <Link to={`/users/${post.authorUsername}`} className="post-card__author-name">
                  {post.authorDisplayName}
                </Link>
                <Link to={`/users/${post.authorUsername}`} className="post-card__author-username">
                  @{post.authorUsername}
                </Link>
                <span className="post-card__time">・{formatDateTime(post.createdAt)}</span>
              </div>
              <p className="post-card__content">{post.content}</p>
              <div className="post-card__stats">
                <button
                  type="button"
                  className={`post-card__like-btn${post.likedByCurrentUser ? " post-card__like-btn--liked" : ""}`}
                  onClick={handleToggleLike}
                >
                  {post.likedByCurrentUser ? "❤" : "♡"} {post.likeCount}
                </button>
                <span className="post-card__comment-count">💬 {post.commentCount}</span>
              </div>
              {user?.userId === post.authorId && (
                <div className="post-card__actions">
                  <button type="button" className="post-card__action post-card__action--danger" onClick={handleDeletePost}>
                    削除
                  </button>
                </div>
              )}
            </article>

            <h2 className="section-title">コメント</h2>
            <div className="card">
              <form onSubmit={handleSubmitComment} noValidate>
                <div className="form-field">
                  <label htmlFor="comment-content">コメントする</label>
                  <textarea
                    id="comment-content"
                    rows={3}
                    required
                    maxLength={MAX_COMMENT_LENGTH}
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="コメントを入力"
                  />
                  <span className="form-hint">
                    {commentContent.length}/{MAX_COMMENT_LENGTH}
                  </span>
                </div>
                <p className="form-error">{commentError}</p>
                <button type="submit" className="btn btn--inline" disabled={submittingComment}>
                  {submittingComment ? "送信中..." : "コメントする"}
                </button>
              </form>
            </div>

            {comments.length === 0 ? (
              <p className="timeline-status">まだコメントはありません。</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="comment-card">
                  <div className="post-card__header">
                    <Link to={`/users/${comment.authorUsername}`} className="post-card__author-name">
                      {comment.authorDisplayName}
                    </Link>
                    <Link to={`/users/${comment.authorUsername}`} className="post-card__author-username">
                      @{comment.authorUsername}
                    </Link>
                    <span className="post-card__time">・{formatDateTime(comment.createdAt)}</span>
                  </div>
                  <p className="post-card__content">{comment.content}</p>
                  {user?.userId === comment.authorId && (
                    <div className="post-card__actions">
                      <button
                        type="button"
                        className="post-card__action post-card__action--danger"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        削除
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </main>
    </>
  );
}
