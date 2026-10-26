<div align="center">

# V2EX Pro

**给 V2EX 的 PC + H5（移动端）双端增强套件**

无自建后端 · 双端四主题 · 阅读、回复与个性化全面增强

[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-supported-2ea44f.svg)](https://www.tampermonkey.net/)
[![PC + H5](https://img.shields.io/badge/platform-PC%20%7C%20H5-6f42c1.svg)](#功能)
[![No Backend](https://img.shields.io/badge/backend-none-success.svg)](#隐私与权限)

[**安装 PC 端**](#pc-端安装) · [**安装 H5 端**](#h5-端安装) · [**功能**](#功能) · [**常见问题**](#常见问题)

</div>

> **每个套件必须成对安装。** 主脚本负责功能，样式脚本负责主题与布局；只装其中一个会出现「无样式」或「无功能」。

V2EX Pro 是一套运行在 Tampermonkey（或兼容管理器）里的用户脚本。它不改动 V2EX 服务端，也不接管你的账号，只在浏览器里补齐日常阅读、回复和个性化体验。PC 与 H5 两套实现按设备自动分流，可以同时安装、互不干扰。

## 功能

### 读帖与回复

- **PC 弹框读帖**：列表点击标题就地展开完整主题，`Esc` 或点击遮罩关闭，列表状态与浏览位置不丢。
- **楼中楼与上下文**：回复按层级展示，支持「只看楼主」；点「上下文」查看某条回复相关的上下楼层。
- **点击 @ 直达**：同页滚动并高亮，跨页自动打开目标页并定位到楼层。
- **YOU 徽章**：自己的回复一眼可辨。
- **回复视图切换**：默认 / 最新 / 最热 / 只看楼主 / 楼中楼 / V2 原版（PC）。
- **异步操作**：感谢、收藏、回复、隐藏都走异步请求，不刷新整页。

### 大主题不卡不丢

- **高赞回复**：自动筛出感谢最多的回复；跨页抓取带页数 / 并发上限，并做均匀取样，避免只看到头几页。
- **短期缓存**：同一主题 10 分钟内复用结果；感谢 / 取消感谢后自动失效重算。
- **长内容折叠**：长回复与长正文自动折叠；PC 端阈值可在 200–5000px 之间调整。

### 双端四主题

- **四套主题**：浅色 / 晨光 / 水色 / 深色，支持跟随系统；PC 与 H5 共享主题偏好。
- **PC 专属**：卡片 / 简洁阅读模式、右侧栏折叠与拖拽排序、顶部导航显隐 / 排序 / 图标美化与选中项记忆。
- **H5 专属**：小屏布局与列表密度重排、移动端工具菜单、节点导航排序与图标。
- **统一设计 Token**：两端共用同一套 `--v2p-*` CSS 变量，视觉语言保持一致。

### 社区工具

- **用户标签**：本机优先、未登录可用；登录后同步到 V2EX 记事本，PC / H5 共用。
- **成员悬浮卡**：悬停头像或用户名查看会员编号、加入时间与简介（PC）。
- **Base64 工具箱**：划词解码、整页解析、文本转 Base64。
- **回复增强**：表情回复（Emoji + 贴吧表情）、Imgur 图片上传、楼层直达。
- **日常自动化**：每日首次打开静默签到；PC 端可把新通知推送到钉钉 Webhook。

## 安装

前置条件：安装 [Tampermonkey](https://www.tampermonkey.net/)（或 Violentmonkey 等兼容管理器）。Chrome / Edge 用户还需在扩展详情页开启「允许用户脚本」，参见 [官方说明](https://www.tampermonkey.net/faq.php?locale=zh&q=Q209)。

### PC 端安装

依次点击，**先样式、后主脚本**：

1. [安装 PC 样式脚本](https://raw.githubusercontent.com/git710/V2EX-Pro/main/v2ex-PC/V2EX-Pro-PC-style.user.js)
2. [安装 PC 主脚本](https://raw.githubusercontent.com/git710/V2EX-Pro/main/v2ex-PC/V2EX-Pro-PC.user.js)

### H5 端安装

同样**先样式、后主脚本**：

1. [安装 H5 样式脚本](https://raw.githubusercontent.com/git710/V2EX-Pro/main/v2ex-H5/V2EX-Pro-H5-style.user.js)
2. [安装 H5 主脚本](https://raw.githubusercontent.com/git710/V2EX-Pro/main/v2ex-H5/V2EX-Pro-H5.user.js)

安装完成后打开或刷新 [V2EX](https://www.v2ex.com/)。若点击链接只显示源码文本，请在脚本管理器里「新建脚本」，把内容整段粘贴进去再保存。

### 镜像站

四个脚本同时支持官方站与镜像站 [global.v2ex.co](https://global.v2ex.co/)，打开页面即自动生效。

- 登录态、接口请求、签到一律沿用**当前所在站点**，不会跨站打到官网。
- 配置按站点（origin）分别保存在 `localStorage`，官网与镜像站互不影响。
- 新增镜像域名时，需在四个脚本的 `@match` 中补一行；H5 主脚本还需同步 `allowedHosts` 列表。

### 自动更新

四个脚本都声明了 `@updateURL` 与 `@downloadURL`，指向本仓库 `main` 分支的对应文件：

```
https://raw.githubusercontent.com/git710/V2EX-Pro/main/<目录>/<文件名>.user.js
```

在 Tampermonkey 的「设置 → 通用设置」中开启定期检查更新，发布新版本后即可自动升级。

### 常用入口

| 想做什么 | PC 端 | H5 端 |
| --- | --- | --- |
| 打开设置 | 顶部「脚本设置」或油猴菜单 →「脚本设置」 | 右下角「V2EX Pro 工具」→ 脚本设置；完整设置见 `/settings#v2p` |
| 切换主题 | 顶部主题按钮 | 顶部主题按钮 |
| 楼层直达 | 右侧悬浮坞的楼层输入框 | 工具菜单 → 楼层直达 |
| Base64 | 详情右上角或悬浮坞的 B64 按钮 | 工具菜单 → 解析本页 Base64 / 文本转 Base64 |
| 回复定位 | 回复工具栏「上下文」 | 点击 @ 定位 / 楼层直达 |

## PC 端功能

**阅读与回复**：弹框查看主题；楼中楼与嵌套回复；回复视图切换（默认 / 最新 / 最热 / 只看楼主 / 楼中楼 / V2 原版）；回复上下文；点击 @ 直达楼层；YOU 徽章；OP 注册时间（不满 15 天标红）；异步感谢 / 收藏 / 回复 / 隐藏。

**效率与工具**：高赞回复（页数 / 并发上限、均匀取样、10 分钟缓存）；楼层直达；长内容折叠（阈值可调）；Base64 工具箱；表情回复（Emoji + 贴吧表情）；Imgur 图片上传；每日静默签到；通知推送到钉钉 Webhook。

**外观与布局**：四主题；卡片 / 简洁阅读模式；右侧栏区块折叠与拖拽排序；「创作新主题」合并到用户卡片；顶部导航显隐、拖拽排序、图标美化与选中项记忆。

**用户与标签**：用户标签（本机优先，登录后同步记事本）；成员悬浮卡（会员编号、加入时间、简介）。

## H5 端功能

**阅读与回复**：小屏布局与列表密度重排；回复定位与编辑预览；楼层直达；点击 @ 定位；回复视图切换（默认 / 最新 / 最热 / 只看楼主）；楼中楼嵌套与父级上下文；长回复与长正文折叠；YOU 徽章；高赞回复（页数 / 并发限制与短期缓存）。

**效率与工具**：脚本设置页 + 移动端工具菜单；表情回复；整页 Base64 解析与文本转 Base64；Imgur 图片上传；每日静默签到；用户标签（与 PC 共用记事本条目，未登录仅存本机）；WebDAV 配置同步（主题与导航配置）。

**外观与布局**：四主题；节点导航自定义（排序、图标）；隐藏「0 未读提醒」条目。

## 从上游版本迁移

PC 端衍生自 [zyronon/V2Next](https://github.com/zyronon/V2Next-script)。H5 端的情况是两层：官方 [coolpace/V2EX Polish](https://github.com/coolpace/V2EX_Polish) 本身不支持移动端，本项目的 H5 实现是在 [thinktip/V2ex-Polish-Plus](https://github.com/thinktip/V2ex-Polish-Plus) 这个移动端改造版基础上继续开发的。

若此前装过上述任一上游脚本或 Greasy Fork 版本：

1. **脚本名与命名空间已变更**，不会自动覆盖。先在脚本管理器中删除或停用旧的 V2Next / V2EX Polish / V2EX Plus 条目，再安装本仓库脚本，避免同一功能被加载两次。
2. **配置能否沿用取决于键名**：PC 配置在 `localStorage.v2ex-config`，H5 主题偏好在 `localStorage.user_preferred_theme_mode`。键名相同则配置保留，否则需重新设置。
3. **用户标签**：登录后从当前站点的 V2EX 记事本读取；未登录时仅保存在本机。
4. **文件命名已统一**为主脚本 `*.user.js` / 样式脚本 `*-style.user.js`，从旧版本升级请删除旧条目后重装。

## 常见问题

**Q：只装一个脚本可以吗？**

A：不可以。主脚本负责功能，样式脚本负责主题与布局。

**Q：PC 和 H5 可以同时安装吗？**

A：可以。两套脚本通过视口宽度 / UA 判断运行环境，互不干扰；同一浏览器装四份脚本是正常用法。

**Q：需要登录 V2EX 吗？**

A：浏览、回复阅读等基础增强不需要登录。自动签到、用户标签同步记事本、通知推送等需要登录；未登录时用户标签仅保存在本机。

**Q：配置和数据存在哪里？**

A：主题、布局和大部分选项保存在浏览器 `localStorage`；PC 用户标签登录后同步到 V2EX 记事本；H5 主题与导航配置可选同步到你自己的 WebDAV。没有本项目自己的服务器。

**Q：支持镜像站吗？**

A：支持官方站与 `global.v2ex.co`。配置按站点分别保存，登录态与请求都留在当前站点。

**Q：和 V2Next / V2EX Polish 冲突吗？**

A：脚本名与命名空间不同，不会自动覆盖。请先删除或停用旧脚本，避免同一功能被加载两次。

**Q：脚本没有生效，怎么排查？**

A：依次确认：脚本管理器已启用；同一套件的主脚本 + 样式脚本都已安装；当前站点在 `@match` 范围内；浏览器允许用户脚本；控制台没有 `[V2EX Pro]` 前缀报错。仍无法解决时，带上脚本版本、浏览器版本和复现步骤提 Issue。

## 隐私与权限

- 脚本仅在 `https://v2ex.com/*`、`https://*.v2ex.com/*` 与 `https://global.v2ex.co/*` 下运行。
- 没有自建后端，不收集、不上传统计数据。
- 主题与布局偏好保存在浏览器 `localStorage`；用户标签未登录时保存在本机（`GM` / `localStorage`），登录后同步到当前站点的 V2EX 记事本。
- H5 主脚本声明了 `@connect *`：WebDAV 同步允许填写任意自建服务器地址，域名无法静态枚举。其余出网请求仅涉及下方列出的域名。
- WebDAV 的地址 / 账号 / 密码仅保存在本地 `GM` 存储中，**不会提交到本仓库**。
- 自动签到使用你自己的 V2EX 登录态；图片上传只在你主动操作时发送到 Imgur。
- **请勿提交** `.env`、浏览器存储导出、Token、证书或本机配置（`.gitignore` 已覆盖常见项）。

## 第三方依赖

仓库自身不提供任何服务器，但脚本运行时会访问以下第三方资源。它们**不属于本仓库**，可用性不受本项目维护：

| 用途 | 来源 | 出现位置 |
| --- | --- | --- |
| jQuery 3.7.1（双端）/ Vue 3.5.21、Day.js 1.11.18（PC） | jsDelivr CDN | `@require`（已附 `#sha256` 完整性校验） |
| 图标数据 | `api.iconify.design`（回退 `api.simplesvg.com`、`api.unisvg.com`） | PC 主逻辑 Iconify 运行时 |
| 热门主题跳转地址 | `v2hotlist.vercel.app` | PC 主逻辑 `DefaultVal.hotUrl` |
| Imgur 图片代理 | `img.noobzone.ru` | PC 主逻辑 `DefaultVal.imgurProxy` |
| 图床 / 表情图片 | `i.imgur.com`、`api.imgur.com` | 图片上传与表情回复 |
| 钉钉通知 | `oapi.dingtalk.com` | PC 通知接管（需自行配置 Webhook） |

修改 PC 主逻辑里 `DefaultVal` 的 `hotUrl` / `imgurProxy`，或自建服务后指向自己的地址即可。`hotUrl` 失效时会自动回退到仓库地址，不会阻断页面。

## 目录结构

```
.
├── v2ex-PC/
│   ├── V2EX-Pro-PC.user.js          # PC 主逻辑（Vue 应用、油猴菜单、设置面板）
│   └── V2EX-Pro-PC-style.user.js    # PC 样式（document-start 注入，防主题闪烁）
├── v2ex-H5/
│   ├── V2EX-Pro-H5.user.js          # H5 主逻辑
│   └── V2EX-Pro-H5-style.user.js    # H5 样式
├── bump-version.mjs                 # 批量递增四个脚本的 @version
├── LICENSE                          # GPL-3.0
└── README.md
```

### 本地开发

项目没有构建步骤，直接编辑 `.user.js` 后在脚本管理器中重新加载即可。提交前建议执行：

```bash
node --check v2ex-PC/V2EX-Pro-PC.user.js
node --check v2ex-PC/V2EX-Pro-PC-style.user.js
node --check v2ex-H5/V2EX-Pro-H5.user.js
node --check v2ex-H5/V2EX-Pro-H5-style.user.js
node bump-version.mjs --dry-run
```

## 发布渠道

| 渠道 | 地址 | 说明 |
| --- | --- | --- |
| GitHub | [git710/V2EX-Pro](https://github.com/git710/V2EX-Pro) | 源码、Issue 与更新主入口 |
| Greasy Fork | 准备中 | 上架后可搜索、一键安装 |

## 致谢

本项目是已有开源工作的衍生实现，感谢以下作者与项目：

- **[zyronon/V2Next](https://github.com/zyronon/V2Next-script)** —— PC 端实现基础。感谢原作者 [zyronon](https://github.com/zyronon)。
- **[coolpace/V2EX Polish](https://github.com/coolpace/V2EX_Polish)** —— H5 端的原始设计与实现来源。感谢原作者 [coolpace](https://github.com/coolpace)。
- **[thinktip/V2ex-Polish-Plus](https://github.com/thinktip/V2ex-Polish-Plus)** —— 把 V2EX Polish 改造成支持移动端的版本，本项目的 H5 端在其基础上继续开发。感谢作者 [thinktip](https://github.com/thinktip)。

也感谢所有上游贡献者与 V2EX 社区。

## 许可

本仓库以 **GPL-3.0** 发布，详见 [LICENSE](LICENSE)。二次分发需同样以 GPL-3.0 发布。

代码衍生自多个上游项目，它们的许可情况并不一致：V2Next 未声明许可证，V2EX Polish 为 MIT。本项目选择以 GPL-3.0 发布，无论上游采用何种许可，均保留原作者 zyronon（V2Next）、coolpace（V2EX Polish）与 thinktip（V2ex-Polish-Plus）的署名与来源说明。

## 反馈

遇到问题请提 [Issue](https://github.com/git710/V2EX-Pro/issues)。反馈时建议附上：

- 使用的脚本与版本号（油猴面板可见）
- 浏览器与操作系统
- 控制台（F12 → Console）中 `[V2EX Pro]` 前缀的报错信息
- 复现步骤

<div align="center">

如果 V2EX Pro 对你有帮助，欢迎点一个 Star。

</div>
