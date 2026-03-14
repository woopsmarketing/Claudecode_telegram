require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { execSync, exec, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_CHAT_ID = Number(process.env.ALLOWED_CHAT_ID);
const BRIDGE_ROOT = '/mnt/d/Documents/Claudecode-telegram';
const PROJECTS_FILE = path.join(__dirname, 'projects.json');

// ── 프로젝트 목록 동적 로딩 ────────────────────
function loadProjects() {
  try {
    return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}
let PROJECTS = loadProjects();
let currentProject = process.env.DEFAULT_PROJECT || 'landing';
function getProject() {
  return PROJECTS[currentProject] || Object.values(PROJECTS)[0];
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ── WSL 헬퍼 ─────────────────────────────────

// 일반 명령 (타임아웃 10초)
function wsl(cmd) {
  return execSync(
    `wsl.exe -d Ubuntu -- bash -lc "${cmd.replace(/"/g, '\\"')}"`,
    { encoding: 'utf-8', timeout: 10000 }
  ).trim();
}

// Node/nvm 필요한 명령 (nvm 자동 로드, 타임아웃 30초)
function wslNode(cmd) {
  const withNvm = `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && ${cmd}`;
  return execSync(
    `wsl.exe -d Ubuntu -- bash -lc "${withNvm.replace(/"/g, '\\"')}"`,
    { encoding: 'utf-8', timeout: 30000 }
  ).trim();
}

// 오래 걸리는 비동기 명령 (타임아웃 설정 가능, stderr 포함)
function wslAsync(cmd, timeout = 90000) {
  const withNvm = `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && ${cmd}`;
  return new Promise((resolve, reject) => {
    exec(
      `wsl.exe -d Ubuntu -- bash -lc "${withNvm.replace(/"/g, '\\"')}"`,
      { encoding: 'utf-8', timeout },
      (err, stdout, stderr) => {
        if (err) {
          const detail = (stderr || err.message || '').slice(0, 400);
          reject(new Error(detail));
        } else resolve(stdout.trim());
      }
    );
  });
}

function sessionExists(session) {
  try {
    wsl(`tmux has-session -t ${session} 2>/dev/null`);
    return true;
  } catch { return false; }
}

// 줄바꿈/특수문자 포함 텍스트를 tmux로 안전하게 전송 (base64 경유)
function sendToSession(session, text) {
  const b64 = Buffer.from(text, 'utf-8').toString('base64');
  wsl(`echo '${b64}' | base64 -d > /tmp/cm.txt && tmux load-buffer /tmp/cm.txt && tmux paste-buffer -t ${session} && tmux send-keys -t ${session} '' Enter && rm /tmp/cm.txt`);
}

function guard(chatId) {
  return chatId === ALLOWED_CHAT_ID;
}

function sendLong(chatId, text) {
  const MAX = 4000;
  if (!text || text.length === 0) return bot.sendMessage(chatId, '(빈 응답)');
  const chunks = [];
  for (let i = 0; i < text.length; i += MAX) chunks.push(text.slice(i, i + MAX));
  return chunks.reduce((p, chunk) => p.then(() => bot.sendMessage(chatId, chunk)), Promise.resolve());
}

async function startSession(chatId, proj) {
  try {
    wsl(`tmux new-session -d -s ${proj.session} -c ${proj.root} zsh -l`);
    await new Promise(r => setTimeout(r, 2000));
    wsl(`tmux send-keys -t ${proj.session} 'claude' Enter`);
    await new Promise(r => setTimeout(r, 8000));
    // trust this folder 프롬프트 자동 수락
    wsl(`tmux send-keys -t ${proj.session} '' Enter`);
    await new Promise(r => setTimeout(r, 2000));
    return true;
  } catch (e) {
    if (chatId) bot.sendMessage(chatId, `❌ 세션 시작 실패: ${e.message}`);
    return false;
  }
}

// ── 메인 메뉴 키보드 ──────────────────────────
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      // ── 세션 관리
      [
        { text: '📊 상태확인', callback_data: 'status' },
        { text: '🚀 전체시작', callback_data: 'startall' },
        { text: '🛑 전체종료', callback_data: 'stopall' },
      ],
      [
        { text: '▶️ 현재시작', callback_data: 'startclaude' },
        { text: '⏹ 현재종료', callback_data: 'stopclaude' },
        { text: '📋 로그', callback_data: 'logs' },
      ],
      // ── 프로젝트 관리
      [
        { text: '📁 프로젝트목록', callback_data: 'project_list' },
        { text: '🧹 없는것정리', callback_data: 'project_clean' },
        { text: '📸 스크린샷', callback_data: 'screenshot' },
      ],
      // ── 모델 선택
      [
        { text: '🧠 Opus', callback_data: 'model_1' },
        { text: '⚡ Sonnet', callback_data: 'model_2' },
        { text: '🐇 Haiku', callback_data: 'model_3' },
      ],
      // ── Claude Code 슬래시 명령
      [
        { text: '🔧 /compact', callback_data: 'cc_compact' },
        { text: '📊 /context', callback_data: 'cc_context' },
        { text: '🧹 /clear', callback_data: 'cc_clear' },
      ],
      [
        { text: '↩️ /undo', callback_data: 'cc_undo' },
        { text: '🔍 /review', callback_data: 'cc_review' },
        { text: '❓ /help', callback_data: 'cc_help' },
      ],
    ],
  },
};

