// ==UserScript==
// @name         V2EX Pro - H5
// @namespace    https://github.com/git710/V2EX-Pro
// @version      1.0.0
// @description  V2EX 网页增强脚本（移动端 H5）：四套主题、回复定位与预览、楼层直达、用户标签、高赞回复、楼中楼优化、表情回复、整页 Base64 解析、节点导航自定义、WebDAV 配置同步、自动签到。须与「V2EX Pro - H5 style」样式脚本一同启用。
// @description:zh-CN  V2EX 网页增强脚本（移动端 H5）：四套主题、回复定位与预览、楼层直达、用户标签、高赞回复、楼中楼优化、表情回复、整页 Base64 解析、节点导航自定义、WebDAV 配置同步、自动签到。须与「V2EX Pro - H5 style」样式脚本一同启用。
// @author       git710
// @license      GPL-3.0
// @homepageURL  https://github.com/git710/V2EX-Pro
// @supportURL   https://github.com/git710/V2EX-Pro/issues
// @icon         https://www.v2ex.com/static/img/v2ex-alt@2x.png
// @match        https://v2ex.com/*
// @match        https://*.v2ex.com/*
// @match        https://global.v2ex.co/*
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js#sha256=fc9a93dd241f6b045cbff0481cf4e1901becd0e12fb45166a8f17f95823f0b1a
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @updateURL    https://raw.githubusercontent.com/git710/V2EX-Pro/main/v2ex-H5/V2EX-Pro-H5.user.js
// @downloadURL  https://raw.githubusercontent.com/git710/V2EX-Pro/main/v2ex-H5/V2EX-Pro-H5.user.js
// ==/UserScript==

/*
 * V2EX Pro - H5（移动端主脚本）
 * 仓库：https://github.com/git710/V2EX-Pro
 *
 * 衍生自 coolpace/V2EX_Polish 的移动端样式实现，遵循 GPL-3.0。
 * 完整许可证见仓库根目录 LICENSE。
 *
 * @connect * 说明：WebDAV 配置同步允许用户填写任意自建服务器地址，
 * 无法静态枚举域名，故保留通配；其余出网请求仅限 imgur / 图床。
 *
 * 站点范围：官方站（*.v2ex.com）与镜像站（https://global.v2ex.co）。
 * 站内请求统一走 V2EX_ORIGIN（在镜像站上即当前 origin），不会跨站打到官网。
 *
 * 安装 / 更新：油猴面板中本脚本已声明 @updateURL 与 @downloadURL，
 * 指向仓库 main 分支，开启「自动更新」后由油猴自行检查版本。
 */

(function () {
  if (typeof window.chrome !== "object") {
    window.chrome = {};
  }

  if (typeof window.chrome.extension === "undefined") {
    window.chrome.extension = {};
  }

  const runtimeState = {
    lastError: null,
  };

  function normalizeStorageKeys(keys) {
    if (keys == null) return [];
    if (Array.isArray(keys)) return keys;
    if (typeof keys === "string") return [keys];
    if (typeof keys === "object") return Object.keys(keys);
    return [];
  }

  function readStoredValues(keys) {
    const data = {};
    for (const key of keys) {
      data[key] = GM_getValue(key);
    }
    return data;
  }

  function v2pGMRequest(details) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        timeout: 30000,
        ...details,
        onload: (response) => resolve(response),
        onerror: (error) => reject(error),
        ontimeout: () => reject(new Error("Request timed out")),
      });
    });
  }

  class WebDAV {
    constructor(serverUrl, username, password) {
      this.serverUrl = serverUrl.endsWith("/") ? serverUrl : `${serverUrl}/`;
      this.username = username;
      this.password = password;
      let encodedAuth = "";
      try {
        encodedAuth = btoa(
          unescape(encodeURIComponent(`${username}:${password}`)),
        );
      } catch (e) {
        encodedAuth = btoa(`${username}:${password}`);
      }
      this.authHeader = `Basic ${encodedAuth}`;
    }

    async test() {
      const response = await v2pGMRequest({
        method: "PROPFIND",
        url: this.serverUrl,
        headers: {
          Authorization: this.authHeader,
          Depth: "0",
        },
      });
      return response.status >= 200 && response.status < 300;
    }

    async get(filename) {
      const response = await v2pGMRequest({
        method: "GET",
        url: this.serverUrl + filename,
        headers: {
          Authorization: this.authHeader,
        },
      });

      if (response.status === 404) {
        return null;
      }
      if (response.status < 200 || response.status >= 300) {
        throw new Error("WebDAV GET failed");
      }

      return response.responseText ? JSON.parse(response.responseText) : null;
    }

    async put(filename, data) {
      const response = await v2pGMRequest({
        method: "PUT",
        url: this.serverUrl + filename,
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
        },
        data: JSON.stringify(data),
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error("WebDAV PUT failed");
      }
      return true;
    }
  }

  window.chrome.storage = window.chrome.storage || {};
  window.chrome.storage.local = window.chrome.storage.local || {
    get(keys, callback) {
      callback(readStoredValues(normalizeStorageKeys(keys)));
    },
    set(items, callback) {
      for (const [key, value] of Object.entries(items || {})) {
        GM_setValue(key, value);
      }
      if (typeof callback === "function") {
        callback();
      }
    },
  };

  window.chrome.runtime = window.chrome.runtime || {};
  Object.defineProperty(window.chrome.runtime, "lastError", {
    configurable: true,
    enumerable: true,
    get() {
      return runtimeState.lastError;
    },
  });

  window.chrome.runtime.sendMessage =
    window.chrome.runtime.sendMessage ||
    function sendMessage(message, callback) {
      const done = (payload, error) => {
        runtimeState.lastError = error
          ? { message: error.message || String(error) }
          : null;
        if (typeof callback === "function") {
          callback(payload);
        }
        runtimeState.lastError = null;
      };

      (async () => {
        try {
          if (!message || typeof message !== "object") {
            throw new Error("Invalid runtime message");
          }

          if (message.type === "v2p_sync_test") {
            const client = new WebDAV(
              message.config.url,
              message.config.user,
              message.config.password,
            );
            done({ ok: await client.test() });
            return;
          }

          if (message.type === "v2p_sync_push") {
            const client = new WebDAV(
              message.config.url,
              message.config.user,
              message.config.password,
            );
            await client.put(message.filename, message.data);
            done({ ok: true });
            return;
          }

          if (message.type === "v2p_sync_pull") {
            const client = new WebDAV(
              message.config.url,
              message.config.user,
              message.config.password,
            );
            const data = await client.get(message.filename);
            done({ ok: true, data });
            return;
          }

          done({
            ok: false,
            error: `Unsupported runtime message: ${message.type}`,
          });
        } catch (error) {
          done({ ok: false, error: error.message || String(error) }, error);
        }
      })();
    };
})();

(function () {
  /* WebDAV class removed from content script as it is now in background.js */

  /**
   * Sync Manager
   */
  const V2PSyncManager = {
    STORAGE_KEY: "v2p_webdav_config",
    SYNC_FILENAME: "v2p_sync_v1.json",

    async getConfig() {
      return new Promise((resolve) => {
        chrome.storage.local.get([this.STORAGE_KEY], (res) =>
          resolve(res[this.STORAGE_KEY] || null),
        );
      });
    },

    async saveConfig(config) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [this.STORAGE_KEY]: config }, resolve);
      });
    },

    async getClient() {
      const config = await this.getConfig();
      if (config && config.url && config.user && config.password) {
        return new WebDAV(config.url, config.user, config.password);
      }
      return null;
    },

    /**
     * Collect local data to sync
     */
    getLocalData() {
      const navConfig = null; // Will be handled by chrome.storage logic
      const themeMode = localStorage.getItem("user_preferred_theme_mode");
      const sidebarOrder = localStorage.getItem("v2p_sidebar_order");
      const navCollapsed = localStorage.getItem("v2p_nav_collapsed");

      return {
        themeMode,
        sidebarOrder,
        navCollapsed,
        updatedAt: Date.now(),
      };
    },

    async push() {
      const config = await this.getConfig();
      if (!config) throw new Error("未配置 WebDAV");

      const localData = this.getLocalData();
      const storageData = await new Promise((r) =>
        chrome.storage.local.get(["v2p_nav_config", "options"], (res) =>
          r(res || {}),
        ),
      );
      localData.navConfig = storageData["v2p_nav_config"];
      localData.options = storageData["options"];

      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: "v2p_sync_push",
            config,
            filename: this.SYNC_FILENAME,
            data: localData,
          },
          (res) => {
            if (chrome.runtime.lastError)
              return reject(new Error(chrome.runtime.lastError.message));
            if (res && res.ok) resolve(true);
            else reject(new Error((res && res.error) || "推送失败"));
          },
        );
      });
    },

    async pull() {
      const config = await this.getConfig();
      if (!config) throw new Error("未配置 WebDAV");

      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: "v2p_sync_pull",
            config,
            filename: this.SYNC_FILENAME,
          },
          (res) => {
            if (chrome.runtime.lastError)
              return reject(new Error(chrome.runtime.lastError.message));
            if (res && res.ok) {
              const remoteData = res.data;
              if (remoteData) {
                if (remoteData.themeMode)
                  localStorage.setItem(
                    "user_preferred_theme_mode",
                    remoteData.themeMode,
                  );
                if (remoteData.sidebarOrder)
                  localStorage.setItem(
                    "v2p_sidebar_order",
                    remoteData.sidebarOrder,
                  );
                if (remoteData.navCollapsed)
                  localStorage.setItem(
                    "v2p_nav_collapsed",
                    remoteData.navCollapsed,
                  );
                if (remoteData.navConfig) {
                  chrome.storage.local.set({
                    v2p_nav_config: remoteData.navConfig,
                  });
                }
                if (remoteData.options) {
                  chrome.storage.local.set({
                    options: remoteData.options,
                  });
                }
                resolve(true);
              } else {
                reject(new Error("云端文件为空"));
              }
            } else {
              reject(new Error((res && res.error) || "拉取失败"));
            }
          },
        );
      });
    },

    async testConnection(config) {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "v2p_sync_test", config }, (res) => {
          if (chrome.runtime.lastError)
            return reject(new Error(chrome.runtime.lastError.message));
          if (res && res.ok) resolve(true);
          else reject(new Error((res && res.error) || "连接失败"));
        });
      });
    },
  };

  window.V2PSyncManager = V2PSyncManager;

  // 统一走 src/components/toast.ts 的那一份实现，此处只做签名兼容：
  // v2pShowToast(message, duration?, type?)
  const v2pShowToast = (message, duration = 3000, type = "success") => {
    pushToast({ message, duration, type });
  };
  window.v2pShowToast = v2pShowToast;

  // ===== 自动签到（逻辑与 PC 端 V2EX-Pro-PC 对齐）=====
  // 本地标记复用 PC 端的同一个 key，两端互认：
  // 任一端签到成功，另一端当天打开页面时直接跳过，不再发请求。
  const CLOCK_IN_TIME_KEY = "menu_clockInTime";
  const AUTO_SIGNIN_KEY = "v2p_auto_signin";
  const SIGNING_LOCK_KEY = "v2pro_signing_in";

  // 与 PC 端一致：基于东八区（UTC+8 北京时间）取日期，与 V2EX 每日任务刷新周期对齐
  const getClockInDate = () => {
    const d = new Date(Date.now() + 8 * 3600 * 1000);
    return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  };

  // 设置项存在 localStorage（H5 的 options 体系在用户脚本下不生效，故不依赖它）
  const isAutoSigninEnabled = () =>
    localStorage.getItem(AUTO_SIGNIN_KEY) !== "0";
  const setAutoSigninEnabled = (enabled) => {
    localStorage.setItem(AUTO_SIGNIN_KEY, enabled ? "1" : "0");
  };
  window.v2pGetAutoSignin = isAutoSigninEnabled;
  window.v2pSetAutoSignin = setAutoSigninEnabled;

  // 自动签到开关的「落库 + 生效 + 提示」统一入口，供设置页与设置弹窗复用
  window.v2pApplyAutoSignin = (enabled) => {
    setAutoSigninEnabled(enabled);
    v2pShowToast(
      enabled ? "已开启自动签到" : "已关闭自动签到",
      3000,
      enabled ? "success" : "info",
    );
    return true;
  };
  // 登录态判定：顶栏出现「登出」或用户主页链接即认为已登录，不依赖用户名文本
  const isLoggedIn = () =>
    !!document.querySelector(
      '#Top .tools a[href*="/signout"], #Top .tools a[href^="/member/"]',
    );

  const isHomePage = () => location.pathname === "/";

  const parseDays = (html) => {
    const m = html.match(/已连续登录\s*(\d+?)\s*天/);
    return m ? m[1] : null;
  };

  const parseCoins = (html) => {
    const m = html.match(/每日登录奖励\s*(\d+)\s*铜币/);
    return m ? m[1] : null;
  };

  const isRedeemSuccess = (html) =>
    html.includes("fa-ok-sign") ||
    html.includes("已连续登录") ||
    html.includes("每日登录奖励已领取");

  // 提取确切的兑换 URL：优先取官方按钮的 onclick，再退回整页正则
  const extractRedeemUrl = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const btn = doc.querySelector('input[value^="领取"]');
    if (btn) {
      const onclick = btn.getAttribute("onclick") || "";
      const m = onclick.match(/'(\/mission\/daily\/redeem\?once=\d+)'/);
      if (m && m[1]) return m[1];
    }
    const m =
      html.match(/\/mission\/daily\/redeem\?once=\d+/) ||
      html.match(/location\.href\s*=\s*['"]([^'"]*redeem\?once=\d+)['"]/);
    return m ? m[0] : null;
  };

  async function qianDao() {
    if (!isAutoSigninEnabled()) return;

    const timeNow = getClockInDate();

    // 1. 今天已签到（可能是本端，也可能是 PC 端），直接略过，不发任何请求
    if (localStorage.getItem(CLOCK_IN_TIME_KEY) === timeNow) return;

    // 2. 与 PC 端一致：首页有特别奖励入口就直接点掉
    if (isHomePage()) {
      const gift = document.getElementById("gift_v2excellent");
      if (gift) {
        gift.click();
        localStorage.setItem(CLOCK_IN_TIME_KEY, timeNow);
        setTimeout(() => v2pShowToast("已自动领取特别奖励！"), 500);
        return;
      }
      // 首页没有「领取今日的登录奖励」入口但已登录，说明今日已在别处签到，静默记录即可
      const entry = document.querySelector('.box .inner a[href="/mission/daily"]');
      const userBox = document.querySelector("#Rightbar .box .inner");
      if (!entry && userBox) {
        localStorage.setItem(CLOCK_IN_TIME_KEY, timeNow);
        return;
      }
    }

    // 3. 并发防重锁，避免重复请求
    if (sessionStorage.getItem(SIGNING_LOCK_KEY) === timeNow) return;
    sessionStorage.setItem(SIGNING_LOCK_KEY, timeNow);

    try {
      await doAutoSignIn(timeNow);
    } catch (e) {
      console.warn("[V2EX Pro] 自动签到异常:", e);
    } finally {
      sessionStorage.removeItem(SIGNING_LOCK_KEY);
    }
  }

  async function doAutoSignIn(timeNow) {
    // 第一步：探测 /mission/daily 页面状态，精准判断是否需要签到并获取权威的 once= 参数
    const dailyRes = await fetch(location.origin + "/mission/daily", {
      credentials: "same-origin",
    });
    if (!dailyRes.ok) return;

    const dailyHtml = await dailyRes.text();

    // 正向判断：页面上有领取按钮才需要签到
    const hasRedeemBtn =
      dailyHtml.includes('value="领取') ||
      dailyHtml.includes("mission/daily/redeem");
    if (!hasRedeemBtn) {
      // 今日已领取：静默记录本地时间戳，不弹任何提示
      localStorage.setItem(CLOCK_IN_TIME_KEY, timeNow);
      return;
    }

    const redeemUrl = extractRedeemUrl(dailyHtml);
    if (!redeemUrl) {
      console.warn("[V2EX Pro] 无法获取签到 redeem URL！");
      return;
    }

    // 第二步：发起签到兑换请求
    const redeemRes = await fetch(
      redeemUrl.startsWith("/") ? location.origin + redeemUrl : redeemUrl,
      { credentials: "same-origin" },
    );
    const redeemHtml = await redeemRes.text();

    // 第三步：必须校验兑换结果页，失败时不写本地标记，留待下次访问重试
    if (!isRedeemSuccess(redeemHtml)) {
      console.warn("[V2EX Pro] 自动签到未确认成功，可尝试手动签到。");
      return;
    }

    localStorage.setItem(CLOCK_IN_TIME_KEY, timeNow);
    const days = parseDays(redeemHtml);
    let message = days
      ? `自动签到成功！已连续登录 ${days} 天`
      : "自动签到成功！";

    // 附加信息：本次奖励铜币数（失败不影响签到结果）
    try {
      const balanceHtml = await fetch(location.origin + "/balance", {
        credentials: "same-origin",
      }).then((r) => r.text());
      const coins = parseCoins(balanceHtml);
      if (coins) message += `，本次 ${coins} 铜币`;
    } catch (e) {
      /* 静默：仅影响提示文案 */
    }

    console.info("[V2EX Pro] " + message);
    setTimeout(() => v2pShowToast(message), 500);
  }

  // 顶栏异步渲染，轮询等待登录态出现（最多 3 秒）
  const scheduleCheckin = () => {
    let retries = 0;
    const tryRun = () => {
      if (isLoggedIn()) {
        void qianDao();
        return;
      }
      retries += 1;
      if (retries < 10) setTimeout(tryRun, 300);
    };
    tryRun();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleCheckin);
  } else {
    scheduleCheckin();
  }
  ("use strict");

  // 想要的头像尺寸上限，自己改，比如 48 / 64 / 96 都行
  const MAX_GRAVATAR_SIZE = 64;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function getDesiredAvatarSize(img) {
    const dpr = window.devicePixelRatio || 1;
    const w = img.clientWidth || 0;
    const h = img.clientHeight || 0;
    const base = Math.max(w, h);
    if (base > 0) {
      return clamp(Math.ceil(base * dpr), 32, MAX_GRAVATAR_SIZE);
    }
    return MAX_GRAVATAR_SIZE;
  }

  function upgradeAvatar(img) {
    // 1. 基础检查：必须是图片元素且有 src
    if (!img || !img.src) return;

    // 2. 防重复处理检查
    if (img.dataset.v2pProcessed) return;

    // 3. 快速字符串检查，避免不必要的 URL 对象创建
    // V2EX 头像通常包含 /avatar/ 或 /gravatar/
    const src = img.src;
    if (!src.includes("/avatar/") && !src.includes("/gravatar/")) {
      return;
    }

    // 标记为已处理，避免重复计算
    img.dataset.v2pProcessed = "true";

    let url;
    try {
      url = new URL(src, location.href);
    } catch (e) {
      return;
    }

    const pathname = url.pathname;
    const hostname = url.hostname;

    // 4. 处理逻辑
    // Case A: /avatar/ 路径且带 _normal 的图片 -> 视显示尺寸决定是否升级
    if (pathname.includes("/avatar/") && pathname.includes("_normal")) {
      const desired = getDesiredAvatarSize(img);
      if (desired >= 48) {
        // 使用字符串替换比正则稍快，且对于这种固定格式足够安全
        img.src = src.replace("_normal", "_large");
      }
      return;
    }

    // Case B: V2EX 的 gravatar 头像：通过 s=xx 控制尺寸
    // 官方站与镜像站都可能挂 gravatar 图，故按域名后缀判断（v2ex.com / v2ex.co）
    if (isV2exHost(hostname) && pathname.includes("/gravatar/")) {
      const params = url.searchParams;
      const s = params.get("s");

      if (s) {
        const curSize = parseInt(s, 10);
        const desired = getDesiredAvatarSize(img);
        if (!Number.isNaN(curSize) && curSize < desired) {
          params.set("s", String(desired));
          img.src = url.toString();
        }
      }
    }
  }

  function scanAll() {
    document.querySelectorAll("img.avatar").forEach(scheduleUpgrade);
  }

  const idle =
    window.requestIdleCallback ||
    function (cb) {
      return setTimeout(cb, 16);
    };

  const io =
    "IntersectionObserver" in window
      ? new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              io.unobserve(entry.target);
              idle(() => upgradeAvatar(entry.target));
            }
          });
        })
      : null;

  function scheduleUpgrade(img) {
    if (io) {
      io.observe(img);
    } else {
      idle(() => upgradeAvatar(img));
    }
  }

  // 首次扫描
  scanAll();

  // 监听后续动态加载的头像（比如 PJAX / AJAX）
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes.length === 0) continue;

      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue; // 只处理元素节点

        // 检查节点本身
        if (node.tagName === "IMG" && node.classList.contains("avatar")) {
          scheduleUpgrade(node);
        }

        // 检查子节点 (如果插入的是一个容器)
        if (node.querySelectorAll) {
          // 使用更具体的选择器，减少遍历范围
          const avatars = node.querySelectorAll("img.avatar");
          if (avatars.length > 0) {
            avatars.forEach(scheduleUpgrade);
          }
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();

("use strict");

var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) =>
  function __init() {
    return (fn && (res = (0, fn[__getOwnPropNames(fn)[0]])((fn = 0))), res);
  };

// src/contents/polyfill.ts
var init_polyfill = __esm({
  "src/contents/polyfill.ts"() {
    "use strict";
    {
      if (!window.requestIdleCallback) {
        window.requestIdleCallback = function (callback) {
          const start = Date.now();
          return setTimeout(function () {
            callback({
              didTimeout: false,
              timeRemaining: function () {
                return Math.max(0, 50 - (Date.now() - start));
              },
            });
          }, 1);
        };
      }
      if (!window.cancelIdleCallback) {
        window.cancelIdleCallback = function (id) {
          clearTimeout(id);
        };
      }
    }
  },
});

// src/constants.ts
var EXTENSION_NAME,
  emojiLinks,
  emoticons,
  READABLE_CONTENT_HEIGHT,
  MAX_CONTENT_HEIGHT,
  TOPIC_CONTENT_COLLAPSE_HEIGHT,
  TOPIC_CONTENT_COLLAPSE_THRESHOLD,
  imgurClientIdPool,
  defaultOptions;
var init_constants = __esm({
  "src/constants.ts"() {
    "use strict";
    EXTENSION_NAME = "V2EX_Pro";
    emojiLinks = {
      // B 站表情。
      ["[\u8131\u5355doge]" /* 脱单doge */]: {
        ld: "https://i.imgur.com/L62ZP7V.png",
        hd: "https://i.imgur.com/3mPhudo.png",
      },
      ["[doge]" /* doge */]: {
        ld: "https://i.imgur.com/agAJ0Rd.png",
        hd: "https://i.imgur.com/HZL0hOa.png",
      },
      ["[\u8FA3\u773C\u775B]" /* 辣眼睛 */]: {
        ld: "https://i.imgur.com/n119Wvk.png",
        hd: "https://i.imgur.com/A5WXoZJ.png",
      },
      ["[\u7591\u60D1]" /* 疑惑 */]: {
        ld: "https://i.imgur.com/U3hKhrT.png",
        hd: "https://i.imgur.com/3gCygBS.png",
      },
      ["[\u6342\u8138]" /* 捂脸 */]: {
        ld: "https://i.imgur.com/14cwgsI.png",
        hd: "https://i.imgur.com/fLp3t8s.png",
      },
      ["[\u54E6\u547C]" /* 哦呼 */]: {
        ld: "https://i.imgur.com/km62MY2.png",
        hd: "https://i.imgur.com/CXXgF4E.png",
      },
      ["[\u50B2\u5A07]" /* 傲娇 */]: {
        ld: "https://i.imgur.com/TkdeN49.png",
        hd: "https://i.imgur.com/m7IlCrD.png",
      },
      ["[\u601D\u8003]" /* 思考 */]: {
        ld: "https://i.imgur.com/MAyk5GN.png",
        hd: "https://i.imgur.com/eRJTCx7.png",
      },
      ["[\u5403\u74DC]" /* 吃瓜 */]: {
        ld: "https://i.imgur.com/Ug1iMq4.png",
        hd: "https://i.imgur.com/Gy3nwkC.png",
      },
      ["[\u65E0\u8BED]" /* 无语 */]: {
        ld: "https://i.imgur.com/e1q9ScT.png",
        hd: "https://i.imgur.com/wMfcBqD.png",
      },
      ["[\u5927\u54ED]" /* 大哭 */]: {
        ld: "https://i.imgur.com/YGIx7lh.png",
        hd: "https://i.imgur.com/SNHJxtv.png",
      },
      ["[\u9178\u4E86]" /* 酸了 */]: {
        ld: "https://i.imgur.com/5FDsp6L.png",
        hd: "https://i.imgur.com/wnQBodT.png",
      },
      ["[\u6253call]" /* 打call */]: {
        ld: "https://i.imgur.com/pmNOo2w.png",
        hd: "https://i.imgur.com/4GfTlV0.png",
      },
      ["[\u6B6A\u5634]" /* 歪嘴 */]: {
        ld: "https://i.imgur.com/XzEYBoY.png",
        hd: "https://i.imgur.com/84ycU43.png",
      },
      ["[\u661F\u661F\u773C]" /* 星星眼 */]: {
        ld: "https://i.imgur.com/2spsghH.png",
        hd: "https://i.imgur.com/oEIJRru.png",
      },
      ["[OK]" /* OK */]: {
        ld: "https://i.imgur.com/6DMydmQ.png",
        hd: "https://i.imgur.com/PE2dyjY.png",
      },
      ["[\u8DEA\u4E86]" /* 跪了 */]: {
        ld: "https://i.imgur.com/TYtySHv.png",
        hd: "https://i.imgur.com/0pjsMf0.png",
      },
      ["[\u54CD\u6307]" /* 响指 */]: {
        ld: "https://i.imgur.com/Ac88cMm.png",
        hd: "https://i.imgur.com/nkoevMu.png",
      },
      ["[\u8C03\u76AE]" /* 调皮 */]: {
        ld: "https://i.imgur.com/O6ZZSLk.png",
        hd: "https://i.imgur.com/ggHTLzH.png",
      },
      ["[\u7B11\u54ED]" /* 笑哭 */]: {
        ld: "https://i.imgur.com/NIvxivj.png",
        hd: "https://i.imgur.com/h8edr5G.png",
      },
      ["[\u55D1\u74DC\u5B50]" /* 嗑瓜子 */]: {
        ld: "https://i.imgur.com/rjR4rdr.png",
        hd: "https://i.imgur.com/GMzq0tq.png",
      },
      ["[\u559C\u6781\u800C\u6CE3]" /* 喜极而泣 */]: {
        ld: "https://i.imgur.com/N9E3iZ2.png",
        hd: "https://i.imgur.com/L1N27tb.png",
      },
      ["[\u60CA\u8BB6]" /* 惊讶 */]: {
        ld: "https://i.imgur.com/aptfuiN.png",
        hd: "https://i.imgur.com/cuzxGOI.png",
      },
      ["[\u7ED9\u5FC3\u5FC3]" /* 给心心 */]: {
        ld: "https://i.imgur.com/4aXVwxJ.png",
        hd: "https://i.imgur.com/q663Mor.png",
      },
      ["[\u5446]" /* 呆 */]: {
        ld: "https://i.imgur.com/c1Q76Cd.png",
        hd: "https://i.imgur.com/xMXlmxm.png",
      },
      // 小红薯表情。
      ["[\u54ED\u60F9R]" /* 哭惹 */]: {
        ld: "https://i.imgur.com/HgxsUD2.png",
        hd: "https://i.imgur.com/0aOdQJd.png",
      },
      ["[\u54C7R]" /* 哇 */]: {
        ld: "https://i.imgur.com/OZySWIG.png",
        hd: "https://i.imgur.com/ngoi2I6.png",
      },
      ["[\u6C57\u989CR]" /* 汗颜 */]: {
        ld: "https://i.imgur.com/jrVZoLi.png",
        hd: "https://i.imgur.com/O8alqc1.png",
      },
      ["[\u5BB3\u7F9ER]" /* 害羞 */]: {
        ld: "https://i.imgur.com/OVQjxIr.png",
        hd: "https://i.imgur.com/1PeoVR5.png",
      },
      ["[\u840C\u840C\u54D2R]" /* 萌萌哒 */]: {
        ld: "https://i.imgur.com/Ue1kikn.png",
        hd: "https://i.imgur.com/vOHzwus.png",
      },
      ["[\u5077\u7B11R]" /* 偷笑 */]: {
        ld: "https://i.imgur.com/aF7QiE5.png",
        hd: "https://i.imgur.com/WneGpK9.png",
      },
      ["[\u4E70\u7206R]" /* 买爆 */]: {
        ld: "https://i.imgur.com/2JhZFtb.png",
        hd: "https://i.imgur.com/za9t585.png",
      },
      ["[\u8272\u8272R]" /* 色色 */]: {
        ld: "https://i.imgur.com/ZA1jRv1.png",
        hd: "https://i.imgur.com/mEGRKJy.png",
      },
      ["[\u62A0\u9F3BR]" /* 抠鼻 */]: {
        ld: "https://i.imgur.com/pYtTFnj.png",
        hd: "https://i.imgur.com/ErnQrMJ.png",
      },
      ["[\u9ED1\u85AF\u95EE\u53F7R]" /* 黑薯问号 */]: {
        ld: "https://i.imgur.com/aCjmFLD.png",
        hd: "https://i.imgur.com/i4Wgtyv.png",
      },
      ["[\u6276\u5899R]" /* 扶墙 */]: {
        ld: "https://i.imgur.com/RV7y6tR.png",
        hd: "https://i.imgur.com/PjhjZsJ.png",
      },
      ["[\u9119\u89C6R]" /* 鄙视 */]: {
        ld: "https://i.imgur.com/LaO5dh3.png",
        hd: "https://i.imgur.com/StrGaFx.png",
      },
      ["[\u8E72R]" /* 蹲 */]: {
        ld: "https://i.imgur.com/t876WSv.png",
        hd: "https://i.imgur.com/jdTq0YI.png",
      },
      ["[\u5E86\u795DR]" /* 庆祝 */]: {
        ld: "https://i.imgur.com/wQw2kD0.png",
        hd: "https://i.imgur.com/lx6jrkm.png",
      },
      ["[\u516DR]" /* 六 */]: {
        ld: "https://i.imgur.com/JqoC4L5.png",
        hd: "https://i.imgur.com/cUVWKc2.png",
      },
      ["[\u53EFR]" /* 可 */]: {
        ld: "https://i.imgur.com/I70yy88.png",
        hd: "https://i.imgur.com/nRgXwUT.png",
      },
      ["[\u52A0\u4E00R]" /* 加一 */]: {
        ld: "https://i.imgur.com/hpVvbVh.png",
        hd: "https://i.imgur.com/abBCCK9.png",
      },
    };
    emoticons = [
      {
        title: "\u6D41\u884C",
        list: [
          "[\u8131\u5355doge]" /* 脱单doge */,
          "[doge]" /* doge */,
          "[\u6253call]" /* 打call */,
          "[\u661F\u661F\u773C]" /* 星星眼 */,
          "[\u5403\u74DC]" /* 吃瓜 */,
          "[OK]" /* OK */,
          "[\u54E6\u547C]" /* 哦呼 */,
          "[\u601D\u8003]" /* 思考 */,
          "[\u7591\u60D1]" /* 疑惑 */,
          "[\u8FA3\u773C\u775B]" /* 辣眼睛 */,
          "[\u50B2\u5A07]" /* 傲娇 */,
          "[\u6342\u8138]" /* 捂脸 */,
          "[\u65E0\u8BED]" /* 无语 */,
          "[\u5927\u54ED]" /* 大哭 */,
          "[\u9178\u4E86]" /* 酸了 */,
          "[\u6B6A\u5634]" /* 歪嘴 */,
          "[\u8C03\u76AE]" /* 调皮 */,
          "[\u7B11\u54ED]" /* 笑哭 */,
          "[\u55D1\u74DC\u5B50]" /* 嗑瓜子 */,
          "[\u559C\u6781\u800C\u6CE3]" /* 喜极而泣 */,
          "[\u60CA\u8BB6]" /* 惊讶 */,
          "[\u7ED9\u5FC3\u5FC3]" /* 给心心 */,
          "[\u5446]" /* 呆 */,
          "[\u8DEA\u4E86]" /* 跪了 */,
          "[\u54CD\u6307]" /* 响指 */,
          "[\u54C7R]" /* 哇 */,
          "[\u840C\u840C\u54D2R]" /* 萌萌哒 */,
          "[\u5BB3\u7F9ER]" /* 害羞 */,
          "[\u5077\u7B11R]" /* 偷笑 */,
          "[\u54ED\u60F9R]" /* 哭惹 */,
          "[\u6C57\u989CR]" /* 汗颜 */,
          "[\u8272\u8272R]" /* 色色 */,
          "[\u62A0\u9F3BR]" /* 抠鼻 */,
          "[\u9119\u89C6R]" /* 鄙视 */,
          "[\u4E70\u7206R]" /* 买爆 */,
          "[\u9ED1\u85AF\u95EE\u53F7R]" /* 黑薯问号 */,
          "[\u6276\u5899R]" /* 扶墙 */,
          "[\u8E72R]" /* 蹲 */,
          "[\u53EFR]" /* 可 */,
          "[\u516DR]" /* 六 */,
          "[\u52A0\u4E00R]" /* 加一 */,
          "[\u5E86\u795DR]" /* 庆祝 */,
        ],
      },
      {
        title: "\u5C0F\u9EC4\u8138",
        list: [
          "\u{1F600}",
          "\u{1F601}",
          "\u{1F602}",
          "\u{1F923}",
          "\u{1F605}",
          "\u{1F60A}",
          "\u{1F60B}",
          "\u{1F618}",
          "\u{1F970}",
          "\u{1F617}",
          "\u{1F929}",
          "\u{1F914}",
          "\u{1F928}",
          "\u{1F610}",
          "\u{1F611}",
          "\u{1F644}",
          "\u{1F60F}",
          "\u{1F62A}",
          "\u{1F62B}",
          "\u{1F971}",
          "\u{1F61C}",
          "\u{1F612}",
          "\u{1F614}",
          "\u{1F628}",
          "\u{1F630}",
          "\u{1F631}",
          "\u{1F975}",
          "\u{1F621}",
          "\u{1F973}",
          "\u{1F97A}",
          "\u{1F92D}",
          "\u{1F9D0}",
          "\u{1F60E}",
          "\u{1F913}",
          "\u{1F62D}",
          "\u{1F911}",
          "\u{1F92E}",
        ],
      },
      {
        title: "\u624B\u52BF",
        list: [
          "\u{1F64B}",
          "\u{1F64E}",
          "\u{1F645}",
          "\u{1F647}",
          "\u{1F937}",
          "\u{1F90F}",
          "\u{1F449}",
          "\u270C\uFE0F",
          "\u{1F918}",
          "\u{1F919}",
          "\u{1F44C}",
          "\u{1F90C}",
          "\u{1F44D}",
          "\u{1F44E}",
          "\u{1F44B}",
          "\u{1F91D}",
          "\u{1F64F}",
          "\u{1F44F}",
        ],
      },
      {
        title: "\u5E86\u795D",
        list: ["\u2728", "\u{1F389}", "\u{1F38A}"],
      },
      {
        title: "\u5176\u4ED6",
        list: [
          "\u{1F47B}",
          "\u{1F921}",
          "\u{1F414}",
          "\u{1F440}",
          "\u{1F4A9}",
          "\u{1F434}",
          "\u{1F984}",
          "\u{1F427}",
          "\u{1F436}",
          "\u{1F412}",
          "\u{1F648}",
          "\u{1F649}",
          "\u{1F64A}",
          "\u{1F435}",
        ],
      },
    ];
    READABLE_CONTENT_HEIGHT = 250;
    MAX_CONTENT_HEIGHT = 550;
    // 主题正文（OP）折叠：低于阈值不折叠，折叠后保留固定高度
    TOPIC_CONTENT_COLLAPSE_HEIGHT = 320;
    TOPIC_CONTENT_COLLAPSE_THRESHOLD = 480;
    imgurClientIdPool = [
      "3107b9ef8b316f3",
      // 以下 Client ID 来自「V2EX Plus」
      "442b04f26eefc8a",
      "59cfebe717c09e4",
      "60605aad4a62882",
      "6c65ab1d3f5452a",
      "83e123737849aa9",
      "9311f6be1c10160",
      "c4a4a563f698595",
      "81be04b9e4a08ce",
    ];
      // options 通过 GM_getValue/GM_setValue 持久化（key: v2p_options），
      // getStorage() 会与 defaultOptions 做深合并；设置页与设置弹窗共用 saveOption。
      // 自动签到开关不走 options，见 v2p_auto_signin。
      // isBrowserExtension() 恒为 false 是故意的，别动——postTask()
      // 靠它区分扩展环境与用户脚本环境。
    defaultOptions = {
      openInNewTab: false,
      contentAutoCollapse: true,
      reply: {
        layout: "vertical",
      },
      replyContent: {
        autoFold: true,
        hideReplyTime: true,
        hideRefName: true,
        showImgInPage: true,
      },
      nestedReply: {
        display: "indent",
        multipleInsideOne: "nested",
      },
      topReply: {
        enabled: true,
        loveMinCount: 3,
        count: 5,
        maxPages: 20,
      },
      userTag: {
        enabled: true,
      },
    };
  },
});

