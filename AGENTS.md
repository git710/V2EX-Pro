# AGENTS.md

## 项目是什么

V2EX Pro 是给 [V2EX](https://www.v2ex.com/) 使用的 **PC 端 + 手机端（H5）双端 Tampermonkey 用户脚本套件**，用浏览器脚本补齐阅读、回复、主题与个性化能力。

- 没有自建后端，不收集或上传统计数据；登录态、接口请求、签到都留在当前站点。
- 同时支持官方站（`*.v2ex.com`）与镜像站（`global.v2ex.co`）。
- 每一端都由**主脚本 + 样式脚本**成对组成。只装其中一份会出现无样式或无功能；安装顺序是先样式、后主脚本。
- 以 GPL-3.0 发布，代码衍生自 V2Next、V2EX Polish 与 V2ex-Polish-Plus；保留原作者署名与来源说明。

## 目录与职责

| 路径 | 职责 |
| --- | --- |
| `v2ex-PC/V2EX-Pro-PC.user.js` | PC 端主逻辑。Vue 3 + jQuery，`document-idle` 启动，负责列表/详情、回复、设置面板、用户标签、签到、通知等。 |
| `v2ex-PC/V2EX-Pro-PC-style.user.js` | PC 端样式。`document-start` 注入主题类、防闪烁背景、`--v2p-*` 设计 Token 与完整 CSS。`@grant none`。 |
| `v2ex-H5/V2EX-Pro-H5.user.js` | 手机端主逻辑。jQuery，`document-start` 注册但等 DOM 就绪后按 URL 分发；含 WebDAV、设置页、手机工具菜单、回复增强等。 |
| `v2ex-H5/V2EX-Pro-H5-style.user.js` | 手机端样式。`document-start` 注入主题、响应式布局与 Token。`@grant none`。 |
| `bump-version.mjs` | 递归递增四份 `.user.js` 的 `@version` 补丁号，支持 `--dry-run` / `--help`。 |
| `README.md` | 面向用户的功能、安装、权限与常见问题说明。 |

`v2ex-PC/V2EX-Pro-PC.user.js` 和 `v2ex-H5/V2EX-Pro-H5.user.js` 带有打包/编译产物特征（Vue 组件编译结果、`// src/...` 分组标记），但**仓库里没有对应的 src 工程或构建脚本**。直接修改 `.user.js`，不要假设存在 `npm run build`，也不要为了“恢复源码结构”大范围重排文件。

## 开发命令

项目没有 `package.json`、依赖安装步骤或自动化测试。需要 Node.js 18+，在仓库根目录执行：

```bash
node --check v2ex-PC/V2EX-Pro-PC.user.js
node --check v2ex-PC/V2EX-Pro-PC-style.user.js
node --check v2ex-H5/V2EX-Pro-H5.user.js
node --check v2ex-H5/V2EX-Pro-H5-style.user.js

node bump-version.mjs --dry-run    # 预览版本改动
node bump-version.mjs              # 四份脚本补丁号 +1
```

没有构建步骤。改完后在 Tampermonkey 中重新加载对应脚本，打开 V2EX 手动验证。发布前至少跑一遍四个 `node --check`，并通读 `git diff` 确认没有把压缩代码、CSS 或大段结构意外重排。

## 运行架构

### PC 端

- 样式脚本先于主脚本运行：在 `document-start` 写入主题类、初始背景色与 `theme-color`，随后注入主样式表，避免主题闪烁。
- 主脚本在 `document-idle` 初始化 `run()` 与 Vue 应用，挂载到 `#app`；核心入口、`PageType`、`DefaultVal`、`getDefaultConfig()` 都在文件前中部。
- 页面类型由 `functions.checkPageType()` 判断：`Home` / `Node` / `Post` / `Member` / `Changes` / `Hot`。新增页面能力时沿用这套判断，不要另写一套路径解析。
- PC 配置保存在 `localStorage.v2ex-config`，按 V2EX 用户名分组；`DefaultVal.currentVersion` 是**配置迁移/更新提示计数器**，不是脚本发布版本，详见下方“特别注意”。
- 主脚本自身还会通过 `initStyle()` 追加一部分增强样式；CSS 不只在 `*-style.user.js` 里，改样式前先搜索四份文件。

### 手机端（H5）

- 文件开头有一套 `chrome.storage` / `chrome.runtime` polyfill：存储落到 `GM_getValue` / `GM_setValue`（选项读取另有 `localStorage` 兜底），WebDAV 请求由 `chrome.runtime.sendMessage` 直接走 `GM_xmlhttpRequest`，并不存在扩展 background 页。
- 真正的业务入口在 `src/user-scripts/index.ts` 标记之后：先按 `allowedHosts` 生成 URL 正则，再分别加载 common / home / topic / write 逻辑。新增站点或镜像域名时，除了四份脚本的 `@match`，还必须同步 `allowedHosts`。
- 选项由 `defaultOptions` 深合并 `v2p_options` 得到；`saveOption()` 是设置弹窗与 `/settings#v2p` 设置页共用的持久化入口。
- H5 没有 Vue，交互主要用 jQuery + 原生 DOM；新增 UI 尽量复用现有的 toast、modal、setting group 与图标工具。
- `isBrowserExtension()` 被**故意固定为 `false`**：`postTask()` 依赖它走用户脚本分支。不要把它改成检测真实扩展环境。

### 双端共享约定

- 主题模式共用 `localStorage.user_preferred_theme_mode`，取值为 `light` / `dawn` / `aqua` / `dark` / `auto`；主题类为 `v2p-theme-*`，深色同时保留 `Night` / `dark` 兼容类。
- 两端样式都使用 `--v2p-*` 设计 Token。PC 样式中的 Token 区块与 H5 是**人工同步的副本**，仓库没有自动生成机制；改共享色板、字体栈、圆角或动效时要同时检查两端及四个主题（浅色、晨光、水色、深色）。
- 用户标签共用 `v2p_tags`；每日签到的“今天已签”共用 `menu_clockInTime`，日期按东八区（UTC+8）计算；并发锁使用 `v2pro_signing_in`。改动这些行为时要保持 PC / H5 互认。
- 两端的“高赞回复”都采用分页抓取、并发限制、均匀取样与 `sessionStorage` 短期缓存（10 分钟），缓存前缀为 `v2p_top_reply_cache:`。修改抓取、缓存键或感谢后失效逻辑时，两端要同步改。
- 站内请求统一基于当前 `location.origin`（H5 中为 `V2EX_ORIGIN`）拼接；链接判断使用 `isV2exHost()` / `isExternalLink()`。**不要在业务代码里硬编码 `https://www.v2ex.com`**，否则镜像站会跨站。
- 出网请求只用于既有功能：官方站接口、Imgur、Iconify、钉钉 Webhook、用户自填的 WebDAV。不要新增遥测、埋点或项目自有后端。

## 代码约定

- 保持现有风格：2 空格缩进、双引号、语句末尾分号；标识符用英文，注释和用户可见文案用中文。已有压缩/编译代码保持原格式，只做最小必要改动。
- 先读相关模块和相邻实现，优先复用 `functions`、`utils`、`toast`、`escapeHTML` 等现有工具，不要平行造一套。
- 新的 CSS 尽量使用 `--v2p-*` Token；品牌色、背景、边框、字体、圆角分别走对应变量，不要把同一个颜色散落硬编码到多个主题选择器。
- 新增 UI class 使用 `v2p-` 前缀；历史 `v2pro_*` 键名是兼容层，不要为了统一命名而重命名已有存储键。
- 捕获异常并给可排查的日志；统一使用 `[V2EX Pro]` 前缀。用户可见操作反馈优先使用 H5 的 `v2pShowToast` 或 PC 现有消息机制。
- 监听器、`MutationObserver`、定时器和全局 `window.*` 状态要考虑重复初始化与清理；新逻辑要能承受 SPA 式局部刷新/重复注入。
- `localStorage` / `GM_*` 读取要容错，隐私模式或配额不足时不能阻断页面。新增持久化字段时按现有深合并方式给默认值，避免旧配置缺字段。
- 注入 HTML 或属性时对来自 V2EX 页面、用户名、标签、回复内容的数据做转义；不要直接把不可信字符串拼进 `innerHTML`。

## 修改时特别注意

1. **成对维护**：功能放主脚本，主题/布局放样式脚本；不要只改一端就认为双端生效。PC 端样式必须先加载，主脚本初始化依赖它先建立的主题环境。
2. **镜像站三件套**：新增域名时同步四份脚本的 `@match`、H5 的 `allowedHosts`，以及所有站内地址拼接/链接判断逻辑。
3. **版本号**：发布用 `node bump-version.mjs`，让四份 `@version` 保持一致。脚本只递增补丁号；如果四份原本不一致，它会警告并各自加一，不会自动对齐，因此提交前要检查结果。
4. **不要把 `DefaultVal.currentVersion` 当成脚本版本**。它控制 PC 配置迁移和“新版本”设置提示；改它会让所有用户莫名看到更新弹窗。`bump-version.mjs` 刻意不碰它。
5. **CDN 依赖带 SRI**：PC 的 jQuery / Vue / Day.js 和 H5 的 jQuery 通过 `@require` 引入并附 `#sha256`。升级版本时必须同时更新完整性哈希，否则脚本不会加载。
6. **`@grant` / `@connect` 是安全边界**：H5 的 `@connect *` 是为了允许用户自填 WebDAV 地址；除非同时重做 WebDAV 地址模型，否则不要仅因“看起来太大”就收紧。PC 只连接钉钉。不要无理由增加权限。
7. **脚本元数据即发布接口**：`@name`、`@namespace`、文件名、`@updateURL`、`@downloadURL` 共同决定用户能否自动更新。重命名文件或调整分支/仓库地址时，四份脚本、README 和 `DefaultVal` 中的外链要一起检查。
8. **H5 的 `isBrowserExtension()` 保持 `false`**，`chrome.*` 只是 polyfill；不要把 H5 改成真正的扩展 API 调用。
9. **签到不要改成浏览器本地日期**：V2EX 每日任务按北京时间刷新，PC 与 H5 已统一用 UTC+8 计算，并共用当天标记与并发锁。
10. **隐私**：WebDAV 凭据、`.env`、浏览器存储导出、Token / 证书一律不提交；`.gitignore` 已覆盖常见项。新增第三方服务时在 README 的隐私与第三方依赖部分说明。

## 验收清单

- [ ] 四份脚本 `node --check` 通过，`node bump-version.mjs --dry-run` 输出符合预期。
- [ ] PC / H5 各自“先样式、后主脚本”安装，页面功能与主题都正常，控制台没有 `[V2EX Pro]` 报错。
- [ ] 官方站与镜像站（`global.v2ex.co`）都验证；站内请求仍打在当前站点，外链识别没有误伤站内链接。
- [ ] 四个主题 + 跟随系统都切换一遍，刷新后不闪白/闪黑，主题偏好能保持。
- [ ] 按改动范围回归对应功能：PC 弹框/楼中楼/设置面板/签到/通知；H5 手机工具菜单/设置页 `/settings#v2p`/WebDAV/签到/楼层直达。
- [ ] 登录与未登录至少各验证一次；涉及用户标签时确认两端能读到同一条记事本数据。
- [ ] 改动到 PC 配置结构时，确认旧配置可迁移；没有误改 `DefaultVal.currentVersion`。
- [ ] 同步更新 README、脚本头 `@description`、四份版本号与必要的权限/第三方说明。

## 提交约定

现有提交使用 `fix:` / `feat:` / `docs:` / `chore:` 前缀加中文摘要。保持一次提交聚焦一件事，不把版本号、无关格式化或大范围样式重排混进功能提交。发布提交通常形如 `chore: release vX.Y.Z`。
