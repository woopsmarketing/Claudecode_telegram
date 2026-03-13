require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { execSync } = require('child_process');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_CHAT_ID = Number(process.env.ALLOWED_CHAT_ID);

// ── 프로젝트 목록 ──────────────────────────────
const PROJECTS = {
  landing: {
    session: 'claude-landing',
    root: process.env.PROJECT_LANDING || '/mnt/d/Documents/landing_interior',
    label: 'landing_interior',
  },
  domain: {
    session: 'claude-domain',
    root: process.env.PROJECT_DOMAIN || '/mnt/d/Documents/domain_platform',
    label: 'domain_platform',
  },
  bridge: {
    session: 'claude-bridge',
    root: process.env.PROJECT_BRIDGE || '/mnt/d/Documents/Claudecode-telegram',
    label: 'Claudecode-telegram',
  },
};

// 현재 활성 프로젝트 (기본: landing)
let currentProject = process.env.DEFAULT_PROJECT || 'landing';

function getProject() {
  return PROJECTS[currentProject] || PROJECTS.landing;
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ── Helpers ──────────────────────────────────────

function wsl(cmd) {
  return execSync(`wsl.exe -d Ubuntu -- bash -lc "${cmd.replace(/"/g, '\\"')}"`, {
    encoding: 'utf-8',
    timeout: 10000,
  }).trim();
}

function sessionExists(session) {
  try {
    wsl(`tmux has-session -t ${session} 2>/dev/null`);
    return true;
  } catch {
    return false;
  }
}

function guard(chatId) {
  return chatId === ALLOWED_CHAT_ID;
}

function sendLong(chatId, text) {
  const MAX = 4000;
  if (!text || text.length === 0) {
    return bot.sendMessage(chatId, '(빈 응답)');
  }
  const chunks = [];
  for (let i = 0; i < text.length; i += MAX) {
    chunks.push(text.slice(i, i + MAX));
  }
  return chunks.reduce(
    (p, chunk) => p.then(() => bot.sendMessage(chatId, chunk)),
    Promise.resolve()
  );
}

async function startSession(chatId, proj) {
  try {
    wsl(`tmux new-session -d -s ${proj.session} -c ${proj.root} zsh -l`);
    await new Promise(r => setTimeout(r, 1000));
    wsl(`tmux send-keys -t ${proj.session} 'claude' Enter`);
    return true;
  } catch (e) {
    bot.sendMessage(chatId, `❌ 세션 시작 실패: ${e.message}`);
    return false;
  }
}

// ── Commands ─────────────────────────────────────

// /project <name> — 활성 프로젝트 전환
bot.onText(/\/project(?:\s+(.+))?/, (msg, match) => {
  if (!guard(msg.chat.id)) return;

  const name = match[1]?.trim().toLowerCase();

  if (!name) {
    const list = Object.entries(PROJECTS)
      .map(([k, v]) => `${k === currentProject ? '▶' : '  '} ${k} — ${v.label}`)
      .join('\n');
    return bot.sendMessage(msg.chat.id, `📁 프로젝트 목록:\n${list}\n\n전환: /project <이름>`);
  }

  if (!PROJECTS[name]) {
    const keys = Object.keys(PROJECTS).join(', ');
    return bot.sendMessage(msg.chat.id, `❌ 없는 프로젝트. 사용 가능: ${keys}`);
  }

  currentProject = name;
  const proj = getProject();
  bot.sendMessage(msg.chat.id, `✅ 프로젝트 전환: ${proj.label}\n세션: ${proj.session}\n경로: ${proj.root}`);
});

// /status — 전체 세션 상태
bot.onText(/\/status/, (msg) => {
  if (!guard(msg.chat.id)) return;

  const lines = Object.entries(PROJECTS).map(([k, v]) => {
    const running = sessionExists(v.session);
    const active = k === currentProject ? ' ◀ 현재' : '';
    return `${running ? '✅' : '❌'} ${k} (${v.label})${active}`;
  });

  bot.sendMessage(msg.chat.id, `세션 상태:\n${lines.join('\n')}`);
});

// /startclaude — 현재 프로젝트 세션 시작
bot.onText(/\/startclaude/, async (msg) => {
  if (!guard(msg.chat.id)) return;

  const proj = getProject();
  if (sessionExists(proj.session)) {
    return bot.sendMessage(msg.chat.id, `⚡ 이미 실행 중: ${proj.label}`);
  }

  bot.sendMessage(msg.chat.id, `🚀 시작 중: ${proj.label}...`);
  const ok = await startSession(msg.chat.id, proj);
  if (ok) {
    bot.sendMessage(msg.chat.id, `✅ Claude 시작됨 (bypass mode)\n프로젝트: ${proj.label}`);
  }
});

// /stopclaude — 현재 프로젝트 세션 종료
bot.onText(/\/stopclaude/, (msg) => {
  if (!guard(msg.chat.id)) return;

  const proj = getProject();
  if (!sessionExists(proj.session)) {
    return bot.sendMessage(msg.chat.id, `❌ 실행 중인 세션 없음: ${proj.label}`);
  }

  try {
    wsl(`tmux kill-session -t ${proj.session}`);
    bot.sendMessage(msg.chat.id, `🛑 세션 종료: ${proj.label}`);
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ 종료 실패: ${e.message}`);
  }
});

// /ask <message>
bot.onText(/\/ask (.+)/, async (msg, match) => {
  if (!guard(msg.chat.id)) return;

  const prompt = match[1];
  const proj = getProject();

  if (!sessionExists(proj.session)) {
    bot.sendMessage(msg.chat.id, `🚀 세션 자동 시작: ${proj.label}...`);
    const ok = await startSession(msg.chat.id, proj);
    if (!ok) return;
    await new Promise(r => setTimeout(r, 8000)); // claude 초기화 대기
  }

  try {
    const escaped = prompt.replace(/'/g, "'\\''");
    wsl(`tmux send-keys -t ${proj.session} '${escaped}' Enter`);
    bot.sendMessage(msg.chat.id, `📨 [${proj.label}] ${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''}`);
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ 전송 실패: ${e.message}`);
  }
});

