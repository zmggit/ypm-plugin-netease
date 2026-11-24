# NetEase Cloud Music for YesPlayMusic

[English](README.md) · 简体中文

适用于 [YesPlayMusic](https://github.com/qier222/YesPlayMusic) **3.0.0 及更新版本**的社区网易云音乐源插件，非网易云官方插件。

## 安装

- **方式一（推荐）**：打开 YesPlayMusic → **设置 → 插件 → 安装插件**，粘贴 `github.com/lymzzyh/ypm-plugin-netease`。
- **方式二**：下载或克隆本仓库，选择**从本地文件夹安装…**，选中包含 `plugin.json` 的文件夹。如果下载的是 ZIP，请先解压。

## 配置

1. 点击侧边栏左下角的头像，将音乐来源切换到**网易云音乐**。
2. 点击**登录**，使用手机上的**网易云音乐 App**扫描二维码，并在手机上确认。
3. 即可浏览个人歌单、喜欢的歌曲、收藏专辑和每日推荐。

仅提供扫码登录，无需配置服务器、API 密钥、密码或手动 Cookie。二维码失效会自动刷新，关闭弹窗后重新登录也会申请新码。登录状态保存在本机，退出登录仅清除本插件会话。

## 功能

- 首页：推荐歌单、登录后的每日推荐、排行榜、最新专辑与分类歌单
- 搜索歌曲、专辑、歌手、歌单，支持分页和搜索联想
- 专辑、歌手、歌单详情页，按原始顺序补全歌单曲目
- 喜欢的歌曲、收藏专辑、个人歌单与最近播放，支持红心 / 取消红心、收藏 / 取消收藏专辑
- 标准、高音质、无损与 Hi-Res 播放；插件设置可限制音质上限（不会高于播放器选择），Hi-Res 不可用时回退到无损，实际取决于账号权限和资源可用性
- 原文 LRC 同步歌词与翻译歌词（以服务提供为准），歌曲右键菜单可打开网易云网页
- 二维码自动刷新、短暂网络失败重试，以及旧登录请求隔离
- 与 YesPlayMusic 对齐的界面语言：英语、简体中文、繁体中文、日语、韩语、法语、德语、西班牙语、俄语

插件随应用界面语言切换。歌名、歌手名、歌单内容、歌词及网易云返回的消息保留服务端原文。

## 播放与兼容性

播放权限取决于会员、单曲购买、地区和版权。不会将试听片段当作完整歌曲播放，不提供权限绕过或下载功能。

插件使用网易云客户端接口，可能受接口变更和安全验证影响。登录受阻时，请先在网易云官方 App 完成验证后重试。一次登录最长等待约八分钟，单个歌单最多支持 10,000 首；非常大的歌单可能达到 YesPlayMusic 的请求时限。

## 开发

插件在 YesPlayMusic 内运行，无需 Node.js 或额外服务。如需运行独立的翻译测试，请使用 Node.js 22 或更新版本：

```sh
node --experimental-vm-modules --test test/localization.test.mjs
```

插件接口参考 [YesPlayMusic 插件开发指南](https://github.com/qier222/YesPlayMusic/blob/main/docs/plugins.md)，协议字段参考 [NeteaseCloudMusicApiEnhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced)。

## 协议

[MIT](LICENSE)。协议参考与网易云图标归属见[第三方说明](THIRD_PARTY_NOTICES.md)。
