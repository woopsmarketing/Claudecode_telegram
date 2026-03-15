아래 내용을 그대로 **Claude Code 프롬프트로 전달하면 됩니다.**
목표, 요구사항, 아키텍처, 구현 범위를 명확하게 정리했습니다.

---

# Telegram → Claude Code 원격 제어 시스템 구현 명세

## 목표

로컬 PC에서 실행되는 **Claude Code 세션을 Telegram을 통해 원격 제어**할 수 있는 시스템을 구축한다.

사용자는 외부 환경(예: 피시방, 모바일 등)에서 **Telegram 메시지를 통해 Claude Code에 프롬프트를 전달하고 작업을 이어서 진행**할 수 있어야 한다.

Claude Code는 **tmux 세션 내부에서 실행되며**, 세션이 없으면 자동으로 생성되고 Claude가 실행되어야 한다.

---

# 핵심 기능 요구사항

## 1. Telegram 메시지 → Claude Code 프롬프트 전달

사용자가 Telegram Bot에 메시지를 보내면

```
Telegram
↓
Bridge Server
↓
tmux session
↓
Claude Code CLI
```

위 흐름으로 메시지가 전달되어야 한다.

---

## 2. Claude 세션 자동 관리

Bridge 프로그램은 Claude Code 세션 상태를 확인해야 한다.

### Claude 세션이 존재하는 경우

```
tmux session 존재
→ 해당 세션에 프롬프트 전달
```

### Claude 세션이 없는 경우

```
tmux session 없음
→ 새 tmux 세션 생성
→ 프로젝트 루트로 이동
→ claude 실행
→ 프롬프트 전달
```

---

## 3. Claude 실행 위치

Claude Code는 반드시 아래 프로젝트 루트에서 실행되어야 한다.

예시

```
/mnt/d/Documents/landing_interior
```

---

## 4. tmux 세션 구조

Claude Code는 tmux 세션 내부에서 실행되어야 한다.

예시 세션 이름

```
claude-main
```

Claude 실행 흐름

```
tmux new-session -d -s claude-main
cd /project/root
claude
```

---

## 5. Telegram Bot 명령 체계

Telegram에서 아래 명령어를 사용할 수 있어야 한다.

### `/status`

현재 Claude 세션 상태 확인

예시 응답

```
Claude session running
session: claude-main
project: landing_interior
```

또는

```
Claude session not running
```

---

### `/ask <message>`

Claude Code 세션에 프롬프트 전달

예시

```
/ask 로그인 API 오류 원인 분석하고 수정해줘
```

동작

```
tmux send-keys → Claude CLI 입력
```

---

### `/startclaude`

Claude 세션이 없으면 새로 시작

```
tmux session 생성
cd project root
claude 실행
```

---

### `/stopclaude`

Claude 세션 종료

```
tmux kill-session -t claude-main
```

---

### `/logs`

Claude 세션의 최근 출력 일부 조회

예시

```
tmux capture-pane
```

최근 로그 일부를 Telegram으로 전송

---

## 6. Claude 응답 전달

Claude Code 실행 결과는 Telegram으로 전달되어야 한다.

가능한 방법

### 방법 1 (간단)

tmux 출력 캡처

```
tmux capture-pane -pt claude-main
```

최근 출력만 전송

---

### 방법 2 (고급)

Claude Code hooks 사용

Claude 작업 완료 시

```
hook → transcript 읽기 → Telegram 전송
```

---

## 7. 보안 요구사항

Telegram Bot은 반드시 **허용된 chat id만 접근 가능**해야 한다.

예시

```
ALLOWED_CHAT_ID
```

허용되지 않은 사용자의 메시지는 무시한다.

---

## 8. Bridge Server 역할

Bridge 서버는 다음 기능을 수행해야 한다.

### Telegram 메시지 수신

Webhook 또는 polling 방식 사용

---

### 명령어 파싱

```
/status
/ask
/startclaude
/stopclaude
/logs
```

---

### Claude 세션 관리

```
tmux has-session
tmux new-session
tmux send-keys
tmux kill-session
```

---

### Claude 실행 자동화

Claude 세션이 없으면

```
tmux new-session
cd project
claude
```

---

## 9. 시스템 아키텍처

```
Telegram
↓
Telegram Bot API
↓
Bridge Server (Python or Node)
↓
tmux session manager
↓
Claude Code CLI
↓
Project workspace
```

---

## 10. 실행 환경

권장 환경

```
Windows PC
WSL2 Ubuntu
tmux
Claude Code CLI
Python or Node Bridge Server
Telegram Bot
```

---

## 11. 사용 시나리오

### 상황 1 — Claude 이미 실행 중

사용자

```
/ask 로그인 오류 수정해줘
```

시스템

```
tmux send-keys → Claude 입력
```

Claude 작업 수행

결과 일부 Telegram 전송

---

### 상황 2 — Claude 실행 안 됨

사용자

```
/ask landing_interior 프로젝트 분석해줘
```

시스템

```
tmux session 없음
→ tmux 생성
→ 프로젝트 루트 이동
→ claude 실행
→ 프롬프트 전달
```

---

### 상황 3 — 상태 확인

사용자

```
/status
```

응답

```
Claude session running
uptime: 2h 13m
project: landing_interior
```

---

### 상황 4 — 세션 종료

사용자

```
/stopclaude
```

시스템

```
tmux kill-session
```

---

# 추가 요구사항

가능하면 아래 기능도 고려

### 프로젝트 전환

```
/project <name>
```

---

### 작업 완료 알림

Claude 작업 완료 시 Telegram 알림

---

### 긴 응답 분할 전송

Telegram 메시지 길이 제한 처리

---

# 최종 목표

Telegram을 통해

* Claude Code 세션 시작
* Claude 프롬프트 전달
* Claude 작업 상태 확인
* Claude 세션 종료

를 **완전히 원격으로 제어**할 수 있는 시스템 구축.

---

이 명세를 기반으로

* Bridge Server 코드
* Telegram Bot
* tmux 세션 관리
* Claude CLI 연동

을 구현한다.

---

원하면 다음 단계로 **Claude Code에 넣으면 바로 구현 시작하는 “초강력 프롬프트 버전”**도 만들어줄게.
(지금 준 건 **설계 명세**, 그 다음은 **코드 생성용 프롬프트**다.)
