# Claude Code Bridge & Framework

Telegram 원격 제어 + Claude Code 프레임워크(에이전트/스킬/명령어) 통합 관리 프로젝트.

## 프로젝트 구조

```
claudecode-telegram/
│
├── telegram/                  # 📡 Telegram 원격 제어
│   ├── bridge.js                  # Bot ↔ Claude Code 브릿지 (핵심)
│   ├── screenshot.js              # Playwright 스크린샷 → Telegram 전송
│   ├── notify.sh                  # Claude Stop hook → Telegram 완료 알림
│   └── setup-project.sh           # /new_project 자동 생성 스크립트
│
├── .claude/                   # 🤖 Claude Code 프레임워크
│   ├── agents/                    # 27개 전문 에이전트
│   │   ├── spec-writer.md
│   │   ├── implementer.md
│   │   ├── work-reporter.md
│   │   ├── error-diagnoser.md
│   │   └── ... (23개 더)
│   ├── commands/                  # 슬래시 명령어
│   │   ├── do.md                      # /do — 요청 → 명세 → 구현
│   │   ├── fix.md                     # /fix — 에러 진단/수정
│   │   └── done.md                    # /done — 커밋 + 보고서
│   ├── skills/                    # 재사용 스킬 패키지
│   │   ├── vercel-react-best-practices/
│   │   ├── hook-creator/
│   │   ├── skill-creator/
│   │   ├── slash-command-creator/
│   │   ├── subagent-creator/
│   │   └── youtube-collector/
│   ├── scripts/
│   └── settings.local.json
│
├── prompt/                    # 📝 Q&A 기록
│
├── .env                       # 환경변수 (BOT_TOKEN, CHAT_ID)
├── projects.json              # 다중 프로젝트 목록 (devPort 포함)
├── package.json
├── CLAUDE.md                  # 이 파일
├── CURRENT_STATE.md
├── NEXT_TASK.md
├── RUNBOOK.md
└── PRD.md
```

## 주요 명령어

### Telegram 봇 명령
| 명령 | 기능 |
|------|------|
| `/menu` | 전체 버튼 메뉴 |
| `/project <이름>` | 프로젝트 전환 |
| `/status` | 세션 상태 확인 |
| `/startall` / `/stopall` | 전체 시작/종료 |
| `/model 1/2/3` | 모델 변경 (Opus/Sonnet/Haiku) |
| `/screenshot` | 현재 프로젝트 스크린샷 |
| `/ngrok` | 외부 접속 URL 생성 |
| `/new_project <이름>` | 새 프로젝트 생성 |
| `//compact`, `//clear` 등 | Claude 내부 슬래시 명령 전달 |

### Claude Code 슬래시 명령
| 명령 | 기능 |
|------|------|
| `/do [요청]` | 요청 → spec-writer → implementer 워크플로 |
| `/fix [에러]` | error-diagnoser로 에러 진단/수정 |
| `/done [메모]` | git commit + 상태 업데이트 + 보고서 |

## 아키텍처

```
📱 Telegram
    ↓ (Telegram Bot API)
💻 telegram/bridge.js (Windows Node.js)
    ↓ (wsl.exe -d Ubuntu)
🐧 WSL2 Ubuntu
    ↓ (tmux send-keys)
🤖 Claude Code CLI (각 프로젝트 세션)
    ↓ (Stop hook)
📢 telegram/notify.sh → Telegram 완료 알림
```

## 프레임워크 배포 흐름

```
이 프로젝트의 .claude/ 수정
    ↓
/new_project 실행 시
    ↓
setup-project.sh → .claude/ 전체 복사
    ↓
새 프로젝트에 에이전트/명령어/스킬 배포됨
```

에이전트나 스킬을 여기서 수정하면 이후 생성되는 모든 프로젝트에 반영.
기존 프로젝트에는 수동 복사 필요: `cp -r .claude/agents/ /mnt/d/Documents/<프로젝트>/.claude/`

## 환경

- **Runtime**: Windows Node.js + WSL2 Ubuntu
- **패키지**: node-telegram-bot-api, playwright, dotenv, form-data
- **Claude CLI**: WSL Ubuntu에서 nvm으로 설치
- **퍼미션**: bypassPermissions (settings.local.json)

# currentDate
Today's date is 2026-03-16.
