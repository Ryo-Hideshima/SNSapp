-- パフォーマンステストで作成したデータ(username LIKE 'perftest_%')だけを安全に削除する。
-- 外部キーのON DELETE CASCADEは likes/comments の post_id にしか設定されていないため、
-- 子テーブル→親テーブルの順で明示的に削除する。何度実行しても安全(冪等)。
--
-- 実行例:
--   docker compose exec -T postgres psql -U snsapp -d snsapp -f performance-tests/scripts/cleanup.sql

BEGIN;

DELETE FROM refresh_tokens
WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'perftest_%');

DELETE FROM follows
WHERE follower_id IN (SELECT id FROM users WHERE username LIKE 'perftest_%')
   OR followee_id IN (SELECT id FROM users WHERE username LIKE 'perftest_%');

DELETE FROM likes
WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'perftest_%')
   OR post_id IN (SELECT id FROM posts WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'perftest_%'));

DELETE FROM comments
WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'perftest_%')
   OR post_id IN (SELECT id FROM posts WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'perftest_%'));

DELETE FROM posts
WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'perftest_%');

DELETE FROM users
WHERE username LIKE 'perftest_%';

COMMIT;

-- 確認用: 0件になっていればクリーンアップ完了
SELECT
  (SELECT COUNT(*) FROM users WHERE username LIKE 'perftest_%') AS remaining_users,
  (SELECT COUNT(*) FROM posts WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'perftest_%')) AS remaining_posts;
