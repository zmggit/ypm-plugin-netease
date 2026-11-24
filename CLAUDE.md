# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

YesPlayMusic **3.0.0+** 的第三方网易云音乐源插件（社区插件，非官方）。插件不是独立应用：没有构建步骤、没有依赖、没有 `package.json`，代码由 YesPlayMusic 插件沙箱直接以 ESM 加载执行，运行时唯一的全局对象是宿主注入的 `host`。

## 开发命令

```sh
# 唯一自动化测试入口（无需安装依赖，需 Node.js 22+）
node --experimental-vm-modules --test test/localization.test.mjs

# 只跑单个测试
node --experimental-vm-modules --test --test-name-pattern="九种语言" test/localization.test.mjs
```

没有 lint / build / 启动命令。验证插件行为的方式是在 YesPlayMusic 里「从本地文件夹安装」。

## 架构

三个文件构成三层，改动时注意分层边界：

- `client.js` — **EAPI 传输层**。`api(path, data, options)` 负责加密请求、Cookie jar 维护与错误归一化；`verify()`、`hasSession()`、`resetSession()`、`requireAccount()`、`fail()`、`id()` 也在此导出。业务层不应绕过它直接 `fetch`。
- `models.js` — **数据映射层**。把网易云原始字段（`ar`/`al`/`creator`/`picUrl`/`privilege.st` …）转换为 YesPlayMusic 需要的 `artist` / `album` / `track` / `playlist` 结构。封面地址统一升级为 https。
- `index.js` — **插件 API 层**。导出 YesPlayMusic 调用的函数（`account`、`signIn`、`signOut`、`search`、`suggest`、`album`、`artist`、`playlist`、`playlists`、`liked`、`isLiked`、`like`、`savedAlbums`、`saveAlbum`、`recent`、`home`、`browse`、`stream`、`lyrics`、`trackMenu`、`menuAction`）。`plugin.json` 的 `navigation` 决定哪些入口被注册。

`i18n.js` 提供 `t()`：每次调用都实时读 `host.t`，因此切换语言无需重载。

### 宿主 `host` API

`host.storage.{get,set,remove}`、`host.setting(key)`（读取 `plugin.json` 中 `settings` 的用户选择，字符串，未填为 `""`）、`host.crypto.{md5,aesEcbEncrypt}`、`host.t`、`host.signInPrompt`、`host.openURL`。测试用 vm 上下文伪造了这套接口，新增宿主调用时必须同步更新 `test/localization.test.mjs` 里的 `runtime()` 假实现。`host.setting` 在旧版宿主可能不存在，调用前需做 `typeof` 守卫（见 `qualityCap()`）。

### 页面路由约定

`browse({ page })` 用字符串编码页面状态：`daily`、`charts`、`new-albums`、`playlists:<分类>:<offset>`。分页靠拼出「下一页」链接实现，而不是调用方传 offset。

### 错误模型

一律用 `fail(code, message, retryable)` 抛错，`code` 取值 `signIn` / `unavailable` / `unsupported` / `failed`，宿主据此决定跳转登录、显示不可用还是可重试。`retryable: true` 仅用于网络抖动与 429/5xx。

## 关键约定与陷阱

- **新增中文文案必须同时补齐 9 个 locale**（`locales/{en,zh-CN,zh-TW,ja,ko,fr,de,es,ru}.json`）。中文原文即 key：测试会正则扫描 `index.js` / `client.js` / `models.js` 中双引号内的中文字面量，外加 `plugin.json` 的 `name`、`description`、`navigation[].title` 以及 `settings` 的 `label` / `help` / `options[].label`，要求每个 locale 的 key 集合完全一致、占位符 `{x}` 一致；`zh-CN` 的值必须等于 key，非 `zh-TW`/`ja` 的译文不得含汉字。
- **音质语义**：`stream()` 的 `quality` 由播放器传入（`standard` / `high` / `lossless`），插件设置 `quality` 只作上限而非覆盖；上限设为 `hires` 时，仅当播放器请求无损才向上尝试 Hi-Res，取不到音频回退无损。
- **不要给映射函数传 `Array.map` 的下标**。`items.map(mappers[kind])` 这类写法会把 index 当成第二个参数（track 的 privilege），已有相关注释。
- **歌单顺序以 `trackIds` 为准**：先建 `tracks` 映射，再对缺失 id 分批（500/批）调用 `/api/v3/song/detail` 回填，最后按 `trackIds` 顺序输出。单歌单上限 10,000 首。
- **登录流程限制**：新码保留旧会话，取消/失败要回滚；`loginSequence` 与 `sessionEpoch` 双重判定防止旧请求覆盖新会话；登录相关请求带 `persist: false`；整体 8 分钟上限（宿主上限 10 分钟），二维码每 120 秒主动轮换。
- **`savedAlbums` 必须返回数组**（音乐库走 List 读取），空数组即分页结束——不要包成 `{ albums, more }`（commit `080a02e` 修的就是这个）。
- **网络权限受限**：`plugin.json` 只允许 `interfacepc.music.163.com` 与 `music.163.com`；新增接口路径需确认仍在白名单内。EAPI 路径必须是 `/api/[A-Za-z0-9/_-]+`。
- `stream()` 遇到 `freeTrialInfo` 必须报不可用，不能把试听片段当完整歌曲返回。

## 依赖的外部协议

接口字段参考 NeteaseCloudMusicApiEnhanced（见 `THIRD_PARTY_NOTICES.md`）。`client.js` 中的 EAPI 约定：路径 `/api/x` → `/eapi/x`，body 为 AES-ECB 加密的 `{path}-36cd479b6b5-{json}-36cd479b6b5-{md5}`。

## 发布

改动功能或修复后同步提升 `plugin.json` 的 `version`（修复升修订号、新功能升次版本号，如 1.0.3 → 1.1.0），并保持英文/中文 README 的安装地址与互链一致（测试会校验 README 互链、仓库地址与 MIT 许可证）。新增 `settings` 项要同步更新测试里的 `sourceKeys` 与 locale 文件。
