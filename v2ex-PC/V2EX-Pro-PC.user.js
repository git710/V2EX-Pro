// ==UserScript==
// @name         V2EX Pro - PC
// @namespace    https://github.com/git710/V2EX-Pro
// @version      1.0.0
// @description  V2EX 网页增强脚本（PC 端）：楼中楼与嵌套回复、弹框查看主题、回复定位与上下文、高赞回复、用户标签、成员悬浮卡、表情回复、Base64 工具箱、顶部导航自定义、自动签到、钉钉通知。须与「V2EX Pro - PC style」样式脚本一同启用。
// @description:zh-CN  V2EX 网页增强脚本（PC 端）：楼中楼与嵌套回复、弹框查看主题、回复定位与上下文、高赞回复、用户标签、成员悬浮卡、表情回复、Base64 工具箱、顶部导航自定义、自动签到、钉钉通知。须与「V2EX Pro - PC style」样式脚本一同启用。
// @author       git710
// @license      GPL-3.0
// @homepageURL  https://github.com/git710/V2EX-Pro
// @supportURL   https://github.com/git710/V2EX-Pro/issues
// @icon         https://www.v2ex.com/static/img/v2ex-alt@2x.png
// @match        https://v2ex.com/*
// @match        https://*.v2ex.com/*
// @match        https://global.v2ex.co/*
// @run-at       document-idle
// @require      https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js#sha256=fc9a93dd241f6b045cbff0481cf4e1901becd0e12fb45166a8f17f95823f0b1a
// @require      https://cdn.jsdelivr.net/npm/vue@3.5.21/dist/vue.global.prod.min.js#sha256=1499fe2bc4c31e21573873ff79b4027d5d53d5475b2c5c31e48a96000eebd1f0
// @require      https://cdn.jsdelivr.net/npm/dayjs@1.11.18/dayjs.min.js#sha256=9cfdb93f38afcf2d076abecd66d32bfd3383cdf1967654ebc26a26605daf4173
// @grant        GM_addStyle
// @grant        GM_openInTab
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      oapi.dingtalk.com
// @updateURL    https://raw.githubusercontent.com/git710/V2EX-Pro/main/v2ex-PC/V2EX-Pro-PC.user.js
// @downloadURL  https://raw.githubusercontent.com/git710/V2EX-Pro/main/v2ex-PC/V2EX-Pro-PC.user.js
// ==/UserScript==

/*
 * V2EX Pro - PC（PC 端主脚本）
 * 仓库：https://github.com/git710/V2EX-Pro
 *
 * 衍生自 zyronon/V2Next 的 PC 端实现，遵循 GPL-3.0。
 * 感谢原作者 zyronon，以及 coolpace/V2EX_Polish、guozhigq/flutter_v2ex。
 * 完整许可证见仓库根目录 LICENSE。
 *
 * 本文件即原「V2Pro」（PC 主逻辑），历史上曾被误命名为 V2EX-Pro-PC-style.js，
 * 现已与样式脚本对调为正确命名，与 H5 目录保持一致。
 *
 * @require 已加 #sha256 子资源完整性校验，防止 CDN 内容被篡改。
 * 脚本内 window.isNight / window.config 等由样式脚本在 document-start 先行写入，
 * 因此必须先安装「V2EX Pro - PC style」，再安装本脚本。
 *
 * 站点范围：官方站（*.v2ex.com）与镜像站（https://global.v2ex.co）。
 * 站内请求与链接统一走 location.origin，因此在镜像站上不会被带回官网。
 */

(function (vue, dayjs) {
  "use strict";

  var PageType = /* @__PURE__ */ ((PageType2) => {
    PageType2["Home"] = "Home";
    PageType2["Node"] = "Node";
    PageType2["Post"] = "Post";
    PageType2["Member"] = "Member";
    PageType2["Changes"] = "Changes";
    PageType2["Hot"] = "Hot";
    return PageType2;
  })(PageType || {});
  var CommentDisplayType = /* @__PURE__ */ ((CommentDisplayType2) => {
    CommentDisplayType2[(CommentDisplayType2["FloorInFloor"] = 0)] =
      "FloorInFloor";
    CommentDisplayType2[(CommentDisplayType2["FloorInFloorNoCallUser"] = 4)] =
      "FloorInFloorNoCallUser";
    CommentDisplayType2[(CommentDisplayType2["FloorInFloorNested"] = 5)] =
      "FloorInFloorNested";
    CommentDisplayType2[(CommentDisplayType2["Like"] = 1)] = "Like";
    CommentDisplayType2[(CommentDisplayType2["V2exOrigin"] = 2)] = "V2exOrigin";
    CommentDisplayType2[(CommentDisplayType2["OnlyOp"] = 3)] = "OnlyOp";
    CommentDisplayType2[(CommentDisplayType2["New"] = 6)] = "New";
    return CommentDisplayType2;
  })(CommentDisplayType || {});
  const _sfc_main$m = {
    name: "Tooltip",
    props: {
      title: {
        type: String,
        default() {
          return "";
        },
      },
      disabled: {
        type: Boolean,
        default() {
          return false;
        },
      },
    },
    data() {
      return {
        show: false,
      };
    },
    methods: {
      showPop(e2) {
        if (this.disabled) return;
        if (!this.title) return;
        e2.stopPropagation();
        let rect = e2.target.getBoundingClientRect();
        this.show = true;
        vue.nextTick(() => {
          var _a, _b;
          let tip =
            (_b = (_a = this.$refs) == null ? void 0 : _a.tip) == null
              ? void 0
              : _b.getBoundingClientRect();
          if (!tip) return;
          if (rect.top < 50) {
            this.$refs.tip.style.top = rect.top + rect.height + 10 + "px";
          } else {
            this.$refs.tip.style.top = rect.top - tip.height - 10 + "px";
          }
          let tipWidth = tip.width;
          let rectWidth = rect.width;
          this.$refs.tip.style.left =
            rect.left - (tipWidth - rectWidth) / 2 + "px";
        });
      },
    },
    render() {
      let Vnode = this.$slots.default()[0];
      return vue.createVNode(vue.Fragment, null, [
        this.show &&
          this.title &&
          vue.createVNode(
            vue.Teleport,
            {
              to: "body",
            },
            {
              default: () => [
                vue.createVNode(
                  vue.Transition,
                  {
                    name: "fade",
                  },
                  {
                    default: () => [
                      vue.createVNode(
                        "div",
                        {
                          ref: "tip",
                          className: "tip",
                        },
                        [this.title],
                      ),
                    ],
                  },
                ),
              ],
            },
          ),
        vue.createVNode(
          Vnode,
          {
            onClick: () => (this.show = false),
            onmouseenter: (e2) => this.showPop(e2),
            onmouseleave: () => (this.show = false),
          },
          null,
        ),
      ]);
    },
  };
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const Tooltip = /* @__PURE__ */ _export_sfc(_sfc_main$m, [
    ["__scopeId", "data-v-ee672411"],
  ]);
  const _sfc_main$l = /* @__PURE__ */ vue.defineComponent({
    __name: "BaseSwitch",
    props: {
      modelValue: { type: Boolean },
    },
    emits: ["update:modelValue"],
    setup(__props, { emit: __emit }) {
      return (_ctx, _cache) => {
        return (
          vue.openBlock(),
          vue.createElementBlock(
            "div",
            {
              class: vue.normalizeClass([
                "switch",
                { active: _ctx.modelValue },
              ]),
              onClick:
                _cache[0] ||
                (_cache[0] = ($event) =>
                  _ctx.$emit("update:modelValue", !_ctx.modelValue)),
            },
            null,
            2,
          )
        );
      };
    },
  });
  const BaseSwitch = /* @__PURE__ */ _export_sfc(_sfc_main$l, [
    ["__scopeId", "data-v-e7c0fbef"],
  ]);
  var _GM_addStyle = /* @__PURE__ */ (() =>
    typeof GM_addStyle != "undefined" ? GM_addStyle : void 0)();
  var _GM_openInTab = /* @__PURE__ */ (() =>
    typeof GM_openInTab != "undefined" ? GM_openInTab : void 0)();
  var _GM_registerMenuCommand = /* @__PURE__ */ (() =>
    typeof GM_registerMenuCommand != "undefined"
      ? GM_registerMenuCommand
      : void 0)();
  var _GM_xmlhttpRequest = /* @__PURE__ */ (() =>
    typeof GM_xmlhttpRequest != "undefined" ? GM_xmlhttpRequest : void 0)();
  window.fetchOnce = async function () {
    try {
      let res = await fetch(location.origin + "/");
      if (res.status === 200) {
        let text = await res.text();
        let match = text.match(/var once = "([\d]+)";/);
        return match ? Number(match[1]) : null;
      }
      return null;
    } catch (e) {
      console.error("[V2EX Pro] fetchOnce failed", e);
      return null;
    }
  };
  // ===== 高赞回复抓取：页数 / 并发 / 缓存上限 =====
  // 与 H5 端一致：分页抓取设上限并按需均匀取样，限制并发数，
  // 并对抓取结果做短期缓存，避免重复打开同一主题时反复请求。
  const TOP_REPLY_FETCH_CONCURRENCY = 4;
  const TOP_REPLY_DEFAULT_MAX_PAGES = 20;
  const TOP_REPLY_MAX_PAGES_LIMIT = 100;
  const TOP_REPLY_CACHE_TTL = 10 * 60 * 1e3;
  const TOP_REPLY_CACHE_MAX_ENTRIES = 6;
  const TOP_REPLY_CACHE_MAX_BYTES = 1024 * 1024;
  const TOP_REPLY_CACHE_VERSION = 1;
  const TOP_REPLY_CACHE_PREFIX = "v2p_top_reply_cache:";

  // 读取用户配置的页数上限；异常值回退默认值，并做硬上限保护
  function getTopReplyMaxPages() {
    const value = Math.trunc(
      Number(window.config && window.config.topReplyMaxPages),
    );
    if (!Number.isFinite(value) || value < 1) {
      return TOP_REPLY_DEFAULT_MAX_PAGES;
    }
    return Math.min(value, TOP_REPLY_MAX_PAGES_LIMIT);
  }

  // 缓存键包含主题、当前页、总页数与页数上限：
  // 任一变化（例如新增分页、调整设置）都会自然失效并重新抓取。
  function getTopReplyCacheKey(topicId, currentPage, pageCount, maxPages) {
    return [
      TOP_REPLY_CACHE_PREFIX + TOP_REPLY_CACHE_VERSION,
      topicId,
      currentPage,
      pageCount,
      maxPages,
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
        Array.isArray(data.pages) &&
        data.pages.every((page) => page && Array.isArray(page.replyList)) &&
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

  // 清理过期条目并限制缓存条目数，防止大型主题占用过多 sessionStorage
  function pruneTopReplyCache() {
    try {
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(TOP_REPLY_CACHE_PREFIX)) keys.push(key);
      }
      const entries = [];
      keys.forEach((key) => {
        let ts = 0;
        try {
          ts = Number(JSON.parse(sessionStorage.getItem(key)).ts) || 0;
        } catch {
          ts = 0;
        }
        if (!ts || Date.now() - ts > TOP_REPLY_CACHE_TTL) {
          sessionStorage.removeItem(key);
        } else {
          entries.push({ key, ts });
        }
      });
      entries.sort((a, b) => a.ts - b.ts);
      const overflow = entries.length - TOP_REPLY_CACHE_MAX_ENTRIES;
      for (let i = 0; i < overflow; i++) {
        sessionStorage.removeItem(entries[i].key);
      }
    } catch {
      // 隐私模式或存储异常时放弃清理
    }
  }

  function writeTopReplyCache(key, data) {
    try {
      const raw = JSON.stringify({
        v: TOP_REPLY_CACHE_VERSION,
        ts: Date.now(),
        ...data,
      });
      // 单条过大时不缓存，避免挤占其它站点数据
      if (raw.length > TOP_REPLY_CACHE_MAX_BYTES) return;
      sessionStorage.setItem(key, raw);
      pruneTopReplyCache();
    } catch {
      // 配额不足或隐私模式：放弃缓存，不影响正常显示
    }
  }

  // 感谢 / 取消感谢会改变赞数，清掉该主题缓存，下次打开重新统计
  function clearTopReplyCache(topicId) {
    const prefix = `${TOP_REPLY_CACHE_PREFIX}${TOP_REPLY_CACHE_VERSION}:${topicId}:`;
    try {
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(prefix)) keys.push(key);
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

  // 限制同时进行的分页请求数量，避免大主题瞬时发出大量请求
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

  const functions = {
    async refreshOnce(once) {
      return new Promise((resolve) => {
        if (once) {
          if (typeof once === "string") {
            let res = once.match(/var once = "([\d]+)";/);
            if (res && res[1]) return resolve(Number(res[1]));
          }
          if (typeof once === "number") return resolve(once);
        }
        window.fetchOnce().then((r2) => {
          resolve(r2);
        });
      });
    },
    clone: (val) => JSON.parse(JSON.stringify(val)),
    // 判断回复质量，过滤纯表情/纯@/极短无意义灌水回复
    isQualityReply(v, minCount) {
      if (!v) return false;
      // 包含图片的多媒体回复予以保留
      if (v.reply_content && v.reply_content.includes("<img")) return true;
      let text = (v.reply_text || "").replace(/\s+/g, "");
      // 过滤 [doge] 等常见表情文本及 @用户 #楼层 符号
      let cleanText = text
        .replace(/\[[^\]]+\]/g, "")
        .replace(/@[a-zA-Z0-9_]+/g, "")
        .replace(/#\d+/g, "");
      // 若有效字数过少（少于4个字）且获赞数未明显大幅超越基础门槛（小于2倍或至少8赞），判定为低质水评
      let superThreshold = Math.max(minCount * 2, 8);
      if (cleanText.length < 4 && v.thankCount < superThreshold) {
        return false;
      }
      return true;
    },
    // 为子楼层高赞回复挂载父级上下文，解决脱离上下文语义断裂问题
    attachParentContext(item, replyList) {
      if (!item || item.parent) return item;
      let parentFloor = item.replyFloor;
      let parentUser =
        item.replyUsers && item.replyUsers.length > 0
          ? item.replyUsers[0]
          : null;
      let parentItem = null;

      if (parentFloor && parentFloor > 0) {
        parentItem = replyList.find((r) => r.floor === parentFloor);
      }
      if (!parentItem && parentUser) {
        for (let i = replyList.length - 1; i >= 0; i--) {
          let r = replyList[i];
          if (r.floor < item.floor && r.username === parentUser) {
            parentItem = r;
            break;
          }
        }
      }
      if (parentItem) {
        let cleanParentText = (parentItem.reply_text || "")
          .replace(/@[a-zA-Z0-9_]+\s*(#\d+)?/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (!cleanParentText) cleanParentText = "原回复";
        if (cleanParentText.length > 60) {
          cleanParentText = cleanParentText.slice(0, 60) + "...";
        }
        item.parent = {
          floor: parentItem.floor,
          username: parentItem.username,
          text: cleanParentText,
        };
      }
      return item;
    },
    createList(post, replyList, withRedundList = true) {
      post.replyList = replyList;
      // 排序快照：感谢操作只就地更新计数、不重建列表，排序基于快照避免回复瞬移
      replyList.forEach((v) => {
        v.sortThanks = v.thankCount || 0;
      });
      let minCount = (window.config && window.config.topReplyLoveMinCount) || 3;
      let maxTopCount = (window.config && window.config.topReplyCount) || 5;

      // 优化1：性能提升，不进行全局 JSON.parse 深拷贝，直接过滤满足门槛且有质量的回复
      let candidates = replyList
        .filter(
          (v) => v.thankCount >= minCount && this.isQualityReply(v, minCount),
        )
        .map((v) => ({ ...v }));

      // 优化2：解析被回复的父级上下文（解决子回复脱离上下文问题）
      candidates.forEach((item) => {
        this.attachParentContext(item, replyList);
      });

      // 预选出可能的高赞候选集合（扩大候选池，为后续嵌套计算后的互动数加权预留空间）
      candidates.sort(
        (a, b) => b.thankCount - a.thankCount || a.floor - b.floor,
      );
      let candidatePool = candidates.slice(0, Math.max(maxTopCount * 3, 15));

      post.replyCount = replyList.length;
      post.allReplyUsers = Array.from(
        new Set(replyList.map((v) => v.username)),
      );

      // 计算嵌套回复与子回复数量 replyCount
      post.nestedReplies = functions.createNestedList(
        this.clone(replyList),
        candidatePool,
      );

      // 优化3：二级排序规则与综合热度排序（获赞数降序 -> 子回复讨论数降序 -> 楼层先发者优先）
      candidatePool.sort((a, b) => {
        let diff = b.thankCount - a.thankCount;
        if (diff !== 0) return diff;
        let replyDiff = (b.replyCount || 0) - (a.replyCount || 0);
        if (replyDiff !== 0) return replyDiff;
        return a.floor - b.floor;
      });
      post.topReplyList = candidatePool.slice(0, maxTopCount);

      if (withRedundList) {
        post.nestedRedundReplies = functions.createNestedRedundantList(
          this.clone(replyList),
          post.topReplyList,
        );
      }
      return post;
    },
    // 感谢数就地同步到派生列表（高赞/嵌套/冗余），不重建不重排，避免感谢后回复瞬间位移
    updateThankInDerivedLists(post, id, type) {
      let visited = new Set();
      let walk = (list) => {
        if (!Array.isArray(list)) return;
        for (let item of list) {
          if (!item || typeof item !== "object" || visited.has(item)) continue;
          visited.add(item);
          if (item.id === id) {
            item.isThanked = type === "add";
            item.thankCount =
              (item.thankCount || 0) + (type === "add" ? 1 : -1);
          }
          if (item.children) walk(item.children);
        }
      };
      walk(post.topReplyList);
      walk(post.nestedReplies);
      walk(post.nestedRedundReplies);
      // 赞数变化后清掉该主题的分页缓存，下次打开重新统计
      if (post && post.id != null) {
        clearTopReplyCache(post.id);
      }
    },
    //获取所有回复
    getAllReply(repliesMap = []) {
      return repliesMap
        .sort((a, b) => a.i - b.i)
        .reduce((pre, i) => {
          pre = pre.concat(i.replyList);
          return pre;
        }, []);
    },
    //查找子回复
    findChildren(item, endList, all, topReplyList) {
      var _a;
      const fn = (child, endList2, parent) => {
        child.level = parent.level + 1;
        let rIndex2 = all.findIndex((v) => v.floor === child.floor);
        if (rIndex2 > -1) {
          all[rIndex2].isUse = true;
        }
        parent.children.push(
          this.findChildren(child, endList2, all, topReplyList),
        );
      };
      item.children = [];
      let floorReplyList = [];
      for (let i = 0; i < endList.length; i++) {
        let currentItem = endList[i];
        if (currentItem.isUse) continue;
        if (currentItem.replyFloor === item.floor) {
          if (
            currentItem.replyUsers.length === 1 &&
            currentItem.replyUsers[0] === item.username
          ) {
            currentItem.isUse = true;
            floorReplyList.push({ endList: endList.slice(i + 1), currentItem });
          } else {
            currentItem.isWrong = true;
          }
        }
      }
      floorReplyList.reverse().forEach(({ currentItem, endList: endList2 }) => {
        fn(currentItem, endList2, item);
      });
      let nextMeIndex = endList.findIndex((v) => {
        var _a2;
        return (
          v.username === item.username &&
          ((_a2 = v.replyUsers) == null ? void 0 : _a2[0]) !== item.username
        );
      });
      let findList = nextMeIndex > -1 ? endList.slice(0, nextMeIndex) : endList;
      for (let i = 0; i < findList.length; i++) {
        let currentItem = findList[i];
        if (currentItem.isUse) continue;
        if (currentItem.replyUsers.length === 1) {
          if (currentItem.replyFloor !== -1) {
            if (
              ((_a = all[currentItem.replyFloor - 1]) == null
                ? void 0
                : _a.username) === currentItem.replyUsers[0]
            ) {
              continue;
            }
          }
          let endList2 = endList.slice(i + 1);
          if (currentItem.username === item.username) {
            if (currentItem.replyUsers[0] === item.username) {
              fn(currentItem, endList2, item);
            }
            break;
          } else {
            if (currentItem.replyUsers[0] === item.username) {
              fn(currentItem, endList2, item);
            }
          }
        } else {
          if (currentItem.username === item.username) break;
        }
      }
      item.children = item.children.sort((a, b) => a.floor - b.floor);
      item.replyCount = item.children.reduce((a, b) => {
        return a + (b.children.length ? b.replyCount + 1 : 1);
      }, 0);
      let rIndex = topReplyList.findIndex((v) => v.floor === item.floor);
      if (rIndex > -1) {
        topReplyList[rIndex].children = item.children;
        topReplyList[rIndex].replyCount = item.replyCount;
      }
      return item;
    },
    //生成嵌套回复
    createNestedList(allList = [], topReplyList = []) {
      if (!allList.length) return [];
      let list = allList;
      let nestedList = [];
      list.forEach((item, index) => {
        let startList = list.slice(0, index);
        let startReplyUsers = Array.from(
          new Set(startList.map((v) => v.username)),
        );
        let endList = list.slice(index + 1);
        if (index === 0) {
          nestedList.push(this.findChildren(item, endList, list, topReplyList));
        } else {
          if (!item.isUse) {
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
                this.findChildren(item, endList, list, topReplyList),
              );
            }
          }
        }
      });
      return nestedList;
    },
    //生成嵌套冗余回复
    createNestedRedundantList(allList = [], topReplyList) {
      if (!allList.length) return [];
      let list = allList;
      let nestedList = [];
      list.forEach((item, index) => {
        let startList = list.slice(0, index);
        let startReplyUsers = Array.from(
          new Set(startList.map((v) => v.username)),
        );
        let endList = list.slice(index + 1);
        if (index === 0) {
          nestedList.push(this.findChildren(item, endList, list, topReplyList));
        } else {
          if (!item.isUse) {
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
                this.findChildren(item, endList, list, topReplyList),
              );
            }
          } else {
            let newItem = this.clone(item);
            newItem.children = [];
            newItem.level = 0;
            newItem.isDup = true;
            nestedList.push(newItem);
          }
        }
      });
      return nestedList;
    },
    //解析A标签
    parseA(a) {
      let href = a.href;
      let id;
      if (href.includes("/t/")) {
        id = a.pathname.substring("/t/".length);
      }
      return { href, id, title: a.innerText };
    },
    //图片链接转Img标签
    checkPhotoLink2Img(dom) {
      let replaceImgur = window.config.replaceImgur;
      let is_add = false;
      let prefix_img = replaceImgur ? DefaultVal.imgurProxy : "";
      let imgList = dom.querySelectorAll("img");
      imgList.forEach((img) => {
        let href = img.src;
        if (href.includes("imgur.com")) {
          img.setAttribute("originUrl", img.src);
          img.setAttribute("notice", "此img标签由V2Pro脚本解析");
          img.setAttribute("referrerpolicy", "no-referrer");
          let hrefLower = href.toLowerCase();
          if (
            hrefLower.includes(".png") ||
            hrefLower.includes(".jpg") ||
            hrefLower.includes(".jpeg") ||
            hrefLower.includes(".gif")
          );
          else {
            href = href + ".png";
          }
          if (
            !is_add &&
            replaceImgur &&
            !document.querySelector('meta[name="referrer"]')
          ) {
            let meta = document.createElement("meta");
            meta.setAttribute("name", "referrer");
            meta.setAttribute("content", "no-referrer");
            document.getElementsByTagName("head")[0].appendChild(meta);
            is_add = true;
          }
          img.src = prefix_img + href;
        }
      });
      let aList = dom.querySelectorAll("a");
      aList.forEach((a) => {
        let href = a.href;
        if (a.children.length == 0 && a.innerText == href) {
          let hrefLower = href.toLowerCase();
          if (
            hrefLower.includes(".png") ||
            hrefLower.includes(".jpg") ||
            hrefLower.includes(".jpeg") ||
            hrefLower.includes(".gif")
          ) {
            let img = document.createElement("img");
            img.setAttribute("originUrl", a.href);
            img.setAttribute("notice", "此img标签由V2Pro脚本解析");
            img.setAttribute("referrerpolicy", "no-referrer");
            if (href.includes("imgur.com")) {
              if (
                !is_add &&
                replaceImgur &&
                !document.querySelector('meta[name="referrer"]')
              ) {
                let meta = document.createElement("meta");
                meta.setAttribute("name", "referrer");
                meta.setAttribute("content", "no-referrer");
                document.getElementsByTagName("head")[0].appendChild(meta);
                is_add = true;
              }
              img.src = prefix_img + href;
            } else {
              img.src = href;
            }
            a.innerText = "";
            a.append(img);
          }
        }
      });
    },
    //检测帖子回复长度
    async checkPostReplies(id, needOpen = true) {
      let res = await functions.getPostDetailByApi(id);
      if (
        (res == null ? void 0 : res.replies) > window.config.maxReplyCountLimit
      ) {
        if (needOpen) {
          functions.openNewTab(`${location.origin}/t/${id}?p=1&script=1`);
        }
        return true;
      }
      return false;
    },
    async sleep(time) {
      return new Promise((resolve) => {
        setTimeout(resolve, time);
      });
    },
    //打开新标签页
    openNewTab(href, active = false) {
      // 兜底：外链为空时不开空白页
      if (!href) return;
      let isSafariBrowser =
        /Safari/.test(navigator.userAgent) &&
        !/Chrome/.test(navigator.userAgent);
      if (isSafariBrowser) {
        let tempId = "a_blank_" + Date.now();
        let a = document.createElement("a");
        a.setAttribute("href", href);
        a.setAttribute("target", "_blank");
        a.setAttribute("id", tempId);
        a.setAttribute("script", "1");
        if (!document.getElementById(tempId)) {
          document.body.appendChild(a);
        }
        a.click();
        a.remove();
      } else {
        _GM_openInTab(href, { active });
      }
    },
    async cbChecker(val, count = 0) {
      if (window.cb) {
        window.cb(val);
      } else {
        while (!window.cb && count < 30) {
          await functions.sleep(500);
          count++;
        }
        window.cb && window.cb(val);
      }
    },
    //初始化脚本菜单
    initMonkeyMenu() {
      try {
        _GM_registerMenuCommand("脚本设置", () => {
          functions.cbChecker({ type: "openSetting" });
        });
        _GM_registerMenuCommand("仓库地址", () => {
          functions.openNewTab(DefaultVal.git, true);
        });
        _GM_registerMenuCommand("反馈 & 建议", functions.feedback);
      } catch (e2) {
        console.error("无法使用Tampermonkey");
      }
    },
    feedback() {
      functions.openNewTab(DefaultVal.issue);
    },
    /**
     * 判断主机名是否为 V2EX 官方或镜像站
     */
    isV2exHost(hostname) {
      return /(^|\.)v2ex\.(com|co)$/i.test(String(hostname || ""));
    },
    /**
     * 判断链接是否为外部链接（非 V2EX 官方站、非镜像站、非当前站、非内部锚点/脚本）。
     */
    isExternalLink(href) {
      if (!href || typeof href !== "string") return false;
      let trimmed = href.trim();
      if (
        !trimmed ||
        trimmed.startsWith("#") ||
        trimmed.startsWith("javascript:") ||
        trimmed.startsWith("mailto:") ||
        trimmed.startsWith("tel:")
      ) {
        return false;
      }
      try {
        let url = new URL(trimmed, window.location.href);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          return false;
        }
        let host = url.hostname.toLowerCase();
        let currentHost = window.location.hostname.toLowerCase();
        if (host === currentHost || functions.isV2exHost(host)) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    },
    applyExternalLinkTargets(context) {
      if (window.config && window.config.openExternalLinkInNewTab === false) return;
      let root = context || document;
      $(root).find("a[href]").each((_, el) => {
        let href = el.getAttribute("href");
        if (functions.isExternalLink(href)) {
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener noreferrer");
        }
      });
    },
    //检测页面类型
    checkPageType(a) {
      let l = a || window.location;
      let data = {
        pageType: null,
        pageData: { id: "", pageNo: null },
        username: "",
      };
      if (a && functions.isExternalLink(a.href)) {
        return data;
      }
      if (l.pathname === "/") {
        data.pageType = PageType.Home;
      } else if (l.pathname === "/changes") {
        data.pageType = PageType.Changes;
      } else if (l.pathname === "/v2hot") {
        data.pageType = PageType.Hot;
      } else if (l.pathname === "/recent") {
        data.pageType = PageType.Changes;
      } else if (l.href.match(/.com\/?tab=/)) {
        data.pageType = PageType.Home;
      } else if (l.href.match(/.com\/go\//)) {
        if (!l.href.includes("/links")) {
          data.pageType = PageType.Node;
        }
      } else if (l.href.match(/.com\/member/)) {
        data.pageType = PageType.Member;
        data.username = l.pathname
          .replace("/member/", "")
          .replace("/replies", "")
          .replace("/topics", "");
      } else {
        let r2 = l.href.match(/.com\/t\/([\d]+)/);
        if (
          r2 &&
          !l.pathname.includes("review") &&
          !l.pathname.includes("info")
        ) {
          data.pageType = PageType.Post;
          data.pageData.id = r2[1];
          if (l.search) {
            let pr = l.href.match(/\?p=([\d]+)/);
            if (pr) data.pageData.pageNo = Number(pr[1]);
          }
        }
      }
      return data;
    },
    //通过api获取主题详情
    getPostDetailByApi(id) {
      return new Promise((resolve) => {
        fetch(`${location.origin}/api/topics/show.json?id=${id}`)
          .then(async (r2) => {
            if (r2.status === 200) {
              let res = await r2.json();
              if (res && res.length) {
                let d2 = res[0];
                return resolve(d2);
              }
            }
            resolve(null);
          })
          .catch(() => {
            resolve(null);
          });
      });
    },
    appendPostContent(res, el) {
      let a = document.createElement("a");
      a.href = res.href;
      a.classList.add("post-content");
      let div = document.createElement("div");
      div.innerHTML = res.content_rendered;
      a.append(div);
      el.append(a);
      const checkHeight2 = () => {
        var _a;
        if (div.clientHeight < 300) {
          a.classList.add("show-all");
        } else {
          let showMore = document.createElement("div");
          showMore.classList.add("show-more");
          showMore.innerHTML = "显示更多/收起";
          showMore.onclick = function (e2) {
            e2.stopPropagation();
            a.classList.toggle("show-all");
          };
          (_a = a.parentNode) == null ? void 0 : _a.append(showMore);
        }
      };
      checkHeight2();
    },
    //从本地读取配置
    initConfig() {
      let configStr = localStorage.getItem("v2ex-config");
      let configMap = {};
      let configObj = {};
      let userName = window.user.username || "default";
      if (configStr) {
        try {
          configMap = JSON.parse(configStr);
          configObj = configMap[userName];
          if (configObj) {
            window.config = functions.deepAssign(window.config, configObj);
          }
        } catch (e2) {
          console.warn("[V2EX Pro] 解析本地配置失败，重置为默认配置", e2);
        }
      }
      configMap[userName] = window.config;
      localStorage.setItem("v2ex-config", JSON.stringify(configMap));
    },
    deepAssign(...arg) {
      let name, options, src, copy;
      let length = arguments.length;
      let i = 1;
      let target = arguments[0];
      if (typeof target !== "object" || target === null) {
        target = Array.isArray(arguments[1]) ? [] : {};
      }
      for (; i < length; i++) {
        options = arguments[i];
        if (options != null) {
          for (name in options) {
            src = target[name];
            copy = options[name];
            if (copy && typeof copy == "object") {
              if (Array.isArray(copy)) {
                target[name] = this.deepAssign(
                  Array.isArray(src) ? src : [],
                  copy,
                );
              } else {
                target[name] = this.deepAssign(
                  src && typeof src === "object" && !Array.isArray(src)
                    ? src
                    : {},
                  copy,
                );
              }
            } else if (copy !== void 0) {
              target[name] = copy;
            }
          }
        }
      }
      return target;
    },
    //生成dom，从html字符串
    genDomFromHtmlString(htmlText) {
      let bodyText = htmlText
        ? htmlText.match(/<body[^>]*>([\s\S]+?)<\/body>/i)
        : null;
      let body = document.createElement("html");
      body.innerHTML = bodyText ? bodyText[0] : htmlText || "";
      return body;
    },
    stopEvent(e2) {
      e2.preventDefault();
      e2.stopPropagation();
    },
    loadAndRunScript(url) {
      console.warn("[V2EX Pro] 动态加载外部脚本已被安全禁用:", url);
    },
  };
  const DefaultPost = {
    allReplyUsers: [],
    content_rendered: "",
    createDate: "",
    createDateAgo: "",
    lastReplyDate: "",
    lastReplyUsername: "",
    fr: "",
    replyList: [],
    topReplyList: [],
    nestedReplies: [],
    nestedRedundReplies: [],
    username: "",
    url: "",
    href: "",
    member: {
      avatar: "",
      username: "",
    },
    node: {
      title: "",
      url: "",
    },
    headerTemplate: "",
    title: "",
    id: "",
    type: "post",
    once: "",
    replyCount: 0,
    clickCount: 0,
    thankCount: 0,
    collectCount: 0,
    lastReadFloor: 0,
    isFavorite: false,
    isIgnore: false,
    isThanked: false,
    isReport: false,
    inList: false,
  };
  const getDefaultPost = (val = {}) => {
    return Object.assign(functions.clone(DefaultPost), val);
  };
  const DefaultUser = {
    tagPrefix: "--用户标签--",
    tags: {},
    tagsId: "",
    username: "",
    avatar: "",
    readPrefix: "--已读楼层--",
    readNoteItemId: "",
    readList: {},
    imgurPrefix: "--imgur图片删除hash--",
    imgurList: {},
    imgurNoteId: "",
    configPrefix: "--config--",
    configNoteId: "",
  };
  const DefaultVal = {
    pageType: void 0,
    pageData: { pageNo: 1 },
    targetUserName: "",
    currentVersion: 5,
    cb: null,
    // 仓库 / 反馈 / 更新日志 / 安装地址等外链
    // 修改仓库名或分支时，只需同步这 7 行（与脚本头 @updateURL/@downloadURL 保持一致）
    git: "https://github.com/git710/V2EX-Pro",
    shortGit: "https://github.com/git710/V2EX-Pro",
    issue: "https://github.com/git710/V2EX-Pro/issues",
    pcLog: "https://github.com/git710/V2EX-Pro/releases",
    pcScript:
      "https://raw.githubusercontent.com/git710/V2EX-Pro/main/v2ex-PC/V2EX-Pro-PC.user.js",
    mobileScript:
      "https://raw.githubusercontent.com/git710/V2EX-Pro/main/v2ex-H5/V2EX-Pro-H5.user.js",
    homeUrl: "https://github.com/git710/V2EX-Pro#readme",
    // 第三方服务（非本仓库提供）：热门主题跳转 & imgur 图片代理。
    // 二者均沿用上游配置，自建部署时建议替换为自有服务；热门跳转失败会回退到 git 地址。
    hotUrl: "https://v2hotlist.vercel.app/hot/",
    imgurProxy: "https://img.noobzone.ru/getimg.php?url=",
  };
  function getDefaultConfig(val = {}) {
    return Object.assign(
      {
        showToolbar: true,
        autoOpenDetail: true,
        openTag: false,
        //给用户打标签
        clickPostItemOpenDetail: true,
        closePostDetailBySpace: true,
        //点击空白处关闭详情
        contentAutoCollapse: true,
        //正文超长自动折叠
        collapseHeight: 900,
        //长内容折叠阈值（px）
        viewType: "table",
        commentDisplayType: CommentDisplayType.FloorInFloorNoCallUser,
        newTabOpen: false,
        //新标签打开
        newTabOpenActive: false,
        openExternalLinkInNewTab: true,
        //外链新标签页打开
        base64: true,
        //base功能
        sov2ex: false,
        postWidth: "",
        showTopReply: true,
        topReplyLoveMinCount: 3,
        topReplyCount: 5,
        topReplyMaxPages: 20,
        autoJumpLastReadFloor: false,
        rememberLastReadFloor: false,
        autoSignin: true,
        customBgColor: "",
        version: DefaultVal.currentVersion,
        collectBrowserNotice: false,
        fontSizeType: "normal",
        notice: {
          uid: "",
          text: "",
          ddWebhook: "",
          takeOverNoticePage: true,
          whenNewNoticeGlimmer: false,
          loopCheckNotice: false,
          loopCheckNoticeInterval: 5,
        },
        replaceImgur: false,
        maxReplyCountLimit: 400,
      },
      val,
    );
  }
  const emojiEmoticons = [
    {
      title: "常用",
      list: [
        "😅",
        "😭",
        "😂",
        "🥰",
        "😰",
        "🤡",
        "👀",
        "🐴",
        "🐶",
        "❓",
        "❤️",
        "💔",
        "⭐",
        "🔥",
        "💩",
        "🔞",
        "⚠️",
        "🎁",
        "🎉",
      ],
    },
    {
      title: "小黄脸",
      list: [
        "😀",
        "😁",
        "😂",
        "🤣",
        "😅",
        "😊",
        "😋",
        "😘",
        "🥰",
        "😗",
        "🤩",
        "🤔",
        "🤨",
        "😐",
        "😑",
        "🙄",
        "😏",
        "😪",
        "😫",
        "🥱",
        "😜",
        "😒",
        "😔",
        "😨",
        "😰",
        "😱",
        "🥵",
        "😡",
        "🥳",
        "🥺",
        "🤭",
        "🧐",
        "😎",
        "🤓",
        "😭",
        "🤑",
        "🤮",
      ],
    },
    {
      title: "手势",
      list: ["🤏", "👉", "✌️", "👌", "👍", "👎", "🤝", "🙏", "👏"],
    },
    {
      title: "其他",
      list: ["🔞", "👻", "🤡", "🐔", "👀", "💩", "🐴", "🦄", "🐧", "🐶"],
    },
  ];
  const classicsEmoticons = [
    {
      name: "[狗头]",
      low: "https://i.imgur.com/io2SM1h.png",
      high: "https://i.imgur.com/0icl60r.png",
    },
    {
      name: "[doge]",
      low: "https://i.imgur.com/duWRpIu.png",
      high: "https://i.imgur.com/HyphI6d.png",
    },
    {
      name: "[受虐滑稽]",
      low: "https://i.imgur.com/Iy0taMy.png",
      high: "https://i.imgur.com/PS1pxd9.png",
    },
    {
      name: "[马]",
      low: "https://i.imgur.com/8EKZv7I.png",
      high: "https://i.imgur.com/ANFUX52.png",
    },
    {
      name: "[二哈]",
      low: "https://i.imgur.com/XKj1Tkx.png",
      high: "https://i.imgur.com/dOeP4XD.png",
    },
    {
      name: "[舔屏]",
      low: "https://i.imgur.com/Cvl7dyN.png",
      high: "https://i.imgur.com/LmETy9N.png",
    },
    {
      name: "[辣眼睛]",
      low: "https://i.imgur.com/cPNPYD5.png",
      high: "https://i.imgur.com/3fSUmi8.png",
    },
    {
      name: "[吃瓜]",
      low: "https://i.imgur.com/ee8Lq7H.png",
      high: "https://i.imgur.com/0L26og9.png",
    },
    {
      name: "[不高兴]",
      low: "https://i.imgur.com/huX6coX.png",
      high: "https://i.imgur.com/N7JEuvc.png",
    },
    // {
    //   name: '[呵呵]',
    //   low: 'https://i.imgur.com/RvoLAbX.png',
    //   high: 'https://i.imgur.com/xSzIqrK.png'
    // },
    {
      name: "[真棒]",
      low: "https://i.imgur.com/xr1UOz1.png",
      high: "https://i.imgur.com/w8YEw9Q.png",
    },
    {
      name: "[鄙视]",
      low: "https://i.imgur.com/u6jlqVq.png",
      high: "https://i.imgur.com/8JFNANq.png",
    },
    {
      name: "[疑问]",
      low: "https://i.imgur.com/F29pmQ6.png",
      high: "https://i.imgur.com/EbbTQAR.png",
    },
    {
      name: "[吐舌]",
      low: "https://i.imgur.com/InmIzl9.png",
      high: "https://i.imgur.com/Ovj56Cd.png",
    },
    // {
    //   name: '[嘲笑]',
    //   low: 'https://i.imgur.com/BaWcsMR.png',
    //   high: 'https://i.imgur.com/0OGfJw4.png'
    // },
    // {
    //   name: '[滑稽]',
    //   low: 'https://i.imgur.com/lmbN0yI.png',
    //   high: 'https://i.imgur.com/Pc0wH85.png'
    // },
    {
      name: "[笑眼]",
      low: "https://i.imgur.com/ZveiiGy.png",
      high: "https://i.imgur.com/PI1CfEr.png",
    },
    // {
    //   name: '[狂汗]',
    //   low: 'https://i.imgur.com/veWihk6.png',
    //   high: 'https://i.imgur.com/3LtHdQv.png'
    // },
    {
      name: "[大哭]",
      low: "https://i.imgur.com/hu4oR6C.png",
      high: "https://i.imgur.com/b4X9XLE.png",
    },
    {
      name: "[喷]",
      low: "https://i.imgur.com/bkw3VRr.png",
      high: "https://i.imgur.com/wnZL13L.png",
    },
    {
      name: "[苦笑]",
      low: "https://i.imgur.com/VUWFktU.png",
      high: "https://i.imgur.com/NAfspZ1.png",
    },
    {
      name: "[喝酒]",
      low: "https://i.imgur.com/2ZZSapE.png",
      high: "https://i.imgur.com/rVbSVak.png",
    },
    {
      name: "[捂脸]",
      low: "https://i.imgur.com/krir4IG.png",
      high: "https://i.imgur.com/qqBqgVm.png",
    },
    // {
    //   name: '[呕]',
    //   low: 'https://i.imgur.com/6CUiUxv.png',
    //   high: 'https://i.imgur.com/kgdxRsG.png'
    // },
    {
      name: "[阴险]",
      low: "https://i.imgur.com/MA8YqTP.png",
      high: "https://i.imgur.com/e94jbaT.png",
    },
    {
      name: "[怒]",
      low: "https://i.imgur.com/n4kWfGB.png",
      high: "https://i.imgur.com/iMXxNxh.png",
    },
    // {
    //   name: '[衰]',
    //   low: 'https://i.imgur.com/voHFDyQ.png',
    //   high: 'https://i.imgur.com/XffE6gu.png'
    // },
    // {
    //   name: '[合十]',
    //   low: 'https://i.imgur.com/I8x3ang.png',
    //   high: 'https://i.imgur.com/T4rJVee.png'
    // },
    // {
    //   name: '[赞]',
    //   low: 'https://i.imgur.com/lG44yUl.png',
    //   high: 'https://i.imgur.com/AoF5PLp.png'
    // },
    // {
    //   name: '[踩]',
    //   low: 'https://i.imgur.com/cJp0uKZ.png',
    //   high: 'https://i.imgur.com/1XYGfXj.png'
    // },
    // {
    //   name: '[爱心]',
    //   low: 'https://i.imgur.com/sLENaF5.png',
    //   high: 'https://i.imgur.com/dND56oX.png'
    // },
    //
    // {
    //   name: '[心碎]',
    //   low: 'https://i.imgur.com/AZxJzve.png',
    //   high: 'https://i.imgur.com/RiUsPci.png'
    // },
  ];
  const matchIconName = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  const stringToIcon = (value, validate, allowSimpleName, provider = "") => {
    const colonSeparated = value.split(":");
    if (value.slice(0, 1) === "@") {
      if (colonSeparated.length < 2 || colonSeparated.length > 3) {
        return null;
      }
      provider = colonSeparated.shift().slice(1);
    }
    if (colonSeparated.length > 3 || !colonSeparated.length) {
      return null;
    }
    if (colonSeparated.length > 1) {
      const name2 = colonSeparated.pop();
      const prefix = colonSeparated.pop();
      const result = {
        // Allow provider without '@': "provider:prefix:name"
        provider: colonSeparated.length > 0 ? colonSeparated[0] : provider,
        prefix,
        name: name2,
      };
      return validate && !validateIconName(result) ? null : result;
    }
    const name = colonSeparated[0];
    const dashSeparated = name.split("-");
    if (dashSeparated.length > 1) {
      const result = {
        provider,
        prefix: dashSeparated.shift(),
        name: dashSeparated.join("-"),
      };
      return validate && !validateIconName(result) ? null : result;
    }
    if (allowSimpleName && provider === "") {
      const result = {
        provider,
        prefix: "",
        name,
      };
      return validate && !validateIconName(result, allowSimpleName)
        ? null
        : result;
    }
    return null;
  };
  const validateIconName = (icon, allowSimpleName) => {
    if (!icon) {
      return false;
    }
    return !!(
      // Check prefix: cannot be empty, unless allowSimpleName is enabled
      // Check name: cannot be empty
      (
        ((allowSimpleName && icon.prefix === "") || !!icon.prefix) &&
        !!icon.name
      )
    );
  };
  const defaultIconDimensions = Object.freeze({
    left: 0,
    top: 0,
    width: 16,
    height: 16,
  });
  const defaultIconTransformations = Object.freeze({
    rotate: 0,
    vFlip: false,
    hFlip: false,
  });
  const defaultIconProps = Object.freeze({
    ...defaultIconDimensions,
    ...defaultIconTransformations,
  });
  const defaultExtendedIconProps = Object.freeze({
    ...defaultIconProps,
    body: "",
    hidden: false,
  });
  function mergeIconTransformations(obj1, obj2) {
    const result = {};
    if (!obj1.hFlip !== !obj2.hFlip) {
      result.hFlip = true;
    }
    if (!obj1.vFlip !== !obj2.vFlip) {
      result.vFlip = true;
    }
    const rotate = ((obj1.rotate || 0) + (obj2.rotate || 0)) % 4;
    if (rotate) {
      result.rotate = rotate;
    }
    return result;
  }
  function mergeIconData(parent, child) {
    const result = mergeIconTransformations(parent, child);
    for (const key in defaultExtendedIconProps) {
      if (key in defaultIconTransformations) {
        if (key in parent && !(key in result)) {
          result[key] = defaultIconTransformations[key];
        }
      } else if (key in child) {
        result[key] = child[key];
      } else if (key in parent) {
        result[key] = parent[key];
      }
    }
    return result;
  }
  function getIconsTree(data, names) {
    const icons = data.icons;
    const aliases = data.aliases || /* @__PURE__ */ Object.create(null);
    const resolved = /* @__PURE__ */ Object.create(null);
    function resolve(name) {
      if (icons[name]) {
        return (resolved[name] = []);
      }
      if (!(name in resolved)) {
        resolved[name] = null;
        const parent = aliases[name] && aliases[name].parent;
        const value = parent && resolve(parent);
        if (value) {
          resolved[name] = [parent].concat(value);
        }
      }
      return resolved[name];
    }
    Object.keys(icons).concat(Object.keys(aliases)).forEach(resolve);
    return resolved;
  }
  function internalGetIconData(data, name, tree) {
    const icons = data.icons;
    const aliases = data.aliases || /* @__PURE__ */ Object.create(null);
    let currentProps = {};
    function parse(name2) {
      currentProps = mergeIconData(
        icons[name2] || aliases[name2],
        currentProps,
      );
    }
    parse(name);
    tree.forEach(parse);
    return mergeIconData(data, currentProps);
  }
  function parseIconSet(data, callback) {
    const names = [];
    if (typeof data !== "object" || typeof data.icons !== "object") {
      return names;
    }
    if (data.not_found instanceof Array) {
      data.not_found.forEach((name) => {
        callback(name, null);
        names.push(name);
      });
    }
    const tree = getIconsTree(data);
    for (const name in tree) {
      const item = tree[name];
      if (item) {
        callback(name, internalGetIconData(data, name, item));
        names.push(name);
      }
    }
    return names;
  }
  const optionalPropertyDefaults = {
    provider: "",
    aliases: {},
    not_found: {},
    ...defaultIconDimensions,
  };
  function checkOptionalProps(item, defaults) {
    for (const prop in defaults) {
      if (prop in item && typeof item[prop] !== typeof defaults[prop]) {
        return false;
      }
    }
    return true;
  }
  function quicklyValidateIconSet(obj) {
    if (typeof obj !== "object" || obj === null) {
      return null;
    }
    const data = obj;
    if (
      typeof data.prefix !== "string" ||
      !obj.icons ||
      typeof obj.icons !== "object"
    ) {
      return null;
    }
    if (!checkOptionalProps(obj, optionalPropertyDefaults)) {
      return null;
    }
    const icons = data.icons;
    for (const name in icons) {
      const icon = icons[name];
      if (
        // Name cannot be empty
        !name || // Must have body
        typeof icon.body !== "string" || // Check other props
        !checkOptionalProps(icon, defaultExtendedIconProps)
      ) {
        return null;
      }
    }
    const aliases = data.aliases || /* @__PURE__ */ Object.create(null);
    for (const name in aliases) {
      const icon = aliases[name];
      const parent = icon.parent;
      if (
        // Name cannot be empty
        !name || // Parent must be set and point to existing icon
        typeof parent !== "string" ||
        (!icons[parent] && !aliases[parent]) || // Check other props
        !checkOptionalProps(icon, defaultExtendedIconProps)
      ) {
        return null;
      }
    }
    return data;
  }
  const dataStorage = /* @__PURE__ */ Object.create(null);
  function newStorage(provider, prefix) {
    return {
      provider,
      prefix,
      icons: /* @__PURE__ */ Object.create(null),
      missing: /* @__PURE__ */ new Set(),
    };
  }
  function getStorage(provider, prefix) {
    const providerStorage =
      dataStorage[provider] ||
      (dataStorage[provider] = /* @__PURE__ */ Object.create(null));
    return (
      providerStorage[prefix] ||
      (providerStorage[prefix] = newStorage(provider, prefix))
    );
  }
  function addIconSet(storage2, data) {
    if (!quicklyValidateIconSet(data)) {
      return [];
    }
    return parseIconSet(data, (name, icon) => {
      if (icon) {
        storage2.icons[name] = icon;
      } else {
        storage2.missing.add(name);
      }
    });
  }
  function addIconToStorage(storage2, name, icon) {
    try {
      if (typeof icon.body === "string") {
        storage2.icons[name] = { ...icon };
        return true;
      }
    } catch (err) {}
    return false;
  }
  let simpleNames = false;
  function allowSimpleNames(allow) {
    if (typeof allow === "boolean") {
      simpleNames = allow;
    }
    return simpleNames;
  }
  function getIconData(name) {
    const icon =
      typeof name === "string" ? stringToIcon(name, true, simpleNames) : name;
    if (icon) {
      const storage2 = getStorage(icon.provider, icon.prefix);
      const iconName = icon.name;
      return (
        storage2.icons[iconName] ||
        (storage2.missing.has(iconName) ? null : void 0)
      );
    }
  }
  function addIcon(name, data) {
    const icon = stringToIcon(name, true, simpleNames);
    if (!icon) {
      return false;
    }
    const storage2 = getStorage(icon.provider, icon.prefix);
    if (data) {
      return addIconToStorage(storage2, icon.name, data);
    } else {
      storage2.missing.add(icon.name);
      return true;
    }
  }
  function addCollection(data, provider) {
    if (typeof data !== "object") {
      return false;
    }
    if (typeof provider !== "string") {
      provider = data.provider || "";
    }
    if (simpleNames && !provider && !data.prefix) {
      let added = false;
      if (quicklyValidateIconSet(data)) {
        data.prefix = "";
        parseIconSet(data, (name, icon) => {
          if (addIcon(name, icon)) {
            added = true;
          }
        });
      }
      return added;
    }
    const prefix = data.prefix;
    if (
      !validateIconName({
        provider,
        prefix,
        name: "a",
      })
    ) {
      return false;
    }
    const storage2 = getStorage(provider, prefix);
    return !!addIconSet(storage2, data);
  }
  const defaultIconSizeCustomisations = Object.freeze({
    width: null,
    height: null,
  });
  const defaultIconCustomisations = Object.freeze({
    // Dimensions
    ...defaultIconSizeCustomisations,
    // Transformations
    ...defaultIconTransformations,
  });
  const unitsSplit = /(-?[0-9.]*[0-9]+[0-9.]*)/g;
  const unitsTest = /^-?[0-9.]*[0-9]+[0-9.]*$/g;
  function calculateSize(size, ratio, precision) {
    if (ratio === 1) {
      return size;
    }
    precision = precision || 100;
    if (typeof size === "number") {
      return Math.ceil(size * ratio * precision) / precision;
    }
    if (typeof size !== "string") {
      return size;
    }
    const oldParts = size.split(unitsSplit);
    if (oldParts === null || !oldParts.length) {
      return size;
    }
    const newParts = [];
    let code2 = oldParts.shift();
    let isNumber = unitsTest.test(code2);
    while (true) {
      if (isNumber) {
        const num = parseFloat(code2);
        if (isNaN(num)) {
          newParts.push(code2);
        } else {
          newParts.push(Math.ceil(num * ratio * precision) / precision);
        }
      } else {
        newParts.push(code2);
      }
      code2 = oldParts.shift();
      if (code2 === void 0) {
        return newParts.join("");
      }
      isNumber = !isNumber;
    }
  }
  function splitSVGDefs(content, tag = "defs") {
    let defs = "";
    let index;
    while ((index = content.indexOf("<" + tag)) >= 0) {
      const start = content.indexOf(">", index);
      const end = content.indexOf("</" + tag);
      if (start === -1 || end === -1) {
        break;
      }
      const endEnd = content.indexOf(">", end);
      if (endEnd === -1) {
        break;
      }
      defs += content.slice(start + 1, end).trim();
      content = content.slice(0, index).trim() + content.slice(endEnd + 1);
    }
    return {
      defs,
      content,
    };
  }
  function mergeDefsAndContent(defs, content) {
    return defs ? "<defs>" + defs + "</defs>" + content : content;
  }
  function wrapSVGContent(body, start, end) {
    const split = splitSVGDefs(body);
    return mergeDefsAndContent(split.defs, start + split.content + end);
  }
  const isUnsetKeyword = (value) =>
    value === "unset" || value === "undefined" || value === "none";
  function iconToSVG(icon, customisations) {
    const fullIcon = {
      ...defaultIconProps,
      ...icon,
    };
    const fullCustomisations = {
      ...defaultIconCustomisations,
      ...customisations,
    };
    const box = {
      left: fullIcon.left,
      top: fullIcon.top,
      width: fullIcon.width,
      height: fullIcon.height,
    };
    let body = fullIcon.body;
    [fullIcon, fullCustomisations].forEach((props) => {
      const transformations = [];
      const hFlip = props.hFlip;
      const vFlip = props.vFlip;
      let rotation = props.rotate;
      if (hFlip) {
        if (vFlip) {
          rotation += 2;
        } else {
          transformations.push(
            "translate(" +
              (box.width + box.left).toString() +
              " " +
              (0 - box.top).toString() +
              ")",
          );
          transformations.push("scale(-1 1)");
          box.top = box.left = 0;
        }
      } else if (vFlip) {
        transformations.push(
          "translate(" +
            (0 - box.left).toString() +
            " " +
            (box.height + box.top).toString() +
            ")",
        );
        transformations.push("scale(1 -1)");
        box.top = box.left = 0;
      }
      let tempValue;
      if (rotation < 0) {
        rotation -= Math.floor(rotation / 4) * 4;
      }
      rotation = rotation % 4;
      switch (rotation) {
        case 1:
          tempValue = box.height / 2 + box.top;
          transformations.unshift(
            "rotate(90 " +
              tempValue.toString() +
              " " +
              tempValue.toString() +
              ")",
          );
          break;
        case 2:
          transformations.unshift(
            "rotate(180 " +
              (box.width / 2 + box.left).toString() +
              " " +
              (box.height / 2 + box.top).toString() +
              ")",
          );
          break;
        case 3:
          tempValue = box.width / 2 + box.left;
          transformations.unshift(
            "rotate(-90 " +
              tempValue.toString() +
              " " +
              tempValue.toString() +
              ")",
          );
          break;
      }
      if (rotation % 2 === 1) {
        if (box.left !== box.top) {
          tempValue = box.left;
          box.left = box.top;
          box.top = tempValue;
        }
        if (box.width !== box.height) {
          tempValue = box.width;
          box.width = box.height;
          box.height = tempValue;
        }
      }
      if (transformations.length) {
        body = wrapSVGContent(
          body,
          '<g transform="' + transformations.join(" ") + '">',
          "</g>",
        );
      }
    });
    const customisationsWidth = fullCustomisations.width;
    const customisationsHeight = fullCustomisations.height;
    const boxWidth = box.width;
    const boxHeight = box.height;
    let width;
    let height;
    if (customisationsWidth === null) {
      height =
        customisationsHeight === null
          ? "1em"
          : customisationsHeight === "auto"
            ? boxHeight
            : customisationsHeight;
      width = calculateSize(height, boxWidth / boxHeight);
    } else {
      width = customisationsWidth === "auto" ? boxWidth : customisationsWidth;
      height =
        customisationsHeight === null
          ? calculateSize(width, boxHeight / boxWidth)
          : customisationsHeight === "auto"
            ? boxHeight
            : customisationsHeight;
    }
    const attributes = {};
    const setAttr = (prop, value) => {
      if (!isUnsetKeyword(value)) {
        attributes[prop] = value.toString();
      }
    };
    setAttr("width", width);
    setAttr("height", height);
    const viewBox = [box.left, box.top, boxWidth, boxHeight];
    attributes.viewBox = viewBox.join(" ");
    return {
      attributes,
      viewBox,
      body,
    };
  }
  const regex = /\sid="(\S+)"/g;
  const randomPrefix =
    "IconifyId" +
    Date.now().toString(16) +
    ((Math.random() * 16777216) | 0).toString(16);
  let counter = 0;
  function replaceIDs(body, prefix = randomPrefix) {
    const ids = [];
    let match;
    while ((match = regex.exec(body))) {
      ids.push(match[1]);
    }
    if (!ids.length) {
      return body;
    }
    const suffix =
      "suffix" + ((Math.random() * 16777216) | Date.now()).toString(16);
    ids.forEach((id) => {
      const newID =
        typeof prefix === "function"
          ? prefix(id)
          : prefix + (counter++).toString();
      const escapedID = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      body = body.replace(
        // Allowed characters before id: [#;"]
        // Allowed characters after id: [)"], .[a-z]
        new RegExp('([#;"])(' + escapedID + ')([")]|\\.[a-z])', "g"),
        "$1" + newID + suffix + "$3",
      );
    });
    body = body.replace(new RegExp(suffix, "g"), "");
    return body;
  }
  const storage = /* @__PURE__ */ Object.create(null);
  function setAPIModule(provider, item) {
    storage[provider] = item;
  }
  function getAPIModule(provider) {
    return storage[provider] || storage[""];
  }
  function createAPIConfig(source) {
    let resources;
    if (typeof source.resources === "string") {
      resources = [source.resources];
    } else {
      resources = source.resources;
      if (!(resources instanceof Array) || !resources.length) {
        return null;
      }
    }
    const result = {
      // API hosts
      resources,
      // Root path
      path: source.path || "/",
      // URL length limit
      maxURL: source.maxURL || 500,
      // Timeout before next host is used.
      rotate: source.rotate || 750,
      // Timeout before failing query.
      timeout: source.timeout || 5e3,
      // Randomise default API end point.
      random: source.random === true,
      // Start index
      index: source.index || 0,
      // Receive data after time out (used if time out kicks in first, then API module sends data anyway).
      dataAfterTimeout: source.dataAfterTimeout !== false,
    };
    return result;
  }
  const configStorage = /* @__PURE__ */ Object.create(null);
  const fallBackAPISources = [
    "https://api.simplesvg.com",
    "https://api.unisvg.com",
  ];
  const fallBackAPI = [];
  while (fallBackAPISources.length > 0) {
    if (fallBackAPISources.length === 1) {
      fallBackAPI.push(fallBackAPISources.shift());
    } else {
      if (Math.random() > 0.5) {
        fallBackAPI.push(fallBackAPISources.shift());
      } else {
        fallBackAPI.push(fallBackAPISources.pop());
      }
    }
  }
  configStorage[""] = createAPIConfig({
    resources: ["https://api.iconify.design"].concat(fallBackAPI),
  });
  function addAPIProvider(provider, customConfig) {
    const config2 = createAPIConfig(customConfig);
    if (config2 === null) {
      return false;
    }
    configStorage[provider] = config2;
    return true;
  }
  function getAPIConfig(provider) {
    return configStorage[provider];
  }
  const detectFetch = () => {
    let callback;
    try {
      callback = fetch;
      if (typeof callback === "function") {
        return callback;
      }
    } catch (err) {}
  };
  let fetchModule = detectFetch();
  function calculateMaxLength(provider, prefix) {
    const config2 = getAPIConfig(provider);
    if (!config2) {
      return 0;
    }
    let result;
    if (!config2.maxURL) {
      result = 0;
    } else {
      let maxHostLength = 0;
      config2.resources.forEach((item) => {
        const host = item;
        maxHostLength = Math.max(maxHostLength, host.length);
      });
      const url2 = prefix + ".json?icons=";
      result =
        config2.maxURL - maxHostLength - config2.path.length - url2.length;
    }
    return result;
  }
  function shouldAbort(status) {
    return status === 404;
  }
  const prepare = (provider, prefix, icons) => {
    const results = [];
    const maxLength = calculateMaxLength(provider, prefix);
    const type = "icons";
    let item = {
      type,
      provider,
      prefix,
      icons: [],
    };
    let length = 0;
    icons.forEach((name, index) => {
      length += name.length + 1;
      if (length >= maxLength && index > 0) {
        results.push(item);
        item = {
          type,
          provider,
          prefix,
          icons: [],
        };
        length = name.length;
      }
      item.icons.push(name);
    });
    results.push(item);
    return results;
  };
  function getPath(provider) {
    if (typeof provider === "string") {
      const config2 = getAPIConfig(provider);
      if (config2) {
        return config2.path;
      }
    }
    return "/";
  }
  const send = (host, params, callback) => {
    if (!fetchModule) {
      callback("abort", 424);
      return;
    }
    let path = getPath(params.provider);
    switch (params.type) {
      case "icons": {
        const prefix = params.prefix;
        const icons = params.icons;
        const iconsList = icons.join(",");
        const urlParams = new URLSearchParams({
          icons: iconsList,
        });
        path += prefix + ".json?" + urlParams.toString();
        break;
      }
      case "custom": {
        const uri = params.uri;
        path += uri.slice(0, 1) === "/" ? uri.slice(1) : uri;
        break;
      }
      default:
        callback("abort", 400);
        return;
    }
    let defaultError = 503;
    fetchModule(host + path)
      .then((response2) => {
        const status = response2.status;
        if (status !== 200) {
          setTimeout(() => {
            callback(shouldAbort(status) ? "abort" : "next", status);
          });
          return;
        }
        defaultError = 501;
        return response2.json();
      })
      .then((data) => {
        if (typeof data !== "object" || data === null) {
          setTimeout(() => {
            if (data === 404) {
              callback("abort", data);
            } else {
              callback("next", defaultError);
            }
          });
          return;
        }
        setTimeout(() => {
          callback("success", data);
        });
      })
      .catch(() => {
        callback("next", defaultError);
      });
  };
  const fetchAPIModule = {
    prepare,
    send,
  };
  function sortIcons(icons) {
    const result = {
      loaded: [],
      missing: [],
      pending: [],
    };
    const storage2 = /* @__PURE__ */ Object.create(null);
    icons.sort((a, b) => {
      if (a.provider !== b.provider) {
        return a.provider.localeCompare(b.provider);
      }
      if (a.prefix !== b.prefix) {
        return a.prefix.localeCompare(b.prefix);
      }
      return a.name.localeCompare(b.name);
    });
    let lastIcon = {
      provider: "",
      prefix: "",
      name: "",
    };
    icons.forEach((icon) => {
      if (
        lastIcon.name === icon.name &&
        lastIcon.prefix === icon.prefix &&
        lastIcon.provider === icon.provider
      ) {
        return;
      }
      lastIcon = icon;
      const provider = icon.provider;
      const prefix = icon.prefix;
      const name = icon.name;
      const providerStorage =
        storage2[provider] ||
        (storage2[provider] = /* @__PURE__ */ Object.create(null));
      const localStorage2 =
        providerStorage[prefix] ||
        (providerStorage[prefix] = getStorage(provider, prefix));
      let list;
      if (name in localStorage2.icons) {
        list = result.loaded;
      } else if (prefix === "" || localStorage2.missing.has(name)) {
        list = result.missing;
      } else {
        list = result.pending;
      }
      const item = {
        provider,
        prefix,
        name,
      };
      list.push(item);
    });
    return result;
  }
  function removeCallback(storages, id) {
    storages.forEach((storage2) => {
      const items = storage2.loaderCallbacks;
      if (items) {
        storage2.loaderCallbacks = items.filter((row) => row.id !== id);
      }
    });
  }
  function updateCallbacks(storage2) {
    if (!storage2.pendingCallbacksFlag) {
      storage2.pendingCallbacksFlag = true;
      setTimeout(() => {
        storage2.pendingCallbacksFlag = false;
        const items = storage2.loaderCallbacks
          ? storage2.loaderCallbacks.slice(0)
          : [];
        if (!items.length) {
          return;
        }
        let hasPending = false;
        const provider = storage2.provider;
        const prefix = storage2.prefix;
        items.forEach((item) => {
          const icons = item.icons;
          const oldLength = icons.pending.length;
          icons.pending = icons.pending.filter((icon) => {
            if (icon.prefix !== prefix) {
              return true;
            }
            const name = icon.name;
            if (storage2.icons[name]) {
              icons.loaded.push({
                provider,
                prefix,
                name,
              });
            } else if (storage2.missing.has(name)) {
              icons.missing.push({
                provider,
                prefix,
                name,
              });
            } else {
              hasPending = true;
              return true;
            }
            return false;
          });
          if (icons.pending.length !== oldLength) {
            if (!hasPending) {
              removeCallback([storage2], item.id);
            }
            item.callback(
              icons.loaded.slice(0),
              icons.missing.slice(0),
              icons.pending.slice(0),
              item.abort,
            );
          }
        });
      });
    }
  }
  let idCounter = 0;
  function storeCallback(callback, icons, pendingSources) {
    const id = idCounter++;
    const abort = removeCallback.bind(null, pendingSources, id);
    if (!icons.pending.length) {
      return abort;
    }
    const item = {
      id,
      icons,
      callback,
      abort,
    };
    pendingSources.forEach((storage2) => {
      (storage2.loaderCallbacks || (storage2.loaderCallbacks = [])).push(item);
    });
    return abort;
  }
  function listToIcons(list, validate = true, simpleNames2 = false) {
    const result = [];
    list.forEach((item) => {
      const icon =
        typeof item === "string"
          ? stringToIcon(item, validate, simpleNames2)
          : item;
      if (icon) {
        result.push(icon);
      }
    });
    return result;
  }
  var defaultConfig = {
    resources: [],
    index: 0,
    timeout: 2e3,
    rotate: 750,
    random: false,
    dataAfterTimeout: false,
  };
  function sendQuery(config2, payload, query, done) {
    const resourcesCount = config2.resources.length;
    const startIndex = config2.random
      ? Math.floor(Math.random() * resourcesCount)
      : config2.index;
    let resources;
    if (config2.random) {
      let list = config2.resources.slice(0);
      resources = [];
      while (list.length > 1) {
        const nextIndex = Math.floor(Math.random() * list.length);
        resources.push(list[nextIndex]);
        list = list.slice(0, nextIndex).concat(list.slice(nextIndex + 1));
      }
      resources = resources.concat(list);
    } else {
      resources = config2.resources
        .slice(startIndex)
        .concat(config2.resources.slice(0, startIndex));
    }
    const startTime = Date.now();
    let status = "pending";
    let queriesSent = 0;
    let lastError;
    let timer = null;
    let queue = [];
    let doneCallbacks = [];
    if (typeof done === "function") {
      doneCallbacks.push(done);
    }
    function resetTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }
    function abort() {
      if (status === "pending") {
        status = "aborted";
      }
      resetTimer();
      queue.forEach((item) => {
        if (item.status === "pending") {
          item.status = "aborted";
        }
      });
      queue = [];
    }
    function subscribe(callback, overwrite) {
      if (overwrite) {
        doneCallbacks = [];
      }
      if (typeof callback === "function") {
        doneCallbacks.push(callback);
      }
    }
    function getQueryStatus() {
      return {
        startTime,
        payload,
        status,
        queriesSent,
        queriesPending: queue.length,
        subscribe,
        abort,
      };
    }
    function failQuery() {
      status = "failed";
      doneCallbacks.forEach((callback) => {
        callback(void 0, lastError);
      });
    }
    function clearQueue() {
      queue.forEach((item) => {
        if (item.status === "pending") {
          item.status = "aborted";
        }
      });
      queue = [];
    }
    function moduleResponse(item, response2, data) {
      const isError = response2 !== "success";
      queue = queue.filter((queued) => queued !== item);
      switch (status) {
        case "pending":
          break;
        case "failed":
          if (isError || !config2.dataAfterTimeout) {
            return;
          }
          break;
        default:
          return;
      }
      if (response2 === "abort") {
        lastError = data;
        failQuery();
        return;
      }
      if (isError) {
        lastError = data;
        if (!queue.length) {
          if (!resources.length) {
            failQuery();
          } else {
            execNext();
          }
        }
        return;
      }
      resetTimer();
      clearQueue();
      if (!config2.random) {
        const index = config2.resources.indexOf(item.resource);
        if (index !== -1 && index !== config2.index) {
          config2.index = index;
        }
      }
      status = "completed";
      doneCallbacks.forEach((callback) => {
        callback(data);
      });
    }
    function execNext() {
      if (status !== "pending") {
        return;
      }
      resetTimer();
      const resource = resources.shift();
      if (resource === void 0) {
        if (queue.length) {
          timer = setTimeout(() => {
            resetTimer();
            if (status === "pending") {
              clearQueue();
              failQuery();
            }
          }, config2.timeout);
          return;
        }
        failQuery();
        return;
      }
      const item = {
        status: "pending",
        resource,
        callback: (status2, data) => {
          moduleResponse(item, status2, data);
        },
      };
      queue.push(item);
      queriesSent++;
      timer = setTimeout(execNext, config2.rotate);
      query(resource, payload, item.callback);
    }
    setTimeout(execNext);
    return getQueryStatus;
  }
  function initRedundancy(cfg) {
    const config2 = {
      ...defaultConfig,
      ...cfg,
    };
    let queries = [];
    function cleanup() {
      queries = queries.filter((item) => item().status === "pending");
    }
    function query(payload, queryCallback, doneCallback) {
      const query2 = sendQuery(
        config2,
        payload,
        queryCallback,
        (data, error) => {
          cleanup();
          if (doneCallback) {
            doneCallback(data, error);
          }
        },
      );
      queries.push(query2);
      return query2;
    }
    function find(callback) {
      return (
        queries.find((value) => {
          return callback(value);
        }) || null
      );
    }
    const instance = {
      query,
      find,
      setIndex: (index) => {
        config2.index = index;
      },
      getIndex: () => config2.index,
      cleanup,
    };
    return instance;
  }
  function emptyCallback$1() {}
  const redundancyCache = /* @__PURE__ */ Object.create(null);
  function getRedundancyCache(provider) {
    if (!redundancyCache[provider]) {
      const config2 = getAPIConfig(provider);
      if (!config2) {
        return;
      }
      const redundancy = initRedundancy(config2);
      const cachedReundancy = {
        config: config2,
        redundancy,
      };
      redundancyCache[provider] = cachedReundancy;
    }
    return redundancyCache[provider];
  }
  function sendAPIQuery(target, query, callback) {
    let redundancy;
    let send2;
    if (typeof target === "string") {
      const api = getAPIModule(target);
      if (!api) {
        callback(void 0, 424);
        return emptyCallback$1;
      }
      send2 = api.send;
      const cached = getRedundancyCache(target);
      if (cached) {
        redundancy = cached.redundancy;
      }
    } else {
      const config2 = createAPIConfig(target);
      if (config2) {
        redundancy = initRedundancy(config2);
        const moduleKey = target.resources ? target.resources[0] : "";
        const api = getAPIModule(moduleKey);
        if (api) {
          send2 = api.send;
        }
      }
    }
    if (!redundancy || !send2) {
      callback(void 0, 424);
      return emptyCallback$1;
    }
    return redundancy.query(query, send2, callback)().abort;
  }
  function emptyCallback() {}
  function loadedNewIcons(storage2) {
    if (!storage2.iconsLoaderFlag) {
      storage2.iconsLoaderFlag = true;
      setTimeout(() => {
        storage2.iconsLoaderFlag = false;
        updateCallbacks(storage2);
      });
    }
  }
  function checkIconNamesForAPI(icons) {
    const valid = [];
    const invalid = [];
    icons.forEach((name) => {
      (name.match(matchIconName) ? valid : invalid).push(name);
    });
    return {
      valid,
      invalid,
    };
  }
  function parseLoaderResponse(storage2, icons, data) {
    function checkMissing() {
      const pending = storage2.pendingIcons;
      icons.forEach((name) => {
        if (pending) {
          pending.delete(name);
        }
        if (!storage2.icons[name]) {
          storage2.missing.add(name);
        }
      });
    }
    if (data && typeof data === "object") {
      try {
        const parsed = addIconSet(storage2, data);
        if (!parsed.length) {
          checkMissing();
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }
    checkMissing();
    loadedNewIcons(storage2);
  }
  function parsePossiblyAsyncResponse(response2, callback) {
    if (response2 instanceof Promise) {
      response2
        .then((data) => {
          callback(data);
        })
        .catch(() => {
          callback(null);
        });
    } else {
      callback(response2);
    }
  }
  function loadNewIcons(storage2, icons) {
    if (!storage2.iconsToLoad) {
      storage2.iconsToLoad = icons;
    } else {
      storage2.iconsToLoad = storage2.iconsToLoad.concat(icons).sort();
    }
    if (!storage2.iconsQueueFlag) {
      storage2.iconsQueueFlag = true;
      setTimeout(() => {
        storage2.iconsQueueFlag = false;
        const { provider, prefix } = storage2;
        const icons2 = storage2.iconsToLoad;
        delete storage2.iconsToLoad;
        if (!icons2 || !icons2.length) {
          return;
        }
        const customIconLoader = storage2.loadIcon;
        if (storage2.loadIcons && (icons2.length > 1 || !customIconLoader)) {
          parsePossiblyAsyncResponse(
            storage2.loadIcons(icons2, prefix, provider),
            (data) => {
              parseLoaderResponse(storage2, icons2, data);
            },
          );
          return;
        }
        if (customIconLoader) {
          icons2.forEach((name) => {
            const response2 = customIconLoader(name, prefix, provider);
            parsePossiblyAsyncResponse(response2, (data) => {
              const iconSet = data
                ? {
                    prefix,
                    icons: {
                      [name]: data,
                    },
                  }
                : null;
              parseLoaderResponse(storage2, [name], iconSet);
            });
          });
          return;
        }
        const { valid, invalid } = checkIconNamesForAPI(icons2);
        if (invalid.length) {
          parseLoaderResponse(storage2, invalid, null);
        }
        if (!valid.length) {
          return;
        }
        const api = prefix.match(matchIconName) ? getAPIModule(provider) : null;
        if (!api) {
          parseLoaderResponse(storage2, valid, null);
          return;
        }
        const params = api.prepare(provider, prefix, valid);
        params.forEach((item) => {
          sendAPIQuery(provider, item, (data) => {
            parseLoaderResponse(storage2, item.icons, data);
          });
        });
      });
    }
  }
  const loadIcons = (icons, callback) => {
    const cleanedIcons = listToIcons(icons, true, allowSimpleNames());
    const sortedIcons = sortIcons(cleanedIcons);
    if (!sortedIcons.pending.length) {
      let callCallback = true;
      if (callback) {
        setTimeout(() => {
          if (callCallback) {
            callback(
              sortedIcons.loaded,
              sortedIcons.missing,
              sortedIcons.pending,
              emptyCallback,
            );
          }
        });
      }
      return () => {
        callCallback = false;
      };
    }
    const newIcons = /* @__PURE__ */ Object.create(null);
    const sources = [];
    let lastProvider, lastPrefix;
    sortedIcons.pending.forEach((icon) => {
      const { provider, prefix } = icon;
      if (prefix === lastPrefix && provider === lastProvider) {
        return;
      }
      lastProvider = provider;
      lastPrefix = prefix;
      sources.push(getStorage(provider, prefix));
      const providerNewIcons =
        newIcons[provider] ||
        (newIcons[provider] = /* @__PURE__ */ Object.create(null));
      if (!providerNewIcons[prefix]) {
        providerNewIcons[prefix] = [];
      }
    });
    sortedIcons.pending.forEach((icon) => {
      const { provider, prefix, name } = icon;
      const storage2 = getStorage(provider, prefix);
      const pendingQueue =
        storage2.pendingIcons ||
        (storage2.pendingIcons = /* @__PURE__ */ new Set());
      if (!pendingQueue.has(name)) {
        pendingQueue.add(name);
        newIcons[provider][prefix].push(name);
      }
    });
    sources.forEach((storage2) => {
      const list = newIcons[storage2.provider][storage2.prefix];
      if (list.length) {
        loadNewIcons(storage2, list);
      }
    });
    return callback
      ? storeCallback(callback, sortedIcons, sources)
      : emptyCallback;
  };
  function mergeCustomisations(defaults, item) {
    const result = {
      ...defaults,
    };
    for (const key in item) {
      const value = item[key];
      const valueType = typeof value;
      if (key in defaultIconSizeCustomisations) {
        if (
          value === null ||
          (value && (valueType === "string" || valueType === "number"))
        ) {
          result[key] = value;
        }
      } else if (valueType === typeof result[key]) {
        result[key] = key === "rotate" ? value % 4 : value;
      }
    }
    return result;
  }
  const separator = /[\s,]+/;
  function flipFromString(custom, flip) {
    flip.split(separator).forEach((str) => {
      const value = str.trim();
      switch (value) {
        case "horizontal":
          custom.hFlip = true;
          break;
        case "vertical":
          custom.vFlip = true;
          break;
      }
    });
  }
  function rotateFromString(value, defaultValue = 0) {
    const units = value.replace(/^-?[0-9.]*/, "");
    function cleanup(value2) {
      while (value2 < 0) {
        value2 += 4;
      }
      return value2 % 4;
    }
    if (units === "") {
      const num = parseInt(value);
      return isNaN(num) ? 0 : cleanup(num);
    } else if (units !== value) {
      let split = 0;
      switch (units) {
        case "%":
          split = 25;
          break;
        case "deg":
          split = 90;
      }
      if (split) {
        let num = parseFloat(value.slice(0, value.length - units.length));
        if (isNaN(num)) {
          return 0;
        }
        num = num / split;
        return num % 1 === 0 ? cleanup(num) : 0;
      }
    }
    return defaultValue;
  }
  function iconToHTML(body, attributes) {
    let renderAttribsHTML =
      body.indexOf("xlink:") === -1
        ? ""
        : ' xmlns:xlink="http://www.w3.org/1999/xlink"';
    for (const attr in attributes) {
      renderAttribsHTML += " " + attr + '="' + attributes[attr] + '"';
    }
    return (
      '<svg xmlns="http://www.w3.org/2000/svg"' +
      renderAttribsHTML +
      ">" +
      body +
      "</svg>"
    );
  }
  function encodeSVGforURL(svg) {
    return svg
      .replace(/"/g, "'")
      .replace(/%/g, "%25")
      .replace(/#/g, "%23")
      .replace(/</g, "%3C")
      .replace(/>/g, "%3E")
      .replace(/\s+/g, " ");
  }
  function svgToData(svg) {
    return "data:image/svg+xml," + encodeSVGforURL(svg);
  }
  function svgToURL(svg) {
    return 'url("' + svgToData(svg) + '")';
  }
  const defaultExtendedIconCustomisations = {
    ...defaultIconCustomisations,
    inline: false,
  };
  const svgDefaults = {
    xmlns: "http://www.w3.org/2000/svg",
    "xmlns:xlink": "http://www.w3.org/1999/xlink",
    "aria-hidden": true,
    role: "img",
  };
  const commonProps = {
    display: "inline-block",
  };
  const monotoneProps = {
    backgroundColor: "currentColor",
  };
  const coloredProps = {
    backgroundColor: "transparent",
  };
  const propsToAdd = {
    Image: "var(--svg)",
    Repeat: "no-repeat",
    Size: "100% 100%",
  };
  const propsToAddTo = {
    webkitMask: monotoneProps,
    mask: monotoneProps,
    background: coloredProps,
  };
  for (const prefix in propsToAddTo) {
    const list = propsToAddTo[prefix];
    for (const prop in propsToAdd) {
      list[prefix + prop] = propsToAdd[prop];
    }
  }
  const customisationAliases = {};
  ["horizontal", "vertical"].forEach((prefix) => {
    const attr = prefix.slice(0, 1) + "Flip";
    customisationAliases[prefix + "-flip"] = attr;
    customisationAliases[prefix.slice(0, 1) + "-flip"] = attr;
    customisationAliases[prefix + "Flip"] = attr;
  });
  function fixSize(value) {
    return value + (value.match(/^[-0-9.]+$/) ? "px" : "");
  }
  const render = (icon, props) => {
    const customisations = mergeCustomisations(
      defaultExtendedIconCustomisations,
      props,
    );
    const componentProps = { ...svgDefaults };
    const mode = props.mode || "svg";
    const style = {};
    const propsStyle = props.style;
    const customStyle =
      typeof propsStyle === "object" && !(propsStyle instanceof Array)
        ? propsStyle
        : {};
    for (let key in props) {
      const value = props[key];
      if (value === void 0) {
        continue;
      }
      switch (key) {
        case "icon":
        case "style":
        case "onLoad":
        case "mode":
        case "ssr":
          break;
        case "inline":
        case "hFlip":
        case "vFlip":
          customisations[key] =
            value === true || value === "true" || value === 1;
          break;
        case "flip":
          if (typeof value === "string") {
            flipFromString(customisations, value);
          }
          break;
        case "color":
          style.color = value;
          break;
        case "rotate":
          if (typeof value === "string") {
            customisations[key] = rotateFromString(value);
          } else if (typeof value === "number") {
            customisations[key] = value;
          }
          break;
        case "ariaHidden":
        case "aria-hidden":
          if (value !== true && value !== "true") {
            delete componentProps["aria-hidden"];
          }
          break;
        default: {
          const alias = customisationAliases[key];
          if (alias) {
            if (value === true || value === "true" || value === 1) {
              customisations[alias] = true;
            }
          } else if (defaultExtendedIconCustomisations[key] === void 0) {
            componentProps[key] = value;
          }
        }
      }
    }
    const item = iconToSVG(icon, customisations);
    const renderAttribs = item.attributes;
    if (customisations.inline) {
      style.verticalAlign = "-0.125em";
    }
    if (mode === "svg") {
      componentProps.style = {
        ...style,
        ...customStyle,
      };
      Object.assign(componentProps, renderAttribs);
      let localCounter = 0;
      let id = props.id;
      if (typeof id === "string") {
        id = id.replace(/-/g, "_");
      }
      componentProps["innerHTML"] = replaceIDs(
        item.body,
        id ? () => id + "ID" + localCounter++ : "iconifyVue",
      );
      return vue.h("svg", componentProps);
    }
    const { body, width, height } = icon;
    const useMask =
      mode === "mask" ||
      (mode === "bg" ? false : body.indexOf("currentColor") !== -1);
    const html = iconToHTML(body, {
      ...renderAttribs,
      width: width + "",
      height: height + "",
    });
    componentProps.style = {
      ...style,
      "--svg": svgToURL(html),
      width: fixSize(renderAttribs.width),
      height: fixSize(renderAttribs.height),
      ...commonProps,
      ...(useMask ? monotoneProps : coloredProps),
      ...customStyle,
    };
    return vue.h("span", componentProps);
  };
  allowSimpleNames(true);
  setAPIModule("", fetchAPIModule);
  if (typeof document !== "undefined" && typeof window !== "undefined") {
    const _window = window;
    if (_window.IconifyPreload !== void 0) {
      const preload = _window.IconifyPreload;
      const err = "Invalid IconifyPreload syntax.";
      if (typeof preload === "object" && preload !== null) {
        (preload instanceof Array ? preload : [preload]).forEach((item) => {
          try {
            if (
              // Check if item is an object and not null/array
              typeof item !== "object" ||
              item === null ||
              item instanceof Array || // Check for 'icons' and 'prefix'
              typeof item.icons !== "object" ||
              typeof item.prefix !== "string" || // Add icon set
              !addCollection(item)
            ) {
              console.error(err);
            }
          } catch (e2) {
            console.error(err);
          }
        });
      }
    }
    if (_window.IconifyProviders !== void 0) {
      const providers = _window.IconifyProviders;
      if (typeof providers === "object" && providers !== null) {
        for (let key in providers) {
          const err = "IconifyProviders[" + key + "] is invalid.";
          try {
            const value = providers[key];
            if (
              typeof value !== "object" ||
              !value ||
              value.resources === void 0
            ) {
              continue;
            }
            if (!addAPIProvider(key, value)) {
              console.error(err);
            }
          } catch (e2) {
            console.error(err);
          }
        }
      }
    }
  }
  const emptyIcon = {
    ...defaultIconProps,
    body: "",
  };
  const Icon = vue.defineComponent({
    // Do not inherit other attributes: it is handled by render()
    inheritAttrs: false,
    // Set initial data
    data() {
      return {
        // Current icon name
        _name: "",
        // Loading
        _loadingIcon: null,
        // Mounted status
        iconMounted: false,
        // Callback counter to trigger re-render
        counter: 0,
      };
    },
    mounted() {
      this.iconMounted = true;
    },
    unmounted() {
      this.abortLoading();
    },
    methods: {
      abortLoading() {
        if (this._loadingIcon) {
          this._loadingIcon.abort();
          this._loadingIcon = null;
        }
      },
      // Get data for icon to render or null
      getIcon(icon, onload, customise) {
        if (
          typeof icon === "object" &&
          icon !== null &&
          typeof icon.body === "string"
        ) {
          this._name = "";
          this.abortLoading();
          return {
            data: icon,
          };
        }
        let iconName;
        if (
          typeof icon !== "string" ||
          (iconName = stringToIcon(icon, false, true)) === null
        ) {
          this.abortLoading();
          return null;
        }
        let data = getIconData(iconName);
        if (!data) {
          if (!this._loadingIcon || this._loadingIcon.name !== icon) {
            this.abortLoading();
            this._name = "";
            if (data !== null) {
              this._loadingIcon = {
                name: icon,
                abort: loadIcons([iconName], () => {
                  this.counter++;
                }),
              };
            }
          }
          return null;
        }
        this.abortLoading();
        if (this._name !== icon) {
          this._name = icon;
          if (onload) {
            onload(icon);
          }
        }
        if (customise) {
          data = Object.assign({}, data);
          const customised = customise(
            data.body,
            iconName.name,
            iconName.prefix,
            iconName.provider,
          );
          if (typeof customised === "string") {
            data.body = customised;
          }
        }
        const classes = ["iconify"];
        if (iconName.prefix !== "") {
          classes.push("iconify--" + iconName.prefix);
        }
        if (iconName.provider !== "") {
          classes.push("iconify--" + iconName.provider);
        }
        return { data, classes };
      },
    },
    // Render icon
    render() {
      this.counter;
      const props = this.$attrs;
      const icon =
        this.iconMounted || props.ssr
          ? this.getIcon(props.icon, props.onLoad, props.customise)
          : null;
      if (!icon) {
        return render(emptyIcon, props);
      }
      let newProps = props;
      if (icon.classes) {
        newProps = {
          ...props,
          class:
            (typeof props["class"] === "string" ? props["class"] + " " : "") +
            icon.classes.join(" "),
        };
      }
      return render(
        {
          ...defaultIconProps,
          ...icon.data,
        },
        newProps,
      );
    },
  });
  const _hoisted_1$i = { class: "display-type" };
  const _hoisted_2$f = { style: { position: "relative" } };
  const _hoisted_3$b = {
    key: 0,
    class: "type-list",
  };
  const _sfc_main$k = /* @__PURE__ */ vue.defineComponent({
    __name: "BaseSelect",
    props: {
      displayType: {},
    },
    emits: ["update:displayType"],
    setup(__props, { emit: __emit }) {
      const props = __props;
      const emit = __emit;
      let state = vue.reactive({
        showChangeDisplayType: false,
        lastDisplayType: null,
      });
      function changeOption(item) {
        if (
          ![CommentDisplayType.New, CommentDisplayType.Like].includes(
            props.displayType,
          )
        ) {
          state.lastDisplayType = props.displayType;
        }
        emit("update:displayType", item);
        state.showChangeDisplayType = false;
      }
      function clickDisplayType() {
        if (
          [CommentDisplayType.New, CommentDisplayType.Like].includes(
            props.displayType,
          )
        ) {
          return changeOption(
            state.lastDisplayType ?? CommentDisplayType.FloorInFloorNoCallUser,
          );
        }
        state.showChangeDisplayType = !state.showChangeDisplayType;
      }
      const currentDisplayType = vue.computed(() => {
        let judge = props.displayType;
        if (
          [CommentDisplayType.New, CommentDisplayType.Like].includes(
            props.displayType,
          )
        ) {
          judge = state.lastDisplayType;
        }
        switch (judge) {
          case CommentDisplayType.FloorInFloorNoCallUser:
            return "楼中楼";
          case CommentDisplayType.FloorInFloor:
            return "楼中楼(@)";
          case CommentDisplayType.FloorInFloorNested:
            return "冗余楼中楼";
          case CommentDisplayType.V2exOrigin:
            return "V2原版";
          case CommentDisplayType.OnlyOp:
            return "只看楼主";
          default:
            return "楼中楼";
        }
      });
      return (_ctx, _cache) => {
        return (
          vue.openBlock(),
          vue.createElementBlock("div", _hoisted_1$i, [
            vue.createElementVNode(
              "div",
              {
                class: vue.normalizeClass([
                  "type",
                  _ctx.displayType === vue.unref(CommentDisplayType).New &&
                    "active",
                ]),
                onClick:
                  _cache[0] ||
                  (_cache[0] = ($event) =>
                    changeOption(vue.unref(CommentDisplayType).New)),
              },
              "最新 ",
              2,
            ),
            vue.createElementVNode(
              "div",
              {
                class: vue.normalizeClass([
                  "type",
                  _ctx.displayType === vue.unref(CommentDisplayType).Like &&
                    "active",
                ]),
                onClick:
                  _cache[1] ||
                  (_cache[1] = ($event) =>
                    changeOption(vue.unref(CommentDisplayType).Like)),
              },
              "最热 ",
              2,
            ),
            vue.createElementVNode("div", _hoisted_2$f, [
              vue.createElementVNode(
                "div",
                {
                  class: vue.normalizeClass([
                    "type",
                    ![
                      vue.unref(CommentDisplayType).New,
                      vue.unref(CommentDisplayType).Like,
                    ].includes(_ctx.displayType) && "active",
                  ]),
                  onClick: clickDisplayType,
                },
                [
                  vue.createElementVNode(
                    "span",
                    null,
                    vue.toDisplayString(currentDisplayType.value),
                    1,
                  ),
                  vue.createVNode(vue.unref(Icon), {
                    icon: "mingcute:down-line",
                  }),
                ],
                2,
              ),
              vue.unref(state).showChangeDisplayType
                ? (vue.openBlock(),
                  vue.createElementBlock("div", _hoisted_3$b, [
                    vue.createElementVNode(
                      "div",
                      {
                        class: vue.normalizeClass([
                          "item",
                          _ctx.displayType ===
                            vue.unref(CommentDisplayType)
                              .FloorInFloorNoCallUser && "active",
                        ]),
                        onClick:
                          _cache[2] ||
                          (_cache[2] = vue.withModifiers(
                            ($event) =>
                              changeOption(
                                vue.unref(CommentDisplayType)
                                  .FloorInFloorNoCallUser,
                              ),
                            ["stop"],
                          )),
                      },
                      "楼中楼 ",
                      2,
                    ),
                    vue.createElementVNode(
                      "div",
                      {
                        class: vue.normalizeClass([
                          "item",
                          _ctx.displayType ===
                            vue.unref(CommentDisplayType).FloorInFloor &&
                            "active",
                        ]),
                        onClick:
                          _cache[3] ||
                          (_cache[3] = vue.withModifiers(
                            ($event) =>
                              changeOption(
                                vue.unref(CommentDisplayType).FloorInFloor,
                              ),
                            ["stop"],
                          )),
                      },
                      "楼中楼(@) ",
                      2,
                    ),
                    vue.createElementVNode(
                      "div",
                      {
                        class: vue.normalizeClass([
                          "item",
                          _ctx.displayType ===
                            vue.unref(CommentDisplayType).FloorInFloorNested &&
                            "active",
                        ]),
                        onClick:
                          _cache[4] ||
                          (_cache[4] = vue.withModifiers(
                            ($event) =>
                              changeOption(
                                vue.unref(CommentDisplayType)
                                  .FloorInFloorNested,
                              ),
                            ["stop"],
                          )),
                      },
                      "冗余楼中楼 ",
                      2,
                    ),
                    vue.createElementVNode(
                      "div",
                      {
                        class: vue.normalizeClass([
                          "item",
                          _ctx.displayType ===
                            vue.unref(CommentDisplayType).OnlyOp && "active",
                        ]),
                        onClick:
                          _cache[5] ||
                          (_cache[5] = vue.withModifiers(
                            ($event) =>
                              changeOption(
                                vue.unref(CommentDisplayType).OnlyOp,
                              ),
                            ["stop"],
                          )),
                      },
                      "只看楼主 ",
                      2,
                    ),
                    vue.createElementVNode(
                      "div",
                      {
                        class: vue.normalizeClass([
                          "item",
                          _ctx.displayType ===
                            vue.unref(CommentDisplayType).V2exOrigin &&
                            "active",
                        ]),
                        onClick:
                          _cache[6] ||
                          (_cache[6] = vue.withModifiers(
                            ($event) =>
                              changeOption(
                                vue.unref(CommentDisplayType).V2exOrigin,
                              ),
                            ["stop"],
                          )),
                      },
                      "V2原版 ",
                      2,
                    ),
                  ]))
                : vue.createCommentVNode("", true),
            ]),
          ])
        );
      };
    },
  });
  const BaseSelect = /* @__PURE__ */ _export_sfc(_sfc_main$k, [
    ["__scopeId", "data-v-e4f684be"],
  ]);
  const eventBus = {
    eventMap: /* @__PURE__ */ new Map(),
    on(eventType, cb) {
      let cbs = this.eventMap.get(eventType);
      if (cbs) {
        cbs.push(cb);
      } else {
        cbs = [cb];
      }
      this.eventMap.set(eventType, cbs);
    },
    offOne(eventType, cb) {
      let cbs = this.eventMap.get(eventType);
      if (cbs) {
        let rIndex = cbs.findIndex((c) => c === cb);
        if (rIndex > -1) {
          cbs.splice(rIndex, 1);
        }
      }
      this.eventMap.set(eventType, cbs);
    },
    emit(eventType, val) {
      let cbs = this.eventMap.get(eventType);
      if (cbs) {
        cbs.forEach((cb) => cb(val));
      }
    },
    off(eventType) {
      if (this.eventMap.has(eventType)) {
        this.eventMap.delete(eventType);
      }
    },
    clear() {
      this.eventMap = /* @__PURE__ */ new Map();
    },
  };
  const CMD = {
    SHOW_TOOLTIP: "SHOW_TOOLTIP",
    SHOW_MSG: "SHOW_MSG",
    SET_CALL: "SET_CALL",
    SHOW_CALL: "SHOW_CALL",
    REFRESH_ONCE: "REFRESH_ONCE",
    ADD_REPLY: "ADD_REPLY",
    IGNORE: "IGNORE",
    MERGE: "MERGE",
    REMOVE: "REMOVE",
    CHANGE_COMMENT_THANK: "CHANGE_COMMENT_THANK",
    CHANGE_POST_THANK: "CHANGE_POST_THANK",
    ADD_TAG: "ADD_TAG",
    REMOVE_TAG: "REMOVE_TAG",
    SYNC_TAGS: "SYNC_TAGS",
    RELATION_REPLY: "RELATION_REPLY",
    JUMP: "JUMP",
    REFRESH_POST: "REFRESH_POST",
    SHOW_CONFIRM_MODAL: "SHOW_CONFIRM_MODAL",
    SHOW_CONFIRM_MODAL_CONFIRM: "SHOW_CONFIRM_MODAL_CONFIRM",
  };
  const _sfc_main$j = {
    name: "PopConfirm",
    props: {
      title: {
        type: String,
        default() {
          return "";
        },
      },
      disabled: {
        type: Boolean,
        default() {
          return false;
        },
      },
    },
    data() {
      return {
        id: "",
      };
    },
    created() {},
    methods: {
      cb(id) {
        if (id === this.id) {
          this.$emit("confirm");
          this.id = "";
        }
      },
      showPop(e2) {
        if (this.disabled) return;
        let rect = e2.target.getBoundingClientRect();
        this.id = Date.now();
        eventBus.emit(CMD.SHOW_CONFIRM_MODAL, {
          title: this.title,
          rect,
          id: this.id,
        });
        eventBus.offOne(CMD.SHOW_CONFIRM_MODAL_CONFIRM, this.cb);
        eventBus.on(CMD.SHOW_CONFIRM_MODAL_CONFIRM, this.cb);
      },
    },
    unmounted() {
      eventBus.offOne(CMD.SHOW_CONFIRM_MODAL_CONFIRM, this.cb);
    },
  };
  function _sfc_render$a(_ctx, _cache, $props, $setup, $data, $options) {
    return (
      vue.openBlock(),
      vue.createElementBlock(
        "span",
        {
          onClick:
            _cache[0] ||
            (_cache[0] = vue.withModifiers(
              (...args) => $options.showPop && $options.showPop(...args),
              ["stop"],
            )),
        },
        [vue.renderSlot(_ctx.$slots, "default")],
      )
    );
  }
  const PopConfirm = /* @__PURE__ */ _export_sfc(_sfc_main$j, [
    ["render", _sfc_render$a],
  ]);
  const _sfc_main$i = /* @__PURE__ */ vue.defineComponent({
    __name: "BaseLoading",
    props: {
      size: { default: "normal" },
    },
    setup(__props) {
      return (_ctx, _cache) => {
        return (
          vue.openBlock(),
          vue.createElementBlock(
            "div",
            {
              class: vue.normalizeClass(["loading", [_ctx.size]]),
            },
            null,
            2,
          )
        );
      };
    },
  });
  const BaseLoading = /* @__PURE__ */ _export_sfc(_sfc_main$i, [
    ["__scopeId", "data-v-2697baa2"],
  ]);
  const _hoisted_1$h = {
    key: 1,
    class: "key-notice",
  };
  const _hoisted_2$e = { class: "key" };
  const _sfc_main$h = /* @__PURE__ */ vue.defineComponent({
    __name: "BaseButton",
    props: {
      keyboard: {},
      active: { type: Boolean },
      disabled: { type: Boolean },
      loading: { type: Boolean },
      size: { default: "normal" },
      type: { default: "primary" },
    },
    emits: ["click"],
    setup(__props) {
      return (_ctx, _cache) => {
        return (
          vue.openBlock(),
          vue.createBlock(
            Tooltip,
            {
              disabled: !_ctx.keyboard,
              title: `快捷键: ${_ctx.keyboard}`,
            },
            {
              default: vue.withCtx(() => [
                vue.createElementVNode(
                  "div",
                  vue.mergeProps({ class: "base-button" }, _ctx.$attrs, {
                    onClick:
                      _cache[0] ||
                      (_cache[0] = (e2) =>
                        !_ctx.disabled &&
                        !_ctx.loading &&
                        _ctx.$emit("click", e2)),
                    class: [
                      _ctx.active && "active",
                      _ctx.size,
                      _ctx.type,
                      (_ctx.disabled || _ctx.loading) && "disabled",
                      !_ctx.disabled && "hvr-grow",
                    ],
                  }),
                  [
                    vue.createElementVNode(
                      "span",
                      {
                        style: vue.normalizeStyle({
                          opacity: _ctx.loading ? 0 : 1,
                        }),
                      },
                      [
                        vue.renderSlot(
                          _ctx.$slots,
                          "default",
                          {},
                          void 0,
                          true,
                        ),
                      ],
                      4,
                    ),
                    _ctx.loading
                      ? (vue.openBlock(),
                        vue.createBlock(BaseLoading, {
                          key: 0,
                          size: "small",
                        }))
                      : vue.createCommentVNode("", true),
                    _ctx.keyboard
                      ? (vue.openBlock(),
                        vue.createElementBlock("div", _hoisted_1$h, [
                          vue.createElementVNode(
                            "span",
                            _hoisted_2$e,
                            vue.toDisplayString(_ctx.keyboard),
                            1,
                          ),
                        ]))
                      : vue.createCommentVNode("", true),
                  ],
                  16,
                ),
              ]),
              _: 3,
            },
            8,
            ["disabled", "title"],
          )
        );
      };
    },
  });
  const BaseButton = /* @__PURE__ */ _export_sfc(_sfc_main$h, [
    ["__scopeId", "data-v-5a7d79ba"],
  ]);
  const _sfc_main$g = {
    name: "Setting",
    components: {
      BaseButton,
      PopConfirm,
      Icon,
      BaseSelect,
      BaseSwitch,
      Tooltip,
    },
    inject: ["isNight"],
    props: {
      show: {
        type: Boolean,
        default() {
          return false;
        },
      },
    },
    data() {
      return {
        tabIndex: 0,
      };
    },
    methods: {
      confirm() {
        this.close();
        this.$emit("confirm");
      },
      close() {
        this.$emit("update:show", false);
      },
    },
  };
  const _hoisted_1$g = {
    key: 0,
    class: "setting-modal modal",
  };
  const _hoisted_2$d = { class: "modal-root" };
  const _hoisted_3$a = { class: "modal-header" };
  const _hoisted_4$9 = { class: "body" };
  const _hoisted_5$8 = { class: "btns" };
  function _sfc_render$9(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_Icon = vue.resolveComponent("Icon");
    const _component_BaseButton = vue.resolveComponent("BaseButton");
    return (
      vue.openBlock(),
      vue.createBlock(vue.Transition, null, {
        default: vue.withCtx(() => [
          $props.show
            ? (vue.openBlock(),
              vue.createElementBlock("div", _hoisted_1$g, [
                vue.createElementVNode("div", {
                  class: "mask",
                  onClick:
                    _cache[0] ||
                    (_cache[0] = (...args) =>
                      $options.close && $options.close(...args)),
                }),
                vue.createElementVNode("div", _hoisted_2$d, [
                  vue.createElementVNode("div", _hoisted_3$a, [
                    _cache[1] ||
                      (_cache[1] = vue.createElementVNode(
                        "div",
                        { class: "title" },
                        " 使用需知 ",
                        -1,
                      )),
                    vue.createVNode(
                      _component_Icon,
                      {
                        icon: "ic:round-close",
                        onClick: $options.close,
                      },
                      null,
                      8,
                      ["onClick"],
                    ),
                  ]),
                  vue.createElementVNode("div", _hoisted_4$9, [
                    _cache[4] ||
                      (_cache[4] = vue.createElementVNode(
                        "div",
                        { class: "modal-content" },
                        [
                          vue.createElementVNode(
                            "div",
                            null,
                            "开启此功能会带来以下影响",
                          ),
                          vue.createElementVNode("div", null, "缺点"),
                          vue.createElementVNode(
                            "div",
                            { style: { color: "red" } },
                            [
                              vue.createElementVNode(
                                "div",
                                null,
                                "1、你的IP可能会被封禁",
                              ),
                              vue.createElementVNode(
                                "div",
                                null,
                                "2、消耗更多流量，给服务器带来更大的负担",
                              ),
                              vue.createElementVNode(
                                "div",
                                null,
                                "3、你的V站浏览进度条会变快",
                              ),
                            ],
                          ),
                          vue.createElementVNode("div", null, "优点"),
                          vue.createElementVNode(
                            "div",
                            null,
                            "1、卡片模式，无需打开主题即可查看内容",
                          ),
                          vue.createElementVNode(
                            "div",
                            null,
                            "2、打开主题时提前预览正文内容，无需等待加载",
                          ),
                          vue.createElementVNode("div", null, "原理"),
                          vue.createElementVNode(
                            "div",
                            null,
                            "1、解析列表所有主题ID，批量调用show.json接口，获取对应主题的正文",
                          ),
                          vue.createElementVNode(
                            "div",
                            null,
                            "2、请求的主题数据会缓存到本地，不会重复请求，超过3天的数据会删除",
                          ),
                          vue.createElementVNode(
                            "div",
                            null,
                            "3、前面4条会并发请求，4条以后的一秒请求一条",
                          ),
                        ],
                        -1,
                      )),
                    vue.createElementVNode("div", _hoisted_5$8, [
                      vue.createVNode(
                        _component_BaseButton,
                        {
                          type: "link",
                          onClick: $options.close,
                        },
                        {
                          default: vue.withCtx(() => [
                            ...(_cache[2] ||
                              (_cache[2] = [
                                vue.createTextVNode("不同意", -1),
                              ])),
                          ]),
                          _: 1,
                        },
                        8,
                        ["onClick"],
                      ),
                      vue.createVNode(
                        _component_BaseButton,
                        { onClick: $options.confirm },
                        {
                          default: vue.withCtx(() => [
                            ...(_cache[3] ||
                              (_cache[3] = [vue.createTextVNode("同意", -1)])),
                          ]),
                          _: 1,
                        },
                        8,
                        ["onClick"],
                      ),
                    ]),
                  ]),
                ]),
              ]))
            : vue.createCommentVNode("", true),
        ]),
        _: 1,
      })
    );
  }
  const NoticeModal = /* @__PURE__ */ _export_sfc(_sfc_main$g, [
    ["render", _sfc_render$9],
    ["__scopeId", "data-v-386b43d0"],
  ]);
  const _sfc_main$f = {
    name: "Setting",
    components: {
      BaseButton,
      NoticeModal,
      PopConfirm,
      Icon,
      BaseSelect,
      BaseSwitch,
      Tooltip,
    },
    inject: ["isNight", "isLogin"],
    props: {
      modelValue: {
        type: Object,
        default() {
          return {};
        },
      },
      show: {
        type: Boolean,
        default() {
          return false;
        },
      },
    },
    data() {
      return {
        tabIndex: 0,
        config: functions.clone(this.modelValue),
        showNotice: false,
        exportLoading: false,
        importLoading: false,
        importOk: false,
        showInput: true,
        total: 0,
        index: 0,
        endTime: "0",
      };
    },
    computed: {
      DefaultVal() {
        return DefaultVal;
      },
      CommentDisplayType() {
        return CommentDisplayType;
      },
      isNew() {
        return (
          this.config.version < DefaultVal.currentVersion && window.isDeadline
        );
      },
    },
    watch: {
      config: {
        handler(n2) {
          n2.topReplyLoveMinCount = Math.trunc(n2.topReplyLoveMinCount);
          if (n2.topReplyLoveMinCount < 0) {
            n2.topReplyLoveMinCount = 1;
          }
          n2.topReplyMaxPages = Math.trunc(Number(n2.topReplyMaxPages));
          if (
            !Number.isFinite(n2.topReplyMaxPages) ||
            n2.topReplyMaxPages < 1
          ) {
            n2.topReplyMaxPages = TOP_REPLY_DEFAULT_MAX_PAGES;
          }
          if (n2.topReplyMaxPages > TOP_REPLY_MAX_PAGES_LIMIT) {
            n2.topReplyMaxPages = TOP_REPLY_MAX_PAGES_LIMIT;
          }
          n2.collapseHeight = Math.trunc(Number(n2.collapseHeight));
          if (!Number.isFinite(n2.collapseHeight) || n2.collapseHeight < 200) {
            n2.collapseHeight = 900;
          }
          if (n2.collapseHeight > 5000) {
            n2.collapseHeight = 5000;
          }
          this.$emit("update:modelValue", n2);
        },
        deep: true,
      },
      "config.notice.loopCheckNotice"(n2) {
        if (n2) {
          this.config.notice.loopCheckNoticeInterval = 5;
          this.config.notice.whenNewNoticeGlimmer = false;
        } else {
          this.config.notice.loopCheckNoticeInterval = 0;
          this.config.notice.whenNewNoticeGlimmer = false;
          this.config.notice.ddWebhook = "";
        }
      },
      show(n2) {
        if (n2) {
          if (this.config.version < DefaultVal.currentVersion) {
            $(".v2pro-new").remove();
          }
          document.body.style.overflow = "hidden";
        } else {
          document.body.style.overflow = "unset";
        }
      },
    },
    methods: {
      goPost() {
        fetch(DefaultVal.hotUrl + "new.txt")
          .then(async (r2) => {
            let r22 = await r2.text();
            if (r22) {
              functions.openNewTab(r22, true);
            } else {
              functions.openNewTab(DefaultVal.git, true);
            }
          })
          .catch(() => functions.openNewTab(DefaultVal.git, true));
      },
      close() {
        if (window.isDeadline) {
          this.config.version = DefaultVal.currentVersion;
        }
        this.$emit("update:show", false);
      },
      exportCollectList() {
        if (!this.isLogin) {
          return eventBus.emit(CMD.SHOW_MSG, {
            type: "warning",
            text: "请先登录！",
          });
        }
        try {
          let run2 = function (i) {
            return new Promise((resolve) => {
              $.get(`/my/topics?p=${i}`).then((res) => {
                let body = $(functions.genDomFromHtmlString(res));
                let total = body.find(".page_normal").last().text();
                if (typeof total === "string") {
                  total = Number(total);
                }
                let list = [];
                body.find(".topic-link").each(function () {
                  let a = functions.parseA(this);
                  list.push({
                    title: a.title,
                    url: location.origin + "/t/" + a.id,
                  });
                });
                resolve({ list, total });
              });
            });
          };
          let allList = [];
          this.exportLoading = true;
          run2(1).then(async (r2) => {
            allList = allList.concat(r2.list);
            if (r2.total > 1) {
              let getList = [];
              for (let i = 2; i <= r2.total; i++) {
                getList.push(run2(i));
              }
              let b = await Promise.allSettled(getList);
              allList = allList.concat(
                b
                  .filter(
                    (v) => v.status === "fulfilled" && v.value && v.value.list,
                  )
                  .map((v) => v.value.list)
                  .flat(),
              );
            }
            let pom = document.createElement("a");
            pom.setAttribute(
              "href",
              "data:text/plain;charset=utf-8," +
                encodeURIComponent(JSON.stringify(allList, null, 2)),
            );
            pom.setAttribute("download", "V2EX-收藏.json");
            pom.click();
            this.exportLoading = false;
            eventBus.emit(CMD.SHOW_MSG, {
              type: "success",
              text: "收藏列表导出成功！",
            });
          });
        } catch (e2) {
          this.exportLoading = false;
          eventBus.emit(CMD.SHOW_MSG, {
            type: "error",
            text: "收藏列表导出失败！",
          });
        }
      },
      importCollectList(e2) {
        if (!this.isLogin) {
          return eventBus.emit(CMD.SHOW_MSG, {
            type: "warning",
            text: "请先登录！",
          });
        }
        let file = e2.target.files && e2.target.files[0];
        if (!file) return;
        let fileName = file.name.split(".").pop().toLowerCase();
        if (fileName !== "json") {
          return eventBus.emit(CMD.SHOW_MSG, {
            type: "error",
            text: "请导入 json 格式文件！",
          });
        }
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = async () => {
          if (reader.result) {
            try {
              let list = JSON.parse(reader.result);
              this.importLoading = true;
              this.total = list.length;
              for (let i = 0; i < list.length; i++) {
                this.endTime = Math.floor(((list.length - i) * 10) / 60);
                this.index = i;
                let v = list[i];
                let a = document.createElement("a");
                a.href = v.url;
                let { id } = functions.parseA(a);
                a.remove();
                let apiRes = await fetch(v.url);
                let htmlText = await apiRes.text();
                let hasPermission = htmlText.search("你要查看的页面需要先登录");
                if (
                  hasPermission > -1 ||
                  apiRes.status === 404 ||
                  apiRes.redirected
                ) {
                  continue;
                }
                if (htmlText.search("加入收藏") > -1) {
                  let once = await window.fetchOnce();
                  let url2 = `${location.origin}/favorite/topic/${id}?once=${once}`;
                  await fetch(url2);
                  await functions.sleep(1e4);
                } else {
                }
                await functions.sleep(1e3);
              }
              this.importLoading = false;
              this.importOk = true;
            } catch (e3) {
              this.importLoading = false;
              eventBus.emit(CMD.SHOW_MSG, {
                type: "error",
                text: "数据解析失败！",
              });
            }
          } else {
            eventBus.emit(CMD.SHOW_MSG, { type: "error", text: "数据为空！" });
          }
        };
        this.showInput = false;
        setTimeout(() => {
          this.showInput = true;
        }, 200);
      },
    },
  };
  const _hoisted_1$f = {
    key: 0,
    class: "setting-modal modal",
  };
  const _hoisted_2$c = { class: "modal-root" };
  const _hoisted_3$9 = { class: "modal-header" };
  const _hoisted_4$8 = {
    key: 0,
    class: "log",
  };
  const _hoisted_5$7 = { class: "body" };
  const _hoisted_6$7 = { class: "left" };
  const _hoisted_7$7 = { class: "tabs" };
  const _hoisted_8$7 = { class: "bottom" };
  const _hoisted_9$7 = { class: "icons" };
  const _hoisted_10$7 = ["href"];
  const _hoisted_11$6 = ["href"];
  const _hoisted_12$5 = { class: "modal-content" };
  const _hoisted_13$5 = { class: "scroll" };
  const _hoisted_14$4 = { key: 0 };
  const _hoisted_15$3 = { class: "border" };
  const _hoisted_16$3 = { class: "row" };
  const _hoisted_17$2 = { class: "wrapper" };
  const _hoisted_18$2 = { class: "radio-group2" };
  const _hoisted_19$2 = { class: "border" };
  const _hoisted_20$2 = { class: "row" };
  const _hoisted_21$1 = { class: "wrapper" };
  const _hoisted_22$1 = { class: "border" };
  const _hoisted_23$1 = { class: "row" };
  const _hoisted_24$1 = { class: "wrapper" };
  const _hoisted_25$1 = { class: "row" };
  const _hoisted_26$1 = { class: "wrapper" };
  const _hoisted_27$1 = { key: 1 };
  const _hoisted_28$1 = { class: "row border" };
  const _hoisted_29$1 = { class: "wrapper" };
  const _hoisted_30$1 = { class: "row border" };
  const _hoisted_31$1 = { class: "wrapper" };
  const _hoisted_32$1 = { class: "row border" };
  const _hoisted_33$1 = { class: "wrapper" };
  const _hoisted_34$1 = { class: "border" };
  const _hoisted_35 = { class: "row" };
  const _hoisted_36 = { class: "wrapper" };
  const _hoisted_37 = { class: "row border" };
  const _hoisted_38 = { class: "wrapper" };
  const _hoisted_39 = { class: "row border" };
  const _hoisted_40 = { class: "wrapper" };
  const _hoisted_41 = { class: "border" };
  const _hoisted_42 = { class: "row" };
  const _hoisted_43 = { class: "wrapper" };
  const _hoisted_44 = { class: "row border" };
  const _hoisted_45 = { class: "wrapper" };
  const _hoisted_46 = { class: "row border" };
  const _hoisted_47 = { class: "item-title" };
  const _hoisted_48 = { class: "wrapper" };
  const _hoisted_49 = { class: "row border" };
  const _hoisted_50 = { class: "item-title" };
  const _hoisted_51 = { class: "wrapper" };
  const _hoisted_52 = { key: 2 };
  const _hoisted_53 = { class: "border" };
  const _hoisted_54 = { class: "row" };
  const _hoisted_55 = {
    style: { display: "inline-flex", overflow: "hidden", position: "relative" },
  };
  const _hoisted_56 = {
    key: 0,
    style: { display: "inline", "margin-left": "10px", "font-size": "18px" },
  };
  const _hoisted_57 = {
    key: 1,
    style: { display: "inline", "margin-left": "10px" },
  };
  const _hoisted_58 = { class: "row" };
  const _hoisted_59 = { class: "wrapper" };
  const _hoisted_60 = { class: "row border" };
  const _hoisted_61 = { class: "wrapper" };
  const _hoisted_62 = { class: "row" };
  const _hoisted_63 = { class: "wrapper" };
  const _hoisted_64 = { class: "row border" };
  const _hoisted_65 = { class: "wrapper" };
  const _hoisted_66 = { class: "border" };
  const _hoisted_67 = { class: "row" };
  const _hoisted_68 = { class: "wrapper" };
  const _hoisted_69 = { class: "row border" };
  const _hoisted_70 = { class: "wrapper" };
  const _hoisted_71 = { class: "row" };
  const _hoisted_72 = { class: "wrapper" };
  const _hoisted_73 = {
    key: 0,
    class: "sub-content",
  };
  const _hoisted_74 = { class: "row" };
  const _hoisted_75 = { class: "wrapper" };
  const _hoisted_76 = ["value"];
  const _hoisted_77 = { class: "row" };
  const _hoisted_78 = { class: "wrapper" };
  const _hoisted_79 = { class: "desc" };
  const _hoisted_80 = ["value"];
  const _hoisted_81 = { key: 3 };
  const _hoisted_82 = { class: "project-desc" };
  const _hoisted_90 = { class: "tips2" };
  const _hoisted_91 = { key: 4 };
  const _hoisted_92 = { class: "row" };
  const _hoisted_93 = { class: "wrapper" };
  const _hoisted_94 = { class: "border" };
  const _hoisted_95 = { class: "row" };
  const _hoisted_96 = { class: "wrapper" };
  function _sfc_render$8(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_Icon = vue.resolveComponent("Icon");
    const _component_BaseSwitch = vue.resolveComponent("BaseSwitch");
    const _component_BaseSelect = vue.resolveComponent("BaseSelect");
    const _component_BaseButton = vue.resolveComponent("BaseButton");
    const _component_NoticeModal = vue.resolveComponent("NoticeModal");
    return (
      vue.openBlock(),
      vue.createBlock(vue.Transition, null, {
        default: vue.withCtx(() => [
          $props.show
            ? (vue.openBlock(),
              vue.createElementBlock("div", _hoisted_1$f, [
                vue.createElementVNode("div", {
                  class: "mask",
                  onClick:
                    _cache[0] ||
                    (_cache[0] = (...args) =>
                      $options.close && $options.close(...args)),
                }),
                vue.createElementVNode("div", _hoisted_2$c, [
                  vue.createElementVNode("div", _hoisted_3$9, [
                    _cache[38] ||
                      (_cache[38] = vue.createElementVNode(
                        "div",
                        { class: "title" },
                        " 脚本设置 ",
                        -1,
                      )),
                    vue.createVNode(
                      _component_Icon,
                      {
                        icon: "ic:round-close",
                        onClick: $options.close,
                      },
                      null,
                      8,
                      ["onClick"],
                    ),
                  ]),
                  $options.isNew
                    ? (vue.openBlock(),
                      vue.createElementBlock("div", _hoisted_4$8, [
                        vue.createElementVNode(
                          "a",
                          {
                            onClick:
                              _cache[1] ||
                              (_cache[1] = (...args) =>
                                $options.goPost && $options.goPost(...args)),
                          },
                          "New：手机App现已发布，支持楼中楼！PC脚本新增历史最热数据、imgur换源功能！点击查看详细介绍",
                        ),
                        _cache[39] ||
                          (_cache[39] = vue.createElementVNode(
                            "div",
                            { class: "new" },
                            null,
                            -1,
                          )),
                      ]))
                    : vue.createCommentVNode("", true),
                  vue.createElementVNode("div", _hoisted_5$7, [
                    vue.createElementVNode("div", _hoisted_6$7, [
                      vue.createElementVNode("div", _hoisted_7$7, [
                        vue.createElementVNode(
                          "div",
                          {
                            class: vue.normalizeClass([
                              "tab",
                              $data.tabIndex === 0 && "active",
                            ]),
                            onClick:
                              _cache[2] ||
                              (_cache[2] = ($event) => ($data.tabIndex = 0)),
                          },
                          [
                            vue.createVNode(_component_Icon, {
                              icon: "weui:setting-outlined",
                            }),
                            _cache[40] ||
                              (_cache[40] = vue.createElementVNode(
                                "span",
                                null,
                                "列表",
                                -1,
                              )),
                          ],
                          2,
                        ),
                        vue.createElementVNode(
                          "div",
                          {
                            class: vue.normalizeClass([
                              "tab",
                              $data.tabIndex === 1 && "active",
                            ]),
                            onClick:
                              _cache[3] ||
                              (_cache[3] = ($event) => ($data.tabIndex = 1)),
                          },
                          [
                            vue.createVNode(_component_Icon, {
                              icon: "stash:article-alt-light",
                            }),
                            _cache[41] ||
                              (_cache[41] = vue.createElementVNode(
                                "span",
                                null,
                                "主题",
                                -1,
                              )),
                          ],
                          2,
                        ),
                        vue.createElementVNode(
                          "div",
                          {
                            class: vue.normalizeClass([
                              "tab",
                              $data.tabIndex === 2 && "active",
                            ]),
                            onClick:
                              _cache[4] ||
                              (_cache[4] = ($event) => ($data.tabIndex = 2)),
                          },
                          [
                            vue.createVNode(_component_Icon, {
                              icon: "fluent:more-circle-20-regular",
                            }),
                            _cache[42] ||
                              (_cache[42] = vue.createElementVNode(
                                "span",
                                null,
                                "其他",
                                -1,
                              )),
                          ],
                          2,
                        ),
                        vue.createElementVNode(
                          "div",
                          {
                            class: vue.normalizeClass([
                              "tab",
                              $data.tabIndex === 3 && "active",
                            ]),
                            onClick:
                              _cache[5] ||
                              (_cache[5] = ($event) => ($data.tabIndex = 3)),
                          },
                          [
                            vue.createVNode(_component_Icon, {
                              icon: "ix:about",
                            }),
                            _cache[43] ||
                              (_cache[43] = vue.createElementVNode(
                                "span",
                                null,
                                "关于",
                                -1,
                              )),
                          ],
                          2,
                        ),
                        vue.createElementVNode(
                          "div",
                          {
                            class: vue.normalizeClass([
                              "tab",
                              $data.tabIndex === 4 && "active",
                            ]),
                            onClick:
                              _cache[6] ||
                              (_cache[6] = ($event) => ($data.tabIndex = 4)),
                          },
                          [
                            vue.createVNode(_component_Icon, {
                              icon: "ix:about",
                            }),
                            _cache[44] ||
                              (_cache[44] = vue.createElementVNode(
                                "span",
                                null,
                                "插件",
                                -1,
                              )),
                          ],
                          2,
                        ),
                      ]),
                      vue.createElementVNode("div", _hoisted_8$7, [
                        _cache[45] ||
                          (_cache[45] = vue.createElementVNode(
                            "div",
                            { class: "tip" },
                            " 如果可以的话欢迎点个star支持一下，感谢原作者 ",
                            -1,
                          )),
                        vue.createElementVNode("div", _hoisted_9$7, [
                          vue.createElementVNode(
                            "a",
                            {
                              href: $options.DefaultVal.git || undefined,
                              target: "_blank",
                            },
                            [
                              vue.createVNode(_component_Icon, {
                                icon: "mdi:github",
                              }),
                            ],
                            8,
                            _hoisted_10$7,
                          ),
                          vue.createElementVNode(
                            "a",
                            {
                              href: $options.DefaultVal.homeUrl || undefined,
                              target: "_blank",
                            },
                            [
                              vue.createVNode(_component_Icon, {
                                icon: "iconamoon:home-light",
                              }),
                            ],
                            8,
                            _hoisted_11$6,
                          ),
                        ]),
                      ]),
                    ]),
                    vue.createElementVNode("div", _hoisted_12$5, [
                      vue.createElementVNode("div", _hoisted_13$5, [
                        $data.tabIndex === 0
                          ? (vue.openBlock(),
                            vue.createElementBlock("div", _hoisted_14$4, [
                              vue.createElementVNode("div", _hoisted_15$3, [
                                vue.createElementVNode("div", _hoisted_16$3, [
                                  _cache[46] ||
                                    (_cache[46] = vue.createElementVNode(
                                      "label",
                                      { class: "item-title" },
                                      "列表展示方式",
                                      -1,
                                    )),
                                  vue.createElementVNode("div", _hoisted_17$2, [
                                    vue.createElementVNode(
                                      "div",
                                      _hoisted_18$2,
                                      [
                                        vue.createElementVNode(
                                          "div",
                                          {
                                            class: vue.normalizeClass([
                                              "radio",
                                              $data.config.viewType === "simple"
                                                ? "active"
                                                : "",
                                            ]),
                                            onClick:
                                              _cache[7] ||
                                              (_cache[7] = ($event) =>
                                                ($data.config.viewType =
                                                  "simple")),
                                          },
                                          "简洁 ",
                                          2,
                                        ),
                                        vue.createElementVNode(
                                          "div",
                                          {
                                            class: vue.normalizeClass([
                                              "radio",
                                              $data.config.viewType === "table"
                                                ? "active"
                                                : "",
                                            ]),
                                            onClick:
                                              _cache[8] ||
                                              (_cache[8] = ($event) =>
                                                ($data.config.viewType =
                                                  "table")),
                                          },
                                          "表格 ",
                                          2,
                                        ),
                                        vue.createElementVNode(
                                          "div",
                                          {
                                            class: vue.normalizeClass([
                                              "radio",
                                              $data.config.viewType === "card"
                                                ? "active"
                                                : "",
                                            ]),
                                            onClick:
                                              _cache[9] ||
                                              (_cache[9] = ($event) =>
                                                ($data.showNotice = true)),
                                          },
                                          "卡片 ",
                                          2,
                                        ),
                                      ],
                                    ),
                                  ]),
                                ]),
                                _cache[47] ||
                                  (_cache[47] = vue.createElementVNode(
                                    "div",
                                    { class: "desc danger" },
                                    " 提示：此项需要刷新页面才能生效 ",
                                    -1,
                                  )),
                              ]),
                              vue.createElementVNode("div", _hoisted_19$2, [
                                vue.createElementVNode("div", _hoisted_20$2, [
                                  _cache[48] ||
                                    (_cache[48] = vue.createElementVNode(
                                      "label",
                                      { class: "item-title" },
                                      "主题弹框显示",
                                      -1,
                                    )),
                                  vue.createElementVNode("div", _hoisted_21$1, [
                                    vue.createVNode(
                                      _component_BaseSwitch,
                                      {
                                        modelValue:
                                          $data.config.clickPostItemOpenDetail,
                                        "onUpdate:modelValue":
                                          _cache[10] ||
                                          (_cache[10] = ($event) =>
                                            ($data.config.clickPostItemOpenDetail =
                                              $event)),
                                      },
                                      null,
                                      8,
                                      ["modelValue"],
                                    ),
                                  ]),
                                ]),
                                _cache[49] ||
                                  (_cache[49] = vue.createElementVNode(
                                    "div",
                                    { class: "desc" },
                                    [
                                      vue.createTextVNode(
                                        " 开启此选项后，主题会",
                                      ),
                                      vue.createElementVNode(
                                        "span",
                                        { class: "danger" },
                                        "始终",
                                      ),
                                      vue.createTextVNode(
                                        "以弹框的方式显示。优先级大于“新标签页打开链接” ",
                                      ),
                                    ],
                                    -1,
                                  )),
                              ]),
                              vue.createElementVNode("div", _hoisted_22$1, [
                                vue.createElementVNode("div", _hoisted_23$1, [
                                  vue.createElementVNode(
                                    "label",
                                    { class: "item-title" },
                                    "外链新标签页打开",
                                  ),
                                  vue.createElementVNode("div", _hoisted_24$1, [
                                    vue.createVNode(
                                      _component_BaseSwitch,
                                      {
                                        modelValue: $data.config.openExternalLinkInNewTab,
                                        "onUpdate:modelValue": ($event) =>
                                          ($data.config.openExternalLinkInNewTab = $event),
                                      },
                                      null,
                                      8,
                                      ["modelValue"],
                                    ),
                                  ]),
                                ]),
                                vue.createElementVNode(
                                  "div",
                                  { class: "desc" },
                                  " 网页上的外部链接（非本站与镜像站）默认在新标签页中打开 ",
                                ),
                              ]),
                              vue.createElementVNode("div", _hoisted_22$1, [
                                vue.createElementVNode("div", _hoisted_23$1, [
                                  _cache[50] ||
                                    (_cache[50] = vue.createElementVNode(
                                      "label",
                                      { class: "item-title" },
                                      "新标签页打开链接",
                                      -1,
                                    )),
                                  vue.createElementVNode("div", _hoisted_24$1, [
                                    vue.createVNode(
                                      _component_BaseSwitch,
                                      {
                                        modelValue: $data.config.newTabOpen,
                                        "onUpdate:modelValue":
                                          _cache[11] ||
                                          (_cache[11] = ($event) =>
                                            ($data.config.newTabOpen = $event)),
                                      },
                                      null,
                                      8,
                                      ["modelValue"],
                                    ),
                                  ]),
                                ]),
                                _cache[51] ||
                                  (_cache[51] = vue.createElementVNode(
                                    "div",
                                    { class: "desc" },
                                    " 网页上所有链接通过新标签页打开 ",
                                    -1,
                                  )),
                              ]),
                              vue.createElementVNode("div", _hoisted_25$1, [
                                _cache[52] ||
                                  (_cache[52] = vue.createElementVNode(
                                    "label",
                                    { class: "item-title" },
                                    "打开新标签页时立即切换过去",
                                    -1,
                                  )),
                                vue.createElementVNode("div", _hoisted_26$1, [
                                  vue.createVNode(
                                    _component_BaseSwitch,
                                    {
                                      modelValue: $data.config.newTabOpenActive,
                                      "onUpdate:modelValue":
                                        _cache[12] ||
                                        (_cache[12] = ($event) =>
                                          ($data.config.newTabOpenActive =
                                            $event)),
                                    },
                                    null,
                                    8,
                                    ["modelValue"],
                                  ),
                                ]),
                              ]),
                            ]))
                          : vue.createCommentVNode("", true),
                        $data.tabIndex === 1
                          ? (vue.openBlock(),
                            vue.createElementBlock("div", _hoisted_27$1, [
                              vue.createElementVNode("div", _hoisted_28$1, [
                                _cache[53] ||
                                  (_cache[53] = vue.createElementVNode(
                                    "label",
                                    { class: "item-title" },
                                    "回复类型",
                                    -1,
                                  )),
                                vue.createElementVNode("div", _hoisted_29$1, [
                                  vue.createVNode(
                                    _component_BaseSelect,
                                    {
                                      "display-type":
                                        $data.config.commentDisplayType,
                                      "onUpdate:displayType":
                                        _cache[13] ||
                                        (_cache[13] = ($event) =>
                                          ($data.config.commentDisplayType =
                                            $event)),
                                    },
                                    null,
                                    8,
                                    ["display-type"],
                                  ),
                                ]),
                              ]),
                              vue.createElementVNode("div", _hoisted_30$1, [
                                _cache[54] ||
                                  (_cache[54] = vue.createElementVNode(
                                    "label",
                                    { class: "item-title" },
                                    "详情页中显示“回复类型”",
                                    -1,
                                  )),
                                vue.createElementVNode("div", _hoisted_31$1, [
                                  vue.createVNode(
                                    _component_BaseSwitch,
                                    {
                                      modelValue: $data.config.showToolbar,
                                      "onUpdate:modelValue":
                                        _cache[14] ||
                                        (_cache[14] = ($event) =>
                                          ($data.config.showToolbar = $event)),
                                    },
                                    null,
                                    8,
                                    ["modelValue"],
                                  ),
                                ]),
                              ]),
                              vue.createElementVNode("div", _hoisted_32$1, [
                                _cache[55] ||
                                  (_cache[55] = vue.createElementVNode(
                                    "label",
                                    { class: "item-title" },
                                    "替换Imgur源",
                                    -1,
                                  )),
                                vue.createElementVNode("div", _hoisted_33$1, [
                                  vue.createVNode(
                                    _component_BaseSwitch,
                                    {
                                      modelValue: $data.config.replaceImgur,
                                      "onUpdate:modelValue":
                                        _cache[15] ||
                                        (_cache[15] = ($event) =>
                                          ($data.config.replaceImgur = $event)),
                                    },
                                    null,
                                    8,
                                    ["modelValue"],
                                  ),
                                ]),
                              ]),
                              vue.createElementVNode("div", _hoisted_34$1, [
                                vue.createElementVNode("div", _hoisted_35, [
                                  _cache[56] ||
                                    (_cache[56] = vue.createElementVNode(
                                      "label",
                                      { class: "item-title" },
                                      "单独打开主题时默认显示楼中楼",
                                      -1,
                                    )),
                                  vue.createElementVNode("div", _hoisted_36, [
                                    vue.createVNode(
                                      _component_BaseSwitch,
                                      {
                                        modelValue: $data.config.autoOpenDetail,
                                        "onUpdate:modelValue":
                                          _cache[16] ||
                                          (_cache[16] = ($event) =>
                                            ($data.config.autoOpenDetail =
                                              $event)),
                                      },
                                      null,
                                      8,
                                      ["modelValue"],
                                    ),
                                  ]),
                                ]),
                                _cache[57] ||
                                  (_cache[57] = vue.createElementVNode(
                                    "div",
                                    { class: "desc" },
                                    " 单独打开这种地址 https://v2ex.com/t/xxxx 时，是否默认显示楼中楼 ",
                                    -1,
                                  )),
                              ]),
                              vue.createElementVNode("div", _hoisted_37, [
                                _cache[58] ||
                                  (_cache[58] = vue.createElementVNode(
                                    "label",
                                    { class: "item-title" },
                                    "点击左右两侧透明处关闭主题详情弹框",
                                    -1,
                                  )),
                                vue.createElementVNode("div", _hoisted_38, [
                                  vue.createVNode(
                                    _component_BaseSwitch,
                                    {
                                      modelValue:
                                        $data.config.closePostDetailBySpace,
                                      "onUpdate:modelValue":
                                        _cache[17] ||
                                        (_cache[17] = ($event) =>
                                          ($data.config.closePostDetailBySpace =
                                            $event)),
                                    },
                                    null,
                                    8,
                                    ["modelValue"],
                                  ),
                                ]),
                              ]),
                              vue.createElementVNode("div", _hoisted_39, [
                                _cache[59] ||
                                  (_cache[59] = vue.createElementVNode(
                                    "label",
                                    { class: "item-title" },
                                    "正文超长自动折叠",
                                    -1,
                                  )),
                                vue.createElementVNode("div", _hoisted_40, [
                                  vue.createVNode(
                                    _component_BaseSwitch,
                                    {
                                      modelValue:
                                        $data.config.contentAutoCollapse,
                                      "onUpdate:modelValue":
                                        _cache[18] ||
                                        (_cache[18] = ($event) =>
                                          ($data.config.contentAutoCollapse =
                                            $event)),
                                    },
                                    null,
                                    8,
                                    ["modelValue"],
                                  ),
                                ]),
                              ]),
                              vue.createElementVNode(
                                "div",
                                { class: "row border" },
                                [
                                  vue.createElementVNode(
                                    "label",
                                    { class: "item-title" },
                                    "长内容折叠阈值（px）",
                                    -1,
                                  ),
                                  vue.createElementVNode(
                                    "div",
                                    { class: "wrapper" },
                                    [
                                      vue.withDirectives(
                                        vue.createElementVNode(
                                          "input",
                                          {
                                            type: "number",
                                            min: "200",
                                            max: "5000",
                                            step: "100",
                                            "onUpdate:modelValue": ($event) =>
                                              ($data.config.collapseHeight =
                                                $event),
                                          },
                                          null,
                                          512,
                                        ),
                                        [
                                          [
                                            vue.vModelText,
                                            $data.config.collapseHeight,
                                          ],
                                        ],
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              vue.createElementVNode("div", _hoisted_41, [
                                vue.createElementVNode("div", _hoisted_42, [
                                  _cache[60] ||
                                    (_cache[60] = vue.createElementVNode(
                                      "label",
                                      { class: "item-title" },
                                      "主题宽度",
                                      -1,
                                    )),
                                  vue.createElementVNode("div", _hoisted_43, [
                                    vue.withDirectives(
                                      vue.createElementVNode(
                                        "input",
                                        {
                                          type: "text",
                                          "onUpdate:modelValue":
                                            _cache[19] ||
                                            (_cache[19] = ($event) =>
                                              ($data.config.postWidth =
                                                $event)),
                                        },
                                        null,
                                        512,
                                      ),
                                      [
                                        [
                                          vue.vModelText,
                                          $data.config.postWidth,
                                        ],
                                      ],
                                    ),
                                  ]),
                                ]),
                                _cache[61] ||
                                  (_cache[61] = vue.createElementVNode(
                                    "div",
                                    { class: "desc" },
                                    [
                                      vue.createTextVNode(
                                        " 未设定此值时，则默认宽度为77rem。接受合法的width值： ",
                                      ),
                                      vue.createElementVNode(
                                        "a",
                                        {
                                          style: {
                                            color: "#40a9ff",
                                            "text-decoration": "underline",
                                          },
                                          href: "https://vue3js.cn/interview/css/em_px_rem_vh_vw.html#%E4%BA%8C%E3%80%81%E5%8D%95%E4%BD%8D",
                                          target: "_blank",
                                        },
                                        "rem、px、vw、vh(点此查看)",
                                      ),
                                      vue.createTextVNode(
                                        "。 vw代表屏幕百分比，如想要屏幕的66%，请填写66vw ",
                                      ),
                                    ],
                                    -1,
                                  )),
                                _cache[62] ||
                                  (_cache[62] = vue.createElementVNode(
                                    "div",
                                    { class: "desc" },
                                    " 提示：此项设置以后，单独打开详情页时会出现主题突然变宽（窄）的问题，暂时无解 ",
                                    -1,
                                  )),
                                _cache[63] ||
                                  (_cache[63] = vue.createElementVNode(
                                    "div",
                                    { class: "desc danger" },
                                    " 提示：此项需要刷新页面才能生效 ",
                                    -1,
                                  )),
                              ]),
                              _cache[65] ||
                                (_cache[65] = vue.createElementVNode(
                                  "div",
                                  { class: "row" },
                                  [
                                    vue.createElementVNode(
                                      "label",
                                      { class: "main-title" },
                                      "高赞回复",
                                    ),
                                  ],
                                  -1,
                                )),
                              vue.createElementVNode("div", _hoisted_44, [
                                _cache[64] ||
                                  (_cache[64] = vue.createElementVNode(
                                    "label",
                                    { class: "item-title" },
                                    "显示高赞回复",
                                    -1,
                                  )),
                                vue.createElementVNode("div", _hoisted_45, [
                                  vue.createVNode(
                                    _component_BaseSwitch,
                                    {
                                      modelValue: $data.config.showTopReply,
                                      "onUpdate:modelValue":
                                        _cache[20] ||
                                        (_cache[20] = ($event) =>
                                          ($data.config.showTopReply = $event)),
                                    },
                                    null,
                                    8,
                                    ["modelValue"],
                                  ),
                                ]),
                              ]),
                              vue.createElementVNode("div", _hoisted_46, [
                                vue.createElementVNode(
                                  "label",
                                  _hoisted_47,
                                  "最多显示" +
                                    vue.toDisplayString(
                                      $data.config.topReplyCount,
                                    ) +
                                    "个高赞回复",
                                  1,
                                ),
                                vue.createElementVNode("div", _hoisted_48, [
                                  vue.withDirectives(
                                    vue.createElementVNode(
                                      "input",
                                      {
                                        type: "number",
                                        min: "1",
                                        "onUpdate:modelValue":
                                          _cache[21] ||
                                          (_cache[21] = ($event) =>
                                            ($data.config.topReplyCount =
                                              $event)),
                                      },
                                      null,
                                      512,
                                    ),
                                    [
                                      [
                                        vue.vModelText,
                                        $data.config.topReplyCount,
                                      ],
                                    ],
                                  ),
                                ]),
                              ]),
                              vue.createElementVNode("div", _hoisted_49, [
                                vue.createElementVNode(
                                  "label",
                                  _hoisted_50,
                                  "最少需要" +
                                    vue.toDisplayString(
                                      $data.config.topReplyLoveMinCount,
                                    ) +
                                    "个赞才能被判定为高赞",
                                  1,
                                ),
                                vue.createElementVNode("div", _hoisted_51, [
                                  vue.withDirectives(
                                    vue.createElementVNode(
                                      "input",
                                      {
                                        type: "number",
                                        min: "1",
                                        "onUpdate:modelValue":
                                          _cache[22] ||
                                          (_cache[22] = ($event) =>
                                            ($data.config.topReplyLoveMinCount =
                                              $event)),
                                      },
                                      null,
                                      512,
                                    ),
                                    [
                                      [
                                        vue.vModelText,
                                        $data.config.topReplyLoveMinCount,
                                      ],
                                    ],
                                  ),
                                ]),
                              ]),
                              vue.createElementVNode(
                                "div",
                                { class: "row border" },
                                [
                                  vue.createElementVNode(
                                    "label",
                                    { class: "item-title" },
                                    "高赞统计最多抓取页数",
                                    -1,
                                  ),
                                  vue.createElementVNode(
                                    "div",
                                    { class: "wrapper" },
                                    [
                                      vue.withDirectives(
                                        vue.createElementVNode(
                                          "input",
                                          {
                                            type: "number",
                                            min: "1",
                                            max: "100",
                                            "onUpdate:modelValue": ($event) =>
                                              ($data.config.topReplyMaxPages =
                                                $event),
                                          },
                                          null,
                                          512,
                                        ),
                                        [
                                          [
                                            vue.vModelText,
                                            $data.config.topReplyMaxPages,
                                          ],
                                        ],
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ]))
                          : vue.createCommentVNode("", true),
                        $data.tabIndex === 2
                          ? (vue.openBlock(),
                            vue.createElementBlock("div", _hoisted_52, [
                              _cache[84] ||
                                (_cache[84] = vue.createElementVNode(
                                  "div",
                                  { class: "row" },
                                  [
                                    vue.createElementVNode(
                                      "label",
                                      { class: "main-title" },
                                      "收藏列表",
                                    ),
                                  ],
                                  -1,
                                )),
                              vue.createElementVNode("div", _hoisted_53, [
                                vue.createElementVNode("div", _hoisted_54, [
                                  vue.createElementVNode("div", null, [
                                    vue.createVNode(
                                      _component_BaseButton,
                                      {
                                        onClick: $options.exportCollectList,
                                        loading: $data.exportLoading,
                                      },
                                      {
                                        default: vue.withCtx(() => [
                                          ...(_cache[66] ||
                                            (_cache[66] = [
                                              vue.createTextVNode("导出", -1),
                                            ])),
                                        ]),
                                        _: 1,
                                      },
                                      8,
                                      ["onClick", "loading"],
                                    ),
                                    _cache[68] ||
                                      (_cache[68] = vue.createElementVNode(
                                        "span",
                                        null,
                                        "   ",
                                        -1,
                                      )),
                                    vue.createElementVNode("div", _hoisted_55, [
                                      vue.createVNode(
                                        _component_BaseButton,
                                        { loading: $data.importLoading },
                                        {
                                          default: vue.withCtx(() => [
                                            ...(_cache[67] ||
                                              (_cache[67] = [
                                                vue.createTextVNode(
                                                  "导入，并收藏",
                                                  -1,
                                                ),
                                              ])),
                                          ]),
                                          _: 1,
                                        },
                                        8,
                                        ["loading"],
                                      ),
                                      $data.showInput
                                        ? (vue.openBlock(),
                                          vue.createElementBlock(
                                            "input",
                                            {
                                              key: 0,
                                              type: "file",
                                              style: {
                                                position: "absolute",
                                                width: "100%",
                                                height: "100px",
                                                opacity: "0",
                                              },
                                              onChange:
                                                _cache[23] ||
                                                (_cache[23] = (...args) =>
                                                  $options.importCollectList &&
                                                  $options.importCollectList(
                                                    ...args,
                                                  )),
                                            },
                                            null,
                                            32,
                                          ))
                                        : vue.createCommentVNode("", true),
                                    ]),
                                    $data.importLoading
                                      ? (vue.openBlock(),
                                        vue.createElementBlock(
                                          "div",
                                          _hoisted_56,
                                          " 导入中：" +
                                            vue.toDisplayString($data.index) +
                                            "/" +
                                            vue.toDisplayString($data.total) +
                                            " ，大约需要" +
                                            vue.toDisplayString($data.endTime) +
                                            "分钟，导入完成前请勿关闭和刷新本页面 ",
                                          1,
                                        ))
                                      : vue.createCommentVNode("", true),
                                    $data.importOk
                                      ? (vue.openBlock(),
                                        vue.createElementBlock(
                                          "div",
                                          _hoisted_57,
                                          " 导入完成 ",
                                        ))
                                      : vue.createCommentVNode("", true),
                                  ]),
                                ]),
                                _cache[69] ||
                                  (_cache[69] = vue.createElementVNode(
                                    "div",
                                    { class: "desc" },
                                    " 默认导出为 json 文件，如需其他格式，请使用 ChatGpt/Deepseek 转换 ",
                                    -1,
                                  )),
                              ]),
                              vue.createElementVNode("div", _hoisted_58, [
                                _cache[70] ||
                                  (_cache[70] = vue.createElementVNode(
                                    "label",
                                    { class: "item-title" },
                                    "收藏时提醒添加到书签",
                                    -1,
                                  )),
                                vue.createElementVNode("div", _hoisted_59, [
                                  vue.createVNode(
                                    _component_BaseSwitch,
                                    {
                                      modelValue:
                                        $data.config.collectBrowserNotice,
                                      "onUpdate:modelValue":
                                        _cache[24] ||
                                        (_cache[24] = ($event) =>
                                          ($data.config.collectBrowserNotice =
                                            $event)),
                                    },
                                    null,
                                    8,
                                    ["modelValue"],
                                  ),
                                ]),
                              ]),
                              _cache[85] ||
                                (_cache[85] = vue.createElementVNode(
                                  "div",
                                  { class: "desc" },
                                  " 解释：V站帐号一旦被封禁，则无法登录，无法查看账号收藏了 ",
                                  -1,
                                )),
                              _cache[86] ||
                                (_cache[86] = vue.createElementVNode(
                                  "div",
                                  { class: "row border" },
                                  [
                                    vue.createElementVNode(
                                      "label",
                                      { class: "main-title" },
                                      "其他",
                                    ),
                                  ],
                                  -1,
                                )),
                              vue.createElementVNode("div", _hoisted_60, [
                                _cache[71] ||
                                  (_cache[71] = vue.createElementVNode(
                                    "label",
                                    { class: "item-title" },
                                    "用户打标签（登录后同步到记事本，未登录时保存在本机）：",
                                    -1,
                                  )),
                                vue.createElementVNode("div", _hoisted_61, [
                                  vue.createVNode(
                                    _component_BaseSwitch,
                                    {
                                      modelValue: $data.config.openTag,
                                      "onUpdate:modelValue":
                                        _cache[25] ||
                                        (_cache[25] = ($event) =>
                                          ($data.config.openTag = $event)),
                                    },
                                    null,
                                    8,
                                    ["modelValue"],
                                  ),
                                ]),
                              ]),
                              vue.createElementVNode("div", _hoisted_62, [
                                _cache[72] ||
                                  (_cache[72] = vue.createElementVNode(
                                    "label",
                                    { class: "item-title" },
                                    "划词显示Base64解码框",
                                    -1,
                                  )),
                                vue.createElementVNode("div", _hoisted_63, [
                                  vue.createVNode(
                                    _component_BaseSwitch,
                                    {
                                      modelValue: $data.config.base64,
                                      "onUpdate:modelValue":
                                        _cache[26] ||
                                        (_cache[26] = ($event) =>
                                          ($data.config.base64 = $event)),
                                    },
                                    null,
                                    8,
                                    ["modelValue"],
                                  ),
                                ]),
                              ]),
                              vue.createElementVNode("div", _hoisted_64, [
                                _cache[73] ||
                                  (_cache[73] = vue.createElementVNode(
                                    "label",
                                    { class: "item-title" },
                                    "自动签到",
                                    -1,
                                  )),
                                vue.createElementVNode("div", _hoisted_65, [
                                  vue.createVNode(
                                    _component_BaseSwitch,
                                    {
                                      modelValue: $data.config.autoSignin,
                                      "onUpdate:modelValue":
                                        _cache[27] ||
                                        (_cache[27] = ($event) =>
                                          ($data.config.autoSignin = $event)),
                                    },
                                    null,
                                    8,
                                    ["modelValue"],
                                  ),
                                ]),
                              ]),
                              vue.createElementVNode("div", _hoisted_66, [
                                vue.createElementVNode("div", _hoisted_67, [
                                  _cache[74] ||
                                    (_cache[74] = vue.createElementVNode(
                                      "label",
                                      { class: "item-title" },
                                      "自定义背景",
                                      -1,
                                    )),
                                  vue.createElementVNode("div", _hoisted_68, [
                                    vue.withDirectives(
                                      vue.createElementVNode(
                                        "input",
                                        {
                                          type: "text",
                                          "onUpdate:modelValue":
                                            _cache[28] ||
                                            (_cache[28] = ($event) =>
                                              ($data.config.customBgColor =
                                                $event)),
                                        },
                                        null,
                                        512,
                                      ),
                                      [
                                        [
                                          vue.vModelText,
                                          $data.config.customBgColor,
                                        ],
                                      ],
                                    ),
                                  ]),
                                ]),
                                _cache[75] ||
                                  (_cache[75] = vue.createElementVNode(
                                    "div",
                                    { class: "desc" },
                                    [
                                      vue.createTextVNode(
                                        " 未设定此值时，则脚本就什么都不做，V站大部分页面背景颜色默认为 #e2e2e2，少部分页面有特定背景。接受一个合法的css color值：例如",
                                      ),
                                      vue.createElementVNode(
                                        "a",
                                        {
                                          href: "https://developer.mozilla.org/zh-CN/docs/Web/CSS/color_value",
                                          target: "_blank",
                                        },
                                        "red、#ffffff、rgb(222,222,22)(点此查看)",
                                      ),
                                      vue.createTextVNode("等等。 "),
                                    ],
                                    -1,
                                  )),
                                _cache[76] ||
                                  (_cache[76] = vue.createElementVNode(
                                    "div",
                                    { class: "desc danger" },
                                    " 提示：此项需要刷新页面才能生效 ",
                                    -1,
                                  )),
                              ]),
                              _cache[87] ||
                                (_cache[87] = vue.createElementVNode(
                                  "div",
                                  { class: "row" },
                                  [
                                    vue.createElementVNode(
                                      "label",
                                      { class: "main-title" },
                                      "消息通知",
                                    ),
                                  ],
                                  -1,
                                )),
                              vue.createElementVNode("div", _hoisted_69, [
                                _cache[77] ||
                                  (_cache[77] = vue.createElementVNode(
                                    "label",
                                    { class: "item-title" },
                                    "接管未读提醒页面",
                                    -1,
                                  )),
                                vue.createElementVNode("div", _hoisted_70, [
                                  vue.createVNode(
                                    _component_BaseSwitch,
                                    {
                                      modelValue:
                                        $data.config.notice.takeOverNoticePage,
                                      "onUpdate:modelValue":
                                        _cache[29] ||
                                        (_cache[29] = ($event) =>
                                          ($data.config.notice.takeOverNoticePage =
                                            $event)),
                                    },
                                    null,
                                    8,
                                    ["modelValue"],
                                  ),
                                ]),
                              ]),
                              vue.createElementVNode("div", _hoisted_71, [
                                _cache[78] ||
                                  (_cache[78] = vue.createElementVNode(
                                    "label",
                                    { class: "item-title" },
                                    "定时查询未读提醒",
                                    -1,
                                  )),
                                vue.createElementVNode("div", _hoisted_72, [
                                  vue.createVNode(
                                    _component_BaseSwitch,
                                    {
                                      modelValue:
                                        $data.config.notice.loopCheckNotice,
                                      "onUpdate:modelValue":
                                        _cache[30] ||
                                        (_cache[30] = ($event) =>
                                          ($data.config.notice.loopCheckNotice =
                                            $event)),
                                    },
                                    null,
                                    8,
                                    ["modelValue"],
                                  ),
                                ]),
                              ]),
                              _cache[88] ||
                                (_cache[88] = vue.createElementVNode(
                                  "div",
                                  { class: "desc" },
                                  " 开启此功能会带来以下影响： 1、你的IP可能会被封禁 2、消耗更多流量，给服务器带来更大的负担 3、你的V站浏览进度条会变快 ",
                                  -1,
                                )),
                              $data.config.notice.loopCheckNotice
                                ? (vue.openBlock(),
                                  vue.createElementBlock("div", _hoisted_73, [
                                    vue.createElementVNode("div", _hoisted_74, [
                                      _cache[80] ||
                                        (_cache[80] = vue.createElementVNode(
                                          "label",
                                          { class: "item-title" },
                                          "查询间隔",
                                          -1,
                                        )),
                                      vue.createElementVNode(
                                        "div",
                                        _hoisted_75,
                                        [
                                          vue.createElementVNode(
                                            "input",
                                            {
                                              type: "number",
                                              value:
                                                $data.config.notice
                                                  .loopCheckNoticeInterval,
                                              onBlur:
                                                _cache[31] ||
                                                (_cache[31] = (e2) =>
                                                  ($data.config.notice.loopCheckNoticeInterval =
                                                    e2.target.value)),
                                              style: { "margin-right": "1rem" },
                                            },
                                            null,
                                            40,
                                            _hoisted_76,
                                          ),
                                          _cache[79] ||
                                            (_cache[79] = vue.createTextVNode(
                                              "分钟 ",
                                              -1,
                                            )),
                                        ],
                                      ),
                                    ]),
                                    _cache[82] ||
                                      (_cache[82] = vue.createElementVNode(
                                        "div",
                                        { class: "desc" },
                                        " 设置值太小，会导致频繁请求，你的IP可能会被封禁，建议设置为5，即每次5分钟查询一次 ",
                                        -1,
                                      )),
                                    vue.createElementVNode("div", _hoisted_77, [
                                      _cache[81] ||
                                        (_cache[81] = vue.createElementVNode(
                                          "label",
                                          { class: "item-title" },
                                          "当有新未读提醒时，网页标题闪烁",
                                          -1,
                                        )),
                                      vue.createElementVNode(
                                        "div",
                                        _hoisted_78,
                                        [
                                          vue.createVNode(
                                            _component_BaseSwitch,
                                            {
                                              modelValue:
                                                $data.config.notice
                                                  .whenNewNoticeGlimmer,
                                              "onUpdate:modelValue":
                                                _cache[32] ||
                                                (_cache[32] = ($event) =>
                                                  ($data.config.notice.whenNewNoticeGlimmer =
                                                    $event)),
                                            },
                                            null,
                                            8,
                                            ["modelValue"],
                                          ),
                                        ],
                                      ),
                                    ]),
                                    _cache[83] ||
                                      (_cache[83] = vue.createElementVNode(
                                        "div",
                                        { class: "row" },
                                        [
                                          vue.createElementVNode(
                                            "label",
                                            { class: "item-title" },
                                            "钉钉Webhook地址",
                                          ),
                                        ],
                                        -1,
                                      )),
                                    vue.createElementVNode("div", _hoisted_79, [
                                      vue.createElementVNode(
                                        "input",
                                        {
                                          type: "text",
                                          value: $data.config.notice.ddWebhook,
                                          onBlur:
                                            _cache[33] ||
                                            (_cache[33] = (e2) =>
                                              ($data.config.notice.ddWebhook =
                                                e2.target.value)),
                                          style: { width: "100%" },
                                        },
                                        null,
                                        40,
                                        _hoisted_80,
                                      ),
                                    ]),
                                  ]))
                                : vue.createCommentVNode("", true),
                              _cache[89] ||
                                (_cache[89] = vue.createElementVNode(
                                  "div",
                                  { class: "desc danger" },
                                  " 提示：此项需要刷新页面才能生效 ",
                                  -1,
                                )),
                            ]))
                          : vue.createCommentVNode("", true),
                        $data.tabIndex === 3
                          ? (vue.openBlock(),
                            vue.createElementBlock("div", _hoisted_81, [
                              _cache[97] ||
                                (_cache[97] = vue.createElementVNode(
                                  "h1",
                                  null,
                                  "V2EX Pro",
                                  -1,
                                )),
                              vue.createElementVNode("div", _hoisted_82, []),
                              vue.createElementVNode("div", _hoisted_90, [
                                vue.createVNode(_component_Icon, {
                                  icon: "icon-park-outline:tips",
                                }),
                                _cache[96] ||
                                  (_cache[96] = vue.createElementVNode(
                                    "span",
                                    null,
                                    "代码完全开源（GPL-3.0），不放心也可自行拷贝下来修改~",
                                    -1,
                                  )),
                              ]),
                            ]))
                          : vue.createCommentVNode("", true),
                        $data.tabIndex === 4
                          ? (vue.openBlock(),
                            vue.createElementBlock("div", _hoisted_91, [
                              vue.createElementVNode("div", _hoisted_92, [
                                _cache[99] ||
                                  (_cache[99] = vue.createElementVNode(
                                    "label",
                                    { class: "item-title" },
                                    "主题宽度",
                                    -1,
                                  )),
                                vue.createElementVNode("div", _hoisted_93, [
                                  vue.withDirectives(
                                    vue.createElementVNode(
                                      "input",
                                      {
                                        type: "text",
                                        "onUpdate:modelValue":
                                          _cache[34] ||
                                          (_cache[34] = ($event) =>
                                            ($data.config.postWidth = $event)),
                                      },
                                      null,
                                      512,
                                    ),
                                    [[vue.vModelText, $data.config.postWidth]],
                                  ),
                                  vue.createVNode(
                                    _component_BaseButton,
                                    {
                                      onClick: $options.exportCollectList,
                                      loading: $data.exportLoading,
                                    },
                                    {
                                      default: vue.withCtx(() => [
                                        ...(_cache[98] ||
                                          (_cache[98] = [
                                            vue.createTextVNode("导出", -1),
                                          ])),
                                      ]),
                                      _: 1,
                                    },
                                    8,
                                    ["onClick", "loading"],
                                  ),
                                ]),
                              ]),
                              vue.createElementVNode("div", _hoisted_94, [
                                vue.createElementVNode("div", _hoisted_95, [
                                  _cache[100] ||
                                    (_cache[100] = vue.createElementVNode(
                                      "label",
                                      { class: "item-title" },
                                      "v2新帖挂件",
                                      -1,
                                    )),
                                  vue.createElementVNode("div", _hoisted_96, [
                                    vue.createVNode(
                                      _component_BaseSwitch,
                                      {
                                        modelValue:
                                          $data.config.notice.loopCheckNotice,
                                        "onUpdate:modelValue":
                                          _cache[35] ||
                                          (_cache[35] = ($event) =>
                                            ($data.config.notice.loopCheckNotice =
                                              $event)),
                                      },
                                      null,
                                      8,
                                      ["modelValue"],
                                    ),
                                  ]),
                                ]),
                                _cache[101] ||
                                  (_cache[101] = vue.createElementVNode(
                                    "div",
                                    { class: "desc" },
                                    "",
                                    -1,
                                  )),
                              ]),
                            ]))
                          : vue.createCommentVNode("", true),
                      ]),
                    ]),
                  ]),
                ]),
                vue.createVNode(
                  _component_NoticeModal,
                  {
                    show: $data.showNotice,
                    "onUpdate:show":
                      _cache[36] ||
                      (_cache[36] = ($event) => ($data.showNotice = $event)),
                    onConfirm:
                      _cache[37] ||
                      (_cache[37] = ($event) =>
                        ($data.config.viewType = "card")),
                  },
                  null,
                  8,
                  ["show"],
                ),
              ]))
            : vue.createCommentVNode("", true),
        ]),
        _: 1,
      })
    );
  }
  const Setting = /* @__PURE__ */ _export_sfc(_sfc_main$f, [
    ["render", _sfc_render$8],
    ["__scopeId", "data-v-086214a4"],
  ]);
  const _sfc_main$e = {
    name: "Point",
    components: { PopConfirm, Icon },
    inject: ["post", "isLogin"],
    props: {
      item: {
        type: Object,
        default() {
          return {};
        },
      },
      apiUrl: "",
    },
    computed: {
      disabled() {
        return (
          this.item.username === window.user.username ||
          this.item.isThanked ||
          !this.isLogin
        );
      },
    },
    methods: {
      thankError() {
        if (!this.isLogin) {
          return eventBus.emit(CMD.SHOW_MSG, {
            type: "warning",
            text: "请先登录！",
          });
        }
        if (this.item.username === window.user.username) {
          return eventBus.emit(CMD.SHOW_MSG, {
            type: "warning",
            text: "不能感谢自己",
          });
        }
        if (this.item.isThanked) {
          return eventBus.emit(CMD.SHOW_MSG, {
            type: "warning",
            text: "已经感谢过了",
          });
        }
      },
      async thank() {
        this.$emit("addThank");
        let url2 = `${location.origin}/thank/${this.apiUrl}?once=${this.post.once}`;
        $.post(url2).then(
          (res) => {
            if (!res.success) {
              this.$emit("recallThank");
              eventBus.emit(CMD.SHOW_MSG, { type: "error", text: res.message });
            }
            eventBus.emit(CMD.REFRESH_ONCE, res.once);
          },
          (err) => {
            this.$emit("recallThank");
            eventBus.emit(CMD.SHOW_MSG, { type: "error", text: "感谢失败" });
            eventBus.emit(CMD.REFRESH_ONCE);
          },
        );
      },
    },
  };
  const _hoisted_1$e = {
    key: 2,
    class: "link-num",
  };
  const _hoisted_2$b = { key: 3 };
  function _sfc_render$7(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_Icon = vue.resolveComponent("Icon");
    const _component_PopConfirm = vue.resolveComponent("PopConfirm");
    return (
      vue.openBlock(),
      vue.createBlock(
        _component_PopConfirm,
        {
          disabled: $options.disabled,
          title: `确认花费 10 个铜币向 @${$props.item.username} 的这条回复发送感谢？`,
          onConfirm: $options.thank,
        },
        {
          default: vue.withCtx(() => [
            vue.createElementVNode(
              "div",
              {
                class: vue.normalizeClass([
                  "tool",
                  [$options.disabled && "disabled"],
                ]),
                onClick:
                  _cache[0] ||
                  (_cache[0] = (...args) =>
                    $options.thankError && $options.thankError(...args)),
              },
              [
                $props.item.isThanked
                  ? (vue.openBlock(),
                    vue.createBlock(_component_Icon, {
                      key: 0,
                      color: "rgb(224,42,42)",
                      icon: "icon-park-solid:like",
                    }))
                  : (vue.openBlock(),
                    vue.createBlock(
                      _component_Icon,
                      {
                        key: 1,
                        color: !$props.item.thankCount
                          ? null
                          : "rgb(224,42,42)",
                        icon: "icon-park-outline:like",
                      },
                      null,
                      8,
                      ["color"],
                    )),
                $props.item.thankCount
                  ? (vue.openBlock(),
                    vue.createElementBlock(
                      "span",
                      _hoisted_1$e,
                      vue.toDisplayString($props.item.thankCount),
                      1,
                    ))
                  : (vue.openBlock(),
                    vue.createElementBlock("span", _hoisted_2$b, "感谢")),
              ],
              2,
            ),
          ]),
          _: 1,
        },
        8,
        ["disabled", "title", "onConfirm"],
      )
    );
  }
  const Point = /* @__PURE__ */ _export_sfc(_sfc_main$e, [
    ["render", _sfc_render$7],
  ]);
  const _sfc_main$d = {
    name: "Author",
    components: { PopConfirm, Point, Icon },
    inject: ["isLogin", "tags", "config", "isNight"],
    props: {
      modelValue: false,
      comment: {
        type: Object,
        default() {
          return {};
        },
      },
      type: {
        type: String,
        default() {
          return "list";
        },
      },
    },
    computed: {
      isDev() {
        return false;
      },
      pointInfo() {
        return {
          isThanked: this.comment.isThanked,
          thankCount: this.comment.thankCount,
          username: this.comment.username,
        };
      },
      myTags() {
        return this.tags[this.comment.username] ?? [];
      },
      context() {
        return this.comment.replyUsers.length;
      },
    },
    methods: {
      jump() {
        eventBus.emit(CMD.JUMP, this.comment.floor);
      },
      showRelationReply() {
        if (!this.comment.replyUsers.length) {
          eventBus.emit(CMD.SHOW_MSG, {
            type: "warning",
            text: "该回复无上下文",
          });
          return;
        }
        eventBus.emit(CMD.RELATION_REPLY, {
          left: this.comment.replyUsers,
          right: this.comment.username,
          rightFloor: this.comment.floor,
        });
      },
      addTag() {
        eventBus.emit(CMD.ADD_TAG, this.comment.username);
      },
      removeTag(tag) {
        eventBus.emit(CMD.REMOVE_TAG, { username: this.comment.username, tag });
      },
      checkIsLogin(emitName = "") {
        if (!this.isLogin) {
          eventBus.emit(CMD.SHOW_MSG, { type: "warning", text: "请先登录！" });
          return false;
        }
        this.$emit(emitName);
        return true;
      },
      addThank() {
        eventBus.emit(CMD.CHANGE_COMMENT_THANK, {
          id: this.comment.id,
          type: "add",
        });
      },
      recallThank() {
        eventBus.emit(CMD.CHANGE_COMMENT_THANK, {
          id: this.comment.id,
          type: "recall",
        });
      },
    },
  };
  const _hoisted_1$d = { class: "Author-left" };
  const _hoisted_2$a = ["href"];
  const _hoisted_3$8 = ["src"];
  const _hoisted_4$7 = { class: "texts" };
  const _hoisted_5$6 = ["href"];
  const _hoisted_6$6 = {
    key: 0,
    class: "owner",
  };
  const _hoisted_7$6 = {
    key: 1,
    class: "dup",
  };
  const _hoisted_8$6 = {
    key: 2,
    class: "mod",
  };
  const _hoisted_9$6 = { class: "ago" };
  const _hoisted_10$6 = { class: "my-tag" };
  const _hoisted_11$5 = ["onClick"];
  const _hoisted_12$4 = { class: "Author-right" };
  const _hoisted_13$4 = {
    key: 0,
    class: "toolbar",
  };
  const _hoisted_14$3 = { class: "tool" };
  function _sfc_render$6(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_Icon = vue.resolveComponent("Icon");
    const _component_PopConfirm = vue.resolveComponent("PopConfirm");
    const _component_Point = vue.resolveComponent("Point");
    return (
      vue.openBlock(),
      vue.createElementBlock(
        "div",
        {
          class: vue.normalizeClass(["Author", { expand: !$props.modelValue }]),
        },
        [
          vue.createElementVNode("div", _hoisted_1$d, [
            !$props.modelValue
              ? (vue.openBlock(),
                vue.createBlock(_component_Icon, {
                  key: 0,
                  onClick:
                    _cache[0] ||
                    (_cache[0] = vue.withModifiers(
                      ($event) => _ctx.$emit("update:modelValue", true),
                      ["stop"],
                    )),
                  color: "#177EC9",
                  class: "expand-icon",
                  icon: "gravity-ui:chevrons-expand-up-right",
                }))
              : vue.createCommentVNode("", true),
            $options.config.viewType !== "simple"
              ? (vue.openBlock(),
                vue.createElementBlock(
                  "a",
                  {
                    key: 1,
                    class: "avatar",
                    href: `/member/${$props.comment.username}`,
                  },
                  [
                    vue.createElementVNode(
                      "img",
                      {
                        src: $props.comment.avatar,
                        alt: "",
                      },
                      null,
                      8,
                      _hoisted_3$8,
                    ),
                  ],
                  8,
                  _hoisted_2$a,
                ))
              : vue.createCommentVNode("", true),
            vue.createElementVNode("span", _hoisted_4$7, [
              vue.createElementVNode("strong", null, [
                vue.createElementVNode(
                  "a",
                  {
                    href: `/member/${$props.comment.username}`,
                    class: vue.normalizeClass([
                      "username",
                      { dark: $options.isNight },
                    ]),
                  },
                  vue.toDisplayString($props.comment.username),
                  11,
                  _hoisted_5$6,
                ),
              ]),
              $props.comment.isOp
                ? (vue.openBlock(),
                  vue.createElementBlock("div", _hoisted_6$6, "OP"))
                : vue.createCommentVNode("", true),
              $props.comment.isDup
                ? (vue.openBlock(),
                  vue.createElementBlock("div", _hoisted_7$6, "DUP"))
                : vue.createCommentVNode("", true),
              $props.comment.isMod
                ? (vue.openBlock(),
                  vue.createElementBlock("div", _hoisted_8$6, "MOD"))
                : vue.createCommentVNode("", true),
              vue.createElementVNode(
                "span",
                _hoisted_9$6,
                vue.toDisplayString($props.comment.date),
                1,
              ),
              $options.config.openTag
                ? (vue.openBlock(),
                  vue.createElementBlock(
                    vue.Fragment,
                    { key: 3 },
                    [
                      (vue.openBlock(true),
                      vue.createElementBlock(
                        vue.Fragment,
                        null,
                        vue.renderList($options.myTags, (i) => {
                          return (
                            vue.openBlock(),
                            vue.createElementBlock("span", _hoisted_10$6, [
                              _cache[6] ||
                                (_cache[6] = vue.createElementVNode(
                                  "i",
                                  { class: "fa fa-tag" },
                                  null,
                                  -1,
                                )),
                              vue.createElementVNode(
                                "span",
                                null,
                                vue.toDisplayString(i),
                                1,
                              ),
                              vue.createElementVNode(
                                "i",
                                {
                                  class: "fa fa-trash-o remove",
                                  onClick: vue.withModifiers(
                                    ($event) => $options.removeTag(i),
                                    ["stop"],
                                  ),
                                },
                                null,
                                8,
                                _hoisted_11$5,
                              ),
                            ])
                          );
                        }),
                        256,
                      )),
                      vue.createElementVNode(
                        "span",
                        {
                          class: "add-tag ago",
                          onClick:
                            _cache[1] ||
                            (_cache[1] = vue.withModifiers(
                              (...args) =>
                                $options.addTag && $options.addTag(...args),
                              ["stop"],
                            )),
                          title: "添加标签",
                        },
                        "+",
                      ),
                    ],
                    64,
                  ))
                : vue.createCommentVNode("", true),
            ]),
          ]),
          vue.createElementVNode("div", _hoisted_12$4, [
            $options.isLogin
              ? (vue.openBlock(),
                vue.createElementBlock("div", _hoisted_13$4, [
                  vue.createVNode(
                    _component_PopConfirm,
                    {
                      title: "确认隐藏这条回复?",
                      onConfirm:
                        _cache[2] ||
                        (_cache[2] = ($event) => _ctx.$emit("hide")),
                    },
                    {
                      default: vue.withCtx(() => [
                        vue.createElementVNode("div", _hoisted_14$3, [
                          vue.createVNode(_component_Icon, {
                            icon: "fluent:eye-hide-24-regular",
                          }),
                          _cache[7] ||
                            (_cache[7] = vue.createElementVNode(
                              "span",
                              null,
                              "隐藏",
                              -1,
                            )),
                        ]),
                      ]),
                      _: 1,
                    },
                  ),
                  $options.context
                    ? (vue.openBlock(),
                      vue.createElementBlock(
                        "div",
                        {
                          key: 0,
                          class: "tool",
                          onClick:
                            _cache[3] ||
                            (_cache[3] = vue.withModifiers(
                              (...args) =>
                                $options.showRelationReply &&
                                $options.showRelationReply(...args),
                              ["stop"],
                            )),
                        },
                        [
                          vue.createVNode(_component_Icon, {
                            icon: "iconoir:page-search",
                          }),
                          _cache[8] ||
                            (_cache[8] = vue.createElementVNode(
                              "span",
                              null,
                              "上下文",
                              -1,
                            )),
                        ],
                      ))
                    : vue.createCommentVNode("", true),
                  $props.type === "top"
                    ? (vue.openBlock(),
                      vue.createElementBlock(
                        "div",
                        {
                          key: 1,
                          class: "tool",
                          onClick:
                            _cache[4] ||
                            (_cache[4] = vue.withModifiers(
                              (...args) =>
                                $options.jump && $options.jump(...args),
                              ["stop"],
                            )),
                        },
                        [
                          vue.createVNode(_component_Icon, {
                            icon: "icon-park-outline:to-bottom",
                          }),
                          _cache[9] ||
                            (_cache[9] = vue.createElementVNode(
                              "span",
                              null,
                              "跳转",
                              -1,
                            )),
                        ],
                      ))
                    : vue.createCommentVNode("", true),
                  vue.createElementVNode(
                    "div",
                    {
                      class: "tool",
                      onClick:
                        _cache[5] ||
                        (_cache[5] = vue.withModifiers(
                          ($event) => $options.checkIsLogin("reply"),
                          ["stop"],
                        )),
                    },
                    [
                      vue.createVNode(_component_Icon, {
                        icon: "mynaui:message",
                      }),
                      _cache[10] ||
                        (_cache[10] = vue.createElementVNode(
                          "span",
                          null,
                          "回复",
                          -1,
                        )),
                    ],
                  ),
                  vue.withDirectives(
                    vue.createVNode(
                      _component_Point,
                      {
                        item: $options.pointInfo,
                        onAddThank: $options.addThank,
                        onRecallThank: $options.recallThank,
                        "api-url": "reply/" + $props.comment.id,
                      },
                      null,
                      8,
                      ["item", "onAddThank", "onRecallThank", "api-url"],
                    ),
                    [[vue.vShow, !$props.comment.thankCount]],
                  ),
                ]))
              : vue.createCommentVNode("", true),
            vue.withDirectives(
              vue.createVNode(
                _component_Point,
                {
                  item: $options.pointInfo,
                  onAddThank: $options.addThank,
                  onRecallThank: $options.recallThank,
                  "api-url": "reply/" + $props.comment.id,
                },
                null,
                8,
                ["item", "onAddThank", "onRecallThank", "api-url"],
              ),
              [[vue.vShow, $props.comment.thankCount]],
            ),
            vue.createElementVNode(
              "div",
              {
                class: vue.normalizeClass(["floor", { isDev: $options.isDev }]),
              },
              vue.toDisplayString($props.comment.floor),
              3,
            ),
          ]),
        ],
        2,
      )
    );
  }
  const Author = /* @__PURE__ */ _export_sfc(_sfc_main$d, [
    ["render", _sfc_render$6],
    ["__scopeId", "data-v-64aa1930"],
  ]);
  const _hoisted_1$c = { class: "get-cursor" };
  const _hoisted_2$9 = ["innerHTML"];
  const _hoisted_3$7 = { class: "toolbar" };
  const _hoisted_4$6 = { class: "left" };
  const _hoisted_5$5 = { class: "upload" };
  const _hoisted_6$5 = {
    key: 0,
    style: { color: "black", "font-size": "1.4rem" },
  };
  const _hoisted_7$5 = { class: "right" };
  const _hoisted_8$5 = { class: "list" };
  const _hoisted_9$5 = ["src", "onClick"];
  const _hoisted_10$5 = { class: "emoji" };
  const _hoisted_11$4 = { class: "title" };
  const _hoisted_12$3 = { class: "list" };
  const _hoisted_13$3 = ["onClick"];
  const _sfc_main$c = {
    __name: "PostEditor",
    props: {
      replyUser: null,
      replyFloor: null,
      useType: {
        type: String,
        default() {
          return "reply-comment";
        },
      },
    },
    emits: ["close"],
    setup(__props, { expose: __expose, emit: __emit }) {
      const props = __props;
      const { replyUser, replyFloor, useType } = props;
      const replyInfo = replyUser ? `@${replyUser} #${replyFloor} ` : "";
      const emits = __emit;
      const post = vue.inject("post");
      const show = vue.inject("show");
      const isNight = vue.inject("isNight");
      vue.inject("pageType");
      const allReplyUsers = vue.inject("allReplyUsers");
      let isFocus = vue.ref(false);
      const loading = vue.ref(false);
      const uploadLoading = vue.ref(false);
      const isShowEmoticons = vue.ref(false);
      const editorId = vue.ref("editorId_" + Date.now());
      const content = vue.ref(replyInfo);
      const txtRef = vue.ref(null);
      const cursorRef = vue.ref(null);
      const emoticonsRef = vue.ref(null);
      const none = vue.ref('<span style="white-space:pre-wrap;"> </span>');
      const imgurClientIdPool = [
        "3107b9ef8b316f3",
        "442b04f26eefc8a",
        "59cfebe717c09e4",
        "60605aad4a62882",
        "6c65ab1d3f5452a",
        "83e123737849aa9",
        "9311f6be1c10160",
        "c4a4a563f698595",
        "81be04b9e4a08ce",
      ];
      __expose({ content, isFocus: () => isFocus.value });
      const editorClass = vue.computed(() => {
        return [
          useType,
          isFocus.value ? "isFocus" : "",
          isNight.value ? "isNight" : "",
        ];
      });
      const cursorHtml = vue.computed(() => {
        var _a;
        if (!txtRef.value || !content.value) return "";
        let index =
          ((_a = txtRef.value) == null ? void 0 : _a.selectionStart) || 0;
        return content.value
          .substring(0, index)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br/>")
          .replace(/\s/g, none.value);
      });
      const disabled = vue.computed(() => {
        if (content.value) {
          return content.value === replyInfo;
        } else {
          return true;
        }
      });
      function drop(e2) {
        e2.preventDefault();
        upload(e2.dataTransfer.files[0]);
      }
      async function upload(file) {
        if (!file) return;
        if (uploadLoading.value) return;
        uploadLoading.value = true;
        try {
          const formData = new FormData();
          formData.append("image", file);
          const randomIndex = Math.floor(
            Math.random() * imgurClientIdPool.length,
          );
          const clientId = imgurClientIdPool[randomIndex];
          const res = await fetch("https://api.imgur.com/3/upload", {
            method: "POST",
            headers: { Authorization: `Client-ID ${clientId}` },
            body: formData,
          });
          if (res.ok) {
            const resData = await res.json();
            if (resData.success) {
              return insert(" " + resData.data.link + " ");
            }
          }
          eventBus.emit(CMD.SHOW_MSG, { type: "error", text: "上传失败" });
        } catch (e) {
          console.error("Imgur upload error:", e);
          eventBus.emit(CMD.SHOW_MSG, {
            type: "error",
            text: "上传失败，请检查网络",
          });
        } finally {
          uploadLoading.value = false;
        }
      }
      async function submit() {
        if (disabled.value || loading.value) return;
        loading.value = true;
        let submit_content = content.value.replace(
          /\[((?!\[).)+\]/g,
          function (match) {
            let item2 = classicsEmoticons.find((v) => v.name === match);
            if (item2) {
              return item2.low + " ";
            }
            return match;
          },
        );
        let show_content = content.value.replace(
          /https?:\/\/(i\.)?imgur\.com\/((?!http).)+\.(gif|png|jpg|jpeg|GIF|PNG|JPG|JPEG)/g,
          function (match) {
            return `<img src="${match}" data-originUrl="${match}" data-notice="这个img标签由v2ex-超级增强脚本解析" style="max-width: 100%">`;
          },
        );
        show_content = show_content.replace(
          /\[((?!\[).)+\]/g,
          function (match) {
            let item2 = classicsEmoticons.find((v) => v.name === match);
            if (item2) {
              return `<a target="_blank" href="${item2.low}" rel="nofollow noopener"><img src="${item2.low}" class="embedded_image" rel="noreferrer"></a> `;
            }
            return match;
          },
        );
        let matchUsers = show_content.match(/@([\w]+?[\s])/g);
        if (matchUsers) {
          matchUsers.forEach((i) => {
            let username = i.replace("@", "").trim();
            show_content = show_content.replace(
              username,
              `<a href="/member/${username}">${username}</a>`,
            );
          });
        }
        show_content = show_content.replaceAll("\n", "<br/>");
        let item = {
          thankCount: 0,
          isThanked: false,
          isOp: post.value.username === window.user.username,
          isDup: false,
          id: Date.now(),
          username: window.user.username,
          avatar: window.user.avatar,
          date: "几秒前",
          floor: post.value.replyCount + 1,
          reply_content: show_content ?? "",
          children: [],
          replyUsers: replyUser ? [replyUser] : [],
          replyFloor: replyFloor || -1,
          level: useType === "reply-comment" ? 1 : 0,
        };
        item.hideCallUserReplyContent = item.reply_content;
        if (item.replyUsers.length === 1) {
          item.hideCallUserReplyContent = item.reply_content.replace(
            /@<a href="\/member\/[\s\S]+?<\/a>(?:<ul [\s\S]+<\/ul>)?(\s#[\d]+)?\s(<br>)?/,
            () => "",
          );
        }
        let url2 = `${location.origin}/t/${post.value.id}`;
        $.post(url2, { content: submit_content, once: post.value.once })
          .then(
            // $.post(url, {content: submit_content, once: 123}).then(
            (res) => {
              loading.value = false;
              let r2 = res.search("你上一条回复的内容和这条相同");
              if (r2 > -1)
                return eventBus.emit(CMD.SHOW_MSG, {
                  type: "error",
                  text: "你上一条回复的内容和这条相同",
                });
              r2 = res.search(
                "请不要在每一个回复中都包括外链，这看起来像是在 spamming",
              );
              if (r2 > -1)
                return eventBus.emit(CMD.SHOW_MSG, {
                  type: "error",
                  text: "请不要在每一个回复中都包括外链，这看起来像是在 spamming",
                });
              let r22 = res.search("创建新回复");
              if (r22 > -1) {
                eventBus.emit(CMD.REFRESH_ONCE, res);
                eventBus.emit(CMD.SHOW_MSG, {
                  type: "error",
                  text: "回复出现了问题，请使用原版进行回复",
                });
                let clientWidth = window.document.body.clientWidth;
                let windowWidth = 1200;
                let left = clientWidth / 2 - windowWidth / 2;
                let newWin = window.open(
                  "",
                  "_blank",
                  `width=${windowWidth},height=600,left=${left},top=100`,
                );
                if (newWin) {
                  newWin.document.write(res);
                  let loop = setInterval(function () {
                    if (newWin.closed) {
                      clearInterval(loop);
                      eventBus.emit(CMD.REFRESH_POST);
                    }
                  }, 1e3);
                } else {
                  eventBus.emit(CMD.SHOW_MSG, {
                    type: "warning",
                    text: "窗口被浏览器拦截，请允许弹出窗口后重试",
                  });
                }
                return;
              }
              content.value = replyInfo;
              emits("close");
              eventBus.emit(CMD.REFRESH_ONCE, res);
              eventBus.emit(CMD.SHOW_MSG, {
                type: "success",
                text: "回复成功",
              });
              eventBus.emit(CMD.ADD_REPLY, item);
            },
            (err) => {
              loading.value = false;
              eventBus.emit(CMD.SHOW_MSG, { type: "error", text: "回复失败" });
            },
          )
          .catch(() => {});
      }
      function getEmojiSrc(url2) {
        return window.config.replaceImgur ? DefaultVal.imgurProxy + url2 : url2;
      }
      function showEmoticons(e2) {
        if (isShowEmoticons.value) {
          return (isShowEmoticons.value = false);
        }
        let rect = e2.currentTarget.getBoundingClientRect();
        emoticonsRef.value.style.left = rect.left + 30 + "px";
        emoticonsRef.value.style.bottom =
          window.innerHeight - rect.top - 20 + "px";
        isShowEmoticons.value = true;
      }
      function off() {
        eventBus.emit(CMD.SHOW_CALL, { show: false });
        eventBus.off(CMD.SET_CALL);
      }
      function checkHeight2() {
        txtRef.value.style.height = 0;
        txtRef.value.style.height = txtRef.value.scrollHeight + "px";
      }
      function insert(str) {
        let cursorPos = txtRef.value.selectionStart;
        let start = content.value.slice(0, cursorPos);
        let end = content.value.slice(cursorPos, content.value.length);
        content.value = start + str + end;
        let moveCursorPos = start.length + str.length;
        setTimeout(() => {
          txtRef.value.focus();
          txtRef.value.setSelectionRange(moveCursorPos, moveCursorPos);
          checkHeight2();
        });
      }
      function showCallPopover(text) {
        let r2 = cursorRef.value.getBoundingClientRect();
        eventBus.emit(CMD.SHOW_CALL, {
          show: true,
          top: r2.top,
          left: r2.left,
          text,
        });
        eventBus.off(CMD.SET_CALL);
        eventBus.on(CMD.SET_CALL, (e2) => {
          let cursorPos = txtRef.value.selectionStart;
          let start = content.value.slice(0, cursorPos);
          let end = content.value.slice(cursorPos, content.value.length);
          let lastCallPos = start.lastIndexOf("@");
          start = content.value.slice(0, lastCallPos + 1);
          if (e2 === "管理员") {
            e2 =
              "Livid @Kai @Olivia @GordianZ @sparanoid @drymonfidelia @GordianZ @sillydaddy";
          }
          if (e2 === "所有人") {
            e2 = allReplyUsers.value
              .map((v, i) => {
                if (i) return "@" + v;
                else return v;
              })
              .join(" ");
          }
          content.value = start + e2 + " " + end;
          let moveCursorPos = start.length + e2.length + 1;
          setTimeout(() => {
            txtRef.value.setSelectionRange(moveCursorPos, moveCursorPos);
            checkHeight2();
          });
          eventBus.off(CMD.SET_CALL);
        });
      }
      function onKeydown(e2) {
        let code2 = e2.keyCode;
        switch (code2) {
          case 8:
            if (content.value === "@") {
              off();
            }
            break;
          case 37:
          case 38:
          case 39:
          case 40:
            setTimeout(() => onInput({ data: "" }), 100);
            break;
          case 27:
            e2.preventDefault();
            e2.stopPropagation();
            e2.stopImmediatePropagation();
            return false;
          case 13:
            if (e2.ctrlKey) submit();
            if (e2.metaKey) submit();
            break;
        }
      }
      function onInput(e2) {
        let cursorPos = txtRef.value.selectionStart;
        if (!content.value) return;
        if (e2.data === " ") {
          return off();
        }
        if (e2.data === "@") {
          if (content.value.length !== 1) {
            if (
              content.value[cursorPos - 2] === " " ||
              content.value[cursorPos - 2] === "\n"
            ) {
              return showCallPopover("");
            }
          } else {
            return showCallPopover("");
          }
          off();
        } else {
          checkHeight2();
          let judgeStr = content.value.slice(0, cursorPos);
          let lastCallPos = judgeStr.lastIndexOf("@");
          if (lastCallPos === -1) {
            return off();
          }
          let callStr = judgeStr.slice(lastCallPos, cursorPos);
          let hasSpace = callStr.includes(" ");
          if (hasSpace) {
            off();
          } else {
            if (lastCallPos === 0) {
              return showCallPopover(callStr.replace("@", ""));
            }
            if (content.value.length !== 1) {
              if (
                content.value[lastCallPos - 1] === " " ||
                content.value[lastCallPos - 1] === "\n"
              ) {
                return showCallPopover(callStr.replace("@", ""));
              }
            } else {
              return showCallPopover(callStr.replace("@", ""));
            }
            off();
          }
        }
      }
      function onPaste(e2) {
        const dataTransferItemList = e2.clipboardData.items;
        const items = [].slice
          .call(dataTransferItemList)
          .filter(function (item) {
            return item.type.indexOf("image") !== -1;
          });
        if (items.length === 0) {
          return;
        }
        const dataTransferItem = items[0];
        const blob = dataTransferItem.getAsFile();
        upload(blob);
      }
      function onBlur() {
        document.removeEventListener("paste", onPaste);
        isFocus.value = false;
      }
      function onFocusin() {
        document.addEventListener("paste", onPaste);
      }
      vue.watch(
        () => show,
        (n2) => {
          if (n2.value) isShowEmoticons.value = false;
        },
        { deep: true },
      );
      vue.onMounted(() => {
        $(`.${editorId.value}`)
          .each(function () {
            this.setAttribute(
              "style",
              "height:" + this.scrollHeight + "px;overflow-y:hidden;",
            );
          })
          .on("input", function () {
            this.style.height = 0;
            this.style.height = this.scrollHeight + "px";
          });
        if (useType === "reply-comment") {
          txtRef.value && txtRef.value.focus();
        }
      });
      vue.onBeforeUnmount(() => {
        document.removeEventListener("paste", onPaste);
        $(`.${editorId.value}`).off();
      });
      return (_ctx, _cache) => {
        return (
          vue.openBlock(),
          vue.createElementBlock(
            "div",
            {
              class: vue.normalizeClass([
                "post-editor-wrapper",
                editorClass.value,
              ]),
            },
            [
              vue.withDirectives(
                vue.createElementVNode(
                  "textarea",
                  {
                    class: vue.normalizeClass(["post-editor", editorId.value]),
                    ref_key: "txtRef",
                    ref: txtRef,
                    onFocus:
                      _cache[0] ||
                      (_cache[0] = ($event) =>
                        vue.isRef(isFocus)
                          ? (isFocus.value = true)
                          : (isFocus = true)),
                    onBlur,
                    onFocusin,
                    placeholder: "请尽量让自己的回复能够对别人有帮助",
                    onInput,
                    onKeydown,
                    onDrop: drop,
                    "onUpdate:modelValue":
                      _cache[1] ||
                      (_cache[1] = ($event) => (content.value = $event)),
                  },
                  null,
                  34,
                ),
                [[vue.vModelText, content.value]],
              ),
              vue.createElementVNode("div", _hoisted_1$c, [
                vue.createElementVNode(
                  "span",
                  { innerHTML: cursorHtml.value },
                  null,
                  8,
                  _hoisted_2$9,
                ),
                vue.createElementVNode(
                  "span",
                  {
                    class: "cursor",
                    ref_key: "cursorRef",
                    ref: cursorRef,
                  },
                  "|",
                  512,
                ),
              ]),
              vue.createElementVNode("div", _hoisted_3$7, [
                vue.createElementVNode("div", _hoisted_4$6, [
                  vue.createVNode(vue.unref(Icon), {
                    onClick: vue.withModifiers(showEmoticons, ["stop"]),
                    icon: "streamline:smiley-happy",
                  }),
                  vue.createElementVNode("div", _hoisted_5$5, [
                    vue.createElementVNode(
                      "input",
                      {
                        type: "file",
                        accept: "image/*",
                        onChange:
                          _cache[2] ||
                          (_cache[2] = (e2) =>
                            upload(e2.currentTarget.files[0])),
                      },
                      null,
                      32,
                    ),
                    vue.createVNode(vue.unref(Icon), {
                      icon: "lets-icons:img-load-box-fill",
                    }),
                  ]),
                  uploadLoading.value
                    ? (vue.openBlock(),
                      vue.createElementBlock(
                        "span",
                        _hoisted_6$5,
                        "上传中.....",
                      ))
                    : vue.createCommentVNode("", true),
                ]),
                vue.createElementVNode("div", _hoisted_7$5, [
                  vue.unref(useType) === "reply-comment"
                    ? (vue.openBlock(),
                      vue.createBlock(
                        BaseButton,
                        {
                          key: 0,
                          type: "link",
                          size: "small",
                          style: { "margin-right": "1rem", cursor: "pointer" },
                          onClick:
                            _cache[3] ||
                            (_cache[3] = vue.withModifiers(
                              ($event) => emits("close"),
                              ["stop"],
                            )),
                        },
                        {
                          default: vue.withCtx(() => [
                            ...(_cache[5] ||
                              (_cache[5] = [
                                vue.createTextVNode(" 关闭 ", -1),
                              ])),
                          ]),
                          _: 1,
                        },
                      ))
                    : vue.createCommentVNode("", true),
                  vue.createVNode(
                    BaseButton,
                    {
                      size: "small",
                      disabled: disabled.value,
                      loading: loading.value,
                      onClick: vue.withModifiers(submit, ["stop"]),
                    },
                    {
                      default: vue.withCtx(() => [
                        ...(_cache[6] ||
                          (_cache[6] = [vue.createTextVNode("回复 ", -1)])),
                      ]),
                      _: 1,
                    },
                    8,
                    ["disabled", "loading"],
                  ),
                ]),
              ]),
              vue.withDirectives(
                vue.createElementVNode(
                  "div",
                  {
                    class: "emoticon-pack",
                    ref_key: "emoticonsRef",
                    ref: emoticonsRef,
                  },
                  [
                    vue.createVNode(vue.unref(Icon), {
                      icon: "ic:round-close",
                      onClick:
                        _cache[4] ||
                        (_cache[4] = vue.withModifiers(
                          ($event) => (isShowEmoticons.value = false),
                          ["stop"],
                        )),
                    }),
                    _cache[7] ||
                      (_cache[7] = vue.createElementVNode(
                        "div",
                        { class: "title" },
                        "经典",
                        -1,
                      )),
                    vue.createElementVNode("div", _hoisted_8$5, [
                      (vue.openBlock(true),
                      vue.createElementBlock(
                        vue.Fragment,
                        null,
                        vue.renderList(vue.unref(classicsEmoticons), (item) => {
                          return (
                            vue.openBlock(),
                            vue.createElementBlock(
                              "img",
                              {
                                src: getEmojiSrc(item.high),
                                referrerpolicy: "no-referrer",
                                onClick: vue.withModifiers(
                                  ($event) => {
                                    insert(item.name);
                                    isShowEmoticons.value = false;
                                  },
                                  ["stop"],
                                ),
                              },
                              null,
                              8,
                              _hoisted_9$5,
                            )
                          );
                        }),
                        256,
                      )),
                    ]),
                    vue.createElementVNode("div", _hoisted_10$5, [
                      (vue.openBlock(true),
                      vue.createElementBlock(
                        vue.Fragment,
                        null,
                        vue.renderList(vue.unref(emojiEmoticons), (item) => {
                          return (
                            vue.openBlock(),
                            vue.createElementBlock(
                              vue.Fragment,
                              null,
                              [
                                vue.createElementVNode(
                                  "div",
                                  _hoisted_11$4,
                                  vue.toDisplayString(item.title),
                                  1,
                                ),
                                vue.createElementVNode("div", _hoisted_12$3, [
                                  (vue.openBlock(true),
                                  vue.createElementBlock(
                                    vue.Fragment,
                                    null,
                                    vue.renderList(item.list, (emoji) => {
                                      return (
                                        vue.openBlock(),
                                        vue.createElementBlock(
                                          "span",
                                          {
                                            onClick: vue.withModifiers(
                                              ($event) => {
                                                insert(emoji);
                                                isShowEmoticons.value = false;
                                              },
                                              ["stop"],
                                            ),
                                          },
                                          vue.toDisplayString(emoji),
                                          9,
                                          _hoisted_13$3,
                                        )
                                      );
                                    }),
                                    256,
                                  )),
                                ]),
                              ],
                              64,
                            )
                          );
                        }),
                        256,
                      )),
                    ]),
                  ],
                  512,
                ),
                [[vue.vShow, isShowEmoticons.value]],
              ),
            ],
            2,
          )
        );
      };
    },
  };
  const PostEditor = /* @__PURE__ */ _export_sfc(_sfc_main$c, [
    ["__scopeId", "data-v-0e56c62c"],
  ]);
  const _hoisted_1$b = {
    key: 0,
    class: "html-wrapper",
  };
  const _hoisted_2$8 = ["innerHTML"];
  const DEFAULT_COLLAPSE_HEIGHT = 900;
  const _sfc_main$b = {
    __name: "BaseHtmlRender",
    props: ["html"],
    setup(__props) {
      const config2 = vue.inject("config");
      const props = __props;
      const contentRef = vue.ref(null);
      const mask = vue.ref(false);
      const handOpen = vue.ref(false);
      function mouseup(e2) {
        if (!config2.value.base64) return;
        let selectionText = window.getSelection().toString();
        if (selectionText) {
          let r2 = selectionText.match(/([A-Za-z0-9+/=]+)/g);
          if (r2) {
            if (r2[0].length < 4) return;
            eventBus.emit(CMD.SHOW_TOOLTIP, { text: r2[0], e: e2 });
          }
        }
      }
      vue.watch(config2.value, (newVale) => {
        if (!newVale.contentAutoCollapse) {
          mask.value = false;
        }
      });
      // 阈值变化后立即重新检查，无需刷新页面
      vue.watch(
        () => config2.value.collapseHeight,
        () => {
          if (!config2.value.contentAutoCollapse) return;
          vue.nextTick(checkContentHeight);
        },
      );
      vue.watch(
        [() => contentRef.value, () => props.html],
        () => {
          if (!contentRef.value || !props.html) return;
          if (!config2.value.contentAutoCollapse) return;
          contentRef.value.querySelectorAll("img").forEach((item) => {
            item.removeEventListener("load", checkContentHeight);
            item.addEventListener("load", checkContentHeight);
          });
          checkContentHeight();
        },
        { immediate: true, flush: "post" },
      );
      function getCollapseHeight() {
        let height = Math.trunc(Number(config2.value.collapseHeight));
        if (!Number.isFinite(height) || height < 200) {
          return DEFAULT_COLLAPSE_HEIGHT;
        }
        return height > 5000 ? 5000 : height;
      }
      function checkContentHeight() {
        if (handOpen.value) return;
        if (!contentRef.value) return;
        let rect = contentRef.value.getBoundingClientRect();
        mask.value = rect.height >= getCollapseHeight();
      }
      return (_ctx, _cache) => {
        return props.html
          ? (vue.openBlock(),
            vue.createElementBlock("div", _hoisted_1$b, [
              vue.createElementVNode(
                "div",
                {
                  class: vue.normalizeClass({ mask: mask.value }),
                  style: mask.value
                    ? { maxHeight: getCollapseHeight() + "px" }
                    : null,
                },
                [
                  vue.createElementVNode(
                    "div",
                    {
                      ref_key: "contentRef",
                      ref: contentRef,
                      innerHTML: props.html,
                      onMouseup: mouseup,
                    },
                    null,
                    40,
                    _hoisted_2$8,
                  ),
                ],
                6,
              ),
              mask.value
                ? (vue.openBlock(),
                  vue.createElementBlock(
                    "div",
                    {
                      key: 0,
                      class: "expand",
                      onClick:
                        _cache[0] ||
                        (_cache[0] = ($event) => {
                          mask.value = false;
                          handOpen.value = true;
                        }),
                    },
                    "展开",
                  ))
                : vue.createCommentVNode("", true),
            ]))
          : vue.createCommentVNode("", true);
      };
    },
  };
  const BaseHtmlRender = /* @__PURE__ */ _export_sfc(_sfc_main$b, [
    ["__scopeId", "data-v-6f61a860"],
  ]);
  const _sfc_main$a = {
    name: "TopSubComment",
    components: { BaseHtmlRender, Author, PostEditor, Point, Icon },
    inject: [
      "post",
      "postDetailWidth",
      "show",
      "isNight",
      "isLogin",
      "tags",
      "config",
    ],
    props: {
      modelValue: {
        reply_content: "",
      },
      level: -1,
    },
    data() {
      return {
        expand: true,
        edit: false,
        replyInfo: `@${this.modelValue.username} #${this.modelValue.floor} `,
        floor: this.modelValue.floor,
      };
    },
    watch: {
      show(e2) {
        if (e2) {
          this.edit = false;
        }
      },
    },
    computed: {
      myTags() {
        return this.tags[this.modelValue.username] ?? [];
      },
    },
    methods: {
      jump() {
        eventBus.emit(CMD.JUMP, this.modelValue.floor);
      },
    },
  };
  const _hoisted_1$a = ["data-floor"];
  const _hoisted_2$7 = { class: "right" };
  const _hoisted_3$6 = { class: "simple-wrapper" };
  function _sfc_render$5(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_Author = vue.resolveComponent("Author");
    const _component_BaseHtmlRender = vue.resolveComponent("BaseHtmlRender");
    const _component_PostEditor = vue.resolveComponent("PostEditor");
    const _component_TopSubComment = vue.resolveComponent(
      "TopSubComment",
      true,
    );
    return (
      vue.openBlock(),
      vue.createElementBlock(
        "div",
        {
          class: vue.normalizeClass([
            "top-sub-comment",
            $props.level === 1 && "top-sub-reply",
          ]),
          ref: "comment",
          "data-floor": $data.floor,
        },
        [
          _cache[3] ||
            (_cache[3] = vue.createElementVNode(
              "div",
              { class: "left expand-line" },
              null,
              -1,
            )),
          vue.createElementVNode("div", _hoisted_2$7, [
            vue.createVNode(
              _component_Author,
              {
                modelValue: $data.expand,
                "onUpdate:modelValue":
                  _cache[0] ||
                  (_cache[0] = ($event) => ($data.expand = $event)),
                comment: $props.modelValue,
                onReply:
                  _cache[1] ||
                  (_cache[1] = ($event) => ($data.edit = !$data.edit)),
                type: "top",
              },
              null,
              8,
              ["modelValue", "comment"],
            ),
            vue.createVNode(
              _component_BaseHtmlRender,
              {
                class: "top-reply_content reply_content",
                html: $props.modelValue.hideCallUserReplyContent,
              },
              null,
              8,
              ["html"],
            ),
            $data.edit
              ? (vue.openBlock(),
                vue.createBlock(
                  _component_PostEditor,
                  {
                    key: 0,
                    onClose:
                      _cache[2] ||
                      (_cache[2] = ($event) => ($data.edit = false)),
                    replyInfo: $data.replyInfo,
                    replyUser: $props.modelValue.username,
                    replyFloor: $props.modelValue.floor,
                  },
                  null,
                  8,
                  ["replyInfo", "replyUser", "replyFloor"],
                ))
              : vue.createCommentVNode("", true),
            vue.createElementVNode("div", _hoisted_3$6, [
              (vue.openBlock(true),
              vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($props.modelValue.children, (item, index) => {
                  return (
                    vue.openBlock(),
                    vue.createBlock(
                      _component_TopSubComment,
                      {
                        modelValue: $props.modelValue.children[index],
                        "onUpdate:modelValue": ($event) =>
                          ($props.modelValue.children[index] = $event),
                        key: index,
                      },
                      null,
                      8,
                      ["modelValue", "onUpdate:modelValue"],
                    )
                  );
                }),
                128,
              )),
            ]),
          ]),
        ],
        10,
        _hoisted_1$a,
      )
    );
  }
  const TopSubComment = /* @__PURE__ */ _export_sfc(_sfc_main$a, [
    ["render", _sfc_render$5],
    ["__scopeId", "data-v-d3f8c94b"],
  ]);
  const _sfc_main$9 = {
    name: "Comment",
    components: {
      BaseHtmlRender,
      Author,
      PostEditor,
      Point,
      Icon,
      TopSubComment,
    },
    inject: ["post", "postDetailWidth", "show", "isNight", "config"],
    props: {
      modelValue: {
        reply_content: "",
      },
      type: {
        type: String,
        default() {
          return "list";
        },
      },
    },
    data() {
      return {
        edit: false,
        ding: false,
        expand: true,
        expandTopReply: true,
        expandWrong: false,
        replyInfo: `@${this.modelValue.username} #${this.modelValue.floor} `,
        cssStyle: null,
        floor: this.modelValue.floor,
      };
    },
    watch: {
      show(e2) {
        if (e2) {
          this.edit = false;
        }
      },
      postDetailWidth(n2, o) {
        this.checkIsTooLong(n2);
      },
    },
    computed: {
      CommentDisplayType() {
        return CommentDisplayType;
      },
      myClass() {
        return {
          isOp: this.modelValue.isOp,
          isSimple: this.config.viewType === "simple",
          ding: this.ding,
          isLevelOne: this.type === "top" ? true : this.modelValue.level === 0,
          ["c_" + this.floor]: this.type !== "top",
        };
      },
    },
    mounted() {
      this.checkIsTooLong(this.postDetailWidth);
    },
    methods: {
      checkIsTooLong(postDetailWidth) {
        if (postDetailWidth !== 0) {
          let rect = this.$refs.comment.getBoundingClientRect();
          let ban = postDetailWidth * 0.6;
          if (
            ban < rect.width &&
            rect.width < ban + 25 &&
            this.modelValue.children.length
          ) {
            this.expand = false;
            let padding = 2;
            this.cssStyle = {
              padding: "1rem 0",
              width: `calc(${postDetailWidth}px - ${padding}rem)`,
              transform: `translateX(calc(${rect.width - postDetailWidth}px + ${padding}rem))`,
              background: this.isNight ? "#18222d" : "white",
            };
          }
        }
      },
      //高亮一下
      showDing() {
        this.ding = true;
        setTimeout(() => {
          this.ding = false;
        }, 2e3);
      },
      hide() {
        let url2 = `${location.origin}/ignore/reply/${this.modelValue.id}?once=${this.post.once}`;
        eventBus.emit(CMD.REMOVE, this.modelValue.floor);
        $.post(url2).then(
          (res) => {
            eventBus.emit(CMD.REFRESH_ONCE);
            eventBus.emit(CMD.SHOW_MSG, { type: "success", text: "隐藏成功" });
          },
          (err) => {
            eventBus.emit(CMD.SHOW_MSG, {
              type: "warning",
              text: "隐藏成功,仅本次有效（接口调用失败！）",
            });
          },
        );
      },
      toggle() {
        this.expand = !this.expand;
      },
      jump() {
        eventBus.emit(CMD.JUMP, this.modelValue.floor);
      },
      jumpFloor(floor) {
        eventBus.emit(CMD.JUMP, floor);
      },
    },
  };
  const _hoisted_1$9 = ["data-floor"];
  const _hoisted_2$6 = { class: "comment-content" };
  const _hoisted_3$5 = { class: "right" };
  const _hoisted_4$5 = { class: "w" };
  const _hoisted_5$4 = {
    key: 0,
    class: "wrong-wrapper",
  };
  const _hoisted_6$4 = ["href"];
  const _hoisted_7$4 = { class: "del-line" };
  const _hoisted_8$4 = {
    key: 0,
    class: "warning",
  };
  const _hoisted_9$4 = { class: "simple-wrapper" };
  const _hoisted_10$4 = {
    key: 0,
    class: "top-reply-wrap",
  };
  function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_Author = vue.resolveComponent("Author");
    const _component_BaseHtmlRender = vue.resolveComponent("BaseHtmlRender");
    const _component_PostEditor = vue.resolveComponent("PostEditor");
    const _component_Icon = vue.resolveComponent("Icon");
    const _component_TopSubComment = vue.resolveComponent("TopSubComment");
    const _component_Comment = vue.resolveComponent("Comment", true);
    return (
      vue.openBlock(),
      vue.createElementBlock(
        "div",
        {
          class: vue.normalizeClass(["comment", $options.myClass]),
          ref: "comment",
          "data-floor": $data.floor,
        },
        [
          vue.createVNode(
            _component_Author,
            {
              modelValue: $data.expand,
              "onUpdate:modelValue":
                _cache[0] || (_cache[0] = ($event) => ($data.expand = $event)),
              comment: $props.modelValue,
              onReply:
                _cache[1] ||
                (_cache[1] = ($event) => ($data.edit = !$data.edit)),
              type: $props.type,
              onHide: $options.hide,
            },
            null,
            8,
            ["modelValue", "comment", "type", "onHide"],
          ),
          $data.cssStyle && !$data.expand
            ? (vue.openBlock(),
              vue.createElementBlock(
                "div",
                {
                  key: 0,
                  class: "more ago",
                  onClick:
                    _cache[2] ||
                    (_cache[2] = ($event) => ($data.expand = !$data.expand)),
                },
                " 由于嵌套回复层级太深，自动将后续回复隐藏 ",
              ))
            : vue.createCommentVNode("", true),
          $data.expand
            ? (vue.openBlock(),
              vue.createElementBlock(
                "div",
                {
                  key: 1,
                  class: "comment-content-w",
                  style: vue.normalizeStyle($data.cssStyle),
                },
                [
                  $data.cssStyle
                    ? (vue.openBlock(),
                      vue.createElementBlock(
                        "div",
                        {
                          key: 0,
                          class: "more ago",
                          onClick:
                            _cache[3] ||
                            (_cache[3] = ($event) =>
                              ($data.expand = !$data.expand)),
                        },
                        " 由于嵌套回复层级太深，自动将以下回复移至可见范围 ",
                      ))
                    : vue.createCommentVNode("", true),
                  vue.createElementVNode("div", _hoisted_2$6, [
                    vue.createElementVNode("div", {
                      class: "left expand-line",
                      onClick:
                        _cache[4] ||
                        (_cache[4] = (...args) =>
                          $options.toggle && $options.toggle(...args)),
                    }),
                    vue.createElementVNode("div", _hoisted_3$5, [
                      vue.createElementVNode("div", _hoisted_4$5, [
                        $props.modelValue.isWrong
                          ? (vue.openBlock(),
                            vue.createElementBlock("div", _hoisted_5$4, [
                              vue.createElementVNode(
                                "span",
                                {
                                  onClick:
                                    _cache[5] ||
                                    (_cache[5] = ($event) =>
                                      ($data.expandWrong = !$data.expandWrong)),
                                  title: "点击楼层号查看提示",
                                },
                                [
                                  vue.createElementVNode(
                                    "a",
                                    {
                                      href:
                                        "/member/" +
                                        $props.modelValue.replyUsers[0],
                                    },
                                    "@" +
                                      vue.toDisplayString(
                                        $props.modelValue.replyUsers[0],
                                      ) +
                                      "  ",
                                    9,
                                    _hoisted_6$4,
                                  ),
                                  vue.createElementVNode(
                                    "span",
                                    _hoisted_7$4,
                                    "#" +
                                      vue.toDisplayString(
                                        $props.modelValue.replyFloor,
                                      ),
                                    1,
                                  ),
                                  _cache[9] ||
                                    (_cache[9] = vue.createElementVNode(
                                      "i",
                                      {
                                        class:
                                          "fa fa-question-circle-o wrong-icon",
                                        "aria-hidden": "true",
                                      },
                                      null,
                                      -1,
                                    )),
                                ],
                              ),
                              $data.expandWrong
                                ? (vue.openBlock(),
                                  vue.createElementBlock("div", _hoisted_8$4, [
                                    ...(_cache[10] ||
                                      (_cache[10] = [
                                        vue.createTextVNode(
                                          " 这条回复似乎有点问题，指定的楼层号与@的人对应不上 ",
                                          -1,
                                        ),
                                        vue.createElementVNode(
                                          "br",
                                          null,
                                          null,
                                          -1,
                                        ),
                                        vue.createTextVNode(
                                          " 原因可能有下面几种： ",
                                          -1,
                                        ),
                                        vue.createElementVNode(
                                          "br",
                                          null,
                                          null,
                                          -1,
                                        ),
                                        vue.createTextVNode(
                                          " 一、屏蔽用户导致楼层塌陷：你屏蔽了A，自A以后的回复的楼层号都会减1 ",
                                          -1,
                                        ),
                                        vue.createElementVNode(
                                          "br",
                                          null,
                                          null,
                                          -1,
                                        ),
                                        vue.createTextVNode(
                                          " 二、忽略回复导致楼层塌陷：原理同上 ",
                                          -1,
                                        ),
                                        vue.createElementVNode(
                                          "br",
                                          null,
                                          null,
                                          -1,
                                        ),
                                        vue.createTextVNode(
                                          " 三、层主回复时指定错了楼层号（同一，层主屏蔽了别人，导致楼层塌陷） ",
                                          -1,
                                        ),
                                        vue.createElementVNode(
                                          "br",
                                          null,
                                          null,
                                          -1,
                                        ),
                                        vue.createTextVNode(
                                          " 四、脚本解析错误。",
                                          -1,
                                        ),
                                      ])),
                                  ]))
                                : vue.createCommentVNode("", true),
                            ]))
                          : vue.createCommentVNode("", true),
                        $props.type === "top" && $props.modelValue.parent
                          ? (vue.openBlock(),
                            vue.createElementBlock(
                              "div",
                              {
                                key: "top-parent",
                                class: "top-reply-parent-context",
                                title:
                                  "点击跳转至原回复楼层 #" +
                                  $props.modelValue.parent.floor,
                                onClick:
                                  _cache[25] ||
                                  (_cache[25] = vue.withModifiers(
                                    ($event) =>
                                      $options.jumpFloor(
                                        $props.modelValue.parent.floor,
                                      ),
                                    ["stop"],
                                  )),
                              },
                              [
                                vue.createElementVNode(
                                  "span",
                                  { class: "jump-tag" },
                                  "回复 #" +
                                    vue.toDisplayString(
                                      $props.modelValue.parent.floor,
                                    ) +
                                    " @" +
                                    vue.toDisplayString(
                                      $props.modelValue.parent.username,
                                    ) +
                                    "：",
                                  1,
                                ),
                                vue.createElementVNode(
                                  "span",
                                  { class: "jump-text" },
                                  vue.toDisplayString(
                                    $props.modelValue.parent.text,
                                  ),
                                  1,
                                ),
                              ],
                            ))
                          : vue.createCommentVNode("", true),
                        [
                          $options.CommentDisplayType.Like,
                          $options.CommentDisplayType.FloorInFloorNoCallUser,
                        ].includes($options.config.commentDisplayType) &&
                        $props.type !== "top"
                          ? (vue.openBlock(),
                            vue.createBlock(
                              _component_BaseHtmlRender,
                              {
                                key: 1,
                                class: "reply_content",
                                html: $props.modelValue
                                  .hideCallUserReplyContent,
                              },
                              null,
                              8,
                              ["html"],
                            ))
                          : (vue.openBlock(),
                            vue.createBlock(
                              _component_BaseHtmlRender,
                              {
                                key: 2,
                                class: "reply_content",
                                html: $props.modelValue.reply_content,
                              },
                              null,
                              8,
                              ["html"],
                            )),
                        $data.edit
                          ? (vue.openBlock(),
                            vue.createBlock(
                              _component_PostEditor,
                              {
                                key: 3,
                                onClose:
                                  _cache[6] ||
                                  (_cache[6] = ($event) =>
                                    ($data.edit = false)),
                                replyInfo: $data.replyInfo,
                                replyUser: $props.modelValue.username,
                                replyFloor: $props.modelValue.floor,
                              },
                              null,
                              8,
                              ["replyInfo", "replyUser", "replyFloor"],
                            ))
                          : vue.createCommentVNode("", true),
                        $props.type === "top" && $props.modelValue.replyCount
                          ? (vue.openBlock(),
                            vue.createElementBlock(
                              "div",
                              {
                                key: 4,
                                class: "reply-count",
                                onClick:
                                  _cache[7] ||
                                  (_cache[7] = ($event) =>
                                    ($data.expandTopReply =
                                      !$data.expandTopReply)),
                              },
                              [
                                _cache[11] ||
                                  (_cache[11] = vue.createElementVNode(
                                    "div",
                                    { class: "gang" },
                                    null,
                                    -1,
                                  )),
                                vue.createElementVNode(
                                  "span",
                                  null,
                                  " 共有" +
                                    vue.toDisplayString(
                                      $props.modelValue.replyCount,
                                    ) +
                                    " 条回复 ",
                                  1,
                                ),
                                $data.expandTopReply
                                  ? (vue.openBlock(),
                                    vue.createBlock(_component_Icon, {
                                      key: 0,
                                      icon: "ep:arrow-up-bold",
                                    }))
                                  : (vue.openBlock(),
                                    vue.createBlock(_component_Icon, {
                                      key: 1,
                                      icon: "ep:arrow-down-bold",
                                    })),
                              ],
                            ))
                          : vue.createCommentVNode("", true),
                      ]),
                      vue.createElementVNode("div", _hoisted_9$4, [
                        $props.type === "top"
                          ? (vue.openBlock(),
                            vue.createElementBlock(
                              vue.Fragment,
                              { key: 0 },
                              [
                                $data.expandTopReply &&
                                $props.modelValue.replyCount
                                  ? (vue.openBlock(),
                                    vue.createElementBlock(
                                      "div",
                                      _hoisted_10$4,
                                      [
                                        (vue.openBlock(true),
                                        vue.createElementBlock(
                                          vue.Fragment,
                                          null,
                                          vue.renderList(
                                            $props.modelValue.children,
                                            (item, index) => {
                                              return (
                                                vue.openBlock(),
                                                vue.createBlock(
                                                  _component_TopSubComment,
                                                  {
                                                    level: 1,
                                                    modelValue:
                                                      $props.modelValue
                                                        .children[index],
                                                    "onUpdate:modelValue": (
                                                      $event,
                                                    ) =>
                                                      ($props.modelValue.children[
                                                        index
                                                      ] = $event),
                                                    key: index,
                                                  },
                                                  null,
                                                  8,
                                                  [
                                                    "modelValue",
                                                    "onUpdate:modelValue",
                                                  ],
                                                )
                                              );
                                            },
                                          ),
                                          128,
                                        )),
                                      ],
                                    ))
                                  : vue.createCommentVNode("", true),
                              ],
                              64,
                            ))
                          : (vue.openBlock(true),
                            vue.createElementBlock(
                              vue.Fragment,
                              { key: 1 },
                              vue.renderList(
                                $props.modelValue.children,
                                (item, index) => {
                                  return (
                                    vue.openBlock(),
                                    vue.createBlock(
                                      _component_Comment,
                                      {
                                        modelValue:
                                          $props.modelValue.children[index],
                                        "onUpdate:modelValue": ($event) =>
                                          ($props.modelValue.children[index] =
                                            $event),
                                        key: index,
                                      },
                                      null,
                                      8,
                                      ["modelValue", "onUpdate:modelValue"],
                                    )
                                  );
                                },
                              ),
                              128,
                            )),
                      ]),
                    ]),
                  ]),
                  $data.cssStyle
                    ? (vue.openBlock(),
                      vue.createElementBlock(
                        "div",
                        {
                          key: 1,
                          class: "more ago",
                          onClick:
                            _cache[8] ||
                            (_cache[8] = ($event) =>
                              ($data.expand = !$data.expand)),
                        },
                        " 由于嵌套回复层级太深，自动将以上回复移至可见范围 ",
                      ))
                    : vue.createCommentVNode("", true),
                ],
                4,
              ))
            : vue.createCommentVNode("", true),
        ],
        10,
        _hoisted_1$9,
      )
    );
  }
  const Comment = /* @__PURE__ */ _export_sfc(_sfc_main$9, [
    ["render", _sfc_render$4],
    ["__scopeId", "data-v-984ba483"],
  ]);
  const _sfc_main$8 = {
    name: "Toolbar",
    components: { Icon, BaseLoading },
    inject: ["isLogin", "post", "pageType"],
    data() {
      return {
        timer: null,
        loading: false,
        loading2: false,
        loading3: false,
      };
    },
    methods: {
      checkIsLogin(emitName = "") {
        if (!this.isLogin) {
          eventBus.emit(CMD.SHOW_MSG, { type: "warning", text: "请先登录！" });
          return false;
        }
        this.$emit(emitName);
        return true;
      },
      tweet() {
        var _a;
        let username =
          ((_a = window.user) == null ? void 0 : _a.username) ?? "";
        let url2 = `https://twitter.com/intent/tweet?url=${location.origin}/t/${this.post.id}?r=${username}&related=v2ex&text=${this.post.title}`;
        window.open(url2, "_blank", "width=550,height=370");
      },
      async report() {
        if (!this.checkIsLogin()) return;
        if (this.loading3) return;
        let isReport = this.post.isReport;
        if (isReport) {
          eventBus.emit(CMD.SHOW_MSG, {
            type: "success",
            text: "你已对本主题进行了报告",
          });
          return;
        }
        let url2 = `${location.origin}/report/topic/${this.post.id}?once=${this.post.once}`;
        this.loading3 = true;
        let apiRes = await fetch(url2);
        this.loading3 = false;
        if (apiRes.redirected) {
          let htmlText = await apiRes.text();
          if (
            htmlText.includes("你已对本主题进行了报告") ||
            htmlText.includes("already reported")
          ) {
            eventBus.emit(CMD.SHOW_MSG, {
              type: "success",
              text: "你已对本主题进行了报告",
            });
            eventBus.emit(CMD.REFRESH_ONCE, htmlText);
            eventBus.emit(CMD.MERGE, { isReport: !isReport });
            return;
          }
        }
        eventBus.emit(CMD.REFRESH_ONCE);
        eventBus.emit(CMD.SHOW_MSG, {
          type: "error",
          text: "操作失败，请重试",
        });
      },
      async toggleIgnore() {
        if (!this.checkIsLogin()) return;
        let url2 = `${location.origin}/${this.post.isIgnore ? "unignore" : "ignore"}/topic/${this.post.id}?once=${this.post.once}`;
        if (this.pageType === PageType.Post) {
          this.loading2 = true;
          let apiRes = await fetch(url2);
          if (apiRes.redirected) {
            if (!this.post.isIgnore) {
              window.location = location.origin;
            }
            eventBus.emit(CMD.SHOW_MSG, {
              type: "success",
              text: this.post.isIgnore ? "取消成功" : "忽略成功",
            });
            eventBus.emit(CMD.MERGE, { isIgnore: !this.post.isIgnore });
          } else {
            eventBus.emit(CMD.SHOW_MSG, { type: "warning", text: "忽略失败" });
          }
          this.loading2 = false;
        } else {
          if (this.post.isIgnore) {
            this.loading2 = true;
          } else {
            eventBus.emit(CMD.IGNORE);
          }
          let apiRes = await fetch(url2);
          if (apiRes.redirected) {
            if (this.post.isIgnore) {
              eventBus.emit(CMD.REFRESH_ONCE);
            }
            eventBus.emit(CMD.SHOW_MSG, {
              type: "success",
              text: this.post.isIgnore ? "取消成功" : "忽略成功",
            });
            eventBus.emit(CMD.MERGE, { isIgnore: !this.post.isIgnore });
          } else {
            eventBus.emit(CMD.SHOW_MSG, {
              type: "warning",
              text: "忽略成功,仅本次有效（接口调用失败！）",
            });
          }
          this.loading2 = false;
        }
      },
      async toggleFavorite() {
        if (!this.checkIsLogin()) return;
        if (this.loading) return;
        let isFavorite = this.post.isFavorite;
        if (!isFavorite && config.collectBrowserNotice) {
          eventBus.emit(CMD.SHOW_MSG, {
            type: "success",
            text: "别忘记按Command/Cmd/CTRL + D添加到书签哦",
          });
        }
        let url2 = `${location.origin}/${isFavorite ? "unfavorite" : "favorite"}/topic/${this.post.id}?once=${this.post.once}`;
        this.loading = true;
        let apiRes = await fetch(url2);
        this.loading = false;
        if (apiRes.redirected) {
          let htmlText = await apiRes.text();
          let targetText = isFavorite ? "加入收藏" : "取消收藏";
          let targetTextEn = isFavorite ? "Favorite" : "Unfavorite";
          if (
            htmlText.includes(targetText) ||
            htmlText.includes(targetTextEn)
          ) {
            eventBus.emit(CMD.SHOW_MSG, {
              type: "success",
              text: isFavorite ? "取消成功" : "收藏成功",
            });
            eventBus.emit(CMD.MERGE, {
              collectCount: isFavorite
                ? this.post.collectCount - 1
                : this.post.collectCount + 1,
            });
            eventBus.emit(CMD.REFRESH_ONCE, htmlText);
            eventBus.emit(CMD.MERGE, { isFavorite: !isFavorite });
            return;
          }
        }
        eventBus.emit(CMD.REFRESH_ONCE);
        eventBus.emit(CMD.SHOW_MSG, { type: "error", text: "操作失败" });
      },
    },
  };
  const _hoisted_1$8 = { class: "toolbar" };
  const _hoisted_2$5 = {
    key: 0,
    class: "tool no-hover",
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_Icon = vue.resolveComponent("Icon");
    const _component_BaseLoading = vue.resolveComponent("BaseLoading");
    return (
      vue.openBlock(),
      vue.createElementBlock("div", _hoisted_1$8, [
        vue.renderSlot(_ctx.$slots, "default", {}, void 0, true),
        vue.createElementVNode(
          "div",
          {
            class: "tool",
            onClick:
              _cache[0] ||
              (_cache[0] = vue.withModifiers(
                ($event) => $options.checkIsLogin("reply"),
                ["stop"],
              )),
          },
          [
            vue.createVNode(_component_Icon, { icon: "mynaui:message" }),
            _cache[5] ||
              (_cache[5] = vue.createElementVNode("span", null, "回复", -1)),
          ],
        ),
        vue.createElementVNode(
          "div",
          {
            class: vue.normalizeClass(["tool", { disabled: $data.loading }]),
            onClick:
              _cache[1] ||
              (_cache[1] = vue.withModifiers(
                (...args) =>
                  $options.toggleFavorite && $options.toggleFavorite(...args),
                ["stop"],
              )),
          },
          [
            $data.loading
              ? (vue.openBlock(),
                vue.createBlock(_component_BaseLoading, {
                  key: 0,
                  size: "small",
                }))
              : (vue.openBlock(),
                vue.createElementBlock(
                  vue.Fragment,
                  { key: 1 },
                  [
                    $options.post.isFavorite
                      ? (vue.openBlock(),
                        vue.createBlock(_component_Icon, {
                          key: 0,
                          color: "rgb(224,42,42)",
                          icon: "iconoir:star-solid",
                        }))
                      : (vue.openBlock(),
                        vue.createBlock(_component_Icon, {
                          key: 1,
                          icon: "iconoir:star",
                        })),
                  ],
                  64,
                )),
            vue.createElementVNode(
              "span",
              null,
              vue.toDisplayString($options.post.isFavorite ? "取消" : "") +
                "收藏",
              1,
            ),
          ],
          2,
        ),
        $options.post.collectCount !== 0
          ? (vue.openBlock(),
            vue.createElementBlock("div", _hoisted_2$5, [
              vue.createElementVNode(
                "span",
                null,
                vue.toDisplayString($options.post.collectCount + "人收藏"),
                1,
              ),
            ]))
          : vue.createCommentVNode("", true),
        vue.createElementVNode(
          "div",
          {
            class: "tool",
            onClick:
              _cache[2] ||
              (_cache[2] = vue.withModifiers(
                (...args) => $options.tweet && $options.tweet(...args),
                ["stop"],
              )),
          },
          [
            vue.createVNode(_component_Icon, { icon: "uil:share" }),
            _cache[6] ||
              (_cache[6] = vue.createElementVNode("span", null, "Tweet", -1)),
          ],
        ),
        vue.createElementVNode(
          "div",
          {
            class: vue.normalizeClass(["tool", { disabled: $data.loading2 }]),
            onClick:
              _cache[3] ||
              (_cache[3] = vue.withModifiers(
                (...args) =>
                  $options.toggleIgnore && $options.toggleIgnore(...args),
                ["stop"],
              )),
          },
          [
            $data.loading2
              ? (vue.openBlock(),
                vue.createBlock(_component_BaseLoading, {
                  key: 0,
                  size: "small",
                }))
              : (vue.openBlock(),
                vue.createBlock(_component_Icon, {
                  key: 1,
                  icon: "fluent:eye-hide-24-regular",
                })),
            vue.createElementVNode(
              "span",
              null,
              vue.toDisplayString($options.post.isIgnore ? "取消忽略" : "忽略"),
              1,
            ),
          ],
          2,
        ),
        vue.createElementVNode(
          "div",
          {
            class: vue.normalizeClass(["tool", { disabled: $data.loading3 }]),
            onClick:
              _cache[4] ||
              (_cache[4] = vue.withModifiers(
                (...args) => $options.report && $options.report(...args),
                ["stop"],
              )),
          },
          [
            $data.loading3
              ? (vue.openBlock(),
                vue.createBlock(_component_BaseLoading, {
                  key: 0,
                  size: "small",
                }))
              : (vue.openBlock(),
                vue.createBlock(_component_Icon, {
                  key: 1,
                  class: "black",
                  icon: "solar:danger-triangle-outline",
                })),
            vue.createElementVNode(
              "span",
              null,
              vue.toDisplayString(
                $options.post.isReport ? "你已对本主题进行了报告" : "报告",
              ),
              1,
            ),
          ],
          2,
        ),
      ])
    );
  }
  const Toolbar = /* @__PURE__ */ _export_sfc(_sfc_main$8, [
    ["render", _sfc_render$3],
    ["__scopeId", "data-v-30dac564"],
  ]);
  const _hoisted_1$7 = ["href"];
  const _hoisted_2$4 = ["src"];
  const _hoisted_3$4 = { class: "texts" };
  const _hoisted_4$4 = {
    key: 0,
    class: "point",
  };
  const _hoisted_5$3 = { class: "link-num" };
  const _hoisted_6$3 = { class: "my-tag" };
  const _hoisted_7$3 = {
    key: 2,
    class: "ago",
  };
  const _hoisted_8$3 = {
    key: 3,
    class: "mod",
  };
  const _hoisted_9$3 = {
    key: 4,
    class: "owner",
  };
  const _hoisted_10$3 = ["href"];
  const _hoisted_11$3 = {
    key: 5,
    class: "owner",
  };
  const _hoisted_12$2 = {
    key: 6,
    class: "mod",
  };
  const _hoisted_13$2 = {
    key: 7,
    class: "ago",
  };
  const _hoisted_14$2 = { class: "my-tag" };
  const _hoisted_15$2 = {
    key: 9,
    class: "point",
  };
  const _hoisted_16$2 = { class: "link-num" };
  const _hoisted_17$1 = ["href"];
  const _hoisted_18$1 = ["src"];
  const _hoisted_19$1 = { class: "Author-right" };
  const _hoisted_20$1 = { class: "floor" };
  const _sfc_main$7 = {
    __name: "SingleComment",
    props: {
      comment: {
        reply_content: "",
      },
      isRight: {
        type: Boolean,
        default() {
          return false;
        },
      },
    },
    setup(__props) {
      const config2 = vue.inject("config");
      const isLogin = vue.inject("isLogin");
      const tags = vue.inject("tags");
      const props = __props;
      const myTags = vue.computed(() => {
        return tags[props.comment.username] ?? [];
      });
      function jump() {
        eventBus.emit(CMD.JUMP, props.comment.floor);
      }
      return (_ctx, _cache) => {
        return (
          vue.openBlock(),
          vue.createElementBlock(
            "div",
            {
              class: vue.normalizeClass([
                "comment",
                { isSimple: vue.unref(config2).viewType === "simple" },
              ]),
              ref: "comment",
            },
            [
              !__props.isRight
                ? (vue.openBlock(),
                  vue.createElementBlock(
                    "a",
                    {
                      key: 0,
                      class: "avatar",
                      href: `/member/${__props.comment.username}`,
                    },
                    [
                      vue.createElementVNode(
                        "img",
                        {
                          src: __props.comment.avatar,
                          alt: "",
                        },
                        null,
                        8,
                        _hoisted_2$4,
                      ),
                    ],
                    8,
                    _hoisted_1$7,
                  ))
                : vue.createCommentVNode("", true),
              vue.createElementVNode(
                "div",
                {
                  class: vue.normalizeClass([
                    "comment-body",
                    { isRight: __props.isRight },
                  ]),
                },
                [
                  vue.createElementVNode("div", _hoisted_3$4, [
                    __props.comment.thankCount && __props.isRight
                      ? (vue.openBlock(),
                        vue.createElementBlock("div", _hoisted_4$4, [
                          __props.comment.isThanked
                            ? (vue.openBlock(),
                              vue.createBlock(vue.unref(Icon), {
                                key: 0,
                                color: "rgb(224,42,42)",
                                icon: "icon-park-solid:like",
                              }))
                            : (vue.openBlock(),
                              vue.createBlock(
                                vue.unref(Icon),
                                {
                                  key: 1,
                                  color: !__props.comment.thankCount
                                    ? null
                                    : "rgb(224,42,42)",
                                  icon: "icon-park-outline:like",
                                },
                                null,
                                8,
                                ["color"],
                              )),
                          vue.createElementVNode(
                            "div",
                            _hoisted_5$3,
                            vue.toDisplayString(__props.comment.thankCount),
                            1,
                          ),
                        ]))
                      : vue.createCommentVNode("", true),
                    vue.unref(config2).openTag &&
                    __props.isRight
                      ? (vue.openBlock(true),
                        vue.createElementBlock(
                          vue.Fragment,
                          { key: 1 },
                          vue.renderList(myTags.value, (i) => {
                            return (
                              vue.openBlock(),
                              vue.createElementBlock("span", _hoisted_6$3, [
                                _cache[0] ||
                                  (_cache[0] = vue.createElementVNode(
                                    "i",
                                    { class: "fa fa-tag" },
                                    null,
                                    -1,
                                  )),
                                vue.createElementVNode(
                                  "span",
                                  null,
                                  vue.toDisplayString(i),
                                  1,
                                ),
                              ])
                            );
                          }),
                          256,
                        ))
                      : vue.createCommentVNode("", true),
                    __props.isRight
                      ? (vue.openBlock(),
                        vue.createElementBlock(
                          "span",
                          _hoisted_7$3,
                          vue.toDisplayString(__props.comment.date),
                          1,
                        ))
                      : vue.createCommentVNode("", true),
                    __props.comment.isMod && __props.isRight
                      ? (vue.openBlock(),
                        vue.createElementBlock("div", _hoisted_8$3, "MOD"))
                      : vue.createCommentVNode("", true),
                    __props.comment.isOp && __props.isRight
                      ? (vue.openBlock(),
                        vue.createElementBlock("div", _hoisted_9$3, "OP"))
                      : vue.createCommentVNode("", true),
                    vue.createElementVNode(
                      "a",
                      {
                        href: `/member/${__props.comment.username}`,
                        class: "username",
                      },
                      vue.toDisplayString(__props.comment.username),
                      9,
                      _hoisted_10$3,
                    ),
                    __props.comment.isOp && !__props.isRight
                      ? (vue.openBlock(),
                        vue.createElementBlock("div", _hoisted_11$3, "OP"))
                      : vue.createCommentVNode("", true),
                    __props.comment.isMod && !__props.isRight
                      ? (vue.openBlock(),
                        vue.createElementBlock("div", _hoisted_12$2, "MOD"))
                      : vue.createCommentVNode("", true),
                    !__props.isRight
                      ? (vue.openBlock(),
                        vue.createElementBlock(
                          "span",
                          _hoisted_13$2,
                          vue.toDisplayString(__props.comment.date),
                          1,
                        ))
                      : vue.createCommentVNode("", true),
                    vue.unref(isLogin) &&
                    vue.unref(config2).openTag &&
                    !__props.isRight
                      ? (vue.openBlock(true),
                        vue.createElementBlock(
                          vue.Fragment,
                          { key: 8 },
                          vue.renderList(myTags.value, (i) => {
                            return (
                              vue.openBlock(),
                              vue.createElementBlock("span", _hoisted_14$2, [
                                _cache[1] ||
                                  (_cache[1] = vue.createElementVNode(
                                    "i",
                                    { class: "fa fa-tag" },
                                    null,
                                    -1,
                                  )),
                                vue.createElementVNode(
                                  "span",
                                  null,
                                  vue.toDisplayString(i),
                                  1,
                                ),
                              ])
                            );
                          }),
                          256,
                        ))
                      : vue.createCommentVNode("", true),
                    __props.comment.thankCount && !__props.isRight
                      ? (vue.openBlock(),
                        vue.createElementBlock("div", _hoisted_15$2, [
                          __props.comment.isThanked
                            ? (vue.openBlock(),
                              vue.createBlock(vue.unref(Icon), {
                                key: 0,
                                color: "rgb(224,42,42)",
                                icon: "icon-park-solid:like",
                              }))
                            : (vue.openBlock(),
                              vue.createBlock(
                                vue.unref(Icon),
                                {
                                  key: 1,
                                  color: !__props.comment.thankCount
                                    ? null
                                    : "rgb(224,42,42)",
                                  icon: "icon-park-outline:like",
                                },
                                null,
                                8,
                                ["color"],
                              )),
                          vue.createElementVNode(
                            "div",
                            _hoisted_16$2,
                            vue.toDisplayString(__props.comment.thankCount),
                            1,
                          ),
                        ]))
                      : vue.createCommentVNode("", true),
                  ]),
                  vue.createVNode(
                    BaseHtmlRender,
                    {
                      class: "reply_content",
                      html: __props.comment.reply_content,
                    },
                    null,
                    8,
                    ["html"],
                  ),
                ],
                2,
              ),
              __props.isRight
                ? (vue.openBlock(),
                  vue.createElementBlock(
                    "a",
                    {
                      key: 1,
                      class: "avatar",
                      href: `/member/${__props.comment.username}`,
                    },
                    [
                      vue.createElementVNode(
                        "img",
                        {
                          src: __props.comment.avatar,
                          alt: "",
                        },
                        null,
                        8,
                        _hoisted_18$1,
                      ),
                    ],
                    8,
                    _hoisted_17$1,
                  ))
                : vue.createCommentVNode("", true),
              vue.createElementVNode("div", _hoisted_19$1, [
                vue.createElementVNode(
                  "div",
                  _hoisted_20$1,
                  vue.toDisplayString(__props.comment.floor),
                  1,
                ),
                vue.createElementVNode(
                  "div",
                  {
                    class: "tool jump",
                    onClick: vue.withModifiers(jump, ["stop"]),
                  },
                  [
                    ...(_cache[2] ||
                      (_cache[2] = [
                        vue.createElementVNode("span", null, "跳转", -1),
                      ])),
                  ],
                ),
              ]),
            ],
            2,
          )
        );
      };
    },
  };
  const SingleComment = /* @__PURE__ */ _export_sfc(_sfc_main$7, [
    ["__scopeId", "data-v-4a063111"],
  ]);
  function _css(el, key, value) {
    const reg = /^-?\d+.?\d*(px|pt|em|rem|vw|vh|%|rpx|ms)$/i;
    if (value === void 0) {
      let val = null;
      if ("getComputedStyle" in window) {
        val = window.getComputedStyle(el, null)[key];
      } else {
        val = el.currentStyle[key];
      }
      return reg.test(val) ? parseFloat(val) : val;
    } else {
      if (
        [
          "top",
          "left",
          "bottom",
          "right",
          "width",
          "height",
          "font-size",
          "margin",
          "padding",
        ].includes(key)
      ) {
        if (!reg.test(value)) {
          if (!String(value).includes("calc")) {
            value += "px";
          }
        }
      }
      if (key === "transform") {
        el.style.webkitTransform =
          el.style.MsTransform =
          el.style.msTransform =
          el.style.MozTransform =
          el.style.OTransform =
          el.style.transform =
            value;
      } else {
        el.style[key] = value;
      }
    }
  }
  function getImgSize(naturalWidth, naturalHeight, maxWidth, maxHeight) {
    const imgRatio = naturalWidth / naturalHeight;
    const maxRatio = maxWidth / maxHeight;
    let width, height;
    if (imgRatio >= maxRatio) {
      if (naturalWidth > maxWidth) {
        width = maxWidth;
        height = (maxWidth / naturalWidth) * naturalHeight;
      } else {
        width = naturalWidth;
        height = naturalHeight;
      }
    } else {
      if (naturalHeight > maxHeight) {
        width = (maxHeight / naturalHeight) * naturalWidth;
        height = maxHeight;
      } else {
        width = naturalWidth;
        height = naturalHeight;
      }
    }
    if (height === 0) {
      height = maxHeight;
      width = height * 1.3;
    } else {
      if (height < 24) {
        height = 50;
        width = height * imgRatio;
      } else if (height < 100) {
        height = 300;
        width = height * imgRatio;
      } else {
        height = maxHeight;
        width = height * imgRatio;
      }
      if (width > maxWidth) {
        width = maxWidth;
        height = width / imgRatio;
      }
    }

    return { width, height };
  }
  const _sfc_main$6 = {
    name: "detail",
    components: {
      BaseSelect,
      BaseButton,
      SingleComment,
      PopConfirm,
      Comment,
      PostEditor,
      Point,
      Toolbar,
      BaseHtmlRender,
      Tooltip,
      BaseLoading,
      Icon,
    },
    inject: [
      "allReplyUsers",
      "post",
      "tags",
      "isLogin",
      "config",
      "pageType",
      "isNight",
    ],
    provide() {
      return {
        postDetailWidth: vue.computed(() => this.postDetailWidth),
      };
    },
    props: {
      modelValue: {
        type: Boolean,
        default() {
          return false;
        },
      },
      loading: {
        type: Boolean,
        default() {
          return false;
        },
      },
      refreshLoading: {
        type: Boolean,
        default() {
          return false;
        },
      },
      displayType: CommentDisplayType.FloorInFloorNoCallUser,
    },
    data() {
      return {
        isSticky: false,
        selectCallIndex: 0,
        postDetailWidth: 0,
        showCallList: false,
        showRelationReply: false,
        replyText: "",
        callStyle: {
          top: 0,
          left: 0,
        },
        targetUser: {
          left: [],
          right: "",
          rightFloor: -1,
        },
        currentFloor: "",
        showOpTag: false,
        rect: {},
        result: {},
        x: 0,
        y: 0,
        scale: 1,
        minScale: 0.2,
        maxScale: 16,
        preview: {
          rect: {},
          result: {},
          x: 0,
          y: 0,
          scale: 1,
          minScale: 0.2,
          maxScale: 16,
        },
      };
    },
    computed: {
      functions() {
        return functions;
      },
      //wow区和东京区的css要特定
      isSpecificArea() {
        if ([PageType.Node, PageType.Post].includes(this.pageType)) {
          if (["东京", "World of Warcraft"].includes(this.post.node.title)) {
            return true;
          }
        }
        return false;
      },
      canAppend() {
        if (this.isMy) {
          let create = new Date(this.post.createDate);
          return Date.now() - create.valueOf() > 1e3 * 60 * 30;
        }
        return false;
      },
      canEditMove() {
        if (this.isMy) {
          let create = new Date(this.post.createDate);
          return Date.now() - create.valueOf() < 1e3 * 60 * 10;
        }
        return false;
      },
      isMy() {
        return this.post.member.username === window.user.username;
      },
      myTags() {
        return this.tags[this.post.member.username] ?? [];
      },
      CommentDisplayType() {
        return CommentDisplayType;
      },
      isPost() {
        return this.pageType === PageType.Post;
      },
      filterCallList() {
        if (this.showCallList) {
          let list = ["管理员", "所有人"].concat(this.allReplyUsers);
          if (this.replyText)
            return list.filter((i) => i.search(this.replyText) > -1);
          return list;
        }
        return [];
      },
      replyList() {
        if (
          [
            CommentDisplayType.FloorInFloor,
            CommentDisplayType.FloorInFloorNoCallUser,
          ].includes(this.displayType)
        )
          return this.post.nestedReplies;
        if (this.displayType === CommentDisplayType.Like) {
          // 递归获取整棵讨论分支中的最大赞数（避免神级子回复被埋没）
          const getBranchMaxThanks = (item) => {
            // 排序使用 createList 时的快照（sortThanks），感谢数实时增减不触发重排
            let max = (item.sortThanks ?? item.thankCount) || 0;
            if (item.children && item.children.length) {
              for (let i = 0; i < item.children.length; i++) {
                let childMax = getBranchMaxThanks(item.children[i]);
                if (childMax > max) max = childMax;
              }
            }
            return max;
          };
          // 递归获取整棵讨论分支的总获赞数
          const getBranchTotalThanks = (item) => {
            let total = (item.sortThanks ?? item.thankCount) || 0;
            if (item.children && item.children.length) {
              for (let i = 0; i < item.children.length; i++) {
                total += getBranchTotalThanks(item.children[i]);
              }
            }
            return total;
          };
          // 性能优化：使用浅拷贝替代深克隆，显著减少内存和耗时
          return [...(this.post.nestedReplies || [])].sort((a, b) => {
            let maxDiff = getBranchMaxThanks(b) - getBranchMaxThanks(a);
            if (maxDiff !== 0) return maxDiff;
            let totalDiff = getBranchTotalThanks(b) - getBranchTotalThanks(a);
            if (totalDiff !== 0) return totalDiff;
            return a.floor - b.floor;
          });
        }
        if (this.displayType === CommentDisplayType.New) {
          return [...(this.post.replyList || [])].reverse();
        }
        if (this.displayType === CommentDisplayType.V2exOrigin)
          return this.post.replyList;
        if (this.displayType === CommentDisplayType.FloorInFloorNested)
          return this.post.nestedRedundReplies;
        if (this.displayType === CommentDisplayType.OnlyOp)
          return this.post.replyList.filter((v) => {
            var _a;
            return (
              v.username ===
              ((_a = this.post.member) == null ? void 0 : _a.username)
            );
          });
        return [];
      },
      //关联回复
      relationReply() {
        if (this.targetUser.left.length && this.targetUser.right) {
          return this.post.replyList.filter((v) => {
            if (
              this.targetUser.left
                .concat(this.targetUser.right)
                .includes(v.username)
            ) {
              if (v.floor > this.targetUser.rightFloor) {
                if (v.replyUsers.includes(this.targetUser.right)) {
                  return true;
                }
                if (v.username === this.targetUser.right) {
                  for (let i = 0; i < this.targetUser.left.length; i++) {
                    if (v.replyUsers.includes(this.targetUser.left[i])) {
                      return true;
                    }
                  }
                }
              } else {
                return true;
              }
            }
            return false;
          });
        }
        return [];
      },
    },
    watch: {
      "post.id"(n2, o) {
        if (this.$refs["post-editor"]) {
          this.$refs["post-editor"].content = "";
          vue.nextTick(() => {
            var _a, _b;
            (_b = (_a = this.$refs) == null ? void 0 : _a.detail) == null
              ? void 0
              : _b.scrollTo({ top: 0 });
          });
        }
      },
      "post.headerTemplate"(n2, o) {
        let mountEl = document.querySelector(
          ".main-wrapper .post-wrapper .html-wrapper .header",
        );
        if (mountEl) {
          this.showOpTag = true;
        }
      },
      modelValue: {
        handler(newVal) {
          if (this.isPost) return;
          if (newVal) {
            this.currentFloor = "";
            vue.nextTick(() => {
              var _a, _b;
              (_b = (_a = this.$refs) == null ? void 0 : _a.main) == null
                ? void 0
                : _b.focus();
            });
          } else {
            this.isSticky = false;
            this.showRelationReply = false;
          }
        },
      },
    },
    mounted() {
      vue.nextTick(() => {
        setTimeout(() => {
          var _a;
          this.postDetailWidth =
            ((_a = this.$refs.mainWrapper) == null
              ? void 0
              : _a.getBoundingClientRect().width) || 0;
        }, 500);
      });
      if (this.isLogin) {
        this.stickyObserver = new IntersectionObserver(
          ([e2]) =>
            e2.target.toggleAttribute("stuck", e2.intersectionRatio < 1),
          { threshold: [1] },
        );
        if (this.$refs.replyBox) {
          this.stickyObserver.observe(this.$refs.replyBox);
        }
        window.addEventListener("keydown", this.onKeyDown);
      }
      eventBus.on(CMD.SHOW_CALL, (val) => {
        if (val.show) {
          this.showCallList = true;
          this.replyText = val.text;
          if (this.isPost) {
            this.callStyle.top = val.top + $(window).scrollTop() + -40 + "px";
          } else {
            this.callStyle.top =
              val.top + $(".post-detail").scrollTop() + 15 + "px";
          }
          this.callStyle.left =
            val.left - $(".main")[0].getBoundingClientRect().left + 10 + "px";
          if (this.selectCallIndex >= this.filterCallList.length) {
            this.selectCallIndex = 0;
          }
        } else {
          this.replyText = "";
          this.showCallList = false;
          this.selectCallIndex = 0;
        }
      });
      eventBus.on(CMD.RELATION_REPLY, (val) => {
        this.targetUser = val;
        this.showRelationReply = true;
      });
      eventBus.on(CMD.JUMP, this.jump);
    },
    beforeUnmount() {
      if (this.stickyObserver) {
        this.stickyObserver.disconnect();
        this.stickyObserver = null;
      }
      window.removeEventListener("keydown", this.onKeyDown);
      eventBus.off(CMD.SHOW_CALL);
      eventBus.off(CMD.RELATION_REPLY);
      eventBus.off(CMD.JUMP);
    },
    methods: {
      addTag() {
        eventBus.emit(CMD.ADD_TAG, this.post.member.username);
      },
      removeTag(tag) {
        eventBus.emit(CMD.REMOVE_TAG, {
          username: this.post.member.username,
          tag,
        });
      },
      closePreviewModal() {
        let previewModal = document.querySelector(".preview-modal");
        let s = document.querySelector(".shadow");
        let domRect = this.preview.rect;
        _css(s, "transition", "all 0.3s");
        _css(s, "width", domRect.width);
        _css(s, "height", domRect.height);
        _css(
          s,
          "transform",
          `translate3d(${domRect.x}px, ${domRect.y}px, 0) scale(1)`,
        );
        let mask = document.querySelector(".preview-modal .mask");
        _css(mask, "opacity", 0);
        setTimeout(() => {
          _css(s, "transition", "all 0s");
          s.remove();
          _css(previewModal, "top", "-1000vh");
          _css(document.body, "overflow", "auto");
        }, 300);
      },
      stop(e2) {
        e2.stopPropagation();
        e2.stopImmediatePropagation();
        if (e2.target.tagName === "IMG") {
          this.preview = {
            rect: {},
            result: {},
            x: 0,
            y: 0,
            scale: 1,
            minScale: 0.2,
            maxScale: 16,
          };
          e2.preventDefault();
          let domRect = e2.target.getBoundingClientRect();
          let previewModal = document.querySelector(".preview-modal");
          _css(previewModal, "top", "0");
          let s = e2.target.cloneNode();
          s.classList.add("shadow");
          previewModal.append(s);
          _css(s, "transition", "all 0s");
          _css(s, "width", domRect.width);
          _css(s, "height", domRect.height);
          _css(
            s,
            "transform",
            `translate3d(${domRect.x}px, ${domRect.y}px, 0) scale(1)`,
          );
          let t = ".3";
          let sw = domRect.width / window.innerWidth;
          let sh = domRect.height / window.innerHeight;
          domRect.sw = sw;
          domRect.sh = sh;
          this.preview.rect = domRect;
          this.preview.result = getImgSize(
            s.naturalWidth,
            s.naturalHeight,
            window.innerWidth * 0.95,
            window.innerHeight * 0.9,
          );
          this.preview.x =
            (window.innerWidth - this.preview.result.width) * 0.5;
          this.preview.y =
            (window.innerHeight - this.preview.result.height) * 0.5;
          let isPointerdown = false;
          let isMove = false;
          let lastPointermove = { x: 0, y: 0 };
          let diff = { x: 0, y: 0 };
          s.addEventListener("pointerdown", function (e3) {
            isPointerdown = true;
            isMove = false;
            s.setPointerCapture(e3.pointerId);
            lastPointermove = { x: e3.clientX, y: e3.clientY };
          });
          s.addEventListener("pointermove", (e3) => {
            if (isPointerdown) {
              isMove = true;
              const current = { x: e3.clientX, y: e3.clientY };
              diff.x = current.x - lastPointermove.x;
              diff.y = current.y - lastPointermove.y;
              lastPointermove = { x: current.x, y: current.y };
              this.preview.x += diff.x;
              this.preview.y += diff.y;
              _css(s, "transition", "all 0.1s");
              _css(
                s,
                "transform",
                `translate3d(${this.preview.x}px, ${this.preview.y}px, 0) scale(${this.preview.scale})`,
              );
            }
            e3.preventDefault();
          });
          s.addEventListener("pointerup", () => {
            if (isPointerdown) {
              isPointerdown = false;
              if (!isMove) {
                this.closePreviewModal();
              }
            }
          });
          s.addEventListener("pointercancel", function (e3) {
            if (isPointerdown) {
              isPointerdown = false;
            }
          });
          let mask = document.querySelector(".preview-modal .mask");
          _css(mask, "transition", "all 0s");
          _css(mask, "opacity", 0);
          setTimeout(() => {
            _css(s, "transition", `all ${t}s`);
            _css(mask, "transition", `all ${t}s`);
            _css(mask, "opacity", 1);
            _css(
              s,
              "transform",
              `translate3d(${this.preview.x}px, ${this.preview.y}px, 0) scale(${this.preview.scale})`,
            );
            _css(s, "width", this.preview.result.width);
            _css(s, "height", this.preview.result.height);
          }, 0);
          setTimeout(() => {
            _css(document.body, "overflow", "hidden");
          }, 300);
          return false;
        }
      },
      wheel(e2) {
        let d2 = e2.deltaY < 0 ? 0.1 : -0.1;
        let ratio = 1 + d2;
        let _scale = this.preview.scale * ratio;
        if (_scale > this.preview.maxScale) {
          ratio = this.preview.maxScale / this.preview.scale;
          this.preview.scale = this.preview.maxScale;
        } else if (_scale < this.preview.minScale) {
          ratio = this.preview.minScale / this.preview.scale;
          this.preview.scale = this.preview.minScale;
        } else {
          this.preview.scale = _scale;
        }
        if (e2.target.tagName === "IMG") {
          const origin = {
            x: (d2 * this.preview.result.width) / 2,
            y: (d2 * this.preview.result.height) / 2,
          };
          this.preview.x -= d2 * (e2.clientX - this.preview.x) - origin.x;
          this.preview.y -= d2 * (e2.clientY - this.preview.y) - origin.y;
        }
        let s = document.querySelector(".shadow");
        _css(s, "transition", "all 0.2s");
        _css(
          s,
          "transform",
          `translate3d(${this.preview.x}px, ${this.preview.y}px, 0) scale(${this.preview.scale})`,
        );
        e2.preventDefault();
      },
      jump(floor) {
        if (!this.post.replyList.length || !this.replyList.length) {
          eventBus.emit(CMD.SHOW_MSG, {
            type: "warning",
            text: "没有回复可跳转！",
          });
          this.currentFloor = "";
          return;
        }
        let lastItem = this.replyList[this.replyList.length - 1];
        if (floor === "") {
          floor = lastItem.floor;
        } else {
          try {
            floor = Number(floor);
          } catch (e2) {
            floor = lastItem.floor;
          }
          if (floor === 0) {
            floor = 1;
          }
          if (floor > lastItem.floor) floor = lastItem.floor;
        }
        if (floor > this.post.replyList.length) {
          eventBus.emit(CMD.SHOW_MSG, {
            type: "error",
            text: "没有找到对应回复！",
          });
          this.currentFloor = "";
          return;
        }
        let comment = $(`.c_${floor}`);
        if (!comment.length) {
          eventBus.emit(CMD.SHOW_MSG, {
            type: "error",
            text: "没有找到对应回复！",
          });
          this.currentFloor = "";
          return;
        }
        comment[0].scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
        comment.addClass("ding");
        this.currentFloor = "";
        setTimeout(() => {
          comment.removeClass("ding");
        }, 2e3);
      },
      collapseTopReplyList() {
        $(this.$refs.topReply).slideToggle("fast");
      },
      goBottom() {
        this.currentFloor = "";
        this.isSticky = false;
        setTimeout(() => {
          if (this.isPost) {
            let body = $("body , html");
            let scrollHeight = body.prop("scrollHeight");
            body.animate({ scrollTop: scrollHeight - 850 }, 300);
          } else {
            this.$refs.detail.scrollTo({
              top: this.$refs.detail.scrollHeight,
              behavior: "smooth",
            });
          }
        });
      },
      close(from) {
        if (this.isPost) return;
        if (from === "space") {
          if (this.config.closePostDetailBySpace) {
            this.$emit("update:modelValue", false);
          }
        } else {
          this.$emit("update:modelValue", false);
        }
      },
      setCall(e2) {
        eventBus.emit(CMD.SET_CALL, e2);
        this.showCallList = false;
      },
      onKeyDown(e2) {
        if (!this.modelValue) return;
        if (!this.showCallList) return;
        let length = this.filterCallList.slice(0, 10).length;
        if (e2.keyCode === 13) {
          this.setCall(this.filterCallList[this.selectCallIndex]);
          e2.preventDefault();
        }
        if (e2.keyCode === 38) {
          this.selectCallIndex--;
          if (this.selectCallIndex < 0) {
            this.selectCallIndex = length - 1;
          }
          e2.preventDefault();
        }
        if (e2.keyCode === 40) {
          this.selectCallIndex++;
          if (this.selectCallIndex > length - 1) {
            this.selectCallIndex = 0;
          }
          e2.preventDefault();
        }
      },
      changeOption(item) {
        this.$emit("update:displayType", item);
      },
      addThank() {
        eventBus.emit(CMD.CHANGE_POST_THANK, { id: this.post.id, type: "add" });
      },
      recallThank() {
        eventBus.emit(CMD.CHANGE_POST_THANK, {
          id: this.post.id,
          type: "recall",
        });
      },
      scrollTop() {
        this.currentFloor = "";
        if (this.isPost) {
          $("body , html").animate({ scrollTop: 0 }, 300);
        } else {
          this.$refs.detail.scrollTo({ top: 0, behavior: "smooth" });
        }
      },
    },
  };
  const _hoisted_1$6 = { class: "my-box post-wrapper" };
  const _hoisted_2$3 = { class: "header" };
  const _hoisted_3$3 = { class: "fr" };
  const _hoisted_4$3 = ["href"];
  const _hoisted_5$2 = ["src", "alt"];
  const _hoisted_6$2 = ["href"];
  const _hoisted_7$2 = ["id"];
  const _hoisted_8$2 = ["onclick"];
  const _hoisted_9$2 = ["onclick"];
  const _hoisted_10$2 = { class: "gray" };
  const _hoisted_11$2 = ["href"];
  const _hoisted_12$1 = ["title"];
  const _hoisted_13$1 = ["href"];
  const _hoisted_14$1 = ["href"];
  const _hoisted_15$1 = ["href"];
  const _hoisted_16$1 = ["href"];
  const _hoisted_17 = { class: "my-tag" };
  const _hoisted_18 = ["onClick"];
  const _hoisted_19 = {
    key: 0,
    class: "my-box",
  };
  const _hoisted_20 = { class: "top-reply" };
  const _hoisted_21 = { class: "tool" };
  const _hoisted_22 = { ref: "topReply" };
  const _hoisted_23 = { class: "my-box comment-wrapper" };
  const _hoisted_24 = {
    key: 0,
    class: "my-cell flex",
  };
  const _hoisted_25 = { key: 0 };
  const _hoisted_26 = ["innerHTML"];
  const _hoisted_27 = {
    key: 0,
    class: "loading-wrapper",
  };
  const _hoisted_28 = {
    key: 1,
    class: "comments",
  };
  const _hoisted_29 = {
    key: 1,
    id: "no-comments-yet",
  };
  const _hoisted_30 = { class: "my-cell flex" };
  const _hoisted_31 = { class: "notice-right gray" };
  const _hoisted_32 = { class: "p1" };
  const _hoisted_33 = { class: "top-reply" };
  const _hoisted_34 = ["onClick"];
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_BaseHtmlRender = vue.resolveComponent("BaseHtmlRender");
    const _component_Point = vue.resolveComponent("Point");
    const _component_Toolbar = vue.resolveComponent("Toolbar");
    const _component_Icon = vue.resolveComponent("Icon");
    const _component_Tooltip = vue.resolveComponent("Tooltip");
    const _component_Comment = vue.resolveComponent("Comment");
    const _component_BaseSelect = vue.resolveComponent("BaseSelect");
    const _component_BaseLoading = vue.resolveComponent("BaseLoading");
    const _component_PostEditor = vue.resolveComponent("PostEditor");
    const _component_SingleComment = vue.resolveComponent("SingleComment");
    return vue.withDirectives(
      (vue.openBlock(),
      vue.createElementBlock(
        "div",
        {
          class: vue.normalizeClass([
            "post-detail",
            [$options.isNight ? "isNight" : "", $options.pageType],
          ]),
          ref: "detail",
          onKeydown:
            _cache[22] ||
            (_cache[22] = vue.withKeys(($event) => $options.close(), ["esc"])),
          onClick:
            _cache[23] || (_cache[23] = ($event) => $options.close("space")),
        },
        [
          vue.createElementVNode(
            "div",
            {
              ref: "main",
              class: vue.normalizeClass([
                "main",
                $options.isSpecificArea ? "specific-area" : "",
              ]),
              tabindex: "1",
              onClick:
                _cache[19] ||
                (_cache[19] = (...args) =>
                  $options.stop && $options.stop(...args)),
            },
            [
              vue.createElementVNode(
                "div",
                {
                  class: "main-wrapper",
                  ref: "mainWrapper",
                  style: vue.normalizeStyle({
                    width: $options.config.postWidth + "!important",
                  }),
                },
                [
                  vue.createElementVNode("div", _hoisted_1$6, [
                    vue.createElementVNode("div", _hoisted_2$3, [
                      vue.createElementVNode("div", _hoisted_3$3, [
                        vue.createElementVNode(
                          "a",
                          {
                            href: `/member/${$options.post.member.username}`,
                            style: {
                              width: "73px",
                              height: "73px",
                              display: "inline-block",
                            },
                          },
                          [
                            $options.post.member.avatar_large
                              ? (vue.openBlock(),
                                vue.createElementBlock(
                                  "img",
                                  {
                                    key: 0,
                                    src: $options.post.member.avatar_large,
                                    class: "avatar",
                                    style: { width: "73px", height: "73px" },
                                    border: "0",
                                    align: "default",
                                    alt: $options.post.member.username,
                                  },
                                  null,
                                  8,
                                  _hoisted_5$2,
                                ))
                              : vue.createCommentVNode("", true),
                          ],
                          8,
                          _hoisted_4$3,
                        ),
                      ]),
                      _cache[35] ||
                        (_cache[35] = vue.createElementVNode(
                          "a",
                          { href: "/" },
                          "V2EX",
                          -1,
                        )),
                      _cache[36] ||
                        (_cache[36] = vue.createElementVNode(
                          "span",
                          { class: "chevron" },
                          "  ›  ",
                          -1,
                        )),
                      vue.createElementVNode(
                        "a",
                        {
                          href: $options.post.node.url,
                        },
                        vue.toDisplayString($options.post.node.title),
                        9,
                        _hoisted_6$2,
                      ),
                      _cache[37] ||
                        (_cache[37] = vue.createElementVNode(
                          "div",
                          { class: "sep10" },
                          null,
                          -1,
                        )),
                      vue.createElementVNode(
                        "h1",
                        null,
                        vue.toDisplayString($options.post.title),
                        1,
                      ),
                      vue.createElementVNode(
                        "div",
                        {
                          id: `topic_${$options.post.id}_votes`,
                          class: "votes",
                        },
                        [
                          vue.createElementVNode(
                            "a",
                            {
                              href: "javascript:",
                              onclick: `upVoteTopic(${$options.post.id});`,
                              class: "vote",
                            },
                            [
                              ...(_cache[24] ||
                                (_cache[24] = [
                                  vue.createElementVNode(
                                    "li",
                                    { class: "fa fa-chevron-up" },
                                    null,
                                    -1,
                                  ),
                                  vue.createTextVNode("   ", -1),
                                ])),
                            ],
                            8,
                            _hoisted_8$2,
                          ),
                          _cache[26] ||
                            (_cache[26] = vue.createTextVNode("   ", -1)),
                          vue.createElementVNode(
                            "a",
                            {
                              href: "javascript:",
                              onclick: `downVoteTopic(${$options.post.id});`,
                              class: "vote",
                            },
                            [
                              ...(_cache[25] ||
                                (_cache[25] = [
                                  vue.createElementVNode(
                                    "li",
                                    { class: "fa fa-chevron-down" },
                                    null,
                                    -1,
                                  ),
                                ])),
                            ],
                            8,
                            _hoisted_9$2,
                          ),
                        ],
                        8,
                        _hoisted_7$2,
                      ),
                      _cache[38] ||
                        (_cache[38] = vue.createTextVNode("   ", -1)),
                      vue.createElementVNode("small", _hoisted_10$2, [
                        vue.createElementVNode(
                          "a",
                          {
                            href: `/member/${$options.post.member.username}`,
                          },
                          vue.toDisplayString($options.post.member.username),
                          9,
                          _hoisted_11$2,
                        ),
                        _cache[33] ||
                          (_cache[33] = vue.createTextVNode(" · ", -1)),
                        $options.post.member.createDate
                          ? (vue.openBlock(),
                            vue.createElementBlock(
                              vue.Fragment,
                              { key: 0 },
                              [
                                vue.createElementVNode(
                                  "span",
                                  {
                                    class: vue.normalizeClass(
                                      $options.post.member.isNew && "danger",
                                    ),
                                  },
                                  vue.toDisplayString(
                                    $options.post.member.createDate,
                                  ),
                                  3,
                                ),
                                _cache[27] ||
                                  (_cache[27] = vue.createTextVNode(" · ", -1)),
                              ],
                              64,
                            ))
                          : vue.createCommentVNode("", true),
                        $options.post.createDateAgo
                          ? (vue.openBlock(),
                            vue.createElementBlock(
                              vue.Fragment,
                              { key: 1 },
                              [
                                vue.createElementVNode(
                                  "span",
                                  {
                                    title: $options.post.createDate,
                                  },
                                  vue.toDisplayString(
                                    $options.post.createDateAgo,
                                  ),
                                  9,
                                  _hoisted_12$1,
                                ),
                                _cache[28] ||
                                  (_cache[28] = vue.createTextVNode(" · ", -1)),
                              ],
                              64,
                            ))
                          : vue.createCommentVNode("", true),
                        vue.createTextVNode(
                          " " +
                            vue.toDisplayString($options.post.clickCount) +
                            " 次点击 ",
                          1,
                        ),
                        $options.isMy
                          ? (vue.openBlock(),
                            vue.createElementBlock(
                              vue.Fragment,
                              { key: 2 },
                              [
                                _cache[31] ||
                                  (_cache[31] = vue.createTextVNode("   ", -1)),
                                vue.createElementVNode(
                                  "a",
                                  {
                                    href: `/t/${$options.post.id}/info`,
                                  },
                                  [
                                    ...(_cache[29] ||
                                      (_cache[29] = [
                                        vue.createElementVNode(
                                          "li",
                                          { class: "fa fa-info-circle" },
                                          null,
                                          -1,
                                        ),
                                      ])),
                                  ],
                                  8,
                                  _hoisted_13$1,
                                ),
                                _cache[32] ||
                                  (_cache[32] = vue.createTextVNode("   ", -1)),
                                $options.canAppend
                                  ? (vue.openBlock(),
                                    vue.createElementBlock(
                                      "a",
                                      {
                                        key: 0,
                                        href: `/append/topic/${$options.post.id}`,
                                        class: "op",
                                      },
                                      "APPEND",
                                      8,
                                      _hoisted_14$1,
                                    ))
                                  : vue.createCommentVNode("", true),
                                $options.canEditMove
                                  ? (vue.openBlock(),
                                    vue.createElementBlock(
                                      vue.Fragment,
                                      { key: 1 },
                                      [
                                        vue.createElementVNode(
                                          "a",
                                          {
                                            href: `/move/topic/${$options.post.id}`,
                                            class: "op",
                                          },
                                          "MOVE",
                                          8,
                                          _hoisted_15$1,
                                        ),
                                        _cache[30] ||
                                          (_cache[30] = vue.createTextVNode(
                                            "  ",
                                            -1,
                                          )),
                                        vue.createElementVNode(
                                          "a",
                                          {
                                            href: `/edit/topic/${$options.post.id}`,
                                            class: "op",
                                          },
                                          "EDIT",
                                          8,
                                          _hoisted_16$1,
                                        ),
                                      ],
                                      64,
                                    ))
                                  : vue.createCommentVNode("", true),
                              ],
                              64,
                            ))
                          : vue.createCommentVNode("", true),
                      ]),
                      $options.config.openTag
                        ? (vue.openBlock(),
                          vue.createElementBlock(
                            vue.Fragment,
                            { key: 0 },
                            [
                              (vue.openBlock(true),
                              vue.createElementBlock(
                                vue.Fragment,
                                null,
                                vue.renderList($options.myTags, (i) => {
                                  return (
                                    vue.openBlock(),
                                    vue.createElementBlock(
                                      "span",
                                      _hoisted_17,
                                      [
                                        _cache[34] ||
                                          (_cache[34] = vue.createElementVNode(
                                            "i",
                                            { class: "fa fa-tag" },
                                            null,
                                            -1,
                                          )),
                                        vue.createElementVNode(
                                          "span",
                                          null,
                                          vue.toDisplayString(i),
                                          1,
                                        ),
                                        vue.createElementVNode(
                                          "i",
                                          {
                                            class: "fa fa-trash-o remove",
                                            onClick: vue.withModifiers(
                                              ($event) => $options.removeTag(i),
                                              ["stop"],
                                            ),
                                          },
                                          null,
                                          8,
                                          _hoisted_18,
                                        ),
                                      ],
                                    )
                                  );
                                }),
                                256,
                              )),
                              vue.createElementVNode(
                                "span",
                                {
                                  class: "add-tag ago",
                                  onClick:
                                    _cache[0] ||
                                    (_cache[0] = vue.withModifiers(
                                      (...args) =>
                                        $options.addTag &&
                                        $options.addTag(...args),
                                      ["stop"],
                                    )),
                                  title: "添加标签",
                                },
                                "+",
                              ),
                            ],
                            64,
                          ))
                        : vue.createCommentVNode("", true),
                    ]),
                    $options.post.headerTemplate
                      ? (vue.openBlock(),
                        vue.createBlock(
                          _component_BaseHtmlRender,
                          {
                            key: 0,
                            html: $options.post.headerTemplate,
                          },
                          null,
                          8,
                          ["html"],
                        ))
                      : (vue.openBlock(),
                        vue.createBlock(
                          _component_BaseHtmlRender,
                          {
                            key: 1,
                            html: $options.post.jsonContent,
                          },
                          null,
                          8,
                          ["html"],
                        )),
                    vue.createVNode(
                      _component_Toolbar,
                      {
                        onReply:
                          _cache[1] ||
                          (_cache[1] = ($event) =>
                            ($data.isSticky = !$data.isSticky)),
                      },
                      {
                        default: vue.withCtx(() => [
                          vue.createVNode(
                            _component_Point,
                            {
                              onAddThank: $options.addThank,
                              onRecallThank: $options.recallThank,
                              item: {
                                isThanked: $options.post.isThanked,
                                thankCount: $options.post.thankCount,
                                username: $options.post.username,
                              },
                              "api-url": "topic/" + $options.post.id,
                            },
                            null,
                            8,
                            ["onAddThank", "onRecallThank", "item", "api-url"],
                          ),
                        ]),
                        _: 1,
                      },
                    ),
                  ]),
                  $options.post.topReplyList.length &&
                  $options.config.showTopReply
                    ? (vue.openBlock(),
                      vue.createElementBlock("div", _hoisted_19, [
                        vue.createElementVNode(
                          "div",
                          {
                            class: "my-cell flex",
                            onClick:
                              _cache[2] ||
                              (_cache[2] = vue.withModifiers(
                                (...args) =>
                                  $options.collapseTopReplyList &&
                                  $options.collapseTopReplyList(...args),
                                ["stop"],
                              )),
                          },
                          [
                            _cache[39] ||
                              (_cache[39] = vue.createElementVNode(
                                "span",
                                null,
                                "高赞回复",
                                -1,
                              )),
                            vue.createElementVNode("div", _hoisted_20, [
                              vue.createVNode(
                                _component_Tooltip,
                                { title: "收起高赞回复" },
                                {
                                  default: vue.withCtx(() => [
                                    vue.createElementVNode("div", _hoisted_21, [
                                      vue.createVNode(_component_Icon, {
                                        icon: "gravity-ui:chevrons-collapse-vertical",
                                      }),
                                    ]),
                                  ]),
                                  _: 1,
                                },
                              ),
                            ]),
                          ],
                        ),
                        vue.createElementVNode(
                          "div",
                          _hoisted_22,
                          [
                            (vue.openBlock(true),
                            vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList(
                                $options.post.topReplyList,
                                (item, index) => {
                                  return (
                                    vue.openBlock(),
                                    vue.createBlock(
                                      _component_Comment,
                                      {
                                        key: item.floor,
                                        type: "top",
                                        modelValue:
                                          $options.post.topReplyList[index],
                                        "onUpdate:modelValue": ($event) =>
                                          ($options.post.topReplyList[index] =
                                            $event),
                                      },
                                      null,
                                      8,
                                      ["modelValue", "onUpdate:modelValue"],
                                    )
                                  );
                                },
                              ),
                              128,
                            )),
                          ],
                          512,
                        ),
                      ]))
                    : vue.createCommentVNode("", true),
                  vue.createElementVNode("div", _hoisted_23, [
                    $options.post.replyList.length || $props.loading
                      ? (vue.openBlock(),
                        vue.createElementBlock("div", _hoisted_24, [
                          vue.createElementVNode("div", null, [
                            vue.createTextVNode(
                              vue.toDisplayString($options.post.replyCount) +
                                " 条回复 ",
                              1,
                            ),
                            $options.post.lastReplyDate
                              ? (vue.openBlock(),
                                vue.createElementBlock("span", _hoisted_25, [
                                  _cache[40] ||
                                    (_cache[40] = vue.createTextVNode(
                                      "  ",
                                      -1,
                                    )),
                                  _cache[41] ||
                                    (_cache[41] = vue.createElementVNode(
                                      "strong",
                                      { class: "snow" },
                                      "•",
                                      -1,
                                    )),
                                  vue.createTextVNode(
                                    "  " +
                                      vue.toDisplayString(
                                        $options.post.lastReplyDate,
                                      ),
                                    1,
                                  ),
                                ]))
                              : vue.createCommentVNode("", true),
                          ]),
                          $options.config.showToolbar
                            ? (vue.openBlock(),
                              vue.createBlock(
                                _component_BaseSelect,
                                {
                                  key: 0,
                                  "display-type": $props.displayType,
                                  "onUpdate:displayType":
                                    _cache[3] ||
                                    (_cache[3] = (e2) =>
                                      _ctx.$emit("update:displayType", e2)),
                                },
                                null,
                                8,
                                ["display-type"],
                              ))
                            : (vue.openBlock(),
                              vue.createElementBlock(
                                "div",
                                {
                                  key: 1,
                                  class: "fr",
                                  innerHTML: $options.post.fr,
                                },
                                null,
                                8,
                                _hoisted_26,
                              )),
                        ]))
                      : vue.createCommentVNode("", true),
                    $options.replyList.length || $props.loading
                      ? (vue.openBlock(),
                        vue.createElementBlock(
                          vue.Fragment,
                          { key: 1 },
                          [
                            $props.loading
                              ? (vue.openBlock(),
                                vue.createElementBlock("div", _hoisted_27, [
                                  vue.createVNode(_component_BaseLoading, {
                                    size: "large",
                                  }),
                                ]))
                              : (vue.openBlock(),
                                vue.createElementBlock("div", _hoisted_28, [
                                  $props.modelValue
                                    ? (vue.openBlock(true),
                                      vue.createElementBlock(
                                        vue.Fragment,
                                        { key: 0 },
                                        vue.renderList(
                                          $options.replyList,
                                          (item, index) => {
                                            return (
                                              vue.openBlock(),
                                              vue.createBlock(
                                                _component_Comment,
                                                {
                                                  key: item.floor,
                                                  modelValue:
                                                    $options.replyList[index],
                                                  "onUpdate:modelValue": (
                                                    $event,
                                                  ) =>
                                                    ($options.replyList[index] =
                                                      $event),
                                                },
                                                null,
                                                8,
                                                [
                                                  "modelValue",
                                                  "onUpdate:modelValue",
                                                ],
                                              )
                                            );
                                          },
                                        ),
                                        128,
                                      ))
                                    : vue.createCommentVNode("", true),
                                ])),
                          ],
                          64,
                        ))
                      : vue.createCommentVNode("", true),
                  ]),
                  !($options.replyList.length || $props.loading)
                    ? (vue.openBlock(),
                      vue.createElementBlock(
                        "div",
                        _hoisted_29,
                        "目前尚无回复",
                      ))
                    : vue.createCommentVNode("", true),
                  $options.isLogin
                    ? (vue.openBlock(),
                      vue.createElementBlock(
                        "div",
                        {
                          key: 2,
                          class: vue.normalizeClass([
                            "my-box",
                            { sticky: $data.isSticky },
                          ]),
                          ref: "replyBox",
                        },
                        [
                          vue.createElementVNode("div", _hoisted_30, [
                            _cache[42] ||
                              (_cache[42] = vue.createElementVNode(
                                "span",
                                null,
                                "添加一条新回复",
                                -1,
                              )),
                            vue.createElementVNode("div", _hoisted_31, [
                              $data.isSticky
                                ? (vue.openBlock(),
                                  vue.createElementBlock(
                                    "a",
                                    {
                                      key: 0,
                                      style: { "margin-right": "2rem" },
                                      onClick:
                                        _cache[4] ||
                                        (_cache[4] = vue.withModifiers(
                                          ($event) => ($data.isSticky = false),
                                          ["stop"],
                                        )),
                                    },
                                    "取消回复框停靠",
                                  ))
                                : vue.createCommentVNode("", true),
                              vue.createElementVNode(
                                "a",
                                {
                                  onClick:
                                    _cache[5] ||
                                    (_cache[5] = vue.withModifiers(
                                      (...args) =>
                                        $options.scrollTop &&
                                        $options.scrollTop(...args),
                                      ["stop"],
                                    )),
                                },
                                "回到顶部",
                              ),
                            ]),
                          ]),
                          vue.createElementVNode("div", _hoisted_32, [
                            vue.createVNode(
                              _component_PostEditor,
                              {
                                onClose: $options.goBottom,
                                ref: "post-editor",
                                useType: "reply-post",
                                onClick:
                                  _cache[6] ||
                                  (_cache[6] = vue.withModifiers(
                                    ($event) => ($data.isSticky = true),
                                    ["stop"],
                                  )),
                              },
                              null,
                              8,
                              ["onClose"],
                            ),
                          ]),
                        ],
                        2,
                      ))
                    : vue.createCommentVNode("", true),
                ],
                4,
              ),
              $data.showRelationReply
                ? (vue.openBlock(),
                  vue.createElementBlock(
                    "div",
                    {
                      key: 0,
                      class: "relationReply",
                      onClick:
                        _cache[10] ||
                        (_cache[10] = vue.withModifiers(
                          ($event) => $options.close("space"),
                          ["stop"],
                        )),
                    },
                    [
                      vue.createElementVNode(
                        "div",
                        {
                          class: "my-cell flex",
                          onClick:
                            _cache[8] ||
                            (_cache[8] = vue.withModifiers(
                              (...args) =>
                                $options.stop && $options.stop(...args),
                              ["stop"],
                            )),
                        },
                        [
                          _cache[43] ||
                            (_cache[43] = vue.createElementVNode(
                              "span",
                              { class: "gray" },
                              "上下文",
                              -1,
                            )),
                          vue.createElementVNode("div", _hoisted_33, [
                            vue.createVNode(_component_Icon, {
                              icon: "ic:round-close",
                              onClick:
                                _cache[7] ||
                                (_cache[7] = vue.withModifiers(
                                  ($event) => ($data.showRelationReply = false),
                                  ["stop"],
                                )),
                            }),
                          ]),
                        ],
                      ),
                      vue.createElementVNode(
                        "div",
                        {
                          class: "comments",
                          onClick:
                            _cache[9] ||
                            (_cache[9] = vue.withModifiers(
                              (...args) =>
                                $options.stop && $options.stop(...args),
                              ["stop"],
                            )),
                        },
                        [
                          (vue.openBlock(true),
                          vue.createElementBlock(
                            vue.Fragment,
                            null,
                            vue.renderList(
                              $options.relationReply,
                              (item, index) => {
                                return (
                                  vue.openBlock(),
                                  vue.createBlock(
                                    _component_SingleComment,
                                    {
                                      "is-right":
                                        item.username ===
                                        $data.targetUser.right,
                                      key: item.floor,
                                      comment: item,
                                    },
                                    null,
                                    8,
                                    ["is-right", "comment"],
                                  )
                                );
                              },
                            ),
                            128,
                          )),
                        ],
                      ),
                    ],
                  ))
                : vue.createCommentVNode("", true),
              $data.showCallList && $options.filterCallList.length
                ? (vue.openBlock(),
                  vue.createElementBlock(
                    "div",
                    {
                      key: 1,
                      class: "call-list",
                      style: vue.normalizeStyle($data.callStyle),
                    },
                    [
                      (vue.openBlock(true),
                      vue.createElementBlock(
                        vue.Fragment,
                        null,
                        vue.renderList(
                          $options.filterCallList,
                          (item, index) => {
                            return (
                              vue.openBlock(),
                              vue.createElementBlock(
                                "div",
                                {
                                  class: vue.normalizeClass([
                                    "call-item",
                                    { select: index === $data.selectCallIndex },
                                  ]),
                                  onClick: vue.withModifiers(
                                    ($event) => $options.setCall(item),
                                    ["stop"],
                                  ),
                                },
                                [
                                  vue.createElementVNode(
                                    "a",
                                    null,
                                    vue.toDisplayString(item),
                                    1,
                                  ),
                                ],
                                10,
                                _hoisted_34,
                              )
                            );
                          },
                        ),
                        256,
                      )),
                    ],
                    4,
                  ))
                : vue.createCommentVNode("", true),
              vue.createElementVNode(
                "div",
                {
                  class: "post-detail-top-actions",
                },
                [
                  vue.createElementVNode(
                    "div",
                    {
                      class: "top-action-btn open-new-tab",
                      title: "在新标签页打开",
                      onClick:
                        _cache[12] ||
                        (_cache[12] = vue.withModifiers(
                          ($event) =>
                            $options.functions.openNewTab(
                              location.origin + "/t/" + $options.post.id,
                              $options.config.newTabOpenActive,
                            ),
                          ["stop"],
                        )),
                    },
                    [
                      vue.createVNode(_component_Icon, {
                        icon: "majesticons:open",
                      }),
                    ],
                  ),
                  vue.createElementVNode(
                    "div",
                    {
                      class: "top-action-btn close-btn",
                      title: "关闭详情 (Esc)",
                      onClick:
                        _cache[11] ||
                        (_cache[11] = vue.withModifiers(
                          ($event) => $options.close("btn"),
                          ["stop"],
                        )),
                    },
                    [
                      vue.createVNode(_component_Icon, {
                        icon: "icon-park-outline:close",
                      }),
                    ],
                  ),
                ],
              ),
              vue.createElementVNode(
                "div",
                {
                  class: "post-detail-floating-dock",
                  onClick: vue.withModifiers(
                    (...args) => $options.stop && $options.stop(...args),
                    ["stop"],
                  ),
                },
                [
                  vue.createElementVNode(
                    "div",
                    {
                      class: "dock-btn refresh",
                      title: "刷新回复",
                      onClick:
                        _cache[13] ||
                        (_cache[13] = vue.withModifiers(
                          ($event) => {
                            if ($props.refreshLoading) return;
                            _ctx.$emit("refresh");
                          },
                          ["stop"],
                        )),
                    },
                    [
                      $props.refreshLoading
                        ? (vue.openBlock(),
                          vue.createBlock(_component_BaseLoading, { key: 0 }))
                        : (vue.openBlock(),
                          vue.createBlock(_component_Icon, {
                            key: 1,
                            icon: "material-symbols:refresh",
                          })),
                    ],
                  ),
                  vue.createElementVNode(
                    "div",
                    {
                      class: "dock-btn v2pro-scroll-top",
                      title: "回到顶部",
                      onClick:
                        _cache[18] ||
                        (_cache[18] = vue.withModifiers(
                          (...args) => {
                            $data.currentFloor = "";
                            $options.scrollTop && $options.scrollTop(...args);
                          },
                          ["stop"],
                        )),
                    },
                    [
                      vue.createVNode(_component_Icon, {
                        icon: "lucide:move-up",
                      }),
                    ],
                  ),
                  vue.createElementVNode(
                    "div",
                    {
                      class: "dock-btn scroll-to",
                      title: "跳到底部 (悬停可输入楼层直达)",
                      onClick:
                        _cache[17] ||
                        (_cache[17] = vue.withModifiers(
                          ($event) => {
                            $data.currentFloor = "";
                            $options.jump("");
                          },
                          ["stop"],
                        )),
                    },
                    [
                      vue.createVNode(_component_Icon, {
                        icon: "lucide:move-down",
                      }),
                      vue.withDirectives(
                        vue.createElementVNode(
                          "input",
                          {
                            type: "text",
                            placeholder: "楼层",
                            title: "输入楼层回车直达",
                            "onUpdate:modelValue":
                              _cache[14] ||
                              (_cache[14] = ($event) =>
                                ($data.currentFloor = $event)),
                            onClick:
                              _cache[15] ||
                              (_cache[15] = vue.withModifiers(
                                (...args) =>
                                  $options.stop && $options.stop(...args),
                                ["stop"],
                              )),
                            onMousedown: vue.withModifiers(
                              (...args) =>
                                $options.stop && $options.stop(...args),
                              ["stop"],
                            ),
                            onKeydown:
                              _cache[16] ||
                              (_cache[16] = vue.withKeys(
                                ($event) => {
                                  $options.jump($data.currentFloor);
                                  $event.target.blur();
                                },
                                ["enter"],
                              )),
                          },
                          null,
                          544,
                        ),
                        [[vue.vModelText, $data.currentFloor]],
                      ),
                    ],
                  ),
                  vue.createElementVNode(
                    "div",
                    {
                      class: "dock-btn dock-close",
                      title: $options.isPost
                        ? "回到首页"
                        : "回到首页 / 关闭详情 (Esc)",
                      onClick: vue.withModifiers(
                        ($event) =>
                          $options.isPost
                            ? (window.location.href = "/")
                            : $options.close("btn"),
                        ["stop"],
                      ),
                    },
                    [
                      vue.createVNode(_component_Icon, {
                        icon: "iconamoon:home-light",
                      }),
                    ],
                  ),
                ],
              ),
            ],
            2,
          ),
          (vue.openBlock(),
          vue.createBlock(vue.Teleport, { to: "body" }, [
            vue.createElementVNode(
              "div",
              {
                class: "preview-modal",
                onWheel:
                  _cache[21] ||
                  (_cache[21] = (...args) =>
                    $options.wheel && $options.wheel(...args)),
              },
              [
                vue.createElementVNode("div", {
                  class: "mask",
                  onClick:
                    _cache[20] ||
                    (_cache[20] = (...args) =>
                      $options.closePreviewModal &&
                      $options.closePreviewModal(...args)),
                }),
                vue.createVNode(
                  _component_Icon,
                  {
                    class: "close",
                    icon: "fontisto:close-a",
                    onClick: $options.closePreviewModal,
                  },
                  null,
                  8,
                  ["onClick"],
                ),
              ],
              32,
            ),
          ])),
        ],
        34,
      )),
      [[vue.vShow, $props.modelValue]],
    );
  }
  const PostDetail = /* @__PURE__ */ _export_sfc(_sfc_main$6, [
    ["render", _sfc_render$2],
    ["__scopeId", "data-v-d39217d8"],
  ]);
  const _hoisted_1$5 = { key: 1 };
  const _sfc_main$5 = {
    __name: "Base64Tooltip",
    setup(__props) {
      const tooltip = vue.ref(null);
      const show = vue.ref(false);
      const originalText = vue.ref("");
      const decodeText = vue.ref("");
      const styleObject = vue.reactive({
        left: "-100vw",
        top: "-100vh",
      });
      const onShowTooltip = ({ text, e: e2 }) => {
        setTimeout(() => (show.value = true));
        originalText.value = text;
        decodeText.value = "";
        styleObject.left = e2.clientX + "px";
        styleObject.top = e2.clientY + 20 + "px";
      };
      const onWinClick = (e2) => {
        if (!tooltip.value) return;
        if (!tooltip.value.contains(e2.target) && show.value) {
          show.value = false;
        }
      };
      const fn = () => show.value && (show.value = false);
      vue.onMounted(() => {
        eventBus.on(CMD.SHOW_TOOLTIP, onShowTooltip);
        window.addEventListener("click", onWinClick, { capture: true });
        $(".post-detail", document).on("scroll", fn);
      });
      vue.onBeforeUnmount(() => {
        eventBus.off(CMD.SHOW_TOOLTIP, onShowTooltip);
        window.removeEventListener("click", onWinClick, { capture: true });
        $(".post-detail", document).off("scroll", fn);
      });
      function copy() {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(decodeText.value)
            .then(() => {
              eventBus.emit(CMD.SHOW_MSG, {
                type: "success",
                text: "复制成功",
              });
            })
            .catch(() => {
              eventBus.emit(CMD.SHOW_MSG, {
                type: "error",
                text: "复制失败！请手动复制！",
              });
            });
        } else {
          eventBus.emit(CMD.SHOW_MSG, {
            type: "error",
            text: "复制失败！浏览器不支持！",
          });
        }
      }
      function base64ToArrayBuffer(base64) {
        let cleanBase64 = (base64 || "")
          .trim()
          .replace(/-/g, "+")
          .replace(/_/g, "/");
        while (cleanBase64.length % 4) {
          cleanBase64 += "=";
        }
        let binary_string = window.atob(cleanBase64);
        let len = binary_string.length;
        let bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
      }
      function decode() {
        try {
          new Blob([base64ToArrayBuffer(originalText.value)])
            .text()
            .then((r2) => {
              decodeText.value = r2;
            })
            .catch(() => {
              eventBus.emit(CMD.SHOW_MSG, {
                type: "error",
                text: "Base64解码失败！",
              });
            });
        } catch (e2) {
          eventBus.emit(CMD.SHOW_MSG, {
            type: "error",
            text: "Base64解码失败！不是标准数据！",
          });
        }
      }
      return (_ctx, _cache) => {
        return vue.withDirectives(
          (vue.openBlock(),
          vue.createElementBlock(
            "div",
            {
              class: "base64_tooltip",
              style: vue.normalizeStyle(styleObject),
              onClick: decode,
              ref_key: "tooltip",
              ref: tooltip,
            },
            [
              !decodeText.value
                ? (vue.openBlock(),
                  vue.createElementBlock(
                    vue.Fragment,
                    { key: 0 },
                    [
                      vue.createTextVNode(
                        " Base64解码：" +
                          vue.toDisplayString(originalText.value) +
                          " ",
                        1,
                      ),
                      vue.createVNode(vue.unref(Icon), {
                        icon: "system-uicons:translate",
                      }),
                    ],
                    64,
                  ))
                : (vue.openBlock(),
                  vue.createElementBlock("div", _hoisted_1$5, [
                    vue.createElementVNode(
                      "span",
                      null,
                      vue.toDisplayString(decodeText.value),
                      1,
                    ),
                    vue.createVNode(
                      BaseButton,
                      {
                        class: "btn",
                        size: "small",
                        onClick: copy,
                      },
                      {
                        default: vue.withCtx(() => [
                          ...(_cache[0] ||
                            (_cache[0] = [
                              vue.createTextVNode("点击复制", -1),
                            ])),
                        ]),
                        _: 1,
                      },
                    ),
                  ])),
            ],
            4,
          )),
          [[vue.vShow, show.value]],
        );
      };
    },
  };
  const Base64Tooltip = /* @__PURE__ */ _export_sfc(_sfc_main$5, [
    ["__scopeId", "data-v-06429e70"],
  ]);
  const _sfc_main$4 = {
    name: "Msg",
    components: { Icon },
    props: {
      type: "",
      text: "",
    },
    created() {
      setTimeout(() => {
        this.$emit("close");
      }, 3e3);
    },
  };
  const _hoisted_1$4 = { class: "right" };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_Icon = vue.resolveComponent("Icon");
    return (
      vue.openBlock(),
      vue.createElementBlock(
        "div",
        {
          class: vue.normalizeClass(["msg", $props.type]),
        },
        [
          vue.createElementVNode(
            "div",
            {
              class: "left",
              onClick:
                _cache[0] || (_cache[0] = ($event) => _ctx.$emit("close")),
            },
            [vue.createVNode(_component_Icon, { icon: "ic:round-close" })],
          ),
          vue.createElementVNode(
            "div",
            _hoisted_1$4,
            vue.toDisplayString($props.text),
            1,
          ),
        ],
        2,
      )
    );
  }
  const Msg = /* @__PURE__ */ _export_sfc(_sfc_main$4, [
    ["render", _sfc_render$1],
    ["__scopeId", "data-v-8bf692ea"],
  ]);
  const _hoisted_1$3 = {
    key: 0,
    class: "tag-modal modal",
  };
  const _hoisted_2$2 = { class: "wrapper" };
  const _hoisted_3$2 = { class: "option" };
  const _hoisted_4$2 = { class: "btns" };
  const _sfc_main$3 = {
    __name: "TagModal",
    props: ["tags"],
    emits: ["update:tags"],
    setup(__props, { emit: __emit }) {
      const tagModal = vue.reactive({
        show: false,
        currentUsername: "",
        tag: "",
      });
      const props = __props;
      const emit = __emit;
      const inputRef = vue.ref();
      const currentTags = vue.computed(() => {
        const tags = props.tags && props.tags[tagModal.currentUsername];
        return Array.isArray(tags) ? tags : [];
      });

      function focusInput() {
        vue.nextTick(() => {
          if (inputRef.value) inputRef.value.focus();
        });
      }

      async function persistTagUpdate(tempTag) {
        emit("update:tags", tempTag);
        const result = await window.parse.saveTags(tempTag);
        if (result && result.ok) {
          if (result.synced === false) {
            eventBus.emit(CMD.SHOW_MSG, {
              type: "info",
              text: "标签已保存在本机；登录后可同步到 V2EX 记事本",
            });
          } else {
            eventBus.emit(CMD.SHOW_MSG, {
              type: "success",
              text: "标签已保存",
            });
          }
        } else {
          eventBus.emit(CMD.SHOW_MSG, {
            type: "warning",
            text: "标签已保存在本机，但同步到记事本失败",
          });
        }
      }

      async function removeTag(tag) {
        const username = tagModal.currentUsername;
        let tempTag = functions.clone(props.tags);
        let userTags = (tempTag[username] ?? []).filter((v) => v !== tag);
        if (userTags.length > 0) tempTag[username] = userTags;
        else delete tempTag[username];
        await persistTagUpdate(tempTag);
        focusInput();
      }

      vue.onMounted(() => {
        eventBus.on(CMD.ADD_TAG, (username) => {
          tagModal.currentUsername = username;
          tagModal.tag = "";
          tagModal.show = true;
          focusInput();
        });
      });
      async function addTag() {
        const tag = String(tagModal.tag || "").trim();
        if (!tag) {
          eventBus.emit(CMD.SHOW_MSG, { type: "warning", text: "请输入标签" });
          focusInput();
          return;
        }
        let tempTag = functions.clone(props.tags);
        let userTags = (tempTag[tagModal.currentUsername] ?? []).slice();
        if (userTags.includes(tag)) {
          eventBus.emit(CMD.SHOW_MSG, {
            type: "warning",
            text: "标签已存在！",
          });
          focusInput();
          return;
        }
        userTags.push(tag);
        tempTag[tagModal.currentUsername] = userTags;
        tagModal.tag = "";
        await persistTagUpdate(tempTag);
        focusInput();
      }
      return (_ctx, _cache) => {
        return (
          vue.openBlock(),
          vue.createBlock(vue.Transition, null, {
            default: vue.withCtx(() => [
              tagModal.show
                ? (vue.openBlock(),
                  vue.createElementBlock("div", _hoisted_1$3, [
                    vue.createElementVNode("div", {
                      class: "mask",
                      onClick:
                        _cache[0] ||
                        (_cache[0] = vue.withModifiers(
                          ($event) => (tagModal.show = false),
                          ["stop"],
                        )),
                    }),
                    vue.createElementVNode("div", _hoisted_2$2, [
                      _cache[6] ||
                        (_cache[6] = vue.createElementVNode(
                          "div",
                          { class: "title" },
                          " 用户标签 ",
                          -1,
                        )),
                      vue.createElementVNode("div", _hoisted_3$2, [
                        _cache[3] ||
                          (_cache[3] = vue.createElementVNode(
                            "span",
                            null,
                            "用户：",
                            -1,
                          )),
                        vue.createElementVNode("div", null, [
                          vue.createElementVNode(
                            "b",
                            null,
                            vue.toDisplayString(tagModal.currentUsername),
                            1,
                          ),
                        ]),
                      ]),
                      vue.createElementVNode(
                        "div",
                        { class: "tag-list" },
                        currentTags.value.length > 0
                          ? vue.renderList(currentTags.value, (tag) => {
                              return vue.createElementVNode(
                                "span",
                                { class: "tag-item", key: tag },
                                [
                                  vue.createElementVNode(
                                    "span",
                                    null,
                                    vue.toDisplayString(tag),
                                    1,
                                  ),
                                  vue.createElementVNode(
                                    "i",
                                    {
                                      class: "fa fa-trash-o remove",
                                      title: "删除标签",
                                      onClick: vue.withModifiers(
                                        () => removeTag(tag),
                                        ["stop"],
                                      ),
                                    },
                                    null,
                                    8,
                                    ["onClick"],
                                  ),
                                ],
                              );
                            })
                          : [
                              vue.createElementVNode(
                                "span",
                                { class: "tag-empty" },
                                "暂无标签",
                              ),
                            ],
                      ),
                      vue.withDirectives(
                        vue.createElementVNode(
                          "input",
                          {
                            type: "text",
                            ref_key: "inputRef",
                            ref: inputRef,
                            placeholder: "输入标签，回车添加",
                            style: { width: "100%" },
                            "onUpdate:modelValue":
                              _cache[1] ||
                              (_cache[1] = ($event) => (tagModal.tag = $event)),
                            onKeydown: vue.withKeys(addTag, ["enter"]),
                          },
                          null,
                          544,
                        ),
                        [[vue.vModelText, tagModal.tag]],
                      ),
                      vue.createElementVNode("div", _hoisted_4$2, [
                        vue.createVNode(
                          BaseButton,
                          {
                            type: "link",
                            onClick:
                              _cache[2] ||
                              (_cache[2] = vue.withModifiers(
                                ($event) => {
                                  tagModal.show = false;
                                  tagModal.tag = "";
                                },
                                ["stop"],
                              )),
                          },
                          {
                            default: vue.withCtx(() => [
                              ...(_cache[4] ||
                                (_cache[4] = [
                                  vue.createTextVNode("关闭", -1),
                                ])),
                            ]),
                            _: 1,
                          },
                        ),
                        vue.createVNode(
                          BaseButton,
                          {
                            onClick: vue.withModifiers(addTag, ["stop"]),
                          },
                          {
                            default: vue.withCtx(() => [
                              ...(_cache[5] ||
                                (_cache[5] = [
                                  vue.createTextVNode("添加", -1),
                                ])),
                            ]),
                            _: 1,
                          },
                        ),
                      ]),
                    ]),
                  ]))
                : vue.createCommentVNode("", true),
            ]),
            _: 1,
          })
        );
      };
    },
  };
  const TagModal = /* @__PURE__ */ _export_sfc(_sfc_main$3, [
    ["__scopeId", "data-v-0f1f99f7"],
  ]);
  const _hoisted_1$2 = { class: "msgs" };
  const _sfc_main$2 = {
    __name: "MsgModal",
    setup(__props) {
      const msgList = vue.reactive([
        // {type: 'success', text: '123', id: Date.now()}
      ]);
      vue.onMounted(() => {
        eventBus.on(CMD.SHOW_MSG, (val) => {
          msgList.push({ ...val, id: Date.now() });
        });
      });
      function removeMsg(id) {
        let rIndex = msgList.findIndex((item) => item.id === id);
        if (rIndex > -1) {
          msgList.splice(rIndex, 1);
        }
      }
      return (_ctx, _cache) => {
        return (
          vue.openBlock(),
          vue.createElementBlock("div", _hoisted_1$2, [
            (vue.openBlock(true),
            vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList(msgList, (v) => {
                return (
                  vue.openBlock(),
                  vue.createBlock(
                    Msg,
                    {
                      key: v.id,
                      type: v.type,
                      text: v.text,
                      onClose: ($event) => removeMsg(v.id),
                    },
                    null,
                    8,
                    ["type", "text", "onClose"],
                  )
                );
              }),
              128,
            )),
          ])
        );
      };
    },
  };
  const MsgModal = /* @__PURE__ */ _export_sfc(_sfc_main$2, [
    ["__scopeId", "data-v-b73f4332"],
  ]);
  let u = ".__cf_email__",
    f = "data-cfemail",
    d = document.createElement("div");
  function e(e2) {
    console.error(e2);
  }
  function r(e2, t) {
    let r2 = e2.substr(t, 2);
    return parseInt(r2, 16);
  }
  function n(href, index) {
    let o = "",
      a = r(href, index);
    for (let i = index + 2; i < href.length; i += 2) {
      let l = r(href, i) ^ a;
      o += String.fromCharCode(l);
    }
    try {
      o = decodeURIComponent(escape(o));
    } catch (u2) {
      e(u2);
    }
    d.innerHTML = '<a href="' + o.replace(/"/g, "&quot;") + '"></a>';
    return d.childNodes[0].getAttribute("href") || "";
  }
  function decodeEmail(body) {
    try {
      let as = body.find(u);
      as.each(function () {
        try {
          let o = this,
            a = o.parentNode,
            i = o.getAttribute(f);
          if (i) {
            let l = n(i, 0),
              d2 = document.createTextNode(l);
            a.replaceChild(d2, o);
          }
        } catch (h2) {
          e(h2);
        }
      });
    } catch (s) {
      e(s);
    }
  }
  const _hoisted_1$1 = {
    key: 0,
    class: "NotificationModal modal",
  };
  const _hoisted_2$1 = { class: "modal-root" };
  const _hoisted_3$1 = { class: "modal-body" };
  const _hoisted_4$1 = { class: "filter" };
  const _hoisted_5$1 = { class: "list-wrap" };
  const _hoisted_6$1 = { class: "notify-wrap" };
  const _hoisted_7$1 = ["innerHTML"];
  const _hoisted_8$1 = {
    key: 0,
    class: "loading-wrap",
  };
  const _hoisted_9$1 = { class: "footer" };
  const _hoisted_10$1 = ["innerHTML"];
  const _hoisted_11$1 = { class: "total" };
  const _sfc_main$1 = {
    __name: "NotificationModal",
    props: ["modelValue", "list", "total", "pages", "loading"],
    emits: ["update:modelValue"],
    setup(__props, { emit: __emit }) {
      const props = __props;
      const emit = __emit;
      const index = vue.ref("all");
      vue.onMounted(() => {});
      vue.watch([index, () => props.list], () => {
        $(".notify-wrap").scrollTop(0);
      });
      vue.watch(
        () => props.modelValue,
        (n2) => {
          if (n2) {
            document.body.style.overflow = "hidden";
          } else {
            document.body.style.overflow = "unset";
            $(".notify-wrap").scrollTop(0);
          }
        },
      );
      function close() {
        emit("update:modelValue", false);
      }
      return (_ctx, _cache) => {
        return (
          vue.openBlock(),
          vue.createBlock(vue.Transition, null, {
            default: vue.withCtx(() => [
              __props.modelValue
                ? (vue.openBlock(),
                  vue.createElementBlock("div", _hoisted_1$1, [
                    vue.createElementVNode("div", {
                      class: "mask",
                      onClick: vue.withModifiers(close, ["stop"]),
                    }),
                    vue.createElementVNode("div", _hoisted_2$1, [
                      vue.createElementVNode("div", { class: "modal-header" }, [
                        _cache[4] ||
                          (_cache[4] = vue.createElementVNode(
                            "div",
                            { class: "title" },
                            " 提醒系统 ",
                            -1,
                          )),
                        vue.createElementVNode("i", {
                          class: "fa fa-times",
                          onClick: close,
                        }),
                      ]),
                      vue.createElementVNode("div", _hoisted_3$1, [
                        vue.createElementVNode("div", _hoisted_4$1, [
                          vue.createElementVNode(
                            "div",
                            {
                              class: vue.normalizeClass(
                                index.value === "all" && "active",
                              ),
                              onClick:
                                _cache[0] ||
                                (_cache[0] = ($event) => (index.value = "all")),
                            },
                            "全部",
                            2,
                          ),
                          vue.createElementVNode(
                            "div",
                            {
                              class: vue.normalizeClass(
                                index.value === "reply" && "active",
                              ),
                              onClick:
                                _cache[1] ||
                                (_cache[1] = ($event) =>
                                  (index.value = "reply")),
                            },
                            "回复",
                            2,
                          ),
                          vue.createElementVNode(
                            "div",
                            {
                              class: vue.normalizeClass(
                                index.value === "star" && "active",
                              ),
                              onClick:
                                _cache[2] ||
                                (_cache[2] = ($event) =>
                                  (index.value = "star")),
                            },
                            "感谢",
                            2,
                          ),
                          vue.createElementVNode(
                            "div",
                            {
                              class: vue.normalizeClass(
                                index.value === "collect" && "active",
                              ),
                              onClick:
                                _cache[3] ||
                                (_cache[3] = ($event) =>
                                  (index.value = "collect")),
                            },
                            "收藏",
                            2,
                          ),
                        ]),
                        vue.createElementVNode("div", _hoisted_5$1, [
                          vue.createElementVNode("div", _hoisted_6$1, [
                            vue.createElementVNode(
                              "div",
                              {
                                id: "notifications",
                                class: vue.normalizeClass(index.value),
                                innerHTML: __props.list,
                              },
                              null,
                              10,
                              _hoisted_7$1,
                            ),
                          ]),
                          __props.loading
                            ? (vue.openBlock(),
                              vue.createElementBlock("div", _hoisted_8$1, [
                                vue.createVNode(BaseLoading),
                              ]))
                            : vue.createCommentVNode("", true),
                        ]),
                        vue.createElementVNode("div", _hoisted_9$1, [
                          vue.createElementVNode(
                            "div",
                            {
                              innerHTML: __props.pages,
                              class: "pages",
                            },
                            null,
                            8,
                            _hoisted_10$1,
                          ),
                          vue.createElementVNode("div", _hoisted_11$1, [
                            _cache[5] ||
                              (_cache[5] = vue.createElementVNode(
                                "span",
                                null,
                                "总共收到提醒",
                                -1,
                              )),
                            vue.createTextVNode(
                              vue.toDisplayString(__props.total),
                              1,
                            ),
                          ]),
                        ]),
                      ]),
                    ]),
                  ]))
                : vue.createCommentVNode("", true),
            ]),
            _: 1,
          })
        );
      };
    },
  };
  const NotificationModal = /* @__PURE__ */ _export_sfc(_sfc_main$1, [
    ["__scopeId", "data-v-77aa374e"],
  ]);
  const _sfc_main = {
    components: {
      Icon,
      BaseButton,
      NotificationModal,
      BaseLoading,
      BaseSwitch,
      MsgModal,
      TagModal,
      Tooltip,
      Setting,
      PostDetail,
      Base64Tooltip,
      Msg,
    },
    provide() {
      return {
        isLogin: vue.computed(() => this.isLogin),
        isNight: vue.computed(() => this.isNight),
        pageType: vue.computed(() => this.pageType),
        tags: vue.computed(() => this.tags),
        show: vue.computed(() => this.show),
        post: vue.computed(() => this.current),
        config: vue.computed(() => this.config),
        allReplyUsers: vue.computed(() => {
          var _a, _b, _c;
          if ((_a = this.current) == null ? void 0 : _a.replyList) {
            return Array.from(
              new Set(
                ((_c = (_b = this.current) == null ? void 0 : _b.replyList) ==
                null
                  ? void 0
                  : _c.map((v) => v.username)) ?? [],
              ),
            );
          }
          return [];
        }),
        showConfig: this.showConfig,
      };
    },
    data() {
      return {
        loading: window.pageType === PageType.Post,
        refreshLoading: false,
        loadMore: false,
        isLogin: !!window.user.username,
        pageType: window.pageType,
        isNight: window.isNight,
        stopMe: window.stopMe,
        //停止使用脚本
        show: false,
        current: getDefaultPost(),
        list: [],
        config: functions.clone(window.config),
        tags: window.user.tags,
        configModal: {
          show: false,
        },
        notificationModal: {
          show: false,
          loading: false,
          list: "",
          total: 0,
        },
        previewModal: {
          show: false,
          src: "",
        },
        popConfirmModal: {
          show: false,
          title: "",
          id: "",
        },
        timer: -1,
        timer2: -1,
        pageInfo: {
          title: "",
          number: 0,
        },
        calendar: {
          show: false,
          year: "",
          month: "",
          dayCount: 0,
          firstDayWeek: 0,
          select: "",
        },
      };
    },
    mounted() {
      // 主题切换 UI 在 style 脚本中运行，通过事件同步 Vue 侧的 isNight
      window.addEventListener("v2p-theme-change", (e2) => {
        const detail = e2 && e2.detail;
        if (detail && typeof detail.isDark === "boolean") {
          this.isNight = detail.isDark;
        }
      });
      // 本机 / 远端标签同步：保证 Vue 侧与 window.user.tags 一致
      this.tags = window.user.tags || {};
      eventBus.on(CMD.SYNC_TAGS, (tags) => {
        this.tags = tags;
      });
    },
    computed: {
      targetUserTags() {
        return this.tags[window.targetUserName] ?? [];
      },
      isList() {
        return [PageType.Home, PageType.Node].includes(this.pageType);
      },
      isPost() {
        return this.pageType === PageType.Post;
      },
      isMember() {
        return this.pageType === PageType.Member;
      },
    },
    watch: {
      config: {
        handler(newVal, oldVal) {
          let configStr = localStorage.getItem("v2ex-config");
          let configObj = {};
          if (configStr) {
            try {
              configObj = JSON.parse(configStr);
            } catch (e2) {
              configObj = {};
            }
          }
          configObj[window.user.username || "default"] = newVal;
          localStorage.setItem("v2ex-config", JSON.stringify(configObj));
          window.config = newVal;
          window.parse.editNoteItem(
            window.user.configPrefix + JSON.stringify(window.config),
            window.user.configNoteId,
          );
        },
        deep: true,
      },
      tags(newVal) {
        window.user.tags = newVal;
      },
      "config.viewType"(newVal) {
        if (!newVal) return;
        if (newVal === "card") {
          $(".post-item").each(function () {
            $(this).addClass("preview");
          });
        } else {
          $(".post-item").each(function () {
            $(this).removeClass("preview");
          });
        }
      },
      "pageInfo.number"(newVal) {
        clearInterval(this.timer2);
        if (newVal) {
          document.title = `(${this.pageInfo.number}) ` + this.pageInfo.title;
          if (this.config.notice.whenNewNoticeGlimmer) {
            let c = 0;
            this.timer2 = setInterval(() => {
              c++;
              document.title = this.pageInfo.title;
              if (c % 2 === 0) {
                document.title =
                  `(${this.pageInfo.number}) ` + this.pageInfo.title;
              }
            }, 1e3);
          }
        } else {
          document.title = this.pageInfo.title;
        }
      },
      show(newVal) {
        if (this.pageType === PageType.Post) return;
        if (newVal) {
          document.body.style.overflow = "hidden";
          if (!window.history.state) {
            window.history.pushState({}, 0, this.current.href);
          }
          vue.nextTick(() => {
            this.pageInfo.title = document.title = this.current.title ?? "V2EX";
          });
        } else {
          document.body.style.overflow = "unset";
          this.pageInfo.title = document.title = "V2EX";
          if (window.history.state) {
            window.history.back();
          }
        }
      },
    },
    created() {
      let that = this;
      this.initEvent();
      window.cb = this.winCb;
      if (!window.canParseV2exPage) return;
      $(document).on("click", "a", this.clickA);
      $(document).on("click", ".post-item", function (e2) {
        if (e2.currentTarget.getAttribute("script")) return;
        if (that.stopMe) return true;
        if (this.classList.contains("preview")) {
          if (
            e2.target.tagName !== "A" &&
            e2.target.tagName !== "IMG" &&
            !e2.target.classList.contains("toggle")
          ) {
            let id = this.dataset["id"];
            let href = this.dataset["href"];
            if (id) {
              that.clickPost(e2, id, href);
            } else {
              if (href) location.href = href;
            }
          }
        }
      });
      $(document).on("click", ".toggle", (e2) => {
        if (this.stopMe) return true;
        let id = e2.target.dataset["id"];
        let itemDom = document.querySelector(`.id_${id}`);
        if (itemDom.classList.contains("preview")) {
          e2.target.innerText = "预览";
          itemDom.classList.remove("preview");
        } else {
          if (this.config.viewType !== "card") {
            let index = this.list.findIndex((v) => v.id == id);
            if (index > -1) {
              e2.target.innerText = "收起";
              itemDom.classList.add("preview");
            } else {
              e2.target.innerText = "加载中";
              functions.getPostDetailByApi(id).then((res) => {
                if (res.content_rendered) {
                  res.href = itemDom.dataset["href"];
                  this.list.push(getDefaultPost(res));
                  itemDom.classList.add("preview");
                  e2.target.innerText = "收起";
                  functions.appendPostContent(res, itemDom);
                } else {
                  e2.target.innerText = "预览";
                  eventBus.emit(CMD.SHOW_MSG, {
                    type: "warning",
                    text: "主题暂无正文！",
                  });
                }
              });
            }
          } else {
            e2.target.innerText = "收起";
            itemDom.classList.add("preview");
          }
        }
      });
      window.onpopstate = (event) => {
        if (event.state) {
          if (!this.show) this.show = true;
        } else {
          if (this.show) this.show = false;
        }
      };
      if (this.config.notice.takeOverNoticePage) {
        window.deleteNotification = (nId, token) => {
          let item = $("#n_" + nId);
          item.slideUp("fast");
          $.post({
            url: "/delete/notification/" + nId + "?once=" + token,
            success() {
              $.get({
                url: "/notifications/below/" + window.notificationBottom,
                success(data, status, request) {
                  item.remove();
                  $("#notifications").append(that.checkReplyItemType(data));
                  window.notificationBottom = request.getResponseHeader(
                    "X-V2EX-New-Notification-Bottom",
                  );
                },
                error() {
                  item.slideDown("fast");
                },
              });
            },
            error() {
              item.slideDown("fast");
            },
          });
        };
      }
    },
    beforeUnmount() {
      clearInterval(this.timer);
      eventBus.clear();
      $(document).off("click", "a", this.clickA);
    },
    methods: {
      getMonthDayInfo(num) {
        let now = dayjs();
        now = now.year(this.calendar.year);
        now = now.month(this.calendar.month);
        if (num > 0) {
          now = now.add(1, "month");
        } else {
          now = now.subtract(1, "month");
        }
        this.calendar.year = now.year();
        this.calendar.month = now.month();
        this.calendar.dayCount = now.daysInMonth();
        this.calendar.firstDayWeek = now.startOf("month").day();
      },
      checkReplyItemType(val) {
        let d2 = $(val);
        let str = d2.html();
        if (str.includes("提到了你") || str.includes("回复了你")) {
          d2.addClass("reply");
        }
        if (str.includes("感谢了你")) {
          d2.addClass("star");
        }
        if (str.includes("收藏了你")) {
          d2.addClass("collect");
        }
        return d2;
      },
      async getUnreadMessagesCount() {
        var _a, _b;
        const res = await fetch(`${location.origin}/mission`);
        const htmlText = await res.text();
        const $page = $(htmlText);
        const text = $page.find('#Rightbar a[href^="/notifications"]').text();
        if (text.includes("未读提醒")) {
          const countStr = (_a = text.match(/\d+/)) == null ? void 0 : _a.at(0);
          if (countStr) {
            return Number((_b = text.match(/\d+/)) == null ? void 0 : _b.at(0));
          }
        } else {
          return 0;
        }
        throw new Error("无法获取未读消息数量");
      },
      clickA(e2) {
        let that = this;
        if (e2.currentTarget.getAttribute("script")) return;
        if (that.stopMe) return true;
        let currentHref = e2.currentTarget.href;
        if (functions.isExternalLink(currentHref)) {
          if (that.config.openExternalLinkInNewTab ?? true) {
            functions.stopEvent(e2);
            functions.openNewTab(
              currentHref,
              that.config.newTabOpenActive,
            );
            return;
          }
        }
        let { pageType } = functions.checkPageType(e2.currentTarget);
        let { href, id, title } = functions.parseA(e2.currentTarget);
        switch (pageType) {
          case PageType.Post:
            if (id) {
              that.clickPost(e2, id, href, title);
            }
            break;
          case PageType.Node:
          case PageType.Home:
          case PageType.Changes:
            return;
          case PageType.Hot:
            let date = e2.currentTarget.search.replace("?", "");
            if (date === "setting") {
              if (this.calendar.show) {
                $("#Rightbar > .sep20:first").css(
                  "height",
                  "var(--component-margin)",
                );
              } else {
                $("#Rightbar > .sep20:first").css("height", "unset");
                let now2 = dayjs();
                this.calendar.year = now2.year();
                this.calendar.month = now2.month();
                this.calendar.dayCount = now2.daysInMonth();
                this.calendar.firstDayWeek = now2.startOf("month").day();
                this.calendar.select = `${this.calendar.year}-${this.calendar.month + 1}-${now2.date()}`;
              }
              this.calendar.show = !this.calendar.show;
              functions.stopEvent(e2);
              return;
            }
            let now = dayjs();
            let day = "";
            switch (Number(date)) {
              case -1:
                day = now.subtract(1, "day").format("YYYY-M-D");
                break;
              case -2:
                day = now.subtract(2, "day").format("YYYY-M-D");
                break;
              case 3:
                day = "3d";
                break;
              case 7:
                day = "7d";
                break;
              case 30:
                day = "30d";
                break;
              default:
                day = date;
                if (dayjs(day).isSame(now, "day")) {
                  functions.stopEvent(e2);
                  return location.reload();
                }
            }
            if (day) {
              fetch(DefaultVal.hotUrl + day + ".json")
                .then(async (r2) => {
                  let r1 = await r2.json();
                  $(".cell.item.post-item").remove();
                  r1.reverse().map((v) => {
                    let s = `
<div class="cell item post-item id_${v.id}" style="" data-href="${location.origin}/t/${v.id}#reply${v.replyCount}">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tbody>
      <tr>
        <td width="48" valign="top" align="center">
          <a href="/member/${v.username}">
            <img src="${v.avatar}" class="avatar"
                 border="0" align="default"
                 width="48"
                 style="width: 48px; max-height: 48px;"
                 alt="ice9191">
          </a>
        </td>
        <td width="10"></td>
        <td width="auto" valign="middle">
          <span class="item_title">
            <a href="${location.origin}/t/${v.id}#reply${v.replyCount}" class="topic-link" id="topic-link-${v.id}">${v.title}</a>
          </span>
          <div class="sep5"></div>
          <span class="topic_info">
            <div class="votes"></div>
            <a class="node" href="/go/${v.nodeUrl}">${v.nodeTitle}</a> &nbsp;•&nbsp;
            <strong><a href="/member/${v.username}">${v.username}</a></strong> &nbsp;•&nbsp;
            <span title="${v.lastReplyDate}">${v.lastReplyDateAgo}</span> &nbsp;•&nbsp; 最后回复来自
            <strong><a href="/member/${v.lastReplyUsername}">${v.lastReplyUsername}</a></strong>
          </span>
        </td>
        <td width="70" align="right" valign="middle" style="position: relative;">
          <a href="/t/${v.id}#reply${v.replyCount}" class="count_livid">${v.replyCount}</a>
          <div data-id="${v.id}" class="toggle">预览</div>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
                `;
                    $("#app").after($(s));
                  });
                })
                .catch((e3) => {
                  eventBus.emit(CMD.SHOW_MSG, {
                    type: "error",
                    text: "暂无点击日期的最热数据！",
                  });
                });
            }
            functions.stopEvent(e2);
            return;
          default:
            if (e2.currentTarget.href.includes("/settings/night/toggle"))
              return;
            if (e2.currentTarget.href === location.origin + "/#;") return;
            if (e2.currentTarget.href.includes("/notifications")) {
              this.pageInfo.number = 0;
              $("#money")
                .parent()
                .prev()
                .replaceWith(`<a href="/notifications">0 未读提醒</a>`);
              if (this.config.notice.takeOverNoticePage) {
                this.notificationModal.loading = true;
                this.notificationModal.show = true;
                fetch(href)
                  .then(async (r2) => {
                    let htmlText = await r2.text();
                    let bodyText = htmlText.match(
                      /<body[^>]*>([\s\S]+?)<\/body>/g,
                    );
                    let res = htmlText.match(
                      /var notificationBottom = ([\d]+);/,
                    );
                    if (res && res[1]) {
                      window.notificationBottom = Number(res[1]);
                    }
                    let body = $(bodyText[0]);
                    let list = body.find("#notifications");
                    list.children().each(function () {
                      that.checkReplyItemType(this);
                    });
                    let h2 = list.html();
                    let d2 = body.find("#Main > .box > .header .fr .gray");
                    if (d2.length) {
                      this.notificationModal.total = d2.text();
                    }
                    this.notificationModal.list = h2;
                    let p = list.next();
                    let tds = p.find(".button");
                    tds.each(function () {
                      let href2 = this.getAttribute("onclick");
                      if (href2) {
                        let match = href2.match(/['"]([^'"]+)['"]/);
                        let targetUrl = match
                          ? match[1]
                          : href2
                              .replace(/^location\.href\s*=\s*/, "")
                              .replace(/[;'\s"]/g, "");
                        this.innerHTML = `<a href="${targetUrl}">${this.innerHTML}</a>`;
                        this.setAttribute("onclick", "");
                      }
                    });
                    this.notificationModal.pages = p.html();
                    this.notificationModal.loading = false;
                  })
                  .catch((e3) => {
                    this.notificationModal.loading = false;
                  });
                functions.stopEvent(e2);
                return;
              }
            }
            if (that.config.newTabOpen) {
              functions.stopEvent(e2);
              functions.openNewTab(
                e2.currentTarget.href,
                that.config.newTabOpenActive,
              );
            }
            return;
        }
      },
      async clickPost(e2, id, href, title = "") {
        if (id) {
          if (this.config.clickPostItemOpenDetail) {
            functions.stopEvent(e2);
            let postItem = getDefaultPost();
            let index = this.list.findIndex((v) => v.id == id);
            if (index > -1) {
              postItem = this.list[index];
            }
            if (!postItem.title) postItem.title = title ?? "加载中";
            postItem.id = id;
            postItem.href = href;
            this.getPostDetail(postItem);
            return;
          }
          if (this.config.newTabOpen) {
            functions.stopEvent(e2);
            functions.openNewTab(
              `${location.origin}/t/${id}?p=1`,
              this.config.newTabOpenActive,
            );
          }
        }
      },
      showPost() {
        this.show = true;
        $(`#Wrapper #Main .box:lt(3)`).each(function () {
          $(this).hide();
        });
      },
      showConfig() {
        this.configModal.show = true;
      },
      resetTitle() {
        let r2 = document.title.match(/\s?\(\d+\)\s?/);
        if (r2 && r2.length) {
          this.pageInfo.title = document.title.replace(r2[0], "");
        } else {
          this.pageInfo.title = document.title;
        }
      },
      async getNotice(body) {
        if (!body || typeof body.find !== "function") {
          try {
            let res = await fetch("/");
            if (res.status === 200) {
              let htmlText = await res.text();
              let bodyText = htmlText.match(/<body[^>]*>([\s\S]+?)<\/body>/i);
              body = $(bodyText ? bodyText[0] : htmlText);
            }
          } catch (e) {
            console.error("[V2EX Pro] getNotice fetch error", e);
            return;
          }
        }
        if (!body || typeof body.find !== "function") return;
        let notify = body.find('a[href="/notifications"]');
        if (notify.length) {
          this.resetTitle();
          let text = notify.text();
          if (text !== "0 未读提醒") {
            this.pageInfo.number = text.replace(" 未读提醒", "");
            if (this.config.notice.text !== text) {
              $("#money")
                .parent()
                .prev()
                .replaceWith(
                  `<div><div class="orange-dot"></div><strong><a href="/notifications">${text}</a></strong></div>`,
                );
              this.config.notice.text = text;
              if (this.config.notice.ddWebhook) {
                let n2 = /* @__PURE__ */ new Date();
                let s = n2.getSeconds();
                s = s < 10 ? "0" + s : s;
                let m = n2.getMinutes();
                m = m < 10 ? "0" + m : m;
                let h2 = n2.getHours();
                h2 = h2 < 10 ? "0" + h2 : h2;
                let contentText =
                  notify.text() +
                  `，时间：${n2.getFullYear()}/${n2.getMonth() + 1}/${n2.getDate()} ${h2}:${m}:${s}`;
                if (typeof _GM_xmlhttpRequest === "function") {
                  _GM_xmlhttpRequest({
                    url: this.config.notice.ddWebhook,
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify({
                      msgtype: "text",
                      text: { content: contentText },
                    }),
                  });
                }
              }
            }
          } else {
            $("#money")
              .parent()
              .prev()
              .replaceWith(`<a href="/notifications">${text}</a>`);
            this.config.notice.text = "";
          }
        }
      },
      async winCb({ type, value }) {
        if (type === "openSetting") {
          this.showConfig();
        }
        if (type === "syncData") {
          this.stopMe = window.stopMe;
        }
        if (type === "getConfigSuccess") {
          if (
            window.config.version < DefaultVal.currentVersion &&
            window.isDeadline
          ) {
            $(".v2pro-setting span").after(
              `<div class="new v2pro-new">new</div>`,
            );
          }
          if (window.isLogin && window.config.notice.loopCheckNotice) {
            this.getNotice($(document.body));
            if (this.timer) clearInterval(this.timer);
            this.timer = setInterval(
              () => this.getNotice(),
              1e3 * 60 * Number(window.config.notice.loopCheckNoticeInterval),
            );
          }
          this.config = window.config;
          this.tags = window.user.tags;
        }
        if (type === "syncList") {
          this.list = Object.assign(this.list, window.postList);
        }
        if (type === "warningNotice") {
          eventBus.emit(CMD.SHOW_MSG, { type: "warning", text: value });
        }
        if (this.stopMe) return;
        if (type === "restorePost") {
          this.show = false;
          this.loading = false;
          eventBus.emit(CMD.SHOW_MSG, {
            type: "warning",
            text: "脚本无法查看此页面！",
          });
          $(`#Wrapper #Main .box:lt(3)`).each(function () {
            $(this).show();
          });
        }
        if (type === "postContent") {
          this.current = Object.assign(this.current, value);
          this.current.inList = true;
          if (this.config.autoOpenDetail) {
            this.showPost();
          }
        }
        if (type === "postReplies") {
          this.loading = false;
          this.current = Object.assign(this.current, value);
          this.list.push(functions.clone(this.current));
        }
      },
      regenerateReplyList() {
        if (this.current.replyList.length) {
          functions.createList(this.current, this.current.replyList);
        } else {
          this.current.replyCount = 0;
          this.current.nestedReplies = [];
          this.current.nestedRedundReplies = [];
        }
        this.syncCurrentToList();
      },
      syncCurrentToList() {
        if (this.list.length) {
          let rIndex = this.list.findIndex((i) => i.id === this.current.id);
          if (rIndex > -1) {
            this.list[rIndex] = functions.clone(this.current);
          }
        }
      },
      initEvent() {
        eventBus.on(CMD.CHANGE_COMMENT_THANK, (val) => {
          const { id, type } = val;
          let currentI = this.current.replyList.findIndex((i) => i.id === id);
          if (currentI > -1) {
            this.current.replyList[currentI].isThanked = type === "add";
            if (type === "add") {
              this.current.replyList[currentI].thankCount++;
            } else {
              this.current.replyList[currentI].thankCount--;
            }
            // 就地同步派生列表而非重建，避免感谢后因重排导致回复瞬间位移
            functions.updateThankInDerivedLists(this.current, id, type);
            this.syncCurrentToList();
          }
        });
        eventBus.on(CMD.CHANGE_POST_THANK, (val) => {
          const { id, type } = val;
          this.current.isThanked = type === "add";
          if (type === "add") {
            this.current.thankCount++;
          } else {
            this.current.thankCount--;
          }
          let currentI = this.list.findIndex((i) => i.id === id);
          if (currentI > -1) {
            this.list[currentI].isThanked = type === "add";
            if (type === "add") {
              this.list[currentI].thankCount++;
            } else {
              this.list[currentI].thankCount--;
            }
          }
        });
        eventBus.on(CMD.REMOVE, (val) => {
          let removeIndex = this.current.replyList.findIndex(
            (i) => i.floor === val,
          );
          if (removeIndex > -1) {
            this.current.replyList.splice(removeIndex, 1);
          }
          this.regenerateReplyList();
        });
        eventBus.on(CMD.IGNORE, () => {
          this.show = false;
          let rIndex = this.list.findIndex((i) => i.id === this.current.id);
          if (rIndex > -1) {
            this.list.splice(rIndex, 1);
          }
          this.current = getDefaultPost();
        });
        eventBus.on(CMD.MERGE, (val) => {
          this.current = Object.assign(this.current, val);
          let rIndex = this.list.findIndex((i) => i.id === this.current.id);
          if (rIndex > -1) {
            this.list[rIndex] = functions.clone(this.current);
          }
        });
        eventBus.on(CMD.ADD_REPLY, (item) => {
          this.current.replyList.push(item);
          this.regenerateReplyList();
        });
        eventBus.on(CMD.REFRESH_ONCE, async (once) => {
          if (once) {
            if (typeof once === "string") {
              let res = once.match(/var once = "([\d]+)";/);
              if (res && res[1]) {
                this.current.once = Number(res[1]);
                return;
              }
            }
            if (typeof once === "number") {
              this.current.once = once;
              return;
            }
          }
          window.fetchOnce().then((r2) => {
            this.current.once = r2;
          });
        });
        eventBus.on(CMD.REMOVE_TAG, async ({ username, tag }) => {
          let tempTag = functions.clone(this.tags);
          let tags = (tempTag[username] ?? []).filter((v) => v !== tag);
          if (tags.length > 0) tempTag[username] = tags;
          else delete tempTag[username];
          this.tags = tempTag;
          const result = await window.parse.saveTags(tempTag);
          if (!result || !result.ok) {
            eventBus.emit(CMD.SHOW_MSG, {
              type: "warning",
              text: "标签已从本机删除，但同步到记事本失败",
            });
          } else if (result.synced === false) {
            eventBus.emit(CMD.SHOW_MSG, {
              type: "info",
              text: "标签已保存在本机；登录后可同步到 V2EX 记事本",
            });
          } else {
            eventBus.emit(CMD.SHOW_MSG, {
              type: "success",
              text: "标签已保存",
            });
          }
        });
        eventBus.on(CMD.SHOW_CONFIRM_MODAL, (val) => {
          const { rect, title, id } = val;
          this.popConfirmModal.show = true;
          this.popConfirmModal.title = title;
          this.popConfirmModal.id = id;
          vue.nextTick(() => {
            this.$refs.tip.style.top = rect.top + "px";
            this.$refs.tip.style.left = rect.left + rect.width / 2 - 50 + "px";
          });
        });
      },
      async getPostDetail(post) {
        this.current = post;
        this.show = true;
        let url2 = location.origin + "/t/" + this.current.id;
        this.current.url = url2;
        let alreadyHasReply = !!(
          this.current.replyList && this.current.replyList.length
        );
        let prevCount = alreadyHasReply ? this.current.replyList.length : 0;
        if (alreadyHasReply) {
          this.refreshLoading = true;
        } else {
          this.loading = true;
          functions.getPostDetailByApi(this.current.id).then((d2) => {
            d2.replyCount = d2.replies;
            this.current = Object.assign(this.current, d2);
            if (this.current.replyCount > window.config.maxReplyCountLimit) {
              functions.openNewTab(
                `${location.origin}/t/${this.current.id}?p=1&script=1`,
                true,
              );
              eventBus.emit(CMD.SHOW_MSG, {
                type: "warning",
                text: "由于回复数量较多，已为您单独打开此主题",
              });
              this.loading = this.show = false;
              return;
            } else {
              this.current.jsonContent = `
            <div class="cell">
              <div class="topic_content">
                <div class="markdown_body">
                 ${(d2 == null ? void 0 : d2.content_rendered) ?? ""}
                </div>
              </div>
            </div>`;
            }
          });
        }
        try {
          // 意图预取命中则直接用内存 HTML（只读加速），未命中走网络
          let htmlText = window.takePrefetchedHtml(this.current.id);
          if (!htmlText) {
            let apiRes = await window.fetch(url2 + "?p=1&_t=" + Date.now(), {
              cache: "no-store",
            });
            if (apiRes.status === 404) {
              eventBus.emit(CMD.SHOW_MSG, {
                type: "error",
                text: "主题未找到",
              });
              return (this.refreshLoading = this.loading = false);
            }
            if (apiRes.status === 403) {
              this.refreshLoading = this.show = this.loading = false;
              functions.openNewTab(
                `${location.origin}/t/${post.id}?p=1&script=0`,
                true,
              );
              return;
            }
            if (apiRes.redirected) {
              eventBus.emit(CMD.SHOW_MSG, { type: "error", text: "没有权限" });
              return (this.refreshLoading = this.loading = false);
            }
            htmlText = await apiRes.text();
          }
          let hasPermission = htmlText.search("你要查看的页面需要先登录");
          if (hasPermission > -1) {
            eventBus.emit(CMD.SHOW_MSG, {
              type: "error",
              text: "你要查看的页面需要先登录",
            });
            return (this.refreshLoading = this.loading = false);
          }
          let bodyText = htmlText.match(/<body[^>]*>([\s\S]+?)<\/body>/g);
          let body = $(bodyText[0]);
          decodeEmail(body);
          await window.parse.getPostDetail(this.current, body, htmlText);
          let index = this.list.findIndex((v) => v.id == this.current.id);
          if (index > -1) {
            this.list[index] = functions.clone(this.current);
          } else {
            this.list.push(functions.clone(this.current));
          }
          this.current = Object.assign({}, this.current);
          this.refreshLoading = this.loading = false;
          await window.parse.parseOp(this.current);
          if (alreadyHasReply) {
            let newCount =
              (this.current.replyList && this.current.replyList.length) || 0;
            let diff = newCount - prevCount;
            if (diff > 0) {
              eventBus.emit(CMD.SHOW_MSG, {
                type: "success",
                text: `刷新成功，新增 ${diff} 条回复`,
              });
            } else {
              eventBus.emit(CMD.SHOW_MSG, {
                type: "success",
                text: "已刷新，当前已是最新回复",
              });
            }
          }
        } catch (err) {
          console.error("刷新回复失败", err);
          eventBus.emit(CMD.SHOW_MSG, {
            type: "error",
            text: "刷新回复失败，请稍后重试",
          });
          this.refreshLoading = this.loading = false;
        }
      },
      addTargetUserTag() {
        eventBus.emit(CMD.ADD_TAG, window.targetUserName);
      },
      removeTargetUserTag(tag) {
        eventBus.emit(CMD.REMOVE_TAG, { username: window.targetUserName, tag });
      },
      popConfirmModalCancel() {
        this.popConfirmModal.show = false;
      },
      popConfirmModalConfirm() {
        this.popConfirmModalCancel();
        eventBus.emit(CMD.SHOW_CONFIRM_MODAL_CONFIRM, this.popConfirmModal.id);
      },
    },
  };
  const _hoisted_1 = {
    key: 0,
    class: "",
  };
  const _hoisted_2 = { class: "box calender" };
  const _hoisted_3 = { class: "month" };
  const _hoisted_4 = { class: "ca-title" };
  const _hoisted_5 = { class: "days" };
  const _hoisted_6 = ["onClick"];
  const _hoisted_7 = ["href"];
  const _hoisted_8 = {
    key: 0,
    class: "target-user-tags p1",
  };
  const _hoisted_9 = { class: "my-tag" };
  const _hoisted_10 = ["onClick"];
  const _hoisted_11 = {
    key: 1,
    class: "my-box p2",
    style: { "margin-top": "2rem", "margin-bottom": "0" },
  };
  const _hoisted_12 = {
    key: 0,
    class: "flex flex-center",
  };
  const _hoisted_13 = {
    key: 1,
    class: "loaded",
  };
  const _hoisted_14 = {
    key: 0,
    ref: "tip",
    class: "pop-confirm-content",
  };
  const _hoisted_15 = { class: "text" };
  const _hoisted_16 = { class: "options" };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_Setting = vue.resolveComponent("Setting");
    const _component_TagModal = vue.resolveComponent("TagModal");
    const _component_PostDetail = vue.resolveComponent("PostDetail");
    const _component_Base64Tooltip = vue.resolveComponent("Base64Tooltip");
    const _component_MsgModal = vue.resolveComponent("MsgModal");
    const _component_NotificationModal =
      vue.resolveComponent("NotificationModal");
    const _component_BaseLoading = vue.resolveComponent("BaseLoading");
    const _component_BaseButton = vue.resolveComponent("BaseButton");
    return (
      vue.openBlock(),
      vue.createElementBlock(
        vue.Fragment,
        null,
        [
          vue.createVNode(
            _component_Setting,
            {
              modelValue: $data.config,
              "onUpdate:modelValue":
                _cache[0] || (_cache[0] = ($event) => ($data.config = $event)),
              show: $data.configModal.show,
              "onUpdate:show":
                _cache[1] ||
                (_cache[1] = ($event) => ($data.configModal.show = $event)),
            },
            null,
            8,
            ["modelValue", "show"],
          ),
          vue.createVNode(
            _component_TagModal,
            {
              tags: $data.tags,
              "onUpdate:tags":
                _cache[2] || (_cache[2] = ($event) => ($data.tags = $event)),
            },
            null,
            8,
            ["tags"],
          ),
          vue.createVNode(
            _component_PostDetail,
            {
              modelValue: $data.show,
              "onUpdate:modelValue":
                _cache[3] || (_cache[3] = ($event) => ($data.show = $event)),
              ref: "postDetail",
              displayType: $data.config.commentDisplayType,
              "onUpdate:displayType":
                _cache[4] ||
                (_cache[4] = ($event) =>
                  ($data.config.commentDisplayType = $event)),
              onRefresh:
                _cache[5] ||
                (_cache[5] = ($event) => $options.getPostDetail($data.current)),
              loading: $data.loading,
              refreshLoading: $data.refreshLoading,
            },
            null,
            8,
            ["modelValue", "displayType", "loading", "refreshLoading"],
          ),
          vue.createVNode(_component_Base64Tooltip),
          vue.createVNode(_component_MsgModal),
          (vue.openBlock(),
          vue.createBlock(vue.Teleport, { to: "#Rightbar > .sep20" }, [
            $data.calendar.show
              ? (vue.openBlock(),
                vue.createElementBlock("div", _hoisted_1, [
                  _cache[12] ||
                    (_cache[12] = vue.createElementVNode(
                      "div",
                      { class: "sep" },
                      null,
                      -1,
                    )),
                  vue.createElementVNode("div", _hoisted_2, [
                    vue.createElementVNode("div", _hoisted_3, [
                      _cache[10] ||
                        (_cache[10] = vue.createElementVNode(
                          "div",
                          { class: "fade" },
                          "历史最热",
                          -1,
                        )),
                      vue.createElementVNode("div", _hoisted_4, [
                        vue.createElementVNode("i", {
                          class: "fa fa-arrow-left",
                          onClick:
                            _cache[6] ||
                            (_cache[6] = ($event) =>
                              $options.getMonthDayInfo(-1)),
                          "aria-hidden": "true",
                        }),
                        vue.createElementVNode(
                          "span",
                          null,
                          vue.toDisplayString($data.calendar.year) +
                            "年" +
                            vue.toDisplayString($data.calendar.month + 1) +
                            "月",
                          1,
                        ),
                        vue.createElementVNode("i", {
                          class: "fa fa-arrow-right",
                          onClick:
                            _cache[7] ||
                            (_cache[7] = ($event) =>
                              $options.getMonthDayInfo(1)),
                          "aria-hidden": "true",
                        }),
                      ]),
                    ]),
                    _cache[11] ||
                      (_cache[11] = vue.createElementVNode(
                        "div",
                        { class: "calender-header" },
                        [
                          vue.createElementVNode("div", null, "日"),
                          vue.createElementVNode("div", null, "一"),
                          vue.createElementVNode("div", null, "二"),
                          vue.createElementVNode("div", null, "三"),
                          vue.createElementVNode("div", null, "四"),
                          vue.createElementVNode("div", null, "五"),
                          vue.createElementVNode("div", null, "六"),
                        ],
                        -1,
                      )),
                    vue.createElementVNode("div", _hoisted_5, [
                      (vue.openBlock(true),
                      vue.createElementBlock(
                        vue.Fragment,
                        null,
                        vue.renderList(
                          $data.calendar.dayCount + $data.calendar.firstDayWeek,
                          (i) => {
                            return (
                              vue.openBlock(),
                              vue.createElementBlock(
                                "div",
                                {
                                  class: vue.normalizeClass([
                                    "day",
                                    $data.calendar.select ===
                                    `${$data.calendar.year}-${$data.calendar.month + 1}-${i - $data.calendar.firstDayWeek}`
                                      ? "active"
                                      : "",
                                  ]),
                                  onClick: ($event) =>
                                    ($data.calendar.select = `${$data.calendar.year}-${$data.calendar.month + 1}-${i - $data.calendar.firstDayWeek}`),
                                },
                                [
                                  i - $data.calendar.firstDayWeek > 0
                                    ? (vue.openBlock(),
                                      vue.createElementBlock(
                                        "a",
                                        {
                                          key: 0,
                                          href: `/v2hot?${$data.calendar.year}-${$data.calendar.month + 1}-${i - $data.calendar.firstDayWeek}`,
                                        },
                                        vue.toDisplayString(
                                          i - $data.calendar.firstDayWeek > 0
                                            ? i - $data.calendar.firstDayWeek
                                            : "",
                                        ),
                                        9,
                                        _hoisted_7,
                                      ))
                                    : vue.createCommentVNode("", true),
                                ],
                                10,
                                _hoisted_6,
                              )
                            );
                          },
                        ),
                        256,
                      )),
                    ]),
                  ]),
                  _cache[13] ||
                    (_cache[13] = vue.createElementVNode(
                      "div",
                      { class: "sep" },
                      null,
                      -1,
                    )),
                ]))
              : vue.createCommentVNode("", true),
          ])),
          vue.createVNode(
            _component_NotificationModal,
            {
              modelValue: $data.notificationModal.show,
              "onUpdate:modelValue":
                _cache[8] ||
                (_cache[8] = ($event) =>
                  ($data.notificationModal.show = $event)),
              list: $data.notificationModal.list,
              loading: $data.notificationModal.loading,
              total: $data.notificationModal.total,
              pages: $data.notificationModal.pages,
            },
            null,
            8,
            ["modelValue", "list", "loading", "total", "pages"],
          ),
          !$data.stopMe
            ? (vue.openBlock(),
              vue.createElementBlock(
                vue.Fragment,
                { key: 0 },
                [
                  $options.isMember && $data.config.openTag
                    ? (vue.openBlock(),
                      vue.createElementBlock("div", _hoisted_8, [
                        _cache[15] ||
                          (_cache[15] = vue.createElementVNode(
                            "span",
                            null,
                            "标签：",
                            -1,
                          )),
                        (vue.openBlock(true),
                        vue.createElementBlock(
                          vue.Fragment,
                          null,
                          vue.renderList($options.targetUserTags, (i) => {
                            return (
                              vue.openBlock(),
                              vue.createElementBlock("span", _hoisted_9, [
                                _cache[14] ||
                                  (_cache[14] = vue.createElementVNode(
                                    "i",
                                    { class: "fa fa-tag" },
                                    null,
                                    -1,
                                  )),
                                vue.createElementVNode(
                                  "span",
                                  null,
                                  vue.toDisplayString(i),
                                  1,
                                ),
                                vue.createElementVNode(
                                  "i",
                                  {
                                    class: "fa fa-trash-o remove",
                                    onClick: ($event) =>
                                      $options.removeTargetUserTag(i),
                                  },
                                  null,
                                  8,
                                  _hoisted_10,
                                ),
                              ])
                            );
                          }),
                          256,
                        )),
                        vue.createElementVNode(
                          "span",
                          {
                            class: "add-tag ago",
                            onClick:
                              _cache[9] ||
                              (_cache[9] = (...args) =>
                                $options.addTargetUserTag &&
                                $options.addTargetUserTag(...args)),
                            title: "添加标签",
                          },
                          "+",
                        ),
                      ]))
                    : vue.createCommentVNode("", true),
                  $options.isPost && !$data.show
                    ? (vue.openBlock(),
                      vue.createElementBlock("div", _hoisted_11, [
                        $data.loading
                          ? (vue.openBlock(),
                            vue.createElementBlock("div", _hoisted_12, [
                              vue.createVNode(_component_BaseLoading),
                            ]))
                          : (vue.openBlock(),
                            vue.createElementBlock("div", _hoisted_13, [
                              _cache[17] ||
                                (_cache[17] = vue.createElementVNode(
                                  "span",
                                  null,
                                  "楼中楼解析完成",
                                  -1,
                                )),
                              vue.createVNode(
                                _component_BaseButton,
                                {
                                  size: "small",
                                  onClick: $options.showPost,
                                },
                                {
                                  default: vue.withCtx(() => [
                                    ...(_cache[16] ||
                                      (_cache[16] = [
                                        vue.createTextVNode("点击显示", -1),
                                      ])),
                                  ]),
                                  _: 1,
                                },
                                8,
                                ["onClick"],
                              ),
                            ])),
                      ]))
                    : vue.createCommentVNode("", true),
                ],
                64,
              ))
            : vue.createCommentVNode("", true),
          (vue.openBlock(),
          vue.createBlock(vue.Teleport, { to: "body" }, [
            vue.createVNode(vue.Transition, null, {
              default: vue.withCtx(() => [
                $data.popConfirmModal.show
                  ? (vue.openBlock(),
                    vue.createElementBlock(
                      "div",
                      _hoisted_14,
                      [
                        vue.createElementVNode(
                          "div",
                          _hoisted_15,
                          vue.toDisplayString($data.popConfirmModal.title),
                          1,
                        ),
                        vue.createElementVNode("div", _hoisted_16, [
                          vue.createVNode(
                            _component_BaseButton,
                            {
                              type: "link",
                              size: "small",
                              onClick: vue.withModifiers(
                                $options.popConfirmModalCancel,
                                ["stop"],
                              ),
                            },
                            {
                              default: vue.withCtx(() => [
                                ...(_cache[18] ||
                                  (_cache[18] = [
                                    vue.createTextVNode("取消", -1),
                                  ])),
                              ]),
                              _: 1,
                            },
                            8,
                            ["onClick"],
                          ),
                          vue.createVNode(
                            _component_BaseButton,
                            {
                              size: "small",
                              onClick: vue.withModifiers(
                                $options.popConfirmModalConfirm,
                                ["stop"],
                              ),
                            },
                            {
                              default: vue.withCtx(() => [
                                ...(_cache[19] ||
                                  (_cache[19] = [
                                    vue.createTextVNode("确认", -1),
                                  ])),
                              ]),
                              _: 1,
                            },
                            8,
                            ["onClick"],
                          ),
                        ]),
                      ],
                      512,
                    ))
                  : vue.createCommentVNode("", true),
              ]),
              _: 1,
            }),
          ])),
        ],
        64,
      )
    );
  }
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [
    ["render", _sfc_render],
    ["__scopeId", "data-v-a73f564c"],
  ]);
  let isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) && !document.querySelector("#Rightbar");
  let $section = document.createElement("section");
  $section.id = "app";
  function run() {
    window.user = DefaultUser;
    window.targetUserName = "";
    window.pageType = void 0;
    window.pageData = { pageNo: 1 };
    window.config = getDefaultConfig();
    window.isNight = $(".Night").length === 1;
    window.cb = null;
    window.stopMe = false;
    window.isLogin = false;
    window.postList = [];
    window.isDeadline = dayjs().isAfter(dayjs("2024-11-26"));
    window.parse = {
      //解析主题内容
      async parsePostContent(post, body, htmlText) {
        let once = htmlText.match(/var once = "([\d]+)";/);
        if (once && once[1]) {
          post.once = once[1];
        }
        post.isReport = htmlText.includes("你已对本主题进行了报告");
        let wrapper = body.find("#Main");
        if (!post.title || !post.content_rendered) {
          let h1 = wrapper.find("h1");
          if (h1) {
            post.title = h1[0].innerText;
          }
        }
        let as = wrapper.find(".header > a");
        if (as.length >= 2) {
          post.node.title = as[1].innerText;
          post.node.url = as[1].href;
        }
        let aName = wrapper.find(".header small.gray a:nth-child(1)");
        if (aName.length) {
          post.member.username = aName[0].innerText;
        }
        let spanEl = wrapper.find(".header small.gray span");
        if (spanEl.length) {
          post.createDateAgo = spanEl[0].innerText;
          post.createDate = spanEl[0].title;
        }
        let avatarEl = wrapper.find(".header .avatar");
        if (avatarEl.length) {
          post.member.avatar_large = avatarEl[0].src;
        }
        let topic_buttons = body.find(".topic_buttons");
        if (topic_buttons.length) {
          let favoriteNode = topic_buttons.find(".tb:first");
          if (favoriteNode.length) {
            post.isFavorite = favoriteNode[0].innerText === "取消收藏";
          }
          let ignoreNode = topic_buttons.find(".tb:nth-child(3)");
          if (ignoreNode.length) {
            post.isIgnore = ignoreNode[0].innerText === "取消忽略";
          }
          let thankNode = topic_buttons.find("#topic_thank .tb");
          if (!thankNode.length) {
            post.isThanked = true;
          }
          let topic_stats = topic_buttons.find(".topic_stats");
          if (topic_stats.length) {
            let text = topic_stats[0].innerText;
            let reg1 = text.matchAll(/([\d]+)[\s]*人收藏/g);
            let collectCountReg = [...reg1];
            if (collectCountReg.length) {
              post.collectCount = Number(collectCountReg[0][1]);
            }
            reg1 = text.matchAll(/([\d]+)[\s]*likes/g);
            collectCountReg = [...reg1];
            if (collectCountReg.length) {
              post.collectCount = Number(collectCountReg[0][1]);
            }
            let reg2 = text.matchAll(/([\d]+)[\s]*人感谢/g);
            let thankCountReg = [...reg2];
            if (thankCountReg.length) {
              post.thankCount = Number(thankCountReg[0][1]);
            }
            let reg3 = text.matchAll(/([\d]+)[\s]*次点击/g);
            let clickCountReg = [...reg3];
            if (clickCountReg.length) {
              post.clickCount = Number(clickCountReg[0][1]);
            }
            reg3 = text.matchAll(/([\d]+)[\s]*views/g);
            clickCountReg = [...reg3];
            if (clickCountReg.length) {
              post.clickCount = Number(clickCountReg[0][1]);
            }
          }
        }
        let header = body.find(`#Main .box`).first();
        let temp = header.clone();
        temp.find(".topic_buttons").remove();
        temp.find(".inner").remove();
        temp.find(".header").remove();
        functions.checkPhotoLink2Img(temp[0]);
        post.headerTemplate = temp[0].innerHTML;
        return post;
      },
      //解析OP信息
      async parseOp(post) {
        if (!post.member.id) {
          let userRes = await fetch(
            location.origin +
              "/api/members/show.json?username=" +
              post.member.username,
          );
          if (userRes.status === 200) {
            post.member = await userRes.json();
          }
        }
        if (post.member.id) {
          let date = new Date(post.member.created * 1e3);
          let createStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
          date.setHours(0);
          date.setMinutes(0);
          date.setSeconds(0);
          date.setMilliseconds(0);
          let now = /* @__PURE__ */ new Date();
          now.setHours(0);
          now.setMinutes(0);
          now.setSeconds(0);
          now.setMilliseconds(0);
          let d2 = now.getTime() - date.getTime();
          let isNew = d2 <= 1e3 * 60 * 60 * 24 * 15;
          post.member.createDate = createStr + " 注册";
          post.member.isNew = isNew;
        } else {
          post.member.createDate = "用户已被注销/封禁";
          post.member.isNew = true;
        }
        return post;
      },
      //获取主题所有回复
      async getPostAllReplies(post, body, htmlText, pageNo = 1) {
        var _a, _b;
        if (body.find("#no-comments-yet").length) {
          return post;
        }
        let boxs = body.find(`#Main .box`);
        let box = findReplyBox(boxs);
        let cells = box.querySelectorAll(".cell");
        if (cells && cells.length) {
          const frElement = cells[0].querySelector(".cell .fr");
          post.fr = frElement ? frElement.innerHTML : "";
          cells = Array.from(cells);
          let snow = cells[0].querySelector(".snow");
          post.lastReplyDate =
            ((_b =
              (_a = snow == null ? void 0 : snow.nextSibling) == null
                ? void 0
                : _a.nodeValue) == null
              ? void 0
              : _b.trim()) || "";
          let repliesMap = [];
          if (cells[1].id) {
            repliesMap.push({
              i: pageNo,
              replyList: this.parsePageReplies(cells.slice(1)),
            });
            let replyList = functions.getAllReply(repliesMap);
            functions.createList(post, replyList);
            return post;
          } else {
            return new Promise((resolve) => {
              repliesMap.push({
                i: pageNo,
                replyList: this.parsePageReplies(
                  cells.slice(2, cells.length - 1),
                ),
              });
              // 顶部与底部可能各有一组分页链接，先去重
              const pageNumbers = Array.from(
                new Set(
                  Array.from(cells[1].querySelectorAll("a.page_normal"))
                    .map((el) => Number(el.innerText))
                    .filter(
                      (page) =>
                        Number.isFinite(page) && page > 0 && page !== pageNo,
                    ),
                ),
              );
              const pageCount = pageNumbers.length
                ? Math.max(pageNo, ...pageNumbers)
                : pageNo;
              const maxPages = getTopReplyMaxPages();
              const selection = selectTopReplyPages(
                pageNumbers,
                pageNo,
                maxPages,
              );
              const cacheKey = getTopReplyCacheKey(
                post.id,
                pageNo,
                pageCount,
                maxPages,
              );
              const finish = (pageResults) => {
                pageResults.forEach((v) => repliesMap.push(v));
                let replyList = functions.getAllReply(repliesMap);
                functions.createList(post, replyList);
                resolve(post);
              };
              // 短期缓存命中：当前页仍从 DOM 解析，只跳过其它分页的请求
              const cached = readTopReplyCache(cacheKey);
              if (cached) {
                finish(cached.pages);
                return;
              }
              if (!selection.fetchPages.length) {
                finish([]);
                return;
              }
              let url2 = location.origin + "/t/" + post.id;
              runWithConcurrency(
                selection.fetchPages,
                TOP_REPLY_FETCH_CONCURRENCY,
                (currentPageNo) =>
                  this.fetchPostOtherPageReplies(
                    url2 + "?p=" + currentPageNo,
                    currentPageNo,
                  ),
              ).then((results) => {
                const fulfilled = results
                  .filter(
                    (result) =>
                      result.status === "fulfilled" &&
                      result.value &&
                      !result.value.failed,
                  )
                  .map((result) => result.value);
                finish(fulfilled);
                // 有分页失败时结果不完整，不写入缓存，下次打开可以重试
                if (fulfilled.length === selection.fetchPages.length) {
                  writeTopReplyCache(cacheKey, {
                    pages: fulfilled,
                    totalPageCount: selection.totalPageCount,
                    fetchedPageCount: fulfilled.length + 1,
                    truncated: selection.truncated,
                  });
                }
              });
            });
          }
        }
      },
      //请求主题其他页的回复
      fetchPostOtherPageReplies(href, pageNo) {
        return new Promise((resolve) => {
          let fetchUrl =
            href + (href.includes("?") ? "&" : "?") + "_t=" + Date.now();
          $.get(fetchUrl)
            .then((res) => {
              let s = res ? res.match(/<body[^>]*>([\s\S]+?)<\/body>/i) : null;
              let $body = $(s ? s[0] : res || "");
              let boxs = $body.find("#Main .box");
              let box = findReplyBox(boxs);
              let cells = box ? box.querySelectorAll(".cell") : [];
              cells = Array.from(cells);
              resolve({
                i: pageNo,
                replyList: this.parsePageReplies(
                  cells.slice(2, cells.length - 1),
                ),
              });
            })
            .catch((r2) => {
              if (r2 && r2.status === 403) {
                functions.cbChecker({ type: "restorePost", value: null });
              }
              // 标记失败，调用方据此决定是否写入缓存
              resolve({ i: pageNo, replyList: [], failed: true });
            });
        });
      },
      //解析页面的回复
      parsePageReplies(nodes) {
        let replyList = [];
        nodes.forEach((node, index) => {
          if (!node.id) return;
          let item = {
            level: 0,
            thankCount: 0,
            replyCount: 0,
            isThanked: false,
            isOp: false,
            isDup: false,
            id: node.id.replace("r_", ""),
          };
          let reply_content = node.querySelector(".reply_content");
          if (reply_content) {
            functions.checkPhotoLink2Img(reply_content);
            item.reply_content = reply_content.innerHTML;
            item.reply_text = reply_content.textContent;
          } else {
            item.reply_content = "";
            item.reply_text = "";
          }
          let { users, floor } = this.parseReplyContent(item.reply_content);
          item.hideCallUserReplyContent = item.reply_content;
          if (users.length === 1) {
            item.hideCallUserReplyContent = item.reply_content.replace(
              /@<a href="\/member\/[\s\S]+?<\/a>(?:<ul [\s\S]+<\/ul>)?(\s#[\d]+)?\s(<br>)?/,
              () => "",
            );
          }
          item.replyUsers = users;
          item.replyFloor = floor;
          let ago = node.querySelector(".ago");
          item.date = ago ? ago.textContent : "";
          let userNode = node.querySelector("strong a");
          item.username = userNode ? userNode.textContent : "";
          let avatar = node.querySelector("td img");
          item.avatar = avatar ? avatar.src : "";
          let no = node.querySelector(".no");
          item.floor = no ? Number(no.textContent) : 0;
          let thank_area = node.querySelector(".thank_area");
          if (thank_area) {
            item.isThanked = thank_area.classList.contains("thanked");
          }
          let small = node.querySelector(".small");
          if (small) {
            item.thankCount = Number(small.textContent);
          }
          let op = node.querySelector(".op");
          if (op) {
            item.isOp = true;
          }
          let mod = node.querySelector(".mod");
          if (mod) {
            item.isMod = true;
          } else {
            item.isMod = [
              "Livid",
              "Kai",
              "Olivia",
              "GordianZ",
              "sparanoid",
              "drymonfidelia",
              "sillydaddy",
            ].includes(item.username);
          }
          replyList.push(item);
        });
        return replyList;
      },
      //解析回复内容，解析出@用户，回复楼层。用于后续生成嵌套楼层
      parseReplyContent(str) {
        if (!str) return { users: [], floor: -1 };
        let users = [];
        let getUsername = (userStr) => {
          users.push(userStr);
        };
        let userReg = /@<a href="\/member\/([^'" ]+)/g;
        let has = str.matchAll(userReg);
        let res2 = [...has];
        res2.forEach((item) => {
          getUsername(item[1]);
        });
        let floor = -1;
        if (users.length === 1) {
          let floorReg =
            /@<a href="\/member\/[\s\S]+?<\/a>(?:<ul [\s\S]+<\/ul>)?[\s]+#([\d]+)/g;
          let hasFloor = str.matchAll(floorReg);
          let res = [...hasFloor];
          if (res.length) {
            floor = Number(res[0][1]);
          }
        }
        return { users, floor };
      },
      //获取主题详情
      async getPostDetail(post, body, htmlText, pageNo = 1) {
        post = await this.parsePostContent(post, body, htmlText);
        return await this.getPostAllReplies(post, body, htmlText, pageNo);
      },
      //解析页面主题列表
      parsePagePostList(list, box) {
        list.forEach((itemDom) => {
          let item_title = itemDom.querySelector(".item_title");
          if (!item_title) return;
          let item = getDefaultPost();
          itemDom.classList.add("post-item");
          let a = item_title.querySelector("a");
          let { href, id } = functions.parseA(a);
          item.id = String(Number(id));
          a.href = item.href = href;
          item.url = location.origin + "/api/topics/show.json?id=" + item.id;
          itemDom.classList.add(`id_${id}`);
          itemDom.dataset["href"] = href;
          let td = itemDom.querySelector("td:nth-child(4)");
          if (!td) {
            td = itemDom.querySelector("td:nth-child(2)");
          }
          td.style.position = "relative";
          let toggle = document.createElement("div");
          toggle.dataset["id"] = item.id;
          toggle.classList.add("toggle");
          toggle.innerText = "预览";
          td.append(toggle);
          if (window.config.viewType === "card") {
            window.postList.push(item);
          }
        });
        localStorage.setItem("v2pro_conflict", "");
        if (window.pageType === PageType.Home) {
          const a = () => {
            let d2;
            if (window.user.username) {
              d2 = $(window.atob("LnYycC1ob3Zlci1idG4=")).length;
            } else {
              d2 = $(window.atob("LnYycC1mb290ZXI=")).length;
            }
            if (d2 !== 0) {
              window.stopMe = true;
              localStorage.setItem("v2pro_conflict", "1");
              functions.cbChecker({
                type: "warningNotice",
                value: "检测到与其它扩展(如V2EX Polish)冲突，脚本已暂停接管",
              });
              functions.cbChecker({ type: "syncData" });
            } else {
              localStorage.setItem("v2pro_conflict", "");
            }
          };
          a();
          setTimeout(a, 1e3);
          setTimeout(a, 2e3);
          setTimeout(a, 3e3);
          setTimeout(a, 5e3);
          setTimeout(a, 1e4);
          setTimeout(a, 15e3);
        }
        const setF = (res) => {
          let rIndex = window.postList.findIndex((w) => w.id == res.id);
          if (rIndex > -1) {
            window.postList[rIndex] = Object.assign(
              window.postList[rIndex],
              res,
            );
            functions.cbChecker({ type: "syncList" });
          }
          let itemDom = box.querySelector(`.id_${res.id}`);
          itemDom.classList.add("preview");
          if (res.content_rendered) {
            functions.appendPostContent(res, itemDom);
          }
        };
        if (window.config.viewType === "card" && !window.stopMe) {
          let cacheDataStr = localStorage.getItem("cacheData");
          let cacheData = [];
          if (cacheDataStr) {
            try {
              cacheData = JSON.parse(cacheDataStr);
              let now = Date.now();
              cacheData = cacheData.filter((v) => {
                return v.created > now / 1e3 - 60 * 60 * 24 * 3;
              });
            } catch (e2) {
              cacheData = [];
            }
          }
          let fetchIndex = 0;
          for (let i = 0; i < window.postList.length; i++) {
            let item = window.postList[i];
            let rItem = cacheData.find((w) => w.id == item.id);
            if (rItem) {
              rItem.href = item.href;
              setF(rItem);
            } else {
              fetchIndex++;
              setTimeout(
                () => {
                  $.get(item.url).then((v) => {
                    if (v && v.length) {
                      let res = getDefaultPost(v[0]);
                      res.href = item.href;
                      cacheData.push(res);
                      localStorage.setItem(
                        "cacheData",
                        JSON.stringify(cacheData),
                      );
                      setF(res);
                    }
                  });
                },
                fetchIndex < 4 ? 0 : (fetchIndex - 4) * 1e3,
              );
            }
          }
        }
      },
      //创建记事本子条目
      async createNoteItem(itemName) {
        if (!window.isLogin) return null;
        let data = new FormData();
        data.append("content", itemName);
        data.append("parent_id", 0);
        data.append("syntax", 0);
        let apiRes = await fetch(`${location.origin}/notes/new`, {
          method: "post",
          body: data,
        });
        if (apiRes.redirected && apiRes.status === 200) {
          let match = apiRes.url.match(/\/(\d+)\/?$/);
          return match ? match[1] : apiRes.url.split("/").filter(Boolean).pop();
        }
        return null;
      },
      //编辑记事本子条目
      async editNoteItem(val, id) {
        if (!window.isLogin) return;
        if (!id) return;
        let data = new FormData();
        data.append("content", val);
        data.append("syntax", 0);
        let apiRes = await fetch(`${location.origin}/notes/edit/${id}`, {
          method: "post",
          body: data,
        });
        return apiRes.redirected && apiRes.status === 200;
      },
      //标签操作：本机优先，登录后同步到 V2EX 记事本
      async saveTags(val) {
        const normalized = normalizeLocalTags(val);
        applyTags(normalized, true);
        if (!window.isLogin) {
          return { ok: true, synced: false, reason: "not-login" };
        }
        try {
          if (!window.user.tagsId) {
            const noteId = await this.createNoteItem(window.user.tagPrefix);
            if (!noteId) throw new Error("创建标签记事本条目失败");
            window.user.tagsId = noteId;
          }
          const res = await this.editNoteItem(
            window.user.tagPrefix + JSON.stringify(normalized),
            window.user.tagsId,
          );
          return res
            ? { ok: true, synced: true }
            : { ok: false, synced: false, reason: "edit-failed" };
        } catch (e2) {
          return { ok: false, synced: false, reason: "error" };
        }
      },
      //imgur图片删除hash操作
      async saveImgurList(val) {
        if (!window.isLogin) return;
        return;
      },
    };
    function initMonkeyMenu() {
      try {
        _GM_registerMenuCommand("脚本设置", () => {
          functions.cbChecker({ type: "openSetting" });
        });
        _GM_registerMenuCommand("仓库地址", () => {
          functions.openNewTab(DefaultVal.git, true);
        });
        _GM_registerMenuCommand("反馈 & 建议", functions.feedback);
      } catch (e2) {
        console.error("无法使用Tampermonkey");
      }
    }
    function initStyle() {
      if (window.isNight) {
        document.documentElement.classList.add("dark");
      }
      let style2 = `
      /* ==========================================================================
         V2EX Pro - 现代美学与极致阅读体验重构样式
         ========================================================================== */

      /* ---------- 1. 全局设计系统与变量规范 ---------- */
      /* ---------- 旧 token 别名层（deprecated）：值统一指向 --v2p-* 体系（与 PC 样式脚本同一映射） ---------- */
      /* 作用域 :root body（--v2p-* 由样式脚本在 body 级定义，var() 按定义处作用域解析） */
      :root body {
        /* Type — 字体栈：与 PC 样式脚本保持同一映射，同样拆成拉丁段 + CJK 池后拼装 */
        --v2-font-latin: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial;
        --v2-font-cjk-sc: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC";
        --v2-font-sans: var(--v2-font-latin), var(--v2-font-cjk-sc), sans-serif;
        --v2-font-mono-latin: ui-monospace, "JetBrains Mono", "Cascadia Code", Consolas;
        --v2-font-mono: var(--v2-font-mono-latin), var(--v2-font-cjk-sc), monospace;

        /* 强调品牌色 → --v2p-color-accent-* */
        --v2-primary: var(--v2p-color-accent-500);
        --v2-primary-hover: var(--v2p-color-accent-600);
        --v2-primary-light: color-mix(in oklch, var(--v2p-color-accent-500) 8%, transparent);
        --v2-primary-border: color-mix(in oklch, var(--v2p-color-accent-500) 22%, transparent);
        --v2-primary-glow: color-mix(in oklch, var(--v2p-color-accent-500) 25%, transparent);

        /* 浅色模式界面背景阶梯 → --v2p-* */
        --color-main-bg: var(--v2p-color-background);
        --color-second-bg: var(--v2p-color-bg-content);
        --color-third-bg: var(--v2p-color-bg-block);
        --color-item-bg: var(--v2p-color-bg-content);
        --color-swtich-bg: var(--v2p-color-main-300);
        --color-active: var(--v2p-color-accent-500);
        --color-sp-btn-bg: var(--v2p-color-button-background);
        --color-editor-toolbar: var(--v2p-color-bg-block);
        --color-call-list-bg: var(--v2p-color-bg-content);
        --color-top-reply-wrap-bg: var(--v2p-color-bg-reply);
        --color-top-reply-wrap-line: var(--v2p-color-border);

        /* 文本分级 → --v2p-* */
        --color-font-pure: var(--v2p-color-main-800);
        --color-font-8: var(--v2p-color-foreground);
        --color-font: var(--v2p-color-font-secondary);
        --color-font-3: var(--v2p-color-font-tertiary);
        --color-line: var(--v2p-color-border);
        --color-floor: var(--v2p-color-bg-reply);
        --color-floor-font: var(--v2p-color-font-tertiary);

        /* 输入与边框控件 → --v2p-* */
        --color-input-bg: var(--v2p-color-bg-input);
        --color-input-border: var(--v2p-color-input-border);
        --color-input-border-hover: var(--v2p-color-main-400);
        --color-radio-border: var(--v2p-color-input-border);
        --color-tooltip-bg: var(--v2p-color-bg-tooltip);
        --color-tooltip-shadow: rgba(0, 0, 0, 0.1);
        --color-scrollbar: var(--v2p-color-scrollbar);
        --color-loading-1: var(--v2p-color-mask);
        --color-loading-2: var(--v2p-color-loading-2);

        /* 尺寸、圆角与立体投影系统（投影随体系，radius/动效保留字面值） */
        --box-border-radius: var(--v2-radius-md, 12px);
        --box-card-shadow: var(--v2p-box-shadow);
        --box-card-shadow-hover: var(--v2p-widget-shadow, 0 10px 24px -4px rgba(0, 0, 0, 0.08));
        --box-card-border: 1px solid var(--v2p-color-border);

        /* 动效曲线 */
        --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
        --ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);
      }

      /* 深色补充覆盖（body 级：若放 html 级会被 :root body 别名层遮蔽）——
         深浅共用别名，值随 --v2p-* 主题自动切换，此处仅覆盖半透明主色梯度（深色下需更强） */
      html.dark body,
      html.v2p-theme-dark-default body,
      :root body.v2p-theme-dark-default,
      :root[data-darkreader-scheme="dark"] body,
      :root body:where(:has(#Wrapper.Night)) {
        --v2-primary-light: color-mix(in oklch, var(--v2p-color-accent-500) 14%, transparent);
        --v2-primary-border: color-mix(in oklch, var(--v2p-color-accent-500) 30%, transparent);
        --v2-primary-glow: color-mix(in oklch, var(--v2p-color-accent-500) 35%, transparent);
      }

      /* ---------- 2. 基础重置与阅读排版 (Typography & Readability) ---------- */
      /* rem 基准必须留在 html；字体/背景/文字色消费 body 级 token，由 body 承载 */
      html {
        font-size: 62.5%;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      }

      body {
        font-family: var(--v2-font-sans);
        background-color: var(--color-main-bg) !important;
        color: var(--color-font-8);
        line-height: 1.6;
      }

      /* 链接平滑过渡 */
      a {
        text-decoration: none;
        color: inherit;
        transition: color 0.15s ease;
      }
      a:hover {
        color: var(--v2-primary) !important;
      }

      /* 正文阅读体验大幅强化（字号、行距、段间距、排版韵律） */
      .topic_content, .reply_content, .markdown_body {
        font-size: 1.5rem !important;
        line-height: 1.75 !important;
        letter-spacing: 0.012em !important;
        color: var(--color-font-8) !important;
        overflow-wrap: break-word !important;
        word-break: break-word !important;
      }

      .topic_content p, .reply_content p {
        margin: 0.85em 0 !important;
      }

      .topic_content h1, .reply_content h1 { font-size: 2.2rem; font-weight: 700; margin: 1.5rem 0 1rem; color: var(--color-font-pure); }
      .topic_content h2, .reply_content h2 { font-size: 1.9rem; font-weight: 650; margin: 1.3rem 0 0.8rem; color: var(--color-font-pure); }
      .topic_content h3, .reply_content h3 { font-size: 1.65rem; font-weight: 600; margin: 1.1rem 0 0.6rem; color: var(--color-font-pure); }

      /* 现代行内代码与代码块 (Code & Pre) */
      .topic_content code:not(pre code),
      .reply_content code:not(pre code),
      .post-wrapper code:not(pre code) {
        font-family: var(--v2-font-mono) !important;
        font-size: 1.3rem !important;
        background: var(--color-floor) !important;
        color: var(--v2-primary) !important;
        border: 1px solid var(--color-line) !important;
        padding: 2px 6px !important;
        border-radius: 5px !important;
        font-weight: 500 !important;
      }

      .topic_content pre,
      .reply_content pre,
      .post-wrapper pre {
        background: var(--color-third-bg) !important;
        border: 1px solid var(--color-line) !important;
        border-radius: 10px !important;
        padding: 1.2rem 1.6rem !important;
        margin: 1.2rem 0 !important;
        overflow-x: auto !important;
        font-family: var(--v2-font-mono) !important;
        font-size: 1.32rem !important;
        line-height: 1.65 !important;
        color: var(--color-font-pure) !important;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04);
      }

      /* 现代引用样式 (Blockquote) */
      .topic_content blockquote,
      .reply_content blockquote,
      .post-wrapper blockquote {
        margin: 1rem 0 !important;
        padding: 0.8rem 1.4rem !important;
        border-left: 3.5px solid var(--v2-primary) !important;
        background: var(--v2-primary-light) !important;
        border-radius: 0 8px 8px 0 !important;
        color: var(--color-font) !important;
      }

      /* 列表中正文链接高亮加深与精致下划线 */
      body :is(.topic_content, .reply_content) a[href^=http] {
        color: var(--v2-primary) !important;
        text-underline-offset: 4px !important;
        text-decoration: underline 1.5px rgba(37, 99, 235, 0.35) !important;
        transition: all 0.18s ease;
      }
      body :is(.topic_content, .reply_content) a[href^=http]:hover {
        text-decoration-color: var(--v2-primary) !important;
        background: var(--v2-primary-light);
        border-radius: 3px;
      }

      /* 优雅图片圆角与阴影 */
      .topic_content img,
      .reply_content img,
      .post-wrapper img {
        border-radius: 8px !important;
        max-width: 100% !important;
        height: auto !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        transition: transform 0.2s var(--ease-spring), box-shadow 0.2s ease;
      }
      .topic_content img:hover,
      .reply_content img:hover {
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
      }

      /* 夜间模式防刺眼柔化 */
      html.dark .topic_content img,
      html.dark .reply_content img,
      html.dark .post-wrapper img,
      .Night .topic_content img,
      .Night .reply_content img,
      .Night .post-wrapper img {
        filter: brightness(0.92) contrast(0.98);
      }

      /* ---------- 3. 宿主页面元素现代重塑 (Top, Wrapper, Main, Rightbar) ---------- */
      /* 顶栏毛玻璃与悬浮感知 */
      #Top {
        background: rgba(255, 255, 255, 0.88) !important;
        backdrop-filter: blur(16px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03) !important;
        transition: all 0.25s ease;
      }
      html.dark #Top, .Night #Top {
        background: rgba(19, 29, 46, 0.88) !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
        box-shadow: 0 2px 16px rgba(0, 0, 0, 0.35) !important;
      }

      /* 顶栏搜索栏药丸现代质感 */
      #q {
        border-radius: 999px !important;
        border: 1px solid var(--color-input-border) !important;
        background: var(--color-input-bg) !important;
        color: var(--color-font-pure) !important;
        padding: 0 1.4rem !important;
        height: 2.8rem !important;
        font-size: 1.25rem !important;
        transition: all 0.2s ease !important;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
      }
      #q:focus {
        border-color: var(--v2-primary) !important;
        box-shadow: 0 0 0 3px var(--v2-primary-glow), inset 0 1px 2px rgba(0, 0, 0, 0.04) !important;
      }

      /* 页面容器 */
      #Wrapper {
        height: unset !important;
        width: unset !important;
        background-color: var(--color-main-bg) !important;
      }
      #Wrapper > .content {
        height: unset !important;
        width: unset !important;
        max-width: 1120px !important;
        padding: 1.8rem 1.2rem !important;
        margin: 0 auto !important;
      }

      /* 卡片容器统一现代化 */
      .box {
        background: var(--color-second-bg) !important;
        border: var(--box-card-border) !important;
        border-radius: var(--box-border-radius) !important;
        box-shadow: var(--box-card-shadow) !important;
        transition: box-shadow 0.25s ease, border-color 0.25s ease;
        overflow: hidden;
      }
      .box:hover {
        box-shadow: var(--box-card-shadow-hover) !important;
      }

      /* 间距调整：将 V2EX 原生 20px 模块间距覆盖为 5px */
      .sep20, .sep5 {
        height: 5px !important;
      }

      /* 节点 Tab 分类栏 - 现代分段胶囊设计 */
      #Tabs {
        background: var(--color-third-bg) !important;
        border-bottom: 1px solid var(--color-line) !important;
        padding: 0.8rem 1rem !important;
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 0.4rem !important;
      }
      .tab, .tab_current {
        border-radius: 8px !important;
        padding: 0.5rem 1.1rem !important;
        font-size: 1.3rem !important;
        font-weight: 500 !important;
        transition: all 0.18s ease !important;
        display: inline-flex !important;
        align-items: center !important;
      }
      .tab {
        background: transparent !important;
        color: var(--color-font) !important;
      }
      .tab:hover {
        background: var(--color-floor) !important;
        color: var(--v2-primary) !important;
        text-decoration: none !important;
      }
      .tab_current {
        background: var(--v2-primary) !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        box-shadow: 0 2px 8px var(--v2-primary-glow) !important;
      }

      /* 分页控制器胶囊化 */
      .page_current, .page_normal {
        border-radius: 8px !important;
        padding: 0.5rem 1rem !important;
        font-size: 1.25rem !important;
        margin: 0 2px !important;
        transition: all 0.18s ease !important;
        border: 1px solid var(--color-line) !important;
      }
      .page_normal {
        background: var(--color-second-bg) !important;
        color: var(--color-font) !important;
      }
      .page_normal:hover {
        background: var(--color-floor) !important;
        color: var(--v2-primary) !important;
        border-color: var(--v2-primary-border) !important;
        text-decoration: none !important;
      }
      .page_current {
        background: var(--v2-primary) !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        border-color: var(--v2-primary) !important;
        box-shadow: 0 2px 6px var(--v2-primary-glow) !important;
      }

      /* ---------- 4. 帖子列表卡片优化 (Post Items & Cells) ---------- */
      .cell.item, .post-item {
        background: var(--color-second-bg) !important;
        border-bottom: 1px solid var(--color-line) !important;
        padding: 1.2rem 1.4rem !important;
        transition: background-color 0.18s ease, transform 0.18s ease;
      }
      .cell.item:hover, .post-item:hover {
        background-color: var(--color-third-bg) !important;
      }

      /* 标题精美排印 */
      .item_title {
        font-size: 1.55rem !important;
        font-weight: 550 !important;
        line-height: 1.55 !important;
        letter-spacing: 0.01em;
        margin-bottom: 0.3rem;
      }
      .item_title a, .topic-link {
        color: var(--color-font-pure) !important;
        transition: color 0.18s ease;
      }
      .item_title a:hover, .topic-link:hover {
        color: var(--v2-primary) !important;
        text-decoration: none !important;
      }

      /* 帖子元信息（作者、时间、最后回复） */
      .topic_info {
        font-size: 1.2rem !important;
        color: var(--color-font-3) !important;
      }
      .topic_info a {
        color: var(--color-font) !important;
        font-weight: 500;
      }
      .topic_info a:hover {
        color: var(--v2-primary) !important;
      }

      /* 节点标签 (a.node) 现代化小胶囊 */
      a.node {
        background-color: var(--color-floor) !important;
        color: var(--color-font) !important;
        padding: 2.5px 8px !important;
        border-radius: 6px !important;
        font-size: 1.15rem !important;
        font-weight: 550 !important;
        text-decoration: none !important;
        transition: all 0.18s ease !important;
        display: inline-block;
        border: 1px solid transparent;
      }
      a.node:hover {
        background-color: var(--v2-primary-light) !important;
        color: var(--v2-primary) !important;
        border-color: var(--v2-primary-border) !important;
      }

      /* 回复数徽章 (.count_livid) 现代药丸 */
      #Main .cell .count_livid, .count_livid {
        font-size: 1.2rem !important;
        font-weight: 600 !important;
        padding: 2px 10px !important;
        border-radius: 999px !important;
        background: var(--color-floor) !important;
        color: var(--color-font) !important;
        transition: all 0.2s var(--ease-spring) !important;
        display: inline-block !important;
        line-height: 1.5 !important;
        font-family: var(--v2-font-mono) !important;
        border: 1px solid transparent !important;
      }
      #Main .cell .count_livid:hover, .count_livid:hover {
        background: var(--v2-primary) !important;
        color: #ffffff !important;
        transform: scale(1.08) !important;
        box-shadow: 0 3px 8px var(--v2-primary-glow) !important;
      }

      /* 用户头像圆角 Squircle 与悬停微动效 */
      .avatar, #avatar, td img.avatar {
        border-radius: 9px !important;
        transition: transform 0.22s var(--ease-spring), box-shadow 0.22s ease !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }
      .avatar:hover, #avatar:hover, td img.avatar:hover {
        transform: scale(1.08);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      /* 预览卡片 (Card Mode / Preview) 现代边框发光 */
      .preview {
        margin: 1.2rem 0 !important;
        border: 1px solid var(--color-line) !important;
        border-radius: var(--box-border-radius) !important;
        cursor: pointer;
        transition: all 0.22s ease !important;
        background: var(--color-second-bg) !important;
        padding: 1.2rem 1.4rem !important;
        box-shadow: var(--box-card-shadow) !important;
      }
      .preview:hover {
        border-color: var(--v2-primary-border) !important;
        box-shadow: var(--box-card-shadow-hover) !important;
        transform: translateY(-1px);
      }
      .preview > .post-content {
        height: unset !important;
        margin-top: 0.6rem !important;
      }
      .preview > .post-content.show-all {
        max-height: unset !important;
        -webkit-mask-image: none !important;
      }
      .preview .topic-link:link {
        color: var(--color-font-pure) !important;
      }
      .post-content {
        margin-top: 0.6rem;
        display: block;
        max-height: 30rem;
        overflow: hidden;
        text-decoration: unset !important;
        line-break: anywhere;
        -webkit-mask-image: linear-gradient(180deg, #000 68%, transparent);
      }
      .show-more {
        display: none;
      }
      .preview > .show-more {
        font-size: 1.3rem;
        text-align: right;
        height: 3rem;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 9;
        color: var(--v2-primary);
        font-weight: 500;
        transition: opacity 0.15s ease;
      }
      .preview > .show-more:hover {
        opacity: 0.8;
      }
      .post-content:visited {
        color: var(--color-font-3) !important;
      }
      .post-content:link {
        color: var(--color-font-8);
      }
      .toggle {
        position: absolute;
        right: ${window.config.viewType === "simple" ? "5rem" : 0};
        top: ${window.config.viewType === "simple" ? 0 : "0.5rem"};
        width: 5rem;
        height: 100%;
        justify-content: flex-end;
        align-items: flex-end;
        cursor: pointer;
        font-size: 1.2rem;
        color: var(--v2-primary);
        display: none;
        padding-right: 1rem;
        transition: color 0.15s ease;
      }
      .toggle:hover {
        color: var(--v2-primary-hover);
      }

      /* ---------- 5. 楼中楼回复树与评论体验 (Nested Comments) ---------- */
      .comment {
        transition: background-color 0.18s ease;
      }
      .comment.isLevelOne {
        border-bottom: 1px solid var(--color-line) !important;
        padding: 1.2rem 1.4rem !important;
      }
      .comment:hover {
        background-color: rgba(0, 0, 0, 0.015);
      }
      html.dark .comment:hover, .Night .comment:hover {
        background-color: rgba(255, 255, 255, 0.02);
      }

      /* 楼中楼垂直缩进引导线 (清晰加深对比、显式分层、交互微光) */
      .comment .comment-content .expand-line,
      .top-sub-comment .expand-line {
        position: relative !important;
      }
      .comment .comment-content .expand-line:after,
      .top-sub-comment .expand-line:after,
      .top-sub-comment.top-sub-reply > .expand-line:after {
        display: block !important;
        position: absolute !important;
        left: 50% !important;
        top: 0 !important;
        content: " " !important;
        height: 100% !important;
        width: 0 !important;
        border-right: 2px solid rgba(71, 85, 105, 0.38) !important;
        border-radius: 1px !important;
        transition: border-color 0.2s ease, box-shadow 0.2s ease, border-width 0.2s ease !important;
      }
      html.dark .comment .comment-content .expand-line:after,
      html.dark .top-sub-comment .expand-line:after,
      html.dark .top-sub-comment.top-sub-reply > .expand-line:after,
      .Night .comment .comment-content .expand-line:after,
      .Night .top-sub-comment .expand-line:after,
      .Night .top-sub-comment.top-sub-reply > .expand-line:after {
        border-right-color: rgba(255, 255, 255, 0.28) !important;
      }
      .comment .comment-content .expand-line:hover:after,
      .top-sub-comment .expand-line:hover:after {
        border-right-color: var(--v2-primary) !important;
        border-right-width: 2.5px !important;
        box-shadow: 0 0 8px var(--v2-primary-glow) !important;
      }

      /* 楼层标识药丸 */
      .floor {
        margin-left: 0.6rem !important;
        font-size: 1.15rem !important;
        line-height: 1.2 !important;
        border-radius: 6px !important;
        display: inline-block !important;
        background-color: var(--color-floor) !important;
        color: var(--color-floor-font) !important;
        padding: 2.5px 8px !important;
        font-family: var(--v2-font-mono) !important;
        font-weight: 500 !important;
      }

      /* 身份角标现代精致胶囊化（消除 transform: scale 带来的字体模糊） */
      .owner, .mod {
        display: inline-block !important;
        border-radius: 5px !important;
        padding: 2px 7px !important;
        font-size: 1.15rem !important;
        font-weight: 600 !important;
        margin-right: 0.6rem !important;
        transform: none !important;
        line-height: 1.25 !important;
      }
      .owner {
        background-color: var(--v2-primary-light) !important;
        color: var(--v2-primary) !important;
        border: 1px solid var(--v2-primary-border) !important;
      }
      .mod {
        background: linear-gradient(135deg, #4f46e5, #3b82f6) !important;
        color: #ffffff !important;
        border: 1px solid transparent !important;
        box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3) !important;
      }

      /* 用户名精修 */
      .username {
        font-weight: 650 !important;
        font-size: 1.45rem !important;
        color: var(--color-font-pure) !important;
        transition: color 0.15s ease;
      }
      .username:hover {
        color: var(--v2-primary) !important;
      }

      /* 高赞置顶评论区 (Top Replies) 现代卡片设计与深色分层引导线 */
      .top-reply-wrap {
        background: var(--color-top-reply-wrap-bg) !important;
        border: 1px solid var(--color-top-reply-wrap-line) !important;
        border-left: 3.5px solid rgba(71, 85, 105, 0.42) !important;
        border-radius: 0 10px 10px 0 !important;
        padding: 1rem 1.4rem !important;
        margin: 0.8rem 0 1rem 1.2rem !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03) !important;
      }
      html.dark .top-reply-wrap,
      .Night .top-reply-wrap {
        border-left-color: rgba(255, 255, 255, 0.3) !important;
      }

      /* 评论操作栏 (Toolbar) 胶囊交互按钮 */
      .tool {
        border-radius: 6px !important;
        height: 2.6rem !important;
        padding: 0 0.7rem !important;
        transition: all 0.18s ease !important;
      }
      .tool:hover {
        background: var(--v2-primary-light) !important;
        color: var(--v2-primary) !important;
      }

      /* ---------- 6. 详情页模态弹窗与新标签页独立渲染美化 (.post-detail) ---------- */
      .post-detail {
        background: rgba(11, 15, 25, 0.72) !important;
        position: fixed !important;
        inset: 0 !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
      }
      .post-detail::before {
        content: "" !important;
        position: fixed !important;
        inset: 0 !important;
        backdrop-filter: blur(16px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
        z-index: 0 !important;
        pointer-events: none !important;
      }
      .post-detail .main {
        position: relative !important;
        background: var(--color-main-bg) !important;
        box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.4) !important;
        border-radius: 16px !important;
        margin: 2.5rem 0 5rem !important;
        padding: 3.5rem 4rem 12rem !important;
        z-index: 1 !important;
      }
      .post-detail .main .main-wrapper {
        width: 82rem !important;
        max-width: 90vw !important;
      }
      @media screen and (max-width: 1280px) {
        .post-detail .main .main-wrapper {
          width: 72vw !important;
        }
      }

      /* 新标签页独立帖子页适配 (.Post) */
      .post-detail.Post {
        position: static !important;
        background: transparent !important;
        overflow: visible !important;
      }
      .post-detail.Post::before {
        display: none !important;
      }
      .post-detail.Post .main {
        position: static !important;
        background: transparent !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 auto !important;
        padding: 0 !important;
        width: 100% !important;
      }
      .post-detail.Post .post-detail-top-actions {
        display: none !important;
      }

      /* 主题帖正文卡片与两边舒适留白 (解决正文两边过窄问题) */
      .post-wrapper,
      #Main .box.post-wrapper,
      #Main > .box:first-child {
        border-radius: var(--box-border-radius) !important;
        overflow: hidden !important;
        background: var(--box-background-color) !important;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.05) !important;
      }
      .post-wrapper .header,
      #Main .box .header {
        padding: 2.2rem 2.8rem 1.6rem !important;
        border-bottom: 1px solid var(--color-line) !important;
      }
      .post-wrapper .html-wrapper {
        padding: 2rem 2.8rem 2.2rem !important;
      }
      .post-wrapper .html-wrapper .cell {
        padding: 0 !important;
        border-bottom: none !important;
      }
      .post-wrapper .topic_content,
      #Main .box .topic_content,
      #Main .box .cell .topic_content {
        padding: 0 !important;
        font-size: 1.55rem !important;
        line-height: 1.8 !important;
        letter-spacing: 0.015em !important;
      }
      .post-wrapper .subtle, .subtle,
      #Main .box .subtle {
        background-color: var(--v2-primary-light) !important;
        border-left: 3.5px solid var(--v2-primary) !important;
        border-radius: 0 8px 8px 0 !important;
        padding: 1.2rem 1.8rem !important;
        margin: 1.8rem 0 !important;
      }
      .post-wrapper .toolbar,
      #Main .box .topic_buttons {
        padding: 1.2rem 2.8rem !important;
        border-top: 1px solid var(--color-line) !important;
        background: var(--color-second-bg) !important;
      }

      /* 详情页右上角快捷控制组（新标签打开、关闭） */
      .post-detail-top-actions {
        position: absolute !important;
        top: 0.2rem !important;
        right: 1.2rem !important;
        display: flex !important;
        align-items: center !important;
        gap: 0.8rem !important;
        z-index: 99 !important;
      }
      .post-detail-top-actions .top-action-btn {
        width: 3.4rem !important;
        height: 3.4rem !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: var(--color-second-bg) !important;
        border: 1px solid var(--color-line) !important;
        color: var(--color-font-3) !important;
        cursor: pointer !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06) !important;
        transition: all 0.22s var(--ease-spring) !important;
        transform: none !important;
        position: static !important;
      }
      .post-detail-top-actions .top-action-btn svg {
        width: 1.8rem !important;
        height: 1.8rem !important;
        font-size: 1.8rem !important;
        transition: transform 0.2s ease !important;
      }
      .post-detail-top-actions .top-action-btn.open-new-tab:hover {
        color: #3b82f6 !important;
        border-color: rgba(59, 130, 246, 0.4) !important;
        background: rgba(59, 130, 246, 0.08) !important;
        transform: translateY(-2px) scale(1.05) !important;
        box-shadow: 0 4px 14px rgba(59, 130, 246, 0.2) !important;
      }
      .post-detail-top-actions .top-action-btn.close-btn:hover {
        color: #ef4444 !important;
        border-color: rgba(239, 68, 68, 0.4) !important;
        background: rgba(239, 68, 68, 0.08) !important;
        transform: translateY(-2px) scale(1.05) !important;
        box-shadow: 0 4px 14px rgba(239, 68, 68, 0.2) !important;
      }
      .post-detail-top-actions .top-action-btn.close-btn:hover svg {
        transform: rotate(90deg) !important;
      }

      /* 详情页右侧悬浮控制坞（刷新、返回顶部、直达/底部、回到首页）Glassmorphism 现代药丸浮岛 */
      .post-detail-floating-dock {
        position: fixed !important;
        z-index: 1005 !important;
        bottom: 25rem !important;
        right: max(1.6rem, calc(50% - 41rem - 5.8rem)) !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 1rem !important;
        pointer-events: auto !important;
      }
      .post-detail-floating-dock .dock-btn {
        position: relative !important;
        width: 4.2rem !important;
        height: 4.2rem !important;
        border-radius: 1.2rem !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: var(--color-second-bg) !important;
        border: 1px solid var(--color-line) !important;
        color: var(--color-font-3) !important;
        cursor: pointer !important;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12) !important;
        backdrop-filter: blur(14px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(14px) saturate(180%) !important;
        transition: all 0.22s var(--ease-spring) !important;
        transform: none !important;
        bottom: auto !important;
        padding: 0 !important;
      }
      .post-detail-floating-dock .dock-btn svg {
        width: 2rem !important;
        height: 2rem !important;
        font-size: 2rem !important;
      }
      .post-detail-floating-dock .dock-btn:hover {
        transform: translateY(-2px) scale(1.08) !important;
        background: var(--v2-primary) !important;
        color: #ffffff !important;
        border-color: var(--v2-primary) !important;
        box-shadow: 0 8px 25px var(--v2-primary-glow) !important;
      }
      .post-detail-floating-dock .dock-btn.dock-close:hover {
        background: #ef4444 !important;
        border-color: #ef4444 !important;
        color: #ffffff !important;
        box-shadow: 0 8px 25px rgba(239, 68, 68, 0.35) !important;
      }

      /* 楼层直达输入框抽屉展开动效 */
      .post-detail-floating-dock .scroll-to {
        overflow: visible !important;
      }
      /* 鼠标悬停桥接：在按钮和输入框之间建立无缝感应区，防止鼠标移向输入框时 hover 丢失 */
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

      /* 屏幕适配与旧版样式覆盖 */
      @media screen and (max-width: 1024px) {
        .post-detail-floating-dock {
          right: 1.6rem !important;
          bottom: 3rem !important;
        }
      }
      .post-detail .close-btn,
      .post-detail .open-new-tab,
      .post-detail .v2pro-scroll-top,
      .post-detail .refresh,
      .post-detail .scroll-to {
        transform: none !important;
      }

      /* ---------- 7. 评论输入框与操作控件 (Editor & Forms) ---------- */
      .post-editor-wrapper {
        border-radius: var(--box-border-radius) !important;
        transition: all 0.25s ease !important;
      }
      .post-editor-wrapper .post-editor {
        border-radius: var(--box-border-radius) !important;
        font-family: var(--v2-font-sans) !important;
        font-size: 1.45rem !important;
        line-height: 1.65 !important;
        background: var(--color-second-bg) !important;
        border: 1px solid var(--color-line) !important;
        padding: 1rem 1.4rem !important;
        transition: all 0.22s ease !important;
      }
      .post-editor-wrapper.isFocus .post-editor,
      .post-editor-wrapper .post-editor:focus {
        border-color: var(--v2-primary) !important;
        box-shadow: 0 0 0 3px var(--v2-primary-glow) !important;
      }

      /* 输入框通用 Focus-ring */
      input, textarea {
        transition: all 0.2s ease !important;
      }
      input:focus, textarea:focus {
        border-color: var(--v2-primary) !important;
        box-shadow: 0 0 0 3px var(--v2-primary-glow) !important;
        outline: none !important;
      }

      /* 按钮现代微质感 */
      .base-button.primary {
        background: linear-gradient(135deg, var(--v2-primary), var(--v2-primary-hover)) !important;
        box-shadow: 0 2px 8px var(--v2-primary-glow) !important;
        border-radius: 8px !important;
        font-weight: 550 !important;
        transition: all 0.2s ease !important;
      }
      .base-button.primary:hover:not(.disabled) {
        box-shadow: 0 4px 14px var(--v2-primary-glow) !important;
        transform: translateY(-1px);
        opacity: 0.95 !important;
      }
      .base-button.primary:active:not(.disabled) {
        transform: translateY(0);
      }

      /* 现代 Switch 开关 */
      .switch {
        transition: all 0.25s var(--ease-spring) !important;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      .switch.active {
        background: var(--v2-primary) !important;
        box-shadow: 0 2px 8px var(--v2-primary-glow) !important;
      }

      /* 设置模态框精修 */
      .modal .mask {
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
      }
      .setting-modal .modal-root {
        border-radius: 16px !important;
        box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px var(--color-line) !important;
        overflow: hidden;
      }
      .setting-modal .modal-root .body .left .tabs .tab.active {
        background: var(--v2-primary-light) !important;
        color: var(--v2-primary) !important;
        font-weight: 600 !important;
      }

      /* ---------- 8. 现代化细巧滚动条与粘性底栏 ---------- */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(140, 140, 140, 0.28);
        border-radius: 999px;
        transition: background-color 0.2s ease;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(100, 100, 100, 0.5);
      }
      html.dark ::-webkit-scrollbar-thumb, .Night ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
      }
      html.dark ::-webkit-scrollbar-thumb:hover, .Night ::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.38);
      }

      /* 粘性吸底栏 */
      .sticky[stuck] {
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08) !important;
        border-top: 1px solid rgba(0, 0, 0, 0.06);
      }
      html.dark .sticky[stuck], .Night .sticky[stuck] {
        box-shadow: 0 -4px 25px rgba(0, 0, 0, 0.45) !important;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

      /* ---------- 9. 用户自定义及配置选项扩展支持 ---------- */
      ${
        location.pathname.includes("wow") || location.pathname.includes("tokyo")
          ? ""
          : `
       .post-item {
          background: var(--color-second-bg);
          transition: background-color 0.18s ease;
       }
       .post-item:hover {
          background-color: var(--color-third-bg) !important;
       }
      `
      }

      ${
        location.pathname.includes("wow")
          ? ""
          : `
        .Night .post-item, html.dark .post-item {
          background: #131d2e !important;
          transition: background-color 0.18s ease;
        }
        .Night .post-item:hover, html.dark .post-item:hover {
          background-color: #19253a !important;
        }
      `
      }

      .Night .preview, html.dark .preview {
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(19, 29, 46, 0.7);
      }
      .Night .preview:hover, html.dark .preview:hover {
          border-color: var(--v2-primary-hover);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
      }
      .Night .preview > .post-content:link, html.dark .preview > .post-content:link {
          color: #cbd5e1;
      }
      .Night .preview > .post-content:visited, html.dark .preview > .post-content:visited {
          color: #64748b !important;
      }
      .Night .preview .topic-link:link, html.dark .preview .topic-link:link {
          color: #93c5fd !important;
      }

      ${
        window.config.viewType === "simple"
          ? `
      ${
        window.pageType !== PageType.Member
          ? `
      .item table tr td:first-child{display:none;}
      #Rightbar .cell table:first-child tr td:first-child{display:none;}
      .item table tr td .sep5{display:none;}
      .item table tr td .topic_info{display:none;}
      .item {border-bottom:none;}
      .avatar,#avatar{display:none;}
      `
          : ""
      }
      #Logo {background-image:url('https://i.imgur.com/i9VgUtM.png');}
      .bigger a, .top:nth-last-child(5){color: transparent!important;text-shadow: #b0b0b0 0 0 6px;user-select: none;}
      `
          : ""
      }

      ${
        window.config.customBgColor
          ? `#Wrapper {
          background: ${window.config.customBgColor} !important;
          background-image: unset !important;
        }`
          : ""
      }

      .top {
        position: relative;
      }
      .new {
        position: absolute;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        font-size: 10px;
        font-weight: 700;
        border-radius: 999px;
        padding: 1px 6px;
        color: white;
        right: -10px;
        top: -4px;
        box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
      }

      /* 高赞回复被回复父级上下文胶囊卡片 */
      .top-reply-parent-context {
        display: inline-flex;
        align-items: center;
        margin-bottom: 0.8rem;
        padding: 0.4rem 0.9rem;
        background: var(--color-third-bg, #f1f5f9);
        border-left: 3px solid var(--color-active, #3b82f6);
        border-radius: 0.4rem;
        font-size: 1.2rem;
        color: var(--color-font-8, #334155);
        cursor: pointer;
        max-width: 100%;
        box-sizing: border-box;
        transition: all 0.2s ease;
      }
      .top-reply-parent-context:hover {
        background: var(--color-top-reply-wrap-line, #e2e8f0);
        color: var(--color-font-pure, #0f172a);
      }
      .top-reply-parent-context .jump-tag {
        color: var(--color-active, #3b82f6);
        font-weight: 700;
        margin-right: 0.5rem;
        flex-shrink: 0;
      }
      .top-reply-parent-context .jump-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        opacity: 0.9;
      }
      `;
      _GM_addStyle(style2);

      // 确保增强样式在 DOM 就绪后位于最高层叠优先级，避免被打包工具后置的通用样式覆盖
      setTimeout(() => {
        let enhancedStyle = document.getElementById("v2pro-modern-style");
        if (!enhancedStyle) {
          enhancedStyle = document.createElement("style");
          enhancedStyle.id = "v2pro-modern-style";
          enhancedStyle.textContent = style2;
          document.head.appendChild(enhancedStyle);
        } else {
          document.head.appendChild(enhancedStyle);
        }
      }, 0);
    }
    // 基于东八区（UTC+8 北京时间）获取当天日期字符串，与 V2EX 每日任务刷新周期严格对齐
    function getV2exDateStr() {
      let d = new Date(Date.now() + 8 * 3600 * 1000);
      return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
    }

    async function qianDao() {
      let timeNow = getV2exDateStr();
      let timeOld = localStorage.getItem("menu_clockInTime");

      // 1. 如果本地记录今天已签过到，直接略过，不发网络请求，不弹任何提示
      if (timeOld && timeOld === timeNow) {
        return;
      }

      // 2. 如果在首页且没有签到按钮（右侧已有登录态），说明今日已在其他端完成签到，直接同步记录并静默略过
      if (window.pageType === PageType.Home) {
        let qiandao = document.querySelector(
          '.box .inner a[href="/mission/daily"]',
        );
        let gift = document.getElementById("gift_v2excellent");
        if (gift) {
          gift.click();
          localStorage.setItem("menu_clockInTime", timeNow);
          setTimeout(() => {
            eventBus.emit(CMD.SHOW_MSG, {
              type: "success",
              text: "已自动领取特别奖励！",
            });
          }, 500);
          return;
        }
        if (!qiandao) {
          let userBox = document.querySelector("#Rightbar .box .inner");
          if (userBox) {
            localStorage.setItem("menu_clockInTime", timeNow);
            return;
          }
        }
      }

      // 3. 并发防重锁（防止多标签页同时并发签到）
      if (sessionStorage.getItem("v2pro_signing_in") === timeNow) {
        return;
      }
      sessionStorage.setItem("v2pro_signing_in", timeNow);

      try {
        await doAutoSignIn(timeNow);
      } catch (e2) {
        console.warn("[V2EX Pro] 自动签到异常:", e2);
      } finally {
        sessionStorage.removeItem("v2pro_signing_in");
      }
    }

    async function doAutoSignIn(timeNow) {
      let qiandao = document.querySelector(
        '.box .inner a[href="/mission/daily"]',
      );

      // 第一步：探测 /mission/daily 页面状态，精准判断是否需要签到并获取权威的 redeem?once= 参数
      let dailyRes;
      try {
        dailyRes = await fetch(location.origin + "/mission/daily", {
          credentials: "same-origin",
        });
      } catch (err) {
        console.warn("[V2EX Pro] 请求 /mission/daily 失败:", err);
        return;
      }

      if (!dailyRes.ok) {
        return;
      }

      let dailyHtml = await dailyRes.text();

      // 判断是否已经签过到（页面出现“每日登录奖励已领取”或没有“领取”按钮）
      let hasRedeemBtn =
        dailyHtml.includes('value="领取') ||
        dailyHtml.includes("mission/daily/redeem");
      if (!hasRedeemBtn) {
        // 已签到过：直接略过，静默记录本地时间戳，不弹任何提示
        localStorage.setItem("menu_clockInTime", timeNow);
        console.info("[V2EX Pro] 检测到今日已完成签到，静默跳过。");
        return;
      }

      // 第二步：提取确切的兑换 URL（从官方按钮的 onclick 或链接中提取）
      let redeemMatch =
        dailyHtml.match(/\/mission\/daily\/redeem\?once=\d+/) ||
        dailyHtml.match(
          /location\.href\s*=\s*['"]([^'"]*redeem\?once=\d+)['"]/,
        );
      let redeemUrl = "";
      if (redeemMatch) {
        redeemUrl = redeemMatch[1] || redeemMatch[0];
        if (redeemUrl.startsWith("/")) {
          redeemUrl = location.origin + redeemUrl;
        }
      } else {
        // 兜底方案：从当前页面工具栏寻找 once
        let toolsEl = document.querySelector("div#Top .tools, #menu-body");
        let onceMatch = toolsEl ? toolsEl.innerHTML.match(/once=(\d+)/) : null;
        if (onceMatch) {
          redeemUrl = location.origin + "/mission/daily/redeem?" + onceMatch[0];
        }
      }

      if (!redeemUrl) {
        console.warn("[V2EX Pro] 无法获取签到 redeem URL！");
        return;
      }

      // 第三步：发起签到兑换请求
      let redeemRes;
      try {
        redeemRes = await fetch(redeemUrl, { credentials: "same-origin" });
      } catch (err) {
        console.warn("[V2EX Pro] 签到兑换请求失败:", err);
        return;
      }

      let resultHtml = await redeemRes.text();
      let isSuccess =
        resultHtml.includes("fa-ok-sign") ||
        resultHtml.includes("已连续登录") ||
        resultHtml.includes("每日登录奖励已领取");

      if (isSuccess) {
        localStorage.setItem("menu_clockInTime", timeNow);
        let daysMatch = resultHtml.match(/已连续登录\s*(\d+?)\s*天/);
        let daysText = daysMatch ? `已连续登录 ${daysMatch[1]} 天` : "";
        let successMsg = daysText
          ? `自动签到成功！${daysText}`
          : "自动签到成功！";
        console.info("[V2EX Pro] " + successMsg);

        // 如果首页签到入口存在，更新其文字
        if (qiandao) {
          qiandao.textContent = successMsg;
          qiandao.href = "javascript:void(0);";
        }

        // 自动签到成功后弹出友好提示（已经签到过则不弹）
        setTimeout(() => {
          eventBus.emit(CMD.SHOW_MSG, {
            type: "success",
            text: successMsg,
          });
        }, 500);
      } else {
        console.warn("[V2EX Pro] 自动签到未确认成功，可尝试手动签到。");
        if (qiandao) {
          qiandao.textContent = "自动签到未成功，请手动签到";
        }
      }
    }
    // ---------- 用户标签本机缓存（自 v2ex-H5 移植） ----------
    const LOCAL_TAGS_KEY = "v2p_tags";

    function normalizeLocalTags(value) {
      const result = {};
      if (!value || typeof value !== "object") return result;
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

    function readLocalTags() {
      let raw = null;
      try {
        if (typeof GM_getValue === "function") {
          raw = GM_getValue(LOCAL_TAGS_KEY);
        }
      } catch (e2) {
        raw = null;
      }
      if (raw == null) {
        try {
          raw = localStorage.getItem(LOCAL_TAGS_KEY);
        } catch (e2) {
          raw = null;
        }
      }
      if (!raw) return {};
      let parsed = raw;
      if (typeof raw === "string") {
        try {
          parsed = JSON.parse(raw);
        } catch (e2) {
          return {};
        }
      }
      return normalizeLocalTags(parsed);
    }

    function writeLocalTags(tags) {
      const raw = JSON.stringify(tags);
      try {
        if (typeof GM_setValue === "function") {
          GM_setValue(LOCAL_TAGS_KEY, raw);
          return;
        }
      } catch (e2) {
        // GM 存储不可用时退回 localStorage
      }
      try {
        localStorage.setItem(LOCAL_TAGS_KEY, raw);
      } catch (e2) {
        // 隐私模式下 localStorage 可能不可用，忽略即可
      }
    }

    function applyTags(tags, persist) {
      const normalized = normalizeLocalTags(tags);
      if (persist !== false) writeLocalTags(normalized);
      window.user.tags = normalized;
      try {
        eventBus.emit(CMD.SYNC_TAGS, normalized);
      } catch (e2) {
        // eventBus 尚未初始化时忽略
      }
      return normalized;
    }

    function initMemberTags() {
      if (window.__v2pTagsReady) return;
      window.__v2pTagsReady = true;
      // 本机标签先渲染，登录后再由 initNoteData 在后台合并远端记事本
      applyTags(readLocalTags(), false);
    }

    function getNoteItemContent(id, prefix) {
      return new Promise((resolve, reject) => {
        $.get(location.origin + "/notes/edit/" + id).then((r2) => {
          let bodyText = r2.match(/<body[^>]*>([\s\S]+?)<\/body>/g);
          let body = $(bodyText[0]);
          let text = body.find(".note_editor").text();
          if (text === prefix) {
            resolve({});
          } else {
            let tagJson = text.substring(prefix.length);
            try {
              resolve(JSON.parse(tagJson));
            } catch (e2) {
              resolve({});
            }
          }
        });
      });
    }
    async function initNoteData() {
      $.get(location.origin + "/notes").then(async (r2) => {
        let bodyText = r2.match(/<body[^>]*>([\s\S]+?)<\/body>/g);
        let body = $(bodyText[0]);
        let items = body.find("#Main .box .note_item_title a");
        if (window.config.openTag) {
          let tagItems2 = Array.from(items).filter((v) =>
            v.innerText.includes(window.user.tagPrefix),
          );
          const localTags = normalizeLocalTags(window.user.tags);
          if (tagItems2.length) {
            let match = tagItems2[0].href.match(/\/(\d+)\/?$/);
            window.user.tagsId = match
              ? match[1]
              : tagItems2[0].href.split("/").filter(Boolean).pop();
            const remoteTags = normalizeLocalTags(
              await getNoteItemContent(
                window.user.tagsId,
                window.user.tagPrefix,
              ),
            );
            if (Object.keys(remoteTags).length > 0) {
              // 远端有数据时以记事本为准，覆盖本机缓存
              applyTags(remoteTags, true);
            } else if (Object.keys(localTags).length > 0) {
              // 远端为空时保留下本机标签，并补写回记事本
              await window.parse.saveTags(localTags);
            }
          } else {
            let r22 = await window.parse.createNoteItem(window.user.tagPrefix);
            r22 && (window.user.tagsId = r22);
            if (r22 && Object.keys(localTags).length > 0) {
              await window.parse.saveTags(localTags);
            }
          }
        }
        let tagItems = Array.from(items).filter((v) =>
          v.innerText.includes(window.user.configPrefix),
        );
        if (tagItems.length) {
          let match = tagItems[0].href.match(/\/(\d+)\/?$/);
          window.user.configNoteId = match
            ? match[1]
            : tagItems[0].href.split("/").filter(Boolean).pop();
          let config2 = await getNoteItemContent(
            window.user.configNoteId,
            window.user.configPrefix,
          );
          window.config = functions.deepAssign(window.config, config2);
        } else {
          let r22 = await window.parse.createNoteItem(window.user.configPrefix);
          r22 && (window.user.configNoteId = r22);
        }
        functions.cbChecker({ type: "syncData" });
        functions.cbChecker({ type: "getConfigSuccess" });
      });
    }
    function addSettingText() {
      // 侧栏指向移动端脚本安装地址（DefaultVal.mobileScript）
      if (DefaultVal.mobileScript) {
        let app = $(
          `<a href="${DefaultVal.mobileScript}" target='_blank' class="top"><i class="fa fa-android" aria-hidden="true"></i></a>`,
        );
        $(".tools").prepend(app);
      }
      let setting = $(
        `<a href="/" class="top v2pro-setting"><span>脚本设置</span></a>`,
      );
      setting.on("click", function (e2) {
        functions.stopEvent(e2);
        functions.cbChecker({ type: "openSetting" });
      });
      $(".tools").prepend(setting);
    }
    // ---------- 无感预加载（意图预取，只读） ----------
    // 实测 V2EX 文档无 Cache-Control、无 ETag/Last-Modified（CF DYNAMIC），
    // <link rel=prefetch> 无法被导航复用；故用脚本内存缓存，供站内详情秒开消费。
    // 策略：hover 停留 70ms 取 + 首屏空闲取前 3 个；省流量/慢网自动关闭；同源 /t/ 链接。
    window.__v2proPrefetch = window.__v2proPrefetch || {
      map: /* id -> {html,time} */ new Map(),
      inFlight: new Set(),
    };
    const PREFETCH_TTL = 12e4;
    const PREFETCH_MAX = 10;
    const PREFETCH_HOVER_DELAY = 70;
    const PREFETCH_VIEWPORT_N = 3;
    function prefetchDisabled() {
      try {
        const c = navigator.connection;
        if (
          c &&
          (c.saveData ||
            c.effectiveType === "slow-2g" ||
            c.effectiveType === "2g")
        ) {
          return true;
        }
      } catch (e2) {}
      return false;
    }
    function topicIdFromUrl(url) {
      const m = String(url || "").match(/\/t\/(\d+)/);
      return m ? m[1] : "";
    }
    function prefetchTopic(id) {
      if (!id || prefetchDisabled()) return;
      const cache = window.__v2proPrefetch;
      const hit = cache.map.get(id);
      if (hit && Date.now() - hit.time < PREFETCH_TTL) return;
      if (cache.inFlight.has(id)) return;
      if (cache.map.size >= PREFETCH_MAX && !hit) {
        cache.map.delete(cache.map.keys().next().value);
      }
      cache.inFlight.add(id);
      fetch(location.origin + "/t/" + id + "?p=1", {
        credentials: "same-origin",
      })
        .then((r) =>
          r.ok ? r.text() : Promise.reject(new Error("status " + r.status)),
        )
        .then((html) => {
          cache.map.set(id, { html, time: Date.now() });
        })
        .catch(() => {})
        .finally(() => {
          cache.inFlight.delete(id);
        });
    }
    // 挂 window：Vue 组件方法与本模块不在同一词法作用域，裸调用会 ReferenceError
    window.takePrefetchedHtml = function (id) {
      const cache = window.__v2proPrefetch;
      const hit = cache && cache.map.get(id);
      if (hit && Date.now() - hit.time < PREFETCH_TTL) return hit.html;
      return "";
    };
    function initPrefetch() {
      if (window.__v2proPrefetchInit) return;
      window.__v2proPrefetchInit = true;
      let hoverTimer = 0;
      let hoverId = "";
      const pickLink = (e2) =>
        e2.target && e2.target.closest
          ? e2.target.closest('a[href*="/t/"]')
          : null;
      document.addEventListener("mouseover", (e2) => {
        const a = pickLink(e2);
        const id = a ? topicIdFromUrl(a.href) : "";
        if (!id || id === hoverId) return;
        hoverId = id;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => prefetchTopic(id), PREFETCH_HOVER_DELAY);
      });
      document.addEventListener("mouseout", (e2) => {
        if (pickLink(e2)) {
          clearTimeout(hoverTimer);
          hoverId = "";
        }
      });
      const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 800));
      idle(() => {
        if (prefetchDisabled()) return;
        const links = document.querySelectorAll('.item_title a[href*="/t/"]');
        let n = 0;
        for (const a of links) {
          if (n >= PREFETCH_VIEWPORT_N) break;
          const r = a.getBoundingClientRect();
          if (r.top >= 0 && r.top < window.innerHeight) {
            prefetchTopic(topicIdFromUrl(a.href));
            n++;
          }
        }
      });
    }
    // ---------- 右侧栏个性化（自 v2ex-H5 移植） ----------
    const SIDEBAR_SECTIONS = [
      {
        key: "fav-nodes",
        titles: ["我收藏的节点"],
        storage: "v2p_sidebar_fav_nodes_collapsed",
      },
      {
        key: "hot-topics",
        titles: ["今日热议主题", "今日热议", "Today Top 10"],
        storage: "v2p_sidebar_hot_topics_collapsed",
      },
      {
        key: "hot-nodes",
        titles: ["最热节点", "Hottest Nodes"],
        storage: "v2p_sidebar_hot_nodes_collapsed",
      },
      {
        key: "new-nodes",
        titles: ["最近新增节点", "Newest Nodes"],
        storage: "v2p_sidebar_new_nodes_collapsed",
      },
      {
        key: "community",
        titles: ["社区运行状况", "Community Stats"],
        storage: "v2p_sidebar_community_status_collapsed",
      },
      {
        key: "node-nav",
        titles: ["节点导航", "Curated Nodes", "Node Navigation"],
        storage: "v2p_nav_collapsed",
      },
    ];
    const SIDEBAR_ORDER_KEY = "v2p_sidebar_order";
    const SIDEBAR_ARROW_UP =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>';
    const SIDEBAR_ARROW_DOWN =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
    const SIDEBAR_DRAG_ICON =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>';

    function sidebarText(text) {
      return String(text || "")
        .replace(/\s+/g, " ")
        .trim();
    }

    function findSidebarHeader(def) {
      const $headers = $(
        "#Rightbar .box > .cell span.fade, #Rightbar .box > .cell span.gray, #Rightbar .box > .inner span.fade, #Rightbar .box > .inner span.gray",
      );
      let found = null;
      $headers.each(function () {
        if (found) return false;
        const text = sidebarText($(this).text());
        if (!text) return;
        for (let i = 0; i < def.titles.length; i++) {
          const title = def.titles[i];
          const matched =
            def.key === "node-nav"
              ? text.includes(title)
              : text === title;
          if (matched) {
            found = $(this);
            return false;
          }
        }
      });
      return found || $();
    }

    function mergeCreateTopicToUserCard() {
      const $userCard = $("#Rightbar #member-activity").closest(".box");
      if (!$userCard.length) return;
      const $writeLink = $('#Rightbar a[href="/write"]').first();
      if (!$writeLink.length) return;
      const $writeBox = $writeLink.closest(".box");
      if (!$writeBox.length || $writeBox[0] === $userCard[0]) return;
      if ($writeBox.children(".cell").length !== 1) return;
      const $writeCell = $writeLink.closest(".cell");
      if (!$writeCell.length) return;
      const $prevSep = $writeBox.prev(".sep20, .sep");
      $userCard.append($writeCell);
      const isEmpty = $writeBox.children().length === 0;
      $writeBox.remove();
      if (isEmpty) $prevSep.remove();
    }

    function initSidebarDragSort(entries) {
      if (!entries || entries.length < 2) return;

      const slots = [];
      entries.forEach((entry) => {
        const $slot = $(
          '<span class="v2p-sidebar-slot" style="display:none;"></span>',
        );
        (entry.$sep.length ? entry.$sep : entry.$box).before($slot);
        slots.push($slot[0]);
      });

      const order = entries.map((entry) => entry.key);
      const byKey = {};
      entries.forEach((entry) => {
        byKey[entry.key] = entry;
      });

      function applyOrder(nextOrder) {
        const detached = {};
        entries.forEach((entry) => {
          detached[entry.key] = entry;
          entry.$sep.detach();
          entry.$box.detach();
        });
        nextOrder.forEach((key, index) => {
          const entry = detached[key];
          if (!entry) return;
          const $slot = $(slots[index]);
          if (entry.$sep.length) {
            $slot.after(entry.$sep);
            entry.$sep.after(entry.$box);
          } else {
            $slot.after(entry.$box);
          }
        });
        order.splice(0, order.length, ...nextOrder);
      }

      let savedOrder = null;
      try {
        savedOrder = JSON.parse(
          localStorage.getItem(SIDEBAR_ORDER_KEY) || "null",
        );
      } catch (e2) {
        savedOrder = null;
      }
      if (Array.isArray(savedOrder)) {
        const alias = {};
        SIDEBAR_SECTIONS.forEach((def) => {
          alias[def.key] = def.key;
          def.titles.forEach((title) => {
            alias[title] = def.key;
          });
        });
        const normalized = [];
        savedOrder.forEach((value) => {
          const key = alias[value] || (byKey[value] ? value : "");
          if (key && byKey[key] && normalized.indexOf(key) === -1) {
            normalized.push(key);
          }
        });
        order.forEach((key) => {
          if (normalized.indexOf(key) === -1) normalized.push(key);
        });
        if (normalized.length === order.length) applyOrder(normalized);
      }

      entries.forEach((entry) => {
        const $header = entry.$box.children(".cell, .inner").first();
        const $title = $header.find("span.fade, span.gray").first();
        if (!$title.length) return;
        const $handle = $(
          '<span class="v2p-sidebar-drag-handle" title="拖拽排序">' +
            SIDEBAR_DRAG_ICON +
            "</span>",
        );
        $title.before($handle);
        $handle.on("mousedown", function () {
          entry.$box.attr("draggable", "true");
        });
      });

      $(document).on("mouseup.v2pSidebarSort", function () {
        entries.forEach((entry) => entry.$box.removeAttr("draggable"));
      });

      let dragSrcKey = "";
      function clearDragStyles() {
        entries.forEach((entry) => {
          entry.$box
            .removeClass("v2p-drag-over-top v2p-drag-over-bottom")
            .removeAttr("draggable");
        });
      }
      function saveOrder() {
        try {
          localStorage.setItem(SIDEBAR_ORDER_KEY, JSON.stringify(order));
        } catch (e2) {
          // ignore
        }
      }

      entries.forEach((entry) => {
        const box = entry.$box[0];
        box.addEventListener("dragstart", function (e2) {
          if (box.getAttribute("draggable") !== "true") {
            e2.preventDefault();
            return;
          }
          dragSrcKey = entry.key;
          e2.dataTransfer.effectAllowed = "move";
          e2.dataTransfer.setData("text/plain", entry.key);
          setTimeout(() => box.classList.add("v2p-sidebar-dragging"), 0);
        });
        box.addEventListener("dragend", function () {
          box.classList.remove("v2p-sidebar-dragging");
          clearDragStyles();
          dragSrcKey = "";
        });
        box.addEventListener("dragover", function (e2) {
          if (!dragSrcKey || dragSrcKey === entry.key) return;
          e2.preventDefault();
          e2.dataTransfer.dropEffect = "move";
          const rect = box.getBoundingClientRect();
          const $box = $(box);
          $box.removeClass("v2p-drag-over-top v2p-drag-over-bottom");
          if (e2.clientY < rect.top + rect.height / 2) {
            $box.addClass("v2p-drag-over-top");
          } else {
            $box.addClass("v2p-drag-over-bottom");
          }
        });
        box.addEventListener("dragleave", function () {
          $(box).removeClass("v2p-drag-over-top v2p-drag-over-bottom");
        });
        box.addEventListener("drop", function (e2) {
          e2.stopPropagation();
          e2.preventDefault();
          if (!dragSrcKey || dragSrcKey === entry.key) return;
          const nextOrder = order.slice();
          const srcIndex = nextOrder.indexOf(dragSrcKey);
          if (srcIndex > -1) nextOrder.splice(srcIndex, 1);
          let targetIndex = nextOrder.indexOf(entry.key);
          if (targetIndex === -1) return;
          const rect = box.getBoundingClientRect();
          if (e2.clientY >= rect.top + rect.height / 2) targetIndex += 1;
          nextOrder.splice(targetIndex, 0, dragSrcKey);
          applyOrder(nextOrder);
          saveOrder();
          clearDragStyles();
          dragSrcKey = "";
        });
      });
    }

    function initSidebarEnhancements() {
      const $rightbar = $("#Rightbar");
      if (!$rightbar.length) return;
      if ($rightbar.attr("data-v2p-sidebar-init") === "1") return;
      $rightbar.attr("data-v2p-sidebar-init", "1");

      mergeCreateTopicToUserCard();

      const entries = [];
      SIDEBAR_SECTIONS.forEach((def) => {
        const $headerSpan = findSidebarHeader(def);
        if (!$headerSpan.length) return;
        const $box = $headerSpan.closest(".box");
        const $headerContainer = $headerSpan.closest(".cell, .inner");
        if (!$box.length || !$headerContainer.length) return;
        if ($box.attr("data-v2p-sortable")) return;
        if (def.key === "fav-nodes") {
          $headerSpan.removeClass("f12 gray").addClass("fade");
        }

        $box.attr("data-v2p-sortable", def.key);
        const $content = $box.children().not($headerContainer);
        const $toggle = $(
          '<a href="javascript:void(0);" class="v2p-sidebar-toggle" role="button" aria-label="折叠/展开" title="折叠/展开"></a>',
        );
        $headerSpan.append($toggle);

        const applyState = (isCollapsed) => {
          $toggle.attr("aria-expanded", isCollapsed ? "false" : "true");
          if (isCollapsed) {
            $content.hide();
            $toggle.html(SIDEBAR_ARROW_DOWN);
            $box.css("margin-bottom", "10px");
            $headerContainer.css("border-bottom", "none");
          } else {
            $content.show();
            $toggle.html(SIDEBAR_ARROW_UP);
            $box.css("margin-bottom", "");
            $headerContainer.css("border-bottom", "");
          }
          try {
            localStorage.setItem(def.storage, isCollapsed ? "1" : "0");
          } catch (e2) {
            // ignore
          }
        };
        $toggle.on("click", function (e2) {
          e2.preventDefault();
          e2.stopPropagation();
          applyState($content.is(":visible"));
        });

        let saved = false;
        try {
          saved = localStorage.getItem(def.storage) === "1";
        } catch (e2) {
          saved = false;
        }
        applyState(saved);
        entries.push({
          key: def.key,
          $box,
          $sep: $box.prev(".sep20, .sep"),
        });
      });

      entries.sort((a, b) => {
        if (a.$box[0] === b.$box[0]) return 0;
        return a.$box[0].compareDocumentPosition(b.$box[0]) &
          Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1;
      });
      initSidebarDragSort(entries);
    }

    // ---------- 顶部导航自定义（自 v2ex-H5 移植） ----------
    const NAV_CONFIG_KEY = "v2p_nav_config";
    const NAV_LAST_TAB_KEY = "v2p_last_tab_id";
    const NAV_DEFAULT_ORDER = [
      "/?tab=tech",
      "/?tab=creative",
      "/?tab=play",
      "/?tab=apple",
      "/?tab=jobs",
      "/?tab=deals",
      "/?tab=city",
      "/?tab=qna",
      "/?tab=hot",
      "/?tab=all",
      "/?tab=r2",
      "/xna",
      "/?tab=nodes",
      "/?tab=follow",
      "/planet",
    ];
    const NAV_DEFAULT_NAMES = {
      "/?tab=tech": "技术",
      "/?tab=creative": "创意",
      "/?tab=play": "好玩",
      "/?tab=apple": "Apple",
      "/?tab=jobs": "酷工作",
      "/?tab=deals": "交易",
      "/?tab=city": "城市",
      "/?tab=qna": "问与答",
      "/?tab=hot": "最热",
      "/?tab=all": "全部",
      "/?tab=r2": "R2",
      "/xna": "VXNA",
      "/?tab=nodes": "节点",
      "/?tab=follow": "关注",
      "/planet": "Planet",
    };
    // 图标路径与 v2ex-H5 的 TAB_ICONS 保持一致
    const NAV_ICONS = {
      技术: '<polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />',
      创意: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" />',
      好玩: '<line x1="6" x2="10" y1="12" y2="12" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="15" x2="15.01" y1="13" y2="13" /><line x1="18" x2="18.01" y1="11" y2="11" /><rect width="20" height="12" x="2" y="6" rx="2" />',
      Apple:
        '<svg width="14" height="14" viewBox="-1.5 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="currentColor" style="margin-right: 4px; opacity: 0.8;"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-102.000000, -7439.000000)" fill="currentColor"><g transform="translate(56.000000, 160.000000)"><path d="M57.5708873,7282.19296 C58.2999598,7281.34797 58.7914012,7280.17098 58.6569121,7279 C57.6062792,7279.04 56.3352055,7279.67099 55.5818643,7280.51498 C54.905374,7281.26397 54.3148354,7282.46095 54.4735932,7283.60894 C55.6455696,7283.69593 56.8418148,7283.03894 57.5708873,7282.19296 M60.1989864,7289.62485 C60.2283111,7292.65181 62.9696641,7293.65879 63,7293.67179 C62.9777537,7293.74279 62.562152,7295.10677 61.5560117,7296.51675 C60.6853718,7297.73474 59.7823735,7298.94772 58.3596204,7298.97372 C56.9621472,7298.99872 56.5121648,7298.17973 54.9134635,7298.17973 C53.3157735,7298.17973 52.8162425,7298.94772 51.4935978,7298.99872 C50.1203933,7299.04772 49.0738052,7297.68074 48.197098,7296.46676 C46.4032359,7293.98379 45.0330649,7289.44985 46.8734421,7286.3899 C47.7875635,7284.87092 49.4206455,7283.90793 51.1942837,7283.88393 C52.5422083,7283.85893 53.8153044,7284.75292 54.6394294,7284.75292 C55.4635543,7284.75292 57.0106846,7283.67793 58.6366882,7283.83593 C59.3172232,7283.86293 61.2283842,7284.09893 62.4549652,7285.8199 C62.355868,7285.8789 60.1747177,7287.09489 60.1989864,7289.62485"></path></g></g></g></svg>',
      酷工作:
        '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" />',
      交易: '<path d="m21 16-2 6H5l-2-6" /><path d="M3 6v10c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V6" /><path d="M10 6V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />',
      城市: '<rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" />',
      问与答:
        '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />',
      最热: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.1.243-2.143.5-3.5a6 6 0 0 1 1.5-2.5c-.002 1.25.502 2.5 1.5 3.5.5.5 1 1.5 1 3a2 2 0 0 1-2 2z" />',
      全部: '<rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />',
      R2: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" x2="12" y1="22.08" y2="12" />',
      VXNA: '<path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" />',
      节点: '<line x1="4" x2="20" y1="9" y2="9" /><line x1="4" x2="20" y1="15" y2="15" /><line x1="10" x2="8" y1="3" y2="21" /><line x1="16" x2="14" y1="3" y2="21" />',
      关注: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />',
    };
    const NAV_GEAR_ICON =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';
    const NAV_DRAG_ICON =
      '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>';
    const NAV_ARROW_UP =
      '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>';
    const NAV_ARROW_DOWN =
      '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

    let navMenuEl = null;

    function readNavConfig() {
      try {
        const raw = localStorage.getItem(NAV_CONFIG_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        const result = [];
        parsed.forEach((item) => {
          if (!item || typeof item.href !== "string") return;
          const href = item.href.trim();
          if (!href) return;
          result.push({
            name: typeof item.name === "string" ? item.name : href,
            href,
            visible: item.visible !== false,
          });
        });
        return result;
      } catch (e2) {
        return null;
      }
    }

    function writeNavConfig(config) {
      try {
        localStorage.setItem(NAV_CONFIG_KEY, JSON.stringify(config));
      } catch (e2) {
        // localStorage 不可用时忽略，配置仅在本次会话生效
      }
    }

    function getNavTabLinks(tabsEl) {
      if (!tabsEl) return [];
      return Array.from(tabsEl.children).filter(
        (el) =>
          el.tagName === "A" &&
          (el.classList.contains("tab") ||
            el.classList.contains("tab_current") ||
            el.getAttribute("href") === "/planet"),
      );
    }

    function getNavTabName(el) {
      const text = (el.textContent || "").trim();
      if (text) return text;
      if (el.getAttribute("href") === "/planet") return "Planet";
      return "";
    }

    function normalizeNavConfig(config, links) {
      const linkMap = new Map();
      links.forEach((el) => {
        const href = el.getAttribute("href");
        if (href && !linkMap.has(href)) linkMap.set(href, el);
      });
      const next = [];
      const seen = new Set();
      (config || []).forEach((item) => {
        if (!item || !item.href || seen.has(item.href)) return;
        seen.add(item.href);
        const el = linkMap.get(item.href);
        const domName = el ? getNavTabName(el) : "";
        next.push({
          name: domName || item.name || NAV_DEFAULT_NAMES[item.href] || item.href,
          href: item.href,
          visible: item.visible !== false,
        });
      });
      links.forEach((el) => {
        const href = el.getAttribute("href");
        if (!href || seen.has(href)) return;
        const name = getNavTabName(el);
        if (!name) return;
        seen.add(href);
        next.push({ name, href, visible: true });
      });
      return next;
    }

    function buildDefaultNavConfig(links) {
      const linkMap = new Map();
      links.forEach((el) => {
        const href = el.getAttribute("href");
        if (href && !linkMap.has(href)) linkMap.set(href, el);
      });
      const result = [];
      const seen = new Set();
      NAV_DEFAULT_ORDER.forEach((href) => {
        const el = linkMap.get(href);
        // 重置只保留当前页面实际存在的导航项，登录后才出现的项由 normalize 自动补入
        if (!el) return;
        seen.add(href);
        result.push({
          name: (el && getNavTabName(el)) || NAV_DEFAULT_NAMES[href] || href,
          href,
          visible: true,
        });
      });
      links.forEach((el) => {
        const href = el.getAttribute("href");
        if (!href || seen.has(href)) return;
        const name = getNavTabName(el);
        if (!name) return;
        seen.add(href);
        result.push({ name, href, visible: true });
      });
      return result;
    }

    function applyNavIcon(el, name) {
      if (!el || el.querySelector("img")) return;
      const icon = NAV_ICONS[name];
      if (!icon) return;
      if (el.getAttribute("data-v2p-nav-icon") === name) return;
      el.querySelectorAll("svg.v2p-nav-icon").forEach((node) => node.remove());
      const html = icon.trim().startsWith("<svg")
        ? icon.replace(
            "<svg ",
            '<svg class="v2p-nav-icon" aria-hidden="true" focusable="false" ',
          )
        : '<svg class="v2p-nav-icon" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          icon +
          "</svg>";
      el.insertAdjacentHTML("afterbegin", html);
      el.setAttribute("data-v2p-nav-icon", name);
    }

    function syncNavActive(tabsEl, links) {
      const tabParam = new URLSearchParams(location.search).get("tab");
      const toNavValue = (el) => {
        try {
          const url2 = new URL(el.getAttribute("href"), location.origin);
          return { tab: url2.searchParams.get("tab"), path: url2.pathname };
        } catch (e2) {
          return { tab: null, path: "" };
        }
      };
      let active = tabsEl.querySelector(".tab_current");
      if (!active) {
        let target = null;
        if (tabParam) {
          target = links.find((el) => toNavValue(el).tab === tabParam) || null;
        }
        if (!target) {
          target =
            links.find(
              (el) =>
                toNavValue(el).path === location.pathname &&
                !toNavValue(el).tab,
            ) || null;
        }
        if (!target && !tabParam) {
          let last = "";
          try {
            last = localStorage.getItem(NAV_LAST_TAB_KEY) || "";
          } catch (e2) {
            last = "";
          }
          if (last) {
            target =
              links.find(
                (el) =>
                  toNavValue(el).tab === last || toNavValue(el).path === last,
              ) || null;
          }
        }
        if (target) {
          links.forEach((el) => el.classList.remove("tab_current"));
          target.classList.add("tab_current");
          active = target;
        }
      }
      try {
        if (tabParam) {
          localStorage.setItem(NAV_LAST_TAB_KEY, tabParam);
        } else if (active) {
          const value = toNavValue(active);
          if (value.tab) localStorage.setItem(NAV_LAST_TAB_KEY, value.tab);
          else if (value.path && value.path !== "/") {
            localStorage.setItem(NAV_LAST_TAB_KEY, value.path);
          }
        }
      } catch (e2) {
        // 忽略
      }
    }

    function applyNavCustomize() {
      const tabsEl = document.getElementById("Tabs");
      if (!tabsEl) return null;
      const links = getNavTabLinks(tabsEl);
      if (!links.length) return null;
      const config = normalizeNavConfig(readNavConfig(), links);
      const linkMap = new Map();
      links.forEach((el) => {
        const href = el.getAttribute("href");
        if (href && !linkMap.has(href)) linkMap.set(href, el);
      });
      // 找到第一个非 tab 节点作为锚点，保证 Planet 后的 &nbsp; 等原始节点不被移动
      let anchor = null;
      Array.from(tabsEl.childNodes).some((node) => {
        if (node.nodeType === 1 && linkMap.has(node.getAttribute("href"))) {
          return false;
        }
        anchor = node;
        return true;
      });
      config.forEach((item) => {
        const el = linkMap.get(item.href);
        if (!el) return;
        if (anchor && anchor.parentNode === tabsEl) {
          tabsEl.insertBefore(el, anchor);
        } else {
          tabsEl.appendChild(el);
        }
        el.style.display = item.visible ? "" : "none";
        el.setAttribute("aria-hidden", item.visible ? "false" : "true");
        if (item.visible) applyNavIcon(el, item.name);
      });
      writeNavConfig(config);
      syncNavActive(tabsEl, links);
      return config;
    }

    function moveNavItem(config, fromIndex, direction) {
      const toIndex = fromIndex + direction;
      if (toIndex < 0 || toIndex >= config.length) return;
      const next = config.slice();
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      config.splice(0, config.length, ...next);
    }

    function renderNavMenuList(listEl, config) {
      listEl.innerHTML = "";
      let dragIndex = null;
      const clearDropStyles = () => {
        listEl
          .querySelectorAll(".v2p-nav-drop-before, .v2p-nav-drop-after")
          .forEach((node) => {
            node.classList.remove("v2p-nav-drop-before", "v2p-nav-drop-after");
          });
      };
      config.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "v2p-nav-menu-item";
        row.draggable = false;

        const handle = document.createElement("span");
        handle.className = "v2p-nav-drag-handle";
        handle.title = "拖拽排序";
        handle.setAttribute("aria-hidden", "true");
        handle.innerHTML = NAV_DRAG_ICON;
        handle.addEventListener("mousedown", () => {
          row.draggable = true;
        });

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = item.visible;
        checkbox.setAttribute("aria-label", "显示 " + item.name);
        checkbox.addEventListener("change", () => {
          item.visible = checkbox.checked;
          writeNavConfig(config);
          applyNavCustomize();
        });

        const name = document.createElement("span");
        name.className = "v2p-nav-menu-name";
        name.textContent = item.name;

        const moveGroup = document.createElement("span");
        moveGroup.className = "v2p-nav-move-group";

        const up = document.createElement("button");
        up.type = "button";
        up.className = "v2p-nav-move-btn";
        up.title = "上移";
        up.setAttribute("aria-label", "上移 " + item.name);
        up.innerHTML = NAV_ARROW_UP;
        up.disabled = index === 0;
        up.addEventListener("click", () => {
          moveNavItem(config, index, -1);
          writeNavConfig(config);
          applyNavCustomize();
          renderNavMenuList(listEl, config);
        });

        const down = document.createElement("button");
        down.type = "button";
        down.className = "v2p-nav-move-btn";
        down.title = "下移";
        down.setAttribute("aria-label", "下移 " + item.name);
        down.innerHTML = NAV_ARROW_DOWN;
        down.disabled = index === config.length - 1;
        down.addEventListener("click", () => {
          moveNavItem(config, index, 1);
          writeNavConfig(config);
          applyNavCustomize();
          renderNavMenuList(listEl, config);
        });

        moveGroup.append(up, down);
        row.append(handle, checkbox, name, moveGroup);

        row.addEventListener("dragstart", (e2) => {
          dragIndex = index;
          row.classList.add("v2p-nav-dragging");
          e2.dataTransfer.effectAllowed = "move";
          try {
            e2.dataTransfer.setData("text/plain", String(index));
          } catch (e3) {
            // 忽略
          }
        });
        row.addEventListener("dragover", (e2) => {
          if (dragIndex == null || dragIndex === index) return;
          e2.preventDefault();
          const rect = row.getBoundingClientRect();
          const dropAfter = e2.clientY >= rect.top + rect.height / 2;
          clearDropStyles();
          row.classList.add(
            dropAfter ? "v2p-nav-drop-after" : "v2p-nav-drop-before",
          );
        });
        row.addEventListener("drop", (e2) => {
          if (dragIndex == null || dragIndex === index) return;
          e2.preventDefault();
          e2.stopPropagation();
          const rect = row.getBoundingClientRect();
          const dropAfter = e2.clientY >= rect.top + rect.height / 2;
          const targetIndex = index + (dropAfter ? 1 : 0);
          const [moved] = config.splice(dragIndex, 1);
          config.splice(
            targetIndex > dragIndex ? targetIndex - 1 : targetIndex,
            0,
            moved,
          );
          dragIndex = null;
          clearDropStyles();
          writeNavConfig(config);
          applyNavCustomize();
          renderNavMenuList(listEl, config);
        });
        row.addEventListener("dragend", () => {
          row.draggable = false;
          row.classList.remove("v2p-nav-dragging");
          clearDropStyles();
          dragIndex = null;
        });

        listEl.appendChild(row);
      });
    }

    function closeNavMenu() {
      if (navMenuEl) {
        navMenuEl.remove();
        navMenuEl = null;
      }
      document.removeEventListener("click", onNavMenuDocClick, true);
      document.removeEventListener("keydown", onNavMenuKeydown, true);
      window.removeEventListener("scroll", onNavMenuScroll, true);
      window.removeEventListener("resize", closeNavMenu);
    }

    function onNavMenuScroll(e2) {
      if (!navMenuEl) return;
      // 面板内部列表滚动不关闭，仅响应页面滚动
      if (e2.target && e2.target !== document && navMenuEl.contains(e2.target)) {
        return;
      }
      closeNavMenu();
    }

    function onNavMenuDocClick(e2) {
      if (!navMenuEl) return;
      const target = e2.target;
      if (navMenuEl.contains(target)) return;
      if (target.closest && target.closest(".v2p-nav-settings-btn")) return;
      closeNavMenu();
    }

    function onNavMenuKeydown(e2) {
      if (e2.key === "Escape") closeNavMenu();
    }

    function openNavMenu() {
      if (navMenuEl) {
        closeNavMenu();
        return;
      }
      const tabsEl = document.getElementById("Tabs");
      const btn = tabsEl && tabsEl.querySelector(".v2p-nav-settings-btn");
      if (!btn) return;
      const config = applyNavCustomize();
      if (!config) return;

      const menu = document.createElement("div");
      menu.id = "v2p-nav-menu";
      menu.setAttribute("role", "dialog");
      menu.setAttribute("aria-label", "自定义导航");

      const header = document.createElement("div");
      header.className = "v2p-nav-menu-header";
      const title = document.createElement("span");
      title.className = "v2p-nav-menu-title";
      title.textContent = "导航栏自定义";
      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "v2p-nav-menu-reset";
      reset.textContent = "恢复默认";
      reset.addEventListener("click", () => {
        const links = getNavTabLinks(tabsEl);
        const next = buildDefaultNavConfig(links);
        writeNavConfig(next);
        const applied = applyNavCustomize() || next;
        renderNavMenuList(listEl, applied);
      });
      header.append(title, reset);

      const listEl = document.createElement("div");
      listEl.className = "v2p-nav-menu-list";
      renderNavMenuList(listEl, config);

      const hint = document.createElement("div");
      hint.className = "v2p-nav-menu-hint";
      hint.textContent = "拖动或使用箭头调整顺序；取消勾选可隐藏。";

      menu.append(header, listEl, hint);
      document.body.appendChild(menu);
      navMenuEl = menu;

      const rect = btn.getBoundingClientRect();
      const menuWidth = menu.offsetWidth || 260;
      let left = rect.right - menuWidth;
      left = Math.max(10, Math.min(left, window.innerWidth - menuWidth - 10));
      let top = rect.bottom + 6;
      if (top + menu.offsetHeight > window.innerHeight - 10) {
        top = Math.max(10, rect.top - menu.offsetHeight - 6);
      }
      menu.style.left = left + "px";
      menu.style.top = top + "px";

      setTimeout(() => {
        if (navMenuEl !== menu) return;
        document.addEventListener("click", onNavMenuDocClick, true);
        document.addEventListener("keydown", onNavMenuKeydown, true);
        window.addEventListener("scroll", onNavMenuScroll, true);
        window.addEventListener("resize", closeNavMenu);
      }, 0);
    }

    function initTopTabsCustomize() {
      const tabsEl = document.getElementById("Tabs");
      if (!tabsEl) return;
      if (tabsEl.getAttribute("data-v2p-nav-init") === "1") return;
      tabsEl.setAttribute("data-v2p-nav-init", "1");

      applyNavCustomize();

      const btn = document.createElement("span");
      btn.className = "v2p-nav-settings-btn";
      btn.title = "自定义导航";
      btn.setAttribute("role", "button");
      btn.setAttribute("tabindex", "0");
      btn.setAttribute("aria-haspopup", "dialog");
      btn.innerHTML = NAV_GEAR_ICON;
      btn.addEventListener("click", (e2) => {
        e2.preventDefault();
        e2.stopPropagation();
        openNavMenu();
      });
      btn.addEventListener("keydown", (e2) => {
        if (e2.key === "Enter" || e2.key === " ") {
          e2.preventDefault();
          openNavMenu();
        }
      });
      tabsEl.appendChild(btn);

      // 记录点击的 tab，供「上次选中项」兜底高亮使用
      tabsEl.addEventListener("click", (e2) => {
        const link =
          e2.target.closest &&
          e2.target.closest("a.tab, a.tab_current, a[href='/planet']");
        if (!link || !tabsEl.contains(link)) return;
        try {
          const url2 = new URL(link.getAttribute("href"), location.origin);
          const tab = url2.searchParams.get("tab");
          localStorage.setItem(NAV_LAST_TAB_KEY, tab || url2.pathname);
        } catch (e3) {
          // 忽略
        }
      });
    }

    // ---------- 回复增强：Base64 工具 / 点击 @ 跳楼层 / YOU 徽章 ----------
    const REPLY_FLOOR_PAGE_SIZE = 100;
    const REPLY_FLOOR_PARAM = "v2p_floor";
    const BASE64_EXCLUDE_WORDS = new Set([
      "boss",
      "bilibili",
      "Bilibili",
      "Encrypto",
      "encrypto",
      "Window10",
      "airpords",
      "Windows7",
    ]);
    let replyEnhanceTimer = 0;

    function showReplyMessage(type, text) {
      eventBus.emit(CMD.SHOW_MSG, { type, text });
    }

    function copyTextToClipboard(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).catch(() => {
          fallbackCopyText(text);
        });
      }
      fallbackCopyText(text);
      return Promise.resolve();
    }

    function fallbackCopyText(text) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch (e2) {
        // 忽略复制失败
      }
      textarea.remove();
    }

    function insertTextIntoReplyEditor(text) {
      const editors = Array.from(
        document.querySelectorAll("textarea.post-editor"),
      );
      const editor =
        editors.find((item) => item.offsetParent !== null) || editors[0];
      if (!editor) return false;
      const start =
        typeof editor.selectionStart === "number"
          ? editor.selectionStart
          : editor.value.length;
      const end =
        typeof editor.selectionEnd === "number"
          ? editor.selectionEnd
          : start;
      editor.value =
        editor.value.slice(0, start) + text + editor.value.slice(end);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.focus();
      const cursor = start + text.length;
      try {
        editor.setSelectionRange(cursor, cursor);
      } catch (e2) {
        // 忽略
      }
      return true;
    }

    function customEscapeBase64Text(str) {
      return str.replace(
        /[^a-zA-Z0-9_.!~*'()-]/g,
        (c) =>
          `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
      );
    }

    function tryDecodeBase64Candidate(text) {
      if (!text || text.length <= 8 || text.length % 4 !== 0) return "";
      if (BASE64_EXCLUDE_WORDS.has(text)) return "";
      if (text.includes("=")) {
        const paddingIndex = text.indexOf("=");
        if (
          paddingIndex !== text.length - 1 &&
          paddingIndex !== text.length - 2
        ) {
          return "";
        }
      }
      try {
        let decoded = decodeURIComponent(
          customEscapeBase64Text(window.atob(text)),
        );
        // 兼容 btoa(encodeURIComponent(...)) 生成的双重编码字符串
        if (/^(?:%[0-9A-Fa-f]{2})+$/.test(decoded)) {
          try {
            decoded = decodeURIComponent(decoded);
          } catch (e3) {
            // 保留第一次解码结果
          }
        }
        // 过滤解码后包含控制字符或明显为空的结果
        if (
          !decoded ||
          /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(decoded)
        ) {
          return "";
        }
        return decoded;
      } catch (e2) {
        return "";
      }
    }

    function decodeBase64InElement(root) {
      let count = 0;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (
            parent.closest("a, script, style, img, .v2p-b64-decoded")
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      textNodes.forEach((node) => {
        const text = node.nodeValue || "";
        const regex = /[A-Za-z0-9+/=]+/g;
        let lastIndex = 0;
        let matched = false;
        let match;
        const fragment = document.createDocumentFragment();
        while ((match = regex.exec(text))) {
          const candidate = match[0];
          const decoded = tryDecodeBase64Candidate(candidate);
          if (!decoded) continue;
          matched = true;
          count += 1;
          fragment.appendChild(
            document.createTextNode(text.slice(lastIndex, match.index)),
          );
          const wrapper = document.createElement("span");
          wrapper.className = "v2p-b64-decoded";
          wrapper.appendChild(document.createTextNode(candidate));
          const decodedNode = document.createElement("ins");
          decodedNode.className = "v2p-b64-decoded-text";
          decodedNode.title = "点击复制";
          decodedNode.dataset.v2pDecoded = decoded;
          decodedNode.textContent = `(${decoded})`;
          decodedNode.addEventListener("click", (e2) => {
            e2.preventDefault();
            e2.stopPropagation();
            void copyTextToClipboard(decoded);
            showReplyMessage("success", "已复制解码结果");
          });
          wrapper.appendChild(decodedNode);
          fragment.appendChild(wrapper);
          lastIndex = match.index + candidate.length;
        }
        if (!matched) return;
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex)),
        );
        node.parentNode.replaceChild(fragment, node);
      });
      return count;
    }

    function decodeBase64Page() {
      const roots = document.querySelectorAll(
        ".post-detail .topic_content, .post-detail .reply_content",
      );
      let count = 0;
      roots.forEach((root) => {
        count += decodeBase64InElement(root);
      });
      if (count > 0) {
        showReplyMessage(
          "success",
          `已解析本页所有 Base64 字符串，共 ${count} 条`,
        );
      } else if (document.querySelector(".post-detail .v2p-b64-decoded")) {
        showReplyMessage("success", "已解析完本页所有 Base64 字符串");
      } else {
        showReplyMessage("warning", "本页未发现可解析的 Base64 字符串");
      }
    }

    function encodeBase64FromPrompt() {
      const text = window.prompt(
        "输入要转换为 Base64 的字符串，完成后将插入到回复框：",
      );
      if (!text) return;
      let encoded = "";
      try {
        const bytes = new TextEncoder().encode(text);
        let binary = "";
        bytes.forEach((byte) => {
          binary += String.fromCharCode(byte);
        });
        encoded = window.btoa(binary);
      } catch (e2) {
        showReplyMessage("error", "该文本无法编码为 Base64");
        return;
      }
      if (insertTextIntoReplyEditor(encoded)) {
        showReplyMessage("success", "已插入到回复框");
      } else {
        void copyTextToClipboard(encoded);
        showReplyMessage("success", "回复框未打开，已复制到剪贴板");
      }
    }

    let base64MenuEl = null;
    let base64MenuAnchor = null;

    function getBase64Menu() {
      if (base64MenuEl && base64MenuEl.isConnected) return base64MenuEl;
      const menu = document.createElement("div");
      menu.id = "v2p-b64-menu";
      menu.className = "v2p-b64-menu";
      menu.setAttribute("role", "menu");
      const decodeItem = document.createElement("button");
      decodeItem.type = "button";
      decodeItem.setAttribute("role", "menuitem");
      decodeItem.dataset.v2pB64 = "decode";
      decodeItem.textContent = "解析本页 Base64";
      const encodeItem = document.createElement("button");
      encodeItem.type = "button";
      encodeItem.setAttribute("role", "menuitem");
      encodeItem.dataset.v2pB64 = "encode";
      encodeItem.textContent = "文本转 Base64";
      menu.append(decodeItem, encodeItem);
      document.body.appendChild(menu);
      base64MenuEl = menu;
      return menu;
    }

    function hideBase64Menu() {
      if (!base64MenuEl) return;
      base64MenuEl.classList.remove("show");
      base64MenuEl.style.left = "";
      base64MenuEl.style.top = "";
      if (base64MenuAnchor) {
        base64MenuAnchor.setAttribute("aria-expanded", "false");
        base64MenuAnchor = null;
      }
    }

    function toggleBase64Menu(button) {
      const menu = getBase64Menu();
      if (
        menu.classList.contains("show") &&
        base64MenuAnchor === button
      ) {
        hideBase64Menu();
        return;
      }
      const rect = button.getBoundingClientRect();
      menu.style.left = "0px";
      menu.style.top = "0px";
      menu.classList.add("show");
      const menuRect = menu.getBoundingClientRect();
      const gap = 8;
      let left = 0;
      let top = 0;
      if (button.classList.contains("v2p-b64-dock-btn")) {
        left = rect.left - menuRect.width - gap;
        top = rect.top + rect.height / 2 - menuRect.height / 2;
        if (left < 8) left = rect.right + gap;
        if (top + menuRect.height > window.innerHeight - 8) {
          top = window.innerHeight - menuRect.height - 8;
        }
      } else {
        left = rect.right - menuRect.width;
        top = rect.bottom + gap;
        if (top + menuRect.height > window.innerHeight - 8) {
          top = rect.top - menuRect.height - gap;
        }
      }
      left = Math.max(
        8,
        Math.min(left, window.innerWidth - menuRect.width - 8),
      );
      top = Math.max(
        8,
        Math.min(top, window.innerHeight - menuRect.height - 8),
      );
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
      if (base64MenuAnchor && base64MenuAnchor !== button) {
        base64MenuAnchor.setAttribute("aria-expanded", "false");
      }
      button.setAttribute("aria-expanded", "true");
      base64MenuAnchor = button;
      const firstItem = menu.querySelector("button");
      if (firstItem) firstItem.focus({ preventScroll: true });
    }

    function createBase64Button(className) {
      const button = document.createElement("div");
      button.className = className;
      button.title = "Base64 工具";
      button.setAttribute("role", "button");
      button.setAttribute("tabindex", "0");
      button.setAttribute("aria-haspopup", "menu");
      button.setAttribute("aria-expanded", "false");
      button.textContent = "B64";
      button.addEventListener("click", (e2) => {
        e2.preventDefault();
        e2.stopPropagation();
        toggleBase64Menu(button);
      });
      button.addEventListener("keydown", (e2) => {
        if (e2.key === "Enter" || e2.key === " ") {
          e2.preventDefault();
          e2.stopPropagation();
          toggleBase64Menu(button);
        }
      });
      return button;
    }

    function ensureBase64Tools() {
      document
        .querySelectorAll(".post-detail-top-actions")
        .forEach((bar) => {
          if (bar.querySelector(".v2p-b64-btn")) return;
          bar.appendChild(
            createBase64Button("top-action-btn v2p-b64-btn"),
          );
        });
      document
        .querySelectorAll(".post-detail-floating-dock")
        .forEach((dock) => {
          if (dock.querySelector(".v2p-b64-dock-btn")) return;
          const button = createBase64Button(
            "dock-btn v2p-b64-btn v2p-b64-dock-btn",
          );
          const closeButton = dock.querySelector(".dock-close");
          if (closeButton) {
            closeButton.before(button);
          } else {
            dock.appendChild(button);
          }
        });
    }

    function applyOwnReplyBadges() {
      const loginName = window.user && window.user.username;
      if (!loginName) return;
      document
        .querySelectorAll("#app .comment, #app .top-sub-comment")
        .forEach((comment) => {
          const usernameEl = comment.querySelector("a.username");
          if (!usernameEl) return;
          const isSelf = usernameEl.textContent.trim() === loginName;
          const next = usernameEl.nextElementSibling;
          const hasBadge =
            next && next.classList.contains("v2p-you-badge");
          if (isSelf) {
            if (hasBadge) return;
            const badge = document.createElement("span");
            badge.className = "v2p-you-badge";
            badge.title = "这是你的回复";
            badge.textContent = "YOU";
            usernameEl.insertAdjacentElement("afterend", badge);
          } else if (hasBadge) {
            next.remove();
          }
        });
    }

    function getCurrentTopicId() {
      if (window.pageType === PageType.Post && window.pageData.id) {
        return String(window.pageData.id);
      }
      const votes = document.querySelector(
        '.post-detail [id^="topic_"][id$="_votes"]',
      );
      const matched = votes && votes.id.match(/^topic_(\d+)_votes$/);
      return matched ? matched[1] : "";
    }

    function jumpToReplyFloorInPage(floor) {
      // 高赞副本同样是 .comment[data-floor]，但没有 c_<楼层> 类；
      // 优先选择回复列表中的原始楼层。
      const target =
        document.querySelector(`#app .comment.c_${floor}`) ||
        Array.from(
          document.querySelectorAll(`#app [data-floor="${floor}"]`),
        ).find((el) => !el.closest(".top-reply")) ||
        document.querySelector(`#app [data-floor="${floor}"]`);
      if (!target) return false;
      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
      target.classList.add("v2p-floor-flash");
      clearTimeout(target.__v2pFloorFlashTimer);
      target.__v2pFloorFlashTimer = setTimeout(() => {
        target.classList.remove("v2p-floor-flash");
      }, 1800);
      return true;
    }

    function requestReplyFloorJump(floor) {
      if (jumpToReplyFloorInPage(floor)) return true;
      const currentPage =
        window.pageType === PageType.Post
          ? Number(window.pageData.pageNo) || 1
          : 1;
      const targetPage = Math.max(
        1,
        Math.ceil(floor / REPLY_FLOOR_PAGE_SIZE),
      );
      if (targetPage === currentPage) {
        showReplyMessage("warning", `本页没有第 ${floor} 楼`);
        return false;
      }
      const topicId = getCurrentTopicId();
      if (!topicId) {
        showReplyMessage(
          "warning",
          `第 ${floor} 楼在第 ${targetPage} 页，请翻页查看`,
        );
        return false;
      }
      const url =
        `${location.origin}/t/${topicId}?p=${targetPage}` +
        `&${REPLY_FLOOR_PARAM}=${floor}`;
      if (window.pageType === PageType.Post) {
        showReplyMessage(
          "success",
          `第 ${floor} 楼在第 ${targetPage} 页，正在前往…`,
        );
        location.href = url;
      } else {
        try {
          functions.openNewTab(url, true);
        } catch (e2) {
          window.open(url, "_blank");
        }
        showReplyMessage(
          "success",
          `第 ${floor} 楼在第 ${targetPage} 页，已为您打开`,
        );
      }
      return true;
    }

    function getFloorAfterMemberLink(comment, link) {
      const contentRoot = link.closest(".reply_content");
      if (!contentRoot) return 0;
      const walker = document.createTreeWalker(
        contentRoot,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      );
      let started = false;
      let text = "";
      let node = walker.nextNode();
      while (node) {
        if (!started) {
          if (node === link) started = true;
          node = walker.nextNode();
          continue;
        }
        if (node.nodeType === 1) {
          if (
            node.matches &&
            node.matches('a[href^="/member/"]')
          ) {
            break;
          }
          node = walker.nextNode();
          continue;
        }
        text += node.nodeValue || "";
        const matched = text.match(/#(\d+)/);
        if (matched) return Number(matched[1]);
        node = walker.nextNode();
      }
      return 0;
    }

    function findPreviousReplyFloor(comment, username) {
      // 楼中楼会改变 DOM 顺序，这里按楼层号找当前回复之前最近的一条同用户回复
      const currentFloor = Number(comment.dataset.floor) || 0;
      let result = 0;
      document
        .querySelectorAll("#app .comment[data-floor]")
        .forEach((item) => {
          if (item.closest(".top-reply")) return;
          const floor = Number(item.dataset.floor) || 0;
          if (!floor || floor >= currentFloor || floor <= result) return;
          // 忽略没有 c_<楼层> 的高赞副本
          if (!item.classList.contains(`c_${floor}`)) return;
          const userEl = item.querySelector("a.username");
          if (userEl && userEl.textContent.trim() === username) {
            result = floor;
          }
        });
      return result;
    }

    function applyPendingFloorJump() {
      if (window.pageType !== PageType.Post) return;
      let floor = 0;
      try {
        const url = new URL(location.href);
        const raw = url.searchParams.get(REPLY_FLOOR_PARAM);
        if (!raw) return;
        floor = Number(raw);
        if (!Number.isFinite(floor) || floor < 1) return;
        url.searchParams.delete(REPLY_FLOOR_PARAM);
        history.replaceState(
          null,
          "",
          url.pathname + url.search + url.hash,
        );
      } catch (e2) {
        return;
      }
      let tries = 0;
      const timer = setInterval(() => {
        tries += 1;
        if (jumpToReplyFloorInPage(floor)) {
          clearInterval(timer);
          return;
        }
        if (tries >= 60) {
          clearInterval(timer);
          showReplyMessage(
            "warning",
            `未能找到第 ${floor} 楼，可能已被隐藏或删除`,
          );
        }
      }, 250);
    }

    function scheduleReplyEnhancements() {
      clearTimeout(replyEnhanceTimer);
      replyEnhanceTimer = setTimeout(() => {
        ensureBase64Tools();
        applyOwnReplyBadges();
      }, 80);
    }

    function initReplyEnhancements() {
      const root = document.documentElement;
      if (root.getAttribute("data-v2p-reply-enhance-init") === "1") return;
      root.setAttribute("data-v2p-reply-enhance-init", "1");

      // 点击 @ 用户时尝试直达被回复楼层。
      // 必须在捕获阶段处理：Vue 的 .main 会在冒泡阶段阻止事件继续向外传播。
      document.addEventListener(
        "click",
        function (e2) {
          const target = e2.target;
          if (!target || !target.closest) return;
          const link = target.closest(
            '.post-detail .reply_content a[href^="/member/"]',
          );
          if (!link) return;
          if (e2.ctrlKey || e2.metaKey || e2.shiftKey || e2.altKey) return;
          // 楼中楼 / 高赞副本取最近的 data-floor 节点，避免取到父级楼层
          const comment = link.closest("[data-floor]");
          if (!comment) return;
          const username = link.textContent.trim().replace(/^@/, "");
          if (!username) return;
          let floor = getFloorAfterMemberLink(comment, link);
          if (!floor) {
            floor = findPreviousReplyFloor(comment, username);
          }
          if (!floor) return;
          e2.preventDefault();
          e2.stopPropagation();
          hideBase64Menu();
          requestReplyFloorJump(floor);
        },
        true,
      );

      // 点击菜单外部时关闭 Base64 菜单（捕获阶段，避免被 .main 拦截）
      document.addEventListener(
        "click",
        function (e2) {
          const target = e2.target;
          if (!target || !target.closest) return;
          if (
            target.closest(".v2p-b64-menu") ||
            target.closest(".v2p-b64-btn")
          ) {
            return;
          }
          hideBase64Menu();
        },
        true,
      );

      document.addEventListener("click", function (e2) {
        const target = e2.target;
        if (!target || !target.closest) return;
        const b64Action = target.closest("[data-v2p-b64]");
        if (!b64Action) return;
        e2.preventDefault();
        e2.stopPropagation();
        hideBase64Menu();
        if (b64Action.dataset.v2pB64 === "decode") {
          decodeBase64Page();
        } else {
          encodeBase64FromPrompt();
        }
      });

      document.addEventListener(
        "keydown",
        function (e2) {
          if (e2.key !== "Escape") return;
          if (
            !base64MenuEl ||
            !base64MenuEl.classList.contains("show")
          ) {
            return;
          }
          // 菜单打开时只关闭菜单，避免同时触发详情弹框的 Esc 关闭
          e2.preventDefault();
          e2.stopPropagation();
          const anchor = base64MenuAnchor;
          hideBase64Menu();
          if (anchor) anchor.focus({ preventScroll: true });
        },
        true,
      );
      window.addEventListener("resize", hideBase64Menu);
      document.addEventListener("scroll", hideBase64Menu, true);

      const observer = new MutationObserver(scheduleReplyEnhancements);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      scheduleReplyEnhancements();
      applyPendingFloorJump();
    }

    // ---------- 成员悬浮卡（自 v2ex-H5 移植） ----------
    const MEMBER_CARD_ID = "v2p-member-card";
    const MEMBER_CACHE = new Map();
    const MEMBER_TRIGGER_SELECTOR =
      "#app a.username, #app a.avatar, #app .header a[href^='/member/']";
    const MEMBER_HOVER_DELAY = 350;
    const MEMBER_CARD_CLOSE_DELAY = 180;

    let memberCardEl = null;
    let memberCardTrigger = null;
    let memberCardUsername = "";
    let memberCardAbort = null;
    let memberCardOpenTimer = 0;
    let memberCardCloseTimer = 0;

    function getMemberNameFromTrigger(trigger) {
      const href = trigger.getAttribute("href") || "";
      const matched = href.match(/\/member\/([^/?#]+)/);
      if (!matched) return "";
      try {
        return decodeURIComponent(matched[1]);
      } catch (e2) {
        return matched[1];
      }
    }

    function getTriggerAvatar(trigger) {
      let img = trigger.querySelector("img");
      if (!img) {
        const container = trigger.closest(".comment, .header, .post-item");
        if (container) img = container.querySelector("img.avatar");
      }
      return img ? img.src : "";
    }

    function formatMemberDate(created) {
      if (!created) return "";
      const date = new Date(created * 1e3);
      const pad = (value) => (value < 10 ? "0" + value : String(value));
      return (
        date.getFullYear() +
        "-" +
        pad(date.getMonth() + 1) +
        "-" +
        pad(date.getDate())
      );
    }

    function ensureMemberCard() {
      if (memberCardEl && document.body.contains(memberCardEl)) {
        return memberCardEl;
      }
      memberCardEl = document.getElementById(MEMBER_CARD_ID);
      if (memberCardEl) return memberCardEl;
      memberCardEl = document.createElement("div");
      memberCardEl.id = MEMBER_CARD_ID;
      memberCardEl.className = "v2p-member-card";
      memberCardEl.innerHTML =
        '<div class="v2p-member-card-main">' +
        '<a class="v2p-member-card-avatar" href="#"><img alt=""></a>' +
        '<div class="v2p-member-card-info">' +
        '<a class="v2p-member-card-name" href="#"></a>' +
        '<div class="v2p-member-card-no"></div>' +
        '<div class="v2p-member-card-created"></div>' +
        '<div class="v2p-member-card-new" style="display:none;"></div>' +
        "</div></div>" +
        '<div class="v2p-member-card-bio" style="display:none;"></div>' +
        '<div class="v2p-member-card-status"></div>';
      memberCardEl.addEventListener("mouseenter", function () {
        clearTimeout(memberCardCloseTimer);
      });
      memberCardEl.addEventListener("mouseleave", function () {
        scheduleMemberCardHide(MEMBER_CARD_CLOSE_DELAY);
      });
      document.body.appendChild(memberCardEl);
      return memberCardEl;
    }

    function positionMemberCard(trigger) {
      const card = ensureMemberCard();
      const rect = trigger.getBoundingClientRect();
      const cardWidth = card.offsetWidth || 280;
      const cardHeight = card.offsetHeight || 150;
      let left = rect.left + rect.width / 2 - cardWidth / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - cardWidth - 8));
      let top = rect.bottom + 8;
      if (top + cardHeight > window.innerHeight - 8) {
        top = rect.top - cardHeight - 8;
        if (top < 8) {
          top = Math.max(8, window.innerHeight - cardHeight - 8);
        }
      }
      card.style.left = left + "px";
      card.style.top = top + "px";
    }

    function renderMemberCard(username, avatarSrc, state) {
      const card = ensureMemberCard();
      const $card = $(card);
      const $name = $card.find(".v2p-member-card-name");
      const $avatarLink = $card.find(".v2p-member-card-avatar");
      const $avatar = $avatarLink.find("img");
      const $no = $card.find(".v2p-member-card-no");
      const $created = $card.find(".v2p-member-card-created");
      const $new = $card.find(".v2p-member-card-new");
      const $bio = $card.find(".v2p-member-card-bio");
      const $status = $card.find(".v2p-member-card-status");

      const memberLink = "/member/" + encodeURIComponent(username);
      $name.text(username).attr("href", memberLink);
      $avatarLink.attr("href", memberLink);
      if (avatarSrc) {
        $avatar.attr("src", avatarSrc).show();
      } else {
        $avatar.removeAttr("src").hide();
      }

      $no.text("");
      $created.text("");
      $new.hide();
      $bio.hide().text("");
      $status.text("");

      if (!state) {
        $status.text("加载中…");
        return;
      }
      if (state.status === "banned") {
        $status.text("查无此用户，疑似已被封禁");
        return;
      }
      if (state.status === "error") {
        $status.text("获取用户信息失败");
        return;
      }

      const data = state.data || {};
      if (data.avatar_large) $avatar.attr("src", data.avatar_large).show();
      if (data.id) $no.text("V2EX 第 " + data.id + " 号会员");
      const createdText = formatMemberDate(data.created);
      if (createdText) $created.text("加入于 " + createdText);
      if (data.created) {
        const days = Math.ceil(
          (Date.now() / 1e3 - data.created) / (60 * 60 * 24),
        );
        if (days > 0 && days <= 30) {
          $new.text((days <= 15 ? "15" : "30") + " 天内注册").show();
        }
      }
      if (data.bio && data.bio.trim()) {
        $bio.text(data.bio.trim()).show();
      }
      if (!data.id && !createdText) {
        $status.text("暂无更多资料");
      }
    }

    function fetchMemberState(username, signal) {
      return fetch(
        location.origin +
          "/api/members/show.json?username=" +
          encodeURIComponent(username),
        { signal: signal },
      ).then((res) => {
        if (res.status === 200) {
          return res.json().then((data) => ({ status: "ok", data: data }));
        }
        if (res.status === 404) return { status: "banned" };
        throw new Error("member api " + res.status);
      });
    }

    function hideMemberCard() {
      clearTimeout(memberCardOpenTimer);
      memberCardTrigger = null;
      memberCardUsername = "";
      if (memberCardAbort) {
        memberCardAbort.abort();
        memberCardAbort = null;
      }
      if (memberCardEl) memberCardEl.classList.remove("show");
    }

    function scheduleMemberCardHide(delay) {
      clearTimeout(memberCardCloseTimer);
      memberCardCloseTimer = setTimeout(
        hideMemberCard,
        typeof delay === "number" ? delay : MEMBER_CARD_CLOSE_DELAY,
      );
    }

    function showMemberCard(trigger) {
      if (!trigger || !document.contains(trigger)) return;
      const username = getMemberNameFromTrigger(trigger);
      if (!username) return;

      if (memberCardAbort) {
        memberCardAbort.abort();
        memberCardAbort = null;
      }
      memberCardTrigger = trigger;
      memberCardUsername = username;

      const avatarSrc = getTriggerAvatar(trigger);
      const card = ensureMemberCard();
      renderMemberCard(username, avatarSrc, null);
      positionMemberCard(trigger);
      card.classList.add("show");

      const cached = MEMBER_CACHE.get(username);
      if (cached) {
        renderMemberCard(username, avatarSrc, cached);
        positionMemberCard(trigger);
        return;
      }

      const controller = new AbortController();
      memberCardAbort = controller;
      fetchMemberState(username, controller.signal)
        .then((state) => {
          if (state.status !== "error") MEMBER_CACHE.set(username, state);
          if (memberCardUsername === username) {
            renderMemberCard(username, avatarSrc, state);
            positionMemberCard(trigger);
          }
        })
        .catch((err) => {
          if (err && err.name === "AbortError") return;
          if (memberCardUsername === username) {
            renderMemberCard(username, avatarSrc, { status: "error" });
            positionMemberCard(trigger);
          }
        })
        .finally(() => {
          if (memberCardAbort === controller) memberCardAbort = null;
        });
    }

    function initMemberHoverCards() {
      const root = document.documentElement;
      if (root.getAttribute("data-v2p-member-card-init") === "1") return;
      root.setAttribute("data-v2p-member-card-init", "1");

      document.addEventListener("mouseover", function (e2) {
        const target =
          e2.target && e2.target.closest
            ? e2.target.closest(MEMBER_TRIGGER_SELECTOR)
            : null;
        if (!target) return;
        if (
          target === memberCardTrigger &&
          memberCardEl &&
          memberCardEl.classList.contains("show")
        ) {
          clearTimeout(memberCardCloseTimer);
          return;
        }
        clearTimeout(memberCardOpenTimer);
        clearTimeout(memberCardCloseTimer);
        memberCardTrigger = target;
        memberCardOpenTimer = setTimeout(function () {
          showMemberCard(target);
        }, MEMBER_HOVER_DELAY);
      });

      document.addEventListener("mouseout", function (e2) {
        const target =
          e2.target && e2.target.closest
            ? e2.target.closest(MEMBER_TRIGGER_SELECTOR)
            : null;
        if (!target || target !== memberCardTrigger) return;
        const related = e2.relatedTarget;
        if (
          related &&
          (target.contains(related) ||
            (memberCardEl && memberCardEl.contains(related)))
        ) {
          return;
        }
        clearTimeout(memberCardOpenTimer);
        if (memberCardEl && memberCardEl.classList.contains("show")) {
          scheduleMemberCardHide(MEMBER_CARD_CLOSE_DELAY);
        } else {
          memberCardTrigger = null;
        }
      });

      document.addEventListener(
        "click",
        function (e2) {
          if (memberCardEl && memberCardEl.contains(e2.target)) return;
          hideMemberCard();
        },
        true,
      );
      window.addEventListener("scroll", hideMemberCard, true);
      window.addEventListener("resize", hideMemberCard);
    }

    async function init() {
      let userLink = document.querySelector("#Top .tools a[href^='/member/']");
      if (userLink) {
        window.isLogin = true;
        window.user.username = userLink.textContent.trim();
        window.user.avatar = $("#Rightbar .box .avatar").attr("src") || "";
      }
      functions.initConfig();
      let box;
      let list;
      let last;
      let headerWrap;
      let { pageData, pageType, username } = functions.checkPageType();
      window.pageType = pageType;
      window.pageData = pageData;
      window.targetUserName = username;
      initStyle();
      // 列表页启用意图预取（首页/节点），只读加速站内详情秒开
      if (
        window.pageType === PageType.Home ||
        window.pageType === PageType.Node
      ) {
        initPrefetch();
      }
      switch (window.pageType) {
        case PageType.Node:
          box = document.querySelectorAll("#Wrapper #Main .box");
          try {
            headerWrap = $('<div class="post-item"></div>');
            if (window.config.viewType === "card")
              headerWrap[0].classList.add("preview");
            $(box[1]).prepend(headerWrap);
            $(box[1])
              .children()
              .slice(1, 3)
              .each(function () {
                if (this.classList.contains("cell")) {
                  headerWrap.append(this);
                }
              });
            headerWrap = $('<div class="post-item"></div>');
            if (window.config.viewType === "card")
              headerWrap[0].classList.add("preview");
            $(box[1]).append(headerWrap);
            $(box[1])
              .children()
              .slice(2)
              .each(function () {
                if (this.classList.contains("cell")) {
                  headerWrap.append(this);
                }
              });
            box[1].style.boxShadow = "unset";
            box[1].style.background = "unset";
            box[1].style.overflow = "hidden";
          } catch (e2) {
            // 静默：原为调试日志
          }
          let topics = box[1].querySelector("#TopicsNode");
          list = topics.querySelectorAll(".cell");
          list[0].before($section);
          window.parse.parsePagePostList(list, box[1]);
          break;
        case PageType.Changes:
        case PageType.Home:
          box = document.querySelector("#Wrapper #Main .box");
          try {
            headerWrap = $('<div class="post-item"></div>');
            if (window.config.viewType === "card")
              headerWrap[0].classList.add("preview");
            $(box).prepend(headerWrap);
            $(box)
              .children()
              .slice(1, 3)
              .each(function () {
                if (!this.classList.contains("item")) {
                  headerWrap.append(this);
                }
              });
            if (window.isDeadline && $(".tab_current").text() == "最热") {
              headerWrap.append(
                $(
                  `<div class="cell" id="SecondaryTabs"><div class="fr"><a href="/v2hot?3">3天最热</a> &nbsp; &nbsp; <a href="/v2hot?7">7天最热</a> &nbsp; &nbsp; <a href="/v2hot?30">30天最热</a> &nbsp; &nbsp; <a href="/v2hot?setting"><i class="fa fa-calendar" aria-hidden="true"></i></a></div><a href="/v2hot?-1">昨天最热</a> &nbsp; &nbsp; <a href="/v2hot?-2">前天最热</a> &nbsp; &nbsp; </div>`,
                ),
              );
            }
            last = $(box).children().last();
            last.addClass("cell post-item");
            if (window.config.viewType === "card")
              last[0].classList.add("preview");
            box.style.boxShadow = "unset";
            box.style.background = "unset";
            box.style.overflow = "hidden";
          } catch (e2) {
            // 静默：原为调试日志
          }
          list = box.querySelectorAll(".item");
          list[0].before($section);
          window.parse.parsePagePostList(list, box);
          break;
        case PageType.Post:
          let d2 = localStorage.getItem("v2pro_conflict");
          if (d2) {
            window.stopMe = true;
            functions.cbChecker({ type: "syncData" });
            functions.cbChecker({
              type: "warningNotice",
              value: "检测到与其它扩展(如V2EX Polish)冲突，脚本已暂停接管",
            });
            return;
          }
          box = document.querySelector("#Wrapper #Main .box");
          box.after($section);
          let r2 = await functions.checkPostReplies(window.pageData.id, false);
          if (r2) {
            window.stopMe = true;
            functions.cbChecker({ type: "syncData" });
            functions.cbChecker({
              type: "warningNotice",
              value: "由于回复数量较多，脚本已停止解析楼中楼",
            });
            return;
          }
          if (window.config.postWidth) {
            let Main = $("#Main");
            Main.css({
              width: window.config.postWidth,
              margin: "unset",
            });
            $("#Wrapper > .content").css({
              "max-width": "unset",
              display: "flex",
              "justify-content": "center",
              gap: "20px",
            });
            Main.after($("#Rightbar"));
          }
          let post = getDefaultPost({ id: window.pageData.id });
          let body = $(document.body);
          let htmlText = document.documentElement.outerHTML;
          window.parse
            .parsePostContent(post, body, htmlText)
            .then(async (res) => {
              await functions.cbChecker({ type: "postContent", value: res });
              await window.parse.parseOp(res);
            });
          window.parse
            .getPostAllReplies(post, body, htmlText, window.pageData.pageNo)
            .then(async (res1) => {
              await functions.cbChecker({ type: "postReplies", value: res1 });
            });
          break;
        case PageType.Member:
          box = document.querySelectorAll("#Wrapper #Main .box");
          if (location.pathname.includes("/replies")) {
            box[0].after($section);
          } else if (location.pathname.includes("/topics")) {
            box[0].after($section);
          } else {
            if (window.config.openTag) {
              box[0].style.borderBottom = "none";
              box[0].style["border-bottom-left-radius"] = "0";
              box[0].style["border-bottom-right-radius"] = "0";
            }
            try {
              headerWrap = $('<div class="post-item"></div>');
              if (window.config.viewType === "card")
                headerWrap[0].classList.add("preview");
              $(box[1]).prepend(headerWrap);
              $(box[1])
                .children()
                .slice(1, 2)
                .each(function () {
                  if (!this.classList.contains("item")) {
                    headerWrap.append(this);
                  }
                });
              last = $(box[1]).children().last();
              last.addClass("cell post-item");
              if (window.config.viewType === "card")
                last[0].classList.add("preview");
              box[1].style.boxShadow = "unset";
              box[1].style.background = "unset";
              box[1].style.overflow = "hidden";
            } catch (e2) {
              // 静默：原为调试日志
            }
            list = box[1].querySelectorAll(".cell");
            box[0].after($section);
            window.parse.parsePagePostList(list, box[1]);
          }
          break;
        default:
          window.stopMe = true;
          functions.cbChecker({ type: "syncData" });
          console.error("未知页面");
          break;
      }
      initMemberTags();
      initSidebarEnhancements();
      initTopTabsCustomize();
      initReplyEnhancements();
      initMemberHoverCards();
      if (window.isLogin) {
        initNoteData();
        try {
          if (window.config.autoSignin) qianDao();
        } catch (e2) {
          // 静默：原为调试日志
        }
      }
      addSettingText();
      initMonkeyMenu();
      window.addEventListener(
        "error",
        (e2) => {
          let dom = e2.target;
          let originImgUrl = dom.getAttribute("originUrl");
          if (originImgUrl) {
            let a = document.createElement("a");
            a.href = originImgUrl;
            a.setAttribute(
              "notice",
              "此标签由v2ex超级增强脚本转换图片失败后恢复",
            );
            a.innerText = originImgUrl;
            a.target = "_blank";
            dom.parentNode.replaceChild(a, dom);
          }
        },
        true,
      );
    }
    function findReplyBox(boxs) {
      var _a, _b;
      for (let i = 1; i < boxs.length; i++) {
        const box = boxs[i];
        const cells = box.querySelectorAll ? box.querySelectorAll(".cell") : [];
        if (cells && cells.length > 0) {
          const firstCell = cells[0];
          if (
            (_a = firstCell.querySelector) == null
              ? void 0
              : _a.call(firstCell, ".snow")
          ) {
            return box;
          }
          if (
            (_b = firstCell.querySelector) == null
              ? void 0
              : _b.call(firstCell, ".fa-tag")
          ) {
            return box;
          }
        }
      }
      console.warn("[V2EX Pro] 无法智能检测回复区域，使用默认位置");
      return boxs[1];
    }
    window.canParseV2exPage = !window.location.search.includes("script");
    if (window.canParseV2exPage) {
      init();
    } else {
      let box = document.querySelector("#Wrapper #Main .box");
      box.after($section);
      window.stopMe = true;
      functions.cbChecker({ type: "syncData" });
      if (window.location.search.includes("script=0")) {
        functions.cbChecker({
          type: "warningNotice",
          value: "脚本无法查看此主题，已为您单独打开此主题",
        });
      }
      if (window.location.search.includes("script=1")) {
        functions.cbChecker({
          type: "warningNotice",
          value: "由于回复数量较多，已为您单独打开此主题并停止解析楼中楼",
        });
      }
    }
  }
  if (!isMobile) {
    // 样式由同仓库的 V2EX-Pro-PC-style.user.js 在 document-start 注入，此处不再经 @resource 加载
    run();
    let vueApp = vue.createApp(App);
    vueApp.config.unwrapInjectedRef = true;
    vueApp.mount($section);
  }
})(Vue, dayjs);
