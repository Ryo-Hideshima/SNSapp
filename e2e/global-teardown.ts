// 全テスト実行後に1回だけ呼ばれる。e2e_プレフィックスのテストデータを
// 実際のPostgreSQLクライアント(pg)で直接削除する。
// k6(performance-tests)のサンドボックス化されたJSランタイムと違い、Node.jsは
// 本物のDBクライアントを使えるため、手動実行不要で自動的にクリーンアップできる。
//
// 削除順序はperformance-tests/scripts/cleanup.sqlと同じ考え方
// (likes/commentsのpost_idのみON DELETE CASCADEで、他は非CASCADEのため、
//  子テーブル→親テーブルの順で明示的に削除する)。
import { Client } from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://snsapp:snsapp@localhost:5432/snsapp';

export default async function globalTeardown() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();

    const pattern = 'e2e_%';
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE username LIKE $1)`,
      [pattern]
    );
    await client.query(
      `DELETE FROM follows WHERE follower_id IN (SELECT id FROM users WHERE username LIKE $1)
                              OR followee_id IN (SELECT id FROM users WHERE username LIKE $1)`,
      [pattern]
    );
    await client.query(
      `DELETE FROM likes WHERE user_id IN (SELECT id FROM users WHERE username LIKE $1)
                           OR post_id IN (SELECT id FROM posts WHERE user_id IN (SELECT id FROM users WHERE username LIKE $1))`,
      [pattern]
    );
    await client.query(
      `DELETE FROM comments WHERE user_id IN (SELECT id FROM users WHERE username LIKE $1)
                              OR post_id IN (SELECT id FROM posts WHERE user_id IN (SELECT id FROM users WHERE username LIKE $1))`,
      [pattern]
    );
    await client.query(
      `DELETE FROM posts WHERE user_id IN (SELECT id FROM users WHERE username LIKE $1)`,
      [pattern]
    );
    const result = await client.query(`DELETE FROM users WHERE username LIKE $1`, [pattern]);
    await client.query('COMMIT');

    console.log(`[global-teardown] e2e_プレフィックスのユーザー${result.rowCount}件を削除しました`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[global-teardown] クリーンアップに失敗しました。手動で確認してください:', err);
  } finally {
    await client.end();
  }
}
