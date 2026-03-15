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
cat > "${PROJECT_ROOT}/CLAUDE.md" << CLAUDEMD
# ${PROJECT_NAME}

## 프로젝트 개요
(프로젝트 목표와 설명을 여기에 작성)

## 기술 스택
- (예: Next.js 14, TypeScript, Tailwind CSS, Supabase)

## 주요 명령어
\`\`\`bash
npm run dev    # 개발 서버
npm run build  # 빌드
npm run lint   # 린트
\`\`\`

## 작업 지침
- /do [요청] : 짧은 요청을 명세서로 변환 후 구현
- /fix [에러] : 에러 진단 및 수정
- /done : 작업 완료 처리 (commit + 보고서)

# currentDate
Today's date is $(date '+%Y-%m-%d').
CLAUDEMD

echo "3b. CURRENT_STATE.md 생성"
cat > "${PROJECT_ROOT}/CURRENT_STATE.md" << 'STATEFILE'
# 현재 상태

## 구현 완료
- [ ] 프로젝트 초기 설정

## 현재 작동 상태
- 개발 서버: 미확인
- 빌드: 미확인

## 알려진 이슈
없음

## 마지막 업데이트
프로젝트 생성일
STATEFILE

echo "3c. NEXT_TASK.md 생성"
cat > "${PROJECT_ROOT}/NEXT_TASK.md" << 'NEXTTASK'
# 다음 작업 목록

## 우선순위 높음
- [ ] 프로젝트 목표 및 요구사항 정의 (CLAUDE.md 작성)
- [ ] 기술 스택 확정

## 우선순위 중간
- [ ] 초기 구조 설계

## 백로그
없음
NEXTTASK

echo "3d. RUNBOOK.md 생성"
cat > "${PROJECT_ROOT}/RUNBOOK.md" << 'RUNBOOK'
# 운영 런북

## 개발 환경 시작
```bash
npm install
npm run dev
```

## 배포
```bash
git push origin main  # Vercel 자동 배포
```

## 자주 쓰는 명령어
| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 시작 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | 코드 린트 |

## 환경변수
`.env.local` 파일 필요. 팀원에게 공유받을 것.

## 트러블슈팅
(문제 발생 시 여기에 추가)
RUNBOOK

echo "3e. PRD.md 생성"
cat > "${PROJECT_ROOT}/PRD.md" << 'PRDFILE'
# PRD (Product Requirements Document)

## 1. 배경 및 목적
(왜 이 프로젝트를 만드는가)

## 2. 목표
-

## 3. 타겟 사용자
-

## 4. 핵심 기능
### 4.1
### 4.2

## 5. 비기능 요구사항
- 성능:
- 보안:
- 접근성:

## 6. 성공 지표
-

## 7. 제외 범위
(이번 버전에서 하지 않을 것)
PRDFILE

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
            "command": "/mnt/d/Documents/Claudecode-telegram/telegram/notify.sh"
          }
        ]
      }
    ]
  }
}
SETTINGS

echo "5. projects.json 업데이트 (devPort 자동 할당)"
python3 -c "
import json
with open('${PROJECTS_JSON}', 'r') as f:
    projects = json.load(f)
# devPort 자동 할당 (기존 최대값 + 1, 최소 3010부터)
used_ports = [p.get('devPort', 0) for p in projects.values()]
next_port = max(used_ports + [3009]) + 1
projects['${PROJECT_NAME}'] = {
    'session': 'claude-${PROJECT_NAME}',
    'root': '${PROJECT_ROOT}',
    'label': '${PROJECT_NAME}',
    'devPort': next_port
}
with open('${PROJECTS_JSON}', 'w') as f:
    json.dump(projects, f, indent=2, ensure_ascii=False)
print('devPort:', next_port)
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
