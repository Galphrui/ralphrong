import { createHash, randomBytes, timingSafeEqual, pbkdf2Sync } from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 3001);
const usersPath = join(root, "data", "admin-users.json");
const postsPath = join(root, "data", "posts.json");
const messagesPath = join(root, "data", "messages.json");
const metricsPath = join(root, "data", "post-metrics.json");
const sessions = new Map();
const execFileAsync = promisify(execFile);
const PASSWORD_ITERATIONS = 100000;
const MAX_ASSET_CHUNK_BYTES = 8 * 1024 * 1024;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

createServer(async (request, response) => {
  try {
    if (request.url.startsWith("/api/")) {
      await handleApi(request, response);
      return;
    }
    await serveStatic(request, response);
  } catch (error) {
    sendJson(response, error.status || 500, { ok: false, error: error.message || "Server error" });
  }
}).listen(port, () => {
  console.log(`Local blog admin running at http://localhost:${port}/login.html`);
});

async function handleApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === "/api/register" && request.method === "POST") {
    const body = await readJson(request);
    const result = await register(body.username, body.password);
    const sessionToken = setSession(response, result.username);
    sendJson(response, 200, { ok: true, user: result.username, sessionToken });
    return;
  }

  if (url.pathname === "/api/password-reset" && request.method === "POST") {
    const body = await readJson(request);
    const result = await resetPasswordWithCode(body.username, body.password, body.resetCode);
    const sessionToken = setSession(response, result.user.username);
    sendJson(response, 200, { ok: true, user: result.user.username, sessionToken });
    return;
  }

  if (url.pathname === "/api/reset-code" && request.method === "PUT") {
    requireSession(request);
    const body = await readJson(request);
    await changeResetCode(body.resetCode);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/users" && request.method === "GET") {
    requireSession(request);
    const store = await readUsers();
    sendJson(response, 200, {
      ok: true,
      users: store.users.map(publicUser),
    });
    return;
  }

  if (url.pathname === "/api/users" && request.method === "POST") {
    requireSession(request);
    const body = await readJson(request);
    const result = await register(body.username, body.password);
    sendJson(response, 200, { ok: true, user: publicUser(result.user) });
    return;
  }

  if (url.pathname === "/api/users/password" && request.method === "PUT") {
    requireSession(request);
    const body = await readJson(request);
    const result = await changePassword(body.username, body.password);
    sendJson(response, 200, { ok: true, user: publicUser(result.user) });
    return;
  }

  if (url.pathname === "/api/users" && request.method === "DELETE") {
    requireSession(request);
    const body = await readJson(request);
    await deleteUser(body.username);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/login" && request.method === "POST") {
    const body = await readJson(request);
    const result = await login(body.username, body.password);
    const sessionToken = setSession(response, result.username);
    sendJson(response, 200, { ok: true, user: result.username, sessionToken });
    return;
  }

  if (url.pathname === "/api/messages" && request.method === "GET") {
    sendJson(response, 200, { ok: true, data: filterMessages(await readMessages(), url.searchParams.get("postSlug") || "") });
    return;
  }

  if (url.pathname === "/api/messages" && request.method === "POST") {
    const body = await readJson(request);
    const messages = await addMessage(body, request);
    sendJson(response, 200, { ok: true, data: messages });
    return;
  }

  if (url.pathname === "/api/post-metrics" && request.method === "GET") {
    sendJson(response, 200, { ok: true, data: publicPostMetrics(await readPostMetrics()) });
    return;
  }

  if (url.pathname === "/api/post-view" && request.method === "POST") {
    const body = await readJson(request);
    const metrics = await recordPostMetric(body.slug, "views");
    sendJson(response, 200, { ok: true, data: metrics });
    return;
  }

  if (url.pathname === "/api/post-like" && request.method === "POST") {
    const body = await readJson(request);
    const metrics = await recordPostLike(body.slug, body.visitorId);
    sendJson(response, 200, { ok: true, data: metrics });
    return;
  }

  if (url.pathname === "/api/logout" && request.method === "POST") {
    clearSession(request, response);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/session" && request.method === "GET") {
    const user = requireSession(request);
    sendJson(response, 200, { ok: true, user });
    return;
  }

  if (url.pathname === "/api/posts" && request.method === "GET") {
    requireSession(request);
    const data = await readPosts();
    sendJson(response, 200, { ok: true, data, sha: fileSha(JSON.stringify(data)) });
    return;
  }

  if (url.pathname === "/api/posts" && request.method === "PUT") {
    requireSession(request);
    const body = await readJson(request);
    await writePosts(body.data);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/publish" && request.method === "POST") {
    requireSession(request);
    const body = await readJson(request);
    await writePosts(body.data);
    const deploy = await deployDataFiles(["data/posts.json"], body.message || "chore: publish blog data");
    sendJson(response, 200, { ok: true, deploy });
    return;
  }

  if (url.pathname === "/api/assets" && request.method === "POST") {
    requireSession(request);
    const body = await readAssetRequest(request);
    const asset = await writeAssetFile(body);
    const deploy = await deployDataFiles([asset.path], `chore: upload asset ${asset.fileName}`);
    sendJson(response, 200, { ok: true, ...asset, deploy });
    return;
  }

  if (url.pathname === "/api/sync" && request.method === "POST") {
    requireSession(request);
    const deploy = await deployDataFiles(
      ["data/posts.json", "data/admin-users.json"],
      "chore: sync blog admin data",
    );
    sendJson(response, 200, { ok: true, deploy });
    return;
  }

  if (url.pathname === "/api/git/status" && request.method === "GET") {
    requireSession(request);
    const status = await getGitStatus(["data/posts.json", "data/admin-users.json"]);
    sendJson(response, 200, { ok: true, status });
    return;
  }

  sendJson(response, 404, { ok: false, error: "Not found" });
}