// src/icons.ts
var iconLogo, iconGitHub;
var init_icons = __esm({
  "src/icons.ts"() {
    "use strict";
    iconLogo = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 88 88"><g style="mix-blend-mode:passthrough"><path d="M87.92 86.098v-.052a.592.592 0 0 0 0-.07L44.978.72l-.059-.105c-.16-.3-.415-.511-.705-.586a.961.961 0 0 0-.841.19 1.315 1.315 0 0 0-.336.378l-.058.115a2571.004 2571.004 0 0 1-8.695 17.172c-.59 1.024-.59 2.382 0 3.406 3.856 7.57 7.7 15.142 11.532 22.718.641 1.108.641 2.58 0 3.688C39.5 60.23 32.826 73.406 26.45 85.993c-.291.661-.086 1.482.46 1.84.16.104.341.158.525.158h18.52c.415.003.797-.272.992-.713l.635-1.285 8.585-17.023c.142-.317.383-.552.67-.653a.949.949 0 0 1 .855.116c.156.1.289.245.386.423l8.506 16.723.787 1.558c.199.433.575.702.985.704h.518c.087.009.175.009.263 0h17.74c.617 0 1.119-.601 1.123-1.347a1.615 1.615 0 0 0-.08-.396Z" fill="currentColor" style="mix-blend-mode:passthrough"/><path d="m38.551 48.541.62-1.232a3.095 3.095 0 0 0 0-3.02l-3.807-7.446-4.377-8.511c-.155-.308-.406-.527-.697-.61a.957.957 0 0 0-.85.17 1.252 1.252 0 0 0-.4.502L.132 86.002c-.29.658-.085 1.477.46 1.83.161.113.345.17.532.168h16.981c.41 0 .788-.27.985-.705l.65-1.302c.029-.048.055-.098.08-.15l.729-1.408c6.047-12.103 11.839-23.66 17.9-35.7.038-.062.072-.127.102-.194Z" fill="currentColor" style="mix-blend-mode:passthrough"/></g></svg>
`;
    iconGitHub = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path fill="currentColor" clip-rule="evenodd" d="M12 2C6.477 2 2 6.463 2 11.97c0 4.404 2.865 8.14 6.839 9.458.5.092.682-.216.682-.48 0-.236-.008-.864-.013-1.695-2.782.602-3.369-1.337-3.369-1.337-.454-1.151-1.11-1.458-1.11-1.458-.908-.618.069-.606.069-.606 1.003.07 1.531 1.027 1.531 1.027.892 1.524 2.341 1.084 2.91.828.092-.643.35-1.083.636-1.332-2.22-.251-4.555-1.107-4.555-4.927 0-1.088.39-1.979 1.029-2.675-.103-.252-.446-1.266.098-2.638 0 0 .84-.268 2.75 1.022A9.607 9.607 0 0 1 12 6.82c.85.004 1.705.114 2.504.336 1.909-1.29 2.747-1.022 2.747-1.022.546 1.372.202 2.386.1 2.638.64.696 1.028 1.587 1.028 2.675 0 3.83-2.339 4.673-4.566 4.92.359.307.678.915.678 1.846 0 1.332-.012 2.407-.012 2.734 0 .267.18.577.688.48 3.97-1.32 6.833-5.054 6.833-9.458C22 6.463 17.522 2 12 2Z"></path>
</svg>
`;
  },
});

// src/utils.ts
function getOS() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const macosPlatforms = /(macintosh|macintel|macppc|mac68k|macos)/i;
  const windowsPlatforms = /(win32|win64|windows|wince)/i;
  const iosPlatforms = /(iphone|ipad|ipod)/i;
  let os = null;
  if (macosPlatforms.test(userAgent)) {
    os = "macos";
  } else if (iosPlatforms.test(userAgent)) {
    os = "ios";
  } else if (windowsPlatforms.test(userAgent)) {
    os = "windows";
  } else if (userAgent.includes("android")) {
    os = "android";
  } else if (userAgent.includes("linux")) {
    os = "linux";
  }
  return os;
}
function formatTimestamp(timestamp, { format = "YMD" } = {}) {
  const date = new Date(
    timestamp.toString().length === 10 ? timestamp * 1e3 : timestamp,
  );
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const YMD = `${year}-${month}-${day}`;
  if (format === "YMDHM") {
    const hour = date.getHours().toString().padStart(2, "0");
    const minute = date.getMinutes().toString().padStart(2, "0");
    return `${YMD} ${hour}:${minute}`;
  }
  if (format === "YMDHMS") {
    const hour = date.getHours().toString().padStart(2, "0");
    const minute = date.getMinutes().toString().padStart(2, "0");
    const second = date.getSeconds().toString().padStart(2, "0");
    return `${YMD} ${hour}:${minute}:${second}`;
  }
  return YMD;
}
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function deepMerge(target, source) {
  const result = {};
  for (const key in target) {
    const targetProp = target[key];
    const sourceProp = source[key];
    if (isObject(targetProp) && isObject(sourceProp)) {
      result[key] = deepMerge(targetProp, sourceProp);
    } else if (Reflect.has(source, key)) {
      result[key] = sourceProp;
    } else {
      result[key] = targetProp;
    }
  }
  for (const key in source) {
    if (!Reflect.has(target, key)) {
      result[key] = source[key];
    }
  }
  return result;
}
function isBrowserExtension() {
  return false;
}
function escapeHTML(htmlString) {
  return htmlString.replace(/[<>&"'']/g, (match) => {
    switch (match) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return match;
    }
  });
}
const OPTIONS_STORAGE_KEY = "v2p_options";
function readPersistedOptions() {
  let raw = null;
  try {
    if (typeof GM_getValue === "function") {
      raw = GM_getValue(OPTIONS_STORAGE_KEY);
    }
  } catch {
    raw = null;
  }
  if (raw == null) {
    try {
      raw = localStorage.getItem(OPTIONS_STORAGE_KEY);
    } catch {
      raw = null;
    }
  }
  if (!raw) return {};
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return isObject(parsed) ? parsed : {};
}
function writePersistedOptions(options) {
  const raw = JSON.stringify(options);
  try {
    if (typeof GM_setValue === "function") {
      GM_setValue(OPTIONS_STORAGE_KEY, raw);
      return;
    }
  } catch {
    // GM 存储不可用时退回 localStorage
  }
  try {
    localStorage.setItem(OPTIONS_STORAGE_KEY, raw);
  } catch {
    // 隐私模式下 localStorage 可能不可用，忽略即可
  }
}
function getStorage(useCache = true) {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && useCache && window.__V2P_StorageCache) {
      resolve(window.__V2P_StorageCache);
      return;
    }
    if (!defaultOptions && typeof init_constants === "function") {
      init_constants();
    }
    const data = {
      ["options" /* Options */]: deepMerge(
        defaultOptions,
        readPersistedOptions(),
      ),
    };
    if (typeof window !== "undefined") {
      window.__V2P_StorageCache = data;
    }
    resolve(data);
  });
}
function getStorageSync() {
  const storage = window.__V2P_StorageCache;
  if (!storage) {
    throw new Error(
      `${EXTENSION_NAME}: \u65E0\u53EF\u7528\u7684 Storage \u7F13\u5B58\u6570\u636E`,
    );
  }
  return storage;
}
function getOptionValue(options, path) {
  return path
    .split(".")
    .reduce(
      (target, key) => (target == null ? void 0 : target[key]),
      options,
    );
}
function setOptionValue(options, path, value) {
  const keys = path.split(".");
  let target = options;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!isObject(target[key])) target[key] = {};
    target = target[key];
  }
  target[keys[keys.length - 1]] = value;
  return options;
}
async function saveOption(path, value) {
  const storage = await getStorage();
  setOptionValue(storage.options, path, value);
  await setStorage("options" /* Options */, storage.options);
  return storage.options;
}
async function setStorage(storageKey, storageItem) {
  switch (storageKey) {
    case "options" /* Options */:
      try {
        writePersistedOptions(storageItem);
        window.__V2P_StorageCache = {
          ...(window.__V2P_StorageCache || {}),
          ["options" /* Options */]: storageItem,
        };
      } catch (err) {
        console.error(err);
        throw new Error(`❌ 无法设置：${storageKey}`);
      }
      break;
    case "api" /* API */:
    case "daily" /* Daily */:
    case "settings-sync" /* SyncInfo */:
      // 这些键目前没有持久化需求，保留分支仅为兼容旧调用。
      void storageItem;
      break;
    default:
      throw new Error(`未知的 storageKey： ${storageKey}`);
  }
}

/**
 * 判断某个主机名是否属于 V2EX 官方域名或镜像站域名。
 * 官方站为 v2ex.com 及其子域，镜像站为 v2ex.co 及其子域（如 global.v2ex.co）。
 */
function isV2exHost(hostname) {
  return /(^|\.)v2ex\.(com|co)$/i.test(String(hostname || ""));
}
var V2EX_ORIGIN;
var init_utils = __esm({
  "src/utils.ts"() {
    "use strict";
    init_constants();
    // 官方域名（*.v2ex.com）与镜像站域名（*.v2ex.co）都算站内，
    // 在镜像站上必须沿用当前 origin，否则 API / 预览请求会跨站打到官网。
    V2EX_ORIGIN =
      typeof window !== "undefined" &&
      isV2exHost(window.location.hostname)
        ? window.location.origin
        : "https://www.v2ex.com" /* Origin */;
  },
});

// src/contents/globals.ts
function updateCommentCells() {
  $commentCells = $commentBox.find('.cell[id^="r_"]');
  $commentTableRows = $commentCells.find("> table > tbody > tr");
}
var $body,
  $wrapper,
  $wrapperContent,
  $main,
  $topicList,
  $infoCard,
  $topicContentBox,
  $topicHeader,
  $commentBox,
  $commentCells,
  $commentTableRows,
  $replyBox,
  $replyForm,
  $replyTextArea,
  replyTextArea,
  loginName,
  topicOwnerName,
  pathTopicId;
