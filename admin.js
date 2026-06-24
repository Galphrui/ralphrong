const RA_STORAGE_KEY = "RaBlogAdminSettings";
const RA_LOCAL_DATA_KEY = "RaBlogLocalData";
const RA_LOCAL_API_BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1" ? location.origin : "";
const RA_IS_LOCAL_ADMIN = Boolean(RA_LOCAL_API_BASE);
const RA_API_BASE = (window.BLOG_ADMIN_API_BASE || RA_LOCAL_API_BASE || "").replace(/\/$/, "");
const RA_SESSION_TOKEN_KEY = "RaBlogAdminSessionToken";
const RA_PUBLISH_POLL_ATTEMPTS = 36;
const RA_PUBLISH_POLL_DELAY_MS = 5000;

let RaData = getDefaultData();
let RaSelectedSlug = "";
let RaRemoteSha = "";

const RaEls = {
  adminShell: document.querySelector("#RaAdminShell"),
  logout: document.querySelector("#RaLogoutButton"),
  accountsNavLink: document.querySelector("#RaAccountsNavLink"),
  accountsPanel: document.querySelector("#RaAccountsPanel"),
  localAccountTools: document.querySelector("#RaLocalAccountTools"),
  accountList: document.querySelector("#RaAccountList"),
  accountUser: document.querySelector("#RaAccountUserInput"),
  accountPassword: document.querySelector("#RaAccountPasswordInput"),
  resetCode: document.querySelector("#RaResetCodeInput"),
  saveResetCode: document.querySelector("#RaSaveResetCodeButton"),
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
  syncData: document.querySelector("#RaSyncDataButton"),
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
  deployStatus: document.querySelector("#RaDeployStatusText"),
  siteTitle: document.querySelector("#RaSiteTitleInput"),
  siteSubtitle: document.querySelector("#RaSiteSubtitleInput"),
  author: document.querySelector("#RaAuthorInput"),
  bio: document.querySelector("#RaBioInput"),
  saveSite: document.querySelector("#RaSaveSiteButton"),
  publishSite: document.querySelector("#RaPublishSiteButton"),
  siteStatus: document.querySelector("#RaSiteStatusText"),
  profileName: document.querySelector("#RaProfileNameInput"),
  profileHeadline: document.querySelector("#RaProfileHeadlineInput"),
  profileContacts: document.querySelector("#RaProfileContactsInput"),
  profileIntent: document.querySelector("#RaProfileIntentInput"),
  profileSummary: document.querySelector("#RaProfileSummaryInput"),
  profileAdvantages: document.querySelector("#RaProfileAdvantagesInput"),
  profileSkills: document.querySelector("#RaProfileSkillsInput"),
  profileWork: document.querySelector("#RaProfileWorkInput"),
  profileProjects: document.querySelector("#RaProfileProjectsInput"),
  profileEducation: document.querySelector("#RaProfileEducationInput"),
  profileReview: document.querySelector("#RaProfileReviewInput"),
  saveProfile: document.querySelector("#RaSaveProfileButton"),
  publishProfile: document.querySelector("#RaPublishProfileButton"),
  formatProfile: document.querySelector("#RaFormatProfileButton"),
  profileStatus: document.querySelector("#RaProfileStatusText"),
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
  RaEls.accountsNavLink.hidden = false;
  RaEls.accountsPanel.hidden = false;
  RaEls.localAccountTools.hidden = !RA_IS_LOCAL_ADMIN;
  RaEls.syncData.hidden = !RA_IS_LOCAL_ADMIN;

  await loadInitialData();
  renderSiteForm();
  renderProfileForm();
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
  setStatus("仓库设置已保存。后台 API 地址由 admin-config.js 固定配置。");
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
  localStorage.removeItem(RA_SESSION_TOKEN_KEY);
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
    renderProfileForm();
    selectPost(RaData.posts[0]?.slug || "");
    setStatus(RA_IS_LOCAL_ADMIN ? "已从本地后台读取数据。" : "已从外网后台读取 GitHub 数据。");
  } catch (error) {
    setStatus(`读取失败：${error.message}`);
  }
}

async function publishData(target = "posts") {
  try {
    setPublishing(true);
    saveSettings();
    const result = RA_IS_LOCAL_ADMIN
      ? await raApi("/api/publish", {
          method: "POST",
          body: JSON.stringify({ data: RaData, message: `chore: publish Ra blog ${new Date().toISOString()}` }),
        })
      : await raApi("/api/posts", {
          method: "PUT",
          body: JSON.stringify({ data: RaData }),
        });
    setPublishResult(result, target);
    await waitForPagesUpdate(target, result.deploy);
  } catch (error) {
    const message = `发布失败：${error.message}`;
    setStatus(message);
    setDeployStatus(message);
    setTargetStatus(target, message);
  } finally {
    setPublishing(false);
  }
}

