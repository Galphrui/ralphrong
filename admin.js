const RA_STORAGE_KEY = "RaBlogAdminSettings";
const RA_LOCAL_DATA_KEY = "RaBlogLocalData";
const RA_LOCAL_API_BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1" ? location.origin : "";
const RA_API_BASE = (window.BLOG_ADMIN_API_BASE || RA_LOCAL_API_BASE || "").replace(/\/$/, "");
const RA_IS_LOCAL_ADMIN = Boolean(RA_LOCAL_API_BASE);

let RaData = getDefaultData();
let RaSelectedSlug = "";
let RaRemoteSha = "";

const RaEls = {
  adminShell: document.querySelector("#RaAdminShell"),
  logout: document.querySelector("#RaLogoutButton"),
  accountsNavLink: document.querySelector("#RaAccountsNavLink"),
  accountsPanel: document.querySelector("#RaAccountsPanel"),
  accountList: document.querySelector("#RaAccountList"),
  accountUser: document.querySelector("#RaAccountUserInput"),
  accountPassword: document.querySelector("#RaAccountPasswordInput"),
  createAccount: document.querySelector("#RaCreateAccountButton"),
  resetPassword: document.querySelector("#RaResetPasswordButton"),
  deleteAccount: document.querySelector("#RaDeleteAccountButton"),
  refreshAccounts: document.querySelector("#RaRefreshAccountsButton"),
  accountStatus: document.querySelector("#RaAccountStatus"),
  repoUrl: document.querySelector("#RaRepoUrlInput"),
  applyRepoUrl: document.querySelector("#RaApplyRepoUrlButton"),
  detectRepo: document.querySelector("#RaDetectRepoButton"),
  openDataLink: document.querySelector("#RaOpenDataLink"),
  repoHint: document.querySelector("#RaRepoHint"),
  owner: document.querySelector("#RaOwnerInput"),
  repo: document.querySelector("#RaRepoInput"),
  branch: document.querySelector("#RaBranchInput"),
  path: document.querySelector("#RaPathInput"),
  saveSettings: document.querySelector("#RaSaveSettingsButton"),
  loadRemote: document.querySelector("#RaLoadRemoteButton"),
  openRepo: document.querySelector("#RaOpenRepoButton"),
  download: document.querySelector("#RaDownloadButton"),
  importInput: document.querySelector("#RaImportInput"),
  adminPostList: document.querySelector("#RaAdminPostList"),
  newPost: document.querySelector("#RaNewPostButton"),
  form: document.querySelector("#RaPostForm"),
  title: document.querySelector("#RaTitleInput"),
  slug: document.querySelector("#RaSlugInput"),
  date: document.querySelector("#RaDateInput"),
  tags: document.querySelector("#RaTagsInput"),
  summary: document.querySelector("#RaSummaryInput"),
  content: document.querySelector("#RaContentInput"),
  deletePost: document.querySelector("#RaDeletePostButton"),
  publish: document.querySelector("#RaPublishButton"),
  status: document.querySelector("#RaStatusText"),
  siteTitle: document.querySelector("#RaSiteTitleInput"),
  siteSubtitle: document.querySelector("#RaSiteSubtitleInput"),
  author: document.querySelector("#RaAuthorInput"),
  bio: document.querySelector("#RaBioInput"),
  saveSite: document.querySelector("#RaSaveSiteButton"),
};

initRaAdmin();

async function initRaAdmin() {
  loadSettings();
  detectRepositoryFromPage();
  updateGitHubLinks();

  const user = await restoreSession();
  if (!user) {
    location.href = `./login.html?next=${encodeURIComponent("admin.html")}`;
    return;
  }

  document.body.classList.remove("RaAuthPending");
  RaEls.adminShell.hidden = false;
  RaEls.accountsNavLink.hidden = !RA_IS_LOCAL_ADMIN;
  RaEls.accountsPanel.hidden = !RA_IS_LOCAL_ADMIN;

  await loadInitialData();
  renderSiteForm();
  renderPostList();
  selectPost(RaData.posts[0]?.slug || "");
  await loadRemoteData();
  if (RA_IS_LOCAL_ADMIN) await loadAccounts();
}

