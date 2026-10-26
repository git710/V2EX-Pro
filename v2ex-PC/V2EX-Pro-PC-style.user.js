// ==UserScript==
// @name         V2EX Pro - PC style
// @namespace    https://github.com/git710/V2EX-Pro
// @version      1.0.0
// @description  V2EX Pro PC 端样式脚本：统一设计 Token、四主题（浅色/晨光/水色/深色）、防闪烁背景与主题类注入。须先于「V2EX Pro - PC」主脚本启用。
// @description:zh-CN  V2EX Pro PC 端样式脚本：统一设计 Token、四主题（浅色/晨光/水色/深色）、防闪烁背景与主题类注入。须先于「V2EX Pro - PC」主脚本启用。
// @author       git710
// @license      GPL-3.0
// @homepageURL  https://github.com/git710/V2EX-Pro
// @supportURL   https://github.com/git710/V2EX-Pro/issues
// @icon         https://www.v2ex.com/static/img/v2ex-alt@2x.png
// @match        https://v2ex.com/*
// @match        https://*.v2ex.com/*
// @match        https://global.v2ex.co/*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/git710/V2EX-Pro/main/v2ex-PC/V2EX-Pro-PC-style.user.js
// @downloadURL  https://raw.githubusercontent.com/git710/V2EX-Pro/main/v2ex-PC/V2EX-Pro-PC-style.user.js
// ==/UserScript==

/*
 * V2EX Pro - PC style（PC 端样式脚本）
 * 仓库：https://github.com/git710/V2EX-Pro
 *
 * 衍生自 zyronon/V2Next 的 PC 端样式实现，遵循 GPL-3.0。
 * 感谢原作者 zyronon，以及 coolpace/V2EX_Polish、guozhigq/flutter_v2ex。
 * 完整许可证见仓库根目录 LICENSE。
 *
 * 本文件即原「V2Pro - style」（PC 样式），历史上曾被误命名为 V2EX-Pro-PC.js，
 * 现已与主脚本对调为正确命名，与 H5 目录保持一致。
 *
 * 必须在 document-start 注入以避免主题闪烁；@grant none 保证
 * GM_addStyle polyfill 与主脚本共享同一个页面上下文。
 */

// GM_addStyle polyfill（与 v2ex-H5 保持一致，@grant none 下生效）
if (typeof GM_addStyle === "undefined") {
  window.GM_addStyle = function (css) {
    var style = document.createElement("style");
    style.type = "text/css";
    style.textContent = css;
    document.head
      ? document.head.appendChild(style)
      : document.documentElement.appendChild(style);
    return style;
  };
}

// 尽早执行：防闪烁 + 主题类注入（与 v2ex-H5 共享 user_preferred_theme_mode）
(function () {
  var docEl = document.documentElement;
  var STORAGE_KEY = "user_preferred_theme_mode";

  // 统一各主题初始背景色（防闪烁，与 H5 主题 token 的 background 值一致）
  var THEME_BG_MAP = {
    light: "#f2f3f5",
    dark: "#1c2128",
    dawn: "#faf4ed",
    aqua: "#f2f7fa",
  };

  // 读取用户上次的设置；auto 或未设置时跟随系统
  var currentMode = localStorage.getItem(STORAGE_KEY);
  var effectiveMode = currentMode;
  if (!currentMode || currentMode === "auto") {
    effectiveMode =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  }

  var initBg = THEME_BG_MAP[effectiveMode] || THEME_BG_MAP.light;

  // 立即应用主题类；dark 同时打旧 dark 类以维持既有 html.dark 特化规则
  if (effectiveMode === "dark") {
    docEl.classList.add("v2p-theme-dark-default");
    docEl.classList.add("dark");
  } else if (effectiveMode === "dawn") {
    docEl.classList.add("v2p-theme-dawn");
  } else if (effectiveMode === "aqua") {
    docEl.classList.add("v2p-theme-aqua");
  } else {
    docEl.classList.add("v2p-theme-light-default");
  }

  docEl.style.backgroundColor = initBg;

  // --- theme-color 同步（自 v2ex-H5 移植，浏览器标题栏颜色随主题） ---
  var getModeFromClass = function () {
    if (docEl.classList.contains("v2p-theme-dark-default")) return "dark";
    if (docEl.classList.contains("v2p-theme-dawn")) return "dawn";
    if (docEl.classList.contains("v2p-theme-aqua")) return "aqua";
    if (docEl.classList.contains("v2p-theme-light-default")) return "light";
    return effectiveMode || "light";
  };

  var getResolvedMode = function () {
    var mode = localStorage.getItem(STORAGE_KEY) || "auto";
    if (mode === "auto") {
      mode =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    }
    return mode;
  };

  var getThemeColor = function () {
    var mode = getModeFromClass() || getResolvedMode();
    return THEME_BG_MAP[mode] || THEME_BG_MAP.light;
  };

  var THEME_META_ID = "v2p-theme-color";
  var syncingThemeMeta = false;
  var ensureThemeMeta = function () {
    // 只移除非本脚本的 theme-color，避免反复重建
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) {
      if (metas[i].id !== THEME_META_ID) metas[i].remove();
    }
    var meta = document.getElementById(THEME_META_ID);
    if (!meta) {
      meta = document.createElement("meta");
      meta.id = THEME_META_ID;
      meta.name = "theme-color";
      (document.head || docEl).appendChild(meta);
    }
    return meta;
  };

  var syncThemeColor = function (color) {
    if (syncingThemeMeta) return;
    syncingThemeMeta = true;
    var meta = ensureThemeMeta();
    meta.content = color;
    syncingThemeMeta = false;
  };

  // 初始同步
  syncThemeColor(initBg);

  // 持续监听：拦截原站对 theme-color 的可能修改
  var metaObserver = new MutationObserver(function () {
    if (syncingThemeMeta) return;
    var color = getThemeColor();
    var meta = ensureThemeMeta();
    if (meta.content !== color) meta.content = color;
  });

  // 主题类发生变化时，主动同步一次
  var classObserver = new MutationObserver(function () {
    syncThemeColor(getThemeColor());
  });
  classObserver.observe(docEl, {
    attributes: true,
    attributeFilter: ["class"],
  });

  // 监听系统主题变化（auto 模式）
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onMqChange = function () {
      syncThemeColor(getThemeColor());
    };
    if (mq.addEventListener) {
      mq.addEventListener("change", onMqChange);
    } else if (mq.addListener) {
      mq.addListener(onMqChange);
    }
  }

  // 等待 head 出现后开始监听
  var currentHead = null;
  var attachMetaObserver = function () {
    if (document.head && document.head !== currentHead) {
      currentHead = document.head;
      metaObserver.observe(document.head, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["content"],
      });
    }
  };
  attachMetaObserver();

  // 监听 head 重建（站点导航可能替换 head）
  var headSwapObserver = new MutationObserver(function () {
    attachMetaObserver();
    syncThemeColor(getThemeColor());
  });
  headSwapObserver.observe(docEl, { childList: true, subtree: true });

  // 关键生命周期单次校验主题色，避免高频定时器空转
  var syncThemeOnce = function () {
    syncThemeColor(getThemeColor());
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncThemeOnce, {
      once: true,
    });
  } else {
    syncThemeOnce();
  }
  window.addEventListener("pageshow", syncThemeOnce);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") syncThemeOnce();
  });
})();

