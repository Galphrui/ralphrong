const DEFAULT_BRANCH = "main";
const DEFAULT_DATA_PATH = "data/posts.json";
const DEFAULT_USERS_PATH = "data/admin-users.json";
const DEFAULT_SESSION_SECONDS = 60 * 60 * 8;
const PASSWORD_ITERATIONS = 100000;
const ADMIN_USER_INDEX_KEY = "admin-user-index";
const GUEST_MESSAGES_KEY = "guest-messages";
const POST_METRICS_KEY = "post-metrics";
const MAX_ASSET_CHUNK_BYTES = 24 * 1024 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    try {
      if (url.pathname === "/api/login" && request.method === "POST") {
        return await login(request, env);
      }
      if (url.pathname === "/api/visits" && request.method === "GET") {
        return await getVisits(request, env);
      }
      if (url.pathname === "/api/visits" && request.method === "POST") {
        return await recordVisit(request, env);
      }
      if (url.pathname === "/api/messages" && request.method === "GET") {
        return await getMessages(request, env);
      }
      if (url.pathname === "/api/messages" && request.method === "POST") {
        return await createMessage(request, env);
      }
      if (url.pathname === "/api/post-metrics" && request.method === "GET") {
        return await getPostMetrics(request, env);
      }
      if (url.pathname === "/api/post-view" && request.method === "POST") {
        return await recordPostView(request, env);
      }
      if (url.pathname === "/api/post-like" && request.method === "POST") {
        return await recordPostLike(request, env);
      }
      if (url.pathname === "/api/password-reset" && request.method === "POST") {
        return await resetPassword(request, env);
      }
      if (url.pathname === "/api/reset-code" && request.method === "PUT") {
        await requireSession(request, env);
        const body = await request.json();
        await updateResetCode(env, body.resetCode);
        return json({ ok: true }, request, env);
      }
      if (url.pathname === "/api/logout" && request.method === "POST") {
        return await logout(request, env);
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
        const body = await readRequestJson(request, "发布数据");
        if (!body || typeof body.data !== "object" || Array.isArray(body.data)) {
          throw httpError(400, "发布数据格式无效，请先保存当前配置后再发布。");
        }
        const deploy = await writeGitHubData(env, body.data);
        return json({ ok: true, deploy }, request, env);
      }
      if (url.pathname === "/api/assets" && request.method === "POST") {
        await requireSession(request, env);
        const body = await readAssetRequest(request);
        const asset = await writeGitHubAsset(env, body);
        return json({ ok: true, ...asset }, request, env);
      }

      return json({ ok: false, error: "Not found" }, request, env, 404);
    } catch (error) {
      return json({ ok: false, error: error.message || "Server error" }, request, env, error.status || 500);
    }
  },
};

async function getVisits(request, env) {
  const data = await readVisitStats(env);
  return json({ ok: true, data }, request, env);
}

async function readAssetRequest(request) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      throw httpError(400, "没有选择附件文件。");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!bytes.length) throw httpError(400, "附件为空。");
    if (bytes.length > MAX_ASSET_CHUNK_BYTES) {
      throw httpError(413, `单个分包过大：${formatBytes(bytes.length)}，当前后台分包安全上限为 ${formatBytes(MAX_ASSET_CHUNK_BYTES)}。请刷新后台使用自动分包上传。`);
    }
    return {
      bucket: form.get("bucket") || "tools",
      fileName: form.get("originalFileName") || file.name || "attachment",
      mimeType: form.get("mimeType") || file.type || "application/octet-stream",
      contentBase64: base64EncodeBytes(bytes),
      size: bytes.length,
      chunked: form.get("chunked") === "1" || form.get("chunked") === "true",
      assetId: form.get("assetId") || "",
      chunkIndex: Number(form.get("chunkIndex") || 0),
      chunkCount: Number(form.get("chunkCount") || 0),
      originalSize: Number(form.get("originalSize") || 0),
    };
  }
  return readRequestJson(request, "附件数据");
}

