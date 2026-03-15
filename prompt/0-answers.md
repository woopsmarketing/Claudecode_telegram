# 0.prompt 질문 답변 정리

---

## Q1. PowerShell에서 node bridge.js 실행해도 되나?

**→ 된다. 오히려 권장.**

`bridge.js`는 Windows Node.js 환경에서 실행되는 프로그램이다.
내부에서 `wsl -d Ubuntu ...` 명령을 호출해서 WSL로 작업을 전달하는 구조이기 때문에,
bridge 자체는 Windows(PowerShell, CMD, Windows Terminal 어디서든)에서 실행해도 정상 작동한다.

WSL Ubuntu 터미널에서 실행할 필요 없다.

---

## Q2. npm run dev 켜놓는 이유 / 모바일에서 localhost 접속?

**npm run dev 켜놓는 이유:**
`/screenshot` 기능이 `localhost:3000`에 Playwright(헤드리스 브라우저)로 접속해서 스크린샷을 찍는다.
개발 서버가 꺼져 있으면 스크린샷이 실패한다.

**텔레그램으로 시각적 결과 볼 수 있나?**
가능하다. `/screenshot` 명령 → Playwright가 localhost에 접속 → 스크린샷 이미지 → Telegram으로 전송.
즉, Claude가 코드 수정 → 개발 서버가 반영 → /screenshot으로 결과 이미지 받기.

**모바일에서 localhost:3000 직접 접속?**
기본적으로는 불가능. `localhost`는 해당 PC 내부에서만 접근 가능.
모바일에서 보려면 두 가지 방법이 있다:

1. **ngrok 사용** (추천): `ngrok http 3000` 실행 → 외부 접속 가능한 URL 발급 → 모바일 브라우저에서 접속
2. **같은 WiFi라면**: PC의 로컬 IP(`192.168.x.x:3000`)로 접속 가능. 외출 중엔 불가.

---

## Q3. 프로젝트별 모델 설정

**현재 /model의 문제:**
`/model claude-opus-4-6` 을 tmux에 입력하면 해당 Claude 세션의 전역 모델이 바뀐다.
다른 프로젝트 세션과는 독립적이지만, 세션이 재시작되면 기본값으로 돌아온다.

**로컬 PC에서 프로젝트별 기본 모델 고정하는 법:**
각 프로젝트의 `.claude/settings.local.json`에 모델 설정 추가:
```json
{
  "model": "claude-opus-4-6",
  "permissions": {
    "defaultMode": "bypassPermissions"
  }
}
```
이렇게 하면 해당 프로젝트에서 claude를 시작할 때 항상 지정된 모델로 시작된다.

**텔레그램에서 프로젝트별 모델 설정:**
현재 `/model 1/2/3`은 현재 선택된 세션에만 적용된다.
프로젝트별 기본 모델을 저장하려면 `projects.json`에 `model` 필드를 추가하고
세션 시작 시 해당 모델로 적용하도록 개선할 수 있다. (구현 필요)

---

## Q4. /fix, /done 은 Claude Code 슬래시 명령으로 이미 있는거 아닌가?

맞다. Claude Code에 이미 있는 주요 슬래시 명령들:

| 명령 | 기능 |
|------|------|
| `/compact` | 컨텍스트 압축 (context 절약) |
| `/clear` | 대화 초기화 |
| `/undo` | 마지막 변경 취소 |
| `/review` | 변경사항 리뷰 |
| `/help` | 도움말 |

`/fix`, `/done` 같은 건 직접 프롬프트로 쓰는 게 더 유연하다.
"빌드 에러 고쳐줘", "작업 완료 후 git commit 해줘" 처럼 자연어로 보내면 된다.
텍스트 확장 앱 제안은 단축어 입력 도구일 뿐, Claude Code 내장 기능과 별개다.

---

## Q5. Stop Hook 알림 이미 적용되어있는 거 아닌가?

맞다. 이미 구현되어 있다.
`notify.sh`가 각 프로젝트의 `.claude/settings.local.json`에 Stop hook으로 등록되어 있어서
Claude 작업 완료 시 자동으로 Telegram 알림이 온다.
"Stop Hook 알림 최대 활용"은 이미 완료된 항목이었다.

---

## Q6. /ask 명령이 필요한가?

크게 필요 없다.
현재 Telegram에서 메시지 보내면 현재 선택된 프로젝트로 자동 전송된다.
프로젝트 바꾸려면 `/project <이름>` 하면 되니까 `/ask landing ...` 형태는 굳이 없어도 된다.

---

