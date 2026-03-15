# 운영 런북

## 시작하기

### 1. bridge.js 시작 (PowerShell)
```bash
cd D:\Documents\Claudecode-telegram
node telegram/bridge.js
```

### 2. 프로젝트 세션 시작 (Telegram)
```
/startall          # 전체 프로젝트 시작
/startclaude       # 현재 프로젝트만 시작
```

### 3. 작업 시작
```
/project landing   # 프로젝트 전환
Hero 섹션 만들어줘  # 일반 메시지로 전송
```

## 자주 쓰는 명령어

| 명령 | 설명 |
|------|------|
| `node telegram/bridge.js` | 브릿지 시작 (PowerShell) |
| `/menu` | Telegram 버튼 메뉴 |
| `/status` | 세션 상태 확인 |
| `/logs` | Claude 출력 확인 |
| `/screenshot` | 프론트엔드 스크린샷 |
| `/ngrok` | 외부 URL 생성 (모바일 미리보기) |

## 에이전트/스킬 수정

```bash
# 에이전트 수정 (이 프로젝트의 .claude/ 내에서)
# 수정 후 새로 만드는 프로젝트에 자동 반영됨

# 기존 프로젝트에 수동 반영
wsl.exe -d Ubuntu -- bash -c "cp -r /mnt/d/Documents/Claudecode-telegram/.claude/agents/ /mnt/d/Documents/<프로젝트>/.claude/"
```

## 트러블슈팅

### bridge.js 안 됨
- `.env` 파일 확인 (TELEGRAM_BOT_TOKEN, ALLOWED_CHAT_ID)
- `npm install` 실행
- 다른 bridge.js 프로세스가 이미 실행 중인지 확인

### 세션이 안 뜸
- WSL Ubuntu 설치 확인: `wsl -d Ubuntu -- echo ok`
- tmux 설치 확인: `wsl -d Ubuntu -- tmux -V`
- nvm/node 확인: `wsl -d Ubuntu -- bash -lc "node -v"`

### Git push 실패
- credential manager 경로 확인:
  ```bash
  wsl.exe -d Ubuntu -- git config --global credential.helper
  ```
- 경로 재설정:
  ```bash
  wsl.exe -d Ubuntu -- git config --global credential.helper '/mnt/c/Program\ Files/Git/mingw64/bin/git-credential-manager-core.exe'
  ```

### notify.sh 알림 안 옴
- CRLF 확인: `wsl.exe -d Ubuntu -- sed -i 's/\r//' /mnt/d/Documents/Claudecode-telegram/notify.sh`
- 수동 테스트: `echo '{}' | wsl.exe -d Ubuntu -- bash /mnt/d/Documents/Claudecode-telegram/notify.sh`