// ── Bot Commands 등록 (/ 메뉴) ─────────────────
bot.setMyCommands([
  { command: 'menu',           description: '📱 버튼 메뉴 열기' },
  { command: 'status',         description: '전체 세션 상태 확인' },
  { command: 'startall',       description: '모든 프로젝트 세션 시작' },
  { command: 'stopall',        description: '모든 세션 종료' },
  { command: 'startclaude',    description: '현재 프로젝트 세션 시작' },
  { command: 'stopclaude',     description: '현재 프로젝트 세션 종료' },
  { command: 'project',        description: '프로젝트 목록/전환 (/project <이름>)' },
  { command: 'logs',           description: '현재 프로젝트 출력 확인' },
  { command: 'screenshot',     description: '브라우저 스크린샷 전송' },
  { command: 'ask',            description: '프롬프트 전송 (/ask <내용>)' },
  { command: 'new_project',    description: '새 프로젝트 생성 (/new_project <이름>)' },
  { command: 'project_remove', description: '프로젝트 제거 (/project_remove <이름>)' },
  { command: 'project_add',    description: '기존 폴더 추가 (/project_add <이름>)' },
  { command: 'project_clean',  description: '없는 폴더 일괄 정리' },
  { command: 'model',          description: '모델 변경 (/model 1=Opus 2=Sonnet 3=Haiku)' },
]);

// ── Inline Keyboard 콜백 처리 ──────────────────
bot.on('callback_query', async (query) => {
  if (!guard(query.message.chat.id)) return;

  const chatId = query.message.chat.id;
  const data = query.data;
  const proj = getProject();

  bot.answerCallbackQuery(query.id);

  // Claude Code 슬래시 명령
  if (data.startsWith('cc_')) {
    const cmd = '/' + data.replace('cc_', '');
    if (!sessionExists(proj.session)) {
      return bot.sendMessage(chatId, `❌ 세션 없음: /startclaude 로 먼저 시작하세요`);
    }
    wsl(`tmux send-keys -t ${proj.session} '${cmd}' Enter`);
    return bot.sendMessage(chatId, `⌨️ [${proj.label}] ${cmd} 전송됨`);
  }

  // 모델 변경
  if (data.startsWith('model_')) {
    const num = data.replace('model_', '');
    const models = { '1': 'claude-opus-4-6', '2': 'claude-sonnet-4-6', '3': 'claude-haiku-4-5-20251001' };
    const model = models[num];
    if (model && sessionExists(proj.session)) {
      wsl(`tmux send-keys -t ${proj.session} '/model ${model}' Enter`);
      return bot.sendMessage(chatId, `🤖 모델 변경: ${model}`);
    }
    return bot.sendMessage(chatId, `❌ 세션 없음`);
  }

  switch (data) {
    case 'status':       handleStatus(chatId); break;
    case 'startall':     handleStartAll(chatId); break;
    case 'stopall':      handleStopAll(chatId); break;
    case 'logs':         handleLogs(chatId, proj); break;
    case 'project_list': handleProjectList(chatId); break;
    case 'screenshot':   handleScreenshot(chatId, proj, null); break;
    case 'project_clean':
      // /project-clean 인라인 처리
      PROJECTS = loadProjects();
      const removed = [];
      for (const [k, v] of Object.entries(PROJECTS)) {
        if (!dirExists(v.root)) {
          try { wsl(`tmux kill-session -t ${v.session} 2>/dev/null`); } catch {}
          delete PROJECTS[k];
          removed.push(k);
        }
      }
      fs.writeFileSync(PROJECTS_FILE, JSON.stringify(PROJECTS, null, 2));
      if (!PROJECTS[currentProject]) currentProject = Object.keys(PROJECTS)[0] || 'landing';
      bot.sendMessage(chatId, removed.length === 0
        ? '✅ 정리할 항목 없음'
        : `🗑 정리 완료:\n${removed.map(r => `• ${r}`).join('\n')}`
      );
      break;
    case 'startclaude':
      if (sessionExists(proj.session)) {
        bot.sendMessage(chatId, `⚡ 이미 실행 중: ${proj.label}`);
      } else {
        bot.sendMessage(chatId, `🚀 시작 중: ${proj.label}...`);
        startSession(chatId, proj).then(ok => {
          if (ok) bot.sendMessage(chatId, `✅ ${proj.label} 시작됨`);
        });
      }
      break;
    case 'stopclaude':
      if (!sessionExists(proj.session)) {
        bot.sendMessage(chatId, `❌ 실행 중인 세션 없음`);
      } else {
        try {
          wsl(`tmux kill-session -t ${proj.session}`);
          bot.sendMessage(chatId, `🛑 종료: ${proj.label}`);
        } catch (e) {
          bot.sendMessage(chatId, `❌ 실패: ${e.message}`);
        }
      }
      break;
  }
});

