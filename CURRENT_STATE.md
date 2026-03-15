# 현재 상태

## 구현 완료
- [x] Telegram Bot ↔ Claude Code 브릿지 (bridge.js)
- [x] 다중 프로젝트 세션 관리 (projects.json)
- [x] Claude 작업 완료 → Telegram 자동 알림 (notify.sh, Stop hook)
- [x] 줄바꿈/특수문자 안전 전송 (base64 경유)
- [x] /new_project 자동 생성 (setup-project.sh + 템플릿 5종)
- [x] 프로젝트별 devPort 관리
- [x] /ngrok 외부 공개 URL 생성
- [x] /fix, /done, /do 슬래시 명령
- [x] spec-writer → implementer 에이전트 체인
- [x] work-reporter 스타일 완료 알림 (git diff 포함)
- [x] Telegram 인라인 키보드 메뉴 (/menu)
- [x] 모델 선택 (Opus/Sonnet/Haiku)
- [x] Claude 슬래시 명령 전달 (// 접두사)
- [x] GitHub MCP 전역 설정

## 미완/미테스트
- [ ] Playwright 스크린샷 (/screenshot) — 설치 테스트 필요
- [ ] ngrok 설치 및 동작 테스트
- [ ] 기존 프로젝트에 .claude/ 업데이트 동기화 방법

## 알려진 이슈
- WSL git credential manager 경로가 변경될 수 있음 (git-credential-manager-core)
- 테스트 프로젝트(test-subagent, test-subagent-2) 정리 필요

## 마지막 업데이트
2026-03-15