function loadSettings() {
  const settings = JSON.parse(localStorage.getItem(RA_STORAGE_KEY) || "{}");
  RaEls.repoUrl.value = settings.repoUrl || "";
  RaEls.owner.value = settings.owner || "";
  RaEls.repo.value = settings.repo || "";
  RaEls.branch.value = settings.branch || "main";
  RaEls.path.value = settings.path || "data/posts.json";
}

function saveSettings() {
  localStorage.setItem(
    RA_STORAGE_KEY,
    JSON.stringify({
      owner: RaEls.owner.value.trim(),
      repo: RaEls.repo.value.trim(),
      branch: RaEls.branch.value.trim() || "main",
      path: RaEls.path.value.trim() || "data/posts.json",
      repoUrl: RaEls.repoUrl.value.trim(),
    }),
  );
  updateGitHubLinks();
  setStatus("仓库设置已保存。");
}

async function restoreSession() {
  if (!RA_API_BASE) return "";
  try {
    const session = await raApi("/api/session");
    return session.user;
  } catch (error) {
    return "";
  }
}

async function logoutAdmin() {
  if (RA_API_BASE) {
    await raApi("/api/logout", { method: "POST" }).catch(() => {});
  }
  location.href = "./login.html";
}

async function loadInitialData() {
  const cached = localStorage.getItem(RA_LOCAL_DATA_KEY);
  if (cached) {
    RaData = normalizeData(JSON.parse(cached));
    return;
  }

  try {
    const response = await fetch(`./data/posts.json?t=${Date.now()}`);
    if (!response.ok) throw new Error("Cannot load local posts");
    RaData = normalizeData(await response.json());
    saveLocalData();
  } catch (error) {
    RaData = getDefaultData();
  }
}

function saveLocalData() {
  RaData.posts = sortPosts(RaData.posts);
  localStorage.setItem(RA_LOCAL_DATA_KEY, JSON.stringify(RaData, null, 2));
  renderPostList();
}

async function loadRemoteData() {
  try {
    applyRepositoryUrl(false);
    saveSettings();
    const remote = await raApi("/api/posts");
    RaRemoteSha = remote.sha || "";
    RaData = normalizeData(remote.data);
    saveLocalData();
    renderSiteForm();
    selectPost(RaData.posts[0]?.slug || "");
    setStatus(RA_IS_LOCAL_ADMIN ? "已从本地后台读取数据。" : "已从外网后台读取 GitHub 数据。");
  } catch (error) {
    setStatus(`读取失败：${error.message}`);
  }
}

async function publishData() {
  try {
    saveSettings();
    await raApi("/api/posts", {
      method: "PUT",
      body: JSON.stringify({ data: RaData }),
    });
    setStatus(RA_IS_LOCAL_ADMIN ? "已写入本地 data/posts.json。推送后外网博客会更新。" : "发布成功，GitHub Pages 稍后更新。");
  } catch (error) {
    setStatus(`发布失败：${error.message}`);
  }
}

async function loadAccounts() {
  if (!RA_IS_LOCAL_ADMIN) return;
  try {
    const result = await raApi("/api/users");
    renderAccounts(result.users || []);
    setAccountStatus("账号列表已刷新。");
  } catch (error) {
    setAccountStatus(`读取账号失败：${error.message}`);
  }
}

function renderAccounts(users) {
  RaEls.accountList.innerHTML = users
    .map(
      (user) => `
        <div class="RaItem" data-RaAccount="${escapeAttr(user.username)}">
          <strong>${escapeHtml(user.username)}</strong>
          <small>创建：${escapeHtml(user.createdAt || "-")}${user.updatedAt ? ` · 更新：${escapeHtml(user.updatedAt)}` : ""}</small>
        </div>
      `,
    )
    .join("");
}

