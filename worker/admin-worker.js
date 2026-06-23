const DEFAULT_BRANCH = "main";
const DEFAULT_DATA_PATH = "data/posts.json";
const DEFAULT_USERS_PATH = "data/admin-users.json";
const DEFAULT_SESSION_SECONDS = 60 * 60 * 8;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    try {
      if (url.pathname === "/api/login" && request.method === "POST") {
        return login(request, env);
      }
      if (url.pathname === "/api/logout" && request.method === "POST") {
        return logout(request, env);
      }
      if (url.pathname === "/api/session" && request.method === "GET") {
        const session = await requireSession(request, env);
        return json({ ok: true, user: session.sub }, request, env);
      }
      if (url.pathname === "/api/posts" && request.method === "GET") {
        await requireSession(request, env);
        const remote = await readGitHubData(env);
        return json({ ok: true, data: remote.data, sha: remote.sha }, request, env);
      }
      if (url.pathname === "/api/posts" && request.method === "PUT") {
        await requireSession(request, env);
        const body = await request.json();
        await writeGitHubData(env, body.data);
        return json({ ok: true }, request, env);
      }

      return json({ ok: false, error: "Not found" }, request, env, 404);
    } catch (error) {
      return json({ ok: false, error: error.message || "Server error" }, request, env, error.status || 500);
    }
  },
};

async function login(request, env) {
  const body = await request.json();
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const users = await readGitHubUsers(env);
  const user = users.users.find((item) => item.username.toLowerCase() === username.toLowerCase());

  const ok = user ? await verifyUserPassword(password, user) : false;
  if (!ok) throw httpError(401, "账号或密码错误。");

  const sessionSeconds = Number(env.SESSION_SECONDS || DEFAULT_SESSION_SECONDS);
  const expiresAt = Math.floor(Date.now() / 1000) + sessionSeconds;
  const cookie = await signSession({ sub: user.username, exp: expiresAt }, env);

  return json(
    { ok: true, user: user.username },
    request,
    env,
    200,
    {
      "Set-Cookie": `blog_admin_session=${cookie}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${sessionSeconds}`,
    },
  );
}

function logout(request, env) {
  return json(
    { ok: true },
    request,
    env,
    200,
    {
      "Set-Cookie": "blog_admin_session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0",
    },
  );
}

async function requireSession(request, env) {
  const cookie = getCookie(request.headers.get("Cookie") || "", "blog_admin_session");
  if (!cookie) throw httpError(401, "请先登录。");

  const session = await verifySession(cookie, env);
  if (!session) throw httpError(401, "登录已过期，请重新登录。");
  return session;
}

async function readGitHubData(env) {
  return readGitHubJson(env, githubInfo(env).path);
}

async function readGitHubUsers(env) {
  return readGitHubJson(env, env.GITHUB_USERS_PATH || DEFAULT_USERS_PATH).then((remote) => remote.data);
}

async function readGitHubJson(env, path) {
  const info = githubInfo(env);
  const response = await fetch(
    `https://api.github.com/repos/${info.owner}/${info.repo}/contents/${path}?ref=${encodeURIComponent(info.branch)}`,
    {
      headers: githubHeaders(env),
    },
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw httpError(response.status, result.message || "读取 GitHub 数据失败。");
  }

  return {
    sha: result.sha,
    data: JSON.parse(fromBase64(result.content)),
  };
}

async function writeGitHubData(env, data) {
  const info = githubInfo(env);
  const remote = await readGitHubData(env);
  const response = await fetch(`https://api.github.com/repos/${info.owner}/${info.repo}/contents/${info.path}`, {
    method: "PUT",
    headers: githubHeaders(env),
    body: JSON.stringify({
      message: `chore: update blog data ${new Date().toISOString()}`,
      content: toBase64(JSON.stringify(data, null, 2) + "\n"),
      branch: info.branch,
      sha: remote.sha,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw httpError(response.status, result.message || "写入 GitHub 数据失败。");
  }
  return result;
}

function githubInfo(env) {
  return {
    owner: required(env.GITHUB_OWNER, "GITHUB_OWNER"),
    repo: required(env.GITHUB_REPO, "GITHUB_REPO"),
    branch: env.GITHUB_BRANCH || DEFAULT_BRANCH,
    path: env.GITHUB_DATA_PATH || DEFAULT_DATA_PATH,
  };
}

function githubHeaders(env) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${required(env.GITHUB_TOKEN, "GITHUB_TOKEN")}`,
    "User-Agent": "tech-blog-admin-worker",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function verifyUserPassword(password, user) {
  const hash = await derivePasswordHash(password, user.salt, user.iterations);
  return timingSafeEqual(hash, user.passwordHash);
}

async function derivePasswordHash(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", textBytes(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: textBytes(salt),
      iterations: Number(iterations),
    },
    key,
    256,
  );
  return hex(new Uint8Array(bits));
}

async function signSession(payload, env) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await hmac(encodedPayload, required(env.SESSION_SECRET, "SESSION_SECRET"));
  return `${encodedPayload}.${signature}`;
}

async function verifySession(cookie, env) {
  const [payload, signature] = cookie.split(".");
  if (!payload || !signature) return null;

  const expected = await hmac(payload, required(env.SESSION_SECRET, "SESSION_SECRET"));
  if (!timingSafeEqual(signature, expected)) return null;

  const session = JSON.parse(base64UrlDecode(payload));
  if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) return null;
  return session;
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey("raw", textBytes(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signature = await crypto.subtle.sign("HMAC", key, textBytes(value));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = env.ADMIN_ORIGIN || "https://galphrui.github.io";
  const headers = new Headers({
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    Vary: "Origin",
  });
  if (origin === allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

function json(body, request, env, status = 200, extraHeaders = {}) {
  const headers = corsHeaders(request, env);
  headers.set("Content-Type", "application/json; charset=utf-8");
  Object.entries(extraHeaders).forEach(([key, value]) => headers.set(key, value));
  return new Response(JSON.stringify(body), { status, headers });
}

function getCookie(cookieHeader, name) {
  return cookieHeader
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

function required(value, name) {
  if (!value) throw httpError(500, `Worker 缺少环境变量：${name}`);
  return value;
}

function textBytes(value) {
  return new TextEncoder().encode(value);
}

function hex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

function fromBase64(value) {
  return decodeURIComponent(escape(atob(value.replace(/\n/g, ""))));
}

function toBase64(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

function base64UrlEncode(value) {
  return base64UrlEncodeBytes(textBytes(value));
}

function base64UrlEncodeBytes(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return decodeURIComponent(escape(atob(padded)));
}
