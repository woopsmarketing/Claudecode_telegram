#!/bin/bash
# Claude Code Stop hook → Telegram 완료 알림
# 위치: /mnt/d/Documents/Claudecode-telegram/telegram/notify.sh

ENV_FILE="/mnt/d/Documents/Claudecode-telegram/.env"

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$ALLOWED_CHAT_ID" ]; then
  exit 0
fi

# stdin에서 hook JSON 읽기
INPUT=$(cat)

# transcript_path 및 cwd 추출
eval $(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(f'TRANSCRIPT=\"{d.get(\"transcript_path\", \"\")}\"')
    print(f'PROJECT_CWD=\"{d.get(\"cwd\", \"\")}\"')
except:
    print('TRANSCRIPT=\"\"')
    print('PROJECT_CWD=\"\"')
" 2>/dev/null)

# ── 작업 요약 추출 ──
SUMMARY=""
if [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
  SUMMARY=$(python3 -c "
import json, re, sys

# transcript 전체 읽기 (마지막 500줄)
try:
    with open('$TRANSCRIPT', 'r') as f:
        lines = f.readlines()
    lines = lines[-500:]
except:
    sys.exit(0)

# 무시할 패턴
NOISE = [
    r'Context Usage', r'Custom agents', r'Memory files', r'MCP tools',
    r'Skills \xb7', r'Free space', r'Autocompact', r'tokens?\s*\(',
    r'^[\s\u2514\u251c\u2502\u26b6\u26c1\u26c0]+$',
    r'^(ok|done|yes|\ub124|\uc644\ub8cc)$',
    r'Available|Loaded|Deferred',
    r'^\u2500+$', r'^\s*$',
]

def is_noise(text):
    text = text.strip()
    if len(text) < 30:
        return True
    for pat in NOISE:
        if re.search(pat, text, re.IGNORECASE):
            return True
    return False

# 역순으로 탐색 — 마지막 의미있는 assistant 텍스트 찾기
for line in reversed(lines):
    try:
        d = json.loads(line.strip())
    except:
        continue
    if d.get('role') != 'assistant':
        continue

    content = d.get('content', '')
    texts = []
    if isinstance(content, list):
        for c in content:
            if isinstance(c, dict) and c.get('type') == 'text':
                t = c.get('text', '').strip()
                if t:
                    texts.append(t)
    elif isinstance(content, str) and content.strip():
        texts.append(content.strip())

    for t in texts:
        # ANSI 코드 제거
        t = re.sub(r'\x1b\[[0-9;]*m', '', t)
        if not is_noise(t):
            # 첫 3줄만 (너무 길면)
            result_lines = t.split('\n')
            result = '\n'.join(result_lines[:5])
            if len(result) > 500:
                result = result[:500] + '...'
            print(result)
            sys.exit(0)

# 못 찾으면 빈 문자열
print('')
" 2>/dev/null)
fi

# ── 변경 파일 목록 ──
CHANGED_FILES=""
FILE_COUNT=0
if [ -n "$PROJECT_CWD" ] && [ -d "$PROJECT_CWD/.git" ]; then
  # 커밋 수 확인
  COMMIT_COUNT=$(cd "$PROJECT_CWD" && git rev-list --count HEAD 2>/dev/null || echo "0")

  # 커밋되지 않은 변경사항 확인
  UNSTAGED=$(cd "$PROJECT_CWD" && git diff --name-only 2>/dev/null)
  STAGED=$(cd "$PROJECT_CWD" && git diff --cached --name-only 2>/dev/null)

  if [ -n "$UNSTAGED" ] || [ -n "$STAGED" ]; then
    # 아직 커밋 안 된 변경사항
    CHANGED_FILES=$(cd "$PROJECT_CWD" && { git diff --name-only 2>/dev/null; git diff --cached --name-only 2>/dev/null; } | sort -u | head -10 | sed 's/^/• /')
    FILE_COUNT=$(cd "$PROJECT_CWD" && { git diff --name-only 2>/dev/null; git diff --cached --name-only 2>/dev/null; } | sort -u | wc -l)
  elif [ "$COMMIT_COUNT" -gt 1 ] 2>/dev/null; then
    # 커밋이 2개 이상일 때만 diff 표시 (초기 커밋이면 스킵)
    CHANGED_FILES=$(cd "$PROJECT_CWD" && git diff --name-only HEAD~1 HEAD 2>/dev/null | head -10 | sed 's/^/• /')
    FILE_COUNT=$(cd "$PROJECT_CWD" && git diff --name-only HEAD~1 HEAD 2>/dev/null | wc -l)
  fi
  # 커밋이 1개뿐이면 (초기 커밋) → 변경 파일 표시 안 함
fi

# ── 최근 커밋 메시지 ──
LAST_COMMIT=""
if [ -n "$PROJECT_CWD" ] && [ -d "$PROJECT_CWD/.git" ]; then
  LAST_COMMIT=$(cd "$PROJECT_CWD" && git log --format="%s" -1 2>/dev/null || true)
fi

# ── fallback ──
if [ -z "$SUMMARY" ] && [ -n "$LAST_COMMIT" ]; then
  SUMMARY="${LAST_COMMIT}"
fi
if [ -z "$SUMMARY" ]; then
  SUMMARY="(요약 없음 — /logs 확인)"
fi

# ── 메시지 구성 ──
TIMESTAMP=$(date '+%H:%M:%S')
PROJECT_NAME=$(basename "$PROJECT_CWD" 2>/dev/null || echo "unknown")

MESSAGE="📦 [${PROJECT_NAME}] 작업 완료 ${TIMESTAMP}"$'\n'$'\n'
MESSAGE+="💡 ${SUMMARY}"

if [ -n "$CHANGED_FILES" ] && [ "$FILE_COUNT" -gt 0 ]; then
  MESSAGE+=$'\n'$'\n'"✏️ 변경 ${FILE_COUNT}개:"$'\n'
  MESSAGE+="${CHANGED_FILES}"
fi

# ── Telegram 전송 (inline keyboard 포함) ──
MESSAGE_JSON=$(echo "$MESSAGE" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read()))")

curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": \"${ALLOWED_CHAT_ID}\",
    \"text\": ${MESSAGE_JSON},
    \"reply_markup\": {
      \"inline_keyboard\": [
        [
          {\"text\": \"📋 로그\", \"callback_data\": \"logs\"},
          {\"text\": \"📸 스크린샷\", \"callback_data\": \"screenshot\"},
          {\"text\": \"📊 상태\", \"callback_data\": \"status\"}
        ],
        [
          {\"text\": \"↩️ /undo\", \"callback_data\": \"cc_undo\"},
          {\"text\": \"🔧 /compact\", \"callback_data\": \"cc_compact\"},
          {\"text\": \"📈 /context\", \"callback_data\": \"cc_context\"}
        ],
        [
          {\"text\": \"📝 git diff\", \"callback_data\": \"git_diff\"},
          {\"text\": \"✅ /done\", \"callback_data\": \"cc_done\"},
          {\"text\": \"🛠 /fix\", \"callback_data\": \"cc_fix\"}
        ],
        [
          {\"text\": \"🔄 dev 재시작\", \"callback_data\": \"dev_restart\"},
          {\"text\": \"🌐 ngrok\", \"callback_data\": \"ngrok\"}
        ]
      ]
    }
  }" > /dev/null 2>&1