// ── 공통 핸들러 함수 ──────────────────────────

function dirExists(wslPath) {
  try {
    wsl(`[ -d "${wslPath}" ] && echo yes`);
    return true;
  } catch { return false; }
}

function handleStatus(chatId) {
  PROJECTS = loadProjects();
  const lines = Object.entries(PROJECTS).map(([k, v]) => {
    const running = sessionExists(v.session);
    const exists = dirExists(v.root);
    const active = k === currentProject ? ' ◀ 현재' : '';
    const warn = !exists ? ' ⚠️없음' : '';
    return `${running ? '✅' : '❌'} ${k} (${v.label})${warn}${active}`;
  });
  bot.sendMessage(chatId, `세션 상태:\n${lines.join('\n')}\n\n⚠️없음 = 폴더 삭제됨 (/project-remove <이름> 으로 정리)`);
}

async function handleStartAll(chatId) {
  PROJECTS = loadProjects();
  for (const [key, proj] of Object.entries(PROJECTS)) {
    if (sessionExists(proj.session)) {
      bot.sendMessage(chatId, `⚡ 이미 실행 중: ${proj.label}`);
      continue;
    }
    bot.sendMessage(chatId, `🚀 시작 중: ${proj.label}...`);
    const ok = await startSession(chatId, proj);
    if (ok) bot.sendMessage(chatId, `✅ ${proj.label} 준비 완료`);
  }
}

function handleStopAll(chatId) {
  PROJECTS = loadProjects();
  for (const [, proj] of Object.entries(PROJECTS)) {
    if (sessionExists(proj.session)) {
      try {
        wsl(`tmux kill-session -t ${proj.session}`);
        bot.sendMessage(chatId, `🛑 종료: ${proj.label}`);
      } catch (e) {
        bot.sendMessage(chatId, `❌ 종료 실패 ${proj.label}: ${e.message}`);
      }
    }
  }
}

function handleLogs(chatId, proj) {
  if (!sessionExists(proj.session)) {
    return bot.sendMessage(chatId, `❌ 실행 중인 세션 없음: ${proj.label}`);
  }
  try {
    const logs = wsl(`tmux capture-pane -t ${proj.session} -p -S -80`);
    sendLong(chatId, `[${proj.label}]\n${logs || '(출력 없음)'}`);
  } catch (e) {
    bot.sendMessage(chatId, `❌ 로그 실패: ${e.message}`);
  }
}

function handleProjectList(chatId) {
  PROJECTS = loadProjects();
  const list = Object.entries(PROJECTS)
    .map(([k, v]) => `${k === currentProject ? '▶' : '  '} ${k} — ${v.label}`)
    .join('\n');

  const projectButtons = Object.keys(PROJECTS).map(k => ({
    text: `${k === currentProject ? '▶ ' : ''}${k}`,
    callback_data: `switch_${k}`,
  }));

  const rows = [];
  for (let i = 0; i < projectButtons.length; i += 3) {
    rows.push(projectButtons.slice(i, i + 3));
  }

  bot.sendMessage(chatId, `📁 프로젝트 목록:\n${list}`, {
    reply_markup: { inline_keyboard: rows },
  });
}

