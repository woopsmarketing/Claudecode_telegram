---
description: 작업 완료 처리 — git commit, CURRENT_STATE.md 업데이트, work-reporter 보고서 생성
---

## 작업 완료 처리 순서

### 1. 변경 파일 확인
```bash
git diff --stat
git status
```

### 2. Git Commit
변경사항이 있으면:
```bash
git add -A
git commit -m "$(cat <<'EOF'
[한국어로 작업 내용 요약]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

커밋 메시지 규칙:
- 한국어로 작성
- "feat:", "fix:", "refactor:" 등 prefix 사용
- 무엇을 했는지 구체적으로 (예: "feat: Hero 섹션 배경 그라데이션 및 CTA 버튼 크기 개선")

### 3. CURRENT_STATE.md 업데이트
`CURRENT_STATE.md` 파일을 열어 방금 완료한 항목을 반영:
- 완료된 기능/수정 내용 추가
- 현재 작동 상태 업데이트
- 알려진 이슈가 해결됐으면 제거

### 4. NEXT_TASK.md 확인
`NEXT_TASK.md` 를 읽고 다음 작업 목록이 최신 상태인지 확인.
완료된 항목이 있으면 체크 또는 제거.

### 5. work-reporter 에이전트 호출
work-reporter 에이전트를 호출하여 완료 보고서 생성.
보고서는 Telegram으로 전송하기 좋은 형식으로 출력.

## 추가 인자

`$ARGUMENTS` 가 있으면 커밋 메시지 힌트로 사용.
