#!/bin/bash
# setup-project.sh — 새 프로젝트 생성 및 Claude 환경 셋업

PROJECT_NAME="$1"
if [ -z "$PROJECT_NAME" ]; then
  echo "ERROR: 프로젝트 이름을 입력하세요"
  exit 1
fi

BRIDGE_ROOT="/mnt/d/Documents/Claudecode-telegram"
PROJECT_ROOT="/mnt/d/Documents/${PROJECT_NAME}"
PROJECTS_JSON="${BRIDGE_ROOT}/projects.json"

echo "프로젝트 생성 중: ${PROJECT_NAME}"

# 1. 프로젝트 디렉토리 생성
mkdir -p "${PROJECT_ROOT}"

# 2. .claude 폴더를 프로젝트 루트에 복사 (폴더 자체를 복사)
cp -r "${BRIDGE_ROOT}/.claude" "${PROJECT_ROOT}/"

# 3. 빈 CLAUDE.md 생성
touch "${PROJECT_ROOT}/CLAUDE.md"

# 4. settings.local.json 덮어쓰기 (hooks 포함)
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

# 5. projects.json 업데이트
python3 - << PYEOF
import json

with open('${PROJECTS_JSON}', 'r') as f:
    projects = json.load(f)

projects['${PROJECT_NAME}'] = {
    'session': 'claude-${PROJECT_NAME}',
    'root': '${PROJECT_ROOT}',
    'label': '${PROJECT_NAME}'
}

with open('${PROJECTS_JSON}', 'w') as f:
    json.dump(projects, f, indent=2, ensure_ascii=False)

print('projects.json 업데이트 완료')
PYEOF

# 6. nvm 로드
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# 7. 기존 세션 제거 후 새 세션 시작
tmux kill-session -t "claude-${PROJECT_NAME}" 2>/dev/null || true
tmux new-session -d -s "claude-${PROJECT_NAME}" -c "${PROJECT_ROOT}" bash -l
sleep 2

# 8. claude 실행
tmux send-keys -t "claude-${PROJECT_NAME}" 'claude' Enter
sleep 7

# 9. trust this folder 프롬프트 자동 수락 (Enter)
tmux send-keys -t "claude-${PROJECT_NAME}" '' Enter
sleep 2

echo "완료: ${PROJECT_NAME}"