async function publishCurrentPost() {
  if (hasEditablePostDraft() && !saveCurrentPost()) return;
  await publishData("posts");
}

async function syncLocalData() {
  try {
    setPublishing(true);
    if (!RA_IS_LOCAL_ADMIN) throw new Error("外网后台发布会直接写入 GitHub，不需要本地推送。");
    const result = await raApi("/api/sync", { method: "POST" });
    setPublishResult(result);
    await waitForPagesUpdate("posts", result.deploy);
  } catch (error) {
    setDeployStatus(`推送失败：${error.message}`);
  } finally {
    setPublishing(false);
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
    await syncLocalChangesForAccounts("账号已新增并推送。");
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
    await syncLocalChangesForAccounts("密码已重置并推送。");
  } catch (error) {
    setAccountStatus(`重置密码失败：${error.message}`);
  }
}

async function saveResetCode() {
  try {
    const resetCode = RaEls.resetCode.value;
    if (!resetCode) throw new Error("请填写新的重置指令。");
    await raApi("/api/reset-code", {
      method: "PUT",
      body: JSON.stringify({ resetCode }),
    });
    RaEls.resetCode.value = "";
    if (RA_IS_LOCAL_ADMIN) {
      await syncLocalChangesForAccounts("重置指令已保存并推送。");
    } else {
      setAccountStatus("重置指令已保存到 GitHub。");
    }
  } catch (error) {
    setAccountStatus(`保存重置指令失败：${error.message}`);
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
    await syncLocalChangesForAccounts("账号已删除并推送。");
  } catch (error) {
    setAccountStatus(`删除账号失败：${error.message}`);
  }
}