async function register(username, password) {
  const cleanUser = normalizeUsername(username);
  validatePassword(password);
  const store = await readUsers();
  if (store.users.some((user) => user.username.toLowerCase() === cleanUser.toLowerCase())) {
    throw httpError(409, "账号已存在。");
  }

  const salt = randomBytes(16).toString("hex");
  const iterations = PASSWORD_ITERATIONS;
  const user = {
    username: cleanUser,
    passwordHash: hashPassword(password, salt, iterations),
    salt,
    iterations,
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  await writeUsers(store);
  return { username: cleanUser, user };
}

async function changePassword(username, password) {
  const cleanUser = normalizeUsername(username);
  validatePassword(password);
  const store = await readUsers();
  const user = store.users.find((item) => item.username.toLowerCase() === cleanUser.toLowerCase());
  if (!user) throw httpError(404, "账号不存在。");

  user.salt = randomBytes(16).toString("hex");
  user.iterations = PASSWORD_ITERATIONS;
  user.passwordHash = hashPassword(password, user.salt, user.iterations);
  user.updatedAt = new Date().toISOString();
  await writeUsers(store);
  return { user };
}

async function resetPasswordWithCode(username, password, resetCode) {
  const cleanUser = normalizeUsername(username);
  validatePassword(password);
  const store = await readUsers();
  const user = store.users.find((item) => item.username.toLowerCase() === cleanUser.toLowerCase());
  if (!user) throw httpError(404, "账号不存在。");
  if (!verifyResetCode(store, resetCode)) throw httpError(401, "重置指令错误。");

  user.salt = randomBytes(16).toString("hex");
  user.iterations = PASSWORD_ITERATIONS;
  user.passwordHash = hashPassword(password, user.salt, user.iterations);
  user.updatedAt = new Date().toISOString();
  await writeUsers(store);
  return { user };
}

async function changeResetCode(resetCode) {
  const value = String(resetCode || "");
  if (value.length < 8) throw httpError(400, "重置指令至少需要 8 位。");
  const store = await readUsers();
  const salt = randomBytes(16).toString("hex");
  const iterations = PASSWORD_ITERATIONS;
  store.resetCode = {
    passwordHash: hashPassword(value, salt, iterations),
    salt,
    iterations,
    updatedAt: new Date().toISOString(),
  };
  await writeUsers(store);
}

async function deleteUser(username) {
  const cleanUser = normalizeUsername(username);
  const store = await readUsers();
  if (store.users.length <= 1) {
    throw httpError(400, "至少需要保留一个后台账号。");
  }
  const nextUsers = store.users.filter((item) => item.username.toLowerCase() !== cleanUser.toLowerCase());
  if (nextUsers.length === store.users.length) throw httpError(404, "账号不存在。");
  store.users = nextUsers;
  await writeUsers(store);
}

async function login(username, password) {
  const cleanUser = normalizeUsername(username);
  const store = await readUsers();
  const user = store.users.find((item) => item.username.toLowerCase() === cleanUser.toLowerCase());
  if (!user) throw httpError(401, "账号或密码错误。");

  const actual = hashPassword(password, user.salt, user.iterations);
  const ok =
    actual.length === user.passwordHash.length &&
    timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(user.passwordHash, "hex"));
  if (!ok) throw httpError(401, "账号或密码错误。");
  return { username: user.username };
}

