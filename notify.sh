#!/bin/bash
# Claude Code Stop hook → Telegram 완료 알림
# 위치: /mnt/d/Documents/Claudecode-telegram/notify.sh
# 이 스크립트는 WSL 안에서 실행됨

ENV_FILE="/mnt/d/Documents/Claudecode-telegram/.env"

# .env 로드
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$ALLOWED_CHAT_ID" ]; then
  exit 0
fi

# stdin에서 hook JSON 읽기
INPUT=$(cat)

# transcript_path 추출
TRANSCRIPT=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('transcript_path', ''))
except:
    print('')
" 2>/dev/null)

# 마지막 assistant 메시지 추출 (최대 800자)
SUMMARY=""
if [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
  SUMMARY=$(tail -30 "$TRANSCRIPT" | python3 -c "
import sys, json
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
# ANSI 코드 제거 & 길이 제한
import re
last_msg = re.sub(r'\x1b\[[0-9;]*m', '', last_msg)
print(last_msg[:800])
" 2>/dev/null)
fi

if [ -z "$SUMMARY" ]; then
  SUMMARY="작업이 완료되었습니다."
fi

# 메시지 구성
TIMESTAMP=$(date '+%H:%M:%S')
MESSAGE="✅ Claude 작업 완료 (${TIMESTAMP})

${SUMMARY}

─────────────
📋 /logs 로 전체 출력 확인"

# Telegram 전송 (POST JSON 방식)
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": \"${ALLOWED_CHAT_ID}\",
    \"text\": $(echo "$MESSAGE" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read()))")
  }" > /dev/null 2>&1