## Q7. work-reporter 에이전트 자동 호출 → 변경 내역 요약

구현하면 유용한 기능이다.
현재 알림: "Claude 작업 완료" (단순 텍스트)
개선 후: Claude가 뭘 만들었는지 파일 변경 요약 + 주요 내용을 Telegram으로 전송

`notify.sh`에서 `work-reporter` 에이전트를 호출하거나,
transcript를 파싱해서 마지막 assistant 메시지를 더 구조화해서 보내는 방식으로 구현 가능.

---

## Q8. Cron이 뭔지 / naver_momcafe 자동화 방법 / Context 소모 걱정

**Cron이란?**
Linux/Mac의 작업 스케줄러. "매일 오전 9시에 이 스크립트 실행해" 같은 걸 설정하는 것.
Windows에서는 "작업 스케줄러"가 동일한 역할을 한다.

**naver_momcafe 같은 상시 실행 프로젝트에 Claude 에이전트를 쓰면 좋은 이유:**
- 단순 크롤링은 스크립트로 충분
- 하지만 "수집한 글 중에 반응 좋은 주제 뽑아서 댓글 초안 작성" 같은 판단이 필요한 작업은 Claude가 필요
- 즉, 반복 실행(cron) + 결과물 분석(Claude)의 조합

**Context 소모 걱정에 대한 해결책:**

Claude에게 "실시간으로 계속" 작업시키는 건 비효율적이고 context 소모가 크다.
권장 방식:
1. **Python/Node 스크립트로 크롤링** → 데이터 저장
2. **하루 1~2회 Claude 호출** → 저장된 데이터 분석 및 액션 결정
3. Claude는 판단/생성에만 사용, 반복 수집은 독립 스크립트로 처리

즉, Claude가 상시 켜져 있을 필요 없다.

---

## Q9. 리팩토링이 뭔지 / 워크플로 루틴이 이미 실현 가능한 거 아닌가?

**리팩토링(Refactoring)이란?**
기능은 그대로 유지하면서 코드의 구조, 가독성, 유지보수성을 개선하는 작업.
예: 중복 코드 제거, 긴 함수를 작은 함수로 분리, 변수명 명확하게 바꾸기 등.
"작동은 하는데 코드가 지저분하다" → 리팩토링으로 깔끔하게 만들기.

**워크플로 루틴은 이미 실현 가능한가?**
맞다. 대부분 이미 가능하다:
- /log로 확인 → 가능
- /screenshot으로 확인 → 가능 (개발 서버 켜져 있으면)
- 알림 오면 확인 → 이미 작동 중

앞서 제안한 워크플로 루틴은 "추가 개발이 필요한 기능"이 아니라
"이미 있는 기능을 이렇게 활용하면 좋다"는 사용법 제안이었다.

---

## Q10. Playwright 스크린샷 테스트 방법 / 로직 설명

**스크린샷 로직:**

```
/screenshot 명령 입력
    ↓
screenshot.js 실행
    ↓
Playwright(헤드리스 Chrome) → localhost:3000 접속
    ↓
페이지 전체 스크린샷 촬영 → screenshot.png 저장
    ↓
Telegram Bot API → sendPhoto → 사용자에게 이미지 전송
```

**즉, 필요한 조건:**
1. `npm run dev`로 개발 서버가 켜져 있어야 함
2. Playwright가 설치되어 있어야 함

**테스트 방법:**
```bash
# WSL Ubuntu에서
cd /mnt/d/Documents/Claudecode-telegram

# Playwright 설치 확인
npx playwright install chromium

# 개발 서버 켜기 (다른 터미널에서)
cd /mnt/d/Documents/landing_interior
npm run dev

# Telegram에서
/project landing
/screenshot
```

**Vercel 자동배포 후 스크린샷?**
기술적으로 가능하다. `screenshot.js`의 URL을 `localhost:3000` 대신 Vercel 도메인으로 바꾸면 된다.
장점: 개발 서버 안 켜도 됨.
단점: 배포 반영까지 1~2분 대기 필요.
현재는 localhost 방식으로 구현되어 있다.

---

## 현재 상태 요약

| 항목 | 상태 |
|------|------|
| GitHub PAT 토큰 | ✅ 폐기 완료 |
| /new-project | ✅ 정상 작동 |
| Playwright 스크린샷 | 🔲 테스트 필요 (위 방법 참고) |
| work-reporter 알림 개선 | 🔲 구현하면 유용 |
| 프로젝트별 기본 모델 고정 | 🔲 settings.local.json에 model 필드 추가로 가능 |
