# /new_project 테스트 가이드

---

## 사전 확인

PowerShell에서 bridge가 실행 중인지 확인:
```powershell
cd D:\Documents\Claudecode-telegram
node telegram/bridge.js
```

---

## 테스트 실행

Telegram에서 입력:
```
/new_project test-github
```

약 20~30초 대기. 성공하면 이런 메시지가 온다:
```
✅ 프로젝트 생성 완료!

📁 이름: test-github
📂 경로: /mnt/d/Documents/test-github
🖥 세션: claude-test-github

지금 바로 작업 지시를 입력하세요.
```

---

## 체크리스트

### 1. 폴더 생성 확인
Windows 탐색기에서 `D:\Documents\test-github` 폴더 열기.

아래 파일들이 있어야 한다:
```
test-github/
├── .claude/           ← 에이전트, 명령어, 스킬 폴더
├── CLAUDE.md
├── CURRENT_STATE.md
├── NEXT_TASK.md
├── RUNBOOK.md
└── PRD.md
```

### 2. .claude 내부 확인
`D:\Documents\test-github\.claude\` 안에:
- `agents/` 폴더 (spec-writer.md, implementer.md 등 27개)
- `commands/` 폴더 (do.md, fix.md, done.md)
- `skills/` 폴더
- `settings.local.json` (bypassPermissions + notify.sh hook)

### 3. GitHub 레포 확인
브라우저에서:
```
https://github.com/woopsmarketing/test-github
```

Private 레포가 생성되어 있고, 첫 커밋이 push 되어 있어야 한다.

### 4. Claude 세션 확인
Telegram에서:
```
/status
```

`test-github` 세션이 ✅로 표시되어야 한다.

### 5. 메시지 전송 테스트
Telegram에서:
```
/project test-github
```
그 다음:
```
안녕 지금 이 프로젝트 구조 설명해줘
```

Claude가 응답하면 성공.

---

## 테스트 후 정리

테스트 프로젝트 삭제하려면:

### Telegram에서:
```
/project-remove test-github
```

### GitHub 레포 삭제 (선택):
```
https://github.com/woopsmarketing/test-github/settings
```
맨 아래 → Delete this repository

### 로컬 폴더 삭제 (선택):
Windows 탐색기에서 `D:\Documents\test-github` 삭제