async function recordVisit(request, env) {
  const body = await request.json().catch(() => ({}));
  const visitorId = normalizeVisitorId(body.visitorId);
  const data = await readVisitStats(env);
  data.visits += 1;
  data.lastVisitAt = new Date().toISOString();

  if (visitorId) {
    const knownKey = `visitor:${visitorId}`;
    const known = await env.VISIT_KV.get(knownKey);
    if (!known) {
      data.visitors += 1;
      await env.VISIT_KV.put(knownKey, data.lastVisitAt);
    }
  }

  await env.VISIT_KV.put("stats", JSON.stringify(data));
  return json({ ok: true, data }, request, env);
}

async function readVisitStats(env) {
  if (!env.VISIT_KV) throw httpError(500, "Worker 缺少 VISIT_KV 绑定。");
  const stored = await env.VISIT_KV.get("stats", "json");
  return {
    visits: Number(stored?.visits || 0),
    visitors: Number(stored?.visitors || 0),
    lastVisitAt: stored?.lastVisitAt || "",
  };
}

async function getMessages(request, env) {
  const url = new URL(request.url);
  const data = filterMessages(await readMessages(env), url.searchParams.get("postSlug") || "");
  return json({ ok: true, data }, request, env);
}

async function createMessage(request, env) {
  const body = await request.json().catch(() => ({}));
  const message = normalizeGuestMessage(body);
  const messages = await readMessages(env);
  const visitorHash = await sha1(request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "");
  const next = [
    {
      id: `msg-${Date.now()}-${hex(crypto.getRandomValues(new Uint8Array(4)))}`,
      name: message.name,
      message: message.message,
      postSlug: message.postSlug,
      createdAt: new Date().toISOString(),
      visitor: visitorHash.slice(0, 12),
    },
    ...messages,
  ].slice(0, 80);
  await writeMessages(env, next);
  return json({ ok: true, data: filterMessages(next, message.postSlug) }, request, env);
}

async function readMessages(env) {
  if (!env.VISIT_KV) throw httpError(500, "Worker 缺少 VISIT_KV 绑定。");
  const stored = await env.VISIT_KV.get(GUEST_MESSAGES_KEY, "json").catch(() => []);
  return Array.isArray(stored) ? stored : [];
}

async function writeMessages(env, messages) {
  if (!env.VISIT_KV) throw httpError(500, "Worker 缺少 VISIT_KV 绑定。");
  await env.VISIT_KV.put(GUEST_MESSAGES_KEY, JSON.stringify(messages));
}

async function getPostMetrics(request, env) {
  const metrics = await readPostMetrics(env);
  return json({ ok: true, data: publicPostMetrics(metrics) }, request, env);
}

async function recordPostView(request, env) {
  const body = await request.json().catch(() => ({}));
  const metrics = await recordPostMetric(env, body.slug, "views");
  return json({ ok: true, data: publicPostMetrics(metrics) }, request, env);
}

async function recordPostLike(request, env) {
  const body = await request.json().catch(() => ({}));
  const slug = normalizeSlug(body.slug);
  const visitorId = normalizeVisitorId(body.visitorId);
  const metrics = await readPostMetrics(env);
  const item = metrics[slug] || { views: 0, likes: 0, likedVisitors: [] };
  const likedVisitors = Array.isArray(item.likedVisitors) ? item.likedVisitors : [];
  if (!likedVisitors.includes(visitorId)) {
    likedVisitors.push(visitorId);
    item.likes = Number(item.likes || 0) + 1;
  }
  item.likedVisitors = likedVisitors.slice(-5000);
  metrics[slug] = item;
  await writePostMetrics(env, metrics);
  return json({ ok: true, data: publicPostMetrics(metrics) }, request, env);
}

