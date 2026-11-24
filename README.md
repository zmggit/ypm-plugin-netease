# NetEase Cloud Music for YesPlayMusic

English · [简体中文](README.zh-CN.md)

Community NetEase Cloud Music source plugin for [YesPlayMusic](https://github.com/qier222/YesPlayMusic) **3.0.0 or later**. This is not an official NetEase plugin.

## Installation

- **Option 1 (Recommended)**: Open YesPlayMusic → **Settings → Plugins → Install Plugin** and paste `github.com/lymzzyh/ypm-plugin-netease`.
- **Option 2**: Download or clone this repository, then choose **Install from Local Folder…** and select the folder containing `plugin.json`. If you downloaded a ZIP, extract it first.

## Configuration

1. Switch the active music source to **NetEase Cloud Music** using the avatar at the bottom of the sidebar.
2. Click **Sign in**, scan the QR code with the **NetEase Cloud Music mobile app**, and confirm on your phone.
3. Browse your playlists, liked tracks, saved albums, and daily recommendations.

QR sign-in is the only login method. No server, API key, password, or manual Cookie configuration is required. Expired codes refresh automatically; reopening sign-in requests a new code. Sessions are saved locally, and signing out only clears this plugin’s session.

## Features

- Home: recommended playlists, daily recommendations after sign-in, charts, new albums, and playlist categories
- Search tracks, albums, artists, and playlists, with pagination and search suggestions
- Album, artist, and playlist pages, with playlist tracks loaded in their original order
- Liked tracks, saved albums, personal playlists, and recent listening history; like/unlike tracks and save/unsave albums
- Standard, High, Lossless, and Hi-Res playback; the plugin setting caps quality without exceeding the player's choice, and Hi-Res falls back to Lossless, subject to account permissions and availability
- Synced LRC lyrics and translations when available, plus a track menu shortcut to the NetEase website
- Automatic QR refresh, retries for temporary connection failures, and protection against outdated sign-in responses
- Interface translations matching YesPlayMusic: English, Simplified Chinese, Traditional Chinese, Japanese, Korean, French, German, Spanish, and Russian

The plugin follows the application’s interface language. Track names, artist names, playlist content, lyrics, and messages returned by NetEase are displayed as provided by the service.

## Playback and compatibility

Playback depends on your subscription, purchased tracks, regional availability, and licensing. Preview clips are not presented as full tracks. The plugin does not bypass access restrictions or provide downloads.

The plugin uses NetEase client endpoints, which may change or require verification. If sign-in is blocked, complete verification in the official NetEase app and try again. A sign-in attempt lasts up to eight minutes; a playlist supports up to 10,000 tracks. Very large playlists may reach YesPlayMusic’s request timeout.

## Development

The plugin runs inside YesPlayMusic without Node.js or external services. To run the standalone translation tests, use Node.js 22 or later:

```sh
node --experimental-vm-modules --test test/localization.test.mjs
```

Plugin API: [YesPlayMusic plugin guide](https://github.com/qier222/YesPlayMusic/blob/main/docs/plugins.md). Protocol reference: [NeteaseCloudMusicApiEnhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced).

## License

[MIT](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md) for protocol references and the NetEase logo attribution.
