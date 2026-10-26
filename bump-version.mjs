#!/usr/bin/env node
/**
 * bump-version.mjs —— 把仓库内所有油猴脚本的 @version 补丁号 +1
 *
 * ── 怎么运行 ────────────────────────────────────────────────
 *   node bump-version.mjs              递增补丁号并写回文件
 *   node bump-version.mjs --dry-run    只预览改动，不写文件
 *   node bump-version.mjs --help       显示本说明
 *
 *   需在本仓库任意目录下执行；无第三方依赖，不需要 package.json / npm install。
 *   唯一要求：装了 Node.js（任意 18+ 版本均可）。
 *
 * ── 它做什么 ────────────────────────────────────────────────
 *   · 递归查找仓库内所有 *.user.js（当前 4 个），无需手动维护文件清单，
 *     以后新增 PC/H5 套件也会被自动纳入。
 *   · 只改写 ==UserScript== 元数据块里的 @version 那一行，
 *     保留原有的对齐空格、注释文字与换行符（LF / CRLF 原样保留，不做归一化）。
 *   · 版本号 1.2.3 → 1.2.4；1.2 → 1.2.1；1 → 0.2（缺位补 0）。
 *     带预发布后缀时（1.2.3-beta）会去掉后缀并把补丁号 +1。
 *   · 刻意不碰 PC 主脚本里的 DefaultVal.currentVersion：那是配置迁移计数器，
 *     跟脚本 @version 无关，改它会让所有用户莫名弹出「版本更新」设置弹窗。
 *   · 四个脚本会被同步成同一个版本号；若改之前它们本来就不一致，会先提醒你。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".github"]);

/** 递归收集仓库内所有 .user.js */
function findScripts(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) findScripts(path.join(dir, entry.name), acc);
    } else if (entry.isFile() && entry.name.endsWith(".user.js")) {
      acc.push(path.join(dir, entry.name));
    }
  }
  return acc;
}

/** 解析并递增补丁号；无法解析时返回 null */
function bumpPatch(version) {
  const m = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-[0-9A-Za-z.-]+)?$/.exec(version.trim());
  if (!m) return null;
  const [, major, minor = "0", patch = "0"] = m;
  return `${Number(major)}.${Number(minor)}.${Number(patch) + 1}`;
}

/**
 * 在元数据块内定位 @version 行。
 * 分成三段捕获是为了只替换版本号本身，从而保住对齐空格与行尾空白。
 */
function replaceVersion(source, nextVersion) {
  const start = source.indexOf("// ==UserScript==");
  const end = source.indexOf("// ==/UserScript==");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("未找到 ==UserScript== / ==/UserScript== 元数据块");
  }
  const block = source.slice(start, end);

  const re = /^([ \t]*\/\/[ \t]*@version[ \t]+)(\S+)([ \t]*)$/gm;
  const hits = [...block.matchAll(re)];
  if (hits.length !== 1) {
    throw new Error(`元数据块内的 @version 行数为 ${hits.length}（预期恰好 1 行）`);
  }

  const at = start + hits[0].index;
  const before = source.slice(0, at);
  const after = source.slice(at + hits[0][0].length);
  return {
    content: `${before}${hits[0][1]}${nextVersion}${hits[0][3]}${after}`,
    oldVersion: hits[0][2],
  };
}

/** 读出当前 @version，并算出下一个补丁号 */
function plan(source) {
  const probe = replaceVersion(source, "0.0.0"); // 仅用于取出当前版本号
  const next = bumpPatch(probe.oldVersion);
  if (next === null) {
    throw new Error(`版本号 "${probe.oldVersion}" 不是形如 1.2.3 的格式`);
  }
  return { next, content: replaceVersion(source, next).content };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(
      "用法：node bump-version.mjs [--dry-run]\n" +
        "  递增仓库内所有 *.user.js 的 @version 补丁号。\n" +
        "  --dry-run  只预览，不写入文件。",
    );
    return;
  }
  const dryRun = args.includes("--dry-run");
  const unknown = args.filter((a) => a !== "--dry-run");
  if (unknown.length) {
    console.error(`未知参数：${unknown.join(", ")}（用 --help 查看用法）`);
    process.exitCode = 1;
    return;
  }

  const files = findScripts(ROOT).sort();
  if (files.length === 0) {
    console.error("没有找到任何 *.user.js 文件。");
    process.exitCode = 1;
    return;
  }

  const results = [];
  const failures = [];

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    try {
      const source = fs.readFileSync(file, "utf8");
      const { next, content } = plan(source);
      const { oldVersion } = replaceVersion(source, "0.0.0");
      if (content === source) {
        throw new Error("内容没有变化，请检查 @version 行");
      }
      if (!dryRun) fs.writeFileSync(file, content, "utf8");
      results.push({ rel, oldVersion, newVersion: next });
    } catch (err) {
      failures.push({ rel, message: err.message });
    }
  }

  if (failures.length) {
    console.error("以下文件处理失败：");
    for (const f of failures) console.error(`  ✗ ${f.rel}\n      ${f.message}`);
    console.error("");
    process.exitCode = 1;
  }

  if (results.length) {
    const versions = new Set(results.map((r) => r.oldVersion));
    if (versions.size > 1) {
      console.warn(
        `⚠ 改动前各脚本版本并不一致（${[...versions].join(", ")}），已各自 +1。\n`,
      );
    }

    const pad = Math.max(...results.map((r) => r.rel.length));
    console.log(dryRun ? "预览（未写入）：" : "已更新：");
    for (const r of results) {
      console.log(`  ${r.rel.padEnd(pad)}  ${r.oldVersion} → ${r.newVersion}`);
    }
    console.log("");

    if (!dryRun && !failures.length) {
      console.log("下一步：");
      console.log(`  git add -A && git commit -m "chore: release v${results[0].newVersion}"`);
    }
  }
}

main();