async function readUsers() {
  if (!existsSync(usersPath)) return { version: 1, users: [] };
  return JSON.parse(await readFile(usersPath, "utf8"));
}

async function writeUsers(store) {
  await mkdir(join(root, "data"), { recursive: true });
  await writeFile(usersPath, `${JSON.stringify(store, null, 2)}\n`);
}

async function readPosts() {
  return JSON.parse(await readFile(postsPath, "utf8"));
}

async function writePosts(data) {
  await writeFile(postsPath, `${JSON.stringify(data, null, 2)}\n`);
}

async function readMessages() {
  if (!existsSync(messagesPath)) return [];
  const data = JSON.parse(await readFile(messagesPath, "utf8"));
  return Array.isArray(data) ? data : [];
}

async function writeMessages(messages) {
  await mkdir(join(root, "data"), { recursive: true });
  await writeFile(messagesPath, `${JSON.stringify(messages, null, 2)}\n`);
}

async function addMessage(body, request) {
  const message = normalizeGuestMessage(body);
  const messages = await readMessages();
  const next = [
    {
      id: `msg-${Date.now()}-${randomBytes(4).toString("hex")}`,
      name: message.name,
      message: message.message,
      postSlug: message.postSlug,
      createdAt: new Date().toISOString(),
      visitor: createHash("sha1").update(request.socket.remoteAddress || "local").digest("hex").slice(0, 12),
    },
    ...messages,
  ].slice(0, 80);
  await writeMessages(next);
  return filterMessages(next, message.postSlug);
}

