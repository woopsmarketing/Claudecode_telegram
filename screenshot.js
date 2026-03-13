#!/usr/bin/env node
// screenshot.js — 현재 프로젝트 dev server 스크린샷 → Telegram 전송
// 사용: node /mnt/d/Documents/Claudecode-telegram/screenshot.js [url] [caption]

require('dotenv').config({ path: '/mnt/d/Documents/Claudecode-telegram/.env' });

const { chromium } = require('playwright');
const fs = require('fs');
const https = require('https');
const http = require('http');
const FormData = require('form-data');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.ALLOWED_CHAT_ID;
const TARGET_URL = process.argv[2] || process.env.SCREENSHOT_URL || 'http://localhost:3000';
const CAPTION = process.argv[3] || '📸 Preview';
const SCREENSHOT_PATH = '/tmp/claude_preview.png';

async function waitForServer(url, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = (url.startsWith('https') ? https : http).get(url, resolve);
        req.on('error', reject);
        req.setTimeout(2000, () => req.destroy());
      });
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return false;
}

async function sendPhoto(imagePath, caption) {
  const form = new FormData();
  form.append('chat_id', CHAT_ID);
  form.append('photo', fs.createReadStream(imagePath));
  form.append('caption', caption);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TOKEN}/sendPhoto`,
      method: 'POST',
      headers: form.getHeaders(),
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    form.pipe(req);
  });
}

async function sendMessage(text) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: CHAT_ID, text });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      res.resume();
      resolve();
    });
    req.on('error', () => resolve());
    req.write(body);
    req.end();
  });
}

async function main() {
  if (!TOKEN || !CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN 또는 ALLOWED_CHAT_ID 없음');
    process.exit(1);
  }

  // 서버 응답 대기
  console.log(`서버 확인 중: ${TARGET_URL}`);
  const ready = await waitForServer(TARGET_URL);
  if (!ready) {
    await sendMessage(`❌ 스크린샷 실패: ${TARGET_URL} 응답 없음\ndev server가 실행 중인지 확인하세요`);
    process.exit(1);
  }

  // 스크린샷 촬영
  console.log('스크린샷 촬영 중...');
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
  } finally {
    await browser.close();
  }

  // Telegram 전송
  console.log('Telegram 전송 중...');
  const result = await sendPhoto(SCREENSHOT_PATH, caption);
  if (result.ok) {
    console.log('전송 완료');
  } else {
    console.error('전송 실패:', result);
  }
}

main().catch(async (err) => {
  console.error(err.message);
  await sendMessage(`❌ 스크린샷 오류: ${err.message}`);
  process.exit(1);
});
