#!/usr/bin/env bash
# k6シナリオを実行し、終了後にそのシナリオが作った使い捨てユーザーだけを自動削除する。
#
# 02-post-write.js / 03-likes-comments.js / 06-auth-flow.js / browser/01-user-journey.js は
# 実行のたびに専用のperftest_ユーザーを新規作成するため、繰り返し実行するとデータが
# 増え続ける。これらはこのラッパー経由で実行すると、k6終了後に自動でクリーンアップされる。
#
# 01-timeline-read.js / 04-user-search.js / 05-follow-profile.js は既存のシード済み
# ユーザー(scripts/seed.js / seed-relations.js)にログインするだけで新規ユーザーを作らないため、
# 対象外(このラッパーを使う必要はない)。
#
# 使い方:
#   performance-tests/scripts/run-with-cleanup.sh <k6スクリプト> <usernameパターン> [k6の追加オプション...]
#
# 例:
#   performance-tests/scripts/run-with-cleanup.sh \
#     performance-tests/scenarios/02-post-write.js 'perftest_w%'
#   performance-tests/scripts/run-with-cleanup.sh \
#     performance-tests/scenarios/03-likes-comments.js 'perftest_hp_%' --env VUS=50 --env DURATION=2m
#   performance-tests/scripts/run-with-cleanup.sh \
#     performance-tests/scenarios/06-auth-flow.js 'perftest_auth_%'
#   performance-tests/scripts/run-with-cleanup.sh \
#     performance-tests/scenarios/browser/01-user-journey.js 'perftest_ui_%'
#
# リポジトリ直下から実行すること(docker composeがdocker-compose.ymlを見つけられる場所)。

set -euo pipefail

if [ $# -lt 2 ]; then
  echo "使い方: $0 <k6スクリプト> <usernameパターン> [k6の追加オプション...]" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCENARIO="$1"
PATTERN="$2"
shift 2

set +e
k6 run "$SCENARIO" "$@"
K6_EXIT_CODE=$?
set -e

echo ""
echo "テストデータを削除しています(username LIKE '${PATTERN}')..."
docker compose exec -T postgres psql -U snsapp -d snsapp -v pattern="${PATTERN}" < "${SCRIPT_DIR}/cleanup-pattern.sql"
echo "削除完了"

exit "${K6_EXIT_CODE}"
