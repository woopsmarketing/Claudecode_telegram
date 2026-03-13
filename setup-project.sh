#!/bin/zsh
# setup-project.sh — 새 프로젝트 생성 및 Claude 환경 셋업
# 사용: /mnt/d/Documents/Claudecode-telegram/setup-project.sh <project-name>

set -e

PROJECT_NAME="$1"
if [ -z "$PROJECT_NAME" ]; then
  echo "ERROR: 프로젝트 이름을 입력하세요"
  exit 1
fi

BRIDGE_ROOT="/mnt/d/Documents/Claudecode-telegram"
PROJECT_ROOT="/mnt/d/Documents/${PROJECT_NAME}"
PROJECTS_JSON="${BRIDGE_ROOT}/projects.json"

echo "🚀 프로젝트 생성 중: ${PROJECT_NAME}"

# 1. 프로젝트 디렉토리 생성
mkdir -p "${PROJECT_ROOT}"

# 2. .claude 폴더 복사
cp -r "${BRIDGE_ROOT}/.claude" "${PROJECT_ROOT}/.claude"

# 3. 빈 CLAUDE.md 생성
touch "${PROJECT_ROOT}/CLAUDE.md"

# 4. settings.local.json 생성 (hooks 포함)
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
SESSION_NAME="claude-${PROJECT_NAME}"
python3 - << PYEOF
import json

with open('${PROJECTS_JSON}', 'r') as f:
    projects = json.load(f)

key = '${PROJECT_NAME}'
projects[key] = {
    'session': '${SESSION_NAME}',
    'root': '${PROJECT_ROOT}',
    'label': '${PROJECT_NAME}'
}

with open('${PROJECTS_JSON}', 'w') as f:
    json.dump(projects, f, indent=2, ensure_ascii=False)

print(f'projects.json 업데이트 완료: {key}')
PYEOF

# 6. nvm 로드 후 tmux 세션 시작
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# 기존 세션 있으면 제거
tmux kill-session -t "${SESSION_NAME}" 2>/dev/null || true

# 새 tmux 세션 생성
tmux new-session -d -s "${SESSION_NAME}" -c "${PROJECT_ROOT}" zsh -l
sleep 2

# claude 실행
tmux send-keys -t "${SESSION_NAME}" 'claude' Enter
sleep 6

# trust this folder 프롬프트 자동 수락 (Enter = 기본값 Yes)
tmux send-keys -t "${SESSION_NAME}" '' Enter
sleep 2

echo "✅ 완료: ${PROJECT_NAME}"
echo "SESSION: ${SESSION_NAME}"
echo "ROOT: ${PROJECT_ROOT}"