async function recordPostMetric(env, slug, field) {
  const cleanSlug = normalizeSlug(slug);
  const metrics = await readPostMetrics(env);
  const item = metrics[cleanSlug] || { views: 0, likes: 0 };
  item[field] = Number(item[field] || 0) + 1;
  metrics[cleanSlug] = item;
  await writePostMetrics(env, metrics);
  return metrics;
}

async function readPostMetrics(env) {
  if (!env.VISIT_KV) throw httpError(500, "Worker 缺少 VISIT_KV 绑定。");
  const stored = await env.VISIT_KV.get(POST_METRICS_KEY, "json").catch(() => ({}));
  return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
}

async function writePostMetrics(env, metrics) {
  if (!env.VISIT_KV) throw httpError(500, "Worker 缺少 VISIT_KV 绑定。");
  await env.VISIT_KV.put(POST_METRICS_KEY, JSON.stringify(metrics));
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

function normalizeVisitorId(value) {
  const text = String(value || "").trim();
  return /^[a-zA-Z0-9_-]{6,64}$/.test(text) ? text : "";
}

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
    { ok: true, user: user.username, sessionToken: cookie },
    request,
    env,
    200,
    {
      "Set-Cookie": `blog_admin_session=${cookie}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${sessionSeconds}`,
    },
  );
}