async function syncLocalChangesForAccounts(successMessage) {
  if (!RA_IS_LOCAL_ADMIN) {
    setAccountStatus(successMessage);
    return;
  }
  const result = await raApi("/api/sync", { method: "POST" });
  const deploy = result.deploy;
  const message = deploy?.pushed
    ? `${successMessage} 已推送到 ${deploy.branch} 分支，GitHub Pages 稍后更新。`
    : `${successMessage} ${deploy?.message || ""}`.trim();
  setAccountStatus(message);
  setDeployStatus(message);
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

function renderProfileForm() {
  const profile = RaData.profile || getDefaultProfile();
  RaEls.profileName.value = profile.name || "";
  RaEls.profileHeadline.value = profile.headline || "";
  RaEls.profileContacts.value = (profile.contacts || []).join("\n");
  RaEls.profileIntent.value = profile.intent || "";
  RaEls.profileSummary.value = profile.summary || "";
  RaEls.profileAdvantages.value = (profile.advantages || []).join("\n");
  RaEls.profileSkills.value = JSON.stringify(profile.skills || [], null, 2);
  RaEls.profileWork.value = JSON.stringify(profile.workExperience || [], null, 2);
  RaEls.profileProjects.value = JSON.stringify(profile.projects || [], null, 2);
  RaEls.profileEducation.value = JSON.stringify(profile.education || [], null, 2);
  RaEls.profileReview.value = (profile.selfReview || []).join("\n");
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
  if (event) event.preventDefault();
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
    return false;
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
  setStatus("已保存到当前数据，点击发布到外网。");
  return true;
}

function hasEditablePostDraft() {
  return Boolean(
    RaSelectedSlug ||
      RaEls.title.value.trim() ||
      RaEls.slug.value.trim() ||
      RaEls.tags.value.trim() ||
      RaEls.summary.value.trim() ||
      RaEls.content.value.trim(),
  );
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
  setSiteStatus("站点信息已保存到当前数据，点击发布到外网。");
  setStatus("站点信息已保存到当前数据，点击发布到外网。");
  return true;
}

async function publishSiteInfo() {
  if (saveSiteInfo()) await publishData("site");
}

function lines(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseJsonField(value, fallback, label) {
  try {
    const parsed = JSON.parse(value || "null");
    return parsed || fallback;
  } catch (error) {
    throw new Error(`${label} JSON 格式不正确：${error.message}`);
  }
}

function saveProfileInfo() {
  try {
    RaData.profile = {
      name: RaEls.profileName.value.trim() || "Ralph Rong / Ra",
      headline: RaEls.profileHeadline.value.trim(),
      contacts: lines(RaEls.profileContacts.value),
      intent: RaEls.profileIntent.value.trim(),
      summary: RaEls.profileSummary.value.trim(),
      advantages: lines(RaEls.profileAdvantages.value),
      skills: parseJsonField(RaEls.profileSkills.value, [], "核心技能"),
      workExperience: parseJsonField(RaEls.profileWork.value, [], "工作经历"),
      projects: parseJsonField(RaEls.profileProjects.value, [], "项目经历"),
      education: parseJsonField(RaEls.profileEducation.value, [], "教育经历"),
      selfReview: lines(RaEls.profileReview.value),
    };
    saveLocalData();
    renderProfileForm();
    setProfileStatus("Ra 简历已保存到当前数据，点击发布到外网。");
    setStatus("Ra 简历已保存到当前数据，点击发布到外网。");
    return true;
  } catch (error) {
    setProfileStatus(`简历保存失败：${error.message}`);
    setStatus(`简历保存失败：${error.message}`);
    return false;
  }
}

async function publishProfileInfo() {
  if (saveProfileInfo()) await publishData("profile");
}

function formatProfileJson() {
  try {
    RaEls.profileSkills.value = JSON.stringify(parseJsonField(RaEls.profileSkills.value, [], "核心技能"), null, 2);
    RaEls.profileWork.value = JSON.stringify(parseJsonField(RaEls.profileWork.value, [], "工作经历"), null, 2);
    RaEls.profileProjects.value = JSON.stringify(parseJsonField(RaEls.profileProjects.value, [], "项目经历"), null, 2);
    RaEls.profileEducation.value = JSON.stringify(parseJsonField(RaEls.profileEducation.value, [], "教育经历"), null, 2);
    setStatus("简历 JSON 已格式化。");
  } catch (error) {
    setStatus(`格式化失败：${error.message}`);
  }
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
    renderProfileForm();
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
  let response;
  try {
    response = await fetch(`${RA_API_BASE}${path}`, {
      method: options.method || "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(options.headers || {}),
      },
      body: options.body,
    });
  } catch (error) {
    throw new Error(`无法连接后台 API：${RA_API_BASE}`);
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) {
    throw new Error(result.error || `后台服务请求失败：${response.status}`);
  }
  return result;
}

function authHeaders() {
  const token = localStorage.getItem(RA_SESSION_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function setPublishResult(result, target = "posts") {
  const deploy = result.deploy;
  if (RA_IS_LOCAL_ADMIN && deploy) {
    const files = deploy.changedFiles?.length ? `变更文件：${deploy.changedFiles.join(", ")}。` : "";
    const sha = deploy.commitSha ? `提交：${deploy.commitSha.slice(0, 7)}。` : "";
    const workflow = deploy.workflowTriggered ? "已触发 Pages 构建。" : "";
    const message = deploy.pushed
      ? `发布成功：已推送到 ${deploy.branch} 分支。${sha}${files}${workflow}正在等待 GitHub Pages 上线...`
      : `数据已写入，${deploy.message}`;
    setStatus(message);
    setDeployStatus(message);
    setTargetStatus(target, message);
    return;
  }

  const sha = deploy?.commitSha ? `提交：${deploy.commitSha.slice(0, 7)}。` : "";
  const workflow = deploy?.workflowTriggered ? "已触发 Pages 构建。" : deploy?.workflowError ? `Pages 构建触发未确认：${deploy.workflowError}。` : "";
  const message = `发布成功：已写入 GitHub。${sha}${workflow}正在等待 GitHub Pages 上线...`;
  setStatus(message);
  setDeployStatus(message);
  setTargetStatus(target, message);
}

async function waitForPagesUpdate(target = "posts", deploy = {}) {
  const expectedSignature = createDataSignature(RaData);
  const dataUrl = getPublicDataUrl();
  const commitText = deploy?.commitSha ? `提交 ${deploy.commitSha.slice(0, 7)}，` : "";

  for (let attempt = 1; attempt <= RA_PUBLISH_POLL_ATTEMPTS; attempt += 1) {
    const message = `${commitText}正在等待公开博客上线（${attempt}/${RA_PUBLISH_POLL_ATTEMPTS}）...`;
    setStatus(message);
    setDeployStatus(message);
    setTargetStatus(target, message);

    await delay(attempt === 1 ? 1800 : RA_PUBLISH_POLL_DELAY_MS);

    try {
      const response = await fetch(`${dataUrl}${dataUrl.includes("?") ? "&" : "?"}t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`公开数据读取失败：${response.status}`);
      const liveData = await response.json();
      if (createDataSignature(liveData) === expectedSignature) {
        const done = `上线完成：公开博客数据已更新。${commitText}现在刷新前台即可看到最新内容。`;
        setStatus(done);
        setDeployStatus(done);
        setTargetStatus(target, done);
        return;
      }
    } catch (error) {
      const message = `正在等待公开博客上线；刚才检查失败：${error.message}`;
      setDeployStatus(message);
      setTargetStatus(target, message);
    }
  }

  const timeout = `${commitText}已写入 GitHub，但暂未在公开博客读到更新。请稍后刷新前台，或打开 GitHub Actions 查看 Pages 构建状态。`;
  setStatus(timeout);
  setDeployStatus(timeout);
  setTargetStatus(target, timeout);
}

function getPublicDataUrl() {
  if (location.hostname.toLowerCase().endsWith(".github.io")) {
    return new URL("./data/posts.json", location.href).href;
  }

  const settings = getSettings();
  if (settings.owner && settings.repo) {
    const owner = settings.owner.toLowerCase();
    const repo = settings.repo;
    const repoPath = repo.toLowerCase() === `${owner}.github.io` ? "" : `/${repo}`;
    return `https://${owner}.github.io${repoPath}/data/posts.json`;
  }

  return new URL("./data/posts.json", location.href).href;
}

function createDataSignature(input) {
  return JSON.stringify(canonicalize(normalizeData(input)));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }
  return value;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setPublishing(isPublishing) {
  [RaEls.publish, RaEls.publishSite, RaEls.publishProfile, RaEls.syncData].forEach((button) => {
    if (button) button.disabled = isPublishing;
  });
}

function setTargetStatus(target, message) {
  if (target === "profile") setProfileStatus(message);
  if (target === "site") setSiteStatus(message);
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
    profile: normalizeProfile(input.profile),
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
    profile: getDefaultProfile(),
  };
}

function normalizeProfile(profile = {}) {
  const fallback = getDefaultProfile();
  return {
    name: profile.name || fallback.name,
    headline: profile.headline || fallback.headline,
    contacts: Array.isArray(profile.contacts) ? profile.contacts : fallback.contacts,
    intent: profile.intent || fallback.intent,
    summary: profile.summary || fallback.summary,
    advantages: Array.isArray(profile.advantages) ? profile.advantages : fallback.advantages,
    skills: Array.isArray(profile.skills) ? profile.skills : fallback.skills,
    workExperience: Array.isArray(profile.workExperience) ? profile.workExperience : fallback.workExperience,
    projects: Array.isArray(profile.projects) ? profile.projects : fallback.projects,
    education: Array.isArray(profile.education) ? profile.education : fallback.education,
    selfReview: Array.isArray(profile.selfReview) ? profile.selfReview : fallback.selfReview,
  };
}

function getDefaultProfile() {
  return {
    name: "Ralph Rong / Ra",
    headline: "Android 系统工程师｜智能穿戴 / 安卓系统",
    contacts: ["手机：【待补充】", "邮箱：【待补充】", "城市：【待补充】"],
    intent: "Android 系统工程师 / Android Framework 工程师 / 智能穿戴系统工程师",
    summary: "记录 Android 系统开发、智能穿戴项目、系统调试和版本问题闭环。",
    advantages: [],
    skills: [],
    workExperience: [],
    projects: [],
    education: [],
    selfReview: [],
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

function setDeployStatus(message) {
  if (RaEls.deployStatus) RaEls.deployStatus.textContent = message;
}

function setSiteStatus(message) {
  if (RaEls.siteStatus) RaEls.siteStatus.textContent = message;
}

function setProfileStatus(message) {
  if (RaEls.profileStatus) RaEls.profileStatus.textContent = message;
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
RaEls.syncData.addEventListener("click", syncLocalData);
RaEls.openRepo.addEventListener("click", openRepository);
RaEls.publish.addEventListener("click", publishCurrentPost);
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
RaEls.publishSite.addEventListener("click", publishSiteInfo);
RaEls.saveProfile.addEventListener("click", saveProfileInfo);
RaEls.publishProfile.addEventListener("click", publishProfileInfo);
RaEls.formatProfile.addEventListener("click", formatProfileJson);
RaEls.title.addEventListener("input", () => {
  if (!RaSelectedSlug) RaEls.slug.value = slugify(RaEls.title.value);
});
RaEls.createAccount.addEventListener("click", createAccount);
RaEls.resetPassword.addEventListener("click", resetAccountPassword);
RaEls.deleteAccount.addEventListener("click", deleteAccount);
RaEls.refreshAccounts.addEventListener("click", loadAccounts);
RaEls.saveResetCode.addEventListener("click", saveResetCode);
RaEls.accountList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-RaAccount]");
  if (!item) return;
  RaEls.accountUser.value = item.dataset.raaccount;
});
RaEls.logout.addEventListener("click", logoutAdmin);