(function () {
  "use strict";
  // 下面是完整的 PC 端样式表，直接内嵌在本模板字符串中（无外部 .css 文件）。
  // 修改样式请改这里，并同步更新脚本头的 @version 以便用户收到更新。
  var V2Pro_CSS = `

/* ---------- V2Pro 统一设计系统 Token（与 v2ex-H5 共享 --v2p-* 体系，4 主题 + 原站夜间兜底） ---------- */
/* 来源：v2ex-H5/V2EX-Pro-H5-style.user.js
   布局定位：--v2p-layout-* / --v2p-tp-* 变量段
   四主题锚点：":root body"（light）、":root body .v2p-theme-light-default"、
              ":root body:where(:has(#Wrapper.Night))"（dark）、
              ":root body.v2p-theme-dawn"（dawn）、":root body.v2p-theme-aqua"（aqua）
   （刻意使用选择器而非行号定位，避免 H5 侧改动后此处失效；
     dawn 区块已修复 H5 侧的缺分号 bug） */
:root {
    --v2p-box-radius: 10px;
}
:root body {
    --v2p-color-main-50: #f7f9fb;
    --v2p-color-main-100: #e6e6e6;
    --v2p-color-main-200: #ececec;
    --v2p-color-main-300: #cbd5e1;
    --v2p-color-main-350: #94a3b8cc;
    --v2p-color-main-400: #94a3b8;
    --v2p-color-main-500: #64748b;
    --v2p-color-main-600: #475569;
    --v2p-color-main-700: #334155;
    --v2p-color-main-800: #1e293b;
    --v2p-color-accent-50: oklch(96% 0.02 262);
    --v2p-color-accent-100: oklch(92% 0.05 262);
    --v2p-color-accent-200: oklch(85% 0.09 262);
    --v2p-color-accent-300: oklch(76% 0.13 262);
    --v2p-color-accent-400: oklch(66% 0.17 262);
    --v2p-color-accent-500: oklch(55% 0.19 262);
    --v2p-color-accent-600: oklch(46% 0.18 262);
    --v2p-color-orange-50: #fff7ed;
    --v2p-color-orange-100: #ffedd5;
    --v2p-color-orange-400: #fb923c;
    --v2p-color-background: oklch(95.5% 0.006 262);
    --v2p-color-foreground: var(--v2p-color-main-800);
    --v2p-color-selection-foreground: var(--v2p-color-main-100);
    --v2p-color-selection-background: var(--v2p-color-main-700);
    --v2p-color-selection-background-img: var(--v2p-color-main-500);
    --v2p-color-font-secondary: var(--v2p-color-main-600);
    --v2p-color-font-tertiary: var(--v2p-color-main-500);
    --v2p-color-font-quaternary: var(--v2p-color-main-400);
    --v2p-color-button-background: var(--v2p-color-main-100);
    --v2p-color-button-foreground: var(--v2p-color-main-500);
    --v2p-color-button-background-hover: var(--v2p-color-main-200);
    --v2p-color-button-foreground-hover: var(--v2p-color-main-600);
    --v2p-color-bg-content: oklch(99% 0.005 262);
    --v2p-color-bg-content-rgb: 248, 249, 255;
    --v2p-color-bg-footer: var(--v2p-color-bg-content);
    --v2p-color-bg-hover-btn: rgb(226 232 240 / 70%);
    --v2p-color-bg-subtle: #f7f7f7;
    --v2p-color-bg-input: var(--v2p-color-main-50);
    --v2p-color-bg-search: var(--v2p-color-main-100);
    --v2p-color-bg-search-active: var(--v2p-color-main-200);
    --v2p-color-bg-widget: rgb(255 255 255 / 70%);
    --v2p-color-bg-reply: var(--v2p-color-main-100);
    --v2p-color-bg-tooltip: var(--v2p-color-bg-content);
    --v2p-color-bg-tabs: var(--v2p-color-main-100);
    --v2p-color-bg-tpr: var(--v2p-color-main-100);
    --v2p-color-bg-avatar: var(--v2p-color-main-300);
    --v2p-color-bg-block: var(--v2p-color-main-100);
    --v2p-color-bg-block-darker: var(--v2p-color-main-300);
    --v2p-color-bg-link: var(--v2p-color-main-100);
    --v2p-color-bg-link-hover: var(--v2p-color-main-200);
    --v2p-color-tabs: var(--v2p-color-foreground);
    --v2p-color-heart: #ef4444;
    --v2p-color-heart-fill: #fee2e2;
    --v2p-color-mask: rgb(0 0 0 / 25%);
    --v2p-color-divider: var(--v2p-color-main-200);
    --v2p-color-border: var(--v2p-color-main-200);
    --v2p-color-input-border: var(--v2p-color-main-300);
    --v2p-color-border-darker: var(--v2p-color-main-300);
    --v2p-color-link-visited: var(--v2p-color-main-400);
    --v2p-color-error: #ef4444;
    --v2p-color-bg-error: #fee2e2;
    --v2p-color-cell-num: var(--v2p-color-main-350);
    --v2p-box-shadow: 0 3px 5px 0 rgb(0 0 0 / 4%);
    --v2p-widget-shadow: 0 9px 24px -3px rgb(0 0 0 / 6%),
        0 4px 8px -1px rgb(0 0 0 /12%);
    --v2p-toast-shadow: 0 6px 16px 0 rgb(0 0 0 / 8%),
        0 3px 6px -4px rgb(0 0 0 / 12%), 0 9px 28px 8px rgb(0 0 0 / 5%);
    /* 原站兼容层：V2EX 自身使用的变量名，映射到统一体系 */
    --color-fade: var(--v2p-color-font-secondary);
    --color-gray: var(--v2p-color-font-secondary);
    --link-color: var(--v2p-color-foreground);
    --link-darker-color: var(--v2p-color-main-600);
    --link-hover-color: var(--v2p-color-foreground);
    --link-caution-color: var(--v2p-color-orange-400);
    --box-border-color: var(--v2p-color-border);
    --box-foreground-color: var(--v2p-color-foreground);
    --box-background-color: var(--v2p-color-bg-content);
    --box-background-alt-color: var(--v2p-color-main-100);
    --box-background-hover-color: var(--v2p-color-main-200);
    --box-border-focus-color: var(--v2p-color-main-200);
    --box-border-radius: var(--v2p-box-radius);
    --button-background-color: var(--v2p-color-button-background);
    --button-foreground-color: var(--v2p-color-button-foreground);
    --button-hover-color: var(--v2p-color-button-background-hover);
    --button-background-hover-color: var(--v2p-color-button-background-hover);
    --button-foreground-hover-color: var(--v2p-color-button-foreground-hover);
    --button-border-color: var(--v2p-color-main-300);
    --button-border-hover-color: var(--v2p-color-main-400);
    /* PC 补充 token：H5 体系没有、PC 消费点需要的语义量 */
    --v2p-color-scrollbar: var(--v2p-color-main-300);
    --v2p-color-loading-1: color-mix(in oklch, var(--v2p-color-accent-500) 15%, transparent);
    --v2p-color-loading-2: var(--v2p-color-accent-500);
}
:root body.v2p-theme-light-default,
:root body .v2p-theme-light-default {
    --v2p-color-main-50: #f7f9fb;
    --v2p-color-main-100: #f2f2f2;
    --v2p-color-main-200: #ececec;
    --v2p-color-main-300: #cbd5e1;
    --v2p-color-main-350: #94a3b8cc;
    --v2p-color-main-400: #94a3b8;
    --v2p-color-main-500: #64748b;
    --v2p-color-main-600: #475569;
    --v2p-color-main-700: #334155;
    --v2p-color-main-800: #1e293b;
    --v2p-color-accent-50: oklch(96% 0.02 262);
    --v2p-color-accent-100: oklch(92% 0.05 262);
    --v2p-color-accent-200: oklch(85% 0.09 262);
    --v2p-color-accent-300: oklch(76% 0.13 262);
    --v2p-color-accent-400: oklch(66% 0.17 262);
    --v2p-color-accent-500: oklch(55% 0.19 262);
    --v2p-color-accent-600: oklch(46% 0.18 262);
    --v2p-color-orange-50: #fff7ed;
    --v2p-color-orange-100: #ffedd5;
    --v2p-color-orange-400: #fb923c;
    --v2p-color-background: oklch(95.5% 0.006 262);
    --v2p-color-foreground: var(--v2p-color-main-700);
    --v2p-color-selection-foreground: var(--v2p-color-main-100);
    --v2p-color-selection-background: var(--v2p-color-main-700);
    --v2p-color-selection-background-img: var(--v2p-color-main-500);
    --v2p-color-font-secondary: var(--v2p-color-main-600);
    --v2p-color-font-tertiary: var(--v2p-color-main-500);
    --v2p-color-font-quaternary: var(--v2p-color-main-400);
    --v2p-color-button-background: var(--v2p-color-main-100);
    --v2p-color-button-foreground: var(--v2p-color-main-500);
    --v2p-color-button-background-hover: var(--v2p-color-main-200);
    --v2p-color-button-foreground-hover: var(--v2p-color-main-600);
    --v2p-color-bg-content: oklch(99% 0.005 262);
    --v2p-color-bg-content-rgb: 248, 249, 255;
    --v2p-color-bg-footer: var(--v2p-color-bg-content);
    --v2p-color-bg-hover-btn: rgb(226 232 240 / 70%);
    --v2p-color-bg-subtle: #f7f7f7;
    --v2p-color-bg-input: var(--v2p-color-main-50);
    --v2p-color-bg-search: var(--v2p-color-main-50);
    --v2p-color-bg-search-active: var(--v2p-color-main-200);
    --v2p-color-bg-widget: rgb(255 255 255 / 70%);
    --v2p-color-bg-reply: var(--v2p-color-main-50);
    --v2p-color-bg-tooltip: var(--v2p-color-bg-content);
    --v2p-color-bg-tabs: var(--v2p-color-main-100);
    --v2p-color-bg-tpr: var(--v2p-color-main-100);
    --v2p-color-bg-avatar: var(--v2p-color-main-300);
    --v2p-color-bg-block: var(--v2p-color-main-100);
    --v2p-color-bg-block-darker: var(--v2p-color-main-300);
    --v2p-color-bg-link: var(--v2p-color-main-100);
    --v2p-color-bg-link-hover: var(--v2p-color-main-200);
    --v2p-color-tabs: var(--v2p-color-foreground);
    --v2p-color-heart: #ef4444;
    --v2p-color-heart-fill: #fee2e2;
    --v2p-color-mask: rgb(0 0 0 / 25%);
    --v2p-color-divider: var(--v2p-color-main-200);
    --v2p-color-border: var(--v2p-color-main-200);
    --v2p-color-input-border: var(--v2p-color-main-300);
    --v2p-color-border-darker: var(--v2p-color-main-300);
    --v2p-color-link-visited: var(--v2p-color-main-400);
    --v2p-color-error: #ef4444;
    --v2p-color-bg-error: #fee2e2;
    --v2p-color-cell-num: var(--v2p-color-main-350);
    --v2p-box-shadow: 0 3px 5px 0 rgb(0 0 0 / 4%);
    --v2p-widget-shadow: 0 9px 24px -3px rgb(0 0 0 / 6%),
        0 4px 8px -1px rgb(0 0 0 /12%);
    --v2p-toast-shadow: 0 6px 16px 0 rgb(0 0 0 / 8%),
        0 3px 6px -4px rgb(0 0 0 / 12%), 0 9px 28px 8px rgb(0 0 0 / 5%);
    --color-fade: var(--v2p-color-font-secondary);
    --color-gray: var(--v2p-color-font-secondary);
    --link-color: var(--v2p-color-foreground);
    --link-darker-color: var(--v2p-color-main-600);
    --link-visited-color: var(--v2p-color-foreground);
    --link-hover-color: var(--v2p-color-foreground);
    --link-caution-color: var(--v2p-color-orange-400);
    --box-border-color: var(--v2p-color-border);
    --box-foreground-color: var(--v2p-color-foreground);
    --box-background-color: var(--v2p-color-bg-content);
    --box-background-alt-color: var(--v2p-color-main-100);
    --box-background-hover-color: var(--v2p-color-main-200);
    --box-border-focus-color: var(--v2p-color-main-200);
    --box-border-radius: var(--v2p-box-radius);
    --button-background-color: var(--v2p-color-button-background);
    --button-foreground-color: var(--v2p-color-button-foreground);
    --button-hover-color: var(--v2p-color-button-background-hover);
    --button-background-hover-color: var(--v2p-color-button-background-hover);
    --button-foreground-hover-color: var(--v2p-color-button-foreground-hover);
    --button-border-color: var(--v2p-color-main-300);
    --button-border-hover-color: var(--v2p-color-main-400);
}
/* 深色主题（六联兜底：插件类 + DarkReader + 原站夜间） */
html.v2p-theme-dark-default,
html.v2p-theme-dark-default body,
:root body.v2p-theme-dark-default,
:root .v2p-theme-dark-default,
:root[data-darkreader-scheme="dark"] body,
:root body:where(:has(#Wrapper.Night)) {
    color-scheme: dark;
    --v2p-color-main-50: unset;
    --v2p-color-main-100: #2d333b;
    --v2p-color-main-200: #374151;
    --v2p-color-main-300: #374151;
    --v2p-color-main-350: #6b7280cc;
    --v2p-color-main-400: #6b7280;
    --v2p-color-main-500: #9ca3af;
    --v2p-color-main-600: #9ca3af;
    --v2p-color-main-700: #d1d5db;
    --v2p-color-main-800: #e5e7eb;
    --v2p-color-main-900: #111827;
    --v2p-color-main-950: #030712;
    --v2p-color-accent-50: oklch(25% 0.08 262);
    --v2p-color-accent-100: oklch(32% 0.11 262);
    --v2p-color-accent-200: oklch(42% 0.15 262);
    --v2p-color-accent-300: oklch(53% 0.17 262);
    --v2p-color-accent-400: oklch(63% 0.17 262);
    --v2p-color-accent-500: oklch(72% 0.15 262);
    --v2p-color-accent-600: oklch(80% 0.11 262);
    --v2p-color-orange-50: #593600;
    --v2p-color-orange-100: #9a3412;
    --v2p-color-orange-400: #fbe090;
    --v2p-color-background: #1c2128;
    --v2p-color-foreground: #adbac7;
    --v2p-color-font-secondary: var(--v2p-color-main-600);
    --v2p-color-button-background: #373e47;
    --v2p-color-button-foreground: var(--v2p-color-foreground);
    --v2p-color-button-background-hover: #444c56;
    --v2p-color-button-foreground-hover: var(--v2p-color-foreground);
    --v2p-color-bg-content: #22272e;
    --v2p-color-bg-content-rgb: 34, 39, 46;
    --v2p-color-bg-hover-btn: var(--v2p-color-button-background-hover);
    --v2p-color-bg-subtle: #444c56;
    --v2p-color-bg-input: var(--v2p-color-background);
    --v2p-color-bg-search: var(--v2p-color-main-100);
    --v2p-color-bg-search-active: var(--v2p-color-main-200);
    --v2p-color-bg-widget: var(--v2p-color-bg-content);
    --v2p-color-bg-reply: var(--v2p-color-main-100);
    --v2p-color-bg-tooltip: var(--v2p-color-main-100);
    --v2p-color-bg-avatar: var(--v2p-color-main-300);
    --v2p-color-bg-block: #373e47;
    --v2p-color-heart: #ef4444;
    --v2p-color-heart-fill: #fca5a5;
    --v2p-color-mask: rgb(99 110 123 / 40%);
    /* H5 原文两次声明 border，取后者（#444c56） */
    --v2p-color-border: #444c56;
    --v2p-color-input-border: #444c56;
    --v2p-color-border-darker: #444c56;
    --v2p-box-shadow: 0 3px 5px 0 rgb(0 0 0 / 10%);
    --v2p-toast-shadow: none;
    --link-color: var(--v2p-color-foreground);
    --link-visited-color: var(--v2p-color-foreground);
    --box-background-alt-color: var(--v2p-color-main-100);
    --box-background-hover-color: var(--v2p-color-main-300);
    --box-border-color: var(--v2p-color-main-100);
    --button-hover-color: var(--button-background-hover-color);
    --button-border-color: var(--v2p-color-border);
    --button-border-hover-color: #768390;
    /* PC 补充 token 深色值 */
    --v2p-color-scrollbar: #4a4d54;
}
/* dawn 主题（来源 H5 L2603-2684；已修复 H5 缺分号 bug）
   选择器补 body 级命中：主题类打在 html 上，裸类命中 html 级会被 :root body 的 light 声明遮蔽 */
body.v2p-theme-dawn,
.v2p-theme-dawn,
html.v2p-theme-dawn body,
:root body.v2p-theme-dawn {
    --v2p-color-base: 32deg 57% 95%;
    --v2p-color-surface: 35deg 100% 98%;
    --v2p-color-overlay: 33deg 43% 91%;
    --v2p-color-muted: 257deg 9% 61%;
    --v2p-color-subtle: 248deg 12% 52%;
    --v2p-color-text: 248deg 19% 40%;
    --v2p-color-love: 343deg 35% 55%;
    --v2p-color-gold: 35deg 81% 56%;
    --v2p-color-rose: 3deg 53% 67%;
    --v2p-color-pine: 197deg 53% 34%;
    --v2p-color-foam: 189deg 30% 48%;
    --v2p-color-iris: 268deg 21% 57%;
    --v2p-color-main-600: hsl(47, 48.15%, 21.26%); /* 修复：H5 原文缺分号 */
    --v2p-color-accent-50: hsl(var(--v2p-color-foam) / 10%);
    --v2p-color-accent-100: hsl(var(--v2p-color-foam) / 20%);
    --v2p-color-accent-200: hsl(var(--v2p-color-foam) / 30%);
    --v2p-color-accent-300: hsl(var(--v2p-color-foam) / 40%);
    --v2p-color-accent-400: #34d399;
    --v2p-color-accent-500: hsl(var(--v2p-color-foam) / 65%);
    --v2p-color-accent-600: hsl(var(--v2p-color-foam) / 80%);
    --v2p-color-orange-50: hsl(var(--v2p-color-gold) / 10%);
    --v2p-color-orange-100: hsl(var(--v2p-color-gold) / 20%);
    --v2p-color-orange-400: hsl(var(--v2p-color-gold));
    --v2p-color-background: hsl(var(--v2p-color-base));
    --v2p-color-foreground: hsl(38.09deg 19% 40%);
    --v2p-color-selection-foreground: var(--v2p-color-foreground);
    --v2p-color-selection-background: hsl(var(--v2p-color-muted) / 20%);
    --v2p-color-selection-background-img: hsl(var(--v2p-color-muted) / 60%);
    --v2p-color-font-secondary: hsl(37.89deg 18.63% 40%);
    --v2p-color-font-tertiary: hsl(var(--v2p-color-subtle));
    --v2p-color-font-quaternary: hsl(var(--v2p-color-subtle));
    --v2p-color-button-background: hsl(var(--v2p-color-text) / 10%);
    --v2p-color-button-foreground: var(--v2p-color-foreground);
    --v2p-color-button-background-hover: hsl(var(--v2p-color-text) / 15%);
    --v2p-color-button-foreground-hover: var(--v2p-color-foreground);
    --v2p-color-bg-content: hsl(var(--v2p-color-surface));
    --v2p-color-bg-content-rgb: 250, 244, 237;
    --v2p-color-bg-footer: var(--v2p-color-bg-content);
    --v2p-color-bg-hover-btn: rgb(152 147 165 / 10%);
    --v2p-color-bg-subtle: hsl(var(--v2p-color-pine) / 10%);
    --v2p-color-bg-input: hsl(var(--v2p-color-overlay) / 40%);
    --v2p-color-bg-search: hsl(var(--v2p-color-overlay) / 60%);
    --v2p-color-bg-search-active: hsl(var(--v2p-color-overlay) / 90%);
    --v2p-color-bg-widget: rgb(255 255 255 / 70%);
    --v2p-color-bg-reply: #faf4ed;
    --v2p-color-bg-tooltip: var(--v2p-color-bg-content);
    --v2p-color-bg-tabs: hsl(34deg 53% 34% / 10%);
    --v2p-color-bg-tpr: hsl(var(--v2p-color-text) / 10%);
    --v2p-color-bg-avatar: hsl(var(--v2p-color-overlay));
    --v2p-color-bg-block: hsl(var(--v2p-color-text) / 10%);
    --v2p-color-bg-block-darker: hsl(var(--v2p-color-text) / 25%);
    --v2p-color-bg-link: hsl(var(--v2p-color-text) / 10%);
    --v2p-color-bg-link-hover: hsl(var(--v2p-color-text) / 15%);
    --v2p-color-tabs: hsl(46.92deg 53% 34%);
    --v2p-color-heart: #eb6f92;
    --v2p-color-heart-fill: rgb(235 111 146 / 50%);
    --v2p-color-mask: rgb(0 0 0 / 25%);
    --v2p-color-divider: hsl(var(--v2p-color-muted) / 20%);
    --v2p-color-border: hsl(var(--v2p-color-muted) / 20%);
    --v2p-color-input-border: rgb(152 147 165 / 20%);
    --v2p-color-border-darker: hsl(var(--v2p-color-muted) / 40%);
    --v2p-color-link-visited: hsl(37.89, 18.63%, 60%);
    --v2p-color-error: #eb6f92;
    --v2p-color-bg-error: #fee2e2;
    --v2p-color-cell-num: hsl(var(--v2p-color-subtle));
    --v2p-box-shadow: 0 3px 5px 0 rgb(0 0 0 / 4%);
    --v2p-widget-shadow: 0 9px 24px -3px rgb(0 0 0 / 6%),
        0 4px 8px -1px rgb(0 0 0 /12%);
    --v2p-toast-shadow: 0 6px 16px 0 rgb(0 0 0 / 8%),
        0 3px 6px -4px rgb(0 0 0 / 12%), 0 9px 28px 8px rgb(0 0 0 / 5%);
    --link-color: var(--v2p-color-foreground);
    --link-visited-color: var(--v2p-color-foreground);
    --box-background-alt-color: var(--v2p-color-bg-block);
    --box-background-hover-color: var(--v2p-color-bg-link-hover);
    --button-hover-color: var(--v2p-color-button-background-hover);
    --button-border-color: var(--v2p-color-border);
    --button-border-hover-color: var(--v2p-color-border-darker);
}
/* aqua 主题（来源 H5 L2692-2792；选择器补 body 级命中，理由同 dawn） */
body.v2p-theme-aqua,
.v2p-theme-aqua,
html.v2p-theme-aqua body,
:root body.v2p-theme-aqua {
    --v2p-color-base: 220deg 18% 97%;
    --v2p-color-surface: 240deg 100% 100%;
    --v2p-color-overlay: 210deg 12% 90%;
    --v2p-color-muted: 215deg 10% 55%;
    --v2p-color-subtle: 220deg 15% 45%;
    --v2p-color-text: 220deg 25% 25%;
    --v2p-color-love: 345deg 60% 55%;
    --v2p-color-gold: 35deg 81% 56%;
    --v2p-color-rose: 3deg 53% 67%;
    --v2p-color-pine: 180deg 53% 34%;
    --v2p-color-foam: 195deg 70% 45%;
    --v2p-color-iris: 240deg 50% 60%;
    --v2p-color-accent-50: #ecfdf5;
    --v2p-color-accent-100: hsl(var(--v2p-color-iris) / 20%);
    --v2p-color-accent-200: hsl(var(--v2p-color-iris) / 30%);
    --v2p-color-accent-300: hsl(var(--v2p-color-iris) / 40%);
    --v2p-color-accent-400: #34d399;
    --v2p-color-accent-500: hsl(var(--v2p-color-iris) / 65%);
    --v2p-color-accent-600: hsl(var(--v2p-color-iris) / 80%);
    --v2p-color-orange-50: hsl(var(--v2p-color-gold) / 10%);
    --v2p-color-orange-100: hsl(var(--v2p-color-gold) / 20%);
    --v2p-color-orange-400: hsl(var(--v2p-color-gold));
    --v2p-color-background: #f2f7fa;
    --v2p-color-foreground: hsl(var(--v2p-color-text));
    --v2p-color-selection-foreground: var(--v2p-color-surface);
    --v2p-color-selection-background: hsl(var(--v2p-color-iris) / 60%);
    --v2p-color-selection-background-img: hsl(var(--v2p-color-iris) / 80%);
    --v2p-color-font-secondary: hsl(var(--v2p-color-subtle));
    --v2p-color-font-tertiary: hsl(var(--v2p-color-subtle));
    --v2p-color-font-quaternary: hsl(var(--v2p-color-subtle));
    --v2p-color-button-background: hsl(var(--v2p-color-iris) / 10%);
    --v2p-color-button-foreground: var(--v2p-color-foreground);
    --v2p-color-button-background-hover: hsl(var(--v2p-color-iris) / 15%);
    --v2p-color-button-foreground-hover: var(--v2p-color-foreground);
    --v2p-color-bg-content: hsl(var(--v2p-color-surface));
    --v2p-color-bg-content-rgb: 255, 255, 255;
    --v2p-color-bg-footer: var(--v2p-color-bg-content);
    --v2p-color-bg-hover-btn: hsl(var(--v2p-color-iris) / 10%);
    --v2p-color-bg-subtle: hsl(var(--v2p-color-iris) / 10%);
    --v2p-color-bg-input: hsl(var(--v2p-color-overlay) / 50%);
    --v2p-color-bg-search: hsl(var(--v2p-color-overlay) / 70%);
    --v2p-color-bg-search-active: hsl(var(--v2p-color-overlay));
    --v2p-color-bg-widget: rgb(255 255 255 / 85%);
    --v2p-color-bg-reply: #f3f6fa;
    --v2p-color-bg-tooltip: var(--v2p-color-bg-content);
    --v2p-color-bg-tabs: hsl(var(--v2p-color-iris) / 5%);
    --v2p-color-bg-tpr: hsl(var(--v2p-color-text) / 10%);
    --v2p-color-bg-avatar: hsl(var(--v2p-color-overlay));
    --v2p-color-bg-block: hsl(var(--v2p-color-iris) / 5%);
    --v2p-color-bg-block-darker: hsl(var(--v2p-color-iris) / 15%);
    --v2p-color-bg-link: hsl(var(--v2p-color-iris) / 10%);
    --v2p-color-bg-link-hover: hsl(var(--v2p-color-iris) / 15%);
    --v2p-color-tabs: #394d65;
    --v2p-color-divider: hsl(var(--v2p-color-muted) / 15%);
    --v2p-color-border: hsl(var(--v2p-color-muted) / 15%);
    --v2p-color-input-border: hsl(220deg 15% 75%);
    --v2p-color-border-darker: hsl(var(--v2p-color-muted) / 30%);
    --v2p-color-link-visited: hsl(var(--v2p-color-subtle));
    --v2p-color-error: #eb6f92;
    --v2p-color-bg-error: #fee2e2;
    --v2p-color-cell-num: hsl(var(--v2p-color-subtle));
    --v2p-box-shadow: 0 1px 2px 0 rgb(0 0 0 / 6%), 0 1px 3px 0 rgb(0 0 0 / 4%);
    --v2p-widget-shadow: 0 6px 16px -3px rgb(0 0 0 / 4%),
        0 2px 4px -1px rgb(0 0 0 /8%);
    --v2p-toast-shadow: var(--v2p-widget-shadow);
    --link-color: #394d65;
    --link-visited-color: var(--v2p-color-foreground);
    --box-background-alt-color: var(--v2p-color-bg-block);
    --box-background-hover-color: var(--v2p-color-bg-link-hover);
    --button-hover-color: var(--v2p-color-button-background-hover);
    --button-border-color: var(--v2p-color-border);
    --button-border-hover-color: var(--v2p-color-border-darker);
}

/* Hallmark · redesign: v2ex-PC style · tone: technical · anchor hue: blue 260-265 · theme: custom-v2 (OKLCH, light/dark) */
/* Hallmark · pre-emit critique: P4 H5 E4 S5 R4 V4 */
.tip[data-v-ee672411] {
  position: fixed;
  font-size: 1.6rem;
  z-index: 9999;
  max-width: 10rem;
  border-radius: var(--radius-md);
  padding: 1rem;
  color: var(--color-font-8);
  background: var(--color-tooltip-bg);
  box-shadow: var(--shadow-lg);
}

.v-enter-active[data-v-e7c0fbef],
.v-leave-active[data-v-e7c0fbef] {
  transition: opacity 0.3s ease;
}

.v-enter-from[data-v-e7c0fbef],
.v-leave-to[data-v-e7c0fbef] {
  opacity: 0;
}

.username[data-v-e7c0fbef] {
  font-weight: 600;
  font-size: 1.4rem;
  margin-right: 1rem;
}

.link-num[data-v-e7c0fbef] {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-danger);
}

.owner[data-v-e7c0fbef] {
  display: inline-block;
  background-color: transparent;
  color: #059669;
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.5rem;
  cursor: default;
  border: 1px solid currentColor;
  font-size: 1rem;
  font-weight: 600;
  margin-right: 1rem;
}

.mod[data-v-e7c0fbef] {
  display: inline-block;
  background-color: #34d399;
  color: #fff;
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.5rem;
  cursor: default;
  border: 1px solid #34d399;
  font-size: 1rem;
  font-weight: 600;
  margin-right: 1rem;
}

.my-tag[data-v-e7c0fbef] {
  font-size: 1.4rem;
  color: var(--color-danger);
  margin-left: 1rem;
}

.my-tag:hover .remove[data-v-e7c0fbef] {
  display: inline;
}

.my-tag .remove[data-v-e7c0fbef] {
  cursor: pointer;
  margin-left: 0.5rem;
  display: none;
}

.add-tag[data-v-e7c0fbef] {
  font-size: 2.4rem;
  transform: translateY(0.2rem);
  line-height: 1rem;
  display: inline-block;
  margin-left: 1rem;
  cursor: pointer;
  position: absolute;
  display: none;
}

.floor[data-v-e7c0fbef] {
  margin-left: 0.5rem;
  font-size: 1.1rem;
  line-height: 1.5;
  border-radius: var(--radius-sm);
  display: inline-block;
  background-color: #d1fae5;
  color: #059669;
  padding: 0.2rem 0.7rem;
  cursor: default;
}

html[data-v-e7c0fbef],
body[data-v-e7c0fbef] {
  font-size: 62.5%;
}

.flex[data-v-e7c0fbef] {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flex-end[data-v-e7c0fbef] {
  justify-content: flex-end;
}

.flex-center[data-v-e7c0fbef] {
  justify-content: center;
}

.p1[data-v-e7c0fbef] {
  padding: 1rem;
}

.p2[data-v-e7c0fbef] {
  padding: 2rem;
}

.p0[data-v-e7c0fbef] {
  padding: 0 !important;
}

body :is(.topic_content, .reply_content) a[href^="http"][data-v-e7c0fbef] {
  text-underline-offset: 0.7ex;
  text-decoration: underline 1px;
}

a[data-v-e7c0fbef] {
  text-decoration: none;
  cursor: pointer;
}

a[data-v-e7c0fbef]:hover {
  text-decoration: underline;
}

.tool[data-v-e7c0fbef] {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: var(--radius-sm);
  cursor: pointer;
  height: 2.6rem;
  padding: 0 0.6rem;
  gap: 0.2rem;
}

.tool>svg[data-v-e7c0fbef] {
  width: 1.6rem !important;
  height: 1.6rem !important;
}

.tool[data-v-e7c0fbef]:hover {
  background: var(--color-third-bg);
}

.tool.no-hover[data-v-e7c0fbef] {
  cursor: default;
}

.tool.no-hover[data-v-e7c0fbef]:hover {
  background: unset !important;
}

.tool.disabled[data-v-e7c0fbef] {
  cursor: not-allowed;
}

.tool.disabled[data-v-e7c0fbef]:hover {
  background: unset !important;
}

.my-node[data-v-e7c0fbef] {
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.6rem;
  font-size: 1rem;
  color: var(--color-font);
  background: var(--color-third-bg);
  cursor: pointer;
}

.my-node[data-v-e7c0fbef]:hover {
  text-decoration: none;
  background: var(--color-line);
}

.msgs[data-v-e7c0fbef] {
  position: fixed;
  margin-left: calc(50% - 25rem);
  width: 50rem;
  z-index: 9999;
  bottom: 0;
  left: 0;
  right: 0;
}

.my-box[data-v-e7c0fbef] {
  box-shadow: var(--shadow-md);
  border-radius: var(--box-border-radius);
  background: var(--box-background-color);
  margin-bottom: 2rem;
  width: 100%;
  box-sizing: border-box;
  transition: background-color 0.3s;
}

.my-cell[data-v-e7c0fbef] {
  color: var(--color-font);
  padding: 0.8rem 1rem;
  font-size: 1.4rem;
  line-height: 1.6;
  text-align: left;
  border-bottom: 1px solid var(--color-line);
}

.modal[data-v-e7c0fbef] {
  position: fixed;
  z-index: 1001;
  width: 100vw;
  height: 100vh;
  left: 0;
  top: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal .title[data-v-e7c0fbef] {
  font-size: 2.4rem;
  margin-bottom: 1rem;
  text-align: center;
}

.modal .option[data-v-e7c0fbef] {
  display: flex;
  align-items: center;
  padding: 0.6rem 0;
}

.modal .option>span[data-v-e7c0fbef] {
  position: relative;
}

.modal .mask[data-v-e7c0fbef] {
  position: fixed;
  width: 100vw;
  height: 100vh;
  left: 0;
  top: 0;
  background-color: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.radio-group2[data-v-e7c0fbef] {
  display: inline-flex;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-radio-border);
  background: var(--box-background-alt-color);
}

.radio-group2 .radio[data-v-e7c0fbef] {
  cursor: pointer;
  background: transparent;
  padding: 0.5rem 1.2rem;
  border-left: 1px solid var(--color-radio-border);
  font-size: 1.3rem;
  color: var(--color-gray);
}

.radio-group2 .radio[data-v-e7c0fbef]:first-child {
  border-left: none;
}

.radio-group2 .active[data-v-e7c0fbef] {
  background: var(--color-third-bg);
  color: var(--color-font);
}

.pop-confirm[data-v-e7c0fbef] {
  position: relative;
  display: inline-flex;
  justify-content: center;
}

input[data-v-e7c0fbef] {
  height: 3rem;
  outline: unset;
  border: 1px solid var(--color-input-border);
  padding: 0 0.5rem;
  border-radius: var(--radius-sm);
  box-sizing: border-box;
  transition: all 0.3s;
  background: var(--color-input-bg);
  color: var(--color-font);
}

input[data-v-e7c0fbef]:hover {
  border: 1px solid var(--color-input-border-hover);
}

input[data-v-e7c0fbef]:focus {
  border: 1px solid var(--color-active);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);
}

.danger[data-v-e7c0fbef] {
  color: var(--color-danger) !important;
}

.pop-confirm-content[data-v-e7c0fbef] {
  position: fixed;
  background: var(--color-tooltip-bg);
  box-shadow: var(--shadow-lg);
  color: var(--color-font-8);
  padding: 1.5rem;
  border-radius: var(--radius-md);
  transform: translate(-50%, calc(-100% - 1rem));
  z-index: 1003;
}

.pop-confirm-content .text[data-v-e7c0fbef] {
  text-align: start;
  font-size: 1.6rem;
  width: 15rem;
  min-width: 15rem;
}

.pop-confirm-content .options[data-v-e7c0fbef] {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
}

img[data-v-e7c0fbef] {
  max-width: 100%;
}

.switch[data-v-e7c0fbef] {
  width: 4.5rem;
  height: 2.2rem;
  border-radius: 2rem;
  position: relative;
  display: flex;
  align-items: center;
  background: var(--color-swtich-bg);
  transition: all 0.3s;
}

.switch.active[data-v-e7c0fbef] {
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
}

.switch.active[data-v-e7c0fbef]:before {
  right: 0.2rem;
}

.switch[data-v-e7c0fbef]:before {
  position: absolute;
  content: " ";
  transition: all 0.3s;
  right: calc(100% - 2rem);
  width: 1.8rem;
  height: 1.8rem;
  background: white;
  border-radius: 50%;
}

.display-type[data-v-e4f684be] {
  height: 3rem;
  padding: 0 0.3rem;
  background: var(--color-sp-btn-bg);
  border-radius: 1rem;
  display: flex;
  font-size: 1.4rem;
  align-items: center;
  color: var(--color-font);
}

.display-type .type[data-v-e4f684be] {
  border-radius: var(--radius-md);
  padding: 0 1.3rem;
  height: 2.8rem;
  align-items: center;
  display: flex;
  position: relative;
  cursor: pointer;
}

.display-type .type.active[data-v-e4f684be] {
  background: var(--color-second-bg);
  color: #059669;
  box-shadow: var(--shadow-md);
}

.display-type .type-list[data-v-e4f684be] {
  position: absolute;
  background: var(--color-sp-btn-bg);
  right: 0;
  top: 3rem;
  font-size: 1.4rem;
  box-shadow: var(--shadow-md);
  border-radius: 0.6rem;
  z-index: 9;
  color: var(--color-font);
}

.display-type .type-list .item[data-v-e4f684be] {
  word-break: keep-all;
  padding: 0.8rem 1rem;
  cursor: pointer;
}

.display-type .type-list .item.active[data-v-e4f684be],
.display-type .type-list .item[data-v-e4f684be]:hover {
  color: var(--color-font-pure);
}

.display-type svg[data-v-e4f684be] {
  width: 1.5rem;
}

.loading[data-v-2697baa2] {
  border: 2px solid;
  border-color: var(--color-loading-2) var(--color-loading-1) var(--color-loading-1) var(--color-loading-1);
  border-radius: 100%;
  animation: circle-2697baa2 infinite 1s linear;
  width: 2rem;
  height: 2rem;
}

.loading.small[data-v-2697baa2] {
  width: 1.2rem;
  height: 1.2rem;
}

.loading.large[data-v-2697baa2] {
  width: 3rem;
  height: 3rem;
}

@keyframes circle-2697baa2 {
  0% {
    transform: rotate(0);
  }

  to {
    transform: rotate(360deg);
  }
}

.base-button[data-v-5a7d79ba] {
  cursor: pointer;
  border-radius: 0.6rem;
  padding: 0 1.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  height: 3.6rem;
  line-height: 1;
  position: relative;
}

.base-button .loading[data-v-5a7d79ba] {
  position: absolute;
}

.base-button.disabled[data-v-5a7d79ba] {
  opacity: 0.6;
  cursor: not-allowed;
  -webkit-user-select: none;
  user-select: none;
}

.base-button.small[data-v-5a7d79ba] {
  height: 3rem;
}

.base-button.small>span[data-v-5a7d79ba] {
  font-size: 1.3rem;
}

.base-button.large[data-v-5a7d79ba] {
  height: 5rem;
  font-size: 1.8rem;
  padding: 0 2.2rem;
}

.base-button.large>span[data-v-5a7d79ba] {
  font-size: 1.8rem;
}

.base-button[data-v-5a7d79ba]:hover:not(.link) {
  opacity: 0.85;
}

.base-button.primary[data-v-5a7d79ba] {
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  box-shadow: 0 6px 16px -4px rgb(16 185 129 / 55%);
}

.base-button.primary>span[data-v-5a7d79ba] {
  color: #fff;
}

.base-button.gary[data-v-5a7d79ba] {
  background: #4b5563;
}

.base-button.link[data-v-5a7d79ba] {
  border-radius: 0;
  border-bottom: 2px solid transparent;
}

.base-button.link>span[data-v-5a7d79ba] {
  color: var(--color-font-8);
}

.base-button.link[data-v-5a7d79ba]:hover {
  border-bottom: 2px solid var(--color-font-8);
}

.base-button.active[data-v-5a7d79ba] {
  opacity: 0.4;
}

.key-notice[data-v-5a7d79ba] {
  margin-left: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: #fff;
}

.key-notice .key[data-v-5a7d79ba] {
  transform: none;
}

.setting-modal .modal-root[data-v-386b43d0] {
  z-index: 9;
  background: var(--color-main-bg);
  border-radius: 1rem;
  font-size: 1.4rem;
  overflow: hidden;
  color: var(--color-font-pure);
}

.setting-modal .modal-root .modal-header[data-v-386b43d0] {
  padding: 1.4rem;
  display: flex;
  justify-content: center;
  position: relative;
}

.setting-modal .modal-root .modal-header .title[data-v-386b43d0] {
  font-size: 2.2rem;
  text-align: left;
  margin-bottom: 0;
}

.setting-modal .modal-root .modal-header svg[data-v-386b43d0] {
  position: absolute;
  right: 1rem;
  cursor: pointer;
  font-size: 2.6rem;
}

.setting-modal .modal-root .body[data-v-386b43d0] {
  width: 60rem;
}

.setting-modal .modal-root .body .modal-content[data-v-386b43d0] {
  background: var(--color-second-bg);
  flex: 1;
  height: 100%;
  box-sizing: border-box;
  padding: 1rem 1rem 1rem 2rem;
  font-size: 1.6rem;
  text-align: left;
  line-height: 1.6;
}

.setting-modal .modal-root .body .btns[data-v-386b43d0] {
  margin: 1.5rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1.5rem;
  font-size: 1.4rem;
}

.setting-modal .modal-root[data-v-086214a4] {
  z-index: 9;
  background: white;
  border-radius: 2rem;
  font-size: 1.6rem;
  overflow: hidden;
  color: var(--color-font-pure);
}

.setting-modal .modal-root .modal-header[data-v-086214a4] {
  padding: 2rem;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-input-border);
}

.setting-modal .modal-root .modal-header .title[data-v-086214a4] {
  font-size: 2rem;
  text-align: left;
  margin-bottom: 0;
}

.setting-modal .modal-root .modal-header svg[data-v-086214a4] {
  cursor: pointer;
  font-size: 2.6rem;
}

.setting-modal .modal-root .body[data-v-086214a4] {
  width: 65rem;
  height: 45rem;
  display: flex;
}

.setting-modal .modal-root .body .left[data-v-086214a4] {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.4rem;
}

.setting-modal .modal-root .body .left .tabs[data-v-086214a4] {
  padding: 1rem 0rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.setting-modal .modal-root .body .left .tabs .tab[data-v-086214a4] {
  cursor: pointer;
  padding: 0.8rem 1.5rem;
  width: 10rem;
  border-radius: var(--radius-md);
  text-align: start;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.6rem;
}

.setting-modal .modal-root .body .left .tabs .tab svg[data-v-086214a4] {
  font-size: 1.8rem;
}

.setting-modal .modal-root .body .left .tabs .tab.active[data-v-086214a4] {
  background: var(--color-active);
  background: #a7f3d0;
  color: var(--color-font-pure);
}

.setting-modal .modal-root .body .left .bottom[data-v-086214a4] {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
}

.setting-modal .modal-root .body .left .bottom .tip[data-v-086214a4] {
  width: 12rem;
  font-size: 1.2rem;
  color: var(--color-font);
}

.setting-modal .modal-root .body .left .bottom .icons[data-v-086214a4] {
  display: flex;
  gap: 1rem;
  font-size: 2.4rem;
}

.setting-modal .modal-root .body .modal-content[data-v-086214a4] {
  background: var(--color-second-bg);
  flex: 1;
  height: 100%;
  box-sizing: border-box;
  padding-right: 1rem;
  padding-left: 0;
  border-radius: 1rem;
  display: flex;
}

.setting-modal .modal-root .body .modal-content .scroll[data-v-086214a4] {
  flex: 1;
  padding-right: 1rem;
  overflow: auto;
}

.setting-modal .modal-root .body .modal-content .scroll .row[data-v-086214a4] {
  min-height: 5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-modal .modal-root .body .modal-content .scroll .row .wrapper[data-v-086214a4] {
  height: 3rem;
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space);
}

.setting-modal .modal-root .body .modal-content .scroll .row .wrapper span[data-v-086214a4] {
  text-align: right;
  font-size: 1.4rem;
  color: var(--color-font);
}

.setting-modal .modal-root .body .modal-content .scroll .row .wrapper .set-key[data-v-086214a4] {
  align-items: center;
}

.setting-modal .modal-root .body .modal-content .scroll .row .wrapper .set-key input[data-v-086214a4] {
  width: 15rem;
  box-sizing: border-box;
  margin-right: 1rem;
  height: 2.8rem;
  outline: none;
  font-size: 1.6rem;
  border: 1px solid gray;
  border-radius: 0.3rem;
  padding: 0 0.5rem;
  background: var(--color-second-bg);
  color: var(--color-font-1);
}

.setting-modal .modal-root .body .modal-content .scroll .row .main-title[data-v-086214a4] {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--color-font-8);
}

.setting-modal .modal-root .body .modal-content .scroll .border[data-v-086214a4] {
  border-bottom: 1px solid var(--color-input-border);
}

.setting-modal .modal-root .body .modal-content .scroll .desc[data-v-086214a4] {
  margin-bottom: 1rem;
  font-size: 1.4rem;
  text-align: left;
  color: var(--color-font);
}

.setting-modal .modal-root .body .modal-content .scroll .project-desc[data-v-086214a4] {
  text-align: start;
  font-size: 1.6rem;
  padding-bottom: 1rem;
}

.setting-modal .modal-root .body .modal-content .scroll .line[data-v-086214a4] {
  border-bottom: 1px solid #c4c3c3;
}

.sub-content[data-v-086214a4] {
  padding: 0 2rem 1rem;
  border-radius: 1rem;
  background: #edf1f4;
  margin-bottom: 1rem;
}

.log[data-v-086214a4] {
  position: relative;
  text-align: left;
  margin-bottom: 20px;
  padding-left: 20px;
  font-size: 16px;
  color: #6495ed;
  text-decoration: underline;
}

.tips2[data-v-086214a4] {
  text-align: left;
  color: var(--color-font);
}

.tips2 svg[data-v-086214a4] {
  transform: translateY(0.3rem);
  margin-right: 0.6rem;
}

.Author[data-v-64aa1930] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 1.2rem;
  position: relative;
}

.Author.expand[data-v-64aa1930] {
  margin-bottom: 0;
}

.Author .Author-left[data-v-64aa1930] {
  display: flex;
  align-items: center;
  max-width: 65%;
  word-break: break-all;
}

.Author .Author-left .username[data-v-64aa1930] {
  font-size: 1.4rem;
  margin-right: 0.6rem;
}

.Author .Author-left .expand-icon[data-v-64aa1930] {
  cursor: pointer;
  margin-right: 0.6rem;
  width: 2rem;
  height: 2rem;
  transform: rotate(90deg);
}

.Author .Author-left .avatar[data-v-64aa1930] {
  margin-right: 0.8rem;
  display: flex;
}

.Author .Author-left .avatar img[data-v-64aa1930] {
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 0.4rem;
}

.Author .Author-left .texts[data-v-64aa1930] {
  flex: 1;
}

.Author .Author-left .owner[data-v-64aa1930] {
  display: inline-block;
  background-color: transparent;
  color: #059669;
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.5rem;
  cursor: default;
  border: 1px solid currentColor;
  font-size: 1rem;
  font-weight: 600;
  margin-right: 0.6rem;
}

.Author .Author-left .dup[data-v-64aa1930] {
  display: inline-block;
  background-color: transparent;
  color: var(--color-danger);
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.5rem;
  cursor: default;
  border: 1px solid currentColor;
  font-size: 1rem;
  font-weight: 600;
  margin-right: 0.6rem;
}

.Author .Author-left .mod[data-v-64aa1930] {
  display: inline-block;
  background-color: #34d399;
  color: #fff;
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.5rem;
  cursor: default;
  border: 1px solid #34d399;
  font-size: 1rem;
  font-weight: 600;
  margin-right: 0.6rem;
}

.Author:hover .add-tag[data-v-64aa1930] {
  display: inline-block;
}

.Author .Author-right[data-v-64aa1930] {
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
}

.Author .Author-right .toolbar[data-v-64aa1930] {
  display: flex;
  align-items: center;
  color: var(--color-gray);
  opacity: 0;
  gap: 0.2rem;
}

.Author .Author-right .toolbar[data-v-64aa1930]:hover {
  opacity: 1;
}

.post-editor-wrapper[data-v-0e56c62c] {
  width: 100%;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
  color: var(--color-font);
}

.post-editor-wrapper.reply-post .post-editor[data-v-0e56c62c] {
  border: 1px solid var(--color-line);
}

.post-editor-wrapper.reply-post.isFocus .post-editor[data-v-0e56c62c] {
  border: 1px solid var(--color-active);
}

.post-editor-wrapper.reply-comment[data-v-0e56c62c] {
  border-radius: var(--box-border-radius);
  overflow: hidden;
  border: 1px solid var(--color-line);
}

.post-editor-wrapper.reply-comment.isFocus[data-v-0e56c62c] {
  border: 1px solid var(--color-active);
}

.post-editor-wrapper.reply-comment .toolbar[data-v-0e56c62c] {
  background: var(--color-editor-toolbar);
}

.post-editor-wrapper .post-editor[data-v-0e56c62c] {
  border-radius: var(--box-border-radius);
  transition: border 0.3s;
  width: 100%;
  max-width: 100%;
  padding: 0.6rem 1.4rem;
  box-sizing: border-box;
  outline: none;
  font-family: var(--v2-font-sans);
  font-size: 1.4rem;
  min-height: 13rem;
  resize: none;
  background: var(--box-background-color);
  color: var(--color-font-pure);
  border: 1px solid transparent;
}

.post-editor-wrapper .toolbar[data-v-0e56c62c] {
  box-sizing: border-box;
  padding: 0.5rem 1rem;
  width: 100%;
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.post-editor-wrapper .toolbar .left[data-v-0e56c62c] {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 2.6rem;
}

.post-editor-wrapper .toolbar .left svg[data-v-0e56c62c] {
  cursor: pointer;
}

.post-editor-wrapper .toolbar .left .upload[data-v-0e56c62c] {
  width: 2.6rem;
  height: 2.6rem;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

.post-editor-wrapper .toolbar .left .upload input[data-v-0e56c62c] {
  width: 2.6rem;
  height: 2.6rem;
  cursor: pointer;
  position: absolute;
  opacity: 0;
}

.post-editor-wrapper .toolbar span[data-v-0e56c62c] {
  color: var(--color-font);
  font-size: 1.3rem;
}

.post-editor-wrapper .get-cursor[data-v-0e56c62c] {
  border-radius: var(--box-border-radius);
  transition: border 0.3s;
  width: 100%;
  max-width: 100%;
  padding: 0.6rem 1.4rem;
  box-sizing: border-box;
  outline: none;
  font-family: var(--v2-font-sans);
  font-size: 1.4rem;
  min-height: 13rem;
  resize: none;
  background: var(--box-background-color);
  color: var(--color-font-pure);
  border: 1px solid transparent;
  position: absolute;
  top: 0;
  z-index: -100;
}

.post-editor-wrapper .emoticon-pack[data-v-0e56c62c] {
  z-index: 999999999;
  border-radius: 1rem;
  padding: 1rem;
  width: 31rem;
  max-width: 31rem;
  height: 30rem;
  max-height: 30rem;
  overflow: auto;
  background: var(--color-third-bg);
  border: 1px solid var(--color-font-3);
  box-shadow: var(--shadow-lg);
  position: fixed;
  bottom: 11rem;
  left: 14rem;
}

.post-editor-wrapper .emoticon-pack svg[data-v-0e56c62c] {
  cursor: pointer;
  position: absolute;
  right: 0.8rem;
  font-size: 2.4rem;
}

.post-editor-wrapper .emoticon-pack .list[data-v-0e56c62c] {
  margin: 1rem 0;
  display: flex;
  flex-wrap: wrap;
}

.post-editor-wrapper .emoticon-pack img[data-v-0e56c62c] {
  cursor: pointer;
  width: calc(100% / 7);
  padding: 0.5rem;
  box-sizing: border-box;
}

.post-editor-wrapper .emoticon-pack span[data-v-0e56c62c] {
  width: calc(100% / 7);
  display: inline-block;
  cursor: pointer;
  font-size: 2.3rem;
  text-align: center;
}

.v-enter-active[data-v-6f61a860],
.v-leave-active[data-v-6f61a860] {
  transition: opacity 0.3s ease;
}

.v-enter-from[data-v-6f61a860],
.v-leave-to[data-v-6f61a860] {
  opacity: 0;
}

.username[data-v-6f61a860] {
  font-weight: 600;
  font-size: 1.4rem;
  margin-right: 1rem;
}

.link-num[data-v-6f61a860] {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-danger);
}

.owner[data-v-6f61a860] {
  display: inline-block;
  background-color: transparent;
  color: #059669;
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.5rem;
  cursor: default;
  border: 1px solid currentColor;
  font-size: 1rem;
  font-weight: 600;
  margin-right: 1rem;
}

.mod[data-v-6f61a860] {
  display: inline-block;
  background-color: #34d399;
  color: #fff;
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.5rem;
  cursor: default;
  border: 1px solid #34d399;
  font-size: 1rem;
  font-weight: 600;
  margin-right: 1rem;
}

.my-tag[data-v-6f61a860] {
  font-size: 1.4rem;
  color: var(--color-danger);
  margin-left: 1rem;
}

.my-tag:hover .remove[data-v-6f61a860] {
  display: inline;
}

.my-tag .remove[data-v-6f61a860] {
  cursor: pointer;
  margin-left: 0.5rem;
  display: none;
}

.add-tag[data-v-6f61a860] {
  font-size: 2.4rem;
  transform: translateY(0.2rem);
  line-height: 1rem;
  display: inline-block;
  margin-left: 1rem;
  cursor: pointer;
  position: absolute;
  display: none;
}

.floor[data-v-6f61a860] {
  margin-left: 0.5rem;
  font-size: 1.1rem;
  line-height: 1.5;
  border-radius: var(--radius-sm);
  display: inline-block;
  background-color: #d1fae5;
  color: #059669;
  padding: 0.2rem 0.7rem;
  cursor: default;
}

html[data-v-6f61a860],
body[data-v-6f61a860] {
  font-size: 62.5%;
}

.flex[data-v-6f61a860] {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flex-end[data-v-6f61a860] {
  justify-content: flex-end;
}

.flex-center[data-v-6f61a860] {
  justify-content: center;
}

.p1[data-v-6f61a860] {
  padding: 1rem;
}

.p2[data-v-6f61a860] {
  padding: 2rem;
}

.p0[data-v-6f61a860] {
  padding: 0 !important;
}

body :is(.topic_content, .reply_content) a[href^="http"][data-v-6f61a860] {
  text-underline-offset: 0.7ex;
  text-decoration: underline 1px;
}

a[data-v-6f61a860] {
  text-decoration: none;
  cursor: pointer;
}

a[data-v-6f61a860]:hover {
  text-decoration: underline;
}

.tool[data-v-6f61a860] {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: var(--radius-sm);
  cursor: pointer;
  height: 2.6rem;
  padding: 0 0.6rem;
  gap: 0.2rem;
}

.tool>svg[data-v-6f61a860] {
  width: 1.6rem !important;
  height: 1.6rem !important;
}

.tool[data-v-6f61a860]:hover {
  background: var(--color-third-bg);
}

.tool.no-hover[data-v-6f61a860] {
  cursor: default;
}

.tool.no-hover[data-v-6f61a860]:hover {
  background: unset !important;
}

.tool.disabled[data-v-6f61a860] {
  cursor: not-allowed;
}

.tool.disabled[data-v-6f61a860]:hover {
  background: unset !important;
}

.my-node[data-v-6f61a860] {
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.6rem;
  font-size: 1rem;
  color: var(--color-font);
  background: var(--color-third-bg);
  cursor: pointer;
}

.my-node[data-v-6f61a860]:hover {
  text-decoration: none;
  background: var(--color-line);
}

.msgs[data-v-6f61a860] {
  position: fixed;
  margin-left: calc(50% - 25rem);
  width: 50rem;
  z-index: 9999;
  bottom: 0;
  left: 0;
  right: 0;
}

.my-box[data-v-6f61a860] {
  box-shadow: var(--shadow-md);
  border-radius: var(--box-border-radius);
  background: var(--box-background-color);
  margin-bottom: 2rem;
  width: 100%;
  box-sizing: border-box;
  transition: background-color 0.3s;
}

.my-cell[data-v-6f61a860] {
  color: var(--color-font);
  padding: 0.8rem 1rem;
  font-size: 1.4rem;
  line-height: 1.6;
  text-align: left;
  border-bottom: 1px solid var(--color-line);
}

.modal[data-v-6f61a860] {
  position: fixed;
  z-index: 1001;
  width: 100vw;
  height: 100vh;
  left: 0;
  top: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal .title[data-v-6f61a860] {
  font-size: 2.4rem;
  margin-bottom: 1rem;
  text-align: center;
}

.modal .option[data-v-6f61a860] {
  display: flex;
  align-items: center;
  padding: 0.6rem 0;
}

.modal .option>span[data-v-6f61a860] {
  position: relative;
}

.modal .mask[data-v-6f61a860] {
  position: fixed;
  width: 100vw;
  height: 100vh;
  left: 0;
  top: 0;
  background-color: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.radio-group2[data-v-6f61a860] {
  display: inline-flex;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-radio-border);
  background: var(--box-background-alt-color);
}

.radio-group2 .radio[data-v-6f61a860] {
  cursor: pointer;
  background: transparent;
  padding: 0.5rem 1.2rem;
  border-left: 1px solid var(--color-radio-border);
  font-size: 1.3rem;
  color: var(--color-gray);
}

.radio-group2 .radio[data-v-6f61a860]:first-child {
  border-left: none;
}

.radio-group2 .active[data-v-6f61a860] {
  background: var(--color-third-bg);
  color: var(--color-font);
}

.pop-confirm[data-v-6f61a860] {
  position: relative;
  display: inline-flex;
  justify-content: center;
}

input[data-v-6f61a860] {
  height: 3rem;
  outline: unset;
  border: 1px solid var(--color-input-border);
  padding: 0 0.5rem;
  border-radius: var(--radius-sm);
  box-sizing: border-box;
  transition: all 0.3s;
  background: var(--color-input-bg);
  color: var(--color-font);
}

input[data-v-6f61a860]:hover {
  border: 1px solid var(--color-input-border-hover);
}

input[data-v-6f61a860]:focus {
  border: 1px solid var(--color-active);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);
}

.danger[data-v-6f61a860] {
  color: var(--color-danger) !important;
}

.pop-confirm-content[data-v-6f61a860] {
  position: fixed;
  background: var(--color-tooltip-bg);
  box-shadow: var(--shadow-lg);
  color: var(--color-font-8);
  padding: 1.5rem;
  border-radius: var(--radius-md);
  transform: translate(-50%, calc(-100% - 1rem));
  z-index: 1003;
}

.pop-confirm-content .text[data-v-6f61a860] {
  text-align: start;
  font-size: 1.6rem;
  width: 15rem;
  min-width: 15rem;
}

.pop-confirm-content .options[data-v-6f61a860] {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
}

img[data-v-6f61a860] {
  max-width: 100%;
}

.html-wrapper[data-v-6f61a860] {
  position: relative;
}

.html-wrapper .mask[data-v-6f61a860] {
  max-height: 90rem;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(180deg, #000 80%, transparent);
  mask-image: linear-gradient(180deg, #000 80%, transparent);
}

.html-wrapper .expand[data-v-6f61a860] {
  position: absolute;
  z-index: 1;
  bottom: 2rem;
  padding: 0.3rem 1.5rem;
  border-radius: 2rem;
  border: 1px solid var(--color-line);
  background: var(--color-second-bg);
  color: var(--color-font);
  left: 50%;
  transform: translate(-50%);
  cursor: pointer;
}

.top-sub-comment[data-v-d3f8c94b] {
  width: 100%;
  box-sizing: border-box;
  margin-top: 0.8rem;
  display: flex;
  position: relative;
}

.top-sub-comment .expand-line[data-v-d3f8c94b] {
  width: 1.6rem;
  position: relative;
}

.top-sub-comment .expand-line[data-v-d3f8c94b]:after {
  position: absolute;
  left: 50%;
  top: 2%;
  content: " ";
  height: 98%;
  width: 0;
  border-right: 1px solid var(--color-top-reply-wrap-line);
}

.top-sub-comment .right[data-v-d3f8c94b] {
  flex: 1;
  width: calc(100% - 3rem);
}

.top-sub-comment .right .w .post-editor-wrapper[data-v-d3f8c94b] {
  margin-top: 1rem;
}

.top-sub-comment[data-v-d3f8c94b] .avatar {
  display: none !important;
}

.top-sub-comment.top-sub-reply[data-v-d3f8c94b]:first-child {
  margin-top: 0;
}

.top-sub-comment.top-sub-reply>.expand-line[data-v-d3f8c94b] {
  width: 1rem;
}

.top-sub-comment.top-sub-reply>.expand-line[data-v-d3f8c94b]:after {
  display: none;
}

.comment[data-v-984ba483] {
  width: 100%;
  box-sizing: border-box;
  margin-top: 0.6rem;
}

.comment.isLevelOne[data-v-984ba483] {
  border-bottom: 1px solid var(--color-line);
  padding: 0.8rem 1rem;
  margin-top: 0;
}

.comment.ding[data-v-984ba483] {
  background: rgba(255, 255, 0, 0.3) !important;
}

.comment.isSimple .avatar[data-v-984ba483],
.comment.isSimple .expand-line[data-v-984ba483] {
  display: none;
}

.comment.isSimple .simple-wrapper[data-v-984ba483] {
  padding-left: 2.8rem;
}

.comment.isSimple .w[data-v-984ba483] {
  padding-left: 0 !important;
  padding-top: 0.5rem;
}

.comment .comment-content-w .more[data-v-984ba483] {
  text-align: center;
  margin: 2rem 0;
}

.comment .comment-content[data-v-984ba483] {
  display: flex;
  position: relative;
}

.comment .comment-content .expand-line[data-v-984ba483] {
  cursor: pointer;
  margin-top: 0.6rem;
  width: 2rem;
  min-width: 2rem;
  position: relative;
}

.comment .comment-content .expand-line[data-v-984ba483]:after {
  position: absolute;
  left: 50%;
  content: " ";
  height: 100%;
  width: 0;
  border-right: 1px solid var(--color-line);
}

.comment .comment-content .expand-line[data-v-984ba483]:hover:after {
  border-right: 2px solid var(--color-active);
}

.comment .comment-content .right[data-v-984ba483] {
  flex: 1;
  width: calc(100% - 3rem);
}

.comment .comment-content .right .w[data-v-984ba483] {
  padding-left: 1rem;
}

.comment .comment-content .right .w .post-editor-wrapper[data-v-984ba483] {
  margin-top: 1rem;
}

.wrong-wrapper[data-v-984ba483] {
  font-size: 1.4rem;
  margin-bottom: 1rem;
}

.wrong-wrapper span[data-v-984ba483] {
  cursor: pointer;
}

.wrong-wrapper .del-line[data-v-984ba483] {
  text-decoration: line-through;
}

.wrong-wrapper .wrong-icon[data-v-984ba483] {
  margin-left: 0.5rem;
}

.wrong-wrapper .warning[data-v-984ba483] {
  border-top: 1px solid var(--color-line);
  border-bottom: 1px solid var(--color-line);
  padding: 1rem 0;
  margin-top: 1rem;
  font-size: 1.2rem;
  color: var(--color-danger);
}

.reply-count[data-v-984ba483] {
  padding: 0.8rem 0 0.4rem;
  border-radius: 0.2rem;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  color: var(--color-font);
  gap: 1rem;
  cursor: pointer;
}

.reply-count .gang[data-v-984ba483] {
  width: 2rem;
  height: 0;
  border-bottom: 1px solid #d5d5d5;
}

.reply-count svg[data-v-984ba483] {
  font-size: 1rem;
}

.top-reply-wrap[data-v-984ba483] {
  background: var(--color-top-reply-wrap-bg);
  border-radius: var(--radius-md);
  padding: 0.6rem;
  padding-left: 0;
  margin-left: 1rem;
}

.toolbar[data-v-30dac564] {
  border-top: 1px solid var(--color-line);
  height: 3.8rem;
  padding-left: 0.6rem;
  display: flex;
  align-items: center;
  color: var(--color-gray);
  font-size: 1.2rem;
  gap: 0.5rem;
}

.comment[data-v-4a063111] {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--color-line);
}

.comment.isSimple .avatar[data-v-4a063111] {
  display: none;
}

.comment.isSimple .reply_content[data-v-4a063111] {
  margin-top: 0.5rem !important;
}

.comment .avatar[data-v-4a063111] {
  display: flex;
}

.comment .avatar img[data-v-4a063111] {
  width: 3.8rem;
  height: 3.8rem;
  border-radius: 0.3rem;
}

.comment .comment-body[data-v-4a063111] {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.comment .comment-body .texts[data-v-4a063111] {
  display: flex;
  align-items: center;
}

.comment .comment-body .reply_content[data-v-4a063111] {
  margin-top: 1rem;
  max-width: calc(100% - 5rem);
}

.comment .isRight[data-v-4a063111] {
  align-items: flex-end;
}

.comment .isRight .owner[data-v-4a063111],
.comment .isRight .mod[data-v-4a063111],
.comment .isRight .username[data-v-4a063111] {
  margin: 0 0 0 1rem;
}

.comment .Author-right[data-v-4a063111] {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.comment .Author-right .floor[data-v-4a063111] {
  margin-left: 0;
}

.comment .Author-right .jump[data-v-4a063111] {
  color: var(--color-font);
  margin-top: 0.4rem;
  font-size: 1.4rem;
}

.comment .point[data-v-4a063111] {
  margin: 0 0.5rem;
  font-size: 1.6rem;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-weight: 700;
  color: var(--color-font-pure);
}

.sticky {
  position: sticky;
  bottom: -2px;
  z-index: 2;
  background: var(--box-background-hover-color) !important;
}

.sticky[stuck] {
  box-shadow: var(--shadow-lg) !important;
}

.preview-modal {
  position: fixed;
  width: 100vw;
  height: 100vh;
  left: 0;
  top: -1000vh;
  z-index: 9999;
}

.preview-modal .close {
  font-size: 2rem;
  color: #fff;
  position: absolute;
  right: 2rem;
  top: 2rem;
  cursor: pointer;
}

.preview-modal .mask {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  transition: all 0.3s;
}

.v-enter-active[data-v-d39217d8],
.v-leave-active[data-v-d39217d8] {
  transition: opacity 0.3s ease;
}

.v-enter-from[data-v-d39217d8],
.v-leave-to[data-v-d39217d8] {
  opacity: 0;
}

.username[data-v-d39217d8] {
  font-weight: 600;
  font-size: 1.4rem;
  margin-right: 1rem;
}

.link-num[data-v-d39217d8] {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-danger);
}

.owner[data-v-d39217d8] {
  display: inline-block;
  background-color: transparent;
  color: #059669;
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.5rem;
  cursor: default;
  border: 1px solid currentColor;
  font-size: 1rem;
  font-weight: 600;
  margin-right: 1rem;
}

.mod[data-v-d39217d8] {
  display: inline-block;
  background-color: #34d399;
  color: #fff;
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.5rem;
  cursor: default;
  border: 1px solid #34d399;
  font-size: 1rem;
  font-weight: 600;
  margin-right: 1rem;
}

.my-tag[data-v-d39217d8] {
  font-size: 1.4rem;
  color: var(--color-danger);
  margin-left: 1rem;
}

.my-tag:hover .remove[data-v-d39217d8] {
  display: inline;
}

.my-tag .remove[data-v-d39217d8] {
  cursor: pointer;
  margin-left: 0.5rem;
  display: none;
}

.add-tag[data-v-d39217d8] {
  font-size: 2.4rem;
  transform: translateY(0.2rem);
  line-height: 1rem;
  display: inline-block;
  margin-left: 1rem;
  cursor: pointer;
  position: absolute;
  display: none;
}

.floor[data-v-d39217d8] {
  margin-left: 0.5rem;
  font-size: 1.1rem;
  line-height: 1.5;
  border-radius: var(--radius-sm);
  display: inline-block;
  background-color: #d1fae5;
  color: #059669;
  padding: 0.2rem 0.7rem;
  cursor: default;
}

html[data-v-d39217d8],
body[data-v-d39217d8] {
  font-size: 62.5%;
}

.flex[data-v-d39217d8] {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flex-end[data-v-d39217d8] {
  justify-content: flex-end;
}

.flex-center[data-v-d39217d8] {
  justify-content: center;
}

.p1[data-v-d39217d8] {
  padding: 1rem;
}

.p2[data-v-d39217d8] {
  padding: 2rem;
}

.p0[data-v-d39217d8] {
  padding: 0 !important;
}

body :is(.topic_content, .reply_content) a[href^="http"][data-v-d39217d8] {
  text-underline-offset: 0.7ex;
  text-decoration: underline 1px;
}

a[data-v-d39217d8] {
  text-decoration: none;
  cursor: pointer;
}

a[data-v-d39217d8]:hover {
  text-decoration: underline;
}

.tool[data-v-d39217d8] {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: var(--radius-sm);
  cursor: pointer;
  height: 2.6rem;
  padding: 0 0.6rem;
  gap: 0.2rem;
}

.tool>svg[data-v-d39217d8] {
  width: 1.6rem !important;
  height: 1.6rem !important;
}

.tool[data-v-d39217d8]:hover {
  background: var(--color-third-bg);
}

.tool.no-hover[data-v-d39217d8] {
  cursor: default;
}

.tool.no-hover[data-v-d39217d8]:hover {
  background: unset !important;
}

.tool.disabled[data-v-d39217d8] {
  cursor: not-allowed;
}

.tool.disabled[data-v-d39217d8]:hover {
  background: unset !important;
}

.my-node[data-v-d39217d8] {
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.6rem;
  font-size: 1rem;
  color: var(--color-font);
  background: var(--color-third-bg);
  cursor: pointer;
}

.my-node[data-v-d39217d8]:hover {
  text-decoration: none;
  background: var(--color-line);
}

.msgs[data-v-d39217d8] {
  position: fixed;
  margin-left: calc(50% - 25rem);
  width: 50rem;
  z-index: 9999;
  bottom: 0;
  left: 0;
  right: 0;
}

.my-box[data-v-d39217d8] {
  box-shadow: var(--shadow-md);
  border-radius: var(--box-border-radius);
  background: var(--box-background-color);
  margin-bottom: 2rem;
  width: 100%;
  box-sizing: border-box;
  transition: background-color 0.3s;
}

.my-cell[data-v-d39217d8] {
  color: var(--color-font);
  padding: 0.8rem 1rem;
  font-size: 1.4rem;
  line-height: 1.6;
  text-align: left;
  border-bottom: 1px solid var(--color-line);
}

.modal[data-v-d39217d8] {
  position: fixed;
  z-index: 1001;
  width: 100vw;
  height: 100vh;
  left: 0;
  top: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal .title[data-v-d39217d8] {
  font-size: 2.4rem;
  margin-bottom: 1rem;
  text-align: center;
}

.modal .option[data-v-d39217d8] {
  display: flex;
  align-items: center;
  padding: 0.6rem 0;
}

.modal .option>span[data-v-d39217d8] {
  position: relative;
}

.modal .mask[data-v-d39217d8] {
  position: fixed;
  width: 100vw;
  height: 100vh;
  left: 0;
  top: 0;
  background-color: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.radio-group2[data-v-d39217d8] {
  display: inline-flex;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-radio-border);
  background: var(--box-background-alt-color);
}

.radio-group2 .radio[data-v-d39217d8] {
  cursor: pointer;
  background: transparent;
  padding: 0.5rem 1.2rem;
  border-left: 1px solid var(--color-radio-border);
  font-size: 1.3rem;
  color: var(--color-gray);
}

.radio-group2 .radio[data-v-d39217d8]:first-child {
  border-left: none;
}

.radio-group2 .active[data-v-d39217d8] {
  background: var(--color-third-bg);
  color: var(--color-font);
}

.pop-confirm[data-v-d39217d8] {
  position: relative;
  display: inline-flex;
  justify-content: center;
}

input[data-v-d39217d8] {
  height: 3rem;
  outline: unset;
  border: 1px solid var(--color-input-border);
  padding: 0 0.5rem;
  border-radius: var(--radius-sm);
  box-sizing: border-box;
  transition: all 0.3s;
  background: var(--color-input-bg);
  color: var(--color-font);
}

input[data-v-d39217d8]:hover {
  border: 1px solid var(--color-input-border-hover);
}

input[data-v-d39217d8]:focus {
  border: 1px solid var(--color-active);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);
}

.danger[data-v-d39217d8] {
  color: var(--color-danger) !important;
}

.pop-confirm-content[data-v-d39217d8] {
  position: fixed;
  background: var(--color-tooltip-bg);
  box-shadow: var(--shadow-lg);
  color: var(--color-font-8);
  padding: 1.5rem;
  border-radius: var(--radius-md);
  transform: translate(-50%, calc(-100% - 1rem));
  z-index: 1003;
}

.pop-confirm-content .text[data-v-d39217d8] {
  text-align: start;
  font-size: 1.6rem;
  width: 15rem;
  min-width: 15rem;
}

.pop-confirm-content .options[data-v-d39217d8] {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
}

img[data-v-d39217d8] {
  max-width: 100%;
}

.Post[data-v-d39217d8] {
  position: unset !important;
  background: transparent !important;
  overflow: unset !important;
}

.Post .main[data-v-d39217d8] {
  background: transparent !important;
  padding: unset !important;
  width: 100% !important;
}

.Post .close-btn[data-v-d39217d8],
.Post .open-new-tab[data-v-d39217d8] {
  display: none;
}

.post-detail[data-v-d39217d8] {
  text-align: start;
  position: fixed;
  z-index: 1002;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  background: rgba(0, 0, 0, 0.55);
  overflow: auto;
  font-size: 1.4rem;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
}

.post-detail[data-v-d39217d8] .subtle {
  background-color: #ecfdf5e6;
  border-left: 4px solid #a7f3d0;
}

.post-detail.isNight[data-v-d39217d8] .subtle {
  background-color: #1a3332;
  border-left: 4px solid #047857;
}

.post-detail .main[data-v-d39217d8] {
  display: flex;
  justify-content: flex-end;
  padding: 3rem 8rem 15rem;
  background: var(--color-main-bg);
  position: relative;
  outline: none;
}

.post-detail .main .main-wrapper[data-v-d39217d8] {
  width: 77rem;
  padding-bottom: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.post-detail .main .main-wrapper .post-wrapper .header:hover .add-tag[data-v-d39217d8] {
  display: inline-block;
}

.post-detail .main .main-wrapper .loading-wrapper[data-v-d39217d8] {
  height: 20rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.post-detail .main .main-wrapper #no-comments-yet[data-v-d39217d8] {
  color: var(--color-font);
  font-weight: 700;
  text-align: center;
  width: 100%;
  margin-bottom: 2rem;
  box-sizing: border-box;
}

.post-detail .main .relationReply[data-v-d39217d8] {
  position: fixed;
  width: 25vw;
  top: 6.5rem;
  bottom: 15rem;
  z-index: 100;
  transform: translate(calc(100% + 2rem));
  font-size: 2rem;
  overflow: hidden;
}

.post-detail .main .relationReply .my-cell[data-v-d39217d8] {
  background: var(--color-second-bg);
  border-radius: var(--box-border-radius) var(--box-border-radius) 0 0;
}

.post-detail .main .relationReply .comments[data-v-d39217d8] {
  max-height: calc(100% - 4.2rem);
  overflow: auto;
  background: var(--color-second-bg);
  border-radius: 0 0 var(--box-border-radius) var(--box-border-radius);
}

.post-detail .main .call-list[data-v-d39217d8] {
  z-index: 9;
  position: absolute;
  top: 12rem;
  border: 1px solid var(--color-main-bg);
  background: var(--color-call-list-bg);
  box-shadow: var(--shadow-md);
  overflow: auto;
  max-height: 30rem;
  border-radius: var(--box-border-radius);
  min-width: 8rem;
  box-sizing: content-box;
}

.post-detail .main .call-list .call-item[data-v-d39217d8] {
  border-top: 1px solid var(--color-main-bg);
  height: 3rem;
  display: flex;
  padding: 0 1rem;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
  box-sizing: border-box;
}

.post-detail .main .call-list .call-item .select[data-v-d39217d8],
.post-detail .main .call-list .call-item[data-v-d39217d8]:hover,
.post-detail .main .call-list .call-item.select[data-v-d39217d8] {
  background: var(--color-main-bg);
  text-decoration: none;
}

.post-detail .main .call-list .call-item[data-v-d39217d8]:nth-child(1) {
  border-top: 1px solid transparent;
}

@media screen and (max-width: 1280px) {
  .post-detail .main-wrapper[data-v-d39217d8] {
    width: 60vw !important;
  }
}

.post-detail .v2pro-scroll-top[data-v-d39217d8] {
  cursor: pointer;
  position: fixed;
  border-radius: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  bottom: 10rem;
  z-index: 99;
  padding: 0.8rem 0;
  gap: 1rem;
  width: 4.2rem;
  transform: translate(6rem);
  font-size: 2rem;
  background: var(--color-sp-btn-bg);
  color: var(--color-font-3);
}

.post-detail .v2pro-scroll-top svg[data-v-d39217d8] {
  font-size: 2.4rem;
}

.post-detail .refresh[data-v-d39217d8] {
  cursor: pointer;
  position: fixed;
  border-radius: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  bottom: 10rem;
  z-index: 99;
  padding: 0.8rem 0;
  gap: 1rem;
  width: 4.2rem;
  transform: translate(6rem);
  font-size: 2rem;
  background: var(--color-sp-btn-bg);
  color: var(--color-font-3);
  bottom: 23.5rem;
}

.post-detail .refresh svg[data-v-d39217d8] {
  font-size: 2.4rem;
}

.post-detail .scroll-to[data-v-d39217d8] {
  cursor: pointer;
  position: fixed;
  border-radius: 0.6rem;
  align-items: center;
  justify-content: center;
  bottom: 10rem;
  z-index: 99;
  padding: 0.8rem 0;
  gap: 1rem;
  width: 4.2rem;
  transform: translate(6rem);
  font-size: 2rem;
  background: var(--color-sp-btn-bg);
  color: var(--color-font-3);
  bottom: 15rem;
  display: flex;
  flex-direction: column;
}

.post-detail .scroll-to svg[data-v-d39217d8] {
  font-size: 2.4rem;
}

.post-detail .scroll-to input[data-v-d39217d8] {
  height: 2.6rem;
  width: 3.6rem;
  font-size: 1.4rem;
  text-align: center;
  color: var(--color-font);
}

.post-detail .msg[data-v-d39217d8] {
  cursor: pointer;
  position: fixed;
  border-radius: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  bottom: 10rem;
  z-index: 99;
  padding: 0.8rem 0;
  gap: 1rem;
  width: 4.2rem;
  transform: translate(6rem);
  font-size: 2rem;
  background: var(--color-sp-btn-bg);
  color: var(--color-font-3);
  bottom: 5rem;
}

.post-detail .msg svg[data-v-d39217d8] {
  font-size: 2.4rem;
}

.post-detail .close-btn[data-v-d39217d8] {
  color: var(--color-font-3);
  cursor: pointer;
  position: fixed;
  top: 3rem;
  transform: translate(4rem);
  font-size: 2.4rem;
}

.post-detail .top-reply[data-v-d39217d8] {
  color: var(--color-font-3);
  cursor: pointer;
  font-size: 2rem;
  display: flex;
}

.post-detail .open-new-tab[data-v-d39217d8] {
  color: var(--color-font-3);
  cursor: pointer;
  position: fixed;
  top: 3rem;
  transform: translate(4rem);
  font-size: 2.4rem;
  top: 8rem;
}

.specific-area[data-v-d39217d8] {
  --color-line: #6a6868;
  --color-floor: rgba(71, 71, 71, 0.48);
  --color-top-reply-wrap-bg: rgba(71, 71, 71, 0.48);
  --color-sp-btn-bg: rgba(71, 71, 71, 0.48);
  --color-editor-toolbar: #303e64;
  --color-font-pure: white;
  --color-main-bg: #545454;
  --box-background-color: rgba(0, 0, 0, 0.5);
  --box-background-hover-color: rgba(0, 0, 0, 0.5);
}

.specific-area .my-box[data-v-d39217d8] {
  color: #fff;
  border-bottom: 2px solid rgba(0, 0, 0, 0.4);
  -webkit-backdrop-filter: blur(15px);
  backdrop-filter: blur(15px);
}

.base64_tooltip[data-v-06429e70] {
  box-shadow: var(--shadow-lg);
  background: var(--color-third-bg);
  min-height: 2.2rem;
  max-width: 20rem;
  padding: 1rem;
  position: fixed;
  z-index: 9998;
  display: flex;
  align-items: center;
  border-radius: var(--radius-md);
  cursor: pointer;
  line-break: anywhere;
  font-size: 1.4rem;
  color: var(--color-font-8);
}

.base64_tooltip svg[data-v-06429e70] {
  margin-left: 1rem;
  font-size: 3rem;
  color: var(--color-gray);
}

.base64_tooltip[data-v-06429e70] .base-button {
  margin-left: 1rem;
  margin-top: 1rem;
}

.msg[data-v-8bf692ea] {
  cursor: default;
  margin-bottom: 2rem;
  display: flex;
  font-size: 1.4rem;
  box-sizing: border-box;
  border-radius: var(--box-border-radius);
  color: var(--color-font-8);
  background: var(--color-tooltip-bg);
  box-shadow: var(--shadow-lg);
}

.msg.success .left[data-v-8bf692ea] {
  background: var(--color-active);
}

.msg.warning .left[data-v-8bf692ea] {
  background: #ca8a04;
}

.msg.error .left[data-v-8bf692ea] {
  background: var(--color-danger);
}

.msg .left[data-v-8bf692ea] {
  border-radius: var(--box-border-radius) 0 0 var(--box-border-radius);
  display: flex;
  align-items: center;
  background: var(--color-active);
  color: #fff;
  width: 3.6rem;
  font-size: 2.4rem;
  justify-content: center;
}

.msg .left svg[data-v-8bf692ea] {
  cursor: pointer;
}

.msg .right[data-v-8bf692ea] {
  flex: 1;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tag-modal[data-v-0f1f99f7] {
  z-index: 1003;
}

.tag-modal .wrapper[data-v-0f1f99f7] {
  z-index: 9;
  background: var(--color-main-bg);
  color: var(--color-font-8);
  border-radius: 1rem;
  font-size: 1.4rem;
  padding: 2rem 4rem;
  width: 25rem;
}

.tag-modal .wrapper .title[data-v-0f1f99f7] {
  font-weight: 700;
}

.tag-modal .wrapper .tag-list[data-v-0f1f99f7] {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  max-height: 13rem;
  margin: 1.2rem 0 1rem;
  overflow-y: auto;
}

.tag-modal .wrapper .tag-item[data-v-0f1f99f7] {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.3rem 0.8rem;
  font-size: 1.3rem;
  color: var(--v2p-color-foreground);
  background-color: var(--v2p-color-bg-tabs);
  border-radius: 0.4rem;
}

.tag-modal .wrapper .tag-item .remove[data-v-0f1f99f7] {
  color: var(--v2p-color-font-tertiary);
  cursor: pointer;
}

.tag-modal .wrapper .tag-item .remove[data-v-0f1f99f7]:hover {
  color: var(--v2p-color-heart);
}

.tag-modal .wrapper .tag-empty[data-v-0f1f99f7] {
  font-size: 1.3rem;
  color: var(--v2p-color-font-tertiary);
}

.tag-modal .wrapper .btns[data-v-0f1f99f7] {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1.5rem;
  font-size: 1.4rem;
}

.msgs[data-v-b73f4332] {
  position: fixed;
  margin-left: calc(50% - 25rem);
  width: 50rem;
  z-index: 9999;
  bottom: 0;
  left: 0;
  right: 0;
}

.NotificationModal .modal-root[data-v-77aa374e] {
  z-index: 9;
  background: var(--color-second-bg);
  color: var(--color-font-8);
  border-radius: 1rem;
  font-size: 1.4rem;
  width: 50vw;
  height: 80vh;
  display: flex;
  flex-direction: column;
  padding: 1.4rem;
  gap: 1rem;
}

.NotificationModal .modal-root .modal-header[data-v-77aa374e] {
  display: flex;
  justify-content: space-between;
}

.NotificationModal .modal-root .modal-header .title[data-v-77aa374e] {
  font-size: 2.6rem;
  font-weight: 700;
  text-align: left;
  margin-bottom: 0;
}

.NotificationModal .modal-root .modal-header i[data-v-77aa374e] {
  cursor: pointer;
  font-size: 2.2rem;
}

.NotificationModal .modal-root .modal-body[data-v-77aa374e] {
  padding-top: 0;
  flex: 1;
  gap: 1rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.NotificationModal .modal-root .modal-body .filter[data-v-77aa374e] {
  display: flex;
  gap: 1rem;
}

.NotificationModal .modal-root .modal-body .filter div[data-v-77aa374e] {
  border-radius: 0.4rem;
  padding: 0.4rem 1rem;
  background: var(--color-third-bg);
  cursor: pointer;
}

.NotificationModal .modal-root .modal-body .filter div.active[data-v-77aa374e] {
  background: var(--color-active);
  color: #fff;
}

.NotificationModal .modal-root .modal-body .list-wrap[data-v-77aa374e] {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.NotificationModal .modal-root .modal-body .list-wrap .loading-wrap[data-v-77aa374e] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--color-loading-1);
}

.NotificationModal .modal-root .modal-body .list-wrap .notify-wrap[data-v-77aa374e] {
  overflow: auto;
  height: 100%;
}

.NotificationModal .modal-root .modal-body .list-wrap #notifications[data-v-77aa374e] .cell {
  display: none;
  padding: 1.2rem 0;
}

.NotificationModal .modal-root .modal-body .list-wrap #notifications[data-v-77aa374e] .cell a.node {
  padding: 0.6rem 1rem;
  border-radius: 0.4rem;
}

.NotificationModal .modal-root .modal-body .list-wrap #notifications[data-v-77aa374e] .cell .payload {
  margin-top: 0.4rem;
  font-size: 1.7rem;
}

.NotificationModal .modal-root .modal-body #notifications.all[data-v-77aa374e] .cell,
.NotificationModal .modal-root .modal-body #notifications.reply[data-v-77aa374e] .reply,
.NotificationModal .modal-root .modal-body #notifications.star[data-v-77aa374e] .star,
.NotificationModal .modal-root .modal-body #notifications.collect[data-v-77aa374e] .collect {
  display: block;
}

.NotificationModal .modal-root .modal-body .footer[data-v-77aa374e] {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 2rem;
}

.NotificationModal .modal-root .modal-body .footer .pages[data-v-77aa374e] {
  flex: 1;
}

.NotificationModal .modal-root .modal-body .footer .total[data-v-77aa374e] {
  font-weight: 700;
}

.NotificationModal .modal-root .modal-body .footer .total span[data-v-77aa374e] {
  color: #d3d3d3;
  font-weight: 400;
  margin-right: 0.4rem;
}

.NotificationModal .modal-root .modal-body[data-v-77aa374e] .super.button {
  padding: 0;
  background: unset;
  height: 26px;
  width: 37px;
}

.NotificationModal .modal-root .modal-body[data-v-77aa374e] .super.button a {
  display: block;
}

.NotificationModal .modal-root .modal-body[data-v-77aa374e] .super.button a:hover {
  text-decoration: none;
}

.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.username {
  font-weight: 600;
  font-size: 1.4rem;
  margin-right: 1rem;
}

.link-num {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-danger);
}

.owner {
  display: inline-block;
  background-color: transparent;
  color: #059669;
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.5rem;
  cursor: default;
  border: 1px solid currentColor;
  font-size: 1rem;
  font-weight: 600;
  margin-right: 1rem;
}

.mod {
  display: inline-block;
  background-color: #34d399;
  color: #fff;
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.5rem;
  cursor: default;
  border: 1px solid #34d399;
  font-size: 1rem;
  font-weight: 600;
  margin-right: 1rem;
}

.my-tag {
  font-size: 1.4rem;
  color: var(--color-danger);
  margin-left: 1rem;
}

.my-tag:hover .remove {
  display: inline;
}

.my-tag .remove {
  cursor: pointer;
  margin-left: 0.5rem;
  display: none;
}

.add-tag {
  font-size: 2.4rem;
  transform: translateY(0.2rem);
  line-height: 1rem;
  display: inline-block;
  margin-left: 1rem;
  cursor: pointer;
  position: absolute;
  display: none;
}

.floor {
  margin-left: 0.5rem;
  font-size: 1.1rem;
  line-height: 1.5;
  border-radius: var(--radius-sm);
  display: inline-block;
  background-color: #d1fae5;
  color: #059669;
  padding: 0.2rem 0.7rem;
  cursor: default;
}

/* ---------- 旧 token 别名层（deprecated）：--color-* → --v2p-*，消费点待后续渐进迁移 ---------- */
/* 作用域必须为 :root body（--v2p-* 定义在 body 级，var() 按定义处作用域解析） */
:root body {
  --color-main-bg: var(--v2p-color-background);
  --color-second-bg: var(--v2p-color-bg-content);
  --color-third-bg: var(--v2p-color-bg-block);
  --color-item-bg: var(--v2p-color-bg-content);
  --color-swtich-bg: var(--v2p-color-main-300);
  --color-active: var(--v2p-color-accent-500);
  --color-font: var(--v2p-color-font-secondary);
  --color-font-8: var(--v2p-color-foreground);
  --color-font-3: var(--v2p-color-font-tertiary);
  --color-font-pure: var(--v2p-color-main-800);
  --color-input-bg: var(--v2p-color-bg-input);
  --color-input-border: var(--v2p-color-input-border);
  --color-input-border-hover: var(--v2p-color-main-400);
  --color-radio-border: var(--v2p-color-input-border);
  --color-tooltip-bg: var(--v2p-color-bg-tooltip);
  --color-tooltip-shadow: rgba(0, 0, 0, 0.08);
  --color-scrollbar: var(--v2p-color-scrollbar);
  --color-line: var(--v2p-color-border);
  --color-loading-1: var(--v2p-color-mask);
  --color-loading-2: var(--v2p-color-loading-2);
  --color-floor: var(--v2p-color-bg-reply);
  --color-floor-font: var(--v2p-color-font-tertiary);
  --color-editor-toolbar: var(--v2p-color-bg-block);
  --color-sp-btn-bg: var(--v2p-color-button-background);
  --color-call-list-bg: var(--v2p-color-bg-content);
  --color-top-reply-wrap-bg: var(--v2p-color-bg-reply);
  --color-top-reply-wrap-line: var(--v2p-color-border);
  --color-danger: var(--v2p-color-error);
  --color-link-visited: var(--v2p-color-link-visited);
  --shadow-sm: var(--v2p-box-shadow);
  --shadow-md: var(--v2p-widget-shadow, 0 9px 24px -3px rgb(0 0 0 / 6%));
  --shadow-lg: var(--v2p-toast-shadow, 0 6px 16px 0 rgb(0 0 0 / 8%));
  /* 非颜色量保留字面值（H5 体系未定义 radius 阶梯） */
  --radius-sm: 0.5rem;
  --radius-md: 0.8rem;
  --radius-lg: 1.2rem;
}
/* 旧 html.dark 深色字面值区块已删除：别名随 --v2p-* 主题值自动切换 */

html,
body {
  font-size: 62.5%;
}

.flex {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flex-end {
  justify-content: flex-end;
}

.flex-center {
  justify-content: center;
}

.p1 {
  padding: 1rem;
}

.p2 {
  padding: 2rem;
}

.p0 {
  padding: 0 !important;
}

body :is(.topic_content, .reply_content) a[href^="http"] {
  text-underline-offset: 0.7ex;
  text-decoration: underline 1px;
}

a {
  text-decoration: none;
  cursor: pointer;
}

a:hover {
  text-decoration: underline;
}

.tool {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: var(--radius-sm);
  cursor: pointer;
  height: 2.6rem;
  padding: 0 0.6rem;
  gap: 0.2rem;
}

.tool>svg {
  width: 1.6rem !important;
  height: 1.6rem !important;
}

.tool:hover {
  background: var(--color-third-bg);
}

.tool.no-hover {
  cursor: default;
}

.tool.no-hover:hover {
  background: unset !important;
}

.tool.disabled {
  cursor: not-allowed;
}

.tool.disabled:hover {
  background: unset !important;
}

.my-node {
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.6rem;
  font-size: 1rem;
  color: var(--color-font);
  background: var(--color-third-bg);
  cursor: pointer;
}

.my-node:hover {
  text-decoration: none;
  background: #e2e2e2;
}

.msgs {
  position: fixed;
  margin-left: calc(50% - 25rem);
  width: 50rem;
  z-index: 9999;
  bottom: 0;
  left: 0;
  right: 0;
}

.my-box {
  box-shadow: var(--shadow-md);
  border-radius: var(--box-border-radius);
  background: var(--box-background-color);
  margin-bottom: 2rem;
  width: 100%;
  box-sizing: border-box;
  transition: background-color 0.3s;
}

.my-cell {
  color: var(--color-font);
  padding: 0.8rem 1rem;
  font-size: 1.4rem;
  line-height: 1.6;
  text-align: left;
  border-bottom: 1px solid var(--color-line);
}

.modal {
  position: fixed;
  z-index: 1001;
  width: 100vw;
  height: 100vh;
  left: 0;
  top: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal .title {
  font-size: 2.4rem;
  margin-bottom: 1rem;
  text-align: center;
}

.modal .option {
  display: flex;
  align-items: center;
  padding: 0.6rem 0;
}

.modal .option>span {
  position: relative;
}

.modal .mask {
  position: fixed;
  width: 100vw;
  height: 100vh;
  left: 0;
  top: 0;
  background-color: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.radio-group2 {
  display: inline-flex;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-radio-border);
  background: var(--box-background-alt-color);
}

.radio-group2 .radio {
  cursor: pointer;
  background: transparent;
  padding: 0.5rem 1.2rem;
  border-left: 1px solid var(--color-radio-border);
  font-size: 1.3rem;
  color: var(--color-gray);
}

.radio-group2 .radio:first-child {
  border-left: none;
}

.radio-group2 .active {
  background: var(--color-third-bg);
  color: var(--color-font);
}

.pop-confirm {
  position: relative;
  display: inline-flex;
  justify-content: center;
}

input {
  height: 3rem;
  outline: unset;
  border: 1px solid var(--color-input-border);
  padding: 0 0.5rem;
  border-radius: var(--radius-sm);
  box-sizing: border-box;
  transition: all 0.3s;
  background: var(--color-input-bg);
  color: var(--color-font);
}

input:hover {
  border: 1px solid var(--color-input-border-hover);
}

input:focus {
  border: 1px solid var(--color-active);
}

.danger {
  color: var(--color-danger) !important;
}

.pop-confirm-content {
  position: fixed;
  background: var(--color-tooltip-bg);
  box-shadow: var(--shadow-lg);
  color: var(--color-font-8);
  padding: 1.5rem;
  border-radius: var(--radius-md);
  transform: translate(-50%, calc(-100% - 1rem));
  z-index: 1003;
}

.pop-confirm-content .text {
  text-align: start;
  font-size: 1.6rem;
  width: 15rem;
  min-width: 15rem;
}

.pop-confirm-content .options {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
}

img {
  max-width: 100%;
}

.target-user-tags[data-v-a73f564c] {
  background: var(--color-second-bg);
  color: var(--color-font);
  word-break: break-all;
  text-align: start;
  font-size: 1.4rem;
  box-shadow: var(--shadow-md);
  border-bottom-left-radius: 3px;
  border-bottom-right-radius: 3px;
}

.target-user-tags .add-tag[data-v-a73f564c] {
  display: inline-block;
}

.loaded[data-v-a73f564c] {
  font-size: 1.4rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--color-font-pure);
}

.calender[data-v-a73f564c] {
  padding: 10px;
  font-size: 14px;
  color: var(--link-color);
}

.calender .month[data-v-a73f564c] {
  height: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.calender .month .ca-title[data-v-a73f564c] {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.calender .month i[data-v-a73f564c] {
  height: 100%;
  width: 30px;
  cursor: pointer;
  color: var(--color-font);
}

.calender .calender-header[data-v-a73f564c] {
  display: flex;
  height: 30px;
  align-items: center;
}

.calender .calender-header div[data-v-a73f564c] {
  flex: 1;
}

.calender .days[data-v-a73f564c] {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.calender .days .day[data-v-a73f564c] {
  height: 30px;
}

.calender .days .day a[data-v-a73f564c] {
  display: inline-flex;
  height: 100%;
  width: 100%;
  justify-content: center;
  align-items: center;
}

.calender .days .active[data-v-a73f564c] {
  background: #40a9ff;
  border-radius: 4px;
}

.calender .days .active a[data-v-a73f564c] {
  color: #fff !important;
}

/* 间距调整：将 V2EX 原生 20px 模块间距覆盖为 5px */
.sep20,
.sep5 {
  height: 5px !important;
}

/* 楼层直达输入框抽屉展开及无缝桥接 */
.post-detail-floating-dock .scroll-to {
  overflow: visible !important;
}

.post-detail-floating-dock .scroll-to::before {
  content: "" !important;
  position: absolute !important;
  right: 100% !important;
  top: -10px !important;
  bottom: -10px !important;
  width: 2rem !important;
  z-index: 5 !important;
  pointer-events: auto !important;
}

.post-detail-floating-dock .scroll-to:hover,
.post-detail-floating-dock .scroll-to:focus-within {
  transform: translateY(-2px) !important;
  background: var(--v2-primary) !important;
  color: #ffffff !important;
  border-color: var(--v2-primary) !important;
  box-shadow: 0 8px 25px var(--v2-primary-glow) !important;
}

.post-detail-floating-dock .scroll-to input {
  position: absolute !important;
  right: calc(100% + 0.8rem) !important;
  top: 50% !important;
  transform: translateY(-50%) translateX(8px) !important;
  width: 7.2rem !important;
  height: 3.4rem !important;
  padding: 0 0.8rem !important;
  border-radius: 8px !important;
  border: 1.5px solid var(--v2-primary) !important;
  background: var(--color-second-bg) !important;
  color: var(--color-font-pure) !important;
  font-size: 1.3rem !important;
  font-weight: 600 !important;
  text-align: center !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18) !important;
  opacity: 0 !important;
  pointer-events: none !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
  outline: none !important;
  z-index: 10 !important;
  cursor: text !important;
}

.post-detail-floating-dock .scroll-to:hover input,
.post-detail-floating-dock .scroll-to:focus-within input,
.post-detail-floating-dock .scroll-to input:focus {
  opacity: 1 !important;
  pointer-events: auto !important;
  transform: translateY(-50%) translateX(0) !important;
}

.post-detail-floating-dock .scroll-to input:focus {
  border-color: var(--v2-primary) !important;
  box-shadow: 0 0 0 3px var(--v2-primary-glow), 0 6px 20px rgba(0, 0, 0, 0.2) !important;
}

/* ===== 阅读体验优化：正文排版 ===== */
body :is(.topic_content, .reply_content) {
  font-size: 1.5rem;
  line-height: 1.75;
  color: var(--color-font-8);
}

body :is(.topic_content, .reply_content) p {
  margin: 0.8em 0;
}

body :is(.topic_content, .reply_content) img {
  border-radius: var(--radius-sm);
}

body :is(.topic_content, .reply_content) pre,
body :is(.topic_content, .reply_content) code {
  border-radius: var(--radius-sm);
}

body :is(.topic_content, .reply_content) blockquote {
  border-left: 3px solid var(--color-line);
  background: var(--color-floor);
  margin: 0.8em 0;
  padding: 0.6em 1em;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  color: var(--color-font);
}

/* ===== 简洁阅读主题 v2：留白极简 / 核心阅读区优先 / 浅暗双模式 =====
   策略：尾部集中覆盖（层叠胜过上方 4~5 份 scoped 重复定义），不删旧代码，可整体删除本段回滚。
   归拢：sep20/sep5 间距、floating-dock 抽屉桥接一并收敛到新 Token。 */
/* ---------- 简洁阅读主题 v2（尾部覆盖层）：颜色量已归入 --v2p-* 别名 ---------- */
/* 作用域 :root body（--v2p-* 在 body 级定义）；旧 html.dark 深色字面值区块已删除，随主题自动切换 */
:root body {
  /* Paper / ink / neutrals → --v2p-*（blue anchor hue 262 由体系承载） */
  --v2-bg: var(--v2p-color-background);
  --v2-card: var(--v2p-color-bg-content);
  --v2-line: var(--v2p-color-border);
  --v2-floor: var(--v2p-color-bg-block);
  --v2-font: var(--v2p-color-font-secondary);
  --v2-font-strong: var(--v2p-color-foreground);
  --v2-font-pure: var(--v2p-color-main-800);
  /* Accent → --v2p-color-accent-* */
  --v2-primary: var(--v2p-color-accent-500);
  --v2-primary-soft: color-mix(in oklch, var(--v2p-color-accent-500) 10%, transparent);
  --v2-primary-glow: color-mix(in oklch, var(--v2p-color-accent-500) 22%, transparent);
  --v2-danger: var(--v2p-color-error);
  --v2-focus: var(--v2p-color-accent-500);
  /* Type — 系统字体栈（userscript 不引外部 webfont，保留字面值）
     拆成两段，用 var() 拼装成最终栈：
       · 拉丁段：各平台统一，由 system-ui / -apple-system 打头
       · CJK 段：排在最后，只在浏览器逐字符回退（拉丁字体画不出汉字）时才轮到
     CJK 池按简中配置 —— V2EX 每页都写死 <html lang="zh-CN">（实测：全页仅此一个
     lang 属性，楼层正文无 lang），故不写 :lang() 分支，那类分支永远不命中。
     若日后出现多语言页面，在此补 -tc / -ja / -ko 池并改下面两处引用即可。 */
  --v2-font-latin: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial;
  --v2-font-cjk-sc: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC";
  --v2-font-sans: var(--v2-font-latin), var(--v2-font-cjk-sc), sans-serif;
  --v2-font-mono-latin: ui-monospace, "JetBrains Mono", "Cascadia Code", Consolas;
  --v2-font-mono: var(--v2-font-mono-latin), var(--v2-font-cjk-sc), monospace;
  /* Shape / space — 4pt named scale（保留字面值） */
  --v2-radius-sm: 6px;
  --v2-radius-md: 10px;
  --v2-radius-lg: 14px;
  --v2-space-2xs: 4px;
  --v2-space-xs: 8px;
  --v2-space-sm: 12px;
  --v2-space-md: 16px;
  --v2-space-lg: 24px;
  --v2-space-xl: 40px;
  --v2-leading: 1.8;
  --v2-module-gap: 5px;
  /* Motion language（保留字面值） */
  --v2-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --v2-ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --v2-dur-micro: 120ms;
  --v2-dur-short: 220ms;
  --v2-dur-long: 420ms;
  /* Elevation — named z scale（保留字面值） */
  --v2-z-sticky: 200;
  --v2-z-modal: 1000;
  --v2-z-toast: 1100;
  --v2-z-tooltip: 1200;
  --v2-z-pop: 1300;
}

/* 间距归拢：V2EX 原生模块间距统一收敛到 Token（替代上方 sep20/sep5 硬编码） */
.sep20,
.sep5 {
  height: var(--v2-module-gap) !important;
}

/* 卡片去厚重：核心阅读容器去阴影转细边框 */
.my-box,
.my-box[data-v-e7c0fbef],
.my-box[data-v-6f61a860],
.my-box[data-v-d39217d8] {
  box-shadow: none !important;
  border: 1px solid var(--v2-line);
  border-radius: var(--v2-radius-lg) !important;
  background: var(--v2-card) !important;
}

.my-cell,
.my-cell[data-v-e7c0fbef],
.my-cell[data-v-6f61a860],
.my-cell[data-v-d39217d8] {
  padding: 12px 20px !important;
  line-height: 1.7 !important;
  color: var(--v2-font) !important;
  border-bottom-color: var(--v2-line) !important;
}

/* 正文排版：字号行距留白统一 */
body :is(.topic_content, .reply_content) {
  font-size: 15px !important;
  line-height: var(--v2-leading) !important;
  letter-spacing: 0.01em;
  color: var(--v2-font-strong) !important;
  overflow-wrap: break-word;
}

body :is(.topic_content, .reply_content) p {
  margin: 1em 0 !important;
}

body :is(.topic_content, .reply_content) p:first-child {
  margin-top: 0 !important;
}

body :is(.topic_content, .reply_content) p:last-child {
  margin-bottom: 0 !important;
}

body :is(.topic_content, .reply_content) img {
  border-radius: var(--v2-radius-md) !important;
  margin: 12px 0;
  display: block;
}

body :is(.topic_content, .reply_content) pre {
  background: var(--v2-floor) !important;
  border: 1px solid var(--v2-line);
  border-radius: var(--v2-radius-md) !important;
  padding: 14px 16px !important;
  line-height: 1.65 !important;
  overflow: auto;
  margin: 12px 0 !important;
}

body :is(.topic_content, .reply_content) code {
  border-radius: var(--v2-radius-sm) !important;
  font-size: 0.9em;
}

body :is(.topic_content, .reply_content) :not(pre) > code {
  background: var(--v2-floor) !important;
  border: 1px solid var(--v2-line);
  padding: 2px 6px !important;
}

body :is(.topic_content, .reply_content) blockquote {
  border-left: 3px solid var(--v2-primary-glow) !important;
  background: transparent !important;
  margin: 12px 0 !important;
  padding: 4px 0 4px 14px !important;
  border-radius: 0 !important;
  color: var(--v2-font) !important;
}

body :is(.topic_content, .reply_content) a[href^="http"] {
  color: var(--v2-primary) !important;
  text-underline-offset: 3px !important;
  text-decoration-thickness: 1px;
  border-radius: 4px;
}

body :is(.topic_content, .reply_content) a[href^="http"]:hover {
  background: var(--v2-primary-soft);
  text-decoration: underline !important;
}

/* 评论密度：加大留白，去窄列限制 */
.comment[data-v-984ba483],
.comment[data-v-4a063111] {
  gap: 12px !important;
}

.comment.isLevelOne[data-v-984ba483] {
  padding: 16px 20px !important;
  border-bottom-color: var(--v2-line) !important;
}

.comment[data-v-4a063111] {
  padding: 16px 20px !important;
  border-bottom-color: var(--v2-line) !important;
}

.comment .comment-body .reply_content[data-v-4a063111] {
  max-width: 100% !important;
  margin-top: 8px !important;
}

.comment .comment-content .right .w[data-v-984ba483] {
  padding-left: 12px !important;
}

/* 嵌套层级线：常态可见，hover 强调 */
.comment .comment-content .expand-line[data-v-984ba483]::after,
.top-sub-comment .expand-line[data-v-d3f8c94b]::after {
  border-right-color: var(--v2-line) !important;
  transition: border-color 0.2s ease;
}

.comment .comment-content .expand-line[data-v-984ba483]:hover::after {
  border-right: 2px solid var(--v2-primary) !important;
}

/* 高赞/嵌套容器：透明底转细边框卡片 */
.top-reply-wrap[data-v-984ba483] {
  background: transparent !important;
  border: 1px solid var(--v2-line);
  border-radius: var(--v2-radius-md) !important;
  padding: 8px 12px !important;
  margin: 8px 0 0 12px !important;
}

.reply-count[data-v-984ba483] {
  padding: 10px 0 4px !important;
  font-size: 12.5px !important;
  color: var(--v2-font) !important;
  gap: 8px !important;
}

.reply-count .gang[data-v-984ba483] {
  border-bottom-color: currentColor !important;
  opacity: 0.4;
}

/* 作者头 + 徽章：圆形头像 + 胶囊徽章，废弃 #047857 */
.Author .Author-left .avatar img[data-v-64aa1930],
.comment .avatar img[data-v-4a063111] {
  border-radius: 50% !important;
}

.Author .Author-left .avatar img[data-v-64aa1930] {
  width: 32px !important;
  height: 32px !important;
}

.username,
.username[data-v-e7c0fbef],
.username[data-v-6f61a860],
.username[data-v-d39217d8],
.Author .Author-left .username[data-v-64aa1930] {
  font-size: 13.5px !important;
  font-weight: 600 !important;
  color: var(--v2-font-pure) !important;
}

.owner,
.owner[data-v-e7c0fbef],
.owner[data-v-6f61a860],
.owner[data-v-d39217d8],
.Author .Author-left .owner[data-v-64aa1930] {
  border: none !important;
  background: var(--v2-primary-soft) !important;
  color: var(--v2-primary) !important;
  border-radius: 999px !important;
  padding: 1px 8px !important;
  font-size: 11px !important;
  font-weight: 500 !important;
}

.mod,
.mod[data-v-e7c0fbef],
.mod[data-v-6f61a860],
.mod[data-v-d39217d8],
.Author .Author-left .mod[data-v-64aa1930] {
  border: 1px solid var(--v2-primary) !important;
  background: var(--v2-primary) !important;
  color: #fff !important;
  border-radius: 999px !important;
  padding: 1px 8px !important;
  font-size: 11px !important;
  font-weight: 500 !important;
}

.Author .Author-left .dup[data-v-64aa1930] {
  border-radius: 999px !important;
  font-size: 11px !important;
  font-weight: 500 !important;
}

.floor,
.floor[data-v-e7c0fbef],
.floor[data-v-6f61a860],
.floor[data-v-d39217d8] {
  background: transparent !important;
  border: 1px solid var(--v2-line);
  color: var(--v2-font) !important;
  border-radius: 999px !important;
  font-size: 11px !important;
  padding: 1px 8px !important;
}

.link-num,
.link-num[data-v-e7c0fbef],
.link-num[data-v-6f61a860],
.link-num[data-v-d39217d8] {
  font-size: 12px !important;
  font-weight: 500 !important;
}

/* 工具栏：淡化 hover，保留简洁显隐 */
.Author .Author-right .toolbar[data-v-64aa1930] {
  transition: opacity 0.2s ease;
}

.tool[data-v-e7c0fbef]:hover,
.tool[data-v-6f61a860]:hover,
.tool[data-v-d39217d8]:hover,
.tool:hover {
  background: var(--v2-floor) !important;
}

.toolbar[data-v-30dac564] {
  border-top-color: var(--v2-line) !important;
  color: var(--v2-font) !important;
}

/* 楼层直达抽屉：保留桥接，收敛到新 Token（替代上方硬编码色值） */
.post-detail-floating-dock .scroll-to:hover,
.post-detail-floating-dock .scroll-to:focus-within {
  background: var(--v2-primary) !important;
  border-color: var(--v2-primary) !important;
  box-shadow: 0 8px 25px var(--v2-primary-glow) !important;
}

.post-detail-floating-dock .scroll-to input {
  border-color: var(--v2-primary) !important;
  border-radius: 8px !important;
}

/* subtle 高亮：浅暗对比度修复，不依赖外部 --box-* */
.post-detail[data-v-d39217d8] .subtle {
  background-color: rgba(37, 99, 235, 0.07) !important;
  border-left: 4px solid var(--v2-primary-glow) !important;
  border-radius: 0 var(--v2-radius-sm) var(--v2-radius-sm) 0;
}

.post-detail.isNight[data-v-d39217d8] .subtle,
html.dark .post-detail[data-v-d39217d8] .subtle {
  background-color: rgba(96, 165, 250, 0.12) !important;
  border-left-color: var(--v2-primary) !important;
}

/* 暗色核心区兜底：摆脱对外部 --box-background-* 的依赖 */
html.dark .my-box,
html.dark .my-box[data-v-e7c0fbef],
html.dark .my-box[data-v-6f61a860],
html.dark .my-box[data-v-d39217d8] {
  background: var(--v2-card) !important;
  border-color: var(--v2-line) !important;
}

html.dark body :is(.topic_content, .reply_content) pre,
html.dark body :is(.topic_content, .reply_content) :not(pre) > code {
  background: var(--v2-floor) !important;
  border-color: var(--v2-line) !important;
}

@media screen and (max-width: 1280px) {
  .comment.isLevelOne[data-v-984ba483],
  .comment[data-v-4a063111] {
    padding: 14px 16px !important;
  }

  .my-cell,
  .my-cell[data-v-e7c0fbef],
  .my-cell[data-v-6f61a860],
  .my-cell[data-v-d39217d8] {
    padding: 10px 16px !important;
  }
}

/* 访问过的主题标题：!important 用于压住逻辑文件内联样式的纯色标题，伪类特异度更高确保生效 */
.item_title a:visited,
.topic-link:visited,
.item_hot_topic_title a:visited {
  color: var(--color-link-visited) !important;
}

/* ===== Hallmark v1.5.0 系统化重整：字体 / 焦点 / 动效 / 层级 / 触屏可达 =====
   策略延续：尾部集中覆盖，不删上方 scoped 生成代码，删本段即回滚。 */

/* 根裁剪：有意溢出元素不再撑出横向滚动条（clip 保留 sticky/fixed） */
html, body { overflow-x: clip; }

/* 字体统一：UI 与正文走同一 sans 栈；代码走 mono 栈 */
body :is(.topic_content, .reply_content),
.my-cell,
.comment,
.modal-root,
.post-detail {
  font-family: var(--v2-font-sans);
}
body :is(.topic_content, .reply_content) pre,
body :is(.topic_content, .reply_content) code {
  font-family: var(--v2-font-mono);
}

/* 数字对齐：楼层 / 计数 / 链接数用等宽数字 */
.reply-count,
.floor,
.link-num,
.floor[data-v-e7c0fbef],
.floor[data-v-6f61a860],
.floor[data-v-d39217d8] {
  font-variant-numeric: tabular-nums;
}

/* 焦点环：即时出现（无过渡），对比度 ≥ 3:1 */
.tool:focus-visible,
.my-node:focus-visible,
input:focus-visible,
.post-detail-floating-dock .scroll-to input:focus-visible,
a:focus-visible {
  outline: 2px solid var(--v2-focus);
  outline-offset: 2px;
}

/* hover-only 修复：键盘 / 触屏同样可达 */
.Author:hover .add-tag[data-v-64aa1930],
.Author:focus-within .add-tag[data-v-64aa1930] {
  display: inline-block;
}
.my-tag:hover .remove,
.my-tag:focus-within .remove {
  display: inline;
}
.Author .Author-right .toolbar[data-v-64aa1930]:hover,
.Author .Author-right .toolbar[data-v-64aa1930]:focus-within,
.Author:focus-within .Author-right .toolbar[data-v-64aa1930] {
  opacity: 1;
}

/* 动效收敛：transition: all 逐项点名，只动 transform / opacity / 背景色 */
.tool, .my-node, .my-box, .switch, .base-button, input,
.post-detail-floating-dock .scroll-to {
  transition-property: background-color, border-color, color, opacity, transform;
  transition-duration: var(--v2-dur-short);
  transition-timing-function: var(--v2-ease-out);
}

/* 层级命名：收敛 9999 / 999999999 到命名 scale（数值保留三位数以压住宿主页面） */
.msgs,
.msgs[data-v-e7c0fbef],
.msgs[data-v-6f61a860],
.msgs[data-v-b73f4332] {
  z-index: var(--v2-z-toast);
}
.modal,
.post-detail[data-v-d39217d8],
.preview-modal {
  z-index: var(--v2-z-modal);
}
.tip[data-v-ee672411],
.base64_tooltip[data-v-06429e70],
.pop-confirm-content,
.pop-confirm-content[data-v-e7c0fbef],
.pop-confirm-content[data-v-6f61a860],
.pop-confirm-content[data-v-d39217d8] {
  z-index: var(--v2-z-tooltip);
}
.post-editor-wrapper .emoticon-pack[data-v-0e56c62c] {
  z-index: var(--v2-z-pop);
}

/* scoped 输入框焦点：绿系余量收敛到 v2 主色（html 前缀提特异度，层叠胜过 scoped） */
html input[data-v-e7c0fbef]:focus,
html input[data-v-6f61a860]:focus,
html input[data-v-d39217d8]:focus {
  border-color: var(--v2-primary) !important;
  box-shadow: 0 0 0 3px var(--v2-primary-glow) !important;
}

/* 减弱动效：空间运动坍缩为 150ms 透明度过渡 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 150ms !important;
    transition-duration: 150ms !important;
  }
}

/* ---------- 主题切换按钮与菜单（自 v2ex-H5/V2EX-Pro-H5-style 移植） ---------- */
.v2p-color-mode-toggle {
  width: 25px !important;
  height: 25px !important;
  padding: 5px !important;
  border-radius: 50% !important;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  color: var(--v2p-color-font-secondary);
}
.v2p-color-mode-toggle:hover {
  opacity: 1;
  background-color: var(--v2p-color-bg-hover-btn, rgba(0, 0, 0, 0.08));
}
.v2p-color-mode-toggle svg {
  width: 15px;
  height: 15px;
  display: block;
}
.v2p-theme-menu {
  position: absolute;
  display: none;
  flex-direction: column;
  width: 160px;
  padding: 6px;
  z-index: 2000;
  background-color: rgba(var(--v2p-color-bg-content-rgb), 0.75);
  border: 1px solid var(--box-border-color);
  border-radius: 14px;
  box-shadow: var(--v2p-widget-shadow);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
}
.v2p-theme-menu.show {
  display: flex;
  animation: v2p-fade-in 0.15s ease-out;
}
.v2p-theme-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin: 2px 0;
  border-radius: 10px;
  font-size: 14px;
  color: var(--v2p-color-font-secondary);
  cursor: pointer;
  transition: background-color 0.15s;
}
.v2p-theme-menu-item:hover {
  color: var(--v2p-color-foreground);
  background-color: rgba(var(--v2p-color-bg-content-rgb), 0.5);
}
.v2p-theme-menu-item.active {
  color: var(--v2p-color-foreground);
  font-weight: 500;
}
.v2p-theme-menu-item .icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--v2p-color-accent-500);
}
@keyframes v2p-fade-in {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---------- 右侧栏折叠与拖拽排序（自 v2ex-H5 移植） ---------- */
.v2p-sidebar-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  color: var(--v2p-color-font-tertiary);
  vertical-align: text-bottom;
  cursor: pointer;
}
.v2p-sidebar-toggle:hover {
  color: var(--v2p-color-font-secondary);
}
.v2p-sidebar-toggle svg {
  width: 14px;
  height: 14px;
}
.v2p-sidebar-drag-handle {
  display: inline-flex;
  align-items: center;
  margin-right: 4px;
  color: var(--v2p-color-font-tertiary);
  opacity: 0.35;
  vertical-align: text-bottom;
  cursor: grab;
}
.v2p-sidebar-drag-handle:hover {
  opacity: 0.75;
}
.v2p-sidebar-drag-handle svg {
  width: 14px;
  height: 14px;
}
#Rightbar [data-v2p-sortable].v2p-drag-over-top {
  box-shadow: 0 -2px 0 0 var(--v2p-color-accent-500) !important;
}
#Rightbar [data-v2p-sortable].v2p-drag-over-bottom {
  box-shadow: 0 2px 0 0 var(--v2p-color-accent-500) !important;
}
#Rightbar [data-v2p-sortable].v2p-sidebar-dragging {
  opacity: 0.4;
  transition: opacity 0.15s;
}

/* ---------- 顶部导航自定义（自 v2ex-H5 移植） ---------- */
#Tabs a.tab > svg.v2p-nav-icon,
#Tabs a.tab_current > svg.v2p-nav-icon {
  flex: none;
  margin-right: 4px;
  opacity: 0.8;
  pointer-events: none;
}
#Tabs a[href="/planet"] {
  margin-left: 8px;
}
.v2p-nav-settings-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  padding: 4px;
  color: var(--v2p-color-font-tertiary);
  cursor: pointer;
  border-radius: 6px;
  transition: color 0.18s ease, background-color 0.18s ease;
}
.v2p-nav-settings-btn:hover,
.v2p-nav-settings-btn:focus-visible {
  color: var(--v2p-color-foreground);
  background-color: var(--v2p-color-bg-hover-btn);
  outline: none;
}
.v2p-nav-settings-btn svg {
  display: block;
}
#v2p-nav-menu {
  position: fixed;
  z-index: 2001;
  box-sizing: border-box;
  width: 280px;
  max-height: 70vh;
  padding: 8px;
  display: flex;
  flex-direction: column;
  color: var(--v2p-color-foreground);
  background-color: rgba(var(--v2p-color-bg-content-rgb), 0.97);
  border: 1px solid var(--v2p-color-border);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  animation: v2p-fade-in 0.15s ease-out;
}
.v2p-nav-menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 6px 8px;
}
.v2p-nav-menu-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--v2p-color-foreground);
}
.v2p-nav-menu-reset {
  padding: 2px 8px;
  font-size: 12px;
  color: var(--v2p-color-accent-500);
  background: transparent;
  border: 1px solid var(--v2p-color-border);
  border-radius: 6px;
  cursor: pointer;
}
.v2p-nav-menu-reset:hover {
  background-color: var(--v2p-color-bg-hover-btn);
}
.v2p-nav-menu-list {
  max-height: 46vh;
  overflow-y: auto;
}
.v2p-nav-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  margin: 1px 0;
  border-radius: 7px;
  font-size: 13px;
  color: var(--v2p-color-font-secondary);
}
.v2p-nav-menu-item:hover {
  background-color: var(--v2p-color-bg-hover-btn);
}
.v2p-nav-menu-item .v2p-nav-drag-handle {
  display: inline-flex;
  align-items: center;
  color: var(--v2p-color-font-quaternary);
  opacity: 0.6;
  cursor: grab;
}
.v2p-nav-menu-item .v2p-nav-drag-handle:hover {
  opacity: 1;
}
.v2p-nav-menu-item input[type="checkbox"] {
  cursor: pointer;
}
.v2p-nav-menu-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.v2p-nav-move-group {
  display: inline-flex;
  gap: 2px;
}
.v2p-nav-move-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  color: var(--v2p-color-font-tertiary);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.v2p-nav-move-btn:hover:not(:disabled) {
  color: var(--v2p-color-foreground);
  background-color: var(--v2p-color-bg-tabs);
}
.v2p-nav-move-btn:disabled {
  opacity: 0.25;
  cursor: default;
}
.v2p-nav-menu-item.v2p-nav-dragging {
  opacity: 0.45;
}
.v2p-nav-menu-item.v2p-nav-drop-before {
  box-shadow: inset 0 2px 0 var(--v2p-color-accent-500);
}
.v2p-nav-menu-item.v2p-nav-drop-after {
  box-shadow: inset 0 -2px 0 var(--v2p-color-accent-500);
}
.v2p-nav-menu-hint {
  padding: 6px 6px 2px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--v2p-color-font-quaternary);
}

/* ---------- 回复增强：Base64 工具 / YOU 徽章 / 楼层定位（自 v2ex-H5 移植） ---------- */
.post-detail-top-actions .top-action-btn.v2p-b64-btn,
.post-detail-floating-dock .dock-btn.v2p-b64-dock-btn {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0;
}
.post-detail-top-actions .top-action-btn.v2p-b64-btn:hover,
.post-detail-floating-dock .dock-btn.v2p-b64-dock-btn:hover {
  color: var(--v2p-color-accent-500) !important;
  border-color: var(--v2p-color-accent-400) !important;
  background-color: var(--v2p-color-bg-hover-btn) !important;
  transform: translateY(-2px) scale(1.05) !important;
}
.v2p-b64-menu {
  position: fixed;
  z-index: 2100;
  display: none;
  flex-direction: column;
  min-width: 168px;
  padding: 5px;
  color: var(--v2p-color-foreground);
  background-color: rgba(var(--v2p-color-bg-content-rgb), 0.98);
  border: 1px solid var(--v2p-color-border);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
}
.v2p-b64-menu.show {
  display: flex;
  animation: v2p-fade-in 0.15s ease-out;
}
.v2p-b64-menu button {
  display: block;
  width: 100%;
  padding: 7px 10px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.4;
  text-align: left;
  color: var(--v2p-color-font-secondary);
  background: transparent;
  border: none;
  border-radius: 7px;
  cursor: pointer;
}
.v2p-b64-menu button:hover,
.v2p-b64-menu button:focus-visible {
  color: var(--v2p-color-foreground);
  background-color: var(--v2p-color-bg-hover-btn);
  outline: none;
}
.v2p-b64-decoded-text {
  margin-left: 2px;
  color: var(--v2p-color-accent-500);
  text-decoration: none;
  border-bottom: 1px dashed currentColor;
  cursor: pointer;
  word-break: break-all;
}
.v2p-b64-decoded-text:hover {
  color: var(--v2p-color-accent-600);
  border-bottom-style: solid;
}
.v2p-you-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 4px;
  padding: 0 5px;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  letter-spacing: 0.02em;
  vertical-align: middle;
  color: var(--v2p-color-orange-400);
  background-color: var(--v2p-color-orange-50);
  border: 1px solid var(--v2p-color-orange-400);
  border-radius: 4px;
  user-select: none;
}
.comment.v2p-floor-flash {
  animation: v2p-floor-flash 1.8s ease-in-out;
  border-radius: 8px;
}
@keyframes v2p-floor-flash {
  0%,
  100% {
    background-color: transparent;
    box-shadow: none;
  }
  20%,
  60% {
    background-color: var(--v2p-color-accent-100);
    box-shadow: 0 0 0 2px var(--v2p-color-accent-300);
  }
}

/* ---------- 成员悬浮卡（自 v2ex-H5 移植） ---------- */
.v2p-member-card {
  position: fixed;
  z-index: 2000;
  box-sizing: border-box;
  width: 280px;
  padding: 14px;
  font-size: 13px;
  line-height: 1.55;
  text-align: left;
  color: var(--v2p-color-foreground);
  background-color: rgba(var(--v2p-color-bg-content-rgb), 0.94);
  border: 1px solid var(--v2p-color-border);
  border-radius: 12px;
  box-shadow: var(--v2p-widget-shadow);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-4px);
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.v2p-member-card.show {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}
.v2p-member-card-main {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.v2p-member-card-avatar {
  display: block;
  flex: none;
  width: 56px;
  height: 56px;
  overflow: hidden;
  background-color: var(--v2p-color-bg-avatar);
  border-radius: 8px;
}
.v2p-member-card-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.v2p-member-card-info {
  min-width: 0;
  padding-top: 2px;
}
.v2p-member-card-name {
  display: inline-block;
  max-width: 180px;
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  color: var(--v2p-color-foreground) !important;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.v2p-member-card-name:hover {
  color: var(--v2p-color-accent-500) !important;
}
.v2p-member-card-no,
.v2p-member-card-created {
  margin-top: 3px;
  font-size: 12px;
  color: var(--v2p-color-font-secondary);
}
.v2p-member-card-new {
  display: inline-block;
  margin-top: 6px;
  padding: 1px 6px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--v2p-color-orange-400);
  background-color: var(--v2p-color-orange-100);
  border-radius: 4px;
}
.v2p-member-card-bio {
  display: -webkit-box;
  margin-top: 10px;
  padding-top: 10px;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.5;
  color: var(--v2p-color-font-secondary);
  border-top: 1px solid var(--v2p-color-divider);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  white-space: pre-wrap;
  word-break: break-word;
}
.v2p-member-card-status {
  margin-top: 6px;
  font-size: 12px;
  color: var(--v2p-color-font-tertiary);
}
.v2p-member-card-status:empty {
  display: none;
}`;
  GM_addStyle(V2Pro_CSS);
})();

