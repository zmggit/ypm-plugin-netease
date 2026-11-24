// 使用独立 ESM 上下文加载真实插件，验证翻译不会改变接口参数或音乐元数据。
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(root, "plugin.json")));
const dictionaries = Object.fromEntries(readdirSync(path.join(root, "locales")).map((name) => [
  name.slice(0, -5), JSON.parse(readFileSync(path.join(root, "locales", name))),
]));
const sourceKeys = new Set();
for (const file of ["index.js", "client.js", "models.js"]) {
  for (const match of readFileSync(path.join(root, file), "utf8").matchAll(/"([^"\n]*[\u3400-\u9fff][^"\n]*)"/g)) {
    if (match[1] !== "playlists:全部:0") sourceKeys.add(match[1]);
  }
}
sourceKeys.add(manifest.name);
sourceKeys.add(manifest.description);
for (const entry of manifest.navigation) if (entry.title) sourceKeys.add(entry.title);
for (const entry of manifest.settings || []) {
  if (entry.label) sourceKeys.add(entry.label);
  if (entry.help) sourceKeys.add(entry.help);
  for (const option of entry.options || []) if (option.label) sourceKeys.add(option.label);
}

async function runtime(language = "en") {
  const store = new Map();
  const settings = new Map();
  const prompts = [], requests = [];
  let payload;
  const env = { language, status: 200, body: null };
  const host = {
    t: (message) => dictionaries[env.language]?.[message] ?? message,
    storage: { get: (key) => store.get(key), set: (key, value) => store.set(key, value), remove: (key) => store.delete(key) },
    setting: (key) => settings.get(key) ?? "",
    crypto: { md5: () => "fixture", aesEcbEncrypt: (_, text) => { payload = JSON.parse(text.split("-36cd479b6b5-")[1]); return "fixture"; } },
    signInPrompt: (value = {}) => prompts.push(value),
  };
  const context = vm.createContext({
    URL, URLSearchParams, AbortSignal, console,
    setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 1)),
    host,
    fetch: async (url) => {
      requests.push({ url, payload });
      const body = typeof env.body === "function" ? env.body(url, payload) : env.body ?? (url.includes("/unikey") ? { code: 200, unikey: "fixture-qr" }
        : url.includes("/client/login") ? { code: -462 } : { code: 200, more: true, playlists: [] });
      return { ok: env.status === 200, status: env.status, headers: { getSetCookie: () => [] }, json: async () => body };
    },
  });
  const modules = new Map();
  function load(file) {
    if (modules.has(file)) return modules.get(file);
    assert.ok(!path.relative(root, file).startsWith(".."));
    const mod = new vm.SourceTextModule(readFileSync(file, "utf8"), { context, identifier: file });
    modules.set(file, mod);
    return mod;
  }
  const main = load(path.join(root, "index.js"));
  await main.link((specifier, ref) => load(path.resolve(path.dirname(ref.identifier), specifier)));
  await main.evaluate();
  return { env, store, settings, host, prompts, requests, plugin: main.namespace, models: modules.get(path.join(root, "models.js")).namespace, i18n: modules.get(path.join(root, "i18n.js")).namespace };
}

test("收藏专辑兼容音乐库的数组读取，保留分页参数且空页结束", async () => {
  const r = await runtime("zh-CN");
  r.store.set("cookies", { MUSIC_U: "fixture-session" });
  r.store.set("account", { id: "42", name: "测试用户" });
  for (const offset of [0, 50]) {
    r.env.body = { code: 200, hasMore: offset === 0, data: [{
      id: offset + 1, name: "测试专辑", picUrl: "http://p1.music.126.net/cover.jpg",
      artists: [{ id: 3, name: "歌手" }], size: 12, publishTime: 1700000000000,
    }] };
    const albums = await r.plugin.savedAlbums({ offset });
    // 播放器音乐库直接按 List 读取，包括 hasMore 为 false 的最后一个非空页。
    assert.ok(Array.isArray(albums));
    assert.equal(albums.length, 1);
    assert.equal(albums[0].id, String(offset + 1));
    assert.equal(albums[0].saved, true);
    assert.equal(albums[0].artists[0].name, "歌手");
    assert.equal(albums[0].imageUrl, "https://p1.music.126.net/cover.jpg");
    assert.equal(r.requests.at(-1).payload.offset, offset);
    assert.equal(r.requests.at(-1).payload.limit, 50);
  }
  r.env.body = { code: 200, hasMore: false, data: [] };
  assert.equal((await r.plugin.savedAlbums({ offset: 100 })).length, 0);
  r.env.body = { code: 200 };
  assert.ok(Array.isArray(await r.plugin.savedAlbums({ offset: 0 })));
});

