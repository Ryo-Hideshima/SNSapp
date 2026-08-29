-- 特定のusernameパターンに一致するデータだけを削除する(scripts/run-with-cleanup.shから使われる)。
-- cleanup.sqlと同じ削除順序・考え方だが、対象を:pattern(psql変数)で絞り込める版。
--
-- 実行例:
--   docker compose exec -T postgres psql -U snsapp -d snsapp -v pattern='perftest_auth_%' < performance-tests/scripts/cleanup-pattern.sql

BEGIN;

DELETE FROM refresh_tokens
WHERE user_id IN (SELECT id FROM users WHERE username LIKE :'pattern');

DELETE FROM follows
WHERE follower_id IN (SELECT id FROM users WHERE username LIKE :'pattern')
   OR followee_id IN (SELECT id FROM users WHERE username LIKE :'pattern');

DELETE FROM likes
WHERE user_id IN (SELECT id FROM users WHERE username LIKE :'pattern')
   OR post_id IN (SELECT id FROM posts WHERE user_id IN (SELECT id FROM users WHERE username LIKE :'pattern'));

DELETE FROM comments
WHERE user_id IN (SELECT id FROM users WHERE username LIKE :'pattern')
   OR post_id IN (SELECT id FROM posts WHERE user_id IN (SELECT id FROM users WHERE username LIKE :'pattern'));

DELETE FROM posts
WHERE user_id IN (SELECT id FROM users WHERE username LIKE :'pattern');

DELETE FROM users
WHERE username LIKE :'pattern';

COMMIT;
