#!/bin/bash
set -e

PROJECT_NAME="$1"
if [ -z "$PROJECT_NAME" ]; then
  echo "ERROR: 프로젝트 이름을 입력하세요" >&2
  exit 1
fi

BRIDGE_ROOT="/mnt/d/Documents/Claudecode-telegram"
PROJECT_ROOT="/mnt/d/Documents/${PROJECT_NAME}"
PROJECTS_JSON="${BRIDGE_ROOT}/projects.json"

echo "1. 디렉토리 생성: ${PROJECT_ROOT}"
mkdir -p "${PROJECT_ROOT}"

echo "2. .claude 폴더 복사"
cp -r "${BRIDGE_ROOT}/.claude" "${PROJECT_ROOT}/"

echo "3. CLAUDE.md 생성"
touch "${PROJECT_ROOT}/CLAUDE.md"

echo "4. settings.local.json 생성"
cat > "${PROJECT_ROOT}/.claude/settings.local.json" << 'SETTINGS'
{
  "permissions": {
    "defaultMode": "bypassPermissions",
    "allow": ["Bash(*)"]
  },
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "/mnt/d/Documents/Claudecode-telegram/notify.sh"
          }
        ]
      }
    ]
  }
}
SETTINGS

echo "5. projects.json 업데이트"
python3 -c "
import json
with open('${PROJECTS_JSON}', 'r') as f:
    projects = json.load(f)
projects['${PROJECT_NAME}'] = {'session': 'claude-${PROJECT_NAME}', 'root': '${PROJECT_ROOT}', 'label': '${PROJECT_NAME}'}
with open('${PROJECTS_JSON}', 'w') as f:
    json.dump(projects, f, indent=2, ensure_ascii=False)
print('OK')
"

echo "6. nvm 로드"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

echo "7. tmux 세션 시작"
tmux kill-session -t "claude-${PROJECT_NAME}" 2>/dev/null || true
tmux new-session -d -s "claude-${PROJECT_NAME}" -c "${PROJECT_ROOT}" bash -l
sleep 2

echo "8. claude 실행"
tmux send-keys -t "claude-${PROJECT_NAME}" 'claude' Enter
sleep 7

echo "9. trust 프롬프트 수락"
tmux send-keys -t "claude-${PROJECT_NAME}" '' Enter
sleep 1

echo "완료: ${PROJECT_NAME}"