test("九种语言覆盖全部文案，动态占位符保持一致", () => {
  assert.deepEqual(Object.keys(dictionaries).sort(), ["de", "en", "es", "fr", "ja", "ko", "ru", "zh-CN", "zh-TW"].sort());
  for (const [locale, messages] of Object.entries(dictionaries)) {
    assert.deepEqual(Object.keys(messages).sort(), [...sourceKeys].sort(), locale);
    for (const [key, value] of Object.entries(messages)) {
      assert.ok(typeof value === "string" && value.length > 0, `${locale}: ${key}`);
      const slots = (text) => [...text.matchAll(/\{\w+\}/g)].map((m) => m[0]).sort();
      assert.deepEqual(slots(value), slots(key), `${locale}: ${key}`);
      if (locale === "zh-CN") assert.equal(value, key);
      else if (locale !== "zh-TW" && locale !== "ja") assert.ok(!/[\u3400-\u9fff]/.test(value), `${locale}: ${key}`);
    }
  }
});

for (const locale of Object.keys(dictionaries)) {
  test(`${locale}：导航、分类、占位、错误和扫码提示均使用当前语言`, async () => {
    const r = await runtime(locale);
    const d = dictionaries[locale];
    const page = await r.plugin.browse({ page: "playlists:华语:0" });
    assert.equal(page.title, d["热门歌单"]);
    assert.equal(page.tabs[1].title, d["华语"]);
    assert.equal(page.tabs[1].page, "playlists:华语:0");
    assert.equal(r.requests[0].payload.cat, "华语");
    assert.equal(page.sections[1].links[0].title, d["下一页"]);
    assert.equal(r.models.track({}).name, d["未知歌曲"]);
    assert.equal(r.models.track({ name: "每日推荐" }).name, "每日推荐");
    await assert.rejects(r.plugin.liked({}), (e) => e.code === "signIn" && e.message === d["请先登录网易云音乐"]);
    await assert.rejects(r.plugin.signIn(), (e) => e.code === "failed");
    assert.ok(r.prompts.some((p) => p.text === d["请用网易云音乐 App 扫码，并在手机上确认登录"]));
    assert.ok(r.prompts.some((p) => p.qr === "https://music.163.com/login?codekey=fixture-qr"));
  });
}

test("切换语言立即生效，服务端占位符不被二次替换", async () => {
  const r = await runtime("en");
  assert.equal((await r.plugin.home()).title, "NetEase Cloud Music");
  r.env.language = "zh-TW";
  assert.equal((await r.plugin.home()).title, "網易雲音樂");
  r.env.language = "en";
  r.env.status = 503;
  await assert.rejects(r.plugin.home(), (e) => e.retryable && e.message.includes("HTTP 503"));
  r.env.status = 200;
  r.env.body = { code: 403, message: "服务端消息 {status}" };
  await assert.rejects(r.plugin.home(), (e) => e.message === "NetEase request failed (403): 服务端消息 {status}");
  assert.equal(r.i18n.t("网易云请求失败（{code}）：{message}", { code: 1, message: "$& {code}" }), "NetEase request failed (1): $& {code}");
});

test("音质设置只降不升，Hi-Res 取不到音频时回退到无损", async () => {
  const r = await runtime("zh-CN");
  r.store.set("cookies", { MUSIC_U: "fixture-session" });
  r.store.set("account", { id: "42", name: "测试用户" });
  const audio = (level) => ({ code: 200, data: [{ url: `http://p1.music.126.net/${level}.flac`, type: "flac", level, br: 1, size: 1 }] });

  // 应用程序音质高于插件上限时按上限降级。
  r.env.body = audio("standard");
  r.settings.set("quality", "standard");
  await r.plugin.stream({ id: "1", quality: "high" });
  assert.equal(r.requests.at(-1).payload.level, "standard");

  // 插件上限高于应用选择时不会升到应用没选的档位。
  r.env.body = audio("exhigh");
  r.settings.set("quality", "lossless");
  await r.plugin.stream({ id: "1", quality: "high" });
  assert.equal(r.requests.at(-1).payload.level, "exhigh");

  // 上限设为 Hi-Res：先请求 hires，没有可用地址时回退到无损。
  r.settings.set("quality", "hires");
  r.env.body = (url, payload) => payload.level === "hires"
    ? { code: 200, data: [{ url: null }] }
    : audio("lossless");
  const result = await r.plugin.stream({ id: "1", quality: "lossless" });
  assert.equal(result.url, "https://p1.music.126.net/lossless.flac");
  assert.deepEqual(r.requests.slice(-2).map((x) => x.payload.level), ["hires", "lossless"]);

  // 未设置（旧版本宿主没有 host.setting）时保持播放器请求的音质。
  delete r.host.setting;
  r.settings.delete("quality");
  r.env.body = audio("lossless");
  await r.plugin.stream({ id: "1", quality: "lossless" });
  assert.equal(r.requests.at(-1).payload.level, "lossless");
});

test("README 互链、仓库安装地址和许可证一致", () => {
  for (const name of ["README.md", "README.zh-CN.md"]) {
    const text = readFileSync(path.join(root, name), "utf8");
    assert.ok(text.includes("github.com/lymzzyh/ypm-plugin-netease"));
    assert.ok(text.includes(name === "README.md" ? "(README.zh-CN.md)" : "(README.md)"));
    assert.ok(text.includes("[MIT](LICENSE)"));
  }
  assert.ok(readFileSync(path.join(root, "LICENSE"), "utf8").startsWith("MIT License"));
});