async function resetPassword(request, env) {
  const body = await request.json();
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const resetCode = String(body.resetCode || "");
  validatePassword(password);

  const remote = await readGitHubUsersRemote(env);
  const users = remote.data;
  const user = users.users.find((item) => item.username.toLowerCase() === username.toLowerCase());
  if (!user) throw httpError(404, "账号不存在。");
  const ok = await verifyResetCode(resetCode, users);
  if (!ok) throw httpError(401, "重置指令错误。");

  const next = await createPasswordRecord(password);
  user.passwordHash = next.passwordHash;
  user.salt = next.salt;
  user.iterations = next.iterations;
  user.updatedAt = new Date().toISOString();
  if (env.GITHUB_TOKEN) {
    await writeGitHubUsers(env, users, remote.sha, "chore: reset admin password");
  } else {
    await writeAdminUserOverride(env, user);
  }

  const sessionSeconds = Number(env.SESSION_SECONDS || DEFAULT_SESSION_SECONDS);
  const expiresAt = Math.floor(Date.now() / 1000) + sessionSeconds;
  const cookie = await signSession({ sub: user.username, exp: expiresAt }, env);
  return json(
    { ok: true, user: user.username, sessionToken: cookie },
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
  const cookie =
    getBearerToken(request.headers.get("Authorization") || "") ||
    getCookie(request.headers.get("Cookie") || "", "blog_admin_session");
  if (!cookie) throw httpError(401, "请先登录。");

  const session = await verifySession(cookie, env);
  if (!session) throw httpError(401, "登录已过期，请重新登录。");
  return session;
}

async function readGitHubData(env) {
  return readGitHubJson(env, githubInfo(env).path);
}

async function readGitHubUsers(env) {
  const remote = await readGitHubUsersRemote(env);
  return applyAdminUserOverrides(env, remote.data);
}

async function readGitHubUsersRemote(env) {
  return readGitHubJson(env, env.GITHUB_USERS_PATH || DEFAULT_USERS_PATH);
}

async function readGitHubJson(env, path) {
  const info = githubInfo(env);
  const response = await fetch(
    `https://api.github.com/repos/${info.owner}/${info.repo}/contents/${path}?ref=${encodeURIComponent(info.branch)}`,
    {
      headers: githubReadHeaders(env),
    },
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw httpError(response.status, result.message || "读取 GitHub 数据失败。");
  }
  let text = result.content ? fromBase64(result.content) : "";
  if (!String(text || "").trim() && (result.encoding === "none" || result.git_url || result.sha)) {
    text = await readGitHubBlobText(env, info, result);
  }

  return {
    sha: result.sha,
    data: parseStoredJson(text, path),
  };
}

async function readGitHubBlobText(env, info, file) {
  const url = file.git_url || `https://api.github.com/repos/${info.owner}/${info.repo}/git/blobs/${file.sha}`;
  const response = await fetch(url, {
    headers: githubReadHeaders(env),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw httpError(response.status, result.message || "读取 GitHub 大文件数据失败。");
  }
  if (result.encoding !== "base64") {
    throw httpError(500, "GitHub 大文件数据编码无法识别，无法发布。");
  }
  return fromBase64(result.content || "");
}

async function readRequestJson(request, label = "请求数据") {
  try {
    return await request.json();
  } catch (error) {
    throw httpError(400, `${label}不是有效 JSON，请刷新后台后重试。`);
  }
}

function parseStoredJson(text, path) {
  if (!String(text || "").trim()) {
    throw httpError(500, `GitHub 数据文件 ${path} 为空，无法发布。请先恢复该 JSON 文件内容。`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw httpError(500, `GitHub 数据文件 ${path} 不是有效 JSON，无法发布。请先修复文件格式后重试。`);
  }
}

async function writeGitHubData(env, data) {
  const info = githubInfo(env);
  const remote = await readGitHubData(env);
  const response = await fetch(`https://api.github.com/repos/${info.owner}/${info.repo}/contents/${info.path}`, {
    method: "PUT",
    headers: githubWriteHeaders(env),
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
  const workflow = await triggerPagesWorkflow(env).catch((error) => ({
    triggered: false,
    error: error.message || "GitHub Actions 触发失败。",
  }));
  return {
    pushed: true,
    branch: info.branch,
    commitSha: result.commit?.sha || "",
    workflowTriggered: workflow.triggered,
    workflowError: workflow.error || "",
    message: "已写入 GitHub，等待 GitHub Pages 构建。",
  };
}

async function writeGitHubAsset(env, body = {}) {
  const info = githubInfo(env);
  const fileName = safeFileName(body.fileName || "attachment");
  const bucket = safePathSegment(body.bucket || "tools");
  const parsed = parseAssetBody(body);
  const content = parsed.content;
  if (!content) throw httpError(400, "附件为空。");
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const chunked = Boolean(body.chunked);
  const chunkCount = Math.max(0, Number(body.chunkCount || 0));
  const chunkIndex = Math.max(0, Number(body.chunkIndex || 0));
  const assetId = safePathSegment(body.assetId || `${stamp}-${fileName}`);
  if (chunked && (!chunkCount || chunkIndex >= chunkCount)) throw httpError(400, "附件分包参数无效。");
  const partName = `part-${String(chunkIndex + 1).padStart(5, "0")}-of-${String(chunkCount).padStart(5, "0")}.bin`;
  const path = chunked
    ? `public-assets/${bucket}/chunks/${assetId}/${partName}`
    : `public-assets/${bucket}/${stamp}-${fileName}`;
  const response = await fetch(`https://api.github.com/repos/${info.owner}/${info.repo}/contents/${path}`, {
    method: "PUT",
    headers: githubWriteHeaders(env),
    body: JSON.stringify({
      message: chunked
        ? `chore: upload asset chunk ${fileName} ${chunkIndex + 1}/${chunkCount}`
        : `chore: upload asset ${fileName}`,
      content,
      branch: info.branch,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw httpError(response.status, result.message || "写入 GitHub 附件失败。");
  return {
    path,
    fileName,
    mimeType: parsed.mimeType,
    size: parsed.size,
    chunked,
    assetId: chunked ? assetId : "",
    chunkIndex: chunked ? chunkIndex : undefined,
    chunkCount: chunked ? chunkCount : undefined,
    originalSize: chunked ? Number(body.originalSize || 0) : undefined,
    url: publicAssetUrl(env, path),
    rawUrl: result.content?.download_url || rawGitHubAssetUrl(info, path),
    commitSha: result.commit?.sha || "",
  };
}

function parseAssetBody(body = {}) {
  if (body.contentBase64) {
    const content = String(body.contentBase64 || "").replace(/\s/g, "");
    return {
      content,
      mimeType: body.mimeType || "application/octet-stream",
      size: Number(body.size || Math.floor((content.length * 3) / 4)),
    };
  }
  const dataUrl = String(body.dataUrl || "");
  const match = dataUrl.match(/^data:([^;,]+)?(?:;[^,]*)?;base64,(.+)$/);
  if (!match) throw httpError(400, "附件数据格式无效。");
  const content = match[2].replace(/\s/g, "");
  return {
    content,
    mimeType: body.mimeType || match[1] || "application/octet-stream",
    size: Math.floor((content.length * 3) / 4),
  };
}

async function triggerPagesWorkflow(env) {
  const info = githubInfo(env);
  const response = await fetch(
    `https://api.github.com/repos/${info.owner}/${info.repo}/actions/workflows/deploy.yml/dispatches`,
    {
      method: "POST",
      headers: githubWriteHeaders(env),
      body: JSON.stringify({ ref: info.branch }),
    },
  );
  if (response.status === 204) return { triggered: true };
  const result = await response.json().catch(() => ({}));
  throw httpError(response.status, result.message || "触发 GitHub Actions 失败。");
}

async function writeGitHubUsers(env, data, sha, message = "chore: update admin users") {
  const info = githubInfo(env);
  const path = env.GITHUB_USERS_PATH || DEFAULT_USERS_PATH;
  const response = await fetch(`https://api.github.com/repos/${info.owner}/${info.repo}/contents/${path}`, {
    method: "PUT",
    headers: githubWriteHeaders(env),
    body: JSON.stringify({
      message,
      content: toBase64(JSON.stringify(data, null, 2) + "\n"),
      branch: info.branch,
      sha,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw httpError(response.status, result.message || "写入 GitHub 账号数据失败。");
  }
  return result;
}

async function updateResetCode(env, resetCode) {
  const value = String(resetCode || "");
  if (value.length < 8) throw httpError(400, "重置指令至少需要 8 位。");
  const remote = await readGitHubUsersRemote(env);
  const next = await createPasswordRecord(value);
  remote.data.resetCode = {
    passwordHash: next.passwordHash,
    salt: next.salt,
    iterations: next.iterations,
    updatedAt: new Date().toISOString(),
  };
  await writeGitHubUsers(env, remote.data, remote.sha, "chore: update admin reset code");
}

async function applyAdminUserOverrides(env, users) {
  if (!env.VISIT_KV) return users;
  const index = await env.VISIT_KV.get(ADMIN_USER_INDEX_KEY, "json").catch(() => []);
  if (!Array.isArray(index) || !index.length) return users;

  const byName = new Map(users.users.map((user) => [user.username.toLowerCase(), user]));
  for (const username of index) {
    const override = await env.VISIT_KV.get(adminUserKey(username), "json").catch(() => null);
    if (!override?.username || !override?.passwordHash || !override?.salt) continue;
    byName.set(override.username.toLowerCase(), {
      ...(byName.get(override.username.toLowerCase()) || {}),
      ...override,
    });
  }

  return {
    ...users,
    users: [...byName.values()],
  };
}

async function writeAdminUserOverride(env, user) {
  if (!env.VISIT_KV) throw httpError(500, "Worker 缺少 VISIT_KV 绑定，无法保存外网密码重置。");
  const cleanUser = {
    username: user.username,
    passwordHash: user.passwordHash,
    salt: user.salt,
    iterations: user.iterations,
    createdAt: user.createdAt || "",
    updatedAt: user.updatedAt || new Date().toISOString(),
  };
  await env.VISIT_KV.put(adminUserKey(cleanUser.username), JSON.stringify(cleanUser));
  const index = await env.VISIT_KV.get(ADMIN_USER_INDEX_KEY, "json").catch(() => []);
  const nextIndex = Array.from(new Set([...(Array.isArray(index) ? index : []), cleanUser.username.toLowerCase()]));
  await env.VISIT_KV.put(ADMIN_USER_INDEX_KEY, JSON.stringify(nextIndex));
}

function adminUserKey(username) {
  return `admin-user:${String(username || "").toLowerCase()}`;
}

function githubInfo(env) {
  return {
    owner: required(env.GITHUB_OWNER, "GITHUB_OWNER"),
    repo: required(env.GITHUB_REPO, "GITHUB_REPO"),
    branch: env.GITHUB_BRANCH || DEFAULT_BRANCH,
    path: env.GITHUB_DATA_PATH || DEFAULT_DATA_PATH,
  };
}

function githubReadHeaders(env) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "tech-blog-admin-worker",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  return headers;
}

function githubWriteHeaders(env) {
  return {
    ...githubReadHeaders(env),
    Authorization: `Bearer ${requiredGitHubToken(env)}`,
  };
}

function publicAssetUrl(env, path) {
  const info = githubInfo(env);
  const configured = env.PUBLIC_SITE_BASE || "";
  if (configured) return `${configured.replace(/\/+$/, "")}/${path}`;
  const owner = info.owner.toLowerCase();
  const repoPath = info.repo.toLowerCase() === `${owner}.github.io` ? "" : `/${info.repo}`;
  return `https://${owner}.github.io${repoPath}/${path}`;
}

function rawGitHubAssetUrl(info, path) {
  return `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${info.branch}/${path}`;
}

function safePathSegment(value) {
  return String(value || "assets").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "assets";
}

function safeFileName(value) {
  const clean = String(value || "attachment").split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return clean.replace(/[^\w.\-\u4e00-\u9fff]+/g, "-") || "attachment";
}

function formatBytes(size) {
  const value = Number(size || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

async function verifyUserPassword(password, user) {
  ensureWorkerSupportedIterations(user.iterations);
  const hash = await derivePasswordHash(password, user.salt, user.iterations);
  return timingSafeEqual(hash, user.passwordHash);
}

async function verifyResetCode(resetCode, users) {
  if (!users.resetCode?.passwordHash || !users.resetCode?.salt) return false;
  ensureWorkerSupportedIterations(users.resetCode.iterations || PASSWORD_ITERATIONS);
  const hash = await derivePasswordHash(resetCode, users.resetCode.salt, users.resetCode.iterations || PASSWORD_ITERATIONS);
  return timingSafeEqual(hash, users.resetCode.passwordHash);
}

async function createPasswordRecord(password) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const iterations = PASSWORD_ITERATIONS;
  return {
    passwordHash: await derivePasswordHash(password, salt, iterations),
    salt,
    iterations,
  };
}

function ensureWorkerSupportedIterations(iterations) {
  if (Number(iterations || PASSWORD_ITERATIONS) > PASSWORD_ITERATIONS) {
    throw httpError(400, "当前账号密码哈希迭代数超过 Cloudflare Worker 支持上限。请点击“重置密码”，使用重置指令设置一次新密码后再登录。");
  }
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

async function sha1(value) {
  const digest = await crypto.subtle.digest("SHA-1", textBytes(value));
  return hex(new Uint8Array(digest));
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = env.ADMIN_ORIGIN || "https://galphrui.github.io";
  const headers = new Headers({
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

function getBearerToken(header) {
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
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

function requiredGitHubToken(env) {
  if (!env.GITHUB_TOKEN) {
    throw httpError(500, "Worker 缺少 GITHUB_TOKEN。外网后台可以登录读取数据，但发布、改密和重置指令必须先在 Cloudflare Worker Secret 配置 GitHub Token。");
  }
  return env.GITHUB_TOKEN;
}

function validatePassword(password) {
  if (String(password || "").length < 8) {
    throw httpError(400, "密码至少需要 8 位。");
  }
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

function base64EncodeBytes(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return btoa(binary);
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
