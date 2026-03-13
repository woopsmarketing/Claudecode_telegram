#!/usr/bin/env node
/**
 * optimize-image.js — Sharp 기반 이미지 압축 CLI
 * Usage: node optimize-image.js <input> [output] [--quality=80] [--format=webp|jpg|png] [--width=1920]
 */

const path = require("path");
const fs = require("fs");

// Parse args
const args = process.argv.slice(2);
const flags = {};
const positional = [];

for (const arg of args) {
  if (arg.startsWith("--")) {
    const [key, val] = arg.slice(2).split("=");
    flags[key] = val ?? true;
  } else {
    positional.push(arg);
  }
}

const inputPath = positional[0];
if (!inputPath) {
  console.error("Usage: node optimize-image.js <input> [output] [--quality=80] [--format=webp|jpg|png] [--width=1920]");
  process.exit(1);
}

const quality = parseInt(flags.quality ?? "80", 10);
const maxWidth = parseInt(flags.width ?? "1920", 10);
const inputExt = path.extname(inputPath).slice(1).toLowerCase();
const format = flags.format ?? inputExt ?? "webp";

// Determine output path
let outputPath = positional[1];
if (!outputPath) {
  const base = path.basename(inputPath, path.extname(inputPath));
  const dir = path.dirname(inputPath);
  outputPath = path.join(dir, `${base}.optimized.${format === "jpg" ? "jpg" : format}`);
}

async function run() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.error("❌ sharp 패키지를 찾을 수 없습니다.");
    console.error("설치: cd ~/.claude/scripts && npm install sharp");
    process.exit(1);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ 입력 파일을 찾을 수 없습니다: ${inputPath}`);
    process.exit(1);
  }

  const originalSize = fs.statSync(inputPath).size;

  let pipeline = sharp(inputPath).resize({ width: maxWidth, withoutEnlargement: true });

  if (format === "webp") {
    pipeline = pipeline.webp({ quality });
  } else if (format === "jpg" || format === "jpeg") {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  } else if (format === "png") {
    pipeline = pipeline.png({ quality, compressionLevel: 9 });
  } else {
    console.error(`❌ 지원하지 않는 포맷: ${format} (webp, jpg, png 중 선택)`);
    process.exit(1);
  }

  const isSameFile = path.resolve(inputPath) === path.resolve(outputPath);
  const tempPath = isSameFile ? outputPath + ".tmp" : outputPath;

  await pipeline.toFile(tempPath);

  if (isSameFile) {
    fs.renameSync(tempPath, outputPath);
  }

  const optimizedSize = fs.statSync(outputPath).size;
  const ratio = (((originalSize - optimizedSize) / originalSize) * 100).toFixed(1);

  const fmt = (bytes) => `${(bytes / 1024).toFixed(0)}KB`;

  console.log(`✅ 압축 완료`);
  console.log(`   입력: ${inputPath} (${fmt(originalSize)})`);
  console.log(`   출력: ${outputPath} (${fmt(optimizedSize)})`);
  console.log(`   압축률: ${ratio}% 감소`);
  console.log(`   설정: format=${format}, quality=${quality}, maxWidth=${maxWidth}px`);
}

run().catch((err) => {
  console.error("❌ 오류:", err.message);
  process.exit(1);
});