async function createAccount() {
  try {
    const username = RaEls.accountUser.value.trim();
    const password = RaEls.accountPassword.value;
    if (!username || !password) throw new Error("请填写账号和密码。");
    await raApi("/api/users", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    RaEls.accountPassword.value = "";
    await loadAccounts();
    setAccountStatus("账号已新增。记得提交并推送 data/admin-users.json。");
  } catch (error) {
    setAccountStatus(`新增账号失败：${error.message}`);
  }
}

async function resetAccountPassword() {
  try {
    const username = RaEls.accountUser.value.trim();
    const password = RaEls.accountPassword.value;
    if (!username || !password) throw new Error("请填写账号和新密码。");
    await raApi("/api/users/password", {
      method: "PUT",
      body: JSON.stringify({ username, password }),
    });
    RaEls.accountPassword.value = "";
    await loadAccounts();
    setAccountStatus("密码已重置。记得提交并推送 data/admin-users.json。");
  } catch (error) {
    setAccountStatus(`重置密码失败：${error.message}`);
  }
}

async function deleteAccount() {
  try {
    const username = RaEls.accountUser.value.trim();
    if (!username) throw new Error("请先选择或填写账号。");
    if (!confirm(`确认删除账号 ${username}？`)) return;
    await raApi("/api/users", {
      method: "DELETE",
      body: JSON.stringify({ username }),
    });
    RaEls.accountUser.value = "";
    await loadAccounts();
    setAccountStatus("账号已删除。记得提交并推送 data/admin-users.json。");
  } catch (error) {
    setAccountStatus(`删除账号失败：${error.message}`);
  }
}

function renderPostList() {
  RaEls.adminPostList.innerHTML = RaData.posts
    .map(
      (post) => `
        <div class="RaItem ${post.slug === RaSelectedSlug ? "RaActive" : ""}" data-RaSlug="${escapeAttr(post.slug)}">
          <strong>${escapeHtml(post.title)}</strong>
          <small>${escapeHtml(post.date)} · ${escapeHtml(post.tags.join(", "))}</small>
        </div>
      `,
    )
    .join("");
}

function renderSiteForm() {
  RaEls.siteTitle.value = RaData.site.title || "";
  RaEls.siteSubtitle.value = RaData.site.subtitle || "";
  RaEls.author.value = RaData.site.author?.name || "";
  RaEls.bio.value = RaData.site.author?.bio || "";
}

function selectPost(slug) {
  RaSelectedSlug = slug;
  const post = RaData.posts.find((item) => item.slug === slug) || createEmptyPost();
  RaEls.title.value = post.title;
  RaEls.slug.value = post.slug;
  RaEls.date.value = post.date;
  RaEls.tags.value = post.tags.join(", ");
  RaEls.summary.value = post.summary;
  RaEls.content.value = post.content;
  renderPostList();
}

function saveCurrentPost(event) {
  event.preventDefault();
  const post = {
    title: RaEls.title.value.trim(),
    slug: slugify(RaEls.slug.value || RaEls.title.value),
    date: RaEls.date.value || new Date().toISOString().slice(0, 10),
    tags: RaEls.tags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    summary: RaEls.summary.value.trim(),
    content: RaEls.content.value.trim(),
    readingMinutes: estimateReadingMinutes(RaEls.content.value),
  };

  if (!post.title || !post.slug) {
    setStatus("标题和 Slug 必填。");
    return;
  }

  const index = RaData.posts.findIndex((item) => item.slug === RaSelectedSlug);
  if (index >= 0) {
    RaData.posts[index] = post;
  } else {
    RaData.posts.push(post);
  }

  RaSelectedSlug = post.slug;
  saveLocalData();
  selectPost(post.slug);
  setStatus("已保存到当前数据，点击发布写入后端。");
}

function deleteSelectedPost() {
  if (!RaSelectedSlug) return;
  const post = RaData.posts.find((item) => item.slug === RaSelectedSlug);
  if (!post || !confirm(`确认删除《${post.title}》？`)) return;
  RaData.posts = RaData.posts.filter((item) => item.slug !== RaSelectedSlug);
  saveLocalData();
  selectPost(RaData.posts[0]?.slug || "");
  setStatus("文章已删除，点击发布写入后端。");
}

function createNewPost() {
  RaSelectedSlug = "";
  selectPost("");
  RaEls.title.focus();
}

function saveSiteInfo() {
  RaData.site = {
    ...RaData.site,
    title: RaEls.siteTitle.value.trim() || "Ra Android Notes",
    subtitle: RaEls.siteSubtitle.value.trim() || "Ra 工程实践与调试笔记",
    author: {
      ...(RaData.site.author || {}),
      name: RaEls.author.value.trim() || "Ralph Rong",
      bio: RaEls.bio.value.trim(),
      links: RaData.site.author?.links || [{ label: "GitHub", url: "https://github.com/" }],
    },
  };
  saveLocalData();
  setStatus("站点信息已保存到当前数据，点击发布写入后端。");
}

function exportJson() {
  const blob = new Blob([JSON.stringify(RaData, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "posts.json";
  link.click();
  URL.revokeObjectURL(url);
}

function importJson(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    RaData = normalizeData(JSON.parse(reader.result));
    saveLocalData();
    renderSiteForm();
    selectPost(RaData.posts[0]?.slug || "");
    setStatus("JSON 已导入当前数据，点击发布写入后端。");
  };
  reader.readAsText(file);
}

function applyRepositoryUrl(showStatus = true) {
  const parsed = parseGitHubRepository(RaEls.repoUrl.value);
  if (!parsed) {
    if (showStatus) setStatus("请输入有效的 GitHub 仓库地址，例如 https://github.com/Galphrui/ralphrong。");
    return false;
  }

  RaEls.owner.value = parsed.owner;
  RaEls.repo.value = parsed.repo;
  RaEls.branch.value = parsed.branch || RaEls.branch.value || "main";
  RaEls.path.value = parsed.path || RaEls.path.value || "data/posts.json";
  updateGitHubLinks();
  if (showStatus) setStatus("已从仓库地址自动填充连接信息。");
  return true;
}

function detectRepositoryFromPage() {
  const settings = getSettings();
  if (settings.owner && settings.repo) return;

  const detected = getRepositoryFromLocation();
  if (!detected) {
    if (!RaEls.repoUrl.value) RaEls.repoUrl.value = "https://github.com/Galphrui/ralphrong";
    applyRepositoryUrl(false);
    return;
  }

  RaEls.owner.value = detected.owner;
  RaEls.repo.value = detected.repo;
  RaEls.branch.value = settings.branch || "main";
  RaEls.path.value = settings.path || "data/posts.json";
  RaEls.repoUrl.value = `https://github.com/${detected.owner}/${detected.repo}`;
  RaEls.repoHint.textContent = "已从当前 GitHub Pages 网址识别仓库。";
}

function getRepositoryFromLocation() {
  const host = location.hostname.toLowerCase();
  const parts = location.pathname.split("/").filter(Boolean);
  const ownerFromPages = host.match(/^([a-z0-9-]+)\.github\.io$/i)?.[1];
  if (!ownerFromPages) return null;

  const repoFromPath = parts[0];
  if (repoFromPath && !repoFromPath.endsWith(".html")) {
    return { owner: ownerFromPages, repo: repoFromPath };
  }

  return { owner: ownerFromPages, repo: `${ownerFromPages}.github.io` };
}

function parseGitHubRepository(value) {
  const input = value.trim();
  if (!input) return null;

  const ssh = input.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i);
  if (ssh) return { owner: ssh[1], repo: ssh[2] };

  const shorthand = input.match(/^([^/\s]+)\/([^/\s#?]+)$/);
  if (shorthand) return { owner: shorthand[1], repo: shorthand[2].replace(/\.git$/, "") };

  try {
    const url = new URL(input);
    if (!url.hostname.includes("github.com")) return null;
    const [owner, repo, mode, branch, ...rest] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return null;
    const parsed = { owner, repo: repo.replace(/\.git$/, "") };
    if ((mode === "blob" || mode === "tree") && branch) parsed.branch = branch;
    if (mode === "blob" && rest.length) parsed.path = rest.join("/");
    return parsed;
  } catch (error) {
    return null;
  }
}

function updateGitHubLinks() {
  const settings = getSettings();
  const repoUrl = settings.owner && settings.repo ? `https://github.com/${settings.owner}/${settings.repo}` : "#";
  const dataUrl =
    settings.owner && settings.repo
      ? `${repoUrl}/blob/${encodeURIComponent(settings.branch)}/${settings.path}`
      : "#";

  RaEls.openDataLink.href = dataUrl;
  RaEls.openDataLink.toggleAttribute("aria-disabled", dataUrl === "#");
  RaEls.openRepo.disabled = repoUrl === "#";
}

function openRepository() {
  const settings = getSettings();
  if (!settings.owner || !settings.repo) {
    setStatus("请先填写或识别 GitHub 仓库。");
    return;
  }
  window.open(`https://github.com/${settings.owner}/${settings.repo}`, "_blank", "noreferrer");
}

function getSettings() {
  return {
    owner: RaEls.owner.value.trim(),
    repo: RaEls.repo.value.trim(),
    branch: RaEls.branch.value.trim() || "main",
    path: RaEls.path.value.trim() || "data/posts.json",
    repoUrl: RaEls.repoUrl.value.trim(),
  };
}

async function raApi(path, options = {}) {
  if (!RA_API_BASE) throw new Error("后台 API 未配置。");
  const response = await fetch(`${RA_API_BASE}${path}`, {
    method: options.method || "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) {
    throw new Error(result.error || `后台服务请求失败：${response.status}`);
  }
  return result;
}

function createEmptyPost() {
  return {
    title: "",
    slug: "",
    date: new Date().toISOString().slice(0, 10),
    tags: [],
    summary: "",
    content: "## 背景\n\n在这里写下问题背景。\n\n## 方案\n\n记录你的技术方案与取舍。\n",
    readingMinutes: 3,
  };
}

function normalizeData(input) {
  return {
    site: {
      title: input.site?.title || "Ra Android Notes",
      subtitle: input.site?.subtitle || "Ra 工程实践与调试笔记",
      author: {
        name: input.site?.author?.name || "Ralph Rong",
        bio: input.site?.author?.bio || "",
        links: input.site?.author?.links || [{ label: "GitHub", url: "https://github.com/" }],
      },
    },
    posts: sortPosts(
      (input.posts || []).map((post) => ({
        title: post.title || "未命名文章",
        slug: slugify(post.slug || post.title || "post"),
        date: post.date || new Date().toISOString().slice(0, 10),
        tags: Array.isArray(post.tags) ? post.tags : [],
        summary: post.summary || "",
        content: post.content || "",
        readingMinutes: post.readingMinutes || estimateReadingMinutes(post.content || ""),
      })),
    ),
  };
}

function getDefaultData() {
  return {
    site: {
      title: "Ra Android Notes",
      subtitle: "Ra 工程实践与调试笔记",
      author: {
        name: "Ralph Rong",
        bio: "记录 Android 开发、系统调试、工程化构建与工具链实践。这里记录从问题到方案的完整思考。",
        links: [{ label: "GitHub", url: "https://github.com/" }],
      },
    },
    posts: [],
  };
}

function sortPosts(posts) {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date));
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function estimateReadingMinutes(content) {
  const length = String(content || "").replace(/\s/g, "").length;
  return Math.max(1, Math.ceil(length / 500));
}

function setStatus(message) {
  RaEls.status.textContent = message;
}

function setAccountStatus(message) {
  RaEls.accountStatus.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

RaEls.saveSettings.addEventListener("click", saveSettings);
RaEls.applyRepoUrl.addEventListener("click", () => {
  applyRepositoryUrl(true);
  saveSettings();
});
RaEls.detectRepo.addEventListener("click", () => {
  const detected = getRepositoryFromLocation();
  if (!detected) {
    setStatus("当前不是 GitHub Pages 地址，无法自动识别；请粘贴 GitHub 仓库地址。");
    return;
  }
  RaEls.repoUrl.value = `https://github.com/${detected.owner}/${detected.repo}`;
  applyRepositoryUrl(true);
  saveSettings();
});
RaEls.loadRemote.addEventListener("click", loadRemoteData);
RaEls.openRepo.addEventListener("click", openRepository);
RaEls.publish.addEventListener("click", publishData);
RaEls.download.addEventListener("click", exportJson);
RaEls.importInput.addEventListener("change", importJson);
RaEls.adminPostList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-RaSlug]");
  if (item) selectPost(item.dataset.raslug);
});
RaEls.newPost.addEventListener("click", createNewPost);
RaEls.form.addEventListener("submit", saveCurrentPost);
RaEls.deletePost.addEventListener("click", deleteSelectedPost);
RaEls.saveSite.addEventListener("click", saveSiteInfo);
RaEls.title.addEventListener("input", () => {
  if (!RaSelectedSlug) RaEls.slug.value = slugify(RaEls.title.value);
});
RaEls.createAccount.addEventListener("click", createAccount);
RaEls.resetPassword.addEventListener("click", resetAccountPassword);
RaEls.deleteAccount.addEventListener("click", deleteAccount);
RaEls.refreshAccounts.addEventListener("click", loadAccounts);
RaEls.accountList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-RaAccount]");
  if (!item) return;
  RaEls.accountUser.value = item.dataset.raaccount;
});
RaEls.logout.addEventListener("click", logoutAdmin);
