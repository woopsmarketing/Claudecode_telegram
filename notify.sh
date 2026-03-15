#!/bin/bash
# Claude Code Stop hook → Telegram 완료 알림 (work-reporter 스타일)
# 위치: /mnt/d/Documents/Claudecode-telegram/notify.sh

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
TRANSCRIPT=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('transcript_path', ''))
except:
    print('')
" 2>/dev/null)

PROJECT_CWD=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('cwd', ''))
except:
    print('')
" 2>/dev/null)

# 마지막 assistant 메시지 추출 (최대 600자)
SUMMARY=""
if [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
  SUMMARY=$(tail -50 "$TRANSCRIPT" | python3 -c "
import sys, json, re
lines = sys.stdin.read().strip().split('\n')
last_msg = ''
for line in reversed(lines):
    try:
        d = json.loads(line)
        role = d.get('role', '')
        if role == 'assistant':
            content = d.get('content', '')
            if isinstance(content, list):
                for c in content:
                    if isinstance(c, dict) and c.get('type') == 'text':
                        last_msg = c['text'].strip()
                        break
            elif isinstance(content, str):
                last_msg = content.strip()
            if last_msg:
                break
    except:
        pass
last_msg = re.sub(r'\x1b\[[0-9;]*m', '', last_msg)
print(last_msg[:600])
" 2>/dev/null)
fi

# 변경 파일 목록 (git diff --stat)
CHANGED_FILES=""
if [ -n "$PROJECT_CWD" ] && [ -d "$PROJECT_CWD/.git" ]; then
  CHANGED_FILES=$(cd "$PROJECT_CWD" && git diff --stat HEAD~1 HEAD 2>/dev/null | head -8 | grep '|' | sed 's/^/• /' || true)
fi
if [ -z "$CHANGED_FILES" ] && [ -n "$PROJECT_CWD" ] && [ -d "$PROJECT_CWD/.git" ]; then
  CHANGED_FILES=$(cd "$PROJECT_CWD" && git diff --stat 2>/dev/null | head -8 | grep '|' | sed 's/^/• /' || true)
fi

# 최근 커밋 (있으면)
LAST_COMMIT=""
if [ -n "$PROJECT_CWD" ] && [ -d "$PROJECT_CWD/.git" ]; then
  LAST_COMMIT=$(cd "$PROJECT_CWD" && git log --oneline -1 2>/dev/null || true)
fi

if [ -z "$SUMMARY" ]; then
  SUMMARY="작업이 완료되었습니다."
fi

# 메시지 구성 (work-reporter 스타일)
TIMESTAMP=$(date '+%H:%M:%S')
PROJECT_NAME=$(basename "$PROJECT_CWD" 2>/dev/null || echo "unknown")

MESSAGE="📦 작업 완료 (${TIMESTAMP})"$'\n'
MESSAGE+="프로젝트: ${PROJECT_NAME}"$'\n'$'\n'

if [ -n "$CHANGED_FILES" ]; then
  MESSAGE+="✏️ 변경 파일:"$'\n'
  MESSAGE+="${CHANGED_FILES}"$'\n'$'\n'
fi

MESSAGE+="💡 작업 내용:"$'\n'
MESSAGE+="${SUMMARY}"$'\n'

if [ -n "$LAST_COMMIT" ]; then
  MESSAGE+=$'\n'"🔖 최근 커밋: ${LAST_COMMIT}"$'\n'
fi

MESSAGE+=$'\n'"─────────────"$'\n'
MESSAGE+="📋 /logs 로 전체 출력 확인"

# Telegram 전송
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": \"${ALLOWED_CHAT_ID}\",
    \"text\": $(echo "$MESSAGE" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read()))")
  }" > /dev/null 2>&1