// 主题切换 UI：复用 v2ex-H5 的主题模式与 user_preferred_theme_mode 存储键
(function () {
  "use strict";

  var docEl = document.documentElement;
  var STORAGE_KEY = "user_preferred_theme_mode";
  var TOGGLE_SELECTOR = ".v2p-color-mode-toggle";
  var MENU_ID = "v2p-theme-menu";
  var THEME_MODES = ["light", "dawn", "aqua", "dark", "auto"];
  var THEME_CLASSES = [
    "v2p-theme-light-default",
    "v2p-theme-dark-default",
    "v2p-theme-dawn",
    "v2p-theme-aqua",
  ];
  var THEME_INFO = {
    light: { label: "浅色", color: "#f2f3f5" },
    dawn: { label: "晨光", color: "#faf4ed" },
    aqua: { label: "水色", color: "#f2f7fa" },
    dark: { label: "深色", color: "#1c2128" },
    auto: { label: "跟随系统", color: "#f2f3f5" },
  };
  var SUN_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path></svg>';
  var MOON_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>';

  var currentMode = "auto";
  var menuEl = null;
  var activeToggle = null;

  function isSystemDark() {
    try {
      return !!(
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    } catch (e) {
      return false;
    }
  }

  function getSavedMode() {
    var saved = "";
    try {
      saved = localStorage.getItem(STORAGE_KEY) || "";
    } catch (e) {
      saved = "";
    }
    return THEME_MODES.indexOf(saved) > -1 ? saved : "auto";
  }

  function resolveMode(mode) {
    if (mode === "auto") return isSystemDark() ? "dark" : "light";
    return THEME_MODES.indexOf(mode) > -1 && mode !== "auto" ? mode : "light";
  }

  function getThemeClass(mode) {
    if (mode === "dark") return "v2p-theme-dark-default";
    if (mode === "light") return "v2p-theme-light-default";
    return "v2p-theme-" + mode;
  }

  function applyThemeClasses(element, effectiveMode) {
    if (!element || !element.classList) return;
    var target = getThemeClass(effectiveMode);
    for (var i = 0; i < THEME_CLASSES.length; i++) {
      if (THEME_CLASSES[i] !== target) {
        element.classList.remove(THEME_CLASSES[i]);
      }
    }
    element.classList.add(target);
    if (effectiveMode === "dark") {
      element.classList.add("Night");
    } else {
      element.classList.remove("Night");
    }
  }

  function updateThemeColor(effectiveMode) {
    var info = THEME_INFO[effectiveMode] || THEME_INFO.light;
    var meta = document.getElementById("v2p-theme-color");
    if (!meta) {
      meta = document.createElement("meta");
      meta.id = "v2p-theme-color";
      meta.name = "theme-color";
      (document.head || docEl).appendChild(meta);
    }
    meta.content = info.color;
  }

  function updateCodeHighlight(isDark) {
    var link = document.querySelector(
      'link[href*="tomorrow-night.css"], link[href*="tomorrow.css"]',
    );
    if (!link) return;
    var href = link.getAttribute("href") || "";
    var next = href.replace(
      /tomorrow(?:-night)?\.css/,
      isDark ? "tomorrow-night.css" : "tomorrow.css",
    );
    if (next !== href) link.setAttribute("href", next);
  }

  function updateToggleButtons(effectiveMode) {
    var isDark = effectiveMode === "dark";
    var toggles = document.querySelectorAll(TOGGLE_SELECTOR);
    for (var i = 0; i < toggles.length; i++) {
      var btn = toggles[i];
      btn.innerHTML = isDark ? MOON_ICON : SUN_ICON;
      btn.setAttribute("aria-pressed", isDark ? "true" : "false");
      btn.title = "主题：" + THEME_INFO[currentMode].label + "（点击切换）";
      btn.setAttribute("aria-label", "切换主题，当前" + THEME_INFO[currentMode].label);
    }
  }

  function applyTheme(mode, persist) {
    currentMode = THEME_MODES.indexOf(mode) > -1 ? mode : "auto";
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, currentMode);
      } catch (e) {
        // ignore
      }
    }

    var effectiveMode = resolveMode(currentMode);
    applyThemeClasses(docEl, effectiveMode);
    if (document.body) applyThemeClasses(document.body, effectiveMode);
    var wrapper = document.getElementById("Wrapper");
    if (wrapper) applyThemeClasses(wrapper, effectiveMode);

    // PC 端部分旧样式仍以 .dark 为锚点，跟随有效主题同步
    if (effectiveMode === "dark") {
      docEl.classList.add("dark");
    } else {
      docEl.classList.remove("dark");
    }

    window.isNight = effectiveMode === "dark";
    updateThemeColor(effectiveMode);
    updateCodeHighlight(effectiveMode === "dark");
    updateToggleButtons(effectiveMode);

    try {
      window.dispatchEvent(
        new CustomEvent("v2p-theme-change", {
          detail: {
            mode: currentMode,
            effectiveMode: effectiveMode,
            isDark: effectiveMode === "dark",
          },
        }),
      );
    } catch (e) {
      // ignore
    }
  }

  function ensureToggleButton() {
    if (document.querySelector(TOGGLE_SELECTOR)) return;
    var topTools = document.querySelector("#Top .tools");
    if (!topTools) return;

    var btn = document.createElement("a");
    btn.href = "javascript:;";
    btn.className = "top v2p-color-mode-toggle";
    btn.setAttribute("role", "button");
    btn.setAttribute("aria-haspopup", "menu");
    btn.setAttribute("aria-expanded", "false");
    btn.title = "切换主题";
    btn.innerHTML = resolveMode(currentMode) === "dark" ? MOON_ICON : SUN_ICON;
    topTools.appendChild(btn);
    updateToggleButtons(resolveMode(currentMode));
  }

  function ensureMenu() {
    if (menuEl && document.body && document.body.contains(menuEl)) {
      return menuEl;
    }
    menuEl = document.getElementById(MENU_ID);
    if (!menuEl) {
      menuEl = document.createElement("div");
      menuEl.id = MENU_ID;
      menuEl.className = "v2p-theme-menu";
      menuEl.setAttribute("role", "menu");
      document.body.appendChild(menuEl);
    }
    return menuEl;
  }

  function renderMenu() {
    var menu = ensureMenu();
    menu.innerHTML = "";
    for (var i = 0; i < THEME_MODES.length; i++) {
      (function (mode) {
        var item = document.createElement("div");
        item.className =
          "v2p-theme-menu-item" +
          (mode === currentMode ? " active" : "");
        item.setAttribute("data-key", mode);
        item.setAttribute("role", "menuitemradio");
        item.setAttribute("aria-checked", mode === currentMode ? "true" : "false");
        item.innerHTML =
          '<div class="icon">' +
          (mode === currentMode ? "✓" : "") +
          "</div><span>" +
          THEME_INFO[mode].label +
          "</span>";
        item.addEventListener("click", function (e) {
          e.stopPropagation();
          applyTheme(mode, true);
          closeMenu();
          renderMenu();
        });
        menu.appendChild(item);
      })(THEME_MODES[i]);
    }
  }

  function closeMenu() {
    if (menuEl) menuEl.classList.remove("show");
    if (activeToggle) {
      activeToggle.setAttribute("aria-expanded", "false");
      activeToggle = null;
    }
  }

  function openMenu(btn) {
    closeMenu();
    var menu = ensureMenu();
    renderMenu();
    menu.classList.add("show");
    activeToggle = btn;
    btn.setAttribute("aria-expanded", "true");

    var rect = btn.getBoundingClientRect();
    var scrollX = window.pageXOffset || docEl.scrollLeft || 0;
    var scrollY = window.pageYOffset || docEl.scrollTop || 0;
    var menuWidth = menu.offsetWidth || 160;
    var menuHeight = menu.offsetHeight || 220;
    var left = rect.right - menuWidth + scrollX;
    var top = rect.bottom + 6 + scrollY;

    if (left < scrollX + 10) left = scrollX + 10;
    var maxLeft = scrollX + docEl.clientWidth - menuWidth - 10;
    if (left > maxLeft) left = maxLeft;

    if (rect.bottom + menuHeight + 6 > window.innerHeight) {
      top = rect.top - menuHeight - 6 + scrollY;
      if (top < scrollY + 10) top = scrollY + 10;
    }

    menu.style.left = left + "px";
    menu.style.top = top + "px";
  }

  document.addEventListener(
    "click",
    function (e) {
      var target = e.target;
      var toggle =
        target && target.closest ? target.closest(TOGGLE_SELECTOR) : null;
      if (toggle) {
        e.preventDefault();
        e.stopPropagation();
        if (menuEl && menuEl.classList.contains("show")) {
          closeMenu();
        } else {
          openMenu(toggle);
        }
        return;
      }
      if (menuEl && menuEl.contains(target)) return;
      closeMenu();
    },
    true,
  );

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });
  window.addEventListener("resize", closeMenu);
  window.addEventListener(
    "scroll",
    function () {
      closeMenu();
    },
    true,
  );

  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onMqChange = function () {
      if (getSavedMode() === "auto") applyTheme("auto", false);
    };
    if (mq.addEventListener) {
      mq.addEventListener("change", onMqChange);
    } else if (mq.addListener) {
      mq.addListener(onMqChange);
    }
  }

  window.addEventListener("storage", function (e) {
    if (e.key === STORAGE_KEY) applyTheme(getSavedMode(), false);
  });

  function ensureUI() {
    if (!document.body) return;
    // body / #Wrapper 在 document-start 时可能还不存在，这里补一次完整应用
    applyTheme(getSavedMode(), false);
    ensureToggleButton();
    ensureMenu();
    updateToggleButtons(resolveMode(currentMode));
  }

  currentMode = getSavedMode();
  applyTheme(currentMode, false);

  function scheduleEnsureUI() {
    ensureUI();
    setTimeout(ensureUI, 300);
    setTimeout(ensureUI, 1200);
    setTimeout(ensureUI, 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleEnsureUI, {
      once: true,
    });
  } else {
    scheduleEnsureUI();
  }
  window.addEventListener("pageshow", ensureUI);
})();
