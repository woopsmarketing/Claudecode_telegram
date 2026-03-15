# WSL Ubuntu에서 GitHub CLI(gh) 설치 가이드

---

## 1단계: WSL Ubuntu 터미널 열기

### 방법 A (가장 쉬움)
1. Windows 키 누르기
2. `ubuntu` 입력
3. **Ubuntu** 앱 클릭

### 방법 B
1. Windows 키 + R 누르기
2. `wsl -d Ubuntu` 입력 후 Enter

### 방법 C (Windows Terminal 사용 중이면)
1. Windows Terminal 열기
2. 상단 탭 옆 `v` (드롭다운) 클릭
3. **Ubuntu** 선택

---

## 2단계: gh CLI 설치

Ubuntu 터미널이 열리면 아래 명령어를 **한 줄씩** 복사해서 붙여넣기 (Ctrl+Shift+V).

비밀번호 물으면 WSL 설치할 때 만든 비밀번호 입력 (타이핑해도 화면에 안 보이는 게 정상).

```bash
sudo mkdir -p -m 755 /etc/apt/keyrings
```

```bash
wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
```

```bash
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
```

```bash
sudo apt update && sudo apt install gh -y
```

설치 확인:
```bash
gh --version
```

`gh version 2.x.x` 같은 출력이 나오면 성공.

---

## 3단계: GitHub 로그인

```bash
gh auth login
```

질문이 차례로 나온다. 아래처럼 선택:

```
? What account do you want to log into?
→ GitHub.com                              (Enter)

? What is your preferred protocol for Git operations on this host?
→ HTTPS                                   (Enter)

? Authenticate Git with your GitHub credentials?
→ Yes                                     (Enter)

? How would you like to authenticate GitHub CLI?
→ Login with a web browser                (Enter)
```

그러면 이런 메시지가 나온다:
```
! First copy your one-time code: XXXX-XXXX
Press Enter to open github.com in your browser...
```

1. **XXXX-XXXX 코드를 메모** (또는 복사)
2. Enter 누르기
3. 브라우저가 안 열리면 직접 열기: https://github.com/login/device
4. 코드 입력
5. **Authorize GitHub CLI** 클릭

터미널에 `Logged in as [너의아이디]` 나오면 완료.

---

## 4단계: 확인

```bash
gh auth status
```

출력 예시:
```
github.com
  ✓ Logged in to github.com account woopsmarketing
  ✓ Git operations for github.com configured to use https protocol.
```

---

## 완료 후

이제 Telegram에서 `/new_project 프로젝트이름` 하면:
- 프로젝트 폴더 생성
- .claude 폴더 + 템플릿 파일 복사
- git init + 첫 커밋
- **GitHub private 레포 자동 생성 + push**
- Claude 세션 시작

모두 자동으로 처리됨.