// /logs — 현재 프로젝트 최근 출력
bot.onText(/\/logs/, (msg) => {
  if (!guard(msg.chat.id)) return;

  const proj = getProject();
  if (!sessionExists(proj.session)) {
    return bot.sendMessage(msg.chat.id, `❌ 실행 중인 세션 없음: ${proj.label}`);
  }

  try {
    const logs = wsl(`tmux capture-pane -t ${proj.session} -p -S -80`);
    sendLong(msg.chat.id, `[${proj.label}]\n${logs || '(출력 없음)'}`);
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ 로그 조회 실패: ${e.message}`);
  }
});

// /startall — 모든 프로젝트 세션 시작
bot.onText(/\/startall/, async (msg) => {
  if (!guard(msg.chat.id)) return;

  for (const [key, proj] of Object.entries(PROJECTS)) {
    if (sessionExists(proj.session)) {
      bot.sendMessage(msg.chat.id, `⚡ 이미 실행 중: ${proj.label}`);
      continue;
    }
    bot.sendMessage(msg.chat.id, `🚀 시작 중: ${proj.label}...`);
    const ok = await startSession(msg.chat.id, proj);
    if (ok) {
      await new Promise(r => setTimeout(r, 8000)); // claude 초기화 대기
      bot.sendMessage(msg.chat.id, `✅ ${proj.label} 준비 완료`);
    }
  }
});

// /stopall — 모든 세션 종료
bot.onText(/\/stopall/, (msg) => {
  if (!guard(msg.chat.id)) return;

  for (const [key, proj] of Object.entries(PROJECTS)) {
    if (sessionExists(proj.session)) {
      try {
        wsl(`tmux kill-session -t ${proj.session}`);
        bot.sendMessage(msg.chat.id, `🛑 종료: ${proj.label}`);
      } catch (e) {
        bot.sendMessage(msg.chat.id, `❌ 종료 실패 ${proj.label}: ${e.message}`);
      }
    }
  }
});

// /screenshot [url] — 스크린샷 찍어서 Telegram 전송
bot.onText(/\/screenshot(?:\s+(.+))?/, async (msg, match) => {
  if (!guard(msg.chat.id)) return;

  const url = match[1]?.trim() || process.env[`SCREENSHOT_URL_${currentProject.toUpperCase()}`] || 'http://localhost:3000';
  const proj = getProject();

  bot.sendMessage(msg.chat.id, `📸 스크린샷 촬영 중...\n${url}`);

  try {
    wsl(`node /mnt/d/Documents/Claudecode-telegram/screenshot.js '${url}' '📸 ${proj.label}'`);
    // screenshot.js가 직접 Telegram에 이미지 전송함
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ 스크린샷 실패: ${e.message}`);
  }
});

// 일반 텍스트 → 현재 프로젝트로 전송
bot.on('message', async (msg) => {
  if (!guard(msg.chat.id)) return;
  if (msg.text && msg.text.startsWith('/')) return;

  const prompt = msg.text;
  if (!prompt) return;

  const proj = getProject();

  if (!sessionExists(proj.session)) {
    return bot.sendMessage(msg.chat.id,
      `❌ [${proj.label}] 세션 없음\n/startclaude 또는 /startall 로 시작하세요`
    );
  }

  try {
    const escaped = prompt.replace(/'/g, "'\\''");
    wsl(`tmux send-keys -t ${proj.session} '${escaped}' Enter`);
    bot.sendMessage(msg.chat.id, `📨 [${proj.label}] ${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''}`);
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
