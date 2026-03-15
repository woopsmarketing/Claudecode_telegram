# 수정 내역 요약

---

## 1. GitHub 레포 자동 생성 안 됐던 원인 + 수정

### 원인
- `git commit` 시 git user.email / user.name 미설정 → 커밋 실패 → 레포 생성 못함
- `--private`으로 설정되어 있었음

### 수정 (setup-project.sh)
- git user 미설정 시 자동으로 `vnfm0580@gmail.com` / `vnfm0580` 설정
- `--private` → `--public` 변경
- `gh auth status` 사전 체크 추가

### 결과
`/new_project` 하면:
1. 폴더 + 파일 생성
2. git init + 첫 커밋
3. GitHub **공개** 레포 자동 생성 + push
4. Claude 세션 시작

---

## 2. "요약 추출 실패" 수정

### 원인
- `tail -200` 으로 transcript 뒤에서 200줄만 읽음 → 부족할 수 있음
- 파이프 방식(`tail | python3`)이 불안정
- 노이즈 필터 패턴이 유니코드 문자(└, ⛶ 등)를 제대로 매칭 못함

### 수정 (notify.sh)
- python3가 직접 transcript 파일을 열어서 마지막 500줄 읽음 (파이프 제거)
- 유니코드 노이즈 패턴 수정
- 찾은 텍스트의 첫 5줄만 표시 (너무 길면 500자 컷)
- fallback: 최근 커밋 메시지 사용 (더 이상 "추출 실패" 안 나옴)

### 예상 결과
```
📦 [landing_interior] 작업 완료 14:32:10

💡 하단 고정 CTA 버튼을 구현했습니다.
BottomCTA 컴포넌트를 생성하고
sticky bottom bar로 모바일/데스크탑 반응형 처리...
```

---

## 3. "변경 파일 10개" 잘못 표시 수정

### 원인
- 초기 커밋만 있는 프로젝트(커밋 1개)에서 `git diff HEAD~1 HEAD` 실행
- HEAD~1이 존재하지 않거나, 초기 커밋의 모든 파일이 "변경"으로 잡힘

### 수정 (notify.sh)
- `git rev-list --count HEAD`로 커밋 수 확인
- 커밋이 **2개 이상**일 때만 diff 표시
- 커밋 1개(초기 커밋)면 변경 파일 섹션 자체를 생략

### 결과
- 신규 프로젝트: 변경 파일 섹션 안 나옴
- 기존 프로젝트에서 작업 후: 실제 변경된 파일만 표시

---

## 변경된 파일 목록

| 파일 | 변경 내용 |
|------|---------|
| `telegram/setup-project.sh` | git user 자동 설정, --public, gh auth 체크 |
| `telegram/notify.sh` | 요약 추출 전면 개선, 초기 커밋 필터링 |
