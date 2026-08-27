import { Link } from "react-router-dom";
import type { Post } from "../api/posts";
import { useAuth } from "../auth/AuthContext";

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface PostCardProps {
  post: Post;
  onDelete: (id: number) => void;
}

export function PostCard({ post, onDelete }: PostCardProps) {
  const { user } = useAuth();
  const isOwner = user?.userId === post.authorId;

  const handleDelete = () => {
    if (window.confirm("この投稿を削除しますか？")) {
      onDelete(post.id);
    }
  };

  return (
    <article className="post-card">
      <div className="post-card__header">
        <span className="post-card__author-name">{post.authorDisplayName}</span>
        <span className="post-card__author-username">@{post.authorUsername}</span>
        <span className="post-card__time">・{formatDateTime(post.createdAt)}</span>
      </div>
      <p className="post-card__content">{post.content}</p>
      {isOwner && (
        <div className="post-card__actions">
          <Link to={`/posts/${post.id}/edit`} className="post-card__action">
            編集
          </Link>
          <button type="button" className="post-card__action post-card__action--danger" onClick={handleDelete}>
            削除
          </button>
        </div>
      )}
    </article>
  );
}
