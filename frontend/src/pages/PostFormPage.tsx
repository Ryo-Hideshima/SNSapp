import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError, createPost, getPost, updatePost } from "../api/posts";
import { AppHeader } from "../components/AppHeader";

const MAX_LENGTH = 280;

export function PostFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined;
  const navigate = useNavigate();

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit || id === undefined) return;

    let cancelled = false;
    getPost(Number(id))
      .then((post) => {
        if (!cancelled) setContent(post.content);
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
  }, [isEdit, id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isEdit && id !== undefined) {
        await updatePost(Number(id), content);
      } else {
        await createPost(content);
      }
      navigate("/timeline");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "投稿に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AppHeader />
      <main className="page">
        <div className="card">
          <h1>{isEdit ? "投稿を編集" : "投稿する"}</h1>

          {loading ? (
            <p className="card__sub">読み込み中...</p>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-field">
                <label htmlFor="content">本文</label>
                <textarea
                  id="content"
                  rows={5}
                  required
                  maxLength={MAX_LENGTH}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="いまどうしてる？"
                />
                <span className="form-hint">
                  {content.length}/{MAX_LENGTH}
                </span>
              </div>
              <p className="form-error">{error}</p>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? "送信中..." : isEdit ? "更新する" : "投稿する"}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
