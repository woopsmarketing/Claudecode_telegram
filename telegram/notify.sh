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

# ── 작업 요약 추출 (transcript에서 마지막 의미있는 assistant 메시지) ──
SUMMARY=""
if [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
  SUMMARY=$(tail -200 "$TRANSCRIPT" | python3 -c "
import sys, json, re

lines = sys.stdin.read().strip().split('\n')

# 무시할 패턴 (context 출력, 짧은 확인 메시지 등)
SKIP_PATTERNS = [
    r'^(Context Usage|Custom agents|Project|Skills|Memory files|MCP tools)',
    r'^[\s└├│⛶⛁⛀]+',  # tree/box characters
    r'^\s*$',
    r'^(ok|done|완료|네|yes)',
    r'^(Available|Loaded|Deferred)',
    r'tokens?\s*\(',
    r'Free space:',
    r'Autocompact',
    r'^─+$',
]

def is_noise(text):
    for pat in SKIP_PATTERNS:
        if re.search(pat, text, re.IGNORECASE):
            return True
    return len(text.strip()) < 20

# 모든 assistant 텍스트 메시지 수집 (최근 것부터)
candidates = []
for line in reversed(lines):
    try:
        d = json.loads(line)
        if d.get('role') != 'assistant':
            continue
        content = d.get('content', '')
        texts = []
        if isinstance(content, list):
            for c in content:
                if isinstance(c, dict) and c.get('type') == 'text':
                    texts.append(c['text'].strip())
        elif isinstance(content, str):
            texts.append(content.strip())

        for t in texts:
            # ANSI 코드 제거
            t = re.sub(r'\x1b\[[0-9;]*m', '', t)
            # 노이즈가 아닌 의미있는 텍스트만
            if not is_noise(t) and len(t) > 30:
                candidates.append(t)
    except:
        pass

if candidates:
    # 가장 최근의 의미있는 메시지 사용
    best = candidates[0]
    # 너무 길면 앞부분만
    if len(best) > 800:
        best = best[:800] + '...'
    print(best)
else:
    print('')
" 2>/dev/null)
fi

# ── 변경 파일 목록 ──
CHANGED_FILES=""
FILE_COUNT=0
if [ -n "$PROJECT_CWD" ] && [ -d "$PROJECT_CWD/.git" ]; then
  # 커밋되지 않은 변경사항 먼저 확인
  UNSTAGED=$(cd "$PROJECT_CWD" && git diff --name-only 2>/dev/null | head -10)
  STAGED=$(cd "$PROJECT_CWD" && git diff --cached --name-only 2>/dev/null | head -10)

  if [ -n "$UNSTAGED" ] || [ -n "$STAGED" ]; then
    CHANGED_FILES=$(cd "$PROJECT_CWD" && { git diff --name-only 2>/dev/null; git diff --cached --name-only 2>/dev/null; } | sort -u | head -10 | sed 's/^/• /')
    FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l)
  else
    # 최근 커밋의 변경사항
    CHANGED_FILES=$(cd "$PROJECT_CWD" && git diff --name-only HEAD~1 HEAD 2>/dev/null | head -10 | sed 's/^/• /')
    FILE_COUNT=$(cd "$PROJECT_CWD" && git diff --name-only HEAD~1 HEAD 2>/dev/null | wc -l)
  fi
fi

# ── 최근 커밋 메시지 ──
LAST_COMMIT=""
if [ -n "$PROJECT_CWD" ] && [ -d "$PROJECT_CWD/.git" ]; then
  LAST_COMMIT=$(cd "$PROJECT_CWD" && git log --format="%s" -1 2>/dev/null || true)
fi

# ── fallback: git 커밋 메시지를 요약으로 사용 ──
if [ -z "$SUMMARY" ] && [ -n "$LAST_COMMIT" ]; then
  SUMMARY="최근 커밋: ${LAST_COMMIT}"
fi
if [ -z "$SUMMARY" ]; then
  SUMMARY="(요약 추출 실패 — /logs 로 확인하세요)"
fi

# ── 메시지 구성 ──
TIMESTAMP=$(date '+%H:%M:%S')
PROJECT_NAME=$(basename "$PROJECT_CWD" 2>/dev/null || echo "unknown")

MESSAGE="📦 작업 완료 [${PROJECT_NAME}] ${TIMESTAMP}"$'\n'$'\n'

MESSAGE+="💡 ${SUMMARY}"$'\n'

if [ -n "$CHANGED_FILES" ]; then
  MESSAGE+=$'\n'"✏️ 변경 파일 (${FILE_COUNT}개):"$'\n'
  MESSAGE+="${CHANGED_FILES}"$'\n'
fi

MESSAGE+=$'\n'"📋 /logs 로 전체 확인"

# ── Telegram 전송 ──
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": \"${ALLOWED_CHAT_ID}\",
    \"text\": $(echo "$MESSAGE" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read()))")
  }" > /dev/null 2>&1