function normalizeGuestMessage(body) {
  const name = normalizeText(body?.name || "陌生朋友").slice(0, 24) || "陌生朋友";
  const message = normalizeText(body?.message || "");
  const postSlug = normalizeOptionalSlug(body?.postSlug || "");
  if (message.length < 2) throw httpError(400, "留言至少需要 2 个字。");
  if (message.length > 240) throw httpError(400, "留言最多 240 个字。");
  if (hasBlockedTerm(`${name} ${message}`)) throw httpError(400, "留言包含明显不友好的词汇，请调整后再发布。");
  return { name, message, postSlug };
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function hasBlockedTerm(value) {
  return [
    /傻[逼b屄比]/i,
    /煞笔/i,
    /蠢货/i,
    /废物/i,
    /去死/i,
    /滚(开|蛋)?/i,
    /妈的/i,
    /操你/i,
    /草你/i,
    /fuck/i,
    /shit/i,
    /bitch/i,
    /nazi/i,
    /恐怖主义/i,
    /炸弹/i,
    /枪支/i,
    /毒品/i,
    /博彩/i,
    /赌博/i,
    /色情/i,
  ].some((pattern) => pattern.test(value));
}

function filterMessages(messages, postSlug) {
  const cleanSlug = normalizeOptionalSlug(postSlug || "");
  return messages.filter((message) => {
    const itemSlug = String(message?.postSlug || "");
    return cleanSlug ? itemSlug === cleanSlug : !itemSlug;
  });
}

async function readPostMetrics() {
  if (!existsSync(metricsPath)) return {};
  const data = JSON.parse(await readFile(metricsPath, "utf8"));
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

async function writePostMetrics(metrics) {
  await mkdir(join(root, "data"), { recursive: true });
  await writeFile(metricsPath, `${JSON.stringify(metrics, null, 2)}\n`);
}

async function recordPostMetric(slug, field) {
  const cleanSlug = normalizeSlug(slug);
  const metrics = await readPostMetrics();
  const item = metrics[cleanSlug] || { views: 0, likes: 0 };
  item[field] = Number(item[field] || 0) + 1;
  metrics[cleanSlug] = item;
  await writePostMetrics(metrics);
  return publicPostMetrics(metrics);
}

async function recordPostLike(slug, visitorId) {
  const cleanSlug = normalizeSlug(slug);
  const cleanVisitor = normalizeVisitorId(visitorId);
  const metrics = await readPostMetrics();
  const item = metrics[cleanSlug] || { views: 0, likes: 0, likedVisitors: [] };
  const likedVisitors = Array.isArray(item.likedVisitors) ? item.likedVisitors : [];
  if (!likedVisitors.includes(cleanVisitor)) {
    likedVisitors.push(cleanVisitor);
    item.likes = Number(item.likes || 0) + 1;
  }
  item.likedVisitors = likedVisitors.slice(-5000);
  metrics[cleanSlug] = item;
  await writePostMetrics(metrics);
  return publicPostMetrics(metrics);
}

function publicPostMetrics(metrics) {
  return Object.fromEntries(
    Object.entries(metrics).map(([slug, item]) => [
      slug,
      {
        views: Number(item?.views || 0),
        likes: Number(item?.likes || 0),
      },
    ]),
  );
}

function normalizeSlug(value) {
  const slug = String(value || "").trim();
  if (!slug || slug.length > 180 || /[\u0000-\u001f\u007f]/.test(slug)) {
    throw httpError(400, "文章标识无效。");
  }
  return slug;
}

function normalizeOptionalSlug(value) {
  const slug = String(value || "").trim();
  if (!slug) return "";
  return normalizeSlug(slug);
}

function normalizeVisitorId(value) {
  const text = String(value || "").trim();
  return /^[a-zA-Z0-9_-]{6,64}$/.test(text) ? text : "anonymous";
}

function setSession(response, username) {
  const sessionId = randomBytes(32).toString("hex");
  sessions.set(sessionId, {
    username,
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
  });
  response.setHeader("Set-Cookie", `blog_admin_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`);
  return sessionId;
}

function clearSession(request, response) {
  const sessionId = getCookie(request, "blog_admin_session");
  if (sessionId) sessions.delete(sessionId);
  response.setHeader("Set-Cookie", "blog_admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

function requireSession(request) {
  const sessionId = getBearerToken(request) || getCookie(request, "blog_admin_session");
  const session = sessionId ? sessions.get(sessionId) : null;
  if (!session || session.expiresAt < Date.now()) {
    if (sessionId) sessions.delete(sessionId);
    throw httpError(401, "请先登录。");
  }
  return session.username;
}

async function deployDataFiles(files, message) {
  const changedFiles = await getChangedFiles(files);
  if (!changedFiles.length) {
    return {
      pushed: false,
      branch: await currentBranch(),
      message: "没有需要推送的数据变更。",
      changedFiles: [],
    };
  }

  await runGit(["add", ...changedFiles]);
  const commit = await runGit(["commit", "-m", message, "--", ...changedFiles]);
  const branch = await currentBranch();
  const push = await runGit(["push", "origin", branch]);
  const headSha = await currentHeadSha();
  return {
    pushed: true,
    branch,
    message: "已提交并推送到 GitHub，GitHub Pages 稍后会自动构建。",
    changedFiles,
    commitSha: headSha,
    commit: commit.stdout.trim(),
    push: push.stdout.trim() || push.stderr.trim(),
  };
}

async function writeAssetFile(body = {}) {
  const fileName = safeFileName(body.fileName || "attachment");
  const bucket = safePathSegment(body.bucket || "tools");
  const parsed = parseAssetBody(body);
  const bytes = parsed.bytes;
  if (!bytes.length) throw httpError(400, "附件为空。");
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const chunked = Boolean(body.chunked);
  const chunkCount = Math.max(0, Number(body.chunkCount || 0));
  const chunkIndex = Math.max(0, Number(body.chunkIndex || 0));
  const assetId = safePathSegment(body.assetId || `${stamp}-${fileName}`);
  if (chunked && (!chunkCount || chunkIndex >= chunkCount)) throw httpError(400, "附件分包参数无效。");
  const partName = `part-${String(chunkIndex + 1).padStart(5, "0")}-of-${String(chunkCount).padStart(5, "0")}.bin`;
  const relativePath = chunked
    ? `public-assets/${bucket}/chunks/${assetId}/${partName}`
    : `public-assets/${bucket}/${stamp}-${fileName}`;
  const target = join(root, relativePath);
  await mkdir(join(root, "public-assets", bucket, ...(chunked ? ["chunks", assetId] : [])), { recursive: true });
  await writeFile(target, bytes);
  return {
    path: relativePath,
    fileName,
    mimeType: parsed.mimeType,
    size: bytes.length,
    chunked,
    assetId: chunked ? assetId : "",
    chunkIndex: chunked ? chunkIndex : undefined,
    chunkCount: chunked ? chunkCount : undefined,
    originalSize: chunked ? Number(body.originalSize || 0) : undefined,
    url: publicAssetUrl(relativePath),
    rawUrl: publicAssetUrl(relativePath),
  };
}

function parseAssetBody(body = {}) {
  if (body.contentBase64) {
    return {
      bytes: Buffer.from(String(body.contentBase64 || "").replace(/\s/g, ""), "base64"),
      mimeType: body.mimeType || "application/octet-stream",
    };
  }
  const dataUrl = String(body.dataUrl || "");
  const match = dataUrl.match(/^data:([^;,]+)?(?:;[^,]*)?;base64,(.+)$/);
  if (!match) throw httpError(400, "附件数据格式无效。");
  return {
    bytes: Buffer.from(match[2], "base64"),
    mimeType: body.mimeType || match[1] || "application/octet-stream",
  };
}

function publicAssetUrl(path) {
  return `./${path}`;
}

function safePathSegment(value) {
  return String(value || "assets").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "assets";
}

function safeFileName(value) {
  const clean = String(value || "attachment").split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return clean.replace(/[^\w.\-\u4e00-\u9fff]+/g, "-") || "attachment";
}

async function getGitStatus(files) {
  const changedFiles = await getChangedFiles(files);
  return {
    branch: await currentBranch(),
    changedFiles,
  };
}

async function getChangedFiles(files) {
  const result = await runGit(["status", "--porcelain", "--", ...files]);
  return result.stdout
    .split("\n")
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .map((file) => (file.includes(" -> ") ? file.split(" -> ").pop() : file));
}

async function currentBranch() {
  const result = await runGit(["rev-parse", "--abbrev-ref", "HEAD"]);
  return result.stdout.trim() || "main";
}

async function currentHeadSha() {
  const result = await runGit(["rev-parse", "HEAD"]);
  return result.stdout.trim();
}

async function runGit(args) {
  try {
    return await execFileAsync("git", args, { cwd: root, timeout: 120000 });
  } catch (error) {
    const message = [error.stderr, error.stdout, error.message].filter(Boolean).join("\n").trim();
    throw httpError(500, message || `git ${args.join(" ")} 执行失败。`);
  }
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = resolve(root, `.${normalize(pathname)}`);
  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function readAssetRequest(request) {
  const type = request.headers["content-type"] || "";
  if (!type.includes("multipart/form-data")) return readJson(request);
  const boundaryMatch = type.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw httpError(400, "附件表单缺少 boundary。");
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const parts = parseMultipart(Buffer.concat(chunks), boundaryMatch[1] || boundaryMatch[2]);
  const file = parts.find((part) => part.name === "file" && part.fileName);
  if (!file) throw httpError(400, "没有选择附件文件。");
  if (!file.data.length) throw httpError(400, "附件为空。");
  if (file.data.length > MAX_ASSET_CHUNK_BYTES) {
    throw httpError(413, `单个分包过大：${formatBytes(file.data.length)}，当前后台分包安全上限为 ${formatBytes(MAX_ASSET_CHUNK_BYTES)}。请刷新后台使用自动分包上传。`);
  }
  const bucket = parts.find((part) => part.name === "bucket")?.data.toString("utf8") || "tools";
  const field = (name, fallback = "") => parts.find((part) => part.name === name)?.data.toString("utf8") || fallback;
  return {
    bucket,
    fileName: field("originalFileName", file.fileName),
    mimeType: field("mimeType", file.contentType || "application/octet-stream"),
    contentBase64: file.data.toString("base64"),
    size: file.data.length,
    chunked: field("chunked") === "1" || field("chunked") === "true",
    assetId: field("assetId"),
    chunkIndex: Number(field("chunkIndex", "0")),
    chunkCount: Number(field("chunkCount", "0")),
    originalSize: Number(field("originalSize", "0")),
  };
}

function parseMultipart(buffer, boundary) {
  const marker = Buffer.from(`--${boundary}`);
  const parts = [];
  let cursor = buffer.indexOf(marker);
  while (cursor >= 0) {
    cursor += marker.length;
    if (buffer[cursor] === 45 && buffer[cursor + 1] === 45) break;
    if (buffer[cursor] === 13 && buffer[cursor + 1] === 10) cursor += 2;
    const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"), cursor);
    if (headerEnd < 0) break;
    const headers = buffer.slice(cursor, headerEnd).toString("utf8");
    const next = buffer.indexOf(marker, headerEnd + 4);
    if (next < 0) break;
    let dataEnd = next;
    if (buffer[dataEnd - 2] === 13 && buffer[dataEnd - 1] === 10) dataEnd -= 2;
    const disposition = headers.match(/content-disposition:[^\n]*name="([^"]+)"(?:;[^\n]*filename="([^"]*)")?/i);
    if (disposition) {
      const contentType = headers.match(/content-type:\s*([^\r\n]+)/i);
      parts.push({
        name: disposition[1],
        fileName: disposition[2] || "",
        contentType: contentType ? contentType[1].trim() : "",
        data: buffer.slice(headerEnd + 4, dataEnd),
      });
    }
    cursor = next;
  }
  return parts;
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function normalizeUsername(username) {
  const value = String(username || "").trim();
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(value)) {
    throw httpError(400, "账号只能包含字母、数字、下划线或短横线，长度 3 到 32 位。");
  }
  return value;
}

function validatePassword(password) {
  if (String(password || "").length < 8) {
    throw httpError(400, "密码至少需要 8 位。");
  }
}

function hashPassword(password, salt, iterations) {
  return pbkdf2Sync(String(password), salt, iterations, 32, "sha256").toString("hex");
}

function verifyResetCode(store, resetCode) {
  if (!store.resetCode?.passwordHash || !store.resetCode?.salt) return false;
  const actual = hashPassword(resetCode, store.resetCode.salt, store.resetCode.iterations || PASSWORD_ITERATIONS);
  return (
    actual.length === store.resetCode.passwordHash.length &&
    timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(store.resetCode.passwordHash, "hex"))
  );
}

function publicUser(user) {
  return {
    username: user.username,
    createdAt: user.createdAt || "",
    updatedAt: user.updatedAt || "",
  };
}

function fileSha(content) {
  return createHash("sha1").update(content).digest("hex");
}

function formatBytes(size) {
  const value = Number(size || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function getCookie(request, name) {
  return String(request.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function getBearerToken(request) {
  const header = String(request.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