async function handleScreenshot(chatId, proj, customUrl) {
  // 현재 프로젝트의 기본 URL
  const url = customUrl ||
    process.env[`SCREENSHOT_URL_${currentProject.toUpperCase()}`] ||
    'http://localhost:3000';

  bot.sendMessage(chatId, `📸 스크린샷 준비 중...\n${url}`);

  // dev server 실행 여부 확인 & 미실행 시 자동 시작
  try {
    wslNode(`node -e "require('http').get('${url}', r => process.exit(0)).on('error', () => process.exit(1))"`);
  } catch {
    // 서버 없으면 dev server 시작
    bot.sendMessage(chatId, `⚙️ dev server 없음. 시작 중...`);
    if (sessionExists(proj.session)) {
      wsl(`tmux send-keys -t ${proj.session} 'npm run dev 2>/dev/null || pnpm dev 2>/dev/null || npx next dev &' Enter`);
      await new Promise(r => setTimeout(r, 8000));
    } else {
      return bot.sendMessage(chatId, `❌ 세션이 없습니다. /startclaude 먼저 실행하세요.`);
    }
  }

  try {
    await wslAsync(
      `node ${BRIDGE_ROOT}/screenshot.js '${url}' '📸 ${proj.label}'`,
      30000
    );
    // screenshot.js가 직접 Telegram으로 이미지 전송
  } catch (e) {
    bot.sendMessage(chatId, `❌ 스크린샷 실패: ${e.message.slice(0, 200)}`);
  }
}

// ── 프로젝트 전환 콜백 ─────────────────────────
bot.on('callback_query', async (query) => {
  if (!guard(query.message.chat.id)) return;
  if (!query.data.startsWith('switch_')) return;

  const key = query.data.replace('switch_', '');
  PROJECTS = loadProjects();

  if (!PROJECTS[key]) return;
  currentProject = key;
  const proj = PROJECTS[key];
  bot.answerCallbackQuery(query.id, { text: `전환: ${proj.label}` });
  bot.sendMessage(query.message.chat.id,
    `✅ 전환: ${proj.label}\n세션: ${proj.session}\n경로: ${proj.root}`
  );
});

// ── Commands ─────────────────────────────────────

bot.onText(/\/menu/, (msg) => {
  if (!guard(msg.chat.id)) return;
  const proj = getProject();
  bot.sendMessage(msg.chat.id, `🤖 Claude Bridge\n현재: ${proj.label}`, mainMenu);
});

bot.onText(/\/status/, (msg) => {
  if (!guard(msg.chat.id)) return;
  handleStatus(msg.chat.id);
});

bot.onText(/\/project(?:\s+(.+))?/, (msg, match) => {
  if (!guard(msg.chat.id)) return;
  const name = match[1]?.trim().toLowerCase();

  if (!name) return handleProjectList(msg.chat.id);

  PROJECTS = loadProjects();
  if (!PROJECTS[name]) {
    return bot.sendMessage(msg.chat.id, `❌ 없는 프로젝트. /project 로 목록 확인`);
  }
  currentProject = name;
  const proj = PROJECTS[name];
  bot.sendMessage(msg.chat.id,
    `✅ 전환: ${proj.label}\n세션: ${proj.session}\n경로: ${proj.root}`
  );
});

bot.onText(/\/startclaude/, async (msg) => {
  if (!guard(msg.chat.id)) return;
  const proj = getProject();
  if (sessionExists(proj.session)) {
    return bot.sendMessage(msg.chat.id, `⚡ 이미 실행 중: ${proj.label}`);
  }
  bot.sendMessage(msg.chat.id, `🚀 시작 중: ${proj.label}...`);
  const ok = await startSession(msg.chat.id, proj);
  if (ok) bot.sendMessage(msg.chat.id, `✅ Claude 시작됨\n프로젝트: ${proj.label}`);
});

