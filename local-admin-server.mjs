import { createHash, randomBytes, timingSafeEqual, pbkdf2Sync } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 8080);
const usersPath = join(root, "data", "admin-users.json");
const postsPath = join(root, "data", "posts.json");
const sessions = new Map();

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
    setSession(response, result.username);
    sendJson(response, 200, { ok: true, user: result.username });
    return;
  }

  if (url.pathname === "/api/password-reset" && request.method === "POST") {
    const body = await readJson(request);
    const result = await resetPasswordWithCode(body.username, body.password, body.resetCode);
    sendJson(response, 200, { ok: true, user: publicUser(result.user) });
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
    setSession(response, result.username);
    sendJson(response, 200, { ok: true, user: result.username });
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
  const iterations = 210000;
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
  user.iterations = 210000;
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
  user.iterations = 210000;
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
  const iterations = 210000;
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

function setSession(response, username) {
  const sessionId = randomBytes(32).toString("hex");
  sessions.set(sessionId, {
    username,
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
  });
  response.setHeader("Set-Cookie", `blog_admin_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`);
}

function clearSession(request, response) {
  const sessionId = getCookie(request, "blog_admin_session");
  if (sessionId) sessions.delete(sessionId);
  response.setHeader("Set-Cookie", "blog_admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

function requireSession(request) {
  const sessionId = getCookie(request, "blog_admin_session");
  const session = sessionId ? sessions.get(sessionId) : null;
  if (!session || session.expiresAt < Date.now()) {
    if (sessionId) sessions.delete(sessionId);
    throw httpError(401, "请先登录。");
  }
  return session.username;
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
  const actual = hashPassword(resetCode, store.resetCode.salt, store.resetCode.iterations || 210000);
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

function getCookie(request, name) {
  return String(request.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
