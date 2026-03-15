# 구현 완료 결과 요약

---

## Q. npm run dev 여러 프로젝트 + 포트 관리

**해결책: `projects.json`에 `devPort` 필드 추가**

각 프로젝트마다 고유한 포트를 지정:
```json
"landing": { "devPort": 3000 }
"domain":  { "devPort": 3001 }
"bridge":  { "devPort": 3002 }
```

`/screenshot` 명령 시 현재 프로젝트의 devPort로 자동 접속.
새 프로젝트(`/new_project`) 생성 시 자동으로 다음 포트 할당 (3010부터).

**각 프로젝트 dev 서버 시작법:**
```bash
# landing_interior 프로젝트에서
PORT=3000 npm run dev

# domain_platform 프로젝트에서
PORT=3001 npm run dev
```

Next.js는 기본적으로 포트가 이미 사용 중이면 다음 포트를 자동 사용하기도 함.
명시적으로 지정하려면 `package.json`의 dev 스크립트에 `--port 3001` 추가 또는 `PORT=3001 npm run dev`.

---

## Q. ngrok — 외부에서 localhost 접속

**구현 완료: Telegram `/ngrok` 명령**

```
/ngrok          → 현재 프로젝트 devPort를 외부 공개
/ngrok 3000     → 특정 포트 지정
```

**동작 방식:**
1. WSL에서 ngrok 시작 (`nohup ngrok http [port] &`)
2. ngrok API(`localhost:4040`)에서 공개 URL 추출
3. Telegram으로 URL 전송

**결과 예시:**
```
✅ ngrok 터널!
🔗 https://abc123.ngrok.io

모바일에서 이 URL로 접속 가능
```

**ngrok 설치 (아직 안 한 경우):**
```bash
# WSL Ubuntu에서
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# 또는 (snap)
sudo snap install ngrok

# 계정 연결 (ngrok.com 에서 authtoken 복사)
ngrok config add-authtoken [YOUR_TOKEN]
```

**사용 시나리오:**
1. PC에서 `npm run dev` 실행 (landing: port 3000)
2. Telegram에서 `/ngrok` 전송
3. URL 받아서 모바일 브라우저에서 열기
4. Claude가 수정한 결과를 실시간으로 모바일에서 확인

---

## /fix, /done 슬래시 명령 추가

**구현 완료.** `.claude/commands/` 에 추가됨.

### `/fix [에러내용]`
error-diagnoser 에이전트를 호출해서 에러 진단 및 수정.
```
/fix                    → 빌드 에러 자동 탐지 후 수정
/fix TypeScript error   → 특정 에러 내용을 힌트로 전달
```

### `/done [메모]`
작업 완료 시 실행. 순서대로:
1. git diff 확인
2. git add + commit (한국어 메시지)
3. CURRENT_STATE.md 업데이트
4. NEXT_TASK.md 확인
5. work-reporter 에이전트 호출 → 보고서 생성
```
/done                   → 일반 완료 처리
/done Hero 섹션 완성    → 커밋 메시지 힌트 제공
```

**이미 있던 `/do` 명령과의 차이:**
- `/do [요청]` → 작업 시작 (spec-writer → implementer)
- `/done` → 작업 완료 (commit + 보고서)
- `/fix` → 에러 수정 특화

---

## /new-project — 템플릿 파일 추가

**구현 완료.** 새 프로젝트 생성 시 아래 파일들이 자동 생성됨:

| 파일 | 내용 |
|------|------|
| `CLAUDE.md` | 프로젝트 개요, 기술스택, 명령어 가이드 |
| `CURRENT_STATE.md` | 현재 구현 상태 추적 |
| `NEXT_TASK.md` | 다음 작업 목록 |
| `RUNBOOK.md` | 운영 명령어 모음 |
| `PRD.md` | 제품 요구사항 문서 템플릿 |

**.claude 폴더 복사로 자동 포함되는 것들:**
- `agents/spec-writer.md` ✅
- `agents/implementer.md` ✅
- `commands/do.md` ✅
- `commands/fix.md` ✅ (신규)
- `commands/done.md` ✅ (신규)
- `agents/work-reporter.md` ✅
- 기타 모든 전문 에이전트들

---

## notify.sh — work-reporter 스타일 개선

**구현 완료.** 이전 대비 개선사항:

**이전:**
```
✅ Claude 작업 완료 (14:32:10)

[마지막 assistant 메시지 원문...]

─────────────
📋 /logs 로 전체 출력 확인
```

**이후:**
```
📦 작업 완료 (14:32:10)
프로젝트: landing_interior

✏️ 변경 파일:
• src/components/Hero.tsx | 23 +++--
• src/app/page.tsx | 5 +-

💡 작업 내용:
[마지막 작업 요약]

🔖 최근 커밋: feat: Hero 섹션 배경 개선

─────────────
📋 /logs 로 전체 출력 확인
```

git이 없는 프로젝트(crawl, naver_momcafe 등)에서는 변경 파일 섹션 자동 생략.

---

## Q. CRON이란? naver_momcafe 자동화

**정확한 이해:**
- Cron = 스케줄러 (특정 시간에 자동으로 스크립트 실행)
- "텔레그램으로 실행해줘" 방식은 cron이 아님 — 그건 그냥 수동 실행

**두 가지 완전히 다른 방식:**

### 방식 A: 텔레그램 → Claude 에이전트 → 스크립트 실행
```
텔레그램: "크롤링 시작해줘"
    ↓
Claude가 crawl.py 또는 crawl.js 실행
    ↓
결과 요약해서 답변
```
장점: 대화형, 결과 바로 확인 가능
단점: 내가 텔레그램 보내야 시작됨, context 소모

### 방식 B: Cron (완전 자동화)
```
매일 오전 9시
    ↓
cron이 자동으로 crawl.py 실행
    ↓
결과를 Telegram으로 직접 전송 (Claude 개입 없음)
```
장점: 완전 자동, context 소모 없음
단점: 유연한 판단 불가

**naver_momcafe 권장 아키텍처:**
- 크롤링/자동화 루틴 → Python/Node 스크립트로 구현
- 스크립트가 직접 결과를 Telegram에 전송
- 판단이 필요한 경우에만 Claude 호출 (하루 1~2회)
- Context 소모 없이 상시 운영 가능

---

## Q. Playwright 스크린샷 테스트

**준비:**
```bash
# WSL Ubuntu에서 (한 번만 실행)
cd /mnt/d/Documents/Claudecode-telegram
npx playwright install chromium
```

**테스트 순서:**
1. landing 프로젝트에서 `npm run dev` 실행 (port 3000)
2. Telegram: `/project landing`
3. Telegram: `/screenshot`

서버가 없으면 bridge.js가 자동으로 dev server 시작 시도함.
단, 세션이 먼저 켜져있어야 함(`/startclaude`).

---

## 전체 구현 파일 목록

| 파일 | 변경 내용 |
|------|---------|
| `.claude/commands/fix.md` | 신규 생성 |
| `.claude/commands/done.md` | 신규 생성 |
| `setup-project.sh` | 5개 템플릿 파일 자동 생성, devPort 자동 할당 |
| `notify.sh` | work-reporter 스타일 개선 (git diff, 프로젝트명) |
| `projects.json` | 전체 프로젝트에 devPort 추가 |
| `bridge.js` | devPort 기반 스크린샷 URL, /ngrok 명령 추가 |

**bridge.js 재시작 필요:**
PowerShell에서 현재 실행 중인 `node bridge.js` 종료 후 재시작.