bot.onText(/\/stopclaude/, (msg) => {
  if (!guard(msg.chat.id)) return;
  const proj = getProject();
  if (!sessionExists(proj.session)) {
    return bot.sendMessage(msg.chat.id, `❌ 실행 중인 세션 없음`);
  }
  try {
    wsl(`tmux kill-session -t ${proj.session}`);
    bot.sendMessage(msg.chat.id, `🛑 종료: ${proj.label}`);
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ 실패: ${e.message}`);
  }
});

bot.onText(/\/startall/, (msg) => {
  if (!guard(msg.chat.id)) return;
  handleStartAll(msg.chat.id);
});

bot.onText(/\/stopall/, (msg) => {
  if (!guard(msg.chat.id)) return;
  handleStopAll(msg.chat.id);
});

bot.onText(/\/logs/, (msg) => {
  if (!guard(msg.chat.id)) return;
  handleLogs(msg.chat.id, getProject());
});

bot.onText(/\/ask (.+)/, async (msg, match) => {
  if (!guard(msg.chat.id)) return;
  const prompt = match[1];
  const proj = getProject();

  if (!sessionExists(proj.session)) {
    bot.sendMessage(msg.chat.id, `🚀 세션 자동 시작: ${proj.label}...`);
    const ok = await startSession(msg.chat.id, proj);
    if (!ok) return;
  }

  try {
    sendToSession(proj.session, prompt);
    bot.sendMessage(msg.chat.id, `📨 [${proj.label}] ${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''}`);
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ 전송 실패: ${e.message}`);
  }
});

// /new_project 또는 /new-project
bot.onText(/\/new[_-]project(?:\s+(.+))?/, async (msg, match) => {
  if (!guard(msg.chat.id)) return;

  const rawName = match[1]?.trim();
  if (!rawName) {
    return bot.sendMessage(msg.chat.id, `❌ 이름 필요: /new_project <프로젝트이름>`);
  }

  const name = rawName.replace(/[^a-zA-Z0-9_-]/g, '-');
  const scriptPath = `${BRIDGE_ROOT}/setup-project.sh`;

  bot.sendMessage(msg.chat.id,
    `🔨 프로젝트 생성 중: ${name}\n⏳ 약 20초 소요...`
  );

  try {
    await new Promise((resolve, reject) => {
      execFile('wsl.exe', ['-d', 'Ubuntu', '--', 'bash', scriptPath, name],
        { encoding: 'utf-8', timeout: 90000 },
        (err, stdout, stderr) => {
          if (err) reject(new Error(stderr || err.message));
          else resolve(stdout);
        }
      );
    });
    PROJECTS = loadProjects();
    currentProject = name;
    bot.sendMessage(msg.chat.id,
      `✅ 프로젝트 생성 완료!\n\n` +
      `📁 이름: ${name}\n` +
      `📂 경로: /mnt/d/Documents/${name}\n` +
      `🖥 세션: claude-${name}\n\n` +
      `지금 바로 작업 지시를 입력하세요.`
    );
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ 생성 실패: ${e.message.slice(0, 300)}`);
  }
});

// /project-remove <name> — projects.json에서 제거
bot.onText(/\/project-remove\s+(.+)/, (msg, match) => {
  if (!guard(msg.chat.id)) return;
  const name = match[1].trim();
  PROJECTS = loadProjects();

  if (!PROJECTS[name]) {
    return bot.sendMessage(msg.chat.id, `❌ 없는 프로젝트: ${name}`);
  }

  // 세션 종료
  const session = PROJECTS[name].session;
  try { wsl(`tmux kill-session -t ${session} 2>/dev/null`); } catch {}

  delete PROJECTS[name];
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(PROJECTS, null, 2));

  if (currentProject === name) currentProject = Object.keys(PROJECTS)[0] || 'landing';
  bot.sendMessage(msg.chat.id, `🗑 제거됨: ${name}\n현재 프로젝트: ${currentProject}`);
});

// /project-add <name> — 기존 폴더를 projects.json에 추가
bot.onText(/\/project-add\s+(.+)/, (msg, match) => {
  if (!guard(msg.chat.id)) return;
  const name = match[1].trim();
  const root = `/mnt/d/Documents/${name}`;
  PROJECTS = loadProjects();

  if (PROJECTS[name]) {
    return bot.sendMessage(msg.chat.id, `⚠️ 이미 존재: ${name}`);
  }

  if (!dirExists(root)) {
    return bot.sendMessage(msg.chat.id, `❌ 폴더 없음: ${root}\n폴더를 먼저 생성하거나 /new_project 를 사용하세요`);
  }

  PROJECTS[name] = { session: `claude-${name}`, root, label: name };
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(PROJECTS, null, 2));
  bot.sendMessage(msg.chat.id, `✅ 추가됨: ${name}\n경로: ${root}`);
});

// /project-clean — 폴더 없는 프로젝트 일괄 정리
bot.onText(/\/project-clean/, (msg) => {
  if (!guard(msg.chat.id)) return;
  PROJECTS = loadProjects();

  const removed = [];
  for (const [k, v] of Object.entries(PROJECTS)) {
    if (!dirExists(v.root)) {
      try { wsl(`tmux kill-session -t ${v.session} 2>/dev/null`); } catch {}
      delete PROJECTS[k];
      removed.push(k);
    }
  }

  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(PROJECTS, null, 2));

  if (removed.length === 0) {
    bot.sendMessage(msg.chat.id, `✅ 정리할 항목 없음`);
  } else {
    if (!PROJECTS[currentProject]) currentProject = Object.keys(PROJECTS)[0] || 'landing';
    bot.sendMessage(msg.chat.id, `🗑 정리 완료:\n${removed.map(r => `• ${r}`).join('\n')}`);
  }
});

// /model <1|2|3> — Claude 모델 변경
bot.onText(/\/model(?:\s+(\d))?/, (msg, match) => {
  if (!guard(msg.chat.id)) return;

  const num = match[1];
  const proj = getProject();

  if (!num) {
    return bot.sendMessage(msg.chat.id,
      `모델 선택:\n/model 1 — Opus (가장 강력)\n/model 2 — Sonnet (균형)\n/model 3 — Haiku (빠름)`
    );
  }

  const models = {
    '1': 'claude-opus-4-6',
    '2': 'claude-sonnet-4-6',
    '3': 'claude-haiku-4-5-20251001',
  };

  const model = models[num];
  if (!model) {
    return bot.sendMessage(msg.chat.id, `❌ 1, 2, 3 중 선택하세요`);
  }

  if (!sessionExists(proj.session)) {
    return bot.sendMessage(msg.chat.id, `❌ 세션 없음: /startclaude 로 시작하세요`);
  }

  try {
    wsl(`tmux send-keys -t ${proj.session} '/model ${model}' Enter`);
    bot.sendMessage(msg.chat.id, `🤖 모델 변경: ${model}`);
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ 실패: ${e.message}`);
  }
});