var init_globals = __esm({
  "src/contents/globals.ts"() {
    "use strict";
    $body = $(document.body);
    $wrapper = $("#Wrapper");
    $wrapperContent = $wrapper.find("> .content");
    $main = $("#Main");
    $topicList = $(
      "#Main #Tabs ~ .cell.item, #Main #TopicsNode > .cell, #Main .cell.item:has(.item_title > .topic-link)",
    );
    $infoCard = $('#Rightbar > .box:has("#member-activity")');
    // 主题内容区域
    $topicContentBox = $("#Main .box:has(.topic_buttons)");
    if ($topicContentBox.length === 0) {
      // 移动端 / 特殊布局兜底：不依赖 #Main
      $topicContentBox = $(".box:has(.topic_buttons)");
    }
    if ($topicContentBox.length === 0) {
      // 移动版没有 .topic_buttons，用「直接子 cell 里的正文」反查主题 box
      $topicContentBox = $(".box")
        .filter((_, box) => $(box).find("> .cell > .topic_content").length > 0)
        .first();
    }
    $topicHeader = $topicContentBox.find(".header");

    // 评论列表区域
    $commentBox = $('#Main .box:has(.cell[id^="r_"])');
    if ($commentBox.length === 0) {
      // 移动端兜底：不依赖 #Main
      $commentBox = $('.box:has(.cell[id^="r_"])');
    }
    $commentCells = $commentBox.find('.cell[id^="r_"]');
    $commentTableRows = $commentCells.find("> table > tbody > tr");
    $replyBox = $("#reply-box");
    $replyForm = $replyBox.find('form[action^="/t"]');
    $replyTextArea = $("#reply_content");
    replyTextArea = document.querySelector("#reply_content");
    // 桌面模板的用户入口在 #Top，移动模板则收进 #site-header-menu
    loginName =
      $('#Top .tools > a[href^="/member"]').first().text().trim() ||
      $('#site-header-menu a[href^="/member/"]').first().text().trim();
    topicOwnerName = $topicHeader.find('> small > a[href^="/member"]').text();
    pathTopicId = window.location.pathname.match(/\/t\/(\d+)/)?.at(1);
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/createElement.js
var createElement, createElement$1;
var init_createElement = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/createElement.js"() {
    "use strict";
    createElement = (tag, attrs, children = []) => {
      const element = document.createElementNS(
        "http://www.w3.org/2000/svg",
        tag,
      );
      Object.keys(attrs).forEach((name) => {
        element.setAttribute(name, String(attrs[name]));
      });
      if (children.length) {
        children.forEach((child) => {
          const childElement = createElement(...child);
          element.appendChild(childElement);
        });
      }
      return element;
    };
    createElement$1 = ([tag, attrs, children]) =>
      createElement(tag, attrs, children);
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/replaceElement.js
var getAttrs, getClassNames, combineClassNames, toPascalCase, replaceElement;
var init_replaceElement = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/replaceElement.js"() {
    "use strict";
    init_createElement();
    getAttrs = (element) =>
      Array.from(element.attributes).reduce((attrs, attr) => {
        attrs[attr.name] = attr.value;
        return attrs;
      }, {});
    getClassNames = (attrs) => {
      if (typeof attrs === "string") return attrs;
      if (!attrs || !attrs.class) return "";
      if (attrs.class && typeof attrs.class === "string") {
        return attrs.class.split(" ");
      }
      if (attrs.class && Array.isArray(attrs.class)) {
        return attrs.class;
      }
      return "";
    };
    combineClassNames = (arrayOfClassnames) => {
      const classNameArray = arrayOfClassnames.flatMap(getClassNames);
      return classNameArray
        .map((classItem) => classItem.trim())
        .filter(Boolean)
        .filter((value, index, self) => self.indexOf(value) === index)
        .join(" ");
    };
    toPascalCase = (string) =>
      string.replace(
        /(\w)(\w*)(_|-|\s*)/g,
        (g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase(),
      );
    replaceElement = (element, { nameAttr, icons, attrs }) => {
      const iconName = element.getAttribute(nameAttr);
      if (iconName == null) return;
      const ComponentName = toPascalCase(iconName);
      const iconNode = icons[ComponentName];
      if (!iconNode) {
        return;
      }
      const elementAttrs = getAttrs(element);
      const [tag, iconAttributes, children] = iconNode;
      const iconAttrs = {
        ...iconAttributes,
        "data-lucide": iconName,
        ...attrs,
        ...elementAttrs,
      };
      const classNames = combineClassNames([
        "lucide",
        `lucide-${iconName}`,
        elementAttrs,
        attrs,
      ]);
      if (classNames) {
        Object.assign(iconAttrs, {
          class: classNames,
        });
      }
      const svgElement = createElement$1([tag, iconAttrs, children]);
      return element.parentNode?.replaceChild(svgElement, element);
    };
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/defaultAttributes.js
var defaultAttributes;
var init_defaultAttributes = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/defaultAttributes.js"() {
    "use strict";
    defaultAttributes = {
      xmlns: "http://www.w3.org/2000/svg",
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    };
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/book-open-check.js
var BookOpenCheck;
var init_book_open_check = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/book-open-check.js"() {
    "use strict";
    init_defaultAttributes();
    BookOpenCheck = [
      "svg",
      defaultAttributes,
      [
        ["path", { d: "M12 21V7" }],
        ["path", { d: "m16 12 2 2 4-4" }],
        [
          "path",
          {
            d: "M22 6V4a1 1 0 0 0-1-1h-5a4 4 0 0 0-4 4 4 4 0 0 0-4-4H3a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h6a3 3 0 0 1 3 3 3 3 0 0 1 3-3h6a1 1 0 0 0 1-1v-1.3",
          },
        ],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/chevron-down.js
var ChevronDown;
var init_chevron_down = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/chevron-down.js"() {
    "use strict";
    init_defaultAttributes();
    ChevronDown = ["svg", defaultAttributes, [["path", { d: "m6 9 6 6 6-6" }]]];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/chevrons-up.js
var ChevronsUp;
var init_chevrons_up = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/chevrons-up.js"() {
    "use strict";
    init_defaultAttributes();
    ChevronsUp = [
      "svg",
      defaultAttributes,
      [
        ["path", { d: "m17 11-5-5-5 5" }],
        ["path", { d: "m17 18-5-5-5 5" }],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/eye-off.js
var EyeOff;
var init_eye_off = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/eye-off.js"() {
    "use strict";
    init_defaultAttributes();
    EyeOff = [
      "svg",
      defaultAttributes,
      [
        [
          "path",
          {
            d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
          },
        ],
        ["path", { d: "M14.084 14.158a3 3 0 0 1-4.242-4.242" }],
        [
          "path",
          {
            d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
          },
        ],
        ["path", { d: "m2 2 20 20" }],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/heart.js
var Heart;
var init_heart = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/heart.js"() {
    "use strict";
    init_defaultAttributes();
    Heart = [
      "svg",
      defaultAttributes,
      [
        [
          "path",
          {
            d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
          },
        ],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/house.js
var House;
var init_house = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/house.js"() {
    "use strict";
    init_defaultAttributes();
    House = [
      "svg",
      defaultAttributes,
      [
        ["path", { d: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" }],
        [
          "path",
          {
            d: "M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
          },
        ],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/message-square-plus.js
var MessageSquarePlus;
var init_message_square_plus = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/message-square-plus.js"() {
    "use strict";
    init_defaultAttributes();
    MessageSquarePlus = [
      "svg",
      defaultAttributes,
      [
        [
          "path",
          {
            d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
          },
        ],
        ["path", { d: "M12 7v6" }],
        ["path", { d: "M9 10h6" }],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/message-square.js
var MessageSquare;
var init_message_square = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/message-square.js"() {
    "use strict";
    init_defaultAttributes();
    MessageSquare = [
      "svg",
      defaultAttributes,
      [
        [
          "path",
          {
            d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
          },
        ],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/moon.js
var Moon;
var init_moon = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/moon.js"() {
    "use strict";
    init_defaultAttributes();
    Moon = [
      "svg",
      defaultAttributes,
      [["path", { d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" }]],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/package-plus.js
var PackagePlus;
var init_package_plus = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/package-plus.js"() {
    "use strict";
    init_defaultAttributes();
    PackagePlus = [
      "svg",
      defaultAttributes,
      [
        ["path", { d: "M16 16h6" }],
        ["path", { d: "M19 13v6" }],
        [
          "path",
          {
            d: "M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14",
          },
        ],
        ["path", { d: "m7.5 4.27 9 5.15" }],
        ["polyline", { points: "3.29 7 12 12 20.71 7" }],
        ["line", { x1: "12", x2: "12", y1: "22", y2: "12" }],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/panel-right.js
var PanelRight;
var init_panel_right = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/panel-right.js"() {
    "use strict";
    init_defaultAttributes();
    PanelRight = [
      "svg",
      defaultAttributes,
      [
        ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
        ["path", { d: "M15 3v18" }],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/panel-top.js
var PanelTop;
var init_panel_top = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/panel-top.js"() {
    "use strict";
    init_defaultAttributes();
    PanelTop = [
      "svg",
      defaultAttributes,
      [
        ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
        ["path", { d: "M3 9h18" }],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/smile.js
var Smile;
var init_smile = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/smile.js"() {
    "use strict";
    init_defaultAttributes();
    Smile = [
      "svg",
      defaultAttributes,
      [
        ["circle", { cx: "12", cy: "12", r: "10" }],
        ["path", { d: "M8 14s1.5 2 4 2 4-2 4-2" }],
        ["line", { x1: "9", x2: "9.01", y1: "9", y2: "9" }],
        ["line", { x1: "15", x2: "15.01", y1: "9", y2: "9" }],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/square-arrow-up-right.js
var SquareArrowUpRight;
var init_square_arrow_up_right = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/square-arrow-up-right.js"() {
    "use strict";
    init_defaultAttributes();
    SquareArrowUpRight = [
      "svg",
      defaultAttributes,
      [
        ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
        ["path", { d: "M8 8h8v8" }],
        ["path", { d: "m8 16 8-8" }],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/star.js
var Star;
var init_star = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/star.js"() {
    "use strict";
    init_defaultAttributes();
    Star = [
      "svg",
      defaultAttributes,
      [
        [
          "polygon",
          {
            points:
              "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2",
          },
        ],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/tag.js
var Tag;
var init_tag = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/tag.js"() {
    "use strict";
    init_defaultAttributes();
    Tag = [
      "svg",
      defaultAttributes,
      [
        [
          "path",
          {
            d: "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",
          },
        ],
        ["circle", { cx: "7.5", cy: "7.5", r: ".5", fill: "currentColor" }],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/sun.js
var Sun;
var init_sun = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/sun.js"() {
    "use strict";
    init_defaultAttributes();
    Sun = [
      "svg",
      defaultAttributes,
      [
        ["circle", { cx: "12", cy: "12", r: "4" }],
        ["path", { d: "M12 2v2" }],
        ["path", { d: "M12 20v2" }],
        ["path", { d: "m4.93 4.93 1.41 1.41" }],
        ["path", { d: "m17.66 17.66 1.41 1.41" }],
        ["path", { d: "M2 12h2" }],
        ["path", { d: "M20 12h2" }],
        ["path", { d: "m6.34 17.66-1.41 1.41" }],
        ["path", { d: "m19.07 4.93-1.41 1.41" }],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/twitter.js
var Twitter;
var init_twitter = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/twitter.js"() {
    "use strict";
    init_defaultAttributes();
    Twitter = [
      "svg",
      defaultAttributes,
      [
        [
          "path",
          {
            d: "M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z",
          },
        ],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/image.js
var Image;
var init_image = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/image.js"() {
    "use strict";
    init_defaultAttributes();
    Image = [
      "svg",
      defaultAttributes,
      [
        [
          "rect",
          { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" },
        ],
        ["circle", { cx: "8.5", cy: "8.5", r: "1.5" }],
        ["polyline", { points: "21 15 16 10 5 21" }],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/file-text.js
var FileText;
var init_file_text = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/file-text.js"() {
    "use strict";
    init_defaultAttributes();
    FileText = [
      "svg",
      defaultAttributes,
      [
        [
          "path",
          {
            d: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z",
          },
        ],
        ["polyline", { points: "14 2 14 8 20 8" }],
        ["line", { x1: "16", x2: "8", y1: "13", y2: "13" }],
        ["line", { x1: "16", x2: "8", y1: "17", y2: "17" }],
        ["line", { x1: "10", x2: "8", y1: "9", y2: "9" }],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/globe.js
var Globe;
var init_globe = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/globe.js"() {
    "use strict";
    init_defaultAttributes();
    Globe = [
      "svg",
      defaultAttributes,
      [
        ["circle", { cx: "12", cy: "12", r: "10" }],
        ["line", { x1: "2", x2: "22", y1: "12", y2: "12" }],
        [
          "path",
          {
            d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
          },
        ],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/settings.js
var Settings;
var init_settings = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/settings.js"() {
    "use strict";
    init_defaultAttributes();
    Settings = [
      "svg",
      defaultAttributes,
      [
        [
          "path",
          {
            d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
          },
        ],
        ["circle", { cx: "12", cy: "12", r: "3" }],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/clock.js
var Clock;
var init_clock = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/icons/clock.js"() {
    "use strict";
    init_defaultAttributes();
    Clock = [
      "svg",
      defaultAttributes,
      [
        ["circle", { cx: "12", cy: "12", r: "10" }],
        ["polyline", { points: "12 6 12 12 16 14" }],
      ],
    ];
  },
});

// node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/lucide.js
var createIcons;
var init_lucide = __esm({
  "node_modules/.pnpm/lucide@0.445.0/node_modules/lucide/dist/esm/lucide.js"() {
    "use strict";
    init_replaceElement();
    init_createElement();
    init_book_open_check();
    init_chevron_down();
    init_chevrons_up();
    init_eye_off();
    init_heart();
    init_house();
    init_message_square_plus();
    init_message_square();
    init_moon();
    init_package_plus();
    init_panel_right();
    init_panel_top();
    init_smile();
    init_square_arrow_up_right();
    init_star();
    init_sun();
    init_twitter();
    init_image();
    init_file_text();
    init_globe();
    init_clock();
    init_settings();
    createIcons = ({
      icons = {},
      nameAttr = "data-lucide",
      attrs = {},
    } = {}) => {
      if (!Object.values(icons).length) {
        throw new Error(
          "Please provide an icons object.\nIf you want to use all the icons you can import it like:\n `import { createIcons, icons } from 'lucide';\nlucide.createIcons({icons});`",
        );
      }
      if (typeof document === "undefined") {
        throw new Error("`createIcons()` only works in a browser environment.");
      }
      const elementsToReplace = document.querySelectorAll(`[${nameAttr}]`);
      Array.from(elementsToReplace).forEach((element) =>
        replaceElement(element, { nameAttr, icons, attrs }),
      );
      if (nameAttr === "data-lucide") {
        const deprecatedElements = document.querySelectorAll("[icon-name]");
        if (deprecatedElements.length > 0) {
          Array.from(deprecatedElements).forEach((element) =>
            replaceElement(element, { nameAttr: "icon-name", icons, attrs }),
          );
        }
      }
    };
  },
});

// src/components/toast.ts
// 与 PC 端（Vue 的 Msg 组件 + 事件总线）视觉一致的无框架实现：
// 多条堆叠、语义色块、点击关闭、到时自动淡出。
// 额外提供 info 一档，用于「正在加载…」这类中性提示（PC 端没有这个场景）。
const V2P_TOAST_ICONS = {
  success: '<path d="m20 6-11 11-5-5"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  warning:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  error:
    '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
};

function pushToast(options) {
  const settings = options || {};
  const message = settings.message;
  const duration = settings.duration === void 0 ? 3e3 : settings.duration;
  const type = V2P_TOAST_ICONS[settings.type]
    ? settings.type
    : "success";

  const render = () => {
    let container = document.querySelector(".v2p-toasts");
    if (!container) {
      container = document.createElement("div");
      container.className = "v2p-toasts";
      document.body.appendChild(container);
    }

    const el = document.createElement("div");
    el.className = `v2p-toast v2p-toast--${type}`;
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.innerHTML =
      `<div class="v2p-toast__icon"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${V2P_TOAST_ICONS[type]}</svg></div>` +
      '<div class="v2p-toast__body"></div>';
    // 走 textContent，避免把消息当 HTML 解析
    el.querySelector(".v2p-toast__body").textContent =
      message == null ? "" : String(message);

    let timer = null;
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      if (timer) clearTimeout(timer);
      el.classList.add("v2p-toast--out");
      setTimeout(() => {
        el.remove();
        // 最后一条消失后把空容器也收掉，别留一个透明层挡住点击
        if (container && !container.children.length) container.remove();
      }, 250);
    };

    el.addEventListener("click", close);
    container.appendChild(el);
    if (duration !== 0) timer = setTimeout(close, duration);
    return close;
  };

  // 脚本是 document-start 启动的，极端情况下 body 还没建好
  if (document.body) return render();
  let raf = 0;
  const wait = () => {
    if (document.body) {
      raf = 0;
      render();
      return;
    }
    raf = requestAnimationFrame(wait);
  };
  raf = requestAnimationFrame(wait);
  return () => raf && cancelAnimationFrame(raf);
}

function createToast(props) {
  const settings = props || {};
  const close = pushToast(settings);
  return {
    clear: close,
  };
}
var init_toast = __esm({
  "src/components/toast.ts"() {
    "use strict";
    init_globals();
  },
});

// src/contents/helpers.ts
function focusReplyInput() {
  if (replyTextArea instanceof HTMLTextAreaElement) {
    replyTextArea.focus();
  }
}
function insertTextToReplyInput(text) {
  if (replyTextArea instanceof HTMLTextAreaElement) {
    const startPos = replyTextArea.selectionStart;
    const endPos = replyTextArea.selectionEnd;
    const valueToStart = replyTextArea.value.substring(0, startPos);
    const valueFromEnd = replyTextArea.value.substring(
      endPos,
      replyTextArea.value.length,
    );
    replyTextArea.value = `${valueToStart}${text}${valueFromEnd}`;
    focusReplyInput();
    replyTextArea.selectionStart = replyTextArea.selectionEnd =
      startPos + text.length;
  }
}

function customEscape(str) {
  return str.replace(
    /[^a-zA-Z0-9_.!~*'()-]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
  );
}
function decodeBase64TopicPage() {
  const dataTitle = "\u70B9\u51FB\u590D\u5236";
  if (window.__V2P_DecodeStatus === "decodeed") {
    createToast({
      message:
        "\u5DF2\u89E3\u6790\u5B8C\u672C\u9875\u6240\u6709\u7684 Base64 \u5B57\u7B26\u4E32",
    });
  } else {
    const $topicContentBox2 = $("#Main .box:has(.topic_content)");
    const $commentBox2 = $('#Main .box:has(.cell[id^="r_"])');
    const $commentCells2 = $commentBox2.find('.cell[id^="r_"]');
    let count = 0;
    const excludeList = [
      "boss",
      "bilibili",
      "Bilibili",
      "Encrypto",
      "encrypto",
      "Window10",
      "airpords",
      "Windows7",
    ];
    const convertHTMLText = (text, excludeTextList) => {
      if (text.length % 4 !== 0 || text.length <= 8) {
        return text;
      }
      if (excludeList.includes(text)) {
        return text;
      }
      if (text.includes("=")) {
        const paddingIndex = text.indexOf("=");
        if (
          paddingIndex !== text.length - 1 &&
          paddingIndex !== text.length - 2
        ) {
          return text;
        }
      }
      if (excludeTextList?.some((excludeText) => excludeText.includes(text))) {
        return text;
      }
      try {
        const decodedStr = decodeURIComponent(customEscape(window.atob(text)));
        count += 1;
        const safeStr = decodedStr.replace(
          /[&<>"']/g,
          (m) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[m],
        );
        return `${text}<span class="v2p-decode-block">(<ins class="v2p-decode" data-title="${dataTitle}">${safeStr}</ins>)</span>`;
      } catch (err) {
        if (err instanceof Error) {
          console.error(`\u89E3\u6790 Base64 \u51FA\u9519\uFF1A${err.message}`);
        }
        return text;
      }
    };
    const base64regex = /[A-z0-9+/=]+/g;
    const contentHandler = (_, content) => {
      const excludeTextList = [
        ...content.getElementsByTagName("a"),
        ...content.getElementsByTagName("img"),
      ].map((ele) => ele.outerHTML);
      content.innerHTML = content.innerHTML.replace(base64regex, (htmlText) =>
        convertHTMLText(htmlText, excludeTextList),
      );
    };
    $commentCells2.find(".reply_content").each(contentHandler);
    $topicContentBox2.find(".topic_content").each(contentHandler);
    if (count === 0) {
      createToast({
        message: "\u672C\u9875\u672A\u53D1\u73B0 Base64 \u5B57\u7B26\u4E32",
        type: "warning",
      });
    } else {
      window.__V2P_DecodeStatus = "decodeed";
      createToast({
        message: `\u5DF2\u89E3\u6790\u672C\u9875\u6240\u6709\u7684 Base64 \u5B57\u7B26\u4E32\uFF0C\u5171 ${count} \u6761`,
      });
    }
    $(".v2p-decode").on("click", (ev) => {
      const text = ev.target.innerText;
      void navigator.clipboard.writeText(text).then(() => {
        ev.target.dataset.title = "\u2705 \u5DF2\u590D\u5236";
        setTimeout(() => {
          ev.target.dataset.title = dataTitle;
        }, 1e3);
      });
    });
  }
}
function postTask(expression, callback) {
  if (!isBrowserExtension()) {
    const result = Function(`"use strict"; ${expression}`)();
    callback?.(result);
  } else {
    if (callback) {
      if (window.__V2P_Tasks) {
        window.__V2P_Tasks.set(Date.now(), callback);
      } else {
        window.__V2P_Tasks = /* @__PURE__ */ new Map([[Date.now(), callback]]);
      }
    }
    const messageData = {
      from: 0 /* Content */,
      payload: { task: { id: Date.now(), expression } },
    };
    window.postMessage(messageData);
  }
}
function loadIcons() {
  setTimeout(() => {
    createIcons({
      attrs: {
        width: "100%",
        height: "100%",
      },
      icons: {
        MessageSquarePlus,
        MessageSquare,
        BookOpenCheck,
        ChevronsUp,
        Heart,
        EyeOff,
        Sun,
        Moon,
        Smile,
        PackagePlus,
        Star,
        Twitter,
        ChevronDown,
        ArrowUpRightSquare: SquareArrowUpRight,
        House,
        Image,
        FileText,
        Globe,
        Clock,
        Settings,
        Tag,
      },
    });
  }, 0);
}
function transformEmoji(textValue) {
  return textValue.replace(/\[[^\]]+\]/g, (x) => {
    if (Object.hasOwn(emojiLinks, x)) {
      const emojiLink = emojiLinks[x].ld;
      if (typeof emojiLink === "string") {
        return `${emojiLink} `;
      }
    }
    return x;
  });
}
function getTagsText(tags) {
  return tags
    .map((it) => (typeof it === "string" ? it : it.name))
    .filter(Boolean)
    .join("\uFF0C");
}

function replaceEmojiWithHD($emojiImgs) {
  if ($emojiImgs.length > 0) {
    const srcMap = /* @__PURE__ */ new Map();
    Object.values(emojiLinks).forEach(({ ld, hd }) => {
      srcMap.set(ld, hd);
    });
    $emojiImgs.each((_, img) => {
      const $img = $(img);
      const src = $img.attr("src");
      if (typeof src === "string") {
        const hd = srcMap.get(src);
        if (typeof hd === "string") {
          $img.attr("src", hd);
          $img.css({
            width: "var(--v2p-emoji-size)",
            height: "var(--v2p-emoji-size)",
          });
        }
      }
    });
  }
}
function replaceCommentEmojiWithHD($cells = $commentCells) {
  const srcMap = /* @__PURE__ */ new Map();
  Object.values(emojiLinks).forEach(({ ld, hd }) => {
    srcMap.set(ld, hd);
  });
  const $embedImages = $cells.find(
    `.reply_content .embedded_image, .payload .embedded_image`,
  );
  if ($embedImages.length > 0) {
    replaceEmojiWithHD($embedImages);
  }
}

function getRegisterDays(created) {
  const registerDays = Math.ceil((Date.now() / 1e3 - created) / (60 * 60 * 24));
  return registerDays;
}
var init_helpers = __esm({
  "src/contents/helpers.ts"() {
    "use strict";
    init_lucide();
    init_toast();
    init_constants();
    init_utils();
    init_globals();
  },
});

// src/contents/common.ts
var common_exports = {};
var init_common = __esm({
  "src/contents/common.ts"() {
    "use strict";
    init_polyfill();
    init_constants();
    init_icons();
    init_utils();
    init_globals();
    init_helpers();
    const isMobileEnv =
      $("#site-header").length > 0 ||
      document.documentElement.classList.contains("v2p-mobile") ||
      /Mobi|Android|iPhone|iPad|iPod|Mobile|Phone/i.test(navigator.userAgent) ||
      window.innerWidth <= 768;
    if (isMobileEnv) {
      $body.addClass("v2p-mobile");
      document.documentElement.classList.add("v2p-mobile");
    }
    void (async () => {
      const isBrowserExt = isBrowserExtension();
      const storage = await getStorage();
      const options = storage["options" /* Options */];

      const $toggle = $("#Rightbar .light-toggle").addClass(
        "v2p-color-mode-toggle",
      );
      {
        const $toggleImg = $toggle.find("> img");
        const alt = $toggleImg.prop("alt");
        if (alt === "Light") {
          $toggle.prop("title", "\u4F7F\u7528\u6DF1\u8272\u4E3B\u9898");
          $toggleImg.replaceWith('<i data-lucide="moon"></i>');
        } else if (alt === "Dark") {
          $toggle.prop("title", "\u4F7F\u7528\u6D45\u8272\u4E3B\u9898");
          $toggleImg.replaceWith('<i data-lucide="sun"></i>');
        }
      }
      {
        $("#Top .site-nav .tools > .top").addClass("v2p-hover-btn");
      }
      if (options.hideAccount) {
        // 保留 V2EX 自带 favicon，不替换站点图标
        $("#Logo").append(`<i data-lucide="house"></i>`).addClass("v2p-logo");
        $("#Top").find('a[href^="/member/"]').remove();
        $infoCard
          .find(
            'a[href^="/member/"], table:nth-of-type(1) td:nth-of-type(3) .fade',
          )
          .addClass("v2p-hide-account");
        $infoCard.find(".balance_area").addClass("v2p-hide-balance");
      }
    })();
  },
});

// src/services.ts
async function legacyRequest(url, options) {
  const res = await fetch(url, options);
  if (res.ok) {
    return res.json();
  }
  throw new Error("\u8C03\u7528 V2EX API v1 \u51FA\u9519", {
    cause: res.status,
  });
}
async function fetchUserInfo(memberName, options) {
  try {
    const member = await legacyRequest(
      `${V2EX_LEGACY_API}/members/show.json?username=${memberName}`,
      options,
    );
    return member;
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        throw new Error("\u8BF7\u6C42\u88AB\u53D6\u6D88");
      } else if (err.cause === 404) {
        throw new Error(
          "\u67E5\u65E0\u6B64\u7528\u6237\uFF0C\u7591\u4F3C\u5DF2\u88AB\u5C01\u7981",
          { cause: err.cause },
        );
      }
    }
    throw new Error("\u83B7\u53D6\u7528\u6237\u4FE1\u606F\u5931\u8D25");
  }
}

async function uploadImage(file) {
  const formData = new FormData();
  formData.append("image", file);
  const randomIndex = Math.floor(Math.random() * imgurClientIdPool.length);
  const clidenId = imgurClientIdPool[randomIndex];
  const res = await fetch("https://api.imgur.com/3/upload", {
    method: "POST",
    headers: { Authorization: `Client-ID ${clidenId}` },
    body: formData,
  });
  if (res.ok) {
    const resData = await res.json();
    if (resData.success) {
      return resData.data.link;
    }
  }
  throw new Error("\u4E0A\u4F20\u5931\u8D25");
}
async function refreshMoney() {
  const res = await fetch("/ajax/money", { method: "POST" });
  const data = await res.text();
  $("#money").html(data);
}

function getOnceToken(replyId) {
  // 1. 当前脚本里的 window.once
  if (typeof window.once === "string" && window.once) {
    return window.once;
  }

  // 2. 尝试从页面原始 window 取（油猴环境）
  try {
    if (
      typeof unsafeWindow !== "undefined" &&
      typeof unsafeWindow.once === "string" &&
      unsafeWindow.once
    ) {
      return unsafeWindow.once;
    }
  } catch (e) {
    // ignore
  }

  // 3. 从 DOM 中原生的感谢链接解析 once
  //    尝试根据 replyId 定位 thank_area
  if (typeof replyId === "string" || typeof replyId === "number") {
    const selector = `#thank_area_${replyId} a.thank[href*="once="]`;
    const $link = $(selector);
    if ($link.length) {
      const href = $link.attr("href") || "";
      const match = href.match(/[?&]once=([^&]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
  }

  // 4. 兜底：随便找一个带 once 的链接（比如顶部的登出、夜间模式切换等）
  const $anyLink = $('a[href*="once="]').first();
  if ($anyLink.length) {
    const href = $anyLink.attr("href") || "";
    const match = href.match(/[?&]once=([^&]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }

  // 实在拿不到，返回空字符串（让请求至少不是 "undefined"）
  return "";
}

async function thankReply(params) {
  try {
    const once = getOnceToken(params.replyId);

    const res = await fetch(
      `/thank/reply/${params.replyId}?once=${encodeURIComponent(once)}`,
      {
        method: "POST",
      },
    );
    const data = await res.json();
    postTask(`window.once = ${data.once}`);
    window.once = data.once;
    if (data.success) {
      $("#thank_area_" + params.replyId)
        .addClass("thanked")
        .html("\u611F\u8C22\u5DF2\u53D1\u9001");
      params.onSuccess?.();
      await refreshMoney();
    } else {
      alert(data.message);
    }
  } catch {
    params.onFail?.();
  }
}
async function crawlTopicPage(path, page = "1") {
  const res = await fetch(`${V2EX_ORIGIN}${path}?p=${page}`);
  const htmlText = await res.text();
  return htmlText;
}
async function getCommentPreview(params) {
  const formData = new FormData();
  formData.append("text", params.text);
  const res = await fetch(`${V2EX_ORIGIN}/preview/${params.syntax}`, {
    method: "POST",
    body: formData,
  });
  if (res.ok) {
    const renderedContent = await res.text();
    return renderedContent;
  } else {
    throw new Error("\u9884\u89C8\u5931\u8D25");
  }
}
var V2EX_LEGACY_API;
var init_services = __esm({
  "src/services.ts"() {
    "use strict";
    init_constants();
    init_helpers();
    init_utils();
    V2EX_LEGACY_API = `${V2EX_ORIGIN}/api`;
  },
});

// src/components/button.ts
function createButton(props) {
  const { children, className = "", type = "button", tag = "button" } = props;
  const $button = $(
    `<${tag} class="normal button ${className}">${children}</${tag}>`,
  );
  if (tag === "button") {
    $button.prop("type", type);
  }
  return $button;
}
var init_button = __esm({
  "src/components/button.ts"() {
    "use strict";
  },
});

// src/components/modal.ts
function createModal(props) {
  const { root, title, onMount, onOpen, onClose } = props;
  const $mask = $('<div class="v2p-modal-mask">');
  const $content = $('<div class="v2p-modal-content">');
  const $closeBtn = createButton({
    children: "\u5173\u95ED<kbd>Esc</kbd>",
    className: "v2p-modal-close-btn",
  });
  const $title = $(`<div class="v2p-modal-title">${title ?? ""}</div>`);
  const $actions = $('<div class="v2p-modal-actions">').append($closeBtn);
  const $header = $('<div class="v2p-modal-header">').append($title, $actions);
  const $main2 = $('<div class="v2p-modal-main">')
    .append($header, $content)
    .on("click", (ev) => {
      ev.stopPropagation();
    });
  const $container = $mask.append($main2).hide();
  const modalElements = {
    $mask,
    $main: $main2,
    $header,
    $container,
    $title,
    $actions,
    $content,
  };
  let boundEvent = false;
  let mouseDownTarget;
  const mouseDownHandler = (ev) => {
    mouseDownTarget = ev.target;
  };
  const mouseUpHandler = (ev) => {
    if (
      mouseDownTarget === $mask.get(0) &&
      ev.target === $mask.get(0) &&
      ev.currentTarget === ev.target
    ) {
      handleModalClose();
    }
  };
  const keyupHandler = (ev) => {
    if (ev.key === "Escape") {
      handleModalClose();
    }
  };
  const handleModalClose = () => {
    $mask.off("mousedown", mouseDownHandler);
    $mask.off("mouseup", mouseUpHandler);
    $(document).off("keydown", keyupHandler);
    boundEvent = false;
    $container.fadeOut("fast");
    document.body.classList.remove("v2p-modal-open");
    onClose?.(modalElements);
  };
  const handleModalOpen = () => {
    if (root && !$container.parent().length) {
      root.append($container);
      $closeBtn.on("click", handleModalClose);
      onMount?.(modalElements);
    }
    setTimeout(() => {
      if (!boundEvent) {
        $mask.on("mousedown", mouseDownHandler);
        $mask.on("mouseup", mouseUpHandler);
        $(document).on("keydown", keyupHandler);
        boundEvent = true;
      }
    });
    $container.fadeIn("fast");
    document.body.classList.add("v2p-modal-open");
    onOpen?.(modalElements);
  };
  return { ...modalElements, open: handleModalOpen, close: handleModalClose };
}
var init_modal = __esm({
  "src/components/modal.ts"() {
    "use strict";
    init_button();
  },
});

// src/contents/topic/content.ts
function handleTopicImgHeight() {
  const $topicContentImgs = $topicContentBox.find(
    ".topic_content .embedded_image",
  );
  $topicContentImgs.each((_, img) => {
    const $img = $(img);
    const height = $img.height() ?? 0;
    const shouldWrap = height > 600;
    if (shouldWrap) {
      const collapsedCSS = {
        maxHeight: `${READABLE_CONTENT_HEIGHT}px`,
        overflow: "hidden",
        paddingBottom: "0",
        "--bg-reply": "var(--v2p-color-bg-content)",
      };
      const $contentBox = $(
        '<div class="v2p-reply-content v2p-collapsed">',
      ).css(collapsedCSS);
      const $expandBtn = createButton({
        children: "\u5C55\u5F00\u56FE\u7247",
        className: "v2p-expand-btn",
      });
      const toggleContent = () => {
        const collapsed = $contentBox.hasClass("v2p-collapsed");
        $contentBox
          .toggleClass("v2p-collapsed")
          .css(
            collapsed
              ? { maxHeight: "none", overflow: "auto", paddingBottom: "40px" }
              : collapsedCSS,
          );
        $expandBtn.html(
          collapsed ? "\u6536\u8D77\u56FE\u7247" : "\u5C55\u5F00\u56FE\u7247",
        );
      };
      $expandBtn.on("click", () => {
        toggleContent();
      });
      $contentBox.append($img.clone()).replaceAll($img).append($expandBtn);
    }
  });
}
function handleContent() {
  const storage = getStorageSync();
  const options = storage["options" /* Options */];
  if (options.openInNewTab) {
    $topicContentBox
      .find(".topic_content a[href]")
      .prop("target", "_blank")
      .prop("rel", "noopener noreferrer");
  }
  {
    const $topicContents = $topicContentBox.find(
      ".cell > .topic_content, .subtle > .topic_content",
    );
    const textLength = $topicContents.text().length;
    if (textLength >= 200) {
      $topicContents.each((_, topicContent) => {
        if (textLength >= 400) {
          topicContent.style.fontSize = "14px";
        }
        topicContent.style.fontSize = "14.5px";
      });
    }
  }
  {
    const $topicBtns = $(".topic_buttons");
    const $topicBtn = $topicBtns.find(".tb").addClass("v2p-tb v2p-hover-btn");
    const $favoriteBtn = $topicBtn.eq(0);
    $favoriteBtn.append(
      '<span class="v2p-tb-icon"><i data-lucide="star"></i></span>',
    );
    $topicBtn
      .eq(1)
      .append('<span class="v2p-tb-icon"><i data-lucide="twitter"></i></span>');
    $topicBtn
      .eq(2)
      .append('<span class="v2p-tb-icon"><i data-lucide="eye-off"></i></span>');
    $topicBtn
      .eq(3)
      .append('<span class="v2p-tb-icon"><i data-lucide="heart"></i></span>');
    // 本分支不再接入第三方分享服务，故不追加「分享」按钮
    loadIcons();
  }
  window.requestIdleCallback(() => {
    handleTopicImgHeight();
    applyTopicContentCollapse();
  });
  // 图片加载完成后正文高度可能才超过阈值，补一次检查
  if (document.readyState === "complete") {
    applyTopicContentCollapse();
  } else {
    window.addEventListener("load", () => applyTopicContentCollapse(), {
      once: true,
    });
  }
}
// 主题正文（OP）折叠：只折叠超过阈值的正文，避免长贴一屏放不下
function applyTopicContentCollapse({ force } = {}) {
  if (typeof $topicContentBox === "undefined" || !$topicContentBox?.length) {
    return;
  }
  const options = window.__V2P_StorageCache?.options || defaultOptions;
  const enabled =
    force === void 0 ? options.contentAutoCollapse !== false : !!force;
  const collapsedCSS = {
    maxHeight: `${TOPIC_CONTENT_COLLAPSE_HEIGHT}px`,
    overflow: "hidden",
    paddingBottom: "0",
    "--bg-reply": "var(--v2p-color-bg-content)",
  };
  const expandedCSS = {
    maxHeight: "none",
    overflow: "visible",
    paddingBottom: "40px",
  };
  $topicContentBox
    .find(
      ".cell > .topic_content, .subtle > .topic_content, .cell > .v2p-topic-content-collapse > .topic_content, .subtle > .v2p-topic-content-collapse > .topic_content",
    )
    .each((_, el) => {
      const $content = $(el);
      const $wrapper = $content.parent(".v2p-topic-content-collapse");
      if (!enabled) {
        if ($wrapper.length) {
          $wrapper.find(".v2p-expand-btn").remove();
          $wrapper.replaceWith($content);
        }
        return;
      }
      if ($wrapper.length) {
        if (force === true) {
          $wrapper.addClass("v2p-collapsed").css(collapsedCSS);
          $wrapper.find(".v2p-expand-btn").text("展开正文");
        }
        return;
      }
      const contentHeight = $content.height() ?? 0;
      if (contentHeight < TOPIC_CONTENT_COLLAPSE_THRESHOLD) {
        return;
      }
      $content.wrap(
        '<div class="v2p-reply-content v2p-topic-content-collapse v2p-collapsed"></div>',
      );
      const $box = $content.parent();
      $box.css(collapsedCSS);
      const $btn = createButton({
        children: "展开正文",
        className: "v2p-expand-btn",
      });
      const toggle = () => {
        const collapsed = $box.hasClass("v2p-collapsed");
        $box
          .toggleClass("v2p-collapsed", !collapsed)
          .css(collapsed ? expandedCSS : collapsedCSS);
        $btn.text(collapsed ? "收起正文" : "展开正文");
      };
      $btn.on("click", toggle);
      $box.append($btn);
    });
}
function processReplyContent($cellDom) {
  if ($cellDom.find(".v2p-reply-content").length > 0) {
    return;
  }
  const $replyContent = $cellDom.find(".reply_content");
  const contentHeight = $replyContent.height() ?? 0;
  const shouldCollapsed =
    contentHeight + READABLE_CONTENT_HEIGHT >= MAX_CONTENT_HEIGHT;
  if (shouldCollapsed) {
    const collapsedCSS = {
      maxHeight: `${READABLE_CONTENT_HEIGHT}px`,
      overflow: "hidden",
      paddingBottom: "0",
    };
    const $contentBox = $('<div class="v2p-reply-content v2p-collapsed">').css(
      collapsedCSS,
    );
    const $expandBtn = createButton({
      children: "\u5C55\u5F00\u56DE\u590D",
      className: "v2p-expand-btn",
    });
    const toggleContent = () => {
      const collapsed = $contentBox.hasClass("v2p-collapsed");
      $contentBox
        .toggleClass("v2p-collapsed")
        .css(
          collapsed
            ? { maxHeight: "none", overflow: "auto", paddingBottom: "40px" }
            : collapsedCSS,
        );
      $expandBtn.html(
        collapsed ? "\u6536\u8D77\u56DE\u590D" : "\u5C55\u5F00\u56DE\u590D",
      );
    };
    $expandBtn.on("click", () => {
      toggleContent();
    });
    $contentBox
      .append($replyContent.clone())
      .replaceAll($replyContent)
      .append($expandBtn);
  }
}
// ===== 用户标签 =====
// 与 PC 端共用 V2EX 记事本中的 `--用户标签--` 条目；未登录 / 同步失败时退回本机存储。
// 数据结构：{ [memberName]: ["tag1", "tag2"] }
const MEMBER_TAGS_STORAGE_KEY = "v2p_tags";
const MEMBER_TAGS_NOTE_PREFIX = "--用户标签--";
var memberTags = {};
var memberTagsNoteId = null;
var memberTagsSync = null;
var memberTagsInitialized = false;
var memberTagModal = null;
var memberTagModalName = "";

function readLocalMemberTags() {
  let raw = null;
  try {
    if (typeof GM_getValue === "function") {
      raw = GM_getValue(MEMBER_TAGS_STORAGE_KEY);
    }
  } catch {
    raw = null;
  }
  if (raw == null) {
    try {
      raw = localStorage.getItem(MEMBER_TAGS_STORAGE_KEY);
    } catch {
      raw = null;
    }
  }
  if (!raw) return {};
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return normalizeMemberTags(parsed);
}
function writeLocalMemberTags(tags) {
  const raw = JSON.stringify(tags);
  try {
    if (typeof GM_setValue === "function") {
      GM_setValue(MEMBER_TAGS_STORAGE_KEY, raw);
      return;
    }
  } catch {
    // GM 存储不可用时退回 localStorage
  }
  try {
    localStorage.setItem(MEMBER_TAGS_STORAGE_KEY, raw);
  } catch {
    // 隐私模式下 localStorage 可能不可用，忽略即可
  }
}
function normalizeMemberTags(value) {
  if (!isObject(value)) return {};
  const result = {};
  Object.entries(value).forEach(([name, tags]) => {
    if (!Array.isArray(tags)) return;
    const cleaned = Array.from(
      new Set(
        tags
          .filter((tag) => typeof tag === "string")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    );
    if (cleaned.length > 0) result[name] = cleaned;
  });
  return result;
}
function getMemberTags(name) {
  const tags = memberTags[name];
  return Array.isArray(tags) ? tags : [];
}
function isMemberTagsEnabled() {
  const options = window.__V2P_StorageCache?.options || defaultOptions;
  return options?.userTag?.enabled !== false;
}
function isV2exLoggedIn() {
  return !!(
    $('#Top .tools a[href*="/signout"], #Top .tools a[href^="/member/"]')
      .length ||
    $('#site-header-menu a[href*="/signout"], #site-header-menu a[href^="/member/"]')
      .length ||
    $('header#site-header a[href*="/signout"]').length
  );
}
function getMemberTagNoteIdFromHref(href) {
  const value = String(href || "");
  const matched = value.match(/\/(\d+)\/?$/);
  return matched ? matched[1] : value.split("/").filter(Boolean).pop() || null;
}
function parseMemberTagsNoteText(text) {
  if (typeof text !== "string") return null;
  if (!text.startsWith(MEMBER_TAGS_NOTE_PREFIX)) return null;
  const raw = text.slice(MEMBER_TAGS_NOTE_PREFIX.length).trim();
  if (!raw) return {};
  try {
    return normalizeMemberTags(JSON.parse(raw));
  } catch {
    return null;
  }
}
async function syncMemberTagsFromNotes() {
  if (!isV2exLoggedIn()) return false;
  try {
    const notesHtml = await $.get(`${V2EX_ORIGIN}/notes`);
    // $.parseHTML 会丢掉 html/body 包裹，只剩顶层节点；先套一层容器，
    // 这样无论记事本条目是不是顶层节点都能用 find 查到。
    const $notesDoc = $("<div>").append($.parseHTML(notesHtml));
    const $tagItem = $notesDoc
      .find(".note_item_title a")
      .filter((_, link) =>
        $(link).text().includes(MEMBER_TAGS_NOTE_PREFIX),
      )
      .first();
    if ($tagItem.length === 0) {
      memberTagsNoteId = null;
      return true;
    }
    memberTagsNoteId = getMemberTagNoteIdFromHref($tagItem.attr("href"));
    if (!memberTagsNoteId) return false;
    const editHtml = await $.get(
      `${V2EX_ORIGIN}/notes/edit/${memberTagsNoteId}`,
    );
    const $editDoc = $("<div>").append($.parseHTML(editHtml));
    const $editor = $editDoc.find(".note_editor").first();
    const noteText = $editor.text() || $editor.val() || "";
    const remoteTags = parseMemberTagsNoteText(noteText);
    if (remoteTags) {
      memberTags = remoteTags;
      writeLocalMemberTags(memberTags);
      updateMemberTag();
    }
    return true;
  } catch (err) {
    console.warn("[V2EX Pro] 读取用户标签失败：", err);
    return false;
  }
}
function ensureMemberTagsSynced() {
  if (!memberTagsSync) memberTagsSync = syncMemberTagsFromNotes();
  return memberTagsSync;
}
async function createMemberTagsNote() {
  const data = new FormData();
  data.append("content", MEMBER_TAGS_NOTE_PREFIX);
  data.append("parent_id", "0");
  data.append("syntax", "0");
  const res = await fetch(`${V2EX_ORIGIN}/notes/new`, {
    method: "post",
    body: data,
  });
  if (!res.redirected || res.status !== 200) return false;
  memberTagsNoteId = getMemberTagNoteIdFromHref(res.url);
  return !!memberTagsNoteId;
}
async function persistMemberTags() {
  writeLocalMemberTags(memberTags);
  if (!isV2exLoggedIn()) {
    createToast({
      message: "标签已保存在本机；登录后可同步到 V2EX 记事本",
      type: "info",
    });
    return;
  }
  await ensureMemberTagsSynced();
  try {
    if (!memberTagsNoteId && !(await createMemberTagsNote())) {
      throw new Error("创建记事本条目失败");
    }
    const data = new FormData();
    data.append(
      "content",
      MEMBER_TAGS_NOTE_PREFIX + JSON.stringify(normalizeMemberTags(memberTags)),
    );
    data.append("syntax", "0");
    const res = await fetch(
      `${V2EX_ORIGIN}/notes/edit/${memberTagsNoteId}`,
      { method: "post", body: data },
    );
    if (!res.redirected || res.status !== 200) {
      throw new Error("写入记事本条目失败");
    }
    createToast({ message: "标签已保存", type: "success" });
  } catch (err) {
    console.warn("[V2EX Pro] 保存用户标签失败：", err);
    createToast({
      message: "标签已保存在本机，但同步到记事本失败",
      type: "error",
    });
  }
}
function createMemberTagChip(name, tags) {
  const $chip = $(
    '<span class="v2p-member-tag" title="点击编辑用户标签"><i data-lucide="tag"></i><span class="v2p-member-tag-text"></span></span>',
  ).attr("data-member", name);
  $chip.find(".v2p-member-tag-text").text(getTagsText(tags));
  return $chip;
}
// 把标签与打标签入口同步到当前页面的 OP / 回复上；重复调用幂等。
function updateMemberTag() {
  $(".v2p-member-tag, .v2p-tag-add, .v2p-control-tag").remove();
  if (!isMemberTagsEnabled()) return;
  if (typeof $topicHeader !== "undefined" && $topicHeader?.length) {
    const $opLink = $topicHeader
      .find('small a[href^="/member/"]')
      .first();
    const opName = $opLink.text().trim();
    if (opName) {
      const tags = getMemberTags(opName);
      if (tags.length > 0) {
        $opLink.after(createMemberTagChip(opName, tags));
      } else {
        $opLink.after(
          $(
            '<span class="v2p-tag-add" title="添加用户标签"><i data-lucide="tag"></i></span>',
          ).attr("data-member", opName),
        );
      }
    }
  }
  if (
    typeof $commentCells === "undefined" ||
    !$commentCells?.length ||
    typeof commentDataList === "undefined"
  ) {
    loadIcons();
    return;
  }
  $commentCells.each((_, cellDom) => {
    const $cell = $(cellDom);
    const data = commentDataList.find((item) => item.id === cellDom.id);
    const memberName =
      data?.memberName ||
      $cell
        .find("> table > tbody > tr > td:nth-child(3) > strong > a")
        .first()
        .text()
        .trim();
    if (!memberName) return;
    const $strong = $cell
      .find("> table > tbody > tr > td:nth-child(3) > strong")
      .first();
    const tags = getMemberTags(memberName);
    if (tags.length > 0 && $strong.length > 0) {
      $strong.append(createMemberTagChip(memberName, tags));
    }
    const $controls = $cell.find(
      "> table > tbody > tr > td:last-of-type > .fr > .v2p-controls",
    );
    if ($controls.length > 0) {
      $controls.prepend(
        $(
          '<span class="v2p-control v2p-hover-btn v2p-control-tag" title="用户标签"><i data-lucide="tag"></i></span>',
        ).attr("data-member", memberName),
      );
    }
  });
  updateTopReplyMemberTags();
  loadIcons();
}
// 高赞回复卡片是用户名副本，单独补一次标签（不挂打标签按钮）
function updateTopReplyMemberTags() {
  if (!isMemberTagsEnabled()) return;
  $(".v2p-top-reply-member").each((_, link) => {
    const $link = $(link);
    const name = $link.text().trim();
    const tags = getMemberTags(name);
    if (tags.length > 0) {
      $link.after(createMemberTagChip(name, tags));
    }
  });
}
function renderMemberTagEditor($content, name) {
  $content.find(".v2p-tag-editor-name").text(name);
  const $list = $content.find(".v2p-tag-editor-list").empty();
  const tags = getMemberTags(name);
  if (tags.length === 0) {
    $list.append('<span class="v2p-tag-editor-empty">暂无标签</span>');
    return;
  }
  tags.forEach((tag) => {
    const $item = $('<span class="v2p-tag-editor-item">');
    $item.append($('<span class="v2p-tag-editor-item-text">').text(tag));
    $item.append(
      $(
        '<button type="button" class="v2p-tag-editor-remove" title="删除标签" aria-label="删除标签">×</button>',
      ).attr("data-tag", tag),
    );
    $list.append($item);
  });
}
async function addMemberTag(name, tag) {
  await ensureMemberTagsSynced();
  const tags = getMemberTags(name);
  if (tags.includes(tag)) {
    createToast({ message: "标签已存在", type: "info" });
    return false;
  }
  memberTags[name] = [...tags, tag];
  updateMemberTag();
  await persistMemberTags();
  return true;
}
async function removeMemberTag(name, tag) {
  await ensureMemberTagsSynced();
  const tags = getMemberTags(name).filter((item) => item !== tag);
  if (tags.length > 0) {
    memberTags[name] = tags;
  } else {
    delete memberTags[name];
  }
  updateMemberTag();
  await persistMemberTags();
}
function createMemberTagModal() {
  return createModal({
    root: $body,
    title: "用户标签",
    onMount({ $content }) {
      $content.append(`
        <div class="v2p-tag-editor">
          <div class="v2p-tag-editor-user">@<span class="v2p-tag-editor-name"></span></div>
          <div class="v2p-tag-editor-list"></div>
          <form class="v2p-tag-editor-form">
            <input type="text" maxlength="24" placeholder="输入标签，回车添加" aria-label="用户标签">
            <button type="submit" class="normal button">添加</button>
          </form>
          <div class="v2p-settings-note">标签保存在你的 V2EX 记事本，可与 PC 端同步；未登录时仅保存在本机。</div>
        </div>
      `);
      $content.find(".v2p-tag-editor-form").on("submit", async (ev) => {
        ev.preventDefault();
        const $input = $content.find(".v2p-tag-editor-form input");
        const tag = String($input.val() || "").trim();
        if (!tag) return;
        const added = await addMemberTag(memberTagModalName, tag);
        if (added) $input.val("");
        renderMemberTagEditor($content, memberTagModalName);
        $input.trigger("focus");
      });
      $content.on("click", ".v2p-tag-editor-remove", async function () {
        const tag = this.dataset.tag;
        if (!tag) return;
        this.disabled = true;
        await removeMemberTag(memberTagModalName, tag);
        renderMemberTagEditor($content, memberTagModalName);
      });
    },
    onOpen({ $content }) {
      renderMemberTagEditor($content, memberTagModalName);
      setTimeout(() => {
        $content.find(".v2p-tag-editor-form input").trigger("focus");
      }, 50);
    },
  });
}
function openTagsSetter(memberName) {
  const name = String(memberName || "").trim();
  if (!name) return;
  memberTagModalName = name;
  if (!memberTagModal) memberTagModal = createMemberTagModal();
  memberTagModal.open();
}
function bindMemberTagEvents() {
  $(document).on(
    "click.v2p-member-tags",
    ".v2p-member-tag, .v2p-tag-add, .v2p-control-tag",
    function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      openTagsSetter(this.dataset.member);
    },
  );
}
function initMemberTags() {
  if (memberTagsInitialized) return;
  memberTagsInitialized = true;
  memberTags = readLocalMemberTags();
  bindMemberTagEvents();
  updateMemberTag();
  // 本机标签先渲染，远端记事本在后台同步；完成后会自动重绘
  memberTagsSync = syncMemberTagsFromNotes();
}

function handleTopicImg() {
  const $imgs = $(".embedded_image");
  if ($imgs.length > 0) {
    const modal = createModal({
      root: $body,
      onMount: ({ $main: $main2, $header, $content }) => {
        $main2.css({
          width: "auto",
          height: "auto",
          display: "flex",
          "justify-content": "center",
          "background-color": "transparent",
          "pointer-events": "none",
        });
        $header.remove();
        $content.css({
          display: "flex",
          "justify-content": "center",
          "align-items": "center",
          "pointer-events": "none",
        });
      },
      onOpen: ({ $content }) => {
        $content.empty();
      },
    });
    $imgs.each((_, img) => {
      const $img = $(img);
      if (img instanceof HTMLImageElement) {
        $img.parent().removeAttr("href");
        if (img.clientWidth !== img.naturalWidth) {
          $img.css({ cursor: "zoom-in" });
          $img.on("click", () => {
            const $clonedImg = $img.clone();
            $clonedImg.css({ cursor: "default", "pointer-events": "auto" });
            modal.open();
            modal.$content.append($clonedImg);
          });
        }
      }
    });
  }
}
var init_content = __esm({
  "src/contents/topic/content.ts"() {
    "use strict";
    init_button();
    init_modal();
    init_constants();
    init_utils();
    init_globals();
    init_helpers();
  },
});

// src/contents/dom.ts
// 移动端回复行里的日期同样带 small 类（<span class="fade small">），
// 直接对 span.small 取合并文本会得到“Dec 13, 2023 95”这样的非数字，
// Number(...) 变成 NaN，导致高赞回复永远选不出候选。这里只取真正的赞数节点：
// 优先含红心图标的 span，其次纯数字 span；都没有则视为 0 赞。
function getLikeSpan($scope) {
  const $spans = $scope.find("span.small");
  const $withHeart = $spans.filter(
    (_, el) => $(el).find('img[alt="❤️"]').length > 0,
  );
  if ($withHeart.length > 0) return $withHeart.first();
  return $spans
    .filter((_, el) => /^\s*\d+\s*$/.test($(el).text()))
    .first();
}
// 桌面版回复时间是 .ago；移动版是 span.fade.small（不含红心图标）。
// 统一取回复时间节点，供「隐藏回复时间」和感谢后插入赞数节点复用。
function getReplyTimeSpan($scope) {
  const $ago = $scope.find(".ago");
  if ($ago.length > 0) return $ago.first();
  // 排除赞数节点，剩下的第一个 span.small 就是移动版的日期
  return $scope.find("span.small").not(getLikeSpan($scope)).first();
}
function getCommentDataList({
  options,
  $commentTableRows: $commentTableRows2,
  $commentCells: $commentCells2,
}) {
  return $commentTableRows2
    .map((idx, tr) => {
      const id = $commentCells2[idx].id;
      const $tr = $(tr);
      const $td = $tr.find("> td:nth-child(3)");
      const thanked = $tr
        .find("> td:last-of-type > .fr")
        .find("> .thank_area")
        .hasClass("thanked");
      const $member = $td.find("> strong > a");
      const memberName = $member.text();
      const memberLink = $member.prop("href");
      const memberAvatar = $tr.find(".avatar").prop("src");
      const $content = $td.find("> .reply_content");
      const content = $content.text();
      const hasImage = $content.find("img").length > 0;
      const likes = Number(getLikeSpan($td).text().trim()) || 0;
      const floor = $td.find("span.no").text();
      const memberNameMatches = Array.from(
        content.matchAll(/@([a-zA-Z0-9]+)/g),
      );
      const refMemberNames =
        memberNameMatches.length > 0
          ? memberNameMatches.map(([, name]) => {
              return name;
            })
          : void 0;
      const floorNumberMatches = Array.from(content.matchAll(/#(\d+)/g));
      const refFloors =
        floorNumberMatches.length > 0
          ? floorNumberMatches.map(([, floor2]) => {
              return floor2;
            })
          : void 0;
      // 高赞回复的嵌套 / 父级回溯按 PC 端 parseReplyContent 的口径解析：
      // 被 @ 的用户取渲染后的 member 链接，且仅在恰好 @ 一人时认随后面的 #楼层
      const rawContentHtml = $content.html() ?? "";
      const replyUsers = Array.from(
        rawContentHtml.matchAll(/@<a href="\/member\/([^'" ]+)/g),
        ([, name]) => name,
      );
      let replyFloor = -1;
      if (replyUsers.length === 1) {
        const floorMatch = rawContentHtml.match(
          /@<a href="\/member\/[\s\S]+?<\/a>(?:<ul [\s\S]+<\/ul>)?[\s]+#([\d]+)/,
        );
        if (floorMatch) {
          replyFloor = Number(floorMatch[1]);
        }
      }
      // 高赞回复的副本是纯文本渲染，图片单独带出来，避免图片回复显示成空白
      const imageSrcs = Array.from($content.find("img"), (img) =>
        $(img).prop("src"),
      );
      let contentHtml = void 0;
      if (refMemberNames) {
        const canHideRefName =
          options.nestedReply.display === "indent" &&
          !!options.replyContent.hideRefName;
        if (canHideRefName) {
          if (refMemberNames.length === 1) {
            contentHtml = $content.html();
            const pattern = /(@<a href="\/member\/\w+">[\w\s]+<\/a>)\s+/g;
            const replacement = '<span class="v2p-member-ref">$1</span> ';
            contentHtml = contentHtml.replace(pattern, replacement);
          }
        }
      }
      return {
        id,
        memberName,
        memberLink,
        memberAvatar,
        content,
        hasImage,
        imageSrcs,
        replyUsers,
        replyFloor,
        contentHtml,
        likes,
        floor,
        index: idx,
        refMemberNames,
        refFloors,
        thanked,
      };
    })
    .get();
}
function handleNestedComment({
  options,
  $commentCells: $commentCells2,
  commentDataList: commentDataList2,
}) {
  const display = options.nestedReply.display;
  $commentCells2.each((i, cellDom) => {
    const $cellDom = $(cellDom);
    // 长回复折叠与楼中楼展示方式相互独立
    if (options.replyContent.autoFold) {
      processReplyContent($cellDom);
    }
    if (display === "off") {
      return;
    }
    const dataFromIndex = commentDataList2.at(i);
    const currentComment =
      dataFromIndex?.id === cellDom.id
        ? dataFromIndex
        : commentDataList2.find((data) => data.id === cellDom.id);
    if (currentComment) {
      const { refMemberNames, refFloors } = currentComment;
      if (!refMemberNames || refMemberNames.length === 0) {
        return;
      }
      const moreThanOneRefMember = refMemberNames.length > 1;
      if (
        options.nestedReply.multipleInsideOne === "off" &&
        refMemberNames.length > 1
      ) {
        return;
      }
      for (const refName of moreThanOneRefMember
        ? refMemberNames.toReversed()
        : refMemberNames) {
        for (let j = i - 1; j >= 0; j--) {
          const { memberName: compareName, floor: eachFloor } =
            commentDataList2.at(j) || {};
          if (compareName === refName) {
            let refCommentIdx = j;
            const firstRefFloor = moreThanOneRefMember
              ? refFloors?.toReversed().at(0)
              : refFloors?.at(0);
            if (firstRefFloor && firstRefFloor !== eachFloor) {
              const targetIdx = commentDataList2
                .slice(0, j)
                .findIndex(
                  (data) =>
                    data.floor === firstRefFloor &&
                    data.memberName === refName,
                );
              if (targetIdx >= 0) {
                refCommentIdx = targetIdx;
              }
            }
            if (display === "indent") {
              cellDom.classList.add("v2p-indent");
            }
            $commentCells2.eq(refCommentIdx).append(cellDom);
            return;
          }
        }
      }
    }
  });
}

// ===== 回复视图（当前页）：默认 / 最新 / 最热 / 只看楼主 =====
// 只在当前页内排序 / 筛选，不改分页与原始回复数据。
// 非默认模式需要先把 handleNestedComment 挪进父楼的节点还原成平铺；
// 切回默认时按快照恢复原来的楼中楼结构。
const REPLY_VIEW_MODES = ["default", "new", "hot", "op"];
var replyViewMode = "default";
var replyViewState = null;

function getReplyViewStorageKey() {
  return `v2p_reply_view_${pathTopicId || location.pathname}`;
}

function getReplyViewOpName() {
  if (topicOwnerName) return topicOwnerName.trim();
  return (
    $(".box > .header small a[href^='/member/']").first().text().trim() ||
    $(".box .header small a[href^='/member/']").first().text().trim()
  );
}

function getReplyCellMeta(cell) {
  const $cell = $(cell);
  const $td = $cell.find("> table > tbody > tr > td:nth-child(3)");
  return {
    floor: Number($td.find("span.no").first().text()) || 0,
    likes: Number(getLikeSpan($td).text().trim()) || 0,
    memberName: $td.find("> strong > a").first().text().trim(),
    isOp: $cell.find(".badge.op").length > 0,
  };
}

function placeReplyCells(cells) {
  if (!replyViewState) return;
  const { anchor, commentBox } = replyViewState;
  const fragment = document.createDocumentFragment();
  cells.forEach((cell) => fragment.appendChild(cell));
  if (anchor && anchor.parentNode) {
    anchor.parentNode.insertBefore(fragment, anchor.nextSibling);
  } else if (commentBox) {
    commentBox.appendChild(fragment);
  }
}

function flattenReplyCells() {
  if (!replyViewState) return;
  replyViewState.flatCells.forEach((cell) =>
    cell.classList.remove("v2p-indent"),
  );
  placeReplyCells(replyViewState.flatCells);
}

function captureReplyViewDefaultLayout() {
  if (!replyViewState) return;
  replyViewState.snapshot = replyViewState.flatCells.map((cell) => ({
    cell,
    parent: cell.parentNode,
    next: cell.nextSibling,
    indent: cell.classList.contains("v2p-indent"),
  }));
}

function restoreReplyViewDefaultLayout() {
  if (!replyViewState?.snapshot) return;
  const { snapshot, flatCells, commentBox } = replyViewState;
  // 反向恢复，避免 next 兄弟节点自己也被移动时找不到锚点
  for (let i = snapshot.length - 1; i >= 0; i--) {
    const { cell, parent, next, indent } = snapshot[i];
    const targetParent = parent && parent.isConnected ? parent : commentBox;
    if (next && next.parentNode === targetParent) {
      targetParent.insertBefore(cell, next);
    } else {
      targetParent.appendChild(cell);
    }
    cell.classList.toggle("v2p-indent", indent);
  }
  flatCells.forEach((cell) => cell.classList.remove("v2p-reply-hidden"));
}

function updateReplyViewBar() {
  $(".v2p-reply-view-btn").each((_, el) => {
    $(el).toggleClass(
      "v2p-select-item-active",
      el.dataset.mode === replyViewMode,
    );
  });
}

function applyReplyView(mode, { persist = true } = {}) {
  if (!replyViewState || !REPLY_VIEW_MODES.includes(mode)) return false;
  replyViewMode = mode;
  if (persist) {
    try {
      sessionStorage.setItem(getReplyViewStorageKey(), mode);
    } catch {
      // 隐私模式下 sessionStorage 可能不可用，忽略即可
    }
  }
  if (mode === "default") {
    restoreReplyViewDefaultLayout();
  } else {
    flattenReplyCells();
    replyViewState.flatCells.forEach((cell) =>
      cell.classList.remove("v2p-reply-hidden"),
    );
    if (mode === "op") {
      const opName = getReplyViewOpName();
      let shown = 0;
      replyViewState.flatCells.forEach((cell) => {
        const meta = getReplyCellMeta(cell);
        const isOp = meta.isOp || (!!opName && meta.memberName === opName);
        if (isOp) {
          shown += 1;
        } else {
          cell.classList.add("v2p-reply-hidden");
        }
      });
      if (shown === 0) {
        createToast({ message: "本页没有楼主的回复", type: "info" });
      }
    } else {
      const ordered = replyViewState.flatCells.slice().sort((a, b) => {
        const ma = getReplyCellMeta(a);
        const mb = getReplyCellMeta(b);
        if (mode === "new") return mb.floor - ma.floor;
        return mb.likes - ma.likes || ma.floor - mb.floor;
      });
      placeReplyCells(ordered);
    }
  }
  // 只看楼主时高赞回复块会混入其他用户，隐藏；其余模式恢复显示
  $(".v2p-top-reply-box").toggle(mode !== "op");
  updateReplyViewBar();
  return true;
}

function setupReplyView() {
  if (!replyViewState && $commentCells.length > 0) {
    $(".v2p-reply-view-bar").remove();
    const $bar = $(`
      <div class="v2p-reply-view-bar">
        <span class="v2p-reply-view-btn" data-mode="default">默认</span>
        <span class="v2p-reply-view-btn" data-mode="new">最新</span>
        <span class="v2p-reply-view-btn" data-mode="hot">最热</span>
        <span class="v2p-reply-view-btn" data-mode="op">只看楼主</span>
        <span class="v2p-reply-view-tip">排序 / 筛选仅本页</span>
        <form class="v2p-floor-jump" role="search">
          <input class="v2p-floor-jump-input" type="number" inputmode="numeric" min="1" step="1" placeholder="楼层" aria-label="楼层直达" title="输入楼层，回车直达">
        </form>
      </div>
    `);
    $commentCells.first().before($bar);
    $bar.find(".v2p-reply-view-btn").on("click", function () {
      if (!applyReplyView(this.dataset.mode)) {
        createToast({ message: "回复列表尚未加载完成", type: "info" });
      }
    });
    $bar.find(".v2p-floor-jump").on("submit", (ev) => {
      ev.preventDefault();
      const floor = Math.trunc(
        Number($bar.find(".v2p-floor-jump-input").val()),
      );
      if (!Number.isFinite(floor) || floor < 1) {
        createToast({ message: "请输入正确的楼层号", type: "info" });
        return;
      }
      $bar.find(".v2p-floor-jump-input").trigger("blur");
      requestFloorJump(floor);
    });
    replyViewState = {
      commentBox: $commentBox[0],
      flatCells: $commentCells.get(),
      anchor: $bar[0],
      snapshot: null,
    };
  }
  updateReplyViewBar();
}

function restoreStoredReplyView() {
  if (!replyViewState) return;
  let stored = null;
  try {
    stored = sessionStorage.getItem(getReplyViewStorageKey());
  } catch {
    stored = null;
  }
  if (stored && stored !== "default" && REPLY_VIEW_MODES.includes(stored)) {
    applyReplyView(stored, { persist: false });
  }
}

// ===== 楼层直达 / 点击 @ 定位 =====
// V2EX 每页 100 条回复，楼层 1-100 在第 1 页，101-200 在第 2 页。
// 跨页时把目标楼层写入 sessionStorage，落地后由 handlePendingFloorJump() 滚动定位。
const FLOOR_PAGE_SIZE = 100;
var lastJumpTargetCell = null;
var lastJumpTargetAt = 0;

function getCurrentTopicPage() {
  const page = Number(new URL(location.href).searchParams.get("p"));
  return Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1;
}
function getFloorJumpStorageKey() {
  return `v2p_jump_floor_${pathTopicId || location.pathname}`;
}
function findCommentCellByFloor(floor) {
  if (typeof $commentCells === "undefined" || !$commentCells?.length) {
    return $();
  }
  return $commentCells
    .filter((_, cell) => getReplyCellMeta(cell).floor === floor)
    .first();
}
function getTopicReplyCount() {
  // 移动端与桌面端都把「N replies」放在 .gray 文本里，取第一个匹配项
  const $count = $("span.gray")
    .filter((_, el) => /(\d+)\s*replies/i.test($(el).text()))
    .first();
  const matched = $count.text().match(/(\d+)\s*replies/i);
  return matched ? Number(matched[1]) : 0;
}
function flashAndScrollCommentCell(cellDom) {
  if (!cellDom) return false;
  const $cell = $(cellDom);
  // 只看楼主模式下目标可能被隐藏，先恢复默认视图再定位
  if ($cell.hasClass("v2p-reply-hidden") && replyViewState) {
    applyReplyView("default");
  }
  cellDom.scrollIntoView({ behavior: "smooth", block: "center" });
  $cell.addClass("v2p-top-reply-flash");
  lastJumpTargetCell = cellDom;
  lastJumpTargetAt = Date.now();
  setTimeout(() => {
    $cell.removeClass("v2p-top-reply-flash");
  }, 1600);
  return true;
}
function requestFloorJump(floor) {
  const currentPage = getCurrentTopicPage();
  const replyCount = getTopicReplyCount();
  if (replyCount > 0 && floor > replyCount) {
    createToast({
      message: `该主题只有 ${replyCount} 条回复`,
      type: "info",
    });
    return false;
  }
  const targetPage = Math.max(1, Math.ceil(floor / FLOOR_PAGE_SIZE));
  const $target = findCommentCellByFloor(floor);
  if ($target.length > 0) {
    flashAndScrollCommentCell($target[0]);
    return true;
  }
  if (targetPage === currentPage) {
    createToast({ message: `本页没有第 ${floor} 楼`, type: "info" });
    return false;
  }
  try {
    sessionStorage.setItem(getFloorJumpStorageKey(), String(floor));
  } catch {
    // 隐私模式下 sessionStorage 可能不可用，仍然允许跳页，只是不自动定位
  }
  const url = new URL(location.href);
  url.searchParams.set("p", String(targetPage));
  createToast({
    message: `第 ${floor} 楼在第 ${targetPage} 页，正在前往…`,
    type: "info",
  });
  location.href = url.toString();
  return true;
}
function handlePendingFloorJump() {
  let raw = null;
  try {
    raw = sessionStorage.getItem(getFloorJumpStorageKey());
    if (raw) sessionStorage.removeItem(getFloorJumpStorageKey());
  } catch {
    raw = null;
  }
  if (!raw) return;
  const floor = Number(raw);
  if (!Number.isInteger(floor) || floor < 1) return;
  const $target = findCommentCellByFloor(floor);
  if ($target.length === 0) {
    createToast({
      message: `未能在第 ${getCurrentTopicPage()} 页找到第 ${floor} 楼`,
      type: "info",
    });
    return;
  }
  // 等楼中楼重排与图片占位稳定后再滚动
  setTimeout(() => {
    flashAndScrollCommentCell($target[0]);
  }, 80);
}
// 取出某个 @ 链接后面、下一个 @ 之前的文本里出现的 #楼层
function getFloorAfterMemberLink($cell, linkDom) {
  const links = $cell.find(".reply_content a[href^='/member/']").toArray();
  let node = linkDom.nextSibling;
  let text = "";
  while (node) {
    if (links.indexOf(node) > -1) break;
    text += node.textContent || "";
    node = node.nextSibling;
  }
  const matched = text.match(/#(\d+)/);
  return matched ? Number(matched[1]) : 0;
}
function bindReplyReferenceJump() {
  if (!$commentBox?.length || $commentBox.data("v2p-ref-jump-bound")) return;
  $commentBox.data("v2p-ref-jump-bound", true);
  $commentBox.on(
    "click.v2p-ref-jump",
    ".reply_content a[href^='/member/']",
    function (ev) {
      // 保留「Ctrl / Cmd / Shift + 点击」等原生新标签页行为
      if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
      const name = $(this).text().trim().replace(/^@/, "");
      if (!name) return;
      const $cell = $(this).closest('.cell[id^="r_"]');
      const cellId = $cell.attr("id");
      const dataIndex = commentDataList.findIndex(
        (item) => item.id === cellId,
      );
      if (dataIndex < 0) return;
      const current = commentDataList[dataIndex];
      const links = $cell.find(".reply_content a[href^='/member/']").toArray();
      let floor = getFloorAfterMemberLink($cell, this);
      if (!floor && links.length === 1) {
        floor =
          Number(current.replyFloor) ||
          Number(current.refFloors?.[0]) ||
          0;
      }
      if (floor > 0) {
        ev.preventDefault();
        ev.stopPropagation();
        requestFloorJump(floor);
        return;
      }
      // 没写楼层号时，退回到本页上一条同用户的回复
      let targetId = null;
      for (let i = dataIndex - 1; i >= 0; i--) {
        if (commentDataList[i].memberName === name) {
          targetId = commentDataList[i].id;
          break;
        }
      }
      if (!targetId) return; // 找不到目标，保留默认的用户主页跳转
      const $target = $commentCells
        .filter((_, cell) => cell.id === targetId)
        .first();
      if ($target.length === 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      flashAndScrollCommentCell($target[0]);
    },
  );
}

var init_dom = __esm({
  "src/contents/dom.ts"() {
    "use strict";
    init_content();
  },
});

var init_topic_list = __esm({
  "src/contents/home/topic-list.ts"() {
    "use strict";
    init_toast();
    init_constants();
    init_services();
    init_utils();
    init_globals();
  },
});

// src/contents/home/index.ts
var home_exports = {};
var init_home = __esm({
  "src/contents/home/index.ts"() {
    "use strict";
    init_constants();
    init_utils();
    init_globals();
    init_helpers();
    init_topic_list();
    function handleNodeNavToggle() {
      // 1. 查找包含“节点导航”文本的标题区域
      // 这里的筛选逻辑是为了确保只定位到正确的那个 box
      const $headerSpan = $(".box .cell span.fade").filter((_, el) => {
        return $(el).text().includes("节点导航");
      });

      if ($headerSpan.length === 0) return;

      // 2. 获取容器和需要折叠的内容
      // 逻辑：找到父级 .box，然后选取除了第一个子元素（标题栏）以外的所有子元素
      const $box = $headerSpan.closest(".box");
      const $headerCell = $headerSpan.closest(".cell");
      const $content = $box.children().not(":first-child");

      // 3. 定义存储 Key
      const STORAGE_KEY = "v2p_nav_collapsed";

      // 4. 创建切换按钮
      // 使用 v2p-hover-btn 类以保持样式一致，行内样式微调位置
      const $toggleBtn = $(
        '<a href="javascript:void(0);" class="v2p-hover-btn" style="margin-left: 10px; display: inline-flex; justify-content: center; align-items: center; color: #ccc; vertical-align: text-bottom;"></a>',
      );

      const icons = {
        arrowUp:
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
        arrowDown:
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
      };

      // 5. 定义切换状态的逻辑
      const applyState = (isCollapsed) => {
        if (isCollapsed) {
          $content.hide();
          $toggleBtn.html(icons.arrowDown); // 折叠状态显示“向下展开”
          // 稍微减小 box 的下边距，折叠后看起来更紧凑
          $box.css("margin-bottom", "10px");
          $headerCell.css("border-bottom", "none");
        } else {
          $content.show();
          $toggleBtn.html(icons.arrowUp); // 展开状态显示“向上收起”
          $box.css("margin-bottom", "");
          $headerCell.css("border-bottom", "");
        }
        // 存储状态：'1' 为折叠，'0' 为展开
        localStorage.setItem(STORAGE_KEY, isCollapsed ? "1" : "0");
      };

      // 6. 绑定点击事件
      $toggleBtn.on("click", function () {
        const isContentVisible = $content.is(":visible");
        // 如果当前内容可见，则点击意图是折叠 (isCollapsed = true)
        applyState(isContentVisible);
      });

      // 7. 初始化：读取存储的状态并应用
      const savedState = localStorage.getItem(STORAGE_KEY) === "1";
      applyState(savedState);

      // 8. 将按钮插入到“节点导航”文字后面
      $headerSpan.append($toggleBtn);
    }

    // 通用的右侧边栏区域折叠功能
    function handleSidebarSectionToggle(sectionTitle, storageKey) {
      // 1. 查找包含指定文本的标题区域
      const $headerSpan = $(
        "#Rightbar .box .cell span.fade, #Rightbar .box .inner span.fade, #Rightbar .box .inner span.f12.gray, #Rightbar .box .cell span.f12.gray",
      ).filter((_, el) => {
        return $(el).text().trim() === sectionTitle;
      });

      if ($headerSpan.length === 0) return;

      // 如果是"我收藏的节点"，将字体样式改为和其他栏一致的 fade 类
      if (sectionTitle === "我收藏的节点") {
        $headerSpan.removeClass("f12 gray").addClass("fade");
      }

      // 2. 获取容器和需要折叠的内容
      const $box = $headerSpan.closest(".box");
      const $headerContainer = $headerSpan.closest(".cell, .inner");
      const $content = $box.children().not($headerContainer);

      // 标记为可排序区块
      $box.attr("data-v2p-sortable", sectionTitle);

      // 3. 创建切换按钮
      const $toggleBtn = $(
        '<a href="javascript:void(0);" class="v2p-hover-btn" style="margin-left: 10px; display: inline-flex; justify-content: center; align-items: center; color: #ccc; vertical-align: text-bottom;"></a>',
      );

      const icons = {
        arrowUp:
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
        arrowDown:
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
      };

      // 4. 定义切换状态的逻辑
      const applyState = (isCollapsed) => {
        if (isCollapsed) {
          $content.hide();
          $toggleBtn.html(icons.arrowDown);
          $box.css("margin-bottom", "10px");
          $headerContainer.css("border-bottom", "none");
        } else {
          $content.show();
          $toggleBtn.html(icons.arrowUp);
          $box.css("margin-bottom", "");
          $headerContainer.css("border-bottom", "");
        }
        localStorage.setItem(storageKey, isCollapsed ? "1" : "0");
      };

      // 5. 绑定点击事件
      $toggleBtn.on("click", function () {
        const isContentVisible = $content.is(":visible");
        applyState(isContentVisible);
      });

      // 6. 初始化：读取存储的状态并应用
      const savedState = localStorage.getItem(storageKey) === "1";
      applyState(savedState);

      // 7. 将按钮插入到标题文字后面
      $headerSpan.append($toggleBtn);
    }

    // 右侧边栏拖拽排序功能
    function handleSidebarDragSort() {
      const STORAGE_KEY = "v2p_sidebar_order";
      const $sortableBoxes = $("#Rightbar [data-v2p-sortable]");
      if ($sortableBoxes.length < 2) return;

      // 添加拖拽相关 CSS
      $("<style>")
        .text(
          "[data-v2p-sortable].v2p-drag-over-top { box-shadow: 0 -2px 0 0 var(--v2p-color-accent, #4a90d9) !important; }" +
            "[data-v2p-sortable].v2p-drag-over-bottom { box-shadow: 0 2px 0 0 var(--v2p-color-accent, #4a90d9) !important; }" +
            ".v2p-drag-handle:hover { opacity: 0.7 !important; }" +
            "[data-v2p-sortable].v2p-dragging { opacity: 0.4; transition: opacity 0.15s; }",
        )
        .appendTo("head");

      // 在每个可排序 box 前插入位置标记（用于记忆原始位置）
      const slots = [];
      $sortableBoxes.each((_, box) => {
        const $slot = $(
          '<span class="v2p-sort-slot" style="display:none;"></span>',
        );
        $(box).before($slot);
        slots.push($slot[0]);
      });

      // 为每个可排序区块的标题添加拖拽手柄
      $sortableBoxes.each((_, box) => {
        const $box = $(box);
        const $header = $box.children(".cell, .inner").first();
        const $fadeSpan = $header.find("span.fade").first();
        const $dragHandle = $(
          '<span class="v2p-drag-handle" style="cursor: grab; display: inline-flex; align-items: center; margin-right: 4px; opacity: 0.3; vertical-align: text-bottom;" title="拖拽排序">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/>' +
            '<circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>' +
            '<circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>' +
            "</svg>" +
            "</span>",
        );
        $fadeSpan.before($dragHandle);

        // 只有从拖拽手柄按下时才允许拖拽
        $dragHandle.on("mousedown", function () {
          $box.attr("draggable", "true");
        });
      });

      // 全局 mouseup 取消 draggable 状态
      $(document).on("mouseup", function () {
        $sortableBoxes.removeAttr("draggable");
      });

      // HTML5 Drag and Drop 事件设置
      let dragSrcBox = null;

      $sortableBoxes.each((_, box) => {
        box.addEventListener("dragstart", function (e) {
          dragSrcBox = box;
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", "");
          setTimeout(() => {
            box.classList.add("v2p-dragging");
          }, 0);
        });

        box.addEventListener("dragend", function () {
          box.classList.remove("v2p-dragging");
          $("[data-v2p-sortable]").removeClass(
            "v2p-drag-over-top v2p-drag-over-bottom",
          );
          box.removeAttribute("draggable");
          dragSrcBox = null;
        });

        box.addEventListener("dragover", function (e) {
          if (!dragSrcBox || dragSrcBox === box) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";

          const rect = box.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const $box = $(box);
          $box.removeClass("v2p-drag-over-top v2p-drag-over-bottom");
          if (e.clientY < midY) {
            $box.addClass("v2p-drag-over-top");
          } else {
            $box.addClass("v2p-drag-over-bottom");
          }
        });

        box.addEventListener("dragleave", function () {
          $(box).removeClass("v2p-drag-over-top v2p-drag-over-bottom");
        });

        box.addEventListener("drop", function (e) {
          e.stopPropagation();
          e.preventDefault();
          if (!dragSrcBox || dragSrcBox === box) return;

          // 获取当前 DOM 排列顺序
          const currentOrder = [];
          $("#Rightbar [data-v2p-sortable]").each((_, b) => {
            currentOrder.push($(b).attr("data-v2p-sortable"));
          });

          const srcId = $(dragSrcBox).attr("data-v2p-sortable");
          const targetId = $(box).attr("data-v2p-sortable");

          // 从当前顺序中移除被拖拽的项
          const srcIdx = currentOrder.indexOf(srcId);
          currentOrder.splice(srcIdx, 1);

          // 确定插入位置（目标的上方或下方）
          let targetIdx = currentOrder.indexOf(targetId);
          const rect = box.getBoundingClientRect();
          if (e.clientY >= rect.top + rect.height / 2) {
            targetIdx += 1;
          }
          currentOrder.splice(targetIdx, 0, srcId);

          // 应用新顺序并保存
          applyOrder(currentOrder);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentOrder));

          $("[data-v2p-sortable]").removeClass(
            "v2p-drag-over-top v2p-drag-over-bottom",
          );
        });
      });

      // 应用指定顺序到 DOM
      function applyOrder(newOrder) {
        // 先将所有可排序 box 及其后面的 sep20 从 DOM 中卸载
        const detached = {};
        newOrder.forEach((id) => {
          const $box = $(`#Rightbar [data-v2p-sortable="${id}"]`);
          const $sep = $box.next(".sep20");
          detached[id] = { $box, $sep };
          $sep.detach();
          $box.detach();
        });

        // 按新顺序重新插入到各个位置标记后面
        newOrder.forEach((id, idx) => {
          const { $box, $sep } = detached[id];
          $(slots[idx]).after($box);
          $box.after($sep);
        });
      }

      // 恢复保存的排列顺序
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const order = JSON.parse(saved);
          const existing = new Set();
          $sortableBoxes.each((_, box) =>
            existing.add($(box).attr("data-v2p-sortable")),
          );
          if (
            order.length === existing.size &&
            order.every((id) => existing.has(id))
          ) {
            applyOrder(order);
          }
        } catch (e) {
          /* 忽略无效的保存数据 */
        }
      }
    }

    // 将"创作新主题"合并到用户信息卡片中
    function mergeCreateTopicToUserCard() {
      // 查找用户信息卡片（包含 #member-activity）
      const $userCard = $("#member-activity").closest(".box");
      if ($userCard.length === 0) return;

      // 查找"创作新主题"区块（通过 /write 链接识别）
      const $writeLink = $('#Rightbar a[href="/write"]').first();
      if ($writeLink.length === 0) return;

      const $writeBox = $writeLink.closest(".box");
      if ($writeBox.length === 0 || $writeBox[0] === $userCard[0]) return;

      // 获取"创作新主题"的 cell 并移到用户卡片末尾
      const $writeCell = $writeLink.closest(".cell");
      $userCard.append($writeCell);

      // 移除空的原 box 及其前面的分隔符
      $writeBox.prev(".sep").remove();
      $writeBox.remove();
    }

    void (async () => {
      const storage = await getStorage();
      const options = storage["options" /* Options */];
      {
        $("#Main .tab").addClass("v2p-hover-btn");
        if (options.openInNewTab) {
          $(
            '#Main .topic-link, .item_hot_topic_title > a, .item_node, a[href="/write"]',
          ).prop("target", "_blank");
        }
      }
      handleNodeNavToggle();

      // 将"创作新主题"合并到用户信息卡片
      mergeCreateTopicToUserCard();

      // 为右侧边栏的各个区域添加折叠功能
      handleSidebarSectionToggle(
        "我收藏的节点",
        "v2p_sidebar_fav_nodes_collapsed",
      );
      handleSidebarSectionToggle(
        "今日热议主题",
        "v2p_sidebar_hot_topics_collapsed",
      );
      handleSidebarSectionToggle("最热节点", "v2p_sidebar_hot_nodes_collapsed");
      handleSidebarSectionToggle(
        "最近新增节点",
        "v2p_sidebar_new_nodes_collapsed",
      );
      handleSidebarSectionToggle(
        "社区运行状况",
        "v2p_sidebar_community_status_collapsed",
      );

      // 为右侧边栏添加拖拽排序功能
      handleSidebarDragSort();

      loadIcons();
    })();
  },
});

// node_modules/.pnpm/@floating-ui+utils@0.2.3/node_modules/@floating-ui/utils/dist/floating-ui.utils.mjs
function clamp(start, value, end) {
  return max(start, min(value, end));
}
function evaluate(value, param) {
  return typeof value === "function" ? value(param) : value;
}
function getSide(placement) {
  return placement.split("-")[0];
}
function getAlignment(placement) {
  return placement.split("-")[1];
}
function getOppositeAxis(axis) {
  return axis === "x" ? "y" : "x";
}
function getAxisLength(axis) {
  return axis === "y" ? "height" : "width";
}
function getSideAxis(placement) {
  return ["top", "bottom"].includes(getSide(placement)) ? "y" : "x";
}
function getAlignmentAxis(placement) {
  return getOppositeAxis(getSideAxis(placement));
}
function getAlignmentSides(placement, rects, rtl) {
  if (rtl === void 0) {
    rtl = false;
  }
  const alignment = getAlignment(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const length = getAxisLength(alignmentAxis);
  let mainAlignmentSide =
    alignmentAxis === "x"
      ? alignment === (rtl ? "end" : "start")
        ? "right"
        : "left"
      : alignment === "start"
        ? "bottom"
        : "top";
  if (rects.reference[length] > rects.floating[length]) {
    mainAlignmentSide = getOppositePlacement(mainAlignmentSide);
  }
  return [mainAlignmentSide, getOppositePlacement(mainAlignmentSide)];
}
function getExpandedPlacements(placement) {
  const oppositePlacement = getOppositePlacement(placement);
  return [
    getOppositeAlignmentPlacement(placement),
    oppositePlacement,
    getOppositeAlignmentPlacement(oppositePlacement),
  ];
}
function getOppositeAlignmentPlacement(placement) {
  return placement.replace(
    /start|end/g,
    (alignment) => oppositeAlignmentMap[alignment],
  );
}
function getSideList(side, isStart, rtl) {
  const lr = ["left", "right"];
  const rl = ["right", "left"];
  const tb = ["top", "bottom"];
  const bt = ["bottom", "top"];
  switch (side) {
    case "top":
    case "bottom":
      if (rtl) return isStart ? rl : lr;
      return isStart ? lr : rl;
    case "left":
    case "right":
      return isStart ? tb : bt;
    default:
      return [];
  }
}
function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
  const alignment = getAlignment(placement);
  let list = getSideList(getSide(placement), direction === "start", rtl);
  if (alignment) {
    list = list.map((side) => side + "-" + alignment);
    if (flipAlignment) {
      list = list.concat(list.map(getOppositeAlignmentPlacement));
    }
  }
  return list;
}
function getOppositePlacement(placement) {
  return placement.replace(
    /left|right|bottom|top/g,
    (side) => oppositeSideMap[side],
  );
}
function expandPaddingObject(padding) {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...padding,
  };
}
function getPaddingObject(padding) {
  return typeof padding !== "number"
    ? expandPaddingObject(padding)
    : {
        top: padding,
        right: padding,
        bottom: padding,
        left: padding,
      };
}
function rectToClientRect(rect) {
  const { x, y, width, height } = rect;
  return {
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    x,
    y,
  };
}
var min, max, oppositeSideMap, oppositeAlignmentMap;
var init_floating_ui_utils = __esm({
  "node_modules/.pnpm/@floating-ui+utils@0.2.3/node_modules/@floating-ui/utils/dist/floating-ui.utils.mjs"() {
    "use strict";
    min = Math.min;
    max = Math.max;
    oppositeSideMap = {
      left: "right",
      right: "left",
      bottom: "top",
      top: "bottom",
    };
    oppositeAlignmentMap = {
      start: "end",
      end: "start",
    };
  },
});

// node_modules/.pnpm/@floating-ui+core@1.6.3/node_modules/@floating-ui/core/dist/floating-ui.core.mjs
function computeCoordsFromPlacement(_ref, placement, rtl) {
  let { reference, floating } = _ref;
  const sideAxis = getSideAxis(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const alignLength = getAxisLength(alignmentAxis);
  const side = getSide(placement);
  const isVertical = sideAxis === "y";
  const commonX = reference.x + reference.width / 2 - floating.width / 2;
  const commonY = reference.y + reference.height / 2 - floating.height / 2;
  const commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2;
  let coords;
  switch (side) {
    case "top":
      coords = {
        x: commonX,
        y: reference.y - floating.height,
      };
      break;
    case "bottom":
      coords = {
        x: commonX,
        y: reference.y + reference.height,
      };
      break;
    case "right":
      coords = {
        x: reference.x + reference.width,
        y: commonY,
      };
      break;
    case "left":
      coords = {
        x: reference.x - floating.width,
        y: commonY,
      };
      break;
    default:
      coords = {
        x: reference.x,
        y: reference.y,
      };
  }
  switch (getAlignment(placement)) {
    case "start":
      coords[alignmentAxis] -= commonAlign * (rtl && isVertical ? -1 : 1);
      break;
    case "end":
      coords[alignmentAxis] += commonAlign * (rtl && isVertical ? -1 : 1);
      break;
  }
  return coords;
}
async function detectOverflow(state, options) {
  var _await$platform$isEle;
  if (options === void 0) {
    options = {};
  }
  const { x, y, platform: platform2, rects, elements, strategy } = state;
  const {
    boundary = "clippingAncestors",
    rootBoundary = "viewport",
    elementContext = "floating",
    altBoundary = false,
    padding = 0,
  } = evaluate(options, state);
  const paddingObject = getPaddingObject(padding);
  const altContext = elementContext === "floating" ? "reference" : "floating";
  const element = elements[altBoundary ? altContext : elementContext];
  const clippingClientRect = rectToClientRect(
    await platform2.getClippingRect({
      element: (
        (_await$platform$isEle = await (platform2.isElement == null
          ? void 0
          : platform2.isElement(element))) != null
          ? _await$platform$isEle
          : true
      )
        ? element
        : element.contextElement ||
          (await (platform2.getDocumentElement == null
            ? void 0
            : platform2.getDocumentElement(elements.floating))),
      boundary,
      rootBoundary,
      strategy,
    }),
  );
  const rect =
    elementContext === "floating"
      ? {
          x,
          y,
          width: rects.floating.width,
          height: rects.floating.height,
        }
      : rects.reference;
  const offsetParent = await (platform2.getOffsetParent == null
    ? void 0
    : platform2.getOffsetParent(elements.floating));
  const offsetScale = (await (platform2.isElement == null
    ? void 0
    : platform2.isElement(offsetParent)))
    ? (await (platform2.getScale == null
        ? void 0
        : platform2.getScale(offsetParent))) || {
        x: 1,
        y: 1,
      }
    : {
        x: 1,
        y: 1,
      };
  const elementClientRect = rectToClientRect(
    platform2.convertOffsetParentRelativeRectToViewportRelativeRect
      ? await platform2.convertOffsetParentRelativeRectToViewportRelativeRect({
          elements,
          rect,
          offsetParent,
          strategy,
        })
      : rect,
  );
  return {
    top:
      (clippingClientRect.top - elementClientRect.top + paddingObject.top) /
      offsetScale.y,
    bottom:
      (elementClientRect.bottom -
        clippingClientRect.bottom +
        paddingObject.bottom) /
      offsetScale.y,
    left:
      (clippingClientRect.left - elementClientRect.left + paddingObject.left) /
      offsetScale.x,
    right:
      (elementClientRect.right -
        clippingClientRect.right +
        paddingObject.right) /
      offsetScale.x,
  };
}
async function convertValueToCoords(state, options) {
  const { placement, platform: platform2, elements } = state;
  const rtl = await (platform2.isRTL == null
    ? void 0
    : platform2.isRTL(elements.floating));
  const side = getSide(placement);
  const alignment = getAlignment(placement);
  const isVertical = getSideAxis(placement) === "y";
  const mainAxisMulti = ["left", "top"].includes(side) ? -1 : 1;
  const crossAxisMulti = rtl && isVertical ? -1 : 1;
  const rawValue = evaluate(options, state);
  let { mainAxis, crossAxis, alignmentAxis } =
    typeof rawValue === "number"
      ? {
          mainAxis: rawValue,
          crossAxis: 0,
          alignmentAxis: null,
        }
      : {
          mainAxis: 0,
          crossAxis: 0,
          alignmentAxis: null,
          ...rawValue,
        };
  if (alignment && typeof alignmentAxis === "number") {
    crossAxis = alignment === "end" ? alignmentAxis * -1 : alignmentAxis;
  }
  return isVertical
    ? {
        x: crossAxis * crossAxisMulti,
        y: mainAxis * mainAxisMulti,
      }
    : {
        x: mainAxis * mainAxisMulti,
        y: crossAxis * crossAxisMulti,
      };
}
var computePosition, flip, offset, shift;
var init_floating_ui_core = __esm({
  "node_modules/.pnpm/@floating-ui+core@1.6.3/node_modules/@floating-ui/core/dist/floating-ui.core.mjs"() {
    "use strict";
    init_floating_ui_utils();
    init_floating_ui_utils();
    computePosition = async (reference, floating, config) => {
      const {
        placement = "bottom",
        strategy = "absolute",
        middleware = [],
        platform: platform2,
      } = config;
      const validMiddleware = middleware.filter(Boolean);
      const rtl = await (platform2.isRTL == null
        ? void 0
        : platform2.isRTL(floating));
      let rects = await platform2.getElementRects({
        reference,
        floating,
        strategy,
      });
      let { x, y } = computeCoordsFromPlacement(rects, placement, rtl);
      let statefulPlacement = placement;
      let middlewareData = {};
      let resetCount = 0;
      for (let i = 0; i < validMiddleware.length; i++) {
        const { name, fn } = validMiddleware[i];
        const {
          x: nextX,
          y: nextY,
          data,
          reset,
        } = await fn({
          x,
          y,
          initialPlacement: placement,
          placement: statefulPlacement,
          strategy,
          middlewareData,
          rects,
          platform: platform2,
          elements: {
            reference,
            floating,
          },
        });
        x = nextX != null ? nextX : x;
        y = nextY != null ? nextY : y;
        middlewareData = {
          ...middlewareData,
          [name]: {
            ...middlewareData[name],
            ...data,
          },
        };
        if (reset && resetCount <= 50) {
          resetCount++;
          if (typeof reset === "object") {
            if (reset.placement) {
              statefulPlacement = reset.placement;
            }
            if (reset.rects) {
              rects =
                reset.rects === true
                  ? await platform2.getElementRects({
                      reference,
                      floating,
                      strategy,
                    })
                  : reset.rects;
            }
            ({ x, y } = computeCoordsFromPlacement(
              rects,
              statefulPlacement,
              rtl,
            ));
          }
          i = -1;
        }
      }
      return {
        x,
        y,
        placement: statefulPlacement,
        strategy,
        middlewareData,
      };
    };
    flip = function (options) {
      if (options === void 0) {
        options = {};
      }
      return {
        name: "flip",
        options,
        async fn(state) {
          var _middlewareData$arrow, _middlewareData$flip;
          const {
            placement,
            middlewareData,
            rects,
            initialPlacement,
            platform: platform2,
            elements,
          } = state;
          const {
            mainAxis: checkMainAxis = true,
            crossAxis: checkCrossAxis = true,
            fallbackPlacements: specifiedFallbackPlacements,
            fallbackStrategy = "bestFit",
            fallbackAxisSideDirection = "none",
            flipAlignment = true,
            ...detectOverflowOptions
          } = evaluate(options, state);
          if (
            (_middlewareData$arrow = middlewareData.arrow) != null &&
            _middlewareData$arrow.alignmentOffset
          ) {
            return {};
          }
          const side = getSide(placement);
          const initialSideAxis = getSideAxis(initialPlacement);
          const isBasePlacement =
            getSide(initialPlacement) === initialPlacement;
          const rtl = await (platform2.isRTL == null
            ? void 0
            : platform2.isRTL(elements.floating));
          const fallbackPlacements =
            specifiedFallbackPlacements ||
            (isBasePlacement || !flipAlignment
              ? [getOppositePlacement(initialPlacement)]
              : getExpandedPlacements(initialPlacement));
          const hasFallbackAxisSideDirection =
            fallbackAxisSideDirection !== "none";
          if (!specifiedFallbackPlacements && hasFallbackAxisSideDirection) {
            fallbackPlacements.push(
              ...getOppositeAxisPlacements(
                initialPlacement,
                flipAlignment,
                fallbackAxisSideDirection,
                rtl,
              ),
            );
          }
          const placements2 = [initialPlacement, ...fallbackPlacements];
          const overflow = await detectOverflow(state, detectOverflowOptions);
          const overflows = [];
          let overflowsData =
            ((_middlewareData$flip = middlewareData.flip) == null
              ? void 0
              : _middlewareData$flip.overflows) || [];
          if (checkMainAxis) {
            overflows.push(overflow[side]);
          }
          if (checkCrossAxis) {
            const sides2 = getAlignmentSides(placement, rects, rtl);
            overflows.push(overflow[sides2[0]], overflow[sides2[1]]);
          }
          overflowsData = [
            ...overflowsData,
            {
              placement,
              overflows,
            },
          ];
          if (!overflows.every((side2) => side2 <= 0)) {
            var _middlewareData$flip2, _overflowsData$filter;
            const nextIndex =
              (((_middlewareData$flip2 = middlewareData.flip) == null
                ? void 0
                : _middlewareData$flip2.index) || 0) + 1;
            const nextPlacement = placements2[nextIndex];
            if (nextPlacement) {
              return {
                data: {
                  index: nextIndex,
                  overflows: overflowsData,
                },
                reset: {
                  placement: nextPlacement,
                },
              };
            }
            let resetPlacement =
              (_overflowsData$filter = overflowsData
                .filter((d) => d.overflows[0] <= 0)
                .sort((a, b) => a.overflows[1] - b.overflows[1])[0]) == null
                ? void 0
                : _overflowsData$filter.placement;
            if (!resetPlacement) {
              switch (fallbackStrategy) {
                case "bestFit": {
                  var _overflowsData$filter2;
                  const placement2 =
                    (_overflowsData$filter2 = overflowsData
                      .filter((d) => {
                        if (hasFallbackAxisSideDirection) {
                          const currentSideAxis = getSideAxis(d.placement);
                          return (
                            currentSideAxis === initialSideAxis || // Create a bias to the `y` side axis due to horizontal
                            // reading directions favoring greater width.
                            currentSideAxis === "y"
                          );
                        }
                        return true;
                      })
                      .map((d) => [
                        d.placement,
                        d.overflows
                          .filter((overflow2) => overflow2 > 0)
                          .reduce((acc, overflow2) => acc + overflow2, 0),
                      ])
                      .sort((a, b) => a[1] - b[1])[0]) == null
                      ? void 0
                      : _overflowsData$filter2[0];
                  if (placement2) {
                    resetPlacement = placement2;
                  }
                  break;
                }
                case "initialPlacement":
                  resetPlacement = initialPlacement;
                  break;
              }
            }
            if (placement !== resetPlacement) {
              return {
                reset: {
                  placement: resetPlacement,
                },
              };
            }
          }
          return {};
        },
      };
    };
    offset = function (options) {
      if (options === void 0) {
        options = 0;
      }
      return {
        name: "offset",
        options,
        async fn(state) {
          var _middlewareData$offse, _middlewareData$arrow;
          const { x, y, placement, middlewareData } = state;
          const diffCoords = await convertValueToCoords(state, options);
          if (
            placement ===
              ((_middlewareData$offse = middlewareData.offset) == null
                ? void 0
                : _middlewareData$offse.placement) &&
            (_middlewareData$arrow = middlewareData.arrow) != null &&
            _middlewareData$arrow.alignmentOffset
          ) {
            return {};
          }
          return {
            x: x + diffCoords.x,
            y: y + diffCoords.y,
            data: {
              ...diffCoords,
              placement,
            },
          };
        },
      };
    };
    shift = function (options) {
      if (options === void 0) {
        options = {};
      }
      return {
        name: "shift",
        options,
        async fn(state) {
          const { x, y, placement } = state;
          const {
            mainAxis: checkMainAxis = true,
            crossAxis: checkCrossAxis = false,
            limiter = {
              fn: (_ref) => {
                let { x: x2, y: y2 } = _ref;
                return {
                  x: x2,
                  y: y2,
                };
              },
            },
            ...detectOverflowOptions
          } = evaluate(options, state);
          const coords = {
            x,
            y,
          };
          const overflow = await detectOverflow(state, detectOverflowOptions);
          const crossAxis = getSideAxis(getSide(placement));
          const mainAxis = getOppositeAxis(crossAxis);
          let mainAxisCoord = coords[mainAxis];
          let crossAxisCoord = coords[crossAxis];
          if (checkMainAxis) {
            const minSide = mainAxis === "y" ? "top" : "left";
            const maxSide = mainAxis === "y" ? "bottom" : "right";
            const min3 = mainAxisCoord + overflow[minSide];
            const max3 = mainAxisCoord - overflow[maxSide];
            mainAxisCoord = clamp(min3, mainAxisCoord, max3);
          }
          if (checkCrossAxis) {
            const minSide = crossAxis === "y" ? "top" : "left";
            const maxSide = crossAxis === "y" ? "bottom" : "right";
            const min3 = crossAxisCoord + overflow[minSide];
            const max3 = crossAxisCoord - overflow[maxSide];
            crossAxisCoord = clamp(min3, crossAxisCoord, max3);
          }
          const limitedCoords = limiter.fn({
            ...state,
            [mainAxis]: mainAxisCoord,
            [crossAxis]: crossAxisCoord,
          });
          return {
            ...limitedCoords,
            data: {
              x: limitedCoords.x - x,
              y: limitedCoords.y - y,
            },
          };
        },
      };
    };
  },
});

// node_modules/.pnpm/@floating-ui+dom@1.4.5/node_modules/@floating-ui/dom/dist/floating-ui.dom.mjs
function getWindow(node) {
  var _node$ownerDocument;
  return (
    (node == null
      ? void 0
      : (_node$ownerDocument = node.ownerDocument) == null
        ? void 0
        : _node$ownerDocument.defaultView) || window
  );
}
function getComputedStyle$1(element) {
  return getWindow(element).getComputedStyle(element);
}
function isNode(value) {
  return value instanceof getWindow(value).Node;
}
function getNodeName(node) {
  if (isNode(node)) {
    return (node.nodeName || "").toLowerCase();
  }
  return "#document";
}
function isHTMLElement(value) {
  return (
    value instanceof HTMLElement ||
    value instanceof getWindow(value).HTMLElement
  );
}
function isShadowRoot(node) {
  if (typeof ShadowRoot === "undefined") {
    return false;
  }
  return (
    node instanceof getWindow(node).ShadowRoot || node instanceof ShadowRoot
  );
}
function isOverflowElement(element) {
  const { overflow, overflowX, overflowY, display } =
    getComputedStyle$1(element);
  return (
    /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) &&
    !["inline", "contents"].includes(display)
  );
}
function isTableElement(element) {
  return ["table", "td", "th"].includes(getNodeName(element));
}
function isContainingBlock(element) {
  const safari = isSafari();
  const css = getComputedStyle$1(element);
  return (
    css.transform !== "none" ||
    css.perspective !== "none" ||
    (css.containerType ? css.containerType !== "normal" : false) ||
    (!safari && (css.backdropFilter ? css.backdropFilter !== "none" : false)) ||
    (!safari && (css.filter ? css.filter !== "none" : false)) ||
    ["transform", "perspective", "filter"].some((value) =>
      (css.willChange || "").includes(value),
    ) ||
    ["paint", "layout", "strict", "content"].some((value) =>
      (css.contain || "").includes(value),
    )
  );
}
function isSafari() {
  if (typeof CSS === "undefined" || !CSS.supports) return false;
  return CSS.supports("-webkit-backdrop-filter", "none");
}
function isLastTraversableNode(node) {
  return ["html", "body", "#document"].includes(getNodeName(node));
}
function getCssDimensions(element) {
  const css = getComputedStyle$1(element);
  let width = parseFloat(css.width) || 0;
  let height = parseFloat(css.height) || 0;
  const hasOffset = isHTMLElement(element);
  const offsetWidth = hasOffset ? element.offsetWidth : width;
  const offsetHeight = hasOffset ? element.offsetHeight : height;
  const shouldFallback =
    round(width) !== offsetWidth || round(height) !== offsetHeight;
  if (shouldFallback) {
    width = offsetWidth;
    height = offsetHeight;
  }
  return {
    width,
    height,
    $: shouldFallback,
  };
}
function isElement(value) {
  return value instanceof Element || value instanceof getWindow(value).Element;
}
function unwrapElement(element) {
  return !isElement(element) ? element.contextElement : element;
}
function getScale(element) {
  const domElement = unwrapElement(element);
  if (!isHTMLElement(domElement)) {
    return createCoords(1);
  }
  const rect = domElement.getBoundingClientRect();
  const { width, height, $: $2 } = getCssDimensions(domElement);
  let x = ($2 ? round(rect.width) : rect.width) / width;
  let y = ($2 ? round(rect.height) : rect.height) / height;
  if (!x || !Number.isFinite(x)) {
    x = 1;
  }
  if (!y || !Number.isFinite(y)) {
    y = 1;
  }
  return {
    x,
    y,
  };
}
function getVisualOffsets(element) {
  const win = getWindow(element);
  if (!isSafari() || !win.visualViewport) {
    return noOffsets;
  }
  return {
    x: win.visualViewport.offsetLeft,
    y: win.visualViewport.offsetTop,
  };
}
function shouldAddVisualOffsets(element, isFixed, floatingOffsetParent) {
  if (isFixed === void 0) {
    isFixed = false;
  }
  if (
    !floatingOffsetParent ||
    (isFixed && floatingOffsetParent !== getWindow(element))
  ) {
    return false;
  }
  return isFixed;
}
function getBoundingClientRect(
  element,
  includeScale,
  isFixedStrategy,
  offsetParent,
) {
  if (includeScale === void 0) {
    includeScale = false;
  }
  if (isFixedStrategy === void 0) {
    isFixedStrategy = false;
  }
  const clientRect = element.getBoundingClientRect();
  const domElement = unwrapElement(element);
  let scale = createCoords(1);
  if (includeScale) {
    if (offsetParent) {
      if (isElement(offsetParent)) {
        scale = getScale(offsetParent);
      }
    } else {
      scale = getScale(element);
    }
  }
  const visualOffsets = shouldAddVisualOffsets(
    domElement,
    isFixedStrategy,
    offsetParent,
  )
    ? getVisualOffsets(domElement)
    : createCoords(0);
  let x = (clientRect.left + visualOffsets.x) / scale.x;
  let y = (clientRect.top + visualOffsets.y) / scale.y;
  let width = clientRect.width / scale.x;
  let height = clientRect.height / scale.y;
  if (domElement) {
    const win = getWindow(domElement);
    const offsetWin =
      offsetParent && isElement(offsetParent)
        ? getWindow(offsetParent)
        : offsetParent;
    let currentIFrame = win.frameElement;
    while (currentIFrame && offsetParent && offsetWin !== win) {
      const iframeScale = getScale(currentIFrame);
      const iframeRect = currentIFrame.getBoundingClientRect();
      const css = getComputedStyle(currentIFrame);
      const left =
        iframeRect.left +
        (currentIFrame.clientLeft + parseFloat(css.paddingLeft)) *
          iframeScale.x;
      const top =
        iframeRect.top +
        (currentIFrame.clientTop + parseFloat(css.paddingTop)) * iframeScale.y;
      x *= iframeScale.x;
      y *= iframeScale.y;
      width *= iframeScale.x;
      height *= iframeScale.y;
      x += left;
      y += top;
      currentIFrame = getWindow(currentIFrame).frameElement;
    }
  }
  return rectToClientRect({
    width,
    height,
    x,
    y,
  });
}
function getNodeScroll(element) {
  if (isElement(element)) {
    return {
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop,
    };
  }
  return {
    scrollLeft: element.pageXOffset,
    scrollTop: element.pageYOffset,
  };
}
function getDocumentElement(node) {
  var _ref;
  return (_ref =
    (isNode(node) ? node.ownerDocument : node.document) || window.document) ==
    null
    ? void 0
    : _ref.documentElement;
}
function convertOffsetParentRelativeRectToViewportRelativeRect(_ref) {
  let { rect, offsetParent, strategy } = _ref;
  const isOffsetParentAnElement = isHTMLElement(offsetParent);
  const documentElement = getDocumentElement(offsetParent);
  if (offsetParent === documentElement) {
    return rect;
  }
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0,
  };
  let scale = createCoords(1);
  const offsets = createCoords(0);
  if (
    isOffsetParentAnElement ||
    (!isOffsetParentAnElement && strategy !== "fixed")
  ) {
    if (
      getNodeName(offsetParent) !== "body" ||
      isOverflowElement(documentElement)
    ) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isHTMLElement(offsetParent)) {
      const offsetRect = getBoundingClientRect(offsetParent);
      scale = getScale(offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    }
  }
  return {
    width: rect.width * scale.x,
    height: rect.height * scale.y,
    x: rect.x * scale.x - scroll.scrollLeft * scale.x + offsets.x,
    y: rect.y * scale.y - scroll.scrollTop * scale.y + offsets.y,
  };
}
function getClientRects(element) {
  return Array.from(element.getClientRects());
}
function getWindowScrollBarX(element) {
  return (
    getBoundingClientRect(getDocumentElement(element)).left +
    getNodeScroll(element).scrollLeft
  );
}
function getDocumentRect(element) {
  const html = getDocumentElement(element);
  const scroll = getNodeScroll(element);
  const body = element.ownerDocument.body;
  const width = max2(
    html.scrollWidth,
    html.clientWidth,
    body.scrollWidth,
    body.clientWidth,
  );
  const height = max2(
    html.scrollHeight,
    html.clientHeight,
    body.scrollHeight,
    body.clientHeight,
  );
  let x = -scroll.scrollLeft + getWindowScrollBarX(element);
  const y = -scroll.scrollTop;
  if (getComputedStyle$1(body).direction === "rtl") {
    x += max2(html.clientWidth, body.clientWidth) - width;
  }
  return {
    width,
    height,
    x,
    y,
  };
}
function getParentNode(node) {
  if (getNodeName(node) === "html") {
    return node;
  }
  const result =
    // Step into the shadow DOM of the parent of a slotted node.
    node.assignedSlot || // DOM Element detected.
    node.parentNode || // ShadowRoot detected.
    (isShadowRoot(node) && node.host) || // Fallback.
    getDocumentElement(node);
  return isShadowRoot(result) ? result.host : result;
}
function getNearestOverflowAncestor(node) {
  const parentNode = getParentNode(node);
  if (isLastTraversableNode(parentNode)) {
    return node.ownerDocument ? node.ownerDocument.body : node.body;
  }
  if (isHTMLElement(parentNode) && isOverflowElement(parentNode)) {
    return parentNode;
  }
  return getNearestOverflowAncestor(parentNode);
}
function getOverflowAncestors(node, list) {
  var _node$ownerDocument;
  if (list === void 0) {
    list = [];
  }
  const scrollableAncestor = getNearestOverflowAncestor(node);
  const isBody =
    scrollableAncestor ===
    ((_node$ownerDocument = node.ownerDocument) == null
      ? void 0
      : _node$ownerDocument.body);
  const win = getWindow(scrollableAncestor);
  if (isBody) {
    return list.concat(
      win,
      win.visualViewport || [],
      isOverflowElement(scrollableAncestor) ? scrollableAncestor : [],
    );
  }
  return list.concat(
    scrollableAncestor,
    getOverflowAncestors(scrollableAncestor),
  );
}
function getViewportRect(element, strategy) {
  const win = getWindow(element);
  const html = getDocumentElement(element);
  const visualViewport = win.visualViewport;
  let width = html.clientWidth;
  let height = html.clientHeight;
  let x = 0;
  let y = 0;
  if (visualViewport) {
    width = visualViewport.width;
    height = visualViewport.height;
    const visualViewportBased = isSafari();
    if (!visualViewportBased || (visualViewportBased && strategy === "fixed")) {
      x = visualViewport.offsetLeft;
      y = visualViewport.offsetTop;
    }
  }
  return {
    width,
    height,
    x,
    y,
  };
}
function getInnerBoundingClientRect(element, strategy) {
  const clientRect = getBoundingClientRect(element, true, strategy === "fixed");
  const top = clientRect.top + element.clientTop;
  const left = clientRect.left + element.clientLeft;
  const scale = isHTMLElement(element) ? getScale(element) : createCoords(1);
  const width = element.clientWidth * scale.x;
  const height = element.clientHeight * scale.y;
  const x = left * scale.x;
  const y = top * scale.y;
  return {
    width,
    height,
    x,
    y,
  };
}
function getClientRectFromClippingAncestor(
  element,
  clippingAncestor,
  strategy,
) {
  let rect;
  if (clippingAncestor === "viewport") {
    rect = getViewportRect(element, strategy);
  } else if (clippingAncestor === "document") {
    rect = getDocumentRect(getDocumentElement(element));
  } else if (isElement(clippingAncestor)) {
    rect = getInnerBoundingClientRect(clippingAncestor, strategy);
  } else {
    const visualOffsets = getVisualOffsets(element);
    rect = {
      ...clippingAncestor,
      x: clippingAncestor.x - visualOffsets.x,
      y: clippingAncestor.y - visualOffsets.y,
    };
  }
  return rectToClientRect(rect);
}
function hasFixedPositionAncestor(element, stopNode) {
  const parentNode = getParentNode(element);
  if (
    parentNode === stopNode ||
    !isElement(parentNode) ||
    isLastTraversableNode(parentNode)
  ) {
    return false;
  }
  return (
    getComputedStyle$1(parentNode).position === "fixed" ||
    hasFixedPositionAncestor(parentNode, stopNode)
  );
}
function getClippingElementAncestors(element, cache) {
  const cachedResult = cache.get(element);
  if (cachedResult) {
    return cachedResult;
  }
  let result = getOverflowAncestors(element).filter(
    (el) => isElement(el) && getNodeName(el) !== "body",
  );
  let currentContainingBlockComputedStyle = null;
  const elementIsFixed = getComputedStyle$1(element).position === "fixed";
  let currentNode = elementIsFixed ? getParentNode(element) : element;
  while (isElement(currentNode) && !isLastTraversableNode(currentNode)) {
    const computedStyle = getComputedStyle$1(currentNode);
    const currentNodeIsContaining = isContainingBlock(currentNode);
    if (!currentNodeIsContaining && computedStyle.position === "fixed") {
      currentContainingBlockComputedStyle = null;
    }
    const shouldDropCurrentNode = elementIsFixed
      ? !currentNodeIsContaining && !currentContainingBlockComputedStyle
      : (!currentNodeIsContaining &&
          computedStyle.position === "static" &&
          !!currentContainingBlockComputedStyle &&
          ["absolute", "fixed"].includes(
            currentContainingBlockComputedStyle.position,
          )) ||
        (isOverflowElement(currentNode) &&
          !currentNodeIsContaining &&
          hasFixedPositionAncestor(element, currentNode));
    if (shouldDropCurrentNode) {
      result = result.filter((ancestor) => ancestor !== currentNode);
    } else {
      currentContainingBlockComputedStyle = computedStyle;
    }
    currentNode = getParentNode(currentNode);
  }
  cache.set(element, result);
  return result;
}
function getClippingRect(_ref) {
  let { element, boundary, rootBoundary, strategy } = _ref;
  const elementClippingAncestors =
    boundary === "clippingAncestors"
      ? getClippingElementAncestors(element, this._c)
      : [].concat(boundary);
  const clippingAncestors = [...elementClippingAncestors, rootBoundary];
  const firstClippingAncestor = clippingAncestors[0];
  const clippingRect = clippingAncestors.reduce(
    (accRect, clippingAncestor) => {
      const rect = getClientRectFromClippingAncestor(
        element,
        clippingAncestor,
        strategy,
      );
      accRect.top = max2(rect.top, accRect.top);
      accRect.right = min2(rect.right, accRect.right);
      accRect.bottom = min2(rect.bottom, accRect.bottom);
      accRect.left = max2(rect.left, accRect.left);
      return accRect;
    },
    getClientRectFromClippingAncestor(element, firstClippingAncestor, strategy),
  );
  return {
    width: clippingRect.right - clippingRect.left,
    height: clippingRect.bottom - clippingRect.top,
    x: clippingRect.left,
    y: clippingRect.top,
  };
}
function getDimensions(element) {
  return getCssDimensions(element);
}
function getRectRelativeToOffsetParent(element, offsetParent, strategy) {
  const isOffsetParentAnElement = isHTMLElement(offsetParent);
  const documentElement = getDocumentElement(offsetParent);
  const isFixed = strategy === "fixed";
  const rect = getBoundingClientRect(element, true, isFixed, offsetParent);
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0,
  };
  const offsets = createCoords(0);
  if (isOffsetParentAnElement || (!isOffsetParentAnElement && !isFixed)) {
    if (
      getNodeName(offsetParent) !== "body" ||
      isOverflowElement(documentElement)
    ) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isHTMLElement(offsetParent)) {
      const offsetRect = getBoundingClientRect(
        offsetParent,
        true,
        isFixed,
        offsetParent,
      );
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    } else if (documentElement) {
      offsets.x = getWindowScrollBarX(documentElement);
    }
  }
  return {
    x: rect.left + scroll.scrollLeft - offsets.x,
    y: rect.top + scroll.scrollTop - offsets.y,
    width: rect.width,
    height: rect.height,
  };
}
function getTrueOffsetParent(element, polyfill) {
  if (
    !isHTMLElement(element) ||
    getComputedStyle$1(element).position === "fixed"
  ) {
    return null;
  }
  if (polyfill) {
    return polyfill(element);
  }
  return element.offsetParent;
}
function getContainingBlock(element) {
  let currentNode = getParentNode(element);
  while (isHTMLElement(currentNode) && !isLastTraversableNode(currentNode)) {
    if (isContainingBlock(currentNode)) {
      return currentNode;
    } else {
      currentNode = getParentNode(currentNode);
    }
  }
  return null;
}
function getOffsetParent(element, polyfill) {
  const window2 = getWindow(element);
  if (!isHTMLElement(element)) {
    return window2;
  }
  let offsetParent = getTrueOffsetParent(element, polyfill);
  while (
    offsetParent &&
    isTableElement(offsetParent) &&
    getComputedStyle$1(offsetParent).position === "static"
  ) {
    offsetParent = getTrueOffsetParent(offsetParent, polyfill);
  }
  if (
    offsetParent &&
    (getNodeName(offsetParent) === "html" ||
      (getNodeName(offsetParent) === "body" &&
        getComputedStyle$1(offsetParent).position === "static" &&
        !isContainingBlock(offsetParent)))
  ) {
    return window2;
  }
  return offsetParent || getContainingBlock(element) || window2;
}
function isRTL(element) {
  return getComputedStyle(element).direction === "rtl";
}
var min2,
  max2,
  round,
  createCoords,
  noOffsets,
  getElementRects,
  platform,
  computePosition2;
var init_floating_ui_dom = __esm({
  "node_modules/.pnpm/@floating-ui+dom@1.4.5/node_modules/@floating-ui/dom/dist/floating-ui.dom.mjs"() {
    "use strict";
    init_floating_ui_core();
    init_floating_ui_core();
    min2 = Math.min;
    max2 = Math.max;
    round = Math.round;
    createCoords = (v) => ({
      x: v,
      y: v,
    });
    noOffsets = /* @__PURE__ */ createCoords(0);
    getElementRects = async function (_ref) {
      let { reference, floating, strategy } = _ref;
      const getOffsetParentFn = this.getOffsetParent || getOffsetParent;
      const getDimensionsFn = this.getDimensions;
      return {
        reference: getRectRelativeToOffsetParent(
          reference,
          await getOffsetParentFn(floating),
          strategy,
        ),
        floating: {
          x: 0,
          y: 0,
          ...(await getDimensionsFn(floating)),
        },
      };
    };
    platform = {
      convertOffsetParentRelativeRectToViewportRelativeRect,
      getDocumentElement,
      getClippingRect,
      getOffsetParent,
      getElementRects,
      getClientRects,
      getDimensions,
      getScale,
      isElement,
      isRTL,
    };
    computePosition2 = (reference, floating, options) => {
      const cache = /* @__PURE__ */ new Map();
      const mergedOptions = {
        platform,
        ...options,
      };
      const platformWithCache = {
        ...mergedOptions.platform,
        _c: cache,
      };
      return computePosition(reference, floating, {
        ...mergedOptions,
        platform: platformWithCache,
      });
    };
  },
});

// src/components/popup.ts
function createPopup(props) {
  const {
    root,
    trigger,
    triggerType = "click",
    content,
    options,
    onOpen,
    onClose,
    placement = "bottom-start",
    offsetOptions = { mainAxis: 5, crossAxis: 5 },
  } = props;
  const $popupContent = $('<div class="v2p-popup-content">');
  const $popup = $('<div class="v2p-popup" tabindex="0">')
    .css("visibility", "hidden")
    .append($popupContent);
  root.append($popup);
  if (content) {
    $popup.append(content);
  }
  const popup = $popup.get(0);
  const handleClickOutside = (ev) => {
    if ($(ev.target).closest(popup).length === 0) {
      handlePopupClose();
    }
  };
  const handlePopupClose = () => {
    $popup.css("visibility", "hidden");
    $(document).off("click", handleClickOutside);
    onClose?.();
    popupControl2.onClose?.();
  };
  const handlePopupOpen = ($reference) => {
    if (!$reference) {
      return;
    }
    setTimeout(() => {
      $(document).on("click", handleClickOutside);
    });
    const referenceElement = $reference.get(0);
    computePosition2(referenceElement, popup, {
      placement,
      middleware: [offset(offsetOptions), flip(), shift({ padding: 8 })],
      ...options,
    })
      .then(({ x, y }) => {
        Object.assign(popup.style, {
          left: `${x}px`,
          top: `${y}px`,
        });
        $popup.css("visibility", "visible");
      })
      .catch(() => {
        handlePopupClose();
        createToast({
    message: "Popup \u6E32\u67D3\u5931\u8D25",
    type: "error",
  });
      });
    onOpen?.();
  };
  const popupControl2 = {
    $content: $popupContent,
    isOver: false,
    open: (reference) => {
      handlePopupOpen(reference);
    },
    close: handlePopupClose,
  };
  if (triggerType === "hover") {
    $popup.on("mouseover", () => {
      if (!popupControl2.isOver) {
        popupControl2.isOver = true;
        $popup.off("mouseleave").on("mouseleave", () => {
          popupControl2.isOver = false;
          setTimeout(() => {
            if (!popupControl2.isOver) {
              popupControl2.close();
            }
          }, hoverDelay);
        });
      }
    });
  }
  trigger?.on("click", () => {
    if (popup.style.visibility !== "hidden") {
      handlePopupClose();
    } else {
      handlePopupOpen(trigger);
    }
  });
  return popupControl2;
}
var hoverDelay;
var init_popup = __esm({
  "src/components/popup.ts"() {
    "use strict";
    init_floating_ui_dom();
    init_toast();
    hoverDelay = 350;
  },
});

// src/contents/topic/avatar.ts
function processAvatar(params) {
  const {
    $trigger,
    popupControl: popupControl2,
    commentData,
    shouldWrap = true,
    openInNewTab = false,
    onSetTagsClick,
  } = params;
  const { memberName, memberAvatar, memberLink } = commentData;
  let abortController = null;
  const handleOver = () => {
    popupControl2.close();
    popupControl2.open($trigger);
    const $content = $(`
      <div class="v2p-member-card">
        <div class="v2p-info">
          <div class="v2p-info-left">
            <a class="v2p-avatar-box" href="${memberLink}" target="${openInNewTab ? "_blank" : "_self"}">
              <img class="v2p-avatar" src="${memberAvatar}">
            </a>
          </div>

          <div class="v2p-info-right">
            <div class="v2p-username">
              <a href="${memberLink}" target="${openInNewTab ? "_blank" : "_self"}">${memberName}</a>
            </div>
            <div class="v2p-no v2p-loading"></div>
            <div class="v2p-created-date v2p-loading"></div>
          </div>

          </div>

          <div class="v2p-bio" style="display:none;"></div>

          <div class="v2p-member-card-actions"></div>
      </div>
    `);
    popupControl2.$content.empty().append($content);

    void (async () => {
      if (!memberDataCache.has(memberName)) {
        abortController = new AbortController();
        popupControl2.onClose = () => {
          abortController?.abort();
        };
        try {
          const memberData = await fetchUserInfo(memberName, {
            signal: abortController.signal,
          });
          memberDataCache.set(memberName, {
            ...memberData,
            registerDays: getRegisterDays(memberData.created),
          });
        } catch (err) {
          if (err instanceof Error) {
            $content.html(`<span>${err.message}</span>`);
            if (err.cause === 404) {
              memberDataCache.set(memberName, banned);
            }
          }
          return null;
        }
      }
      const data = memberDataCache.get(memberName);
      if (typeof data === "object") {
        $content
          .find(".v2p-no")
          .removeClass("v2p-loading")
          .text(`V2EX \u7B2C ${data.id} \u53F7\u4F1A\u5458`);
        $content
          .find(".v2p-created-date")
          .removeClass("v2p-loading")
          .text(`\u52A0\u5165\u4E8E ${formatTimestamp(data.created)}`);
        if (data.registerDays <= 30) {
          $content
            .find(".v2p-info-right")
            .append(
              `<div class="v2p-register-days" style="margin: 5px 0;">${data.registerDays <= 15 ? "15" : "30"} \u5929\u5185\u6CE8\u518C</div>`,
            );
        }
        if (data.bio && data.bio.trim().length > 0) {
          $content.find(".v2p-bio").css("disply", "block").text(data.bio);
        }
      } else if (typeof data === "symbol" && data === banned) {
        $content.html(
          "<span>\u67E5\u65E0\u6B64\u7528\u6237\uFF0C\u7591\u4F3C\u5DF2\u88AB\u5C01\u7981</span>",
        );
      }
    })();
  };
  let isOver = false;
  $trigger
    .on("mouseover", () => {
      isOver = true;
      setTimeout(() => {
        if (isOver) {
          handleOver();
        }
      }, hoverDelay);
    })
    .on("mouseleave", () => {
      isOver = false;
      setTimeout(() => {
        if (!popupControl2.isOver && !isOver) {
          popupControl2.close();
        }
      }, hoverDelay);
    });
  if (shouldWrap) {
    $trigger.wrap(
      `<a href="/member/${commentData.memberName}" target="_blank" style="cursor: pointer;">`,
    );
  }
}
var banned, memberDataCache;
var init_avatar = __esm({
  "src/contents/topic/avatar.ts"() {
    "use strict";
    init_button();
    init_popup();
    init_services();
    init_utils();
    init_helpers();
    init_content();
    banned = Symbol();
    memberDataCache = /* @__PURE__ */ new Map();
  },
});

// src/contents/topic/comment.ts
// ===== 高赞回复（对齐 PC 端 functions.createList 的选帖、嵌套与排序逻辑）=====
// 判定回复质量，过滤纯表情 / 纯 @ / 极短无意义灌水回复
function isQualityTopReply(item, minLikeCount) {
  // 包含图片的多媒体回复予以保留
  if (item.hasImage) return true;
  const text = (item.replyText || "").replace(/\s+/g, "");
  // 过滤 [doge] 等常见表情文本及 @用户 #楼层 符号
  const cleanText = text
    .replace(/\[[^\]]+\]/g, "")
    .replace(/@[a-zA-Z0-9_]+/g, "")
    .replace(/#\d+/g, "");
  // 有效字数过少且获赞数未明显大幅超越基础门槛，判定为低质水评
  const superThreshold = Math.max(minLikeCount * 2, 8);
  if (cleanText.length < 4 && item.thankCount < superThreshold) {
    return false;
  }
  return true;
}
// 为子回复挂载父级上下文，解决脱离楼中楼后语义断裂的问题
function attachTopReplyParent(item, replyList) {
  if (!item || item.parent) return item;
  const parentFloor = item.replyFloor;
  const parentUser =
    item.replyUsers && item.replyUsers.length > 0 ? item.replyUsers[0] : null;
  let parentItem = null;
  if (parentFloor && parentFloor > 0) {
    parentItem = replyList.find((r) => r.floor === parentFloor);
  }
  if (!parentItem && parentUser) {
    for (let i = replyList.length - 1; i >= 0; i--) {
      const r = replyList[i];
      if (r.floor < item.floor && r.username === parentUser) {
        parentItem = r;
        break;
      }
    }
  }
  if (parentItem) {
    let cleanParentText = (parentItem.replyText || "")
      .replace(/@[a-zA-Z0-9_]+\s*(#\d+)?/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleanParentText) cleanParentText = "原回复";
    if (cleanParentText.length > 60) {
      cleanParentText = cleanParentText.slice(0, 60) + "...";
    }
    item.parent = {
      id: parentItem.id,
      floor: parentItem.floor,
      username: parentItem.username,
      page: parentItem.page,
      text: cleanParentText,
    };
  }
  return item;
}
// 找出某条回复下的子回复树，同时把讨论数 replyCount 回填到候选池
function findTopReplyChildren(item, endList, all, topReplyList) {
  const attach = (child, childEndList, parent) => {
    child.level = parent.level + 1;
    const rIndex = all.findIndex((v) => v.floor === child.floor);
    if (rIndex > -1) {
      all[rIndex].isUse = true;
    }
    parent.children.push(
      findTopReplyChildren(child, childEndList, all, topReplyList),
    );
  };
  item.children = [];
  const floorReplyList = [];
  for (let i = 0; i < endList.length; i++) {
    const currentItem = endList[i];
    if (currentItem.isUse) continue;
    if (currentItem.replyFloor === item.floor) {
      if (
        currentItem.replyUsers.length === 1 &&
        currentItem.replyUsers[0] === item.username
      ) {
        currentItem.isUse = true;
        floorReplyList.push({
          endList: endList.slice(i + 1),
          currentItem,
        });
      } else {
        currentItem.isWrong = true;
      }
    }
  }
  floorReplyList.reverse().forEach(
    ({ currentItem, endList: childEndList }) => {
      attach(currentItem, childEndList, item);
    },
  );
  const nextMeIndex = endList.findIndex((v) => {
    return (
      v.username === item.username &&
      (v.replyUsers == null ? void 0 : v.replyUsers[0]) !== item.username
    );
  });
  const findList = nextMeIndex > -1 ? endList.slice(0, nextMeIndex) : endList;
  for (let i = 0; i < findList.length; i++) {
    const currentItem = findList[i];
    if (currentItem.isUse) continue;
    if (currentItem.replyUsers.length === 1) {
      if (currentItem.replyFloor !== -1) {
        if (
          (all[currentItem.replyFloor - 1] == null
            ? void 0
            : all[currentItem.replyFloor - 1].username) ===
          currentItem.replyUsers[0]
        ) {
          continue;
        }
      }
      const childEndList = endList.slice(i + 1);
      if (currentItem.username === item.username) {
        if (currentItem.replyUsers[0] === item.username) {
          attach(currentItem, childEndList, item);
        }
        break;
      } else if (currentItem.replyUsers[0] === item.username) {
        attach(currentItem, childEndList, item);
      }
    } else if (currentItem.username === item.username) {
      break;
    }
  }
  item.children = item.children.sort((a, b) => a.floor - b.floor);
  item.replyCount = item.children.reduce((a, b) => {
    return a + (b.children.length ? b.replyCount + 1 : 1);
  }, 0);
  const rIndex = topReplyList.findIndex((v) => v.floor === item.floor);
  if (rIndex > -1) {
    topReplyList[rIndex].children = item.children;
    topReplyList[rIndex].replyCount = item.replyCount;
  }
  return item;
}
// 生成嵌套回复树（只用于取讨论数，不改动页面里已有的楼中楼结构）
function createTopReplyNestedList(allList = [], topReplyList = []) {
  if (!allList.length) return [];
  const nestedList = [];
  allList.forEach((item, index) => {
    const startList = allList.slice(0, index);
    const startReplyUsers = Array.from(
      new Set(startList.map((v) => v.username)),
    );
    const endList = allList.slice(index + 1);
    if (index === 0) {
      nestedList.push(
        findTopReplyChildren(item, endList, allList, topReplyList),
      );
    } else if (!item.isUse) {
      let isOneLevelReply = false;
      if (item.replyUsers.length) {
        if (item.replyUsers.length > 1) {
          isOneLevelReply = true;
        } else {
          isOneLevelReply = !startReplyUsers.find(
            (v) => v === item.replyUsers[0],
          );
        }
      } else {
        isOneLevelReply = true;
      }
      if (isOneLevelReply) {
        item.level = 0;
        nestedList.push(
          findTopReplyChildren(item, endList, allList, topReplyList),
        );
      }
    }
  });
  return nestedList;
}
function toTopReplyItems(commentDataList, page) {
  return commentDataList.map((data) => ({
    id: data.id,
    floor: Number(data.floor),
    username: data.memberName,
    memberLink: data.memberLink,
    thankCount: data.likes,
    replyText: data.content,
    hasImage: data.hasImage,
    imageSrcs: data.imageSrcs,
    replyUsers: data.replyUsers,
    replyFloor: data.replyFloor,
    thanked: data.thanked,
    page,
  }));
}
// 高赞统计需要抓取其它分页。移动端限制总页数与并发数，避免大主题
// 一次打出上百个请求；抓取结果按主题做短期缓存，重复打开时不再重抓。
const TOP_REPLY_FETCH_CONCURRENCY = 4;
const TOP_REPLY_CACHE_TTL = 10 * 60 * 1e3;
const TOP_REPLY_CACHE_VERSION = 1;
const TOP_REPLY_CACHE_PREFIX = "v2p_top_reply_cache:";
const TOP_REPLY_DEFAULT_MAX_PAGES = 20;

function getTopReplyMaxPages(options) {
  const value = Math.trunc(Number(options?.topReply?.maxPages));
  return Number.isFinite(value) && value > 0
    ? value
    : TOP_REPLY_DEFAULT_MAX_PAGES;
}

function getTopReplyTopicKey() {
  return pathTopicId || window.location.pathname;
}

function getTopReplyCacheKey(currentPage, options) {
  const minLikeCount = options?.topReply?.loveMinCount ?? 3;
  const maxTopCount = options?.topReply?.count ?? 5;
  return [
    TOP_REPLY_CACHE_PREFIX + TOP_REPLY_CACHE_VERSION,
    getTopReplyTopicKey(),
    currentPage,
    minLikeCount,
    maxTopCount,
    getTopReplyMaxPages(options),
  ].join(":");
}

function readTopReplyCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const fresh =
      data &&
      data.v === TOP_REPLY_CACHE_VERSION &&
      Array.isArray(data.list) &&
      Date.now() - Number(data.ts) <= TOP_REPLY_CACHE_TTL;
    if (!fresh) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writeTopReplyCache(key, data) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        v: TOP_REPLY_CACHE_VERSION,
        ts: Date.now(),
        ...data,
      }),
    );
  } catch {
    // 隐私模式或配额不足时放弃缓存，不影响正常显示
  }
}

// 用户感谢某条回复后，赞数已变化，清掉当前主题的缓存，下次打开重新统计
function clearTopReplyCache() {
  const prefix = `${TOP_REPLY_CACHE_PREFIX}${TOP_REPLY_CACHE_VERSION}:${getTopReplyTopicKey()}:`;
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // 忽略存储异常
  }
}

// 当前页 DOM 已有数据，不计入抓取名额；超出上限时在其它分页里均匀取样，
// 让大主题的前期、中期和后期回复都有机会进入候选池。
function selectTopReplyPages(pageNumbers, currentPage, maxPages) {
  const allPages = Array.from(new Set([currentPage, ...pageNumbers]))
    .filter((page) => Number.isFinite(page) && page > 0)
    .sort((a, b) => a - b);
  const parsedLimit = Math.trunc(Number(maxPages));
  const limit = Math.max(
    1,
    Number.isFinite(parsedLimit) ? parsedLimit : TOP_REPLY_DEFAULT_MAX_PAGES,
  );
  if (allPages.length <= limit) {
    return {
      fetchPages: allPages.filter((page) => page !== currentPage),
      totalPageCount: allPages.length,
      truncated: false,
    };
  }
  const others = allPages.filter((page) => page !== currentPage);
  const slots = Math.max(0, limit - 1);
  const picked = new Set([currentPage]);
  for (let i = 0; i < slots; i++) {
    const index =
      slots === 1
        ? Math.floor((others.length - 1) / 2)
        : Math.round((i * (others.length - 1)) / (slots - 1));
    picked.add(others[index]);
  }
  return {
    fetchPages: Array.from(picked)
      .filter((page) => page !== currentPage)
      .sort((a, b) => a - b),
    totalPageCount: allPages.length,
    truncated: true,
  };
}

// 限制同时进行的分页请求数量，避免移动端网络与内存瞬时压力过大
async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = {
          status: "fulfilled",
          value: await worker(items[index]),
        };
      } catch (error) {
        results[index] = { status: "rejected", reason: error };
      }
    }
  };
  const workers = Math.min(Math.max(1, Math.trunc(limit) || 1), items.length);
  await Promise.all(Array.from({ length: workers }, () => run()));
  return results;
}

// PC 端同样按「当前页 DOM + 其它分页 HTML」合并全帖回复，这里保持一致
async function collectTopicReplies({ options, commentDataList }) {
  const currentPage =
    Number(new URLSearchParams(window.location.search).get("p")) || 1;
  // 页面顶部与底部各有一组相同的分页链接，直接用会重复抓取同一页，
  // 导致合并后的回复列表出现重复条目（高赞回复里同一楼显示两次）；先去重。
  const pageNumbers = Array.from(
    new Set(
      $commentBox
        .find("a.page_normal")
        .map((_, el) => Number($(el).text()))
        .get()
        .filter(
          (page) => Number.isFinite(page) && page > 0 && page !== currentPage,
        ),
    ),
  );
  const selection = selectTopReplyPages(
    pageNumbers,
    currentPage,
    getTopReplyMaxPages(options),
  );
  const repliesMap = [
    {
      i: currentPage,
      replyList: toTopReplyItems(commentDataList, currentPage),
    },
  ];
  let failedPageCount = 0;
  if (selection.fetchPages.length > 0) {
    const path = window.location.pathname;
    const results = await runWithConcurrency(
      selection.fetchPages,
      TOP_REPLY_FETCH_CONCURRENCY,
      async (page) => {
        const htmlText = await crawlTopicPage(path, String(page));
        const bodyMatch = htmlText.match(/<body[^>]*>([\s\S]+?)<\/body>/i);
        const $body = $(bodyMatch ? bodyMatch[0] : htmlText);
        const $cells = $body.find('.cell[id^="r_"]');
        const pageData = getCommentDataList({
          options,
          $commentTableRows: $cells.find("> table > tbody > tr"),
          $commentCells: $cells,
        });
        return { i: page, replyList: toTopReplyItems(pageData, page) };
      },
    );
    const fulfilled = results.filter(
      (result) => result.status === "fulfilled",
    );
    fulfilled.forEach((result) => repliesMap.push(result.value));
    failedPageCount = selection.fetchPages.length - fulfilled.length;
  }
  return {
    replyList: repliesMap
      .sort((a, b) => a.i - b.i)
      .flatMap((it) => it.replyList),
    totalPageCount: selection.totalPageCount,
    fetchedPageCount: repliesMap.length,
    failedPageCount,
    truncated: selection.truncated,
  };
}
function pickTopReplies(replyList, minLikeCount, maxTopCount) {
  // 过滤满足门槛且有质量的回复；排序基于快照，避免后续嵌套计算污染候选
  const candidates = replyList
    .filter(
      (v) => v.thankCount >= minLikeCount && isQualityTopReply(v, minLikeCount),
    )
    .map((v) => ({ ...v }));
  candidates.forEach((item) => attachTopReplyParent(item, replyList));
  candidates.sort((a, b) => b.thankCount - a.thankCount || a.floor - b.floor);
  // 预选出候选池（扩大池子，为嵌套计算后的讨论数加权预留空间）
  const candidatePool = candidates.slice(0, Math.max(maxTopCount * 3, 15));
  createTopReplyNestedList(
    replyList.map((v) => ({ ...v })),
    candidatePool,
  );
  // 获赞数降序 -> 子回复讨论数降序 -> 楼层先发者优先
  candidatePool.sort((a, b) => {
    const diff = b.thankCount - a.thankCount;
    if (diff !== 0) return diff;
    const replyDiff = (b.replyCount || 0) - (a.replyCount || 0);
    if (replyDiff !== 0) return replyDiff;
    return a.floor - b.floor;
  });
  return candidatePool.slice(0, maxTopCount);
}
function jumpToCommentCell(id, page) {
  const cellDom = document.getElementById(id);
  if (!cellDom) {
    // 该回复在别的分页，当前页没有对应节点，告知用户去哪看
    createToast({
      message: `该回复在第 ${page} 页，翻到该页即可查看`,
      type: "info",
    });
    return;
  }
  cellDom.scrollIntoView({ behavior: "smooth", block: "center" });
  cellDom.classList.add("v2p-top-reply-flash");
  setTimeout(() => {
    cellDom.classList.remove("v2p-top-reply-flash");
  }, 1600);
}
function buildTopReplyNode(item, level = 0) {
  const memberLink = String(item.memberLink ?? `/member/${item.username}`);
  const $item = $(`
    <div class="v2p-top-reply-item${level > 0 ? " v2p-top-reply-child" : ""}" data-id="${item.id}" data-page="${item.page}" style="--v2p-top-reply-level: ${level}">
      <div class="v2p-top-reply-meta">
        <a class="v2p-top-reply-floor" href="#${item.id}">#${item.floor}</a>
        <a class="v2p-top-reply-member" href="${escapeHTML(memberLink)}">${escapeHTML(item.username)}</a>
        <span class="v2p-top-reply-likes"><span class="v2p-icon-heart"><i data-lucide="heart"></i></span> ${item.thankCount}</span>
        <span class="v2p-control v2p-control-thank${item.thanked ? " v2p-thanked" : " v2p-hover-btn"}" data-id="${item.id}" data-member-name="${escapeHTML(item.username)}"><i data-lucide="heart"></i></span>
      </div>
    </div>
  `);
  if (item.parent) {
    $item.append(
      $(`
        <div class="v2p-top-reply-parent" data-id="${item.parent.id}" data-page="${item.parent.page}" title="点击跳转至原回复楼层 #${item.parent.floor}">
          <span class="v2p-top-reply-parent-tag">#${item.parent.floor} @${escapeHTML(item.parent.username)}：</span><span class="v2p-top-reply-parent-text">${escapeHTML(item.parent.text)}</span>
        </div>
      `),
    );
  }
  $item.append(
    $(`<div class="v2p-top-reply-content">${escapeHTML(item.replyText)}</div>`),
  );
  // 副本是纯文本渲染，图片回复单独把原图带出来，避免显示成空白卡片
  if ((item.imageSrcs || []).length > 0) {
    $item.append(
      $(
        `<div class="v2p-top-reply-imgs">${item.imageSrcs
          .map((src) => `<img src="${escapeHTML(String(src))}" alt="" />`)
          .join("")}</div>`,
      ),
    );
  }
  (item.children || []).forEach((child) => {
    $item.append(buildTopReplyNode(child, level + 1));
  });
  return $item;
}
// 原楼层与高赞回复副本共用同一套感谢逻辑：成功后就地同步赞数，不重排列表
function onThankControlClick(ev) {
  ev.stopPropagation();
  const id = ev.currentTarget.dataset.id;
  const memberName = ev.currentTarget.dataset.memberName;
  if (typeof id !== "string" || typeof memberName !== "string") return;
  if (!confirm(`确认花费 10 个铜币向 @${memberName} 的这条回复发送感谢？`)) {
    return;
  }
  const replyId = id.split("_").at(1);
  if (!replyId) return;
  void thankReply({
    replyId,
    onSuccess: () => {
      const $cell = $(`.cell[id="r_${replyId}"]`);
      const $tableInCell = $cell.find("> table");
      const $likesBox = $tableInCell.find(".v2p-likes-box");
      const $firstLikesBox = $likesBox.eq(0);
      const likes = Number($firstLikesBox.text());
      const newLikes = likes > 0 ? likes + 1 : 1;
      const $clonedIconHeart = $firstLikesBox.find(".v2p-icon-heart").clone();
      if (likes > 0) {
        $likesBox
          .addClass("v2p-thanked")
          .empty()
          .append($clonedIconHeart, ` ${newLikes}`);
      } else {
        $(
          `<span class="small v2p-likes-box v2p-thanked" style="position:relative;top:-1px;">
            &nbsp;&nbsp;<span class="v2p-icon-heart"><i data-lucide="heart"></i></span>${newLikes}
          </span>`,
        ).insertAfter(getReplyTimeSpan($tableInCell));
        loadIcons();
      }
      // 高赞回复是同一楼的内容副本，赞数需就地同步；用直接子级定位，
      // 避免把内嵌子回复（它是本条目的后代）自己的赞数一起改掉
      const $copyLikes = $(
        `.v2p-top-reply-item[data-id="r_${replyId}"] > .v2p-top-reply-meta > .v2p-top-reply-likes`,
      );
      if ($copyLikes.length > 0) {
        $copyLikes
          .addClass("v2p-thanked")
          .html(
            `<span class="v2p-icon-heart"><i data-lucide="heart"></i></span> ${newLikes}`,
          );
        loadIcons();
      }
      const $thankAction = $tableInCell.find(".v2p-control-thank");
      $thankAction.addClass("v2p-thanked").off("click");
      $thankAction.siblings().has(".v2p-control-hide").hide();
      $(`.v2p-top-reply-box .v2p-control-thank[data-id="r_${replyId}"]`)
        .addClass("v2p-thanked")
        .removeClass("v2p-hover-btn")
        .off("click");
      clearTopReplyCache();
    },
    onFail: () => {
      createToast({
        message: "感谢回复失败",
        type: "error",
      });
    },
  });
}
async function handleTopReplies({ options, commentDataList }) {
  const topReplyOptions = options.topReply;
  if (!topReplyOptions?.enabled) return;
  if ($commentBox.length === 0) return;
  const minLikeCount = topReplyOptions.loveMinCount ?? 3;
  const maxTopCount = topReplyOptions.count ?? 5;
  const currentPage =
    Number(new URLSearchParams(window.location.search).get("p")) || 1;
  const cacheKey = getTopReplyCacheKey(currentPage, options);
  const cached = readTopReplyCache(cacheKey);
  let topReplyList;
  let scope;
  if (cached) {
    topReplyList = cached.list;
    scope = cached;
  } else {
    const collected = await collectTopicReplies({ options, commentDataList });
    topReplyList = pickTopReplies(
      collected.replyList,
      minLikeCount,
      maxTopCount,
    );
    scope = {
      fetchedPageCount: collected.fetchedPageCount,
      totalPageCount: collected.totalPageCount,
      truncated: collected.truncated,
    };
    // 有分页抓取失败时结果不完整，不写入缓存，下次打开可以重试
    if (collected.failedPageCount === 0) {
      writeTopReplyCache(cacheKey, { ...scope, list: topReplyList });
    }
  }
  if (topReplyList.length === 0) return;
  const $box = $(`
    <div class="cell v2p-top-reply-box">
      <div class="v2p-top-reply-header v2p-hover-btn">
        <span class="v2p-top-reply-title"><i data-lucide="star"></i>高赞回复</span>
        <span class="v2p-top-reply-meta">
          <span class="v2p-top-reply-scope"></span>
          <span class="v2p-top-reply-toggle">收起</span>
        </span>
      </div>
      <div class="v2p-top-reply-list"></div>
    </div>
  `);
  if (scope?.truncated) {
    $box
      .find(".v2p-top-reply-scope")
      .text(`已扫描 ${scope.fetchedPageCount}/${scope.totalPageCount} 页`)
      .attr(
        "title",
        "主题分页较多，高赞仅统计部分页面；可在脚本设置中调整「最多抓取页数」",
      );
  }
  const $list = $box.find(".v2p-top-reply-list");
  topReplyList.forEach((item) => {
    $list.append(buildTopReplyNode(item, 0));
  });
  $box.find(".v2p-top-reply-header").on("click", () => {
    const collapsed = $box
      .toggleClass("v2p-top-reply-collapsed")
      .hasClass("v2p-top-reply-collapsed");
    $box.find(".v2p-top-reply-toggle").text(collapsed ? "展开" : "收起");
  });
  // 副本里的感谢按钮：已感谢过的不再绑定，避免重复弹确认框
  $box.find(".v2p-control-thank:not(.v2p-thanked)").on("click", onThankControlClick);
  const jumpFrom = (target) => {
    const $target = $(target);
    jumpToCommentCell($target.attr("data-id"), $target.attr("data-page"));
  };
  $box.find(".v2p-top-reply-item").on("click", (ev) => {
    if ($(ev.target).closest("a").length) return;
    ev.stopPropagation();
    jumpFrom(ev.currentTarget);
  });
  $box.find(".v2p-top-reply-parent").on("click", (ev) => {
    ev.stopPropagation();
    jumpFrom(ev.currentTarget);
  });
  // 高赞块插在回复列表上方会把内容整体下推，记录插入前目标楼的视口位置
  const shouldRealign =
    lastJumpTargetCell &&
    lastJumpTargetCell.isConnected &&
    Date.now() - lastJumpTargetAt < 10000;
  const beforeTop = shouldRealign
    ? lastJumpTargetCell.getBoundingClientRect().top
    : null;
  $commentBox.before($box);
  // 高赞回复异步加载完成时，恢复的「只看楼主」模式可能已经生效
  $box.toggle(replyViewMode !== "op");
  // 用户刚做过楼层定位且目标仍在视口附近时，补偿插入造成的位移而不再重新居中
  if (shouldRealign && beforeTop !== null) {
    const rect = lastJumpTargetCell.getBoundingClientRect();
    const nearViewport = rect.bottom > 0 && rect.top < window.innerHeight;
    if (nearViewport) {
      window.scrollBy(0, rect.top - beforeTop);
    }
    lastJumpTargetCell = null;
  }
  updateTopReplyMemberTags();
  loadIcons();
}
function processActions($cellDom, data) {
  const $actions = $cellDom.find(
    "> table > tbody > tr > td:last-of-type > .fr",
  );
  const $controls = $('<span class="v2p-controls">');
  const $thankIcon = $(
    `<span
      class="v2p-control v2p-control-thank"
      data-id="${data.id}"
      data-member-name="${data.memberName}"
     >
        <i data-lucide="heart"></i>
     </span>`,
  );
  const thankArea = $actions.find("> .thank_area");
  const thanked = thankArea.hasClass("thanked");
  if (thanked) {
    $thankIcon.addClass("v2p-thanked");
    $controls.append($("<a>").append($thankIcon));
  } else {
    const thankEle = thankArea.find("> .thank");
    const $hide = thankEle.eq(0).removeClass("thank");
    const $thank = thankEle.eq(1).removeClass("thank");
    $hide.html(
      `<span class="v2p-control v2p-hover-btn v2p-control-hide"><i data-lucide="eye-off"></i></span>`,
    );
    $thankIcon.addClass("v2p-hover-btn").replaceAll($thank);
    $controls.append($hide).append($thankIcon);
  }
  const $reply = $actions.find("a:last-of-type");
  // 删除原来的图标 / 文本
  $reply.empty();
  // 插入统一风格的按钮
  $reply.append(
    `<span class="v2p-control v2p-hover-btn v2p-control-reply">
      <i data-lucide="message-square"></i>
   </span>`,
  );
  $controls.append($reply);

  thankArea.remove();
  const floorNum = $actions.find(".no").clone();

  $reply.on("click", () => {
    const replyVal = $replyTextArea.val();
    if (typeof replyVal === "string" && replyVal.length > 0) {
      const floor = floorNum.text();
      const replyComment = commentDataList.find((it) => it.floor === floor);
      if (replyComment) {
        const replyMemberName = replyComment.memberName;
        const moreThanOneReply =
          commentDataList.findIndex(
            (it) => it.memberName === replyMemberName && it.floor !== floor,
          ) !== -1;
        if (moreThanOneReply) {
          insertTextToReplyInput(`#${floor} `);
        } else {
          const $page = $(".v2p-paging")
            .eq(0)
            .find(".page_normal, .page_current");
          if ($page.length > 1) {
            const onLastPage = $page.last().hasClass("page_current");
            if (!onLastPage) {
              insertTextToReplyInput(`#${floor} `);
            }
          }
        }
      }
    }
  });

  // ★ 移动端：点击某一楼（包括楼中楼）高亮这一楼的工具栏
  if (
    $body.hasClass("v2p-mobile") ||
    document.documentElement.classList.contains("v2p-mobile") ||
    window.innerWidth <= 768
  ) {
    $cellDom.on("click.v2p-controls", function (ev) {
      const $target = $(ev.target);

      // 点到工具栏本身 / 链接 / 图片 / 表单控件时，不触发「高亮当前楼」逻辑
      if (
        $target.closest(".v2p-controls").length ||
        $target.closest("a, img, button, input, textarea").length
      ) {
        return;
      }

      // ★ 关键：先在当前这楼的 handler 里阻止事件继续冒泡
      // 这样即使当前楼是楼中楼，也不会再触发父楼的 handler
      ev.stopPropagation();

      // 先把所有楼的工具栏隐藏
      $('.cell[id^="r_"] .v2p-controls').css("opacity", 0);

      // 再只高亮这一楼（用 this = 当前绑定 handler 的 cell）
      $(this).find(".v2p-controls").css("opacity", 0.5);
    });
  }

  $actions.empty().append($controls, floorNum);
}

async function handleComments() {
  const storage = getStorageSync();
  const options = storage["options" /* Options */];
  initMemberTags();
  if (options.replyContent.hideReplyTime) {
    $(".cell .ago").addClass("v2p-auto-hide");
    // 移动版没有 .ago，日期是 span.fade.small，按回复单元补一次
    $commentCells.each((_, cell) => {
      getReplyTimeSpan($(cell)).addClass("v2p-auto-hide");
    });
  }
  const canHideRefName =
    options.nestedReply.display === "indent" &&
    !!options.replyContent.hideRefName;
  commentDataList = getCommentDataList({
    options,
    $commentTableRows,
    $commentCells,
  });
  {
    const memberNames = /* @__PURE__ */ new Set([topicOwnerName]);
    $commentCells.each((i, cellDom) => {
      const currentComment = commentDataList.at(i);
      if (currentComment?.id !== cellDom.id) {
        return;
      }
      const $cellDom = $(cellDom);
      const { memberName, thanked } = currentComment;
      memberNames.add(memberName);
      processAvatar({
        $trigger: $cellDom.find(".avatar, .dark"),
        popupControl,
        commentData: currentComment,
        openInNewTab: options.openInNewTab,
      });
      if (memberName === loginName && !options.hideAccount) {
        $cellDom
          .find(".badges")
          .append(
            `<div class="badge ${memberName === topicOwnerName ? "mod" : "you"}">YOU</div>`,
          );
      }
      const $cellBody = $cellDom.find(
        "> table > tbody > tr > td:nth-child(3)",
      );
      const $likesBox = getLikeSpan($cellBody).addClass("v2p-likes-box");
      $likesBox
        .find('img[alt="\u2764\uFE0F"]')
        .replaceWith(
          '<span class="v2p-icon-heart"><i data-lucide="heart"></i></span>',
        );
      if (thanked) {
        $likesBox.addClass("v2p-thanked");
      }
      processActions($cellDom, currentComment);
      if (canHideRefName) {
        if (currentComment.contentHtml) {
          $cellDom.find(".reply_content").html(currentComment.contentHtml);
        }
      }
    });

    updateCommentCells();

    $(".v2p-control-thank").on("click", onThankControlClick);
    updateMemberTag();
  }
  setupReplyView();
  handleNestedComment({ options, $commentCells, commentDataList });
  captureReplyViewDefaultLayout();
  // 高赞回复要抓取其它分页，放后台进行，避免阻塞本页定位与交互
  restoreStoredReplyView();
  handlePendingFloorJump();
  void handleTopReplies({ options, commentDataList }).catch((err) => {
    console.error("加载高赞回复失败：", err);
  });
  bindReplyReferenceJump();
  {
    const $opAvatar = $topicHeader.find(".avatar");
    const $opName = $topicHeader.find('.gray a[href^="/member"]');
    const memberName = $opAvatar.prop("alt");
    const memberAvatar = $opAvatar.prop("src");
    const memberLink = $topicHeader.find(".fr > a").prop("href");
    if (
      typeof memberName === "string" &&
      typeof memberAvatar === "string" &&
      typeof memberLink === "string"
    ) {
      processAvatar({
        $trigger: $opAvatar,
        popupControl,
        commentData: { memberName, memberAvatar, memberLink },
        openInNewTab: options.openInNewTab,
      });
      processAvatar({
        $trigger: $opName,
        popupControl,
        commentData: { memberName, memberAvatar, memberLink },
        shouldWrap: false,
        openInNewTab: options.openInNewTab,
      });
      fetchUserInfo(memberName).then((memberData) => {
        const registerDays = getRegisterDays(memberData.created);
        memberDataCache.set(memberName, { ...memberData, registerDays });
        if (registerDays <= 30) {
          $opName.append(
            `<span class="v2p-register-days">${registerDays <= 15 ? "15" : "30"} \u5929\u5185\u6CE8\u518C</span>`,
          );
        }
      });
    }
  }
  if (options.replyContent.showImgInPage) {
    window.requestIdleCallback(() => {
      handleTopicImg();
    });
  }
  window.requestIdleCallback(() => {
    replaceCommentEmojiWithHD();
  });
}
var commentDataList, popupControl;
var init_comment = __esm({
  "src/contents/topic/comment.ts"() {
    "use strict";
    init_lucide();
    init_modal();
    init_popup();
    init_toast();
    init_constants();
    init_services();
    init_utils();
    init_dom();
    init_globals();
    init_helpers();
    init_avatar();
    init_content();
    commentDataList = [];
    popupControl = createPopup({
      root: $wrapper,
      triggerType: "hover",
      placement: "right-start",
      offsetOptions: { mainAxis: 8, crossAxis: -4 },
    });
  },
});

var $layoutToggle,
  iconLayoutV,
  iconLayoutH,
  switchToHorizontalLayout,
  switchToVerticalLayout;
var init_layout = __esm({
  "src/contents/topic/layout.ts"() {
    "use strict";
    init_lucide();
    init_constants();
    init_utils();
    init_globals();
    iconLayoutV = createElement$1(PanelTop);
    iconLayoutV.setAttribute("width", "100%");
    iconLayoutV.setAttribute("height", "100%");
    iconLayoutH = createElement$1(PanelRight);
    iconLayoutH.setAttribute("width", "100%");
    iconLayoutH.setAttribute("height", "100%");
  },
});

// src/contents/topic/paging.ts
function handlePaging() {
  const $notCommentCells = $commentBox.find('> .cell:not([id^="r_"])');
  if ($notCommentCells.length <= 1) {
    return;
  }
  const pagingCells = $notCommentCells.slice(1).addClass("v2p-paging");
  const pageBtns = pagingCells.find(".super.button");
  pageBtns.eq(0).addClass("v2p-prev-btn");
  pageBtns.eq(1).addClass("v2p-next-btn");
}
var init_paging = __esm({
  "src/contents/topic/paging.ts"() {
    "use strict";
    init_globals();
  },
});

// src/components/image-upload.ts
function bindImageUpload(props) {
  const { $wrapper: $wrapper2, $input, insertText, replaceText } = props;
  const $uploadBar = $(`<div class="v2p-reply-upload-bar">${uploadTip}</div>`);
  const handleUploadImage = (file) => {
    const placeholder = "[\u4E0A\u4F20\u56FE\u7247\u4E2D...]";
    insertText(` ${placeholder} `);
    $uploadBar
      .addClass("v2p-reply-upload-bar-disabled")
      .text("\u6B63\u5728\u4E0A\u4F20\u56FE\u7247...");
    uploadImage(file)
      .then((imgLink) => {
        replaceText(placeholder, imgLink);
      })
      .catch(() => {
        replaceText(placeholder, "");
        window.alert(
          "\u274C \u4E0A\u4F20\u56FE\u7247\u5931\u8D25\uFF0C\u8BF7\u6253\u5F00\u63A7\u5236\u53F0\u67E5\u770B\u539F\u56E0",
        );
      })
      .finally(() => {
        $uploadBar.removeClass("v2p-reply-upload-bar-disabled").text(uploadTip);
      });
  };
  const handleClickUploadImage = () => {
    const imgInput = document.createElement("input");
    imgInput.style.display = "none";
    imgInput.type = "file";
    imgInput.accept = "image/*";
    imgInput.addEventListener("change", () => {
      const selectedFile = imgInput.files?.[0];
      if (selectedFile) {
        handleUploadImage(selectedFile);
      }
    });
    imgInput.click();
  };
  document.addEventListener("paste", (ev) => {
    if (!(ev instanceof ClipboardEvent)) {
      return;
    }
    if ($input && !$input.get(0)?.matches(":focus")) {
      return;
    }
    const items = ev.clipboardData?.items;
    if (!items) {
      return;
    }
    const imageItem = Array.from(items).find((item) =>
      item.type.includes("image"),
    );
    if (imageItem) {
      ev.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        handleUploadImage(file);
      }
    }
  });
  $wrapper2.get(0)?.addEventListener("drop", (ev) => {
    ev.preventDefault();
    if (!(ev instanceof DragEvent)) {
      return;
    }
    const file = ev.dataTransfer?.files[0];
    if (file) {
      handleUploadImage(file);
    }
  });
  $(".flex-one-row:last-of-type > .gray").text("");
  $uploadBar.on("click", () => {
    if (!$uploadBar.hasClass("v2p-reply-upload-bar-disabled")) {
      handleClickUploadImage();
    }
  });
  $wrapper2.append($uploadBar);
  return {
    uploadBar: $uploadBar,
  };
}
var uploadTip;
var init_image_upload = __esm({
  "src/components/image-upload.ts"() {
    "use strict";
    init_services();
    uploadTip =
      "\u9009\u62E9\u3001\u7C98\u8D34\u3001\u62D6\u653E\u4E0A\u4F20\u56FE\u7247\u3002";
  },
});

// src/contents/topic/reply.ts
function handleReplyActions() {
  const os = getOS();
  const isMac = navigator.userAgent.includes("Mac OS");
  const replyBtnText = `回复<kbd>${isMac ? "Cmd" : "Ctrl"}+Enter</kbd>`;

  const $replyBtn = createButton({
    children: replyBtnText,
    type: "submit",
  }).replaceAll($replyBox.find('input[type="submit"]'));
  $replyForm.on("submit", () => {
    const replyVal = $replyTextArea.val();
    if (typeof replyVal === "string") {
      $replyTextArea.val(transformEmoji(replyVal));
    }
    $replyBtn.text("\u63D0\u4EA4\u56DE\u590D\u4E2D...").prop("disabled", true);
    setTimeout(() => {
      $replyBtn.html(replyBtnText).prop("disabled", false);
    }, 5e3);
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      $replyForm.trigger("submit");
    }
  });
  {
    const emoticonGroup = $('<div class="v2p-emoji-group">');
    const emoticonList = $('<div class="v2p-emoji-list">');
    const emoticonSpan = $('<span class="v2p-emoji">');
    const groups = emoticons.map((emojiGroup) => {
      const group = emoticonGroup.clone();
      const list = emoticonList.clone();
      group.append(`<div class="v2p-emoji-title">${emojiGroup.title}</div>`);
      list.append(
        emojiGroup.list.map((emoji) => {
          const emoticon = emoticonSpan.clone();
          if (emojiGroup.title === "\u6D41\u884C") {
            const emojiLink = emojiLinks[emoji].hd;
            emoticon.html(`<img src="${emojiLink}" />`).prop("title", emoji);
          } else {
            emoticon.text(emoji);
          }
          emoticon.on("click", () => {
            insertTextToReplyInput(emoji);
          });
          return emoticon;
        }),
      );
      group.append(list);
      return group;
    });
    const emoticonsBox = $('<div class="v2p-emoticons-box">').append(groups);
    const $emojiBtn = createButton({
      children:
        '<span style="width:18px; height:18px;"><i data-lucide="smile"></i></span>',
    }).insertAfter($replyBtn);
    const $emojiContent = $('<div class="v2p-emoji-container">')
      .append(emoticonsBox)
      .appendTo($replyBox)
      .on("click", () => {
        focusReplyInput();
      });
    const keyupHandler = (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        emojiPopup.close();
      }
    };
    $emojiBtn.on("click", () => {
      focusReplyInput();
    });
    const emojiPopup = createPopup({
      root: $replyBox,
      trigger: $emojiBtn,
      content: $emojiContent,
      options: {
        placement:
          $body.hasClass("v2p-mobile") ||
          document.documentElement.classList.contains("v2p-mobile") ||
          window.innerWidth <= 768
            ? "bottom"
            : "right-end",
      },
      onOpen: () => {
        $body.on("keydown", keyupHandler);
      },
      onClose: () => {
        $body.off("keydown", keyupHandler);
      },
    });
  }
  {
    $replyBox
      .find("#undock-button, #undock-button + a")
      .addClass("v2p-hover-btn")
      .css("padding", "5px 4px");
  }
}
function handleReply() {
  $replyTextArea
    .attr(
      "placeholder",
      "\u7559\u4E0B\u5BF9\u4ED6\u4EBA\u6709\u5E2E\u52A9\u7684\u56DE\u590D",
    )
    .wrap('<div class="v2p-reply-wrap">');
  const $replyWrap = $(".v2p-reply-wrap");
  const $replyPreview = $('<div class="v2p-reply-preview">');
  $replyPreview.hide().insertAfter($replyWrap);
  bindImageUpload({
    $wrapper: $replyWrap,
    $input: $replyTextArea,
    insertText: (text) => {
      insertTextToReplyInput(text);
    },
    replaceText: (find, replace) => {
      const val = $replyTextArea.val();
      if (typeof val === "string") {
        const newVal = val.replace(find, replace);
        $replyTextArea.val(newVal).trigger("focus");
      }
    },
  });
  {
    const $replyTabs = $('<div class="v2p-reply-tabs">');
    const $replyTabEdit = $(
      '<div class="v2p-reply-tab active">\u7F16\u8F91</div>',
    );
    const $replyTabPreview = $('<div class="v2p-reply-tab">\u9884\u89C8</div>');
    $replyTabEdit
      .on("click", () => {
        $replyTabEdit.addClass("active");
        $replyTabPreview.removeClass("active");
        $replyWrap.show();
        $replyPreview.hide();
      })
      .appendTo($replyTabs);
    let lastPreviewText = null;
    $replyTabPreview
      .on("click", () => {
        if (!$replyTabPreview.hasClass("active")) {
          $replyTabPreview.addClass("active");
          $replyTabEdit.removeClass("active");
          const replyText = $replyTextArea.val();
          if (typeof replyText === "string") {
            $replyWrap.hide();
            $replyPreview.show();
            if (replyText.trim() === "") {
              $replyPreview.html(
                "\u6CA1\u6709\u53EF\u9884\u89C8\u7684\u5185\u5BB9",
              );
            } else {
              const textToPreview = transformEmoji(replyText);
              const handlePreview = async () => {
                $replyPreview.html("\u6B63\u5728\u52A0\u8F7D\u9884\u89C8...");
                try {
                  const renderedContent = await getCommentPreview({
                    text: textToPreview,
                    syntax: "default",
                  });
                  $replyPreview.html(renderedContent);
                  replaceEmojiWithHD($replyPreview.find(".embedded_image"));
                  lastPreviewText = textToPreview;
                } catch {
                  $replyPreview.html(
                    '\u9884\u89C8\u5931\u8D25\uFF0C<a class="v2p-preview-retry">\u70B9\u51FB\u91CD\u8BD5</a>\u3002',
                  );
                  $replyPreview.find(".v2p-preview-retry").on("click", () => {
                    void handlePreview();
                  });
                }
              };
              if (replyText !== lastPreviewText) {
                void handlePreview();
              }
            }
          }
        }
      })
      .appendTo($replyTabs);
    $replyBox
      .find("> .cell:first-of-type > div:first-of-type")
      .replaceWith($replyTabs);
  }
  $(".flex-one-row:last-of-type > .gray").text("");
  handleReplyActions();
}
var init_reply = __esm({
  "src/contents/topic/reply.ts"() {
    "use strict";
    init_button();
    init_image_upload();
    init_popup();
    init_constants();
    init_services();
    init_utils();
    init_globals();
    init_helpers();
  },
});

// 设置项定义：设置弹窗与 /settings#v2p 共用同一份渲染逻辑
const OPTION_SETTING_GROUPS = [
  {
    title: "阅读",
    items: [
      {
        path: "contentAutoCollapse",
        label: "正文超长自动折叠",
        type: "checkbox",
        live: true,
      },
      {
        path: "replyContent.autoFold",
        label: "长回复自动折叠",
        type: "checkbox",
      },
      {
        path: "replyContent.hideReplyTime",
        label: "隐藏回复时间",
        type: "checkbox",
        live: true,
      },
      {
        path: "replyContent.hideRefName",
        label: "隐藏楼中楼 @ 用户名",
        type: "checkbox",
        live: true,
      },
      {
        path: "replyContent.showImgInPage",
        label: "点击图片放大查看",
        type: "checkbox",
      },
      {
        path: "userTag.enabled",
        label: "显示用户标签",
        type: "checkbox",
        live: true,
      },
    ],
  },
  {
    title: "高赞回复",
    items: [
      {
        path: "topReply.enabled",
        label: "启用高赞回复",
        type: "checkbox",
      },
      {
        path: "topReply.loveMinCount",
        label: "最少赞数",
        type: "number",
        min: 1,
        max: 999,
      },
      {
        path: "topReply.count",
        label: "显示条数",
        type: "number",
        min: 1,
        max: 20,
      },
      {
        path: "topReply.maxPages",
        label: "最多抓取页数",
        type: "number",
        min: 1,
        max: 100,
      },
    ],
  },
  {
    title: "楼中楼",
    items: [
      {
        path: "nestedReply.display",
        label: "回复展示方式",
        type: "select",
        options: [
          ["indent", "缩进"],
          ["off", "平铺"],
        ],
      },
    ],
  },
];
const OPTION_SETTING_ITEMS = OPTION_SETTING_GROUPS.flatMap(
  (group) => group.items,
);

function findOptionSetting(path) {
  return OPTION_SETTING_ITEMS.find((item) => item.path === path);
}

function applyLiveOption(path, value) {
  if (path === "replyContent.hideReplyTime") {
    $(".cell .ago").toggleClass("v2p-auto-hide", !!value);
    if (typeof $commentCells !== "undefined" && $commentCells?.length) {
      $commentCells.each((_, cell) => {
        getReplyTimeSpan($(cell)).toggleClass("v2p-auto-hide", !!value);
      });
    }
    return;
  }
  if (path === "replyContent.hideRefName") {
    $(".v2p-member-ref").toggleClass("v2p-member-ref-show", !value);
    return;
  }
  if (path === "contentAutoCollapse") {
    if (typeof $topicContentBox !== "undefined" && $topicContentBox?.length) {
      applyTopicContentCollapse({ force: !!value });
    }
    return;
  }
  if (path === "userTag.enabled") {
    updateMemberTag();
  }
}

function renderOptionSettings($container, options) {
  $container.empty();
  OPTION_SETTING_GROUPS.forEach((group) => {
    const $group = $('<div class="v2p-settings-group">');
    $group.append(
      $('<div class="v2p-settings-group-title">').text(group.title),
    );
    group.items.forEach((item) => {
      const value = getOptionValue(options, item.path);
      const $row = $('<div class="v2p-settings-row">');
      if (item.type === "checkbox") {
        const $label = $('<label>');
        $label.append(
          $('<input type="checkbox">')
            .attr("data-option", item.path)
            .prop("checked", !!value),
          $('<span>').text(item.label),
        );
        $row.append($label);
      } else if (item.type === "number") {
        $row.append(
          $('<span class="v2p-settings-row-label">').text(item.label),
        );
        $row.append(
          $('<input type="number">')
            .attr({
              "data-option": item.path,
              min: item.min ?? 1,
              max: item.max ?? 999,
            })
            .val(value),
        );
      } else if (item.type === "select") {
        $row.append(
          $('<span class="v2p-settings-row-label">').text(item.label),
        );
        const $select = $('<select>').attr("data-option", item.path);
        item.options.forEach(([optionValue, optionLabel]) => {
          $select.append($('<option>').val(optionValue).text(optionLabel));
        });
        $select.val(String(value));
        $row.append($select);
      }
      $group.append($row);
    });
    $container.append($group);
  });
  $container.append(
    $('<div class="v2p-settings-note">').text(
      "设置保存在本机；阅读类开关会即时生效，结构性选项刷新页面后生效。",
    ),
  );
  $container.find("[data-option]").on("change", async function () {
    const path = this.dataset.option;
    const item = findOptionSetting(path);
    let value;
    if (this.type === "checkbox") {
      value = this.checked;
    } else if (this.type === "number") {
      const min = item?.min ?? 1;
      const max = item?.max ?? 999;
      let next = Math.trunc(Number(this.value));
      if (!Number.isFinite(next)) next = min;
      value = Math.min(max, Math.max(min, next));
      this.value = String(value);
    } else {
      value = this.value;
    }
    await saveOption(path, value);
    applyLiveOption(path, value);
    createToast({
      message:
        item?.live === true
          ? "设置已保存"
          : "设置已保存，刷新页面后生效",
      type: "success",
    });
  });
}

// 「脚本设置」弹窗：把常用开关就地暴露出来，完整设置（WebDAV 同步等）仍在设置页
function handleSettingsModal() {
  return createModal({
    // createModal 内部用 root.append(...) 挂载，root 需与既有调用一致传 jQuery 对象
    root: $body,
    title: "V2EX Pro 脚本设置",
    onMount({ $content }) {
      $content.append(`
        <div class="v2p-settings-panel">
        <div class="v2p-settings-item">
          <label>
            <input type="checkbox" id="v2p-modal-signin">
            自动签到（每日首次打开页面时静默领取登录奖励与首页特别奖励）
          </label>
        </div>
        <div class="v2p-settings-options" id="v2p-modal-options"></div>
        <div class="v2p-settings-tip">
          主题、WebDAV 同步等完整设置见
          <a href="/settings#v2p">V2EX 设置页的「V2EX Pro」标签</a>。
        </div>
        </div>
      `);
      $content.find("#v2p-modal-signin").on("change", function () {
        window.v2pApplyAutoSignin?.(this.checked);
      });
      void getStorage().then((storage) => {
        renderOptionSettings(
          $content.find("#v2p-modal-options"),
          storage.options,
        );
      });
    },
    onOpen({ $content }) {
      // 每次打开都按当前存储状态刷新，避免与设置页的操作不同步
      $content
        .find("#v2p-modal-signin")
        .prop("checked", window.v2pGetAutoSignin?.() ?? false);
      void getStorage(false).then((storage) => {
        renderOptionSettings(
          $content.find("#v2p-modal-options"),
          storage.options,
        );
      });
    },
  });
}

// src/contents/topic/tool.ts
function mountMobileTools($tools) {
  $(".v2p-mobile-tools").remove();
  const $root = $(`
    <div class="v2p-mobile-tools">
      <div class="v2p-mobile-tools-menu" role="menu"></div>
      <button type="button" class="v2p-mobile-tools-toggle" aria-label="V2EX Pro 工具" aria-expanded="false">
        <i data-lucide="package-plus"></i>
      </button>
    </div>
  `);
  $root
    .find(".v2p-mobile-tools-menu")
    .append($tools.addClass("v2p-tools-floating"));
  $body.append($root);
  const $toggle = $root.find(".v2p-mobile-tools-toggle");
  const close = () => {
    $root.removeClass("v2p-mobile-tools-open");
    $toggle.attr("aria-expanded", "false");
  };
  $toggle.on("click", (ev) => {
    ev.stopPropagation();
    const open = $root
      .toggleClass("v2p-mobile-tools-open")
      .hasClass("v2p-mobile-tools-open");
    $toggle.attr("aria-expanded", String(open));
  });
  // 等 popup / modal 完成定位后再收起菜单
  $root.find(".v2p-tool").on("click", () => setTimeout(close, 0));
  $(document).on("click.v2p-mobile-tools", (ev) => {
    if (!$(ev.target).closest(".v2p-mobile-tools").length) close();
  });
  $(document).on("keydown.v2p-mobile-tools", (ev) => {
    if (ev.key === "Escape") close();
  });
  loadIcons();
}
function handleTools() {
  const storage = getStorageSync();
  const options = storage["options" /* Options */];
  const isMobileLayout =
    $body.hasClass("v2p-mobile") ||
    document.documentElement.classList.contains("v2p-mobile") ||
    window.innerWidth <= 768;
  const useFloatingTools = $infoCard.length === 0 && isMobileLayout;
  const $tools = $(`
    <div class="cell v2p-tools">
      <span class="v2p-tool v2p-hover-btn v2p-tool-reply">
        <span class="v2p-tool-icon"><i data-lucide="message-square-plus"></i></span>\u56DE\u590D\u4E3B\u9898
      </span>
      <span class="v2p-tool v2p-hover-btn v2p-tool-scroll-top">
        <span class="v2p-tool-icon"><i data-lucide="chevrons-up"></i></span>\u56DE\u5230\u9876\u90E8
      </span>
      <span class="v2p-tool v2p-hover-btn v2p-tool-more">
        <span class="v2p-tool-icon"><i data-lucide="package-plus"></i></span>\u66F4\u591A\u529F\u80FD
      </span>
      <span class="v2p-tool v2p-hover-btn v2p-tool-settings">
        <span class="v2p-tool-icon"><i data-lucide="settings"></i></span>\u811A\u672C\u8BBE\u7F6E
      </span>
    </div>
  `);
  $tools.find(".v2p-tool-reply").on("click", () => {
    $replyTextArea.trigger("focus");
  });

  $tools.find(".v2p-tool-scroll-top").on("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const settingsModal = handleSettingsModal();
  $tools.find(".v2p-tool-settings").on("click", () => {
    settingsModal.open();
  });
  {
    const $moreTool = $tools.find(".v2p-tool-more");
    const $toolContent = $(`
      <div class="v2p-select-dropdown">
        <div class="v2p-select-item v2p-reply-tool-floor">\u697C\u5C42\u76F4\u8FBE</div>
        <div class="v2p-select-item v2p-reply-tool-decode">\u89E3\u6790\u672C\u9875 Base64</div>
        <div class="v2p-select-item v2p-reply-tool-encode">\u6587\u672C\u8F6C Base64</div>
      </div>
    `);
    const toolsPopup = createPopup({
      root: useFloatingTools || $replyBox.length === 0 ? $body : $replyBox,
      trigger: $moreTool,
      content: $toolContent,
      offsetOptions: { mainAxis: 5, crossAxis: -5 },
    });
    $toolContent.find(".v2p-reply-tool-floor").on("click", () => {
      const $input = $(".v2p-floor-jump-input").first();
      if ($input.length === 0) {
        createToast({ message: "本页没有可跳转的回复", type: "info" });
        return;
      }
      $input[0].scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        $input.trigger("focus").trigger("select");
      }, 300);
    });
    $toolContent.find(".v2p-reply-tool-decode").on("click", () => {
      decodeBase64TopicPage();
    });
    $toolContent.find(".v2p-reply-tool-encode").on("click", () => {
      focusReplyInput();
      setTimeout(() => {
        const inputText = window.prompt(
          "\u8F93\u5165\u8981\u52A0\u5BC6\u7684\u5B57\u7B26\u4E32\uFF0C\u5B8C\u6210\u540E\u5C06\u586B\u5199\u5230\u56DE\u590D\u6846\u4E2D\uFF1A",
        );
        if (inputText) {
          let encodedText;
          try {
            encodedText = window.btoa(encodeURIComponent(inputText));
          } catch (err) {
            const errorTip =
              "\u8BE5\u6587\u672C\u65E0\u6CD5\u7F16\u7801\u4E3A Base64";
            console.error(
              err,
              `${errorTip}\uFF0C\u53EF\u80FD\u7684\u9519\u8BEF\u539F\u56E0\uFF1A\u6587\u672C\u5305\u542B\u4E2D\u6587\u3002`,
            );
            createToast({ message: errorTip, type: "error" });
          }
          if (encodedText) {
            insertTextToReplyInput(encodedText);
          }
        }
      });
    });

    const canHideRefName =
      options.nestedReply.display === "indent" &&
      !!options.replyContent.hideRefName;
    if (canHideRefName) {
      let isHidden = options.replyContent.hideRefName;
      const $toolToggleDisplay = $(
        '<div class="v2p-select-item">\u663E\u793A @ \u7528\u6237\u540D</div>',
      );
      $toolToggleDisplay.on("click", () => {
        if (isHidden) {
          isHidden = false;
          $toolToggleDisplay.text("\u9690\u85CF @ \u7528\u6237\u540D");
          $(".v2p-member-ref").addClass("v2p-member-ref-show");
        } else {
          isHidden = true;
          $toolToggleDisplay.text("\u663E\u793A @ \u7528\u6237\u540D");
          $(".v2p-member-ref").removeClass("v2p-member-ref-show");
        }
      });
      $toolContent.prepend($toolToggleDisplay);
    }
    const $toolToggleLayout = $(
      `
      <div class="v2p-select-item v2p-reply-tool-layout">
        ${options.reply.layout === "horizontal" ? "\u5207\u6362\u4E3A\u5782\u76F4\u5E03\u5C40" : "\u5207\u6362\u4E3A\u6C34\u5E73\u5E03\u5C40"}
      </div>
      `,
    );
    $toolContent.find(".v2p-select-item").on("click", () => {
      toolsPopup.close();
    });
  }
  if ($infoCard.length > 0) {
    $infoCard.addClass("v2p-tool-box").append($tools);
  } else if (useFloatingTools) {
    mountMobileTools($tools);
  }
  loadIcons();
}
var init_tool = __esm({
  "src/contents/topic/tool.ts"() {
    "use strict";
    init_popup();
    init_toast();
    init_constants();
    init_utils();
    init_globals();
    init_helpers();
    init_layout();
  },
});

// src/contents/topic/index.ts
var topic_exports = {};
var init_topic = __esm({
  "src/contents/topic/index.ts"() {
    "use strict";
    init_constants();
    init_utils();
    init_globals();
    init_helpers();
    init_comment();
    init_content();
    init_layout();
    init_paging();
    init_reply();
    init_tool();
    void (async () => {
      const storage = await getStorage();
      const options = storage["options" /* Options */];
      if (options.openInNewTab) {
        $topicHeader.find('a[href^="/member/"]').prop("target", "_blank");
        $commentTableRows
          .find("> td:nth-child(3) > strong > a")
          .prop("target", "_blank");
      }
      handleTools();
      {
        $(document).on("keydown", (ev) => {
          if (!ev.isDefaultPrevented()) {
            if (ev.key === "Escape") {
              const $replyContent = $("#reply_content");
              if ($replyBox.hasClass("reply-box-sticky")) {
                $replyBox.removeClass("reply-box-sticky");
                $("#undock-button").css("display", "none");
              }
              $replyContent.trigger("blur");
            }
          }
        });
      }
      handleContent();
      if (document.referrer !== "") {
        if (document.referrer.includes(document.location.pathname)) {
          const url = new URL(document.location.href);
          const page = url.searchParams.get("p");
          if (page && page !== "1") {
            document
              .querySelector(".topic_buttons")
              ?.scrollIntoView({ behavior: "smooth" });
          }
        }
      }
      handlePaging();

      try {
        await handleComments();
      } catch (e) {
        console.error("handleComments 出错，已跳过：", e);
      }

      handleReply();
      loadIcons();

      {
        const isFlamewarNode = $topicHeader
          .find('a[href^="/go"]')
          .attr("href")
          ?.endsWith("/flamewar");
        if (isFlamewarNode) {
          $("#node_sidebar").addClass("v2p-node-sidebar-flamewar");
        }
      }
    })();
  },
});

// src/contents/write/write.ts
function handleWrite() {
  bindImageUpload({
    $wrapper: $("#workspace"),
    insertText: (text) => {
      postTask(`editor.getDoc().replaceRange("${text}", editor.getCursor())`);
    },
    replaceText: (find, replace) => {
      if (replace) {
        const mode = $("input[name=syntax]:checked").val();
        if (mode === "markdown") {
          replace = `![](${replace})`;
        }
      }
      postTask(`
      editor.setValue(editor.getValue().replace("${find}", "${replace}"));
      const doc = editor.getDoc();
      const lastLine = doc.lastLine();
      const lastChar = doc.getLine(lastLine).length;
      doc.setCursor({ line: doc.lastLine(), ch: lastChar });
      `);
    },
  });
}
var init_write = __esm({
  "src/contents/write/write.ts"() {
    "use strict";
    init_image_upload();
    init_helpers();
  },
});

// src/contents/write/index.ts
var write_exports = {};
var init_write2 = __esm({
  "src/contents/write/index.ts"() {
    "use strict";
    init_helpers();
    init_write();
    handleWrite();
    loadIcons();
  },
});

// node_modules/.pnpm/webext-patterns@1.5.0/node_modules/webext-patterns/index.js
var patternValidationRegex =
  /^(https?|wss?|file|ftp|\*):\/\/(\*|\*\.[^*/]+|[^*/]+)\/.*$|^file:\/\/\/.*$|^resource:\/\/(\*|\*\.[^*/]+|[^*/]+)\/.*$|^about:/;
var isFirefox = globalThis.navigator?.userAgent.includes("Firefox/");
var allStarsRegex = isFirefox
  ? /^(https?|wss?):[/][/][^/]+([/].*)?$/
  : /^https?:[/][/][^/]+([/].*)?$/;
var allUrlsRegex = /^(https?|file|ftp):[/]+/;
function assertValidPattern(matchPattern) {
  if (!isValidPattern(matchPattern)) {
    throw new Error(
      matchPattern +
        " is an invalid pattern. See https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns for more info.",
    );
  }
}
function isValidPattern(matchPattern) {
  return (
    matchPattern === "<all_urls>" || patternValidationRegex.test(matchPattern)
  );
}
function getRawPatternRegex(matchPattern) {
  assertValidPattern(matchPattern);
  let [, protocol, host = "", pathname] = matchPattern.split(
    /(^[^:]+:[/][/])([^/]+)?/,
  );
  protocol = protocol
    .replace("*", isFirefox ? "(https?|wss?)" : "https?")
    .replaceAll(/[/]/g, "[/]");
  if (host === "*") {
    host = "[^/]+";
  }
  host &&= host
    .replace(/^[*][.]/, "([^/]+.)*")
    .replaceAll(/[.]/g, "[.]")
    .replace(/[*]$/, "[^.]+");
  pathname = pathname
    .replaceAll(/[/]/g, "[/]")
    .replaceAll(/[.]/g, "[.]")
    .replaceAll(/[*]/g, ".*");
  return "^" + protocol + host + "(" + pathname + ")?$";
}
function patternToRegex(...matchPatterns) {
  if (matchPatterns.length === 0) {
    return /$./;
  }
  if (matchPatterns.includes("<all_urls>")) {
    return allUrlsRegex;
  }
  if (matchPatterns.includes("*://*/*")) {
    return allStarsRegex;
  }
  return new RegExp(matchPatterns.map((x) => getRawPatternRegex(x)).join("|"));
}

// src/user-scripts/index.ts
function runAfterLoaded(fn) {
  if (document.readyState !== "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      fn();
    });
  }
}

var allowedHosts = [
  "https://v2ex.com",
  "https://www.v2ex.com",
  "https://cn.v2ex.com",
  "https://jp.v2ex.com",
  "https://de.v2ex.com",
  "https://us.v2ex.com",
  "https://hk.v2ex.com",
  "https://global.v2ex.com",
  "https://fast.v2ex.com",
  "https://s.v2ex.com",
  "https://origin.v2ex.com",
  "https://staging.v2ex.com",
  // 镜像站
  "https://global.v2ex.co",
];
var commonRegex = patternToRegex(...allowedHosts.map((host) => `${host}/*`));
var topicRegex = patternToRegex(...allowedHosts.map((host) => `${host}/t/*`));
var writeRegex = patternToRegex(
  ...allowedHosts.map((host) => `${host}/write/*`),
);
runAfterLoaded(() => {
  const url = window.location.href;
  void (async () => {
    if (commonRegex.test(url)) {
      await Promise.resolve().then(() => (init_common(), common_exports));
      await Promise.resolve().then(() => (init_home(), home_exports));
    }
    if (topicRegex.test(url)) {
      await Promise.resolve().then(() => (init_topic(), topic_exports));
    }
    if (writeRegex.test(url)) {
      await Promise.resolve().then(() => (init_write2(), write_exports));
    }
  })();
});

// v2p: replace legacy heart/reply icons with SVG controls
(function () {
  "use strict";
  const docEl = document.documentElement;
  if (docEl) docEl.classList.add("v2p-topnav-pending");

  // 统一图标尺寸 & 描边粗细
  const ICON_SIZE = 14; // 图标像素大小：18x18，你可以改成 16 / 20 等
  const STROKE_WIDTH = 2; // 描边粗细
  const ICON_OPACITY = 0.4; // 60% 不透明度

  function createSvgHeart() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("xmlns", svgNS);
    svg.setAttribute("width", ICON_SIZE);
    svg.setAttribute("height", ICON_SIZE);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", STROKE_WIDTH);
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("data-lucide", "heart");
    svg.setAttribute("class", "lucide lucide-heart");
    svg.style.opacity = String(ICON_OPACITY);

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute(
      "d",
      "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
    );
    svg.appendChild(path);

    return svg;
  }

  function createSvgReply() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("xmlns", svgNS);
    svg.setAttribute("width", ICON_SIZE);
    svg.setAttribute("height", ICON_SIZE);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", STROKE_WIDTH);
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("data-lucide", "message-square");
    svg.setAttribute("class", "lucide lucide-message-square");
    svg.style.opacity = String(ICON_OPACITY);

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute(
      "d",
      "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    );
    svg.appendChild(path);

    return svg;
  }

  function replaceIcons(root) {
    const doc = root || document;
    const createOpIcon = (path, viewBox = "0 0 24 24") => {
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("xmlns", svgNS);
      svg.setAttribute("width", "14");
      svg.setAttribute("height", "14");
      svg.setAttribute("viewBox", viewBox);
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.innerHTML = path;
      return svg;
    };

    // 1. 替换感谢小红心 heart_neue.png
    doc.querySelectorAll('img[src*="heart_neue.png"]').forEach((img) => {
      const a = img.closest("a");
      if (!a) return;

      if (a.dataset.v2pSvgReplaced === "heart") return;
      a.dataset.v2pSvgReplaced = "heart";

      const svg = createSvgHeart();
      // 如果需要，可以保持原来的 vertical-align
      svg.style.verticalAlign = img.style.verticalAlign || "middle";

      img.replaceWith(svg);
    });

    // 1.5 替换创作图标 compose.png
    doc.querySelectorAll('img[src*="compose.png"]').forEach((img) => {
      const a = img.closest("a");
      if (!a) return;

      if (a.dataset.v2pSvgReplaced === "compose") return;
      a.dataset.v2pSvgReplaced = "compose";

      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("xmlns", svgNS);
      svg.setAttribute("width", "20");
      svg.setAttribute("height", "20");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.setAttribute("class", "lucide lucide-file-plus");

      svg.innerHTML =
        '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" x2="12" y1="12" y2="18"/><line x1="9" x2="15" y1="15" y2="15"/>';

      img.replaceWith(svg);

      // 移除后面那个宽 10 的空 td
      const td = a.closest("td");
      if (td && td.nextElementSibling) {
        const nextTd = td.nextElementSibling;
        if (nextTd.tagName === "TD" && nextTd.getAttribute("width") === "10") {
          nextTd.remove();
        }
      }
    });

    // 2. 替换回复图标 reply_neue.png
    doc.querySelectorAll('img[src*="reply_neue.png"]').forEach((img) => {
      const a = img.closest("a");
      if (!a) return;

      if (a.dataset.v2pSvgReplaced === "reply") return;
      a.dataset.v2pSvgReplaced = "reply";

      const svg = createSvgReply();
      svg.style.verticalAlign = img.style.verticalAlign || "middle";

      img.replaceWith(svg);
    });

    // 2.5 替换余额区域金银铜图标
    const balanceIcons = [
      { src: "gold@2x.png", color: "#FFD700" }, // 金色
      { src: "silver@2x.png", color: "#C0C0C0" }, // 银色
      { src: "bronze@2x.png", color: "#CD7F32" }, // 铜色
    ];

    balanceIcons.forEach(({ src, color }) => {
      doc.querySelectorAll(`img[src*="${src}"]`).forEach((img) => {
        if (img.dataset.v2pSvgReplaced) return;
        img.dataset.v2pSvgReplaced = "balance";

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("xmlns", svgNS);
        svg.setAttribute("width", "16");
        svg.setAttribute("height", "16");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", color);
        svg.setAttribute("stroke", color);
        svg.setAttribute("stroke-width", "2");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.setAttribute("class", "lucide lucide-circle-dot");
        svg.style.verticalAlign = "middle";

        // circle-dot 图标路径
        svg.innerHTML =
          '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1" fill="white" stroke="white"/>';

        img.replaceWith(svg);
      });
    });

    // 2.5 顶部导航图标 (首页, 用户名, 记事本, Planet, 设置, 登出)
    const topNavLinks = document.querySelectorAll("#Top .tools > a.top");
    if (topNavLinks.length > 0) {
      topNavLinks.forEach((a) => {
        if (a.dataset.v2pSvgReplaced) return;

        const text = a.textContent.trim();
        const href = a.getAttribute("href");
        let icon = null;
        let content = null;

        if (text === "首页" || href === "/") {
          icon = "house";
          content =
            '<path d="M15 21v-8a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>';
        } else if (href && href.startsWith("/member/")) {
          icon = "user";
          content =
            '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>';
        } else if (text === "记事本" || href === "/notes") {
          icon = "file-text";
          content =
            '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>';
        } else if (text === "Planet" || href === "/planet") {
          icon = "globe";
          content =
            '<circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" x2="22" y1="12" y2="12"/>';
        } else if (text === "设置" || href === "/settings") {
          icon = "settings";
          content =
            '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>';
        } else if (text === "登出" || href.includes("signout")) {
          icon = "log-out";
          content =
            '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>';
        }

        if (icon && content) {
          a.dataset.v2pSvgReplaced = icon;
          const svgNS = "http://www.w3.org/2000/svg";
          const svg = document.createElementNS(svgNS, "svg");
          svg.setAttribute("xmlns", svgNS);
          svg.setAttribute("width", "15");
          svg.setAttribute("height", "15");
          svg.setAttribute("viewBox", "0 0 24 24");
          svg.setAttribute("fill", "none");
          svg.setAttribute("stroke", "currentColor");
          svg.setAttribute("stroke-width", "2");
          svg.setAttribute("stroke-linecap", "round");
          svg.setAttribute("stroke-linejoin", "round");
          svg.setAttribute("class", `lucide lucide-${icon}`);
          svg.style.marginRight = "5px";
          svg.style.verticalAlign = "text-bottom";

          svg.innerHTML = content;
          a.prepend(svg);
        }
      });
    }
    if (docEl) {
      const ready =
        topNavLinks.length === 0 ||
        Array.from(topNavLinks).every(
          (a) =>
            a.dataset.v2pSvgReplaced ||
            a.getAttribute("data-v2p-svg-replaced") ||
            a.querySelector("svg"),
        );
      if (ready) docEl.classList.remove("v2p-topnav-pending");
    }

    // 2.6 主题页操作按钮图标化（收藏 / Tweet / Share / 忽略 / 感谢）
    const opLinks = doc.querySelectorAll(
      "#Wrapper .content .box .inner .fr a.op",
    );
    if (opLinks.length > 0) {
      opLinks.forEach((a) => {
        if (a.dataset.v2pOpIcon) return;
        const text = (a.textContent || "").trim();
        let iconPath = null;
        if (text.includes("加入收藏") || text === "收藏") {
          iconPath =
            '<path d="M12 2l2.9 6.1L22 9l-5 4.9L18.2 22 12 18.6 5.8 22 7 13.9 2 9l7.1-.9z"/>';
        } else if (text === "Tweet") {
          iconPath =
            '<path d="M23 3a10.9 10.9 0 0 1-3.14 1.53A4.48 4.48 0 0 0 12.1 8v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>';
        } else if (text === "Share") {
          iconPath =
            '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>';
        } else if (text.includes("忽略主题")) {
          iconPath =
            '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.21-3.08 3.62-5.39 6.69-6.56"/><path d="M1 1l22 22"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a10.94 10.94 0 0 1-4.29 5.3"/><path d="M14.12 14.12a3 3 0 0 1-4.24-4.24"/>';
        } else if (text === "感谢") {
          iconPath =
            '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-8.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>';
        }
        if (!iconPath) return;
        a.dataset.v2pOpIcon = "1";
        a.classList.add("v2p-op-icon");
        a.setAttribute("title", text);
        a.setAttribute("aria-label", text);
        a.textContent = "";
        a.appendChild(createOpIcon(iconPath));
      });

      // 清理 #Main 内 op 旁的 &nbsp; 文本节点
      doc.querySelectorAll("#Main .fr").forEach((container) => {
        Array.from(container.childNodes).forEach((node) => {
          if (
            node.nodeType === 3 &&
            (!node.textContent.trim() || node.textContent.includes("\u00a0"))
          ) {
            node.remove();
          }
        });
      });
    }

    // 3. 替换侧边栏/移动端菜单图标 (图片库, 记事本, Planet, 时间轴, 个人主页, 节点收藏, 主题收藏, 设置, 语言选择, 登出)
    if (doc.querySelectorAll) {
      const menuItems = [
        {
          text: "图片库",
          icon: "image",
          content:
            '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
        },
        {
          text: "记事本",
          icon: "file-text",
          content:
            '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>',
        },
        {
          text: "Planet",
          icon: "globe",
          content:
            '<circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
        },
        {
          text: "时间轴",
          icon: "clock",
          content:
            '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
        },
        {
          text: "个人主页",
          href: "/member/",
          icon: "user",
          content:
            '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        },
        {
          text: "节点收藏",
          href: "/my/nodes",
          icon: "bookmark",
          content:
            '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
        },
        {
          text: "主题收藏",
          href: "/my/topics",
          icon: "star",
          content:
            '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
        },
        {
          text: "设置",
          href: "/settings",
          icon: "settings",
          content:
            '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
        },
        {
          text: "语言选择",
          href: "/select/language",
          icon: "languages",
          content:
            '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
        },
        {
          text: "登出",
          href: "/signout",
          icon: "log-out",
          content:
            '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
        },
      ];

      menuItems.forEach(({ text, href, icon, content }) => {
        // 只在菜单区域内查找链接（#menu-body），避免影响页面其他区域的链接
        const menuBody = doc.getElementById
          ? doc.getElementById("menu-body")
          : doc.querySelector("#menu-body");
        if (!menuBody) return;
        const links = Array.from(menuBody.querySelectorAll("a"));

        links.forEach((a) => {
          if (a.dataset.v2pSvgReplaced) return;

          const linkText = a.textContent.trim();
          const linkHref = a.getAttribute("href") || "";

          // 匹配条件：文本匹配 或 href 精确匹配（避免误伤其他链接）
          const textMatch = linkText === text;
          // 对于 /member/ 这样的路径，只匹配纯文本，不使用 href 匹配
          const hrefMatch =
            href && href !== "/member/" && linkHref.includes(href);

          if (textMatch || hrefMatch) {
            // 检查是否已有图标（img 或 svg）
            const existingImg = a.querySelector("img");
            const existingSvg = a.querySelector("svg");

            if (existingImg) {
              // 替换已有的 img
              a.dataset.v2pSvgReplaced = icon;
              const svgNS = "http://www.w3.org/2000/svg";
              const svg = document.createElementNS(svgNS, "svg");
              svg.setAttribute("xmlns", svgNS);
              svg.setAttribute("width", "16");
              svg.setAttribute("height", "16");
              svg.setAttribute("viewBox", "0 0 24 24");
              svg.setAttribute("fill", "none");
              svg.setAttribute("stroke", "currentColor");
              svg.setAttribute("stroke-width", "2");
              svg.setAttribute("stroke-linecap", "round");
              svg.setAttribute("stroke-linejoin", "round");
              svg.setAttribute("class", `lucide lucide-${icon}`);
              svg.style.verticalAlign =
                existingImg.style.verticalAlign || "middle";
              svg.style.marginRight = "10px";
              svg.style.opacity = "0.7";
              svg.innerHTML = content;
              existingImg.replaceWith(svg);
            } else if (!existingSvg) {
              // 为纯文本链接添加图标（仅当没有 svg 时）
              a.dataset.v2pSvgReplaced = icon;
              const svgNS = "http://www.w3.org/2000/svg";
              const svg = document.createElementNS(svgNS, "svg");
              svg.setAttribute("xmlns", svgNS);
              svg.setAttribute("width", "16");
              svg.setAttribute("height", "16");
              svg.setAttribute("viewBox", "0 0 24 24");
              svg.setAttribute("fill", "none");
              svg.setAttribute("stroke", "currentColor");
              svg.setAttribute("stroke-width", "2");
              svg.setAttribute("stroke-linecap", "round");
              svg.setAttribute("stroke-linejoin", "round");
              svg.setAttribute("class", `lucide lucide-${icon}`);
              svg.style.display = "inline-block";
              svg.style.verticalAlign = "middle";
              svg.style.marginRight = "10px";
              svg.style.opacity = "0.7";
              svg.innerHTML = content;
              a.insertBefore(svg, a.firstChild);
            }
          }
        });
      });
    }
  }

  // 初次执行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => replaceIcons());
  } else {
    replaceIcons();
  }

  // 兜底：避免顶部导航永久隐藏
  setTimeout(() => {
    if (docEl) docEl.classList.remove("v2p-topnav-pending");
  }, 1500);

  // 监听后续插入
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          replaceIcons(node);
        }
      });
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();

// ==================== 隐藏 0 条未读提醒 & 用户名旁添加提醒图标 ====================
(function () {
  let hasUnread = false;

  function checkUnreadNotifications() {
    // 查找包含未读提醒的链接
    const notificationLinks = document.querySelectorAll(
      'a[href="/notifications"]',
    );
    hasUnread = false;

    notificationLinks.forEach((link) => {
      const text = link.textContent.trim();
      const match = text.match(/^(\d+)\s*未读提醒$/);

      if (match) {
        const count = parseInt(match[1], 10);
        if (count === 0) {
          // 隐藏 0 条未读提醒的容器
          const cell = link.closest(".cell");
          if (cell) {
            cell.style.display = "none";
          }
        } else {
          hasUnread = true;
        }
      }
    });

    // 更新用户名旁边的提醒图标
    updateNotificationIcon();
  }

  function updateNotificationIcon() {
    // 查找用户名区域（移动端菜单中的 .bigger.flex-one-row）
    const userNameContainers = document.querySelectorAll(
      ".bigger.flex-one-row",
    );

    userNameContainers.forEach((container) => {
      // 检查是否已经添加过图标
      if (container.querySelector(".v2p-notification-icon")) return;

      // 查找 spacer，在它前面插入图标
      const spacer = container.querySelector(".spacer");
      if (!spacer) return;

      // 创建提醒图标链接
      const iconLink = document.createElement("a");
      iconLink.href = "/notifications";
      iconLink.className = "v2p-notification-icon";
      iconLink.title = "提醒";
      iconLink.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: auto;
        padding: 4px;
      `;

      // 创建 SVG 铃铛图标
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("xmlns", svgNS);
      svg.setAttribute("width", "16");
      svg.setAttribute("height", "16");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.setAttribute("class", "lucide lucide-bell");
      svg.innerHTML =
        '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>';

      // 根据是否有未读提醒设置颜色
      if (hasUnread) {
        svg.style.color = "var(--v2p-color-accent, #f59e0b)";
      } else {
        svg.style.color = "var(--v2p-color-font-secondary, #999)";
        svg.style.opacity = "0.6";
      }

      iconLink.appendChild(svg);
      container.insertBefore(iconLink, spacer);
    });

    // 更新已存在图标的颜色
    document.querySelectorAll(".v2p-notification-icon svg").forEach((svg) => {
      if (hasUnread) {
        svg.style.color = "var(--v2p-color-accent, #f59e0b)";
        svg.style.opacity = "1";
      } else {
        svg.style.color = "var(--v2p-color-font-secondary, #999)";
        svg.style.opacity = "0.6";
      }
    });
  }

  let scheduled = false;
  const scheduleCheck = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      checkUnreadNotifications();
    });
  };

  // 初次执行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleCheck);
  } else {
    scheduleCheck();
  }

  // 监听动态变化（使用 rAF 节流防抖，避免高频连续触发）
  const observer = new MutationObserver(scheduleCheck);
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();

// ==================== 节点导航自定义管理 ====================
(function () {
  const STORAGE_KEY = "v2p_nav_config";
  const TABS_SELECTOR = "#Tabs";
  const docEl = document.documentElement;
  if (docEl) docEl.classList.add("v2p-tabs-pending");

  // 默认节点列表 (fallback)
  const DEFAULT_NAV = [
    { name: "技术", href: "/?tab=tech", visible: true },
    { name: "创意", href: "/?tab=creative", visible: true },
    { name: "好玩", href: "/?tab=play", visible: true },
    { name: "Apple", href: "/?tab=apple", visible: true },
    { name: "酷工作", href: "/?tab=jobs", visible: true },
    { name: "交易", href: "/?tab=deals", visible: true },
    { name: "城市", href: "/?tab=city", visible: true },
    { name: "问与答", href: "/?tab=qna", visible: true },
    { name: "最热", href: "/?tab=hot", visible: true },
    { name: "全部", href: "/?tab=all", visible: true },
    { name: "R2", href: "/?tab=r2", visible: true },
    { name: "VXNA", href: "/xna", visible: true },
    { name: "节点", href: "/?tab=nodes", visible: true },
    // 关注之后是 Planet
    { name: "Planet", href: "/planet", visible: true },
  ];

  async function getNavConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result[STORAGE_KEY] || null);
      });
    });
  }

  async function saveNavConfig(config) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: config }, resolve);
    });
  }

  // 初始化
  async function init() {
    try {
      const tabsContainer = document.querySelector(TABS_SELECTOR);
      if (!tabsContainer) {
        return;
      }

      // 1. 读取当前页面上的 Tab
      const currentLinks = Array.from(
        tabsContainer.querySelectorAll("a.tab, a.tab_current"),
      );
      let currentData = currentLinks
        .map((a) => ({
          name: a.textContent.trim(),
          href: a.getAttribute("href"),
          visible: true,
        }))
        .filter((item) => item.name);

      // 1.1 尝试抓取 Planet (它是图片链接，没有 tab class)
      const planetLink = tabsContainer.querySelector('a[href="/planet"]');
      if (planetLink) {
        currentData.push({ name: "Planet", href: "/planet", visible: true });
      }

      let config = await getNavConfig();

      // 如果还没有配置，初始化配置
      if (!config) {
        config = currentData.length > 0 ? currentData : DEFAULT_NAV;
        // 默认把“拼车”去掉
        config = config.filter((x) => x.name !== "拼车");
        await saveNavConfig(config);
      } else {
        // 检查现有配置是否包含 Planet，如果不包含（旧数据），则补上
        const hasPlanet = config.some((item) => item.href === "/planet");
        if (!hasPlanet) {
          config.push({ name: "Planet", href: "/planet", visible: true });
          await saveNavConfig(config);
        }
      }

      renderTabs(tabsContainer, config);
    } catch (e) {
      console.error("V2P: Failed to initialize nav tabs", e);
    } finally {
      if (docEl) docEl.classList.remove("v2p-tabs-pending");
    }
  }

  // 图标映射 (name -> svg path content)
  const TAB_ICONS = {
    技术: '<polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />', // code
    创意: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" />', // lightbulb
    好玩: '<line x1="6" x2="10" y1="12" y2="12" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="15" x2="15.01" y1="13" y2="13" /><line x1="18" x2="18.01" y1="11" y2="11" /><rect width="20" height="12" x="2" y="6" rx="2" />', // gamepad-2
    Apple:
      '<svg width="14" height="14" viewBox="-1.5 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="currentColor" style="margin-right: 4px; opacity: 0.8;"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-102.000000, -7439.000000)" fill="currentColor"><g transform="translate(56.000000, 160.000000)"><path d="M57.5708873,7282.19296 C58.2999598,7281.34797 58.7914012,7280.17098 58.6569121,7279 C57.6062792,7279.04 56.3352055,7279.67099 55.5818643,7280.51498 C54.905374,7281.26397 54.3148354,7282.46095 54.4735932,7283.60894 C55.6455696,7283.69593 56.8418148,7283.03894 57.5708873,7282.19296 M60.1989864,7289.62485 C60.2283111,7292.65181 62.9696641,7293.65879 63,7293.67179 C62.9777537,7293.74279 62.562152,7295.10677 61.5560117,7296.51675 C60.6853718,7297.73474 59.7823735,7298.94772 58.3596204,7298.97372 C56.9621472,7298.99872 56.5121648,7298.17973 54.9134635,7298.17973 C53.3157735,7298.17973 52.8162425,7298.94772 51.4935978,7298.99872 C50.1203933,7299.04772 49.0738052,7297.68074 48.197098,7296.46676 C46.4032359,7293.98379 45.0330649,7289.44985 46.8734421,7286.3899 C47.7875635,7284.87092 49.4206455,7283.90793 51.1942837,7283.88393 C52.5422083,7283.85893 53.8153044,7284.75292 54.6394294,7284.75292 C55.4635543,7284.75292 57.0106846,7283.67793 58.6366882,7283.83593 C59.3172232,7283.86293 61.2283842,7284.09893 62.4549652,7285.8199 C62.355868,7285.8789 60.1747177,7287.09489 60.1989864,7289.62485"></path></g></g></g></svg>',
    酷工作:
      '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" />', // briefcase
    交易: '<path d="m21 16-2 6H5l-2-6" /><path d="M3 6v10c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V6" /><path d="M10 6V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />', // shopping-bag
    城市: '<rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" />', // building-2
    问与答:
      '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />', // message-circle-question
    最热: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.1.243-2.143.5-3.5a6 6 0 0 1 1.5-2.5c-.002 1.25.502 2.5 1.5 3.5.5.5 1 1.5 1 3a2 2 0 0 1-2 2z" />', // flame
    全部: '<rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />', // layout-grid
    R2: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" x2="12" y1="22.08" y2="12" />', // box
    VXNA: '<path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" />', // rss
    节点: '<line x1="4" x2="20" y1="9" y2="9" /><line x1="4" x2="20" y1="15" y2="15" /><line x1="10" x2="8" y1="3" y2="21" /><line x1="16" x2="14" y1="3" y2="21" />', // hash
    关注: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />', // users
  };

  function renderTabs(container, config) {
    // 记录原生高亮的 tab 名称和 href（如果有）
    const initialCurrentTab = container.querySelector(".tab_current");
    const initialActiveName = initialCurrentTab
      ? initialCurrentTab.textContent.trim()
      : null;
    const initialActiveHref = initialCurrentTab
      ? initialCurrentTab.getAttribute("href")
      : null;

    // 保留非 tab 元素，但要排除 Planet (因为它现在归 config 管)
    const extras = [];
    Array.from(container.childNodes).forEach((node) => {
      if (
        node.nodeType === 1 &&
        !node.classList.contains("tab") &&
        !node.classList.contains("tab_current") &&
        !node.classList.contains("v2p-nav-settings-btn")
      ) {
        // 排除 Planet 链接
        if (node.tagName === "A" && node.getAttribute("href") === "/planet") {
          return;
        }
        extras.push(node);
      }
    });

    // 清空容器
    container.innerHTML = "";

    // 如果 URL 有 ?tab= 参数，只在循环外保存一次到 localStorage
    const urlTab = new URLSearchParams(window.location.search).get("tab");
    if (urlTab) {
      localStorage.setItem("v2p_last_tab_id", urlTab);
    }

    // 渲染 config 中的 tab
    config.forEach((item) => {
      if (item.visible) {
        const a = document.createElement("a");
        a.href = item.href;

        // 特殊处理 Planet: 显示 SVG 图标
        if (item.href === "/planet") {
          a.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" x2="22" y1="12" y2="12"/></svg>';
          a.className =
            window.location.pathname === "/planet"
              ? "tab_current"
              : "tab v2p-hover-btn";
          a.style.marginLeft = "10px";
          a.style.display = "inline-flex";
          a.style.alignItems = "center";
        } else {
          // 注入 SVG 图标
          const iconPath = TAB_ICONS[item.name];
          let iconHtml = "";
          if (iconPath) {
            // 检查是否是完整的 SVG 字符串（例如 Apple 图标）
            if (iconPath.trim().startsWith("<svg")) {
              iconHtml = iconPath;
            } else {
              // 否则作为 path 注入到标准 SVG 容器中
              iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; opacity: 0.8;">${iconPath}</svg>`;
            }
          }

          a.innerHTML = `${iconHtml}${item.name}`;

          // 为了让图标和文字居中对齐，使用 flex
          a.style.display = "inline-flex";
          a.style.alignItems = "center";

          // current 判断：URL 有 tab 优先匹配；页面路径精确匹配；根路径优先使用原生选中的 Tab
          // 基准用当前站点（官网或镜像站），保证相对路径被解析到本站而不是官网
          const itemTab = new URL(
            item.href,
            window.location.origin,
          ).searchParams.get("tab");

          let isCurrent = false;
          if (urlTab) {
            isCurrent = itemTab === urlTab;
          } else if (window.location.pathname === item.href) {
            isCurrent = true;
          } else if (window.location.pathname === "/" && !urlTab) {
            if (initialActiveName) {
              isCurrent = item.name === initialActiveName;
            } else if (initialActiveHref) {
              isCurrent = item.href === initialActiveHref;
            } else {
              const lastTab = localStorage.getItem("v2p_last_tab_id");
              isCurrent = lastTab ? itemTab === lastTab : false;
            }
          }

          if (isCurrent) {
            a.className = "tab_current";
          } else {
            a.className = "tab v2p-hover-btn";
          }
        }
        container.appendChild(a);
      }
    });

    // 把 extras 加回去 (Planet 图标等)
    extras.forEach((node) => container.appendChild(node));

    // 添加设置按钮
    const settingsBtn = document.createElement("span");
    settingsBtn.className = "v2p-nav-settings-btn v2p-hover-btn";
    settingsBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';
    settingsBtn.title = "自定义导航";
    settingsBtn.style.cursor = "pointer";
    settingsBtn.style.marginLeft = "10px";
    settingsBtn.style.verticalAlign = "middle";
    settingsBtn.style.display = "inline-flex";
    settingsBtn.style.alignItems = "center";
    settingsBtn.style.justifyContent = "center";
    settingsBtn.style.lineHeight = "1";
    settingsBtn.style.color = "#ccc";

    settingsBtn.onclick = () => openNavSettings(config);

    container.appendChild(settingsBtn);
    if (docEl) docEl.classList.remove("v2p-tabs-pending");

    // ★ 移动端 Tabs 滚动位置恢复 & 记忆
    // renderTabs 会 innerHTML='' 重建容器，导致之前的 scrollLeft 和 scroll 监听器丢失
    // 所以必须在这里重新恢复和绑定
    const isMobileScroll =
      (document.body && document.body.classList.contains("v2p-mobile")) ||
      document.documentElement.classList.contains("v2p-mobile") ||
      window.innerWidth <= 768;
    if (isMobileScroll) {
      const SCROLL_STORAGE_KEY = "v2p-mobile-tabs-scroll";
      // 首页所有 tab 共用 "home"；其他页面用路径
      const pageKey = (() => {
        const path = location.pathname || "/";
        try {
          const tab = new URLSearchParams(location.search).get("tab") || "";
          return tab || path === "/" ? "home" : path;
        } catch {
          return path;
        }
      })();
      const fullKey = `${SCROLL_STORAGE_KEY}:${pageKey}`;

      // 恢复滚动位置（使用 rAF 确保布局完成）
      requestAnimationFrame(() => {
        const saved = localStorage.getItem(fullKey);
        if (saved != null) {
          const val = Number(saved);
          if (!Number.isNaN(val)) {
            container.scrollLeft = val;
            return;
          }
        }
        // 没有保存记录时，让当前 tab 居中显示
        const current = container.querySelector(".tab_current");
        if (current) {
          const parentRect = container.getBoundingClientRect();
          const itemRect = current.getBoundingClientRect();
          container.scrollLeft +=
            itemRect.left -
            parentRect.left -
            (parentRect.width - itemRect.width) / 2;
        }
      });

      // 监听滚动，保存位置
      let ticking = false;
      container.addEventListener(
        "scroll",
        () => {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(() => {
            ticking = false;
            localStorage.setItem(fullKey, String(container.scrollLeft));
          });
        },
        { passive: true },
      );
    }
  }

  function openNavSettings(currentConfig) {
    // 移除旧的（如果存在）
    let existingMenu = document.getElementById("v2p-nav-menu");
    if (existingMenu) {
      existingMenu.remove();
      return; // 如果已存在，再次点击则是关闭
    }

    const settingsBtn = document.querySelector(".v2p-nav-settings-btn");
    if (!settingsBtn) return;

    const menu = document.createElement("div");
    menu.id = "v2p-nav-menu";
    // 样式复用 .v2p-theme-menu 的风格，但针对内容做微调
    menu.style.cssText = `
        position: absolute;
        top: ${settingsBtn.offsetTop + settingsBtn.offsetHeight + 5}px;
        right: 0; /* 对齐右侧 */
        background-color: rgba(var(--v2p-color-bg-content-rgb), 0.75);
        border: 1px solid var(--box-border-color);
        box-shadow: var(--v2p-widget-shadow);
        border-radius: 14px;
        padding: 6px;
        display: flex;
        flex-direction: column;
        width: 220px;
        z-index: 2000;
        backdrop-filter: blur(12px) saturate(180%);
        -webkit-backdrop-filter: blur(12px) saturate(180%);
        animation: v2p-fade-in 0.15s ease-out;
    `;

    // 如果父容器 #Tabs 是 relative/fixed/absolute，offsetParent 可能是它
    // 我们把 menu 挂到 document.body 并手动计算位置，或者直接挂 settingsBtn 旁边（如果 Tab 容器没有 overflow:hidden）
    // 为了保险起见，挂在 body 上，绝对定位
    const rect = settingsBtn.getBoundingClientRect();
    menu.style.position = "absolute";
    menu.style.top = window.scrollY + rect.bottom + 5 + "px";

    const menuWidth = 220;
    const clientWidth =
      document.documentElement.clientWidth || window.innerWidth;
    let targetLeft = window.scrollX + rect.right - menuWidth;
    if (targetLeft < 10) targetLeft = 10;
    if (targetLeft + menuWidth > clientWidth - 10) {
      targetLeft = Math.max(10, clientWidth - menuWidth - 10);
    }
    menu.style.left = `${targetLeft}px`;

    const list = document.createElement("div");
    list.style.cssText = `
        max-height: 300px;
        overflow-y: auto;
        margin-bottom: 6px;
    `;

    let dragSrcIndex = null;

    function clearDragStyles() {
      list
        .querySelectorAll(".v2p-nav-drop-before, .v2p-nav-drop-after")
        .forEach((el) => {
          el.classList.remove("v2p-nav-drop-before", "v2p-nav-drop-after");
          el.style.boxShadow = "";
        });
    }

    function moveItem(fromIndex, direction) {
      const toIndex = fromIndex + direction;
      if (toIndex < 0 || toIndex >= currentConfig.length) return;
      const next = currentConfig.slice();
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      currentConfig.splice(0, currentConfig.length, ...next);
    }

    function reorderConfig(fromIndex, toIndex) {
      if (fromIndex == null || toIndex == null || fromIndex === toIndex) return;
      const next = currentConfig.slice();
      const [moved] = next.splice(fromIndex, 1);
      const insertIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
      next.splice(insertIndex, 0, moved);
      currentConfig.splice(0, currentConfig.length, ...next);
    }

    function renderList() {
      list.innerHTML = "";
      currentConfig.forEach((item, index) => {
        const row = document.createElement("div");
        // 复用 .v2p-theme-menu-item 的样式感
        row.className = "v2p-theme-menu-item"; // 使用既有类名以获得 hover 效果
        row.style.cssText = `
                padding: 6px 10px;
                margin: 2px 0;
                cursor: default;
                display: flex;
                align-items: center;
                gap: 8px;
                border-radius: 8px;
                font-size: 13px;
                color: var(--v2p-color-font-secondary);
                justify-content: space-between;
            `;

        // 左侧：拖拽 + Checkbox + 文字
        const leftGroup = document.createElement("div");
        leftGroup.style.display = "flex";
        leftGroup.style.alignItems = "center";
        leftGroup.style.gap = "8px";

        // Move up/down buttons (works on both desktop and mobile)
        const moveGroup = document.createElement("span");
        moveGroup.style.cssText =
          "display:inline-flex;flex-direction:column;gap:0;margin-right:2px;";

        const btnUp = document.createElement("button");
        btnUp.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>';
        btnUp.style.cssText =
          "border:none;background:none;padding:1px 3px;cursor:pointer;opacity:0.35;line-height:0;-webkit-tap-highlight-color:transparent;";
        btnUp.disabled = index === 0;
        if (index === 0) btnUp.style.opacity = "0.12";
        btnUp.onclick = async (e) => {
          e.stopPropagation();
          moveItem(index, -1);
          renderList();
          await saveAndRefresh();
        };

        const btnDown = document.createElement("button");
        btnDown.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
        btnDown.style.cssText =
          "border:none;background:none;padding:1px 3px;cursor:pointer;opacity:0.35;line-height:0;-webkit-tap-highlight-color:transparent;";
        btnDown.disabled = index === currentConfig.length - 1;
        if (index === currentConfig.length - 1) btnDown.style.opacity = "0.12";
        btnDown.onclick = async (e) => {
          e.stopPropagation();
          moveItem(index, 1);
          renderList();
          await saveAndRefresh();
        };

        moveGroup.appendChild(btnUp);
        moveGroup.appendChild(btnDown);

        // Desktop drag handle (hidden on mobile via media query)
        const dragHandle = document.createElement("span");
        dragHandle.className = "v2p-nav-drag-handle";
        dragHandle.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>';
        dragHandle.style.cursor = "grab";
        dragHandle.style.display = "inline-flex";
        dragHandle.style.alignItems = "center";
        dragHandle.style.opacity = "0.6";
        dragHandle.title = "拖拽排序";

        dragHandle.addEventListener("mousedown", (e) => {
          e.stopPropagation();
          row.draggable = true;
        });

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = item.visible;
        checkbox.style.cursor = "pointer";
        checkbox.onclick = (e) => e.stopPropagation();
        checkbox.onchange = (e) => {
          item.visible = e.target.checked;
          saveAndRefresh();
        };

        const name = document.createElement("span");
        name.textContent = item.name;

        leftGroup.appendChild(moveGroup);
        leftGroup.appendChild(dragHandle);
        leftGroup.appendChild(checkbox);
        leftGroup.appendChild(name);

        row.appendChild(leftGroup);
        list.appendChild(row);

        row.addEventListener("dragstart", (e) => {
          dragSrcIndex = index;
          row.classList.add("v2p-nav-dragging");
          row.style.opacity = "0.45";
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", "");
        });

        row.addEventListener("dragover", (e) => {
          if (dragSrcIndex == null || dragSrcIndex === index) return;
          e.preventDefault();
          const rect = row.getBoundingClientRect();
          const dropAfter = e.clientY >= rect.top + rect.height / 2;
          clearDragStyles();
          row.classList.add(
            dropAfter ? "v2p-nav-drop-after" : "v2p-nav-drop-before",
          );
          row.style.boxShadow = dropAfter
            ? "0 2px 0 0 var(--v2p-color-accent, #4a90d9) inset"
            : "0 -2px 0 0 var(--v2p-color-accent, #4a90d9) inset";
        });

        row.addEventListener("drop", async (e) => {
          if (dragSrcIndex == null || dragSrcIndex === index) return;
          e.preventDefault();
          e.stopPropagation();
          const rect = row.getBoundingClientRect();
          const dropAfter = e.clientY >= rect.top + rect.height / 2;
          const targetIndex = index + (dropAfter ? 1 : 0);
          reorderConfig(dragSrcIndex, targetIndex);
          dragSrcIndex = null;
          clearDragStyles();
          renderList();
          await saveAndRefresh();
        });

        row.addEventListener("dragend", () => {
          row.draggable = false;
          row.classList.remove("v2p-nav-dragging");
          row.style.opacity = "";
          dragSrcIndex = null;
          clearDragStyles();
        });
      });
    }

    async function saveAndRefresh() {
      await saveNavConfig(currentConfig);
      const tabsContainer = document.querySelector(TABS_SELECTOR);
      if (tabsContainer) renderTabs(tabsContainer, currentConfig);
    }

    renderList();
    menu.appendChild(list);

    // 点击外部关闭
    function closeHandler(e) {
      if (!menu.contains(e.target) && !settingsBtn.contains(e.target)) {
        menu.remove();
        document.removeEventListener("click", closeHandler);
      }
    }

    // 延迟添加监听，防止本次点击触发
    setTimeout(() => {
      document.addEventListener("click", closeHandler);
    }, 0);

    document.body.appendChild(menu);
  }

  // 启动
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

// ==================== 清除按钮图标化 ====================
(function () {
  function replaceClearTextWithIcon() {
    // 查找所有包含 clearMyRecentTopics 的清除链接
    const clearLinks = document.querySelectorAll(
      'a[onclick*="clearMyRecentTopics"]',
    );

    clearLinks.forEach((link) => {
      // 如果已经处理过，跳过
      if (link.querySelector("svg")) return;

      // 创建 Trash2 风格的 SVG 图标
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("xmlns", svgNS);
      svg.setAttribute("width", "14");
      svg.setAttribute("height", "14");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.setAttribute("class", "lucide lucide-trash-2");
      svg.style.verticalAlign = "middle";
      svg.style.opacity = "0.6";
      svg.innerHTML =
        '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>';

      // 添加悬停效果
      link.addEventListener("mouseenter", () => {
        svg.style.opacity = "1";
      });
      link.addEventListener("mouseleave", () => {
        svg.style.opacity = "0.6";
      });

      // 清空链接文本，添加图标
      link.textContent = "";
      link.title = "清除";
      link.appendChild(svg);
    });
  }

  let scheduled = false;
  const scheduleReplace = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      replaceClearTextWithIcon();
    });
  };

  // 初次执行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleReplace);
  } else {
    scheduleReplace();
  }

  // 监听动态变化（优先仅监听右侧边栏并加防抖）
  const observer = new MutationObserver(scheduleReplace);
  const targetContainer = document.getElementById("Rightbar") || document.body;
  if (targetContainer) {
    observer.observe(targetContainer, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      const rightbar = document.getElementById("Rightbar") || document.body;
      if (rightbar)
        observer.observe(rightbar, { childList: true, subtree: true });
    });
  }
})();

// ==================== V2EX Pro Settings Page ====================
(function () {
  const SETTINGS_PATH = "/settings";

  async function initSettingsPage() {
    if (!window.location.pathname.startsWith(SETTINGS_PATH)) return;
    // 设置页不会走 topic 的初始化流程，这里手动补齐常量与 options 缓存
    if (!defaultOptions && typeof init_constants === "function") {
      init_constants();
    }
    const storage = await getStorage(false);

    // 设置页 tab 栏容器：
    // - 桌面模板：#Main > .box 的第 2 个 .cell
    // - 移动端模板：没有 #Main（V2EX 按 UA 返回不同模板），设置 tab 直接挂在
    //   #Wrapper .content .box 的 .cell 里，取现有设置 tab 的父元素最稳妥，
    //   不依赖具体的 .cell 下标。
    const settingsTabLink = document.querySelector(
      "#Wrapper .content .box a.tab, #Wrapper .content .box a.tab_current",
    );
    const navContainer =
      document.querySelectorAll("#Main .box .cell")[1] ||
      (settingsTabLink && settingsTabLink.parentElement);
    if (!navContainer) return;

    // 内容宿主：tab 栏所在的 .box（桌面 = #Main .box，移动端 = #Wrapper .content .box）
    const mainBox = navContainer.closest(".box");
    if (!mainBox) return;

    const boxContent = Array.from(
      mainBox.querySelectorAll(":scope > .cell, :scope > .inner"),
    );
    if (boxContent.length < 2) return;
    // 以 tab 栏自身作为“其余设置内容”的隐藏起点，兼容桌面/移动端不同层级
    const navCell = boxContent.includes(navContainer)
      ? navContainer
      : boxContent[1];

    // 1. Add "V2EX Pro" Tab
    const proTab = document.createElement("a");
    proTab.href = "#v2p";
    proTab.className = "tab v2p-hover-btn";
    proTab.textContent = "V2EX Pro";
    proTab.id = "v2p-settings-tab";

    navContainer.appendChild(proTab);

    const config = (await V2PSyncManager.getConfig()) || {};

    // 2. Create Settings Content
    const settingsContent = document.createElement("div");
    settingsContent.id = "v2p-settings-panel";
    settingsContent.style.display = "none";
    settingsContent.innerHTML = `
      <div class="cell">阅读与回复</div>
      <div class="inner">
        <div id="v2p-settings-options"></div>
      </div>
      <div class="cell">自动签到</div>
      <div class="inner">
        <label style="cursor: pointer; user-select: none;">
          <input type="checkbox" id="v2p-auto-signin">
          每日首次打开页面时静默领取登录奖励与首页特别奖励
        </label>
        <div class="sep10"></div>
        <span class="fade">与 PC 端共用同一份签到记录，任一端签到成功后另一端当天不再重复请求。</span>
      </div>
      <div class="cell">V2EX Pro 设置 (WebDAV 同步)</div>
      <div class="inner">
        <form id="v2p-webdav-form">
          <table cellpadding="5" cellspacing="0" border="0" width="100%">
            <tbody>
              <tr>
                <td width="120" align="right">WebDAV 地址</td>
                <td><input type="text" class="sl" name="url" style="width: 300px;" value="${config.url || ""}" placeholder="http://192.168.1.100:5008/V2exPlus/"></td>
              </tr>
              <tr>
                <td width="120" align="right">用户名</td>
                <td><input type="text" class="sl" name="user" style="width: 300px;" value="${config.user || ""}"></td>
              </tr>
              <tr>
                <td width="120" align="right">应用密码/Token</td>
                <td><input type="password" class="sl" name="password" style="width: 300px;" value="${config.password || ""}"></td>
              </tr>
              <tr>
                <td width="120" align="right"></td>
                <td>
                  <input type="button" class="super normal button" id="v2p-test-webdav" value="测试连接">
                  <input type="submit" class="super normal button" value="保存配置">
                </td>
              </tr>
            </tbody>
          </table>
        </form>
        <div class="sep20"></div>
        <div class="cell" style="padding: 10px 0; border-top: 1px solid var(--box-border-color); margin-top: 10px;">数据同步</div>
        <div class="inner" style="padding: 10px 0;">
          <input type="button" class="super normal button" id="v2p-push-sync" value="推送当前配置到云端">
          <input type="button" class="super normal button" id="v2p-pull-sync" value="从云端拉取配置到本地">
          <div class="sep10"></div>
          <span class="fade">手动推送会将当前设备的主题、导航等配置覆盖云端；拉取则相反。</span>
        </div>
      </div>
    `;
    navCell.insertAdjacentElement("afterend", settingsContent);
    renderOptionSettings(
      $(settingsContent.querySelector("#v2p-settings-options")),
      storage.options,
    );

    // 3. Tab Switching Logic
    const allTabs = navContainer.querySelectorAll("a.tab, a.tab_current");
    const hideableContent = boxContent.slice(boxContent.indexOf(navCell) + 1);

    function showV2P() {
      allTabs.forEach((t) => (t.className = "tab v2p-hover-btn"));
      proTab.className = "tab_current";
      hideableContent.forEach((el) => (el.style.display = "none"));
      settingsContent.style.display = "block";
    }

    function hideV2P() {
      proTab.className = "tab v2p-hover-btn";
      settingsContent.style.display = "none";
      hideableContent.forEach((el) => (el.style.display = ""));
    }

    proTab.onclick = (e) => {
      e.preventDefault();
      showV2P();
      window.location.hash = "v2p";
    };

    allTabs.forEach((t) => {
      if (t !== proTab) {
        t.addEventListener("click", () => {
          if (proTab.className === "tab_current") hideV2P();
        });
      }
    });

    if (window.location.hash === "#v2p") showV2P();

    // 4. 自动签到开关
    const autoSigninBox = settingsContent.querySelector("#v2p-auto-signin");
    if (autoSigninBox && window.v2pGetAutoSignin) {
      autoSigninBox.checked = window.v2pGetAutoSignin();
      autoSigninBox.onchange = () => {
        window.v2pApplyAutoSignin?.(autoSigninBox.checked);
      };
    }

    // 5. Form Actions
    const form = settingsContent.querySelector("#v2p-webdav-form");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const newConfig = Object.fromEntries(formData.entries());
      await V2PSyncManager.saveConfig(newConfig);
      window.v2pShowToast("配置已保存");
    };

    settingsContent.querySelector("#v2p-test-webdav").onclick = async () => {
      const formData = new FormData(form);
      const tmpConfig = Object.fromEntries(formData.entries());
      try {
        await V2PSyncManager.testConnection(tmpConfig);
        window.v2pShowToast("连接成功！");
      } catch (e) {
        window.v2pShowToast("连接失败: " + e.message, 3000, "error");
      }
    };

    settingsContent.querySelector("#v2p-push-sync").onclick = async () => {
      window.v2pShowToast("正在推送...", 0, "info");
      try {
        await V2PSyncManager.push();
        window.v2pShowToast("同步成功");
      } catch (e) {
        window.v2pShowToast("推送失败: " + e.message, 3000, "error");
      }
    };

    settingsContent.querySelector("#v2p-pull-sync").onclick = async () => {
      window.v2pShowToast("正在拉取...", 0, "info");
      try {
        await V2PSyncManager.pull();
        window.v2pShowToast("拉取成功，即将刷新页面");
        setTimeout(() => window.location.reload(), 1500);
      } catch (e) {
        window.v2pShowToast("拉取失败: " + e.message, 3000, "error");
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSettingsPage);
  } else {
    initSettingsPage();
  }
})();