bot.onText(/\/screenshot(?:\s+(.+))?/, async (msg, match) => {
  if (!guard(msg.chat.id)) return;
  handleScreenshot(msg.chat.id, getProject(), match[1]?.trim() || null);
});

// // 접두사 → Claude 슬래시 명령 (//context, //compact 등)
bot.on('message', async (msg) => {
  if (!guard(msg.chat.id)) return;
  if (!msg.text) return;

  const text = msg.text;

  // //명령어 → Claude Code 내부 슬래시 명령으로 전달
  if (text.startsWith('//')) {
    const claudeCmd = text.slice(1); // // → /
    const proj = getProject();
    if (!sessionExists(proj.session)) {
      return bot.sendMessage(msg.chat.id, `❌ 세션 없음: /startclaude 로 시작하세요`);
    }
    const escaped = claudeCmd.replace(/'/g, "'\\''");
    wsl(`tmux send-keys -t ${proj.session} '${escaped}' Enter`);
    return bot.sendMessage(msg.chat.id, `⌨️ [${proj.label}] ${claudeCmd}`);
  }

  // 일반 / 명령은 스킵 (위 핸들러에서 처리)
  if (text.startsWith('/')) return;

  // 일반 텍스트 → 현재 프로젝트로 전송
  const proj = getProject();
  if (!sessionExists(proj.session)) {
    return bot.sendMessage(msg.chat.id,
      `❌ [${proj.label}] 세션 없음\n/startclaude 또는 /startall 로 시작하세요`
    );
  }

  try {
    sendToSession(proj.session, text);
    bot.sendMessage(msg.chat.id, `📨 [${proj.label}] ${text.slice(0, 80)}${text.length > 80 ? '...' : ''}`);
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ 전송 실패: ${e.message}`);
  }
});

// ── Startup ──────────────────────────────────────
console.log('🤖 Telegram-Claude Bridge started');
console.log('   프로젝트:');
for (const [k, v] of Object.entries(PROJECTS)) {
  console.log(`   ${k === currentProject ? '▶' : ' '} ${k}: ${v.root}`);
}
console.log(`   Allowed Chat ID: ${ALLOWED_CHAT_ID}`);
