const RA_STORAGE_KEY = "RaBlogAdminSettings";
const RA_LOCAL_DATA_KEY = "RaBlogLocalData";
const RA_LOCAL_API_BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1" ? location.origin : "";
const RA_IS_LOCAL_ADMIN = Boolean(RA_LOCAL_API_BASE);
const RA_API_BASE = (window.BLOG_ADMIN_API_BASE || RA_LOCAL_API_BASE || "").replace(/\/$/, "");
const RA_SESSION_TOKEN_KEY = "RaBlogAdminSessionToken";
const RA_PUBLISH_POLL_ATTEMPTS = 36;
const RA_PUBLISH_POLL_DELAY_MS = 5000;
const RA_DEFAULT_PANEL = "posts";
const RA_CODE_LANGUAGE_PRESETS = [
  { label: "Plain Text", value: "Plain Text", extension: "txt" },
  { label: "C", value: "C", extension: "c" },
  { label: "C++", value: "C++", extension: "cpp" },
  { label: "Python", value: "Python", extension: "py" },
  { label: "Java", value: "Java", extension: "java" },
  { label: "Kotlin / KT", value: "Kotlin", extension: "kt" },
  { label: "JavaScript", value: "JavaScript", extension: "js" },
  { label: "TypeScript", value: "TypeScript", extension: "ts" },
  { label: "Shell", value: "Shell", extension: "sh" },
  { label: "ADB", value: "ADB", extension: "sh" },
  { label: "XML", value: "XML", extension: "xml" },
  { label: "JSON", value: "JSON", extension: "json" },
  { label: "Markdown", value: "Markdown", extension: "md" },
  { label: "Gradle", value: "Gradle", extension: "gradle" },
  { label: "SQL", value: "SQL", extension: "sql" },
  { label: "YAML", value: "YAML", extension: "yml" },
  { label: "Swift", value: "Swift", extension: "swift" },
  { label: "Dart", value: "Dart", extension: "dart" },
  { label: "Go", value: "Go", extension: "go" },
  { label: "Rust", value: "Rust", extension: "rs" },
];
const RA_DOC_COLORS = ["#0f172a", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#2563eb", "#7c3aed", "#db2777"];
const RA_DOC_BACKGROUNDS = ["#ffffff", "#fee2e2", "#ffedd5", "#fef3c7", "#dcfce7", "#cffafe", "#dbeafe", "#ede9fe", "#fce7f3"];

let RaData = getDefaultData();
let RaSelectedSlug = "";
let RaSelectedAttachments = [];
let RaSelectedCodeId = "";
let RaSelectedCodeAttachments = [];
let RaSelectedToolSlug = "";
let RaSelectedToolAttachments = [];
let RaSelectedDevLogSlug = "";
let RaDocMode = "plain";
let RaSavedRichRange = null;
let RaRemoteSha = "";
let RaPostSearchQuery = "";
let RaPostListCollapsed = false;

const RaEls = {
  adminShell: document.querySelector("#RaAdminShell"),
  logout: document.querySelector("#RaLogoutButton"),
  tabButtons: document.querySelectorAll("[data-ra-admin-tab]"),
  tabPanels: document.querySelectorAll("[data-ra-admin-panel]"),
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
  postWorkspace: document.querySelector("#RaPostWorkspace"),
  postSearch: document.querySelector("#RaPostSearchInput"),
  togglePostList: document.querySelector("#RaTogglePostListButton"),
  postCount: document.querySelector("#RaPostCountText"),
  adminPostList: document.querySelector("#RaAdminPostList"),
  newPost: document.querySelector("#RaNewPostButton"),
  form: document.querySelector("#RaPostForm"),
  title: document.querySelector("#RaTitleInput"),
  slug: document.querySelector("#RaSlugInput"),
  date: document.querySelector("#RaDateInput"),
  tags: document.querySelector("#RaTagsInput"),
  tagPicker: document.querySelector("#RaTagPicker"),
  clearTags: document.querySelector("#RaClearTagsButton"),
  visibility: document.querySelector("#RaVisibilityInput"),
  accessPassword: document.querySelector("#RaAccessPasswordInput"),
  summary: document.querySelector("#RaSummaryInput"),
  content: document.querySelector("#RaContentInput"),
  textContentFile: document.querySelector("#RaTextContentFileInput"),
  previewPost: document.querySelector("#RaPreviewPostButton"),
  postPreviewPanel: document.querySelector("#RaPostPreviewPanel"),
  postPreview: document.querySelector("#RaPostPreview"),
  attachmentFile: document.querySelector("#RaAttachmentFileInput"),
  attachmentList: document.querySelector("#RaAttachmentList"),
  clearAttachments: document.querySelector("#RaClearAttachmentsButton"),
  deletePost: document.querySelector("#RaDeletePostButton"),
  publish: document.querySelector("#RaPublishButton"),
  status: document.querySelector("#RaStatusText"),
  docModeGroup: document.querySelector("#RaDocModeGroup"),
  docContent: document.querySelector("#RaDocContentInput"),
  docPreview: document.querySelector("#RaDocPreview"),
  docStatus: document.querySelector("#RaDocStatusText"),
  docInlineStatus: document.querySelector("#RaDocInlineStatus"),
  docTitle: document.querySelector("#RaDocTitleInput"),
  docSlug: document.querySelector("#RaDocSlugInput"),
  docDate: document.querySelector("#RaDocDateInput"),
  docTags: document.querySelector("#RaDocTagsInput"),
  docVisibility: document.querySelector("#RaDocVisibilityInput"),
  docAccessPassword: document.querySelector("#RaDocAccessPasswordInput"),
  docSummary: document.querySelector("#RaDocSummaryInput"),
  docLineNumbers: document.querySelector("#RaDocLineNumbers"),
  docEditorBox: document.querySelector("#RaDocEditorBox"),
  docRichEditor: document.querySelector("#RaDocRichEditor"),
  docRuler: document.querySelector("#RaDocRuler"),
  docHeading: document.querySelector("#RaDocHeadingInput"),
  docFontSize: document.querySelector("#RaDocFontSizeInput"),
  docFontFamily: document.querySelector("#RaDocFontFamilyInput"),
  docTextColor: document.querySelector("#RaDocTextColorInput"),
  docBgColor: document.querySelector("#RaDocBgColorInput"),
  docTextSwatches: document.querySelector("#RaDocTextSwatches"),
  docBgSwatches: document.querySelector("#RaDocBgSwatches"),
  docBold: document.querySelector("#RaDocBoldButton"),
  docItalic: document.querySelector("#RaDocItalicButton"),
  docUnderline: document.querySelector("#RaDocUnderlineButton"),
  docApplyHeading: document.querySelector("#RaDocApplyHeadingButton"),
  docApplyStyle: document.querySelector("#RaDocApplyStyleButton"),
  docLineNumbersToggle: document.querySelector("#RaDocLineNumbersInput"),
  docRulerToggle: document.querySelector("#RaDocRulerInput"),
  docGridToggle: document.querySelector("#RaDocGridInput"),
  docInsertCode: document.querySelector("#RaDocInsertCodeButton"),
  docImage: document.querySelector("#RaDocImageInput"),
  docAttachment: document.querySelector("#RaDocAttachmentInput"),
  docSyncFromPost: document.querySelector("#RaDocSyncFromPostButton"),
  docApplyToPost: document.querySelector("#RaDocApplyToPostButton"),
  docPublish: document.querySelector("#RaDocPublishButton"),
  codeList: document.querySelector("#RaCodeList"),
  codeName: document.querySelector("#RaCodeNameInput"),
  codeLanguagePreset: document.querySelector("#RaCodeLanguagePresetInput"),
  codeLanguage: document.querySelector("#RaCodeLanguageInput"),
  codeTags: document.querySelector("#RaCodeTagsInput"),
  codeTagPicker: document.querySelector("#RaCodeTagPicker"),
  codePath: document.querySelector("#RaCodePathInput"),
  codeUrl: document.querySelector("#RaCodeUrlInput"),
  codeDescription: document.querySelector("#RaCodeDescriptionInput"),
  codeSnippet: document.querySelector("#RaCodeSnippetInput"),
  codeAttachmentFile: document.querySelector("#RaCodeAttachmentFileInput"),
  codeAttachmentList: document.querySelector("#RaCodeAttachmentList"),
  clearCodeAttachments: document.querySelector("#RaClearCodeAttachmentsButton"),
  codeNotes: document.querySelector("#RaCodeNotesInput"),
  newCode: document.querySelector("#RaNewCodeButton"),
  formatCode: document.querySelector("#RaFormatCodeButton"),
  downloadCode: document.querySelector("#RaDownloadCodeButton"),
  saveCodeItem: document.querySelector("#RaSaveCodeItemButton"),
  deleteCodeItem: document.querySelector("#RaDeleteCodeItemButton"),
  repositories: document.querySelector("#RaRepositoriesInput"),
  modules: document.querySelector("#RaModulesInput"),
  saveCode: document.querySelector("#RaSaveCodeButton"),
  publishCode: document.querySelector("#RaPublishCodeButton"),
  codeStatus: document.querySelector("#RaCodeStatusText"),
  toolList: document.querySelector("#RaToolList"),
  toolTitle: document.querySelector("#RaToolTitleInput"),
  toolSlug: document.querySelector("#RaToolSlugInput"),
  toolDate: document.querySelector("#RaToolDateInput"),
  toolTags: document.querySelector("#RaToolTagsInput"),
  toolSummary: document.querySelector("#RaToolSummaryInput"),
  toolContent: document.querySelector("#RaToolContentInput"),
  toolAttachmentFile: document.querySelector("#RaToolAttachmentFileInput"),
  toolAttachmentList: document.querySelector("#RaToolAttachmentList"),
  clearToolAttachments: document.querySelector("#RaClearToolAttachmentsButton"),
  newTool: document.querySelector("#RaNewToolButton"),
  saveTool: document.querySelector("#RaSaveToolButton"),
  deleteTool: document.querySelector("#RaDeleteToolButton"),
  publishTools: document.querySelector("#RaPublishToolsButton"),
  tools: document.querySelector("#RaToolsInput"),
  saveToolsConfig: document.querySelector("#RaSaveToolsConfigButton"),
  toolsStatus: document.querySelector("#RaToolsStatusText"),
  devLogList: document.querySelector("#RaDevLogList"),
  devLogTitle: document.querySelector("#RaDevLogTitleInput"),
  devLogSlug: document.querySelector("#RaDevLogSlugInput"),
  devLogDate: document.querySelector("#RaDevLogDateInput"),
  devLogTags: document.querySelector("#RaDevLogTagsInput"),
  devLogSummary: document.querySelector("#RaDevLogSummaryInput"),
  devLogContent: document.querySelector("#RaDevLogContentInput"),
  newDevLog: document.querySelector("#RaNewDevLogButton"),
  appendDeployLog: document.querySelector("#RaAppendDeployLogButton"),
  saveDevLog: document.querySelector("#RaSaveDevLogButton"),
  deleteDevLog: document.querySelector("#RaDeleteDevLogButton"),
  publishDevLogs: document.querySelector("#RaPublishDevLogsButton"),
  devLogs: document.querySelector("#RaDevLogsInput"),
  saveDevLogsConfig: document.querySelector("#RaSaveDevLogsConfigButton"),
  devLogsStatus: document.querySelector("#RaDevLogsStatusText"),
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
  profilePhoto: document.querySelector("#RaProfilePhotoInput"),
  profilePhotoFile: document.querySelector("#RaProfilePhotoFileInput"),
  clearProfilePhoto: document.querySelector("#RaClearProfilePhotoButton"),
  profilePhotoPreview: document.querySelector("#RaProfilePhotoPreview"),
  profileContacts: document.querySelector("#RaProfileContactsInput"),
  profileSummary: document.querySelector("#RaProfileSummaryInput"),
  profileSectionList: document.querySelector("#RaProfileSectionList"),
  addProfileSection: document.querySelector("#RaAddProfileSectionButton"),
  saveProfile: document.querySelector("#RaSaveProfileButton"),
  publishProfile: document.querySelector("#RaPublishProfileButton"),
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
  RaEls.localAccountTools.hidden = !RA_IS_LOCAL_ADMIN;
  RaEls.syncData.hidden = !RA_IS_LOCAL_ADMIN;
  showAdminPanel(getPanelFromHash());
  updatePostListCollapsed();
  setupCodeLanguagePresetOptions();
  setupDocumentStudio();

  await loadInitialData();
  renderSiteForm();
  renderProfileForm();
  renderCodeForm();
  renderToolsForm();
  renderDevLogsForm();
  renderPostList();
  selectPost(RaData.posts[0]?.slug || "");
  await loadRemoteData();
  if (RA_IS_LOCAL_ADMIN) await loadAccounts();
}

function getPanelFromHash() {
  const raw = window.location.hash.replace(/^#/, "");
  const legacyPanelMap = {
    RaEditorPanel: "posts",
    RaSettingsPanel: "settings",
    RaProfilePanel: "profile",
    RaAccountsPanel: "accounts",
  };
  const panel = legacyPanelMap[raw] || raw;
  return [...RaEls.tabButtons].some((button) => button.dataset.raAdminTab === panel) ? panel : RA_DEFAULT_PANEL;
}

function showAdminPanel(panel = RA_DEFAULT_PANEL, updateHash = true) {
  const nextPanel = [...RaEls.tabButtons].some((button) => button.dataset.raAdminTab === panel)
    ? panel
    : RA_DEFAULT_PANEL;

  RaEls.tabButtons.forEach((button) => {
    const active = button.dataset.raAdminTab === nextPanel;
    button.classList.toggle("RaActive", active);
    button.setAttribute("aria-selected", String(active));
  });

  RaEls.tabPanels.forEach((section) => {
    section.hidden = section.dataset.raAdminPanel !== nextPanel;
  });

  if (updateHash) {
    const nextHash = nextPanel === RA_DEFAULT_PANEL ? "" : `#${nextPanel}`;
    if (window.location.hash !== nextHash) {
      history.replaceState(null, "", `${location.pathname}${location.search}${nextHash}`);
    }
  }
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
    RaData = normalizeData(await readJsonResponse(response, "本地数据文件"));
    saveLocalData();
  } catch (error) {
    RaData = getDefaultData();
  }
}

function saveLocalData() {
  RaData.posts = sortPosts(RaData.posts);
  localStorage.setItem(RA_LOCAL_DATA_KEY, JSON.stringify(RaData, null, 2));
  renderPostList();
  renderTagPicker();
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
    renderCodeForm();
    renderToolsForm();
    renderDevLogsForm();
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
    appendAutomaticDevLog(target);
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
    await waitForPagesUpdate(target, result.deploy).catch((error) => {
      const message = `发布已写入 GitHub，但上线检查未完成：${error.message}`;
      setStatus(message);
      setDeployStatus(message);
      setTargetStatus(target, message);
    });
  } catch (error) {
    const message = `发布失败：${error.message}`;
    setStatus(message);
    setDeployStatus(message);
    setTargetStatus(target, message);
  } finally {
    setPublishing(false);
  }
}

function appendAutomaticDevLog(target = "posts") {
  if (!Array.isArray(RaData.devLogs)) RaData.devLogs = [];
  const now = new Date();
  const iso = now.toISOString();
  const date = iso.slice(0, 10);
  const labelMap = {
    posts: "文章",
    code: "代码库",
    tools: "工具库",
    devlogs: "开发日志",
    profile: "个人页",
    site: "站点",
  };
  const label = labelMap[target] || target;
  const slug = `auto-deploy-${iso.replace(/[-:.TZ]/g, "").slice(0, 14)}-${target}`;
  const title = `${date} ${label}发布记录`;
  const summary = `自动记录 ${label} 模块的一次保存、发布、推送和上线流程。`;
  const content = [
    `## ${title}`,
    "",
    `- 时间：${iso}`,
    `- 模块：${label}`,
    `- 数据文件：${getSettings().path || "data/posts.json"}`,
    `- 发布方式：${RA_IS_LOCAL_ADMIN ? "本地后台提交并推送 GitHub" : "外网后台通过 Worker 写入 GitHub"}`,
    "",
    "## 流程",
    "",
    "1. 保存当前后台数据到统一 JSON。",
    "2. 写入 GitHub 仓库。",
    "3. 触发 GitHub Pages 构建。",
    "4. 等待公开站点数据刷新。",
    "",
    "## 结果",
    "",
    "发布流程已提交，最终上线状态以后台状态栏和 GitHub Actions 为准。",
  ].join("\n");

  RaData.devLogs.unshift({
    title,
    slug,
    date,
    createdAt: iso,
    updatedAt: iso,
    tags: ["自动记录", "部署", label],
    summary,
    content,
    contentFormat: "markdown",
    attachments: [],
  });
  RaData.devLogs = normalizeCollectionItems(RaData.devLogs, "devlog").slice(0, 200);
  if (RaEls.devLogs) RaEls.devLogs.value = JSON.stringify(RaData.devLogs, null, 2);
}

function appendCurrentDeployLog() {
  appendAutomaticDevLog("devlogs");
  saveLocalData();
  renderDevLogsForm();
  setDevLogsStatus("已追加一条当前发布日志。");
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
  const visiblePosts = filterPosts(RaData.posts, RaPostSearchQuery);
  RaEls.postCount.textContent = `${visiblePosts.length} / ${RaData.posts.length}`;
  RaEls.adminPostList.innerHTML = visiblePosts.length
    ? visiblePosts
    .map(
      (post) => `
        <div class="RaItem ${post.slug === RaSelectedSlug ? "RaActive" : ""}" data-RaSlug="${escapeAttr(post.slug)}">
          <strong>${escapeHtml(post.title)}</strong>
          <small>${escapeHtml(post.date)} · ${post.visibility === "password" ? "密码可见 · " : ""}${escapeHtml(post.tags.join(", "))}</small>
        </div>
      `,
    )
    .join("")
    : `<div class="RaEmptyState">没有匹配的文章</div>`;
}

function renderTagPicker() {
  if (!RaEls.tagPicker) return;
  const tags = getAllPostTags();
  const selected = new Set(getEditorTags().map(tagKey));
  RaEls.tagPicker.innerHTML = tags.length
    ? tags
      .map((tag) => {
        const active = selected.has(tagKey(tag));
        return `
          <button class="RaTagOption ${active ? "RaActive" : ""}" type="button" data-ra-tag-option="${escapeAttr(tag)}" aria-pressed="${active}">
            ${escapeHtml(tag)}
          </button>
        `;
      })
      .join("")
    : `<span class="RaTagPickerEmpty">保存第一篇带标签的文章后，这里会出现可选标签</span>`;
}

function filterPosts(posts, query) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return posts;

  return posts.filter((post) => {
    const haystack = [post.title, post.slug, post.date, post.summary, post.content, ...(post.tags || [])]
      .join(" ")
      .toLowerCase();
    return haystack.includes(keyword);
  });
}

function getAllPostTags() {
  return normalizeTags(RaData.posts.flatMap((post) => post.tags || [])).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function renderCodeTagPicker() {
  if (!RaEls.codeTagPicker) return;
  const tags = getAllCodeTags();
  const selected = new Set(getCodeEditorTags().map(tagKey));
  RaEls.codeTagPicker.innerHTML = tags.length
    ? tags
      .map((tag) => {
        const active = selected.has(tagKey(tag));
        return `
          <button class="RaTagOption ${active ? "RaActive" : ""}" type="button" data-ra-code-tag-option="${escapeAttr(tag)}" aria-pressed="${active}">
            ${escapeHtml(tag)}
          </button>
        `;
      })
      .join("")
    : `<span class="RaTagPickerEmpty">保存第一条带标签的代码后，这里会出现可选标签</span>`;
}

function getAllCodeTags() {
  const repositories = Array.isArray(RaData.repositories) ? RaData.repositories : [];
  return normalizeTags(repositories.flatMap((repo) => repo.tags || [])).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function getCodeEditorTags() {
  return parseTags(RaEls.codeTags.value);
}

function setCodeEditorTags(tags) {
  const normalized = normalizeTags(Array.isArray(tags) ? tags : parseTags(tags));
  RaEls.codeTags.value = normalized.join(", ");
  renderCodeTagPicker();
}

function toggleCodeEditorTag(tag) {
  const current = getCodeEditorTags();
  const key = tagKey(tag);
  const exists = current.some((item) => tagKey(item) === key);
  setCodeEditorTags(exists ? current.filter((item) => tagKey(item) !== key) : [...current, tag]);
}

function getEditorTags() {
  return parseTags(RaEls.tags.value);
}

function setEditorTags(tags, { syncDocument = true } = {}) {
  const normalized = normalizeTags(Array.isArray(tags) ? tags : parseTags(tags));
  RaEls.tags.value = normalized.join(", ");
  if (syncDocument && RaEls.docTags) RaEls.docTags.value = RaEls.tags.value;
  renderTagPicker();
  refreshPostPreviewIfOpen();
}

function toggleEditorTag(tag) {
  const current = getEditorTags();
  const key = tagKey(tag);
  const exists = current.some((item) => tagKey(item) === key);
  setEditorTags(exists ? current.filter((item) => tagKey(item) !== key) : [...current, tag]);
}

function parseTags(value) {
  return normalizeTags(String(value || "").split(/[,，;；\n]/));
}

function normalizeTags(tags) {
  const seen = new Set();
  const normalized = [];
  (tags || []).forEach((tag) => {
    const clean = String(tag || "").trim().replace(/\s+/g, " ");
    if (!clean) return;
    const key = tagKey(clean);
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(clean);
  });
  return normalized;
}

function tagKey(tag) {
  return String(tag || "").trim().toLocaleLowerCase();
}

function updatePostListCollapsed() {
  RaEls.postWorkspace.classList.toggle("RaPostListCollapsed", RaPostListCollapsed);
  RaEls.togglePostList.textContent = RaPostListCollapsed ? "展开列表" : "折叠列表";
  RaEls.togglePostList.setAttribute("aria-expanded", String(!RaPostListCollapsed));
}

function togglePostList() {
  RaPostListCollapsed = !RaPostListCollapsed;
  updatePostListCollapsed();
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
  RaEls.profilePhoto.value = profile.photoUrl || "";
  RaEls.profileContacts.value = (profile.contacts || []).join("\n");
  RaEls.profileSummary.value = profile.summary || "";
  updateProfilePhotoPreview();
  renderProfileSections(getProfileSections(profile));
}

function renderCodeForm() {
  if (!RaEls.repositories || !RaEls.modules) return;
  RaEls.repositories.value = JSON.stringify(RaData.repositories || [], null, 2);
  RaEls.modules.value = JSON.stringify(RaData.modules || getDefaultModules(), null, 2);
  renderCodeList();
  selectCodeItem(RaSelectedCodeId || RaData.repositories?.[0]?.id || "");
}

function renderToolsForm() {
  if (!RaEls.tools) return;
  RaEls.tools.value = JSON.stringify(RaData.tools || [], null, 2);
  renderToolList();
  selectToolItem(RaSelectedToolSlug || RaData.tools?.[0]?.slug || "");
}

function renderDevLogsForm() {
  if (!RaEls.devLogs) return;
  RaEls.devLogs.value = JSON.stringify(RaData.devLogs || [], null, 2);
  renderDevLogList();
  selectDevLogItem(RaSelectedDevLogSlug || RaData.devLogs?.[0]?.slug || "");
}

function saveToolsConfig() {
  try {
    const tools = JSON.parse(RaEls.tools.value || "[]");
    if (!Array.isArray(tools)) throw new Error("tools 必须是数组。");
    RaData.tools = normalizeCollectionItems(tools, "tool");
    saveLocalData();
    renderToolsForm();
    setToolsStatus("工具库配置已保存到本地数据。");
    return true;
  } catch (error) {
    setToolsStatus(`保存失败：${error.message}`);
    return false;
  }
}

function saveDevLogsConfig() {
  try {
    const devLogs = JSON.parse(RaEls.devLogs.value || "[]");
    if (!Array.isArray(devLogs)) throw new Error("devLogs 必须是数组。");
    RaData.devLogs = normalizeCollectionItems(devLogs, "devlog");
    saveLocalData();
    renderDevLogsForm();
    setDevLogsStatus("开发日志配置已保存到本地数据。");
    return true;
  } catch (error) {
    setDevLogsStatus(`保存失败：${error.message}`);
    return false;
  }
}

async function publishToolsConfig() {
  if (saveToolsConfig()) await publishData("tools");
}

async function publishDevLogsConfig() {
  if (saveDevLogsConfig()) await publishData("devlogs");
}

function saveCodeConfig() {
  try {
    const repositories = JSON.parse(RaEls.repositories.value || "[]");
    const modules = JSON.parse(RaEls.modules.value || "{}");
    if (!Array.isArray(repositories)) throw new Error("repositories 必须是数组。");
    if (!modules || !Array.isArray(modules.modules)) throw new Error("modules.modules 必须是数组。");
    RaData.repositories = normalizeCodeRepositories(repositories);
    RaData.modules = modules;
    saveLocalData();
    renderCodeForm();
    setCodeStatus("代码库和模块配置已保存到本地数据。");
    return true;
  } catch (error) {
    setCodeStatus(`保存失败：${error.message}`);
    return false;
  }
}

async function publishCodeConfig() {
  if (saveCodeConfig()) await publishData("code");
}

function setupDocumentStudio() {
  renderColorSwatches(RaEls.docTextSwatches, RA_DOC_COLORS, RaEls.docTextColor);
  renderColorSwatches(RaEls.docBgSwatches, RA_DOC_BACKGROUNDS, RaEls.docBgColor);
  syncDocumentFromPost();
  updateDocumentChrome();
}

function renderColorSwatches(container, colors, input) {
  if (!container) return;
  container.innerHTML = colors
    .map((color) => `<button class="RaColorSwatch" type="button" data-ra-color="${color}" style="background:${color}" aria-label="${color}"></button>`)
    .join("");
  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-ra-color]");
    if (!button || !input) return;
    input.value = button.dataset.raColor;
    [...container.querySelectorAll(".RaColorSwatch")].forEach((item) => item.classList.toggle("RaActive", item === button));
    applyDocumentStyleIfSelection();
  });
}

function syncDocumentFromPost() {
  if (!RaEls.docContent || !RaEls.content) return;
  RaEls.docTitle.value = RaEls.title.value || "";
  RaEls.docSlug.value = RaEls.slug.value || "";
  RaEls.docDate.value = RaEls.date.value || "";
  RaEls.docTags.value = normalizeTags(getEditorTags()).join(", ");
  RaEls.docVisibility.value = RaEls.visibility.value || "public";
  RaEls.docAccessPassword.value = RaEls.accessPassword.value || "";
  RaEls.docSummary.value = RaEls.summary.value || "";
  RaEls.docContent.value = RaEls.content.value || "";
  if (RaEls.docRichEditor) {
    RaEls.docRichEditor.innerHTML = RaDocMode === "rich"
      ? renderRichDocumentContent(RaEls.content.value, normalizeAttachments(RaSelectedAttachments))
      : renderMarkdownPreview(RaEls.content.value, normalizeAttachments(RaSelectedAttachments), RaDocMode);
  }
  refreshDocumentStudio();
}

function syncPostFromDocument({ showMessage = true } = {}) {
  if (!RaEls.docContent || !RaEls.content) return;
  RaEls.title.value = RaEls.docTitle.value.trim();
  RaEls.slug.value = RaEls.docSlug.value.trim() || slugify(RaEls.docTitle.value);
  RaEls.date.value = RaEls.docDate.value || new Date().toISOString().slice(0, 10);
  setEditorTags(RaEls.docTags.value);
  RaEls.visibility.value = RaEls.docVisibility.value;
  RaEls.accessPassword.value = RaEls.docAccessPassword.value;
  RaEls.summary.value = RaEls.docSummary.value;
  RaEls.content.value = getDocumentEditorContent();
  updateAccessPasswordField();
  refreshPostPreviewIfOpen();
  if (showMessage) setDocStatus("已同步到当前文章，保存或发布后生效。");
}

function setDocumentMode(mode) {
  if (mode === "rich" && RaDocMode !== "rich" && RaEls.docRichEditor) {
    RaEls.docRichEditor.innerHTML = renderMarkdownPreview(RaEls.docContent.value, normalizeAttachments(RaSelectedAttachments), RaDocMode);
  }
  if (RaDocMode === "rich" && mode !== "rich" && RaEls.docRichEditor) {
    RaEls.docContent.value = htmlToPlainText(RaEls.docRichEditor.innerHTML);
  }
  RaDocMode = mode || "plain";
  if (RaEls.docModeGroup) {
    RaEls.docModeGroup.querySelectorAll("[data-ra-doc-mode]").forEach((button) => {
      button.classList.toggle("RaActive", button.dataset.raDocMode === RaDocMode);
    });
  }
  refreshDocumentStudio();
  setDocStatus(`已切换到${RaDocMode === "rich" ? "高级编辑" : RaDocMode === "markdown" ? "MD" : "纯文本"}模式。`);
}

function refreshDocumentStudio() {
  updateDocumentLines();
  updateDocumentChrome();
  renderDocumentPreview();
}

function updateDocumentLines() {
  if (!RaEls.docLineNumbers || !RaEls.docContent) return;
  const count = Math.max(1, RaEls.docContent.value.split("\n").length);
  RaEls.docLineNumbers.textContent = Array.from({ length: count }, (_, index) => index + 1).join("\n");
}

function updateDocumentChrome() {
  if (RaEls.docEditorBox) {
    RaEls.docEditorBox.classList.toggle("RaNoLines", !RaEls.docLineNumbersToggle?.checked);
    RaEls.docEditorBox.classList.toggle("RaGridEnabled", Boolean(RaEls.docGridToggle?.checked));
    RaEls.docEditorBox.classList.toggle("RaRichMode", RaDocMode === "rich");
  }
  if (RaEls.docRichEditor) RaEls.docRichEditor.hidden = RaDocMode !== "rich";
  if (RaEls.docContent) RaEls.docContent.hidden = RaDocMode === "rich";
  if (RaEls.docRuler) RaEls.docRuler.hidden = !RaEls.docRulerToggle?.checked;
}

function renderDocumentPreview() {
  if (!RaEls.docPreview || !RaEls.docContent) return;
  RaEls.docPreview.innerHTML = renderMarkdownPreview(getDocumentEditorContent(), normalizeAttachments(RaSelectedAttachments), RaDocMode);
}

function getDocumentEditorContent() {
  if (RaDocMode === "rich") return sanitizeRichHtml(RaEls.docRichEditor?.innerHTML || "", { forEditor: false });
  return RaEls.docContent?.value || "";
}

function setRichEditorHtml(html) {
  if (!RaEls.docRichEditor) return;
  RaEls.docRichEditor.innerHTML = sanitizeRichHtml(html || "", { forEditor: true });
  syncPostFromDocument({ showMessage: false });
  refreshDocumentStudio();
}

function renderRichDocumentContent(content, attachments = []) {
  const raw = String(content || "");
  if (/<[a-z][\s\S]*>/i.test(raw)) return sanitizeRichHtml(raw, { forEditor: true });
  return renderMarkdownPreview(raw, attachments, "markdown");
}

function sanitizeRichHtml(html, options = {}) {
  const { forEditor = false } = options;
  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  template.content.querySelectorAll("script, iframe, object, embed, style").forEach((node) => node.remove());
  if (!forEditor) template.content.querySelectorAll("[data-ra-editor-only]").forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value || "";
      if (name.startsWith("on")) node.removeAttribute(attr.name);
      if (!forEditor && name === "contenteditable") node.removeAttribute(attr.name);
      if (!forEditor && name === "draggable") node.removeAttribute(attr.name);
      if ((name === "href" || name === "src") && !/^(https?:|data:image\/|data:application\/|#|\.\/|\/)/i.test(value)) {
        node.removeAttribute(attr.name);
      }
    });
  });
  return template.innerHTML;
}

function htmlToPlainText(html) {
  const box = document.createElement("div");
  box.innerHTML = sanitizeRichHtml(html || "");
  return box.innerText || "";
}

function applyDocumentHeading() {
  if (RaDocMode === "rich") {
    const level = Math.min(Math.max(Number(RaEls.docHeading?.value || 1), 1), 6);
    execRichCommand("formatBlock", `H${level}`);
    setDocStatus(`已应用 ${level} 级标题。`);
    return;
  }
  const level = Math.min(Math.max(Number(RaEls.docHeading?.value || 1), 1), 6);
  const value = selectedDocumentText() || "标题";
  const clean = value.replace(/^#{1,6}\s+/, "");
  replaceDocumentSelection(`${"#".repeat(level)} ${clean}`, {
    selectionStartOffset: level + 1,
    selectionEndOffset: level + 1 + clean.length,
  });
}

function applyDocumentStyle(kind) {
  if (RaDocMode === "rich") {
    if (kind === "bold") return execRichCommand("bold", null, "已切换加粗。");
    if (kind === "italic") return execRichCommand("italic", null, "已切换斜体。");
    if (kind === "underline") return execRichCommand("underline", null, "已切换下划线。");
    execRichStyle();
    return;
  }
  const selected = selectedDocumentText() || "文字";
  if (kind === "bold") return replaceDocumentSelection(`**${selected}**`, { selectionStartOffset: 2, selectionEndOffset: 2 + selected.length });
  if (kind === "italic") return replaceDocumentSelection(`*${selected}*`, { selectionStartOffset: 1, selectionEndOffset: 1 + selected.length });
  if (kind === "underline") return wrapDocumentRichStyle({ underline: "1" }, selected);
  const attrs = {
    size: RaEls.docFontSize?.value || "16",
    color: RaEls.docTextColor?.value || "",
    bg: RaEls.docBgColor?.value || "",
    font: RaEls.docFontFamily?.value || "",
  };
  wrapDocumentRichStyle(attrs, selected);
}

function execRichCommand(command, value = null, message = "格式已应用。") {
  if (!RaEls.docRichEditor) return;
  RaEls.docRichEditor.focus();
  restoreRichSelection();
  document.execCommand(command, false, value);
  setRichEditorHtml(RaEls.docRichEditor.innerHTML);
  saveRichSelection();
  setDocStatus(message);
}

function execRichStyle() {
  if (!RaEls.docRichEditor) return;
  RaEls.docRichEditor.focus();
  restoreRichSelection();
  document.execCommand("fontSize", false, "4");
  const fontNodes = [...RaEls.docRichEditor.querySelectorAll("font[size='4']")];
  fontNodes.forEach((font) => {
    const span = document.createElement("span");
    span.innerHTML = font.innerHTML;
    span.style.fontSize = `${Number(RaEls.docFontSize?.value || 16)}px`;
    if (isSafeColor(RaEls.docTextColor?.value)) span.style.color = RaEls.docTextColor.value;
    if (isSafeColor(RaEls.docBgColor?.value)) span.style.backgroundColor = RaEls.docBgColor.value;
    if (RaEls.docFontFamily?.value) span.style.fontFamily = RaEls.docFontFamily.value;
    font.replaceWith(span);
  });
  setRichEditorHtml(RaEls.docRichEditor.innerHTML);
  saveRichSelection();
  setDocStatus("文字格式已应用。");
}

function applyDocumentStyleIfSelection() {
  if (!selectedDocumentText()) return;
  applyDocumentStyle("rich");
}

function wrapDocumentRichStyle(attrs, text) {
  const input = RaEls.docContent;
  const existing = findEnclosingRichStyle();
  if (existing && input) {
    const nextAttrs = { ...existing.attrs, ...attrs };
    const nextPrefix = `[[ra-style ${formatTokenAttributes(nextAttrs)}]]`;
    const nextValue = `${nextPrefix}${existing.text}[[/ra-style]]`;
    replaceDocumentRange(existing.start, existing.end, nextValue, {
      selectionStartOffset: nextPrefix.length + (input.selectionStart - existing.textStart),
      selectionEndOffset: nextPrefix.length + (input.selectionEnd - existing.textStart),
    });
    return;
  }
  const attrText = formatTokenAttributes(attrs);
  const prefix = `[[ra-style ${attrText}]]`;
  replaceDocumentSelection(`${prefix}${text}[[/ra-style]]`, {
    selectionStartOffset: prefix.length,
    selectionEndOffset: prefix.length + text.length,
  });
}

function formatTokenAttributes(attrs) {
  return Object.entries(attrs)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}="${String(value).replace(/"/g, "&quot;")}"`)
    .join(" ");
}

function findEnclosingRichStyle() {
  const input = RaEls.docContent;
  if (!input) return null;
  const value = input.value;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const openStart = value.lastIndexOf("[[ra-style", start);
  const openEnd = openStart >= 0 ? value.indexOf("]]", openStart) : -1;
  const closeStart = value.indexOf("[[/ra-style]]", end);
  const previousClose = value.lastIndexOf("[[/ra-style]]", start);
  if (openStart < 0 || openEnd < 0 || closeStart < 0 || previousClose > openStart || openEnd + 2 > start) return null;
  return {
    start: openStart,
    end: closeStart + "[[/ra-style]]".length,
    textStart: openEnd + 2,
    text: value.slice(openEnd + 2, closeStart),
    attrs: parseTokenAttributes(value.slice(openStart + "[[ra-style".length, openEnd)),
  };
}

function isSelectionInsideRichEditor() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || !RaEls.docRichEditor) return false;
  const range = selection.getRangeAt(0);
  return RaEls.docRichEditor.contains(range.commonAncestorContainer);
}

function saveRichSelection() {
  if (!isSelectionInsideRichEditor()) return;
  RaSavedRichRange = window.getSelection().getRangeAt(0).cloneRange();
}

function restoreRichSelection() {
  if (!RaEls.docRichEditor || !RaSavedRichRange || !RaEls.docRichEditor.contains(RaSavedRichRange.commonAncestorContainer)) {
    return false;
  }
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(RaSavedRichRange);
  return true;
}

function getRichInsertRange() {
  if (!RaEls.docRichEditor) return null;
  restoreRichSelection();
  const selection = window.getSelection();
  if (selection?.rangeCount && RaEls.docRichEditor.contains(selection.getRangeAt(0).commonAncestorContainer)) {
    return selection.getRangeAt(0);
  }
  const range = document.createRange();
  range.selectNodeContents(RaEls.docRichEditor);
  range.collapse(false);
  return range;
}

function placeCaretInside(node) {
  if (!node) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  saveRichSelection();
}

function makeRichSpacerParagraph() {
  const paragraph = document.createElement("p");
  paragraph.innerHTML = "<br>";
  return paragraph;
}

function syncRichEditorMutation(message) {
  syncPostFromDocument({ showMessage: false });
  renderDocumentPreview();
  if (message) setDocStatus(message);
}

function createRichCodeCard(code = "在这里粘贴代码") {
  const card = document.createElement("figure");
  card.className = "RaCodeCard";
  card.setAttribute("contenteditable", "false");
  card.setAttribute("draggable", "true");
  card.dataset.raCodeCard = "true";
  card.innerHTML = `
    <figcaption class="RaCodeCardToolbar" data-ra-editor-only="true">
      <strong>代码块</strong>
      <span>独立卡片</span>
      <button type="button" data-ra-code-move="up">上移</button>
      <button type="button" data-ra-code-move="down">下移</button>
      <button type="button" data-ra-code-edit>编辑</button>
      <button type="button" data-ra-code-delete>删除</button>
    </figcaption>
    <pre><code>${escapeHtml(code)}</code></pre>
  `;
  return card;
}

function insertRichNodeAtCursor(node, message = "") {
  if (!RaEls.docRichEditor || !node) return;
  RaEls.docRichEditor.focus();
  const range = getRichInsertRange();
  if (!range) return;
  range.deleteContents();
  range.insertNode(node);
  const spacer = makeRichSpacerParagraph();
  node.after(spacer);
  placeCaretInside(spacer);
  syncRichEditorMutation(message);
}

function insertRichHtmlAtCursor(html, message = "") {
  if (!RaEls.docRichEditor) return;
  const template = document.createElement("template");
  template.innerHTML = sanitizeRichHtml(html || "", { forEditor: true });
  const nodes = [...template.content.childNodes].filter((node) => node.nodeType !== Node.TEXT_NODE || node.textContent.trim());
  if (!nodes.length) return;
  RaEls.docRichEditor.focus();
  const range = getRichInsertRange();
  if (!range) return;
  range.deleteContents();
  const fragment = document.createDocumentFragment();
  nodes.forEach((node) => fragment.appendChild(node));
  const last = nodes[nodes.length - 1];
  range.insertNode(fragment);
  const spacer = makeRichSpacerParagraph();
  last.after(spacer);
  placeCaretInside(spacer);
  syncRichEditorMutation(message);
}

function isEmptyEditorParagraph(node) {
  return node?.tagName === "P" && !node.textContent.trim();
}

function moveRichCodeCard(card, direction) {
  if (!card) return;
  let sibling = direction === "up" ? card.previousElementSibling : card.nextElementSibling;
  while (isEmptyEditorParagraph(sibling)) {
    sibling = direction === "up" ? sibling.previousElementSibling : sibling.nextElementSibling;
  }
  if (!sibling) {
    setDocStatus("这个代码块已经在边界位置。");
    return;
  }
  if (direction === "up") sibling.before(card);
  else sibling.after(card);
  syncRichEditorMutation("代码块位置已调整。");
}

function handleRichEditorClick(event) {
  const card = event.target.closest("[data-ra-code-card]");
  const moveButton = event.target.closest("[data-ra-code-move]");
  if (moveButton && card) {
    moveRichCodeCard(card, moveButton.dataset.raCodeMove);
    return;
  }
  if (event.target.closest("[data-ra-code-delete]") && card) {
    card.remove();
    syncRichEditorMutation("代码块已删除。");
    return;
  }
  if (event.target.closest("[data-ra-code-edit]") && card) {
    const code = card.querySelector("code");
    const next = window.prompt("编辑代码块内容", code?.textContent || "");
    if (next === null) return;
    if (code) code.textContent = next;
    syncRichEditorMutation("代码块已更新。");
    return;
  }
  if (card) {
    RaEls.docRichEditor.querySelectorAll("[data-ra-code-card]").forEach((item) => item.removeAttribute("data-ra-selected"));
    card.dataset.raSelected = "true";
    setDocStatus("已选中代码卡片，可上移、下移、编辑或删除。");
  }
}

function insertDocumentCode() {
  if (RaDocMode === "rich") {
    insertRichNodeAtCursor(createRichCodeCard(), "已在光标处插入代码卡片。");
    return;
  }
  replaceDocumentSelection("\n```text\n在这里粘贴代码\n```\n");
}

async function insertDocumentImage(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    if (!file.type.startsWith("image/")) throw new Error("请选择图片文件。");
    const dataUrl = await fileToDataUrl(file);
    if (RaDocMode === "rich") {
      const image = document.createElement("img");
      image.src = dataUrl;
      image.alt = file.name;
      insertRichNodeAtCursor(image, `已在光标处插入图片：${file.name}`);
      return;
    }
    replaceDocumentSelection(`\n[[ra-image src="${dataUrl}" alt="${file.name.replace(/"/g, "")}"]]\n`);
    setDocStatus(`已插入图片：${file.name}`);
  } catch (error) {
    setDocStatus(`图片插入失败：${error.message}`);
  }
}

async function insertDocumentAttachments(event) {
  const files = [...(event.target.files || [])];
  event.target.value = "";
  if (!files.length) return;
  try {
    const next = [];
    for (const file of files) next.push(await fileToAttachment(file));
    RaSelectedAttachments = [...normalizeAttachments(RaSelectedAttachments), ...next];
    renderAttachmentList();
    if (RaDocMode === "rich") {
      insertRichHtmlAtCursor(next.map((item) => renderInlineAttachmentCard(item)).join(""), `已在光标处插入 ${next.length} 个附件卡片。`);
      return;
    }
    replaceDocumentSelection(`\n${next.map((item) => `[[ra-attachment:${item.id}]]`).join("\n")}\n`);
    setDocStatus(`已插入 ${next.length} 个附件卡片。`);
  } catch (error) {
    setDocStatus(`附件插入失败：${error.message}`);
  }
}

function insertRichHtml(html) {
  insertRichHtmlAtCursor(html);
}

async function pasteIntoRichEditor(event) {
  if (RaDocMode !== "rich") return;
  const files = [...(event.clipboardData?.files || [])].filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;
  event.preventDefault();
  try {
    for (const file of files) {
      const dataUrl = await fileToDataUrl(file);
      const image = document.createElement("img");
      image.src = dataUrl;
      image.alt = file.name || "粘贴图片";
      insertRichNodeAtCursor(image);
    }
    setDocStatus(`已粘贴 ${files.length} 张图片。`);
  } catch (error) {
    setDocStatus(`粘贴图片失败：${error.message}`);
  }
}

function selectedDocumentText() {
  if (RaDocMode === "rich") {
    restoreRichSelection();
    const selection = window.getSelection();
    if (!selection || !RaEls.docRichEditor?.contains(selection.anchorNode)) return "";
    return selection.toString();
  }
  const input = RaEls.docContent;
  if (!input) return "";
  return input.value.slice(input.selectionStart, input.selectionEnd);
}

function captureDocumentViewport() {
  return {
    docScrollTop: RaEls.docContent?.scrollTop || 0,
    docScrollLeft: RaEls.docContent?.scrollLeft || 0,
    lineScrollTop: RaEls.docLineNumbers?.scrollTop || 0,
    pageX: window.scrollX,
    pageY: window.scrollY,
  };
}

function restoreDocumentViewport(state) {
  if (!state) return;
  if (RaEls.docContent) {
    RaEls.docContent.scrollTop = state.docScrollTop;
    RaEls.docContent.scrollLeft = state.docScrollLeft;
  }
  if (RaEls.docLineNumbers) RaEls.docLineNumbers.scrollTop = state.lineScrollTop;
  window.scrollTo(state.pageX, state.pageY);
}

function replaceDocumentSelection(value, options = {}) {
  const input = RaEls.docContent;
  if (!input) return;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  replaceDocumentRange(start, end, value, options);
}

function replaceDocumentRange(start, end, value, options = {}) {
  const input = RaEls.docContent;
  if (!input) return;
  const viewport = captureDocumentViewport();
  input.value = `${input.value.slice(0, start)}${value}${input.value.slice(end)}`;
  input.focus();
  input.selectionStart = start + (options.selectionStartOffset ?? 0);
  input.selectionEnd = start + (options.selectionEndOffset ?? value.length);
  syncPostFromDocument({ showMessage: false });
  refreshDocumentStudio();
  restoreDocumentViewport(viewport);
  requestAnimationFrame(() => restoreDocumentViewport(viewport));
}

function setDocStatus(message) {
  if (RaEls.docStatus) RaEls.docStatus.textContent = message || "";
  if (RaEls.docInlineStatus) RaEls.docInlineStatus.textContent = message || "";
}

function flashDocButton(button, label) {
  if (!button || !label) return;
  const original = button.dataset.raOriginalText || button.textContent;
  button.dataset.raOriginalText = original;
  button.textContent = label;
  button.classList.add("RaButtonPulse");
  window.setTimeout(() => {
    button.textContent = button.dataset.raOriginalText || original;
    button.classList.remove("RaButtonPulse");
  }, 1300);
}

function renderAttachmentList() {
  if (!RaEls.attachmentList) return;
  const attachments = normalizeAttachments(RaSelectedAttachments);
  if (!attachments.length) {
    RaEls.attachmentList.innerHTML = '<div class="RaEmptyState">暂无附件</div>';
    return;
  }
  RaEls.attachmentList.innerHTML = attachments
    .map(
      (item, index) => `
        <article class="RaAttachmentItem">
          <div>
            <strong>${escapeHtml(item.name || item.fileName || "附件")}</strong>
            <small>${escapeHtml(item.fileName || "")}${item.size ? ` · ${formatBytes(item.size)}` : ""}</small>
          </div>
          <button class="RaDangerButton" type="button" data-ra-delete-attachment="${index}">删除</button>
        </article>
      `,
    )
    .join("");
}

function renderPostPreview() {
  if (!RaEls.postPreviewPanel || !RaEls.postPreview) return;
  const title = RaEls.title.value.trim() || "未命名文章";
  const tags = getEditorTags();
  const summary = RaEls.summary.value.trim();
  const meta = [RaEls.date.value || new Date().toISOString().slice(0, 10), `${estimateReadingMinutes(RaEls.content.value)} 分钟阅读`];
  RaEls.postPreview.innerHTML = `
    <header class="RaPreviewHeader">
      <div class="RaPreviewTags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${meta.map(escapeHtml).join(" · ")}</p>
      ${summary ? `<p>${escapeHtml(summary)}</p>` : ""}
    </header>
    ${renderMarkdownPreview(RaEls.content.value, normalizeAttachments(RaSelectedAttachments), RaDocMode)}
  `;
  RaEls.postPreviewPanel.hidden = false;
}

function refreshPostPreviewIfOpen() {
  if (RaEls.postPreviewPanel && !RaEls.postPreviewPanel.hidden) renderPostPreview();
}

function renderMarkdownPreview(content, attachments = [], mode = "markdown") {
  if (mode === "plain") return `<p>${escapeHtml(content)}</p>`;
  if (mode === "rich") return renderRichDocumentContent(content, attachments);
  const attachmentMap = new Map(normalizeAttachments(attachments).map((item) => [item.id, item]));
  return parseMarkdownBlocks(content)
    .map((block) => {
      if (block.type === "h1") return `<h1>${renderInlineMarkdown(block.text)}</h1>`;
      if (block.type === "h2") return `<h2>${renderInlineMarkdown(block.text)}</h2>`;
      if (block.type === "h3") return `<h3>${renderInlineMarkdown(block.text)}</h3>`;
      if (["h4", "h5", "h6"].includes(block.type)) return `<h3>${renderInlineMarkdown(block.text)}</h3>`;
      if (block.type === "hr") return "<hr />";
      if (block.type === "code") return `<pre><code>${escapeHtml(block.text)}</code></pre>`;
      if (block.type === "image") return `<img class="RaInlineImage" src="${escapeAttr(block.src)}" alt="${escapeAttr(block.alt || "插入图片")}" />`;
      if (block.type === "attachment") return renderInlineAttachmentCard(attachmentMap.get(block.id), block.id);
      if (block.type === "ul") {
        return `<ul>${block.items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`;
      }
      return `<p>${renderInlineMarkdown(block.text)}</p>`;
    })
    .join("");
}

function parseMarkdownBlocks(content) {
  const lines = String(content || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let paragraph = [];
  let listItems = [];
  let codeLines = [];
  let isCode = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: "p", text: paragraph.join("\n") });
    paragraph = [];
  };
  const flushList = () => {
    if (!listItems.length) return;
    blocks.push({ type: "ul", items: listItems });
    listItems = [];
  };
  const pushHeading = (level, text) => {
    const clean = String(text || "").trim();
    if (clean) blocks.push({ type: `h${Math.min(Math.max(level, 1), 6)}`, text: clean });
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      if (isCode) {
        blocks.push({ type: "code", text: codeLines.join("\n") });
        codeLines = [];
        isCode = false;
      } else {
        flushParagraph();
        flushList();
        isCode = true;
      }
      return;
    }
    if (isCode) {
      codeLines.push(line);
      return;
    }
    const setextMatch = trimmed.match(/^(=+|-+)$/);
    if (setextMatch) {
      flushList();
      if (paragraph.length) {
        pushHeading(setextMatch[1][0] === "=" ? 1 : 2, paragraph.join(" "));
        paragraph = [];
      } else if (trimmed.length >= 3) {
        blocks.push({ type: "hr" });
      }
      return;
    }
    const imageMatch = trimmed.match(/^\[\[ra-image\s+(.+)\]\]$/);
    if (imageMatch) {
      flushParagraph();
      flushList();
      blocks.push({ type: "image", ...parseTokenAttributes(imageMatch[1]) });
      return;
    }
    const attachmentMatch = trimmed.match(/^\[\[ra-attachment:([^\]]+)\]\]$/);
    if (attachmentMatch) {
      flushParagraph();
      flushList();
      blocks.push({ type: "attachment", id: attachmentMatch[1].trim() });
      return;
    }
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }
    const atxMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (atxMatch) {
      flushParagraph();
      flushList();
      pushHeading(atxMatch[1].length, atxMatch[2].replace(/\s+#+$/, ""));
      return;
    }
    if (/^[-*+]\s+/.test(trimmed)) {
      flushParagraph();
      listItems.push(trimmed.replace(/^[-*+]\s+/, ""));
      return;
    }
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();
  if (codeLines.length) blocks.push({ type: "code", text: codeLines.join("\n") });
  return blocks;
}

function renderInlineMarkdown(text) {
  const source = String(text || "");
  const richPattern = /\[\[ra-style\s+([^\]]+)\]\]([\s\S]*?)\[\[\/ra-style\]\]/g;
  let html = "";
  let lastIndex = 0;
  for (const match of source.matchAll(richPattern)) {
    html += renderBasicInlineMarkdown(source.slice(lastIndex, match.index));
    html += renderRichTextSpan(match[2], parseTokenAttributes(match[1]));
    lastIndex = match.index + match[0].length;
  }
  html += renderBasicInlineMarkdown(source.slice(lastIndex));
  return html;
}

function renderBasicInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function renderRichTextSpan(text, attrs = {}) {
  const styles = [];
  if (attrs.size) styles.push(`font-size:${Number(attrs.size) || 16}px`);
  if (isSafeColor(attrs.color)) styles.push(`color:${attrs.color}`);
  if (isSafeColor(attrs.bg)) styles.push(`background:${attrs.bg}`);
  if (attrs.font) styles.push(`font-family:${escapeAttr(attrs.font)}`);
  if (attrs.underline === "1") styles.push("text-decoration:underline");
  return `<span class="RaRichText" style="${styles.join(";")}">${renderBasicInlineMarkdown(text)}</span>`;
}

function renderInlineAttachmentCard(item, fallbackId = "") {
  if (!item) return `<div class="RaInlineAttachmentCard"><span>附件不存在：${escapeHtml(fallbackId)}</span></div>`;
  const href = item.dataUrl || "#";
  return `
    <a class="RaInlineAttachmentCard" href="${escapeAttr(href)}" download="${escapeAttr(item.fileName || item.name || "attachment")}">
      <span>
        <strong>${escapeHtml(item.name || item.fileName || "附件")}</strong>
        <small>${escapeHtml(item.fileName || "")}${item.size ? ` · ${formatBytes(item.size)}` : ""}</small>
      </span>
      <strong>下载</strong>
    </a>
  `;
}

function parseTokenAttributes(value = "") {
  const attrs = {};
  String(value).replace(/([a-zA-Z]+)="([^"]*)"/g, (_, key, attrValue) => {
    attrs[key] = attrValue.replace(/&quot;/g, '"');
    return "";
  });
  return attrs;
}

function isSafeColor(value) {
  return /^#[0-9a-fA-F]{3,8}$/.test(String(value || ""));
}

async function importTextContent(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    if (!isSupportedTextFile(file)) {
      throw new Error("请选择 txt、md、markdown、log 或 text 文本文件。");
    }
    const content = normalizeTextContent(await readTextFile(file));
    RaEls.content.value = content;
    if (!RaEls.title.value.trim()) {
      RaEls.title.value = file.name.replace(/\.[^.]+$/, "");
      RaEls.slug.value = slugify(RaEls.title.value);
    }
    if (!RaEls.summary.value.trim()) {
      RaEls.summary.value = content.split(/\n\s*\n/).find(Boolean)?.trim().slice(0, 120) || "";
    }
    refreshPostPreviewIfOpen();
    renderPostPreview();
    setStatus(`已导入 ${file.name}，换行和 Markdown 结构会按发布效果预览。`);
  } catch (error) {
    setStatus(`文本导入失败：${error.message}`);
  }
}

function isSupportedTextFile(file) {
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();
  return (
    type.startsWith("text/") ||
    [".txt", ".md", ".markdown", ".log", ".text"].some((ext) => name.endsWith(ext))
  );
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取文本文件失败。"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsText(file, "utf-8");
  });
}

function normalizeTextContent(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ");
}

async function addAttachments(event) {
  const files = [...(event.target.files || [])];
  event.target.value = "";
  if (!files.length) return;
  try {
    const next = [];
    for (const file of files) {
      if (file.size > 2 * 1024 * 1024) throw new Error(`${file.name} 超过 2MB，请压缩后再上传。`);
      next.push(await fileToAttachment(file));
    }
    RaSelectedAttachments = [...normalizeAttachments(RaSelectedAttachments), ...next];
    renderAttachmentList();
    setStatus(`已添加 ${next.length} 个附件，保存文章后生效。`);
  } catch (error) {
    setStatus(`附件添加失败：${error.message}`);
  }
}

function fileToAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取附件失败。"));
    reader.onload = () => {
      resolve({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: reader.result,
        createdAt: new Date().toISOString(),
      });
    };
    reader.readAsDataURL(file);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取文件失败。"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

async function uploadAssetAttachment(file, bucket = "tools") {
  const dataUrl = await fileToDataUrl(file);
  const result = await raApi("/api/assets", {
    method: "POST",
    body: JSON.stringify({
      bucket,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      dataUrl,
    }),
  });
  return {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    url: result.url || result.asset?.url || "",
    path: result.path || result.asset?.path || "",
    createdAt: new Date().toISOString(),
  };
}

function deleteAttachment(index) {
  RaSelectedAttachments = normalizeAttachments(RaSelectedAttachments).filter((_, itemIndex) => itemIndex !== index);
  renderAttachmentList();
}

function clearAttachments() {
  RaSelectedAttachments = [];
  renderAttachmentList();
  setStatus("附件已清空，保存文章后生效。");
}

function normalizeAttachments(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => ({
      id: item.id || `att-${Math.random().toString(36).slice(2, 10)}`,
      name: item.name || item.fileName || "附件",
      fileName: item.fileName || item.name || "attachment",
      mimeType: item.mimeType || item.type || "application/octet-stream",
      size: Number(item.size || 0),
      url: item.url || "",
      dataUrl: item.dataUrl || "",
      createdAt: item.createdAt || "",
    }))
    .filter((item) => item.url || item.dataUrl);
}

function setupCodeLanguagePresetOptions() {
  if (!RaEls.codeLanguagePreset) return;
  RaEls.codeLanguagePreset.innerHTML = RA_CODE_LANGUAGE_PRESETS.map(
    (item) => `<option value="${escapeAttr(item.value)}">${escapeHtml(item.label)}</option>`,
  ).join("");
}

function currentCodeLanguage() {
  return RaEls.codeLanguage.value.trim() || RaEls.codeLanguagePreset.value || "Plain Text";
}

function selectCodeLanguage(language) {
  const clean = normalizeCodeLanguage(language);
  const preset = RA_CODE_LANGUAGE_PRESETS.find((item) => item.value.toLowerCase() === clean.toLowerCase());
  if (preset) {
    RaEls.codeLanguagePreset.value = preset.value;
    RaEls.codeLanguage.value = "";
  } else {
    RaEls.codeLanguagePreset.value = "Plain Text";
    RaEls.codeLanguage.value = clean === "Plain Text" ? "" : clean;
  }
}

function normalizeCodeLanguage(language) {
  const clean = String(language || "").trim();
  if (!clean) return "Plain Text";
  const lower = clean.toLowerCase();
  if (lower === "kt") return "Kotlin";
  if (lower === "cpp" || lower === "cxx") return "C++";
  if (lower === "js") return "JavaScript";
  if (lower === "ts") return "TypeScript";
  if (lower === "md") return "Markdown";
  return clean;
}

function codeLanguageExtension(language) {
  const clean = normalizeCodeLanguage(language).toLowerCase();
  const preset = RA_CODE_LANGUAGE_PRESETS.find(
    (item) => item.value.toLowerCase() === clean || item.label.toLowerCase() === clean,
  );
  return preset?.extension || clean.replace(/[^a-z0-9]+/g, "").slice(0, 8) || "txt";
}

function codeFileName(item = {}) {
  return `${slugify(item.name || item.id || "code-snippet")}.${codeLanguageExtension(item.language)}`;
}

function normalizeCodeRepositories(value) {
  return (Array.isArray(value) ? value : []).map((repo) => ({
    id: repo.id || slugify(repo.name || `code-${Date.now()}`),
    name: repo.name || "未命名代码",
    description: repo.description || "",
    language: normalizeCodeLanguage(repo.language || "Plain Text"),
    tags: normalizeTags(Array.isArray(repo.tags) ? repo.tags : parseTags(repo.tags)),
    url: repo.url || "",
    sourcePath: repo.sourcePath || "",
    updatedAt: repo.updatedAt || repo.date || "",
    snippet: repo.snippet || "",
    notes: repo.notes || "",
    attachments: normalizeAttachments(repo.attachments),
  }));
}

function normalizeCollectionItems(value, prefix = "item") {
  return sortPosts(
    (Array.isArray(value) ? value : []).map((item) => ({
      title: item.title || item.name || "未命名条目",
      slug: slugify(item.slug || item.id || item.title || item.name || `${prefix}-${Date.now()}`),
      date: item.date || item.createdAt?.slice?.(0, 10) || new Date().toISOString().slice(0, 10),
      createdAt: item.createdAt || item.date || "",
      updatedAt: item.updatedAt || item.modifiedAt || item.lastModified || item.date || "",
      tags: normalizeTags(Array.isArray(item.tags) ? item.tags : parseTags(item.tags)),
      visibility: normalizePostVisibility(item.visibility),
      accessPassword: item.accessPassword || item.password || "",
      summary: item.summary || item.description || "",
      content: item.content || item.notes || "",
      contentFormat: ["plain", "markdown", "rich"].includes(item.contentFormat) ? item.contentFormat : "markdown",
      readingMinutes: item.readingMinutes || estimateReadingMinutes(item.content || item.notes || ""),
      attachments: normalizeAttachments(item.attachments),
    })),
  );
}

function formatCodeByLanguage(source, language) {
  const code = String(source || "").replace(/\r\n?/g, "\n").trim();
  if (!code) return "";
  const normalized = normalizeCodeLanguage(language).toLowerCase();
  if (normalized === "json") {
    try {
      return JSON.stringify(JSON.parse(code), null, 2);
    } catch {
      return normalizeCodeLines(code);
    }
  }
  if (normalized === "xml" || normalized === "html") return formatXmlCode(code);
  if (["c", "c++", "java", "kotlin", "javascript", "typescript", "swift", "go", "rust", "gradle"].includes(normalized)) {
    return formatBracedCode(code);
  }
  return normalizeCodeLines(code);
}

function normalizeCodeLines(code) {
  return code.split("\n").map((line) => line.replace(/\s+$/g, "")).join("\n");
}

function formatXmlCode(code) {
  const tokens = code.replace(/>\s*</g, ">\n<").split("\n");
  let level = 0;
  return tokens
    .map((token) => {
      const clean = token.trim();
      if (!clean) return "";
      if (/^<\//.test(clean)) level = Math.max(level - 1, 0);
      const line = `${"  ".repeat(level)}${clean}`;
      if (/^<[^!?/][^>]*[^/]?>$/.test(clean) && !/^<[^>]+>.*<\/[^>]+>$/.test(clean)) level += 1;
      return line;
    })
    .filter(Boolean)
    .join("\n");
}

function formatBracedCode(code) {
  let level = 0;
  return code
    .replace(/\{\s*/g, "{\n")
    .replace(/\s*\}/g, "\n}")
    .replace(/;\s*/g, ";\n")
    .replace(/\n{2,}/g, "\n")
    .split("\n")
    .map((line) => {
      const clean = line.trim();
      if (!clean) return "";
      if (clean.startsWith("}")) level = Math.max(level - 1, 0);
      const output = `${"  ".repeat(level)}${clean}`;
      if (clean.endsWith("{")) level += 1;
      return output;
    })
    .filter(Boolean)
    .join("\n");
}

function renderCodeList() {
  if (!RaEls.codeList) return;
  const repositories = Array.isArray(RaData.repositories) ? RaData.repositories : [];
  if (!repositories.length) {
    RaEls.codeList.innerHTML = '<div class="RaEmptyState">暂无代码条目</div>';
    return;
  }
  RaEls.codeList.innerHTML = repositories
    .map(
      (item) => `
        <article class="RaItem ${item.id === RaSelectedCodeId ? "RaActive" : ""}" data-ra-code-id="${escapeAttr(item.id)}">
          <strong>${escapeHtml(item.name || "未命名代码")}</strong>
          <small>${escapeHtml(item.language || "Code")} · ${escapeHtml((item.tags || []).join(" / "))}</small>
        </article>
      `,
    )
    .join("");
}

function selectCodeItem(id) {
  const repositories = Array.isArray(RaData.repositories) ? RaData.repositories : [];
  const item = repositories.find((repo) => repo.id === id) || createEmptyCodeItem();
  RaSelectedCodeId = item.id || "";
  RaEls.codeName.value = item.name || "";
  selectCodeLanguage(item.language || "");
  setCodeEditorTags(item.tags || []);
  RaEls.codePath.value = item.sourcePath || "";
  RaEls.codeUrl.value = item.url || "";
  RaEls.codeDescription.value = item.description || "";
  RaEls.codeSnippet.value = item.snippet || "";
  RaEls.codeNotes.value = item.notes || "";
  RaSelectedCodeAttachments = normalizeAttachments(item.attachments);
  renderCodeAttachmentList();
  renderCodeList();
}

function createEmptyCodeItem() {
  return {
    id: "",
    name: "",
    description: "",
    language: "Code",
    tags: [],
    url: "",
    sourcePath: "",
    updatedAt: new Date().toISOString().slice(0, 10),
    snippet: "",
    notes: "",
    attachments: [],
  };
}

function newCodeItem() {
  RaSelectedCodeId = "";
  selectCodeItem("");
}

function saveCodeItem() {
  const now = new Date().toISOString().slice(0, 10);
  const item = {
    id: RaSelectedCodeId || slugify(RaEls.codeName.value || `code-${Date.now()}`),
    name: RaEls.codeName.value.trim(),
    description: RaEls.codeDescription.value.trim(),
    language: currentCodeLanguage(),
    tags: getCodeEditorTags(),
    url: RaEls.codeUrl.value.trim(),
    sourcePath: RaEls.codePath.value.trim(),
    updatedAt: now,
    snippet: RaEls.codeSnippet.value,
    notes: RaEls.codeNotes.value.trim(),
    attachments: normalizeAttachments(RaSelectedCodeAttachments),
  };
  if (!item.name) {
    setCodeStatus("代码条目名称必填。");
    return;
  }
  if (!Array.isArray(RaData.repositories)) RaData.repositories = [];
  const index = RaData.repositories.findIndex((repo) => repo.id === item.id);
  if (index >= 0) RaData.repositories[index] = item;
  else RaData.repositories.unshift(item);
  RaSelectedCodeId = item.id;
  saveLocalData();
  renderCodeForm();
  setCodeStatus("代码条目已保存。");
}

function deleteCodeItem() {
  if (!RaSelectedCodeId || !Array.isArray(RaData.repositories)) return;
  RaData.repositories = RaData.repositories.filter((repo) => repo.id !== RaSelectedCodeId);
  RaSelectedCodeId = "";
  saveLocalData();
  renderCodeForm();
  setCodeStatus("代码条目已删除。");
}

function renderCodeAttachmentList() {
  if (!RaEls.codeAttachmentList) return;
  const attachments = normalizeAttachments(RaSelectedCodeAttachments);
  if (!attachments.length) {
    RaEls.codeAttachmentList.innerHTML = '<div class="RaEmptyState">暂无附件</div>';
    return;
  }
  RaEls.codeAttachmentList.innerHTML = attachments
    .map(
      (item, index) => `
        <article class="RaAttachmentItem">
          <div>
            <strong>${escapeHtml(item.name || item.fileName || "附件")}</strong>
            <small>${escapeHtml(item.fileName || "")}${item.size ? ` · ${formatBytes(item.size)}` : ""}</small>
          </div>
          <button class="RaDangerButton" type="button" data-ra-delete-code-attachment="${index}">删除</button>
        </article>
      `,
    )
    .join("");
}

async function addCodeAttachments(event) {
  const files = [...(event.target.files || [])];
  event.target.value = "";
  if (!files.length) return;
  try {
    const next = [];
    for (const file of files) {
      if (file.size > 2 * 1024 * 1024) throw new Error(`${file.name} 超过 2MB，请压缩后再上传。`);
      next.push(await fileToAttachment(file));
    }
    RaSelectedCodeAttachments = [...normalizeAttachments(RaSelectedCodeAttachments), ...next];
    renderCodeAttachmentList();
    setCodeStatus(`已添加 ${next.length} 个代码附件，保存代码条目后生效。`);
  } catch (error) {
    setCodeStatus(`代码附件添加失败：${error.message}`);
  }
}

function deleteCodeAttachment(index) {
  RaSelectedCodeAttachments = normalizeAttachments(RaSelectedCodeAttachments).filter((_, itemIndex) => itemIndex !== index);
  renderCodeAttachmentList();
}

function clearCodeAttachments() {
  RaSelectedCodeAttachments = [];
  renderCodeAttachmentList();
  setCodeStatus("代码附件已清空，保存代码条目后生效。");
}

function renderToolList() {
  if (!RaEls.toolList) return;
  const tools = Array.isArray(RaData.tools) ? RaData.tools : [];
  if (!tools.length) {
    RaEls.toolList.innerHTML = '<div class="RaEmptyState">暂无工具条目</div>';
    return;
  }
  RaEls.toolList.innerHTML = tools
    .map((item) => `
      <article class="RaItem ${item.slug === RaSelectedToolSlug ? "RaActive" : ""}" data-ra-tool-slug="${escapeAttr(item.slug)}">
        <strong>${escapeHtml(item.title || "未命名工具")}</strong>
        <small>${escapeHtml(item.date || "")} · ${escapeHtml((item.tags || []).join(" / "))} · ${(item.attachments || []).length} 个附件</small>
      </article>
    `)
    .join("");
}

function createEmptyToolItem() {
  const now = new Date().toISOString();
  return {
    title: "",
    slug: "",
    date: now.slice(0, 10),
    createdAt: now,
    updatedAt: now,
    tags: [],
    summary: "",
    content: "## 工具说明\n\n在这里记录工具用途、使用方式和注意事项。\n",
    contentFormat: "markdown",
    attachments: [],
  };
}

function selectToolItem(slug) {
  const tools = Array.isArray(RaData.tools) ? RaData.tools : [];
  const item = tools.find((tool) => tool.slug === slug) || createEmptyToolItem();
  RaSelectedToolSlug = item.slug || "";
  RaEls.toolTitle.value = item.title || "";
  RaEls.toolSlug.value = item.slug || "";
  RaEls.toolDate.value = item.date || new Date().toISOString().slice(0, 10);
  RaEls.toolTags.value = (item.tags || []).join(", ");
  RaEls.toolSummary.value = item.summary || "";
  RaEls.toolContent.value = item.content || "";
  RaSelectedToolAttachments = normalizeAttachments(item.attachments);
  renderToolAttachmentList();
  renderToolList();
}

function newToolItem() {
  RaSelectedToolSlug = "";
  selectToolItem("");
}

function toolItemFromForm() {
  const now = new Date().toISOString();
  const title = RaEls.toolTitle.value.trim();
  const slug = slugify(RaEls.toolSlug.value || title || `tool-${Date.now()}`);
  return {
    title,
    slug,
    date: RaEls.toolDate.value || now.slice(0, 10),
    createdAt: RaSelectedToolSlug ? (RaData.tools || []).find((item) => item.slug === RaSelectedToolSlug)?.createdAt || now : now,
    updatedAt: now,
    tags: parseTags(RaEls.toolTags.value),
    summary: RaEls.toolSummary.value.trim(),
    content: RaEls.toolContent.value,
    contentFormat: "markdown",
    attachments: normalizeAttachments(RaSelectedToolAttachments),
  };
}

function saveToolItem() {
  const item = toolItemFromForm();
  if (!item.title) {
    setToolsStatus("工具名称必填。");
    return false;
  }
  if (!Array.isArray(RaData.tools)) RaData.tools = [];
  const index = RaData.tools.findIndex((tool) => tool.slug === (RaSelectedToolSlug || item.slug));
  if (index >= 0) RaData.tools[index] = item;
  else RaData.tools.unshift(item);
  RaSelectedToolSlug = item.slug;
  RaData.tools = normalizeCollectionItems(RaData.tools, "tool");
  saveLocalData();
  renderToolsForm();
  setToolsStatus("工具条目已保存。");
  return true;
}

function deleteToolItem() {
  if (!RaSelectedToolSlug || !Array.isArray(RaData.tools)) return;
  RaData.tools = RaData.tools.filter((item) => item.slug !== RaSelectedToolSlug);
  RaSelectedToolSlug = "";
  saveLocalData();
  renderToolsForm();
  setToolsStatus("工具条目已删除。");
}

function renderToolAttachmentList() {
  if (!RaEls.toolAttachmentList) return;
  const attachments = normalizeAttachments(RaSelectedToolAttachments);
  if (!attachments.length) {
    RaEls.toolAttachmentList.innerHTML = '<div class="RaEmptyState">暂无附件</div>';
    return;
  }
  RaEls.toolAttachmentList.innerHTML = attachments
    .map((item, index) => `
      <article class="RaAttachmentItem">
        <div>
          <strong>${escapeHtml(item.name || item.fileName || "附件")}</strong>
          <small>${escapeHtml(item.fileName || "")}${item.size ? ` · ${formatBytes(item.size)}` : ""}${item.url ? " · GitHub" : ""}</small>
        </div>
        <button class="RaDangerButton" type="button" data-ra-delete-tool-attachment="${index}">删除</button>
      </article>
    `)
    .join("");
}

async function addToolAttachments(event) {
  const files = [...(event.target.files || [])];
  event.target.value = "";
  if (!files.length) return;
  try {
    const next = [];
    for (const file of files) {
      setToolsStatus(`正在上传 ${file.name} 到 GitHub...`);
      next.push(await uploadAssetAttachment(file, "tools"));
    }
    RaSelectedToolAttachments = [...normalizeAttachments(RaSelectedToolAttachments), ...next];
    renderToolAttachmentList();
    setToolsStatus(`已上传 ${next.length} 个工具附件，保存工具条目后生效。`);
  } catch (error) {
    setToolsStatus(`工具附件上传失败：${error.message}`);
  }
}

function deleteToolAttachment(index) {
  RaSelectedToolAttachments = normalizeAttachments(RaSelectedToolAttachments).filter((_, itemIndex) => itemIndex !== index);
  renderToolAttachmentList();
}

function clearToolAttachments() {
  RaSelectedToolAttachments = [];
  renderToolAttachmentList();
  setToolsStatus("工具附件已清空，保存工具条目后生效。");
}

function renderDevLogList() {
  if (!RaEls.devLogList) return;
  const logs = Array.isArray(RaData.devLogs) ? RaData.devLogs : [];
  if (!logs.length) {
    RaEls.devLogList.innerHTML = '<div class="RaEmptyState">暂无开发日志</div>';
    return;
  }
  RaEls.devLogList.innerHTML = logs
    .map((item) => `
      <article class="RaItem ${item.slug === RaSelectedDevLogSlug ? "RaActive" : ""}" data-ra-devlog-slug="${escapeAttr(item.slug)}">
        <strong>${escapeHtml(item.title || "未命名日志")}</strong>
        <small>${escapeHtml(item.date || "")} · ${escapeHtml((item.tags || []).join(" / "))}</small>
      </article>
    `)
    .join("");
}

function createEmptyDevLogItem() {
  const now = new Date().toISOString();
  return {
    title: "",
    slug: "",
    date: now.slice(0, 10),
    createdAt: now,
    updatedAt: now,
    tags: ["开发日志"],
    summary: "",
    content: "## 背景\n\n## 开发过程\n\n## 验证\n\n## 部署\n",
    contentFormat: "markdown",
    attachments: [],
  };
}

function selectDevLogItem(slug) {
  const logs = Array.isArray(RaData.devLogs) ? RaData.devLogs : [];
  const item = logs.find((log) => log.slug === slug) || createEmptyDevLogItem();
  RaSelectedDevLogSlug = item.slug || "";
  RaEls.devLogTitle.value = item.title || "";
  RaEls.devLogSlug.value = item.slug || "";
  RaEls.devLogDate.value = item.date || new Date().toISOString().slice(0, 10);
  RaEls.devLogTags.value = (item.tags || []).join(", ");
  RaEls.devLogSummary.value = item.summary || "";
  RaEls.devLogContent.value = item.content || "";
  renderDevLogList();
}

function newDevLogItem() {
  RaSelectedDevLogSlug = "";
  selectDevLogItem("");
}

function devLogItemFromForm() {
  const now = new Date().toISOString();
  const title = RaEls.devLogTitle.value.trim();
  const slug = slugify(RaEls.devLogSlug.value || title || `devlog-${Date.now()}`);
  return {
    title,
    slug,
    date: RaEls.devLogDate.value || now.slice(0, 10),
    createdAt: RaSelectedDevLogSlug ? (RaData.devLogs || []).find((item) => item.slug === RaSelectedDevLogSlug)?.createdAt || now : now,
    updatedAt: now,
    tags: parseTags(RaEls.devLogTags.value || "开发日志"),
    summary: RaEls.devLogSummary.value.trim(),
    content: RaEls.devLogContent.value,
    contentFormat: "markdown",
    attachments: [],
  };
}

function saveDevLogItem() {
  const item = devLogItemFromForm();
  if (!item.title) {
    setDevLogsStatus("日志标题必填。");
    return false;
  }
  if (!Array.isArray(RaData.devLogs)) RaData.devLogs = [];
  const index = RaData.devLogs.findIndex((log) => log.slug === (RaSelectedDevLogSlug || item.slug));
  if (index >= 0) RaData.devLogs[index] = item;
  else RaData.devLogs.unshift(item);
  RaSelectedDevLogSlug = item.slug;
  RaData.devLogs = normalizeCollectionItems(RaData.devLogs, "devlog");
  saveLocalData();
  renderDevLogsForm();
  setDevLogsStatus("开发日志已保存。");
  return true;
}

function deleteDevLogItem() {
  if (!RaSelectedDevLogSlug || !Array.isArray(RaData.devLogs)) return;
  RaData.devLogs = RaData.devLogs.filter((item) => item.slug !== RaSelectedDevLogSlug);
  RaSelectedDevLogSlug = "";
  saveLocalData();
  renderDevLogsForm();
  setDevLogsStatus("开发日志已删除。");
}

function formatCurrentCodeSnippet() {
  RaEls.codeSnippet.value = formatCodeByLanguage(RaEls.codeSnippet.value, currentCodeLanguage());
  setCodeStatus("代码已按当前语言格式化。");
}

function downloadCurrentCodeSnippet() {
  const language = currentCodeLanguage();
  const item = {
    id: RaSelectedCodeId || "",
    name: RaEls.codeName.value.trim() || "code-snippet",
    language,
    snippet: RaEls.codeSnippet.value,
  };
  const link = document.createElement("a");
  link.href = `data:text/plain;charset=utf-8,${encodeURIComponent(formatCodeByLanguage(item.snippet, language))}`;
  link.download = codeFileName(item);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setCodeStatus(`已准备下载 ${link.download}。`);
}

function formatBytes(size) {
  const value = Number(size || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function updateProfilePhotoPreview() {
  const photoUrl = RaEls.profilePhoto.value.trim();
  RaEls.profilePhotoPreview.innerHTML = photoUrl
    ? `<img src="${escapeAttr(photoUrl)}" alt="个人照片预览" />`
    : "<span>照片预览</span>";
}

async function selectProfilePhoto(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    if (!file.type.startsWith("image/")) throw new Error("请选择图片文件。");
    const photoUrl = await resizeProfilePhoto(file);
    RaEls.profilePhoto.value = photoUrl;
    updateProfilePhotoPreview();
    setProfileStatus("本地照片已添加并压缩，保存并发布后会显示在外网简历。");
  } catch (error) {
    setProfileStatus(`照片处理失败：${error.message}`);
  } finally {
    event.target.value = "";
  }
}

function clearProfilePhoto() {
  RaEls.profilePhoto.value = "";
  updateProfilePhotoPreview();
  setProfileStatus("照片已清除，保存并发布后外网会恢复占位。");
}

function resizeProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取图片失败。"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("图片格式无法识别。"));
      image.onload = () => {
        const maxWidth = 720;
        const maxHeight = 960;
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderProfileSections(sections) {
  RaEls.profileSectionList.innerHTML = sections
    .map(
      (section, index) => `
        <article class="RaProfileSectionItem" data-ra-profile-section="${index}">
          <div class="RaProfileSectionHeader">
            <strong>栏目 ${index + 1}</strong>
            <button class="RaDangerButton" type="button" data-ra-delete-profile-section="${index}">删除</button>
          </div>
          <label class="RaField">
            标题
            <input class="RaProfileSectionTitle" value="${escapeAttr(section.title || "")}" />
          </label>
          <label class="RaField">
            内容
            <textarea class="RaProfileSectionContent" rows="8">${escapeHtml(section.content || "")}</textarea>
          </label>
        </article>
      `,
    )
    .join("");
}

function getProfileSections(profile = {}) {
  if (Array.isArray(profile.sections) && profile.sections.length) {
    return profile.sections
      .map((section) => ({
        title: String(section.title || "").trim(),
        content: String(section.content || "").trim(),
      }))
      .filter((section) => section.title || section.content);
  }

  return [
    { title: "求职意向", content: profile.intent || "" },
    { title: "个人优势", content: listToText(profile.advantages) },
    { title: "核心技能", content: skillsToText(profile.skills) },
    { title: "工作经历", content: experienceToText(profile.workExperience) },
    { title: "项目经历", content: experienceToText(profile.projects) },
    { title: "教育经历", content: experienceToText(profile.education) },
    { title: "个人评价", content: listToText(profile.selfReview) },
  ].filter((section) => section.title || section.content);
}

function collectProfileSections() {
  return [...RaEls.profileSectionList.querySelectorAll(".RaProfileSectionItem")]
    .map((item) => ({
      title: item.querySelector(".RaProfileSectionTitle").value.trim(),
      content: item.querySelector(".RaProfileSectionContent").value.trim(),
    }))
    .filter((section) => section.title || section.content);
}

function addProfileSection() {
  const sections = collectProfileSections();
  sections.push({ title: "", content: "" });
  renderProfileSections(sections);
}

function deleteProfileSection(index) {
  const sections = collectProfileSections();
  sections.splice(index, 1);
  renderProfileSections(sections);
}

function listToText(items) {
  return (Array.isArray(items) ? items : []).join("\n");
}

function skillsToText(groups) {
  return (Array.isArray(groups) ? groups : [])
    .map((group) => [group.name, ...(group.items || []).map((item) => `- ${item}`)].filter(Boolean).join("\n"))
    .join("\n\n");
}

function experienceToText(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) =>
      [
        item.title,
        item.period ? `时间：${item.period}` : "",
        item.meta ? `说明：${item.meta}` : "",
        ...(item.details || []).map((detail) => `- ${detail}`),
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

function selectPost(slug) {
  RaSelectedSlug = slug;
  const post = RaData.posts.find((item) => item.slug === slug) || createEmptyPost();
  RaEls.title.value = post.title;
  RaEls.slug.value = post.slug;
  RaEls.date.value = post.date;
  setEditorTags(post.tags, { syncDocument: false });
  RaEls.visibility.value = normalizePostVisibility(post.visibility);
  RaEls.accessPassword.value = post.accessPassword || "";
  RaEls.summary.value = post.summary;
  RaEls.content.value = post.content;
  RaSelectedAttachments = normalizeAttachments(post.attachments);
  setDocumentMode(post.contentFormat || "markdown");
  renderAttachmentList();
  updateAccessPasswordField();
  renderPostList();
  syncDocumentFromPost();
}

function saveCurrentPost(event) {
  if (event) event.preventDefault();
  const existing = RaData.posts.find((item) => item.slug === RaSelectedSlug);
  const now = new Date().toISOString();
  const post = {
    ...(existing || {}),
    title: RaEls.title.value.trim(),
    slug: slugify(RaEls.slug.value || RaEls.title.value),
    date: RaEls.date.value || new Date().toISOString().slice(0, 10),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    tags: getEditorTags(),
    visibility: normalizePostVisibility(RaEls.visibility.value),
    accessPassword: RaEls.accessPassword.value.trim(),
    summary: RaEls.summary.value.trim(),
    content: RaEls.content.value.trim(),
    contentFormat: RaDocMode,
    readingMinutes: estimateReadingMinutes(RaEls.content.value),
    attachments: normalizeAttachments(RaSelectedAttachments),
  };

  if (!post.title || !post.slug) {
    setStatus("标题和 Slug 必填。");
    return false;
  }
  if (post.visibility === "password" && !post.accessPassword) {
    setStatus("密码可见文章需要填写访问密码。");
    return false;
  }
  if (post.visibility !== "password") {
    post.accessPassword = "";
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
      RaEls.accessPassword.value.trim() ||
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

function saveProfileInfo() {
  try {
    const sections = collectProfileSections();
    RaData.profile = {
      name: RaEls.profileName.value.trim() || "Ralph Rong / Ra",
      headline: RaEls.profileHeadline.value.trim(),
      photoUrl: RaEls.profilePhoto.value.trim(),
      contacts: lines(RaEls.profileContacts.value),
      summary: RaEls.profileSummary.value.trim(),
      sections,
      intent: findSectionContent(sections, "求职") || "",
      advantages: sectionLines(sections, "优势"),
      skills: sectionToSkillGroups(sections, "技能"),
      workExperience: sectionToExperience(sections, "工作"),
      projects: sectionToExperience(sections, "项目"),
      education: sectionToExperience(sections, "教育"),
      selfReview: sectionLines(sections, "评价"),
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

function findSectionContent(sections, keyword) {
  return sections.find((section) => section.title.includes(keyword))?.content || "";
}

function sectionLines(sections, keyword) {
  return lines(findSectionContent(sections, keyword)).map(stripListMarker);
}

function sectionToSkillGroups(sections, keyword) {
  const content = findSectionContent(sections, keyword);
  const blocks = content
    .split(/\n\s*\n/)
    .map((block) => lines(block))
    .filter((block) => block.length);
  return blocks.map((block) => ({
    name: stripListMarker(block[0] || "技能"),
    items: block.slice(1).map(stripListMarker).filter(Boolean),
  }));
}

function sectionToExperience(sections, keyword) {
  const content = findSectionContent(sections, keyword);
  return content
    .split(/\n\s*\n/)
    .map((block) => lines(block))
    .filter((block) => block.length)
    .map((block) => {
      const title = stripListMarker(block[0] || "经历");
      const details = [];
      let period = "";
      let meta = "";

      block.slice(1).forEach((line) => {
        const clean = stripListMarker(line);
        if (clean.startsWith("时间：")) {
          period = clean.slice(3).trim();
        } else if (clean.startsWith("说明：")) {
          meta = clean.slice(3).trim();
        } else if (clean) {
          details.push(clean);
        }
      });

      return { title, period, meta, details };
    });
}

function stripListMarker(value) {
  return String(value || "").replace(/^[-*•]\s*/, "").trim();
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
    renderCodeForm();
    renderToolsForm();
    renderDevLogsForm();
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

  const result = await readJsonResponse(response, "后台 API", { allowEmpty: true }).catch((error) => ({
    ok: false,
    error: error.message,
  }));
  if (!response.ok || result.ok === false) {
    throw new Error(result.error || `后台服务请求失败：${response.status}`);
  }
  return result;
}

async function readJsonResponse(response, label = "接口响应", { allowEmpty = false } = {}) {
  const text = await response.text();
  if (!text.trim()) {
    if (allowEmpty) return {};
    throw new Error(`${label}返回为空，请稍后重试。`);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label}不是有效 JSON，可能仍在发布或被缓存，请稍后重试。`);
  }
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
      const liveData = await readJsonResponse(response, "公开博客数据");
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
  [RaEls.publish, RaEls.publishSite, RaEls.publishProfile, RaEls.publishCode, RaEls.publishTools, RaEls.publishDevLogs, RaEls.syncData, RaEls.docPublish].forEach((button) => {
    if (button) button.disabled = isPublishing;
  });
}

function setTargetStatus(target, message) {
  if (target === "profile") setProfileStatus(message);
  if (target === "site") setSiteStatus(message);
  if (target === "code") setCodeStatus(message);
  if (target === "tools") setToolsStatus(message);
  if (target === "devlogs") setDevLogsStatus(message);
}

function createEmptyPost() {
  const now = new Date().toISOString();
  return {
    title: "",
    slug: "",
    date: new Date().toISOString().slice(0, 10),
    createdAt: now,
    updatedAt: now,
    tags: [],
    summary: "",
    content: "## 背景\n\n在这里写下问题背景。\n\n## 方案\n\n记录你的技术方案与取舍。\n",
    contentFormat: "markdown",
    readingMinutes: 3,
    visibility: "public",
    accessPassword: "",
    attachments: [],
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
        createdAt: post.createdAt || post.date || "",
        updatedAt: post.updatedAt || post.modifiedAt || post.lastModified || post.date || "",
        tags: normalizeTags(Array.isArray(post.tags) ? post.tags : []),
        visibility: normalizePostVisibility(post.visibility),
        accessPassword: post.accessPassword || post.password || "",
        summary: post.summary || "",
        content: post.content || "",
        contentFormat: ["plain", "markdown", "rich"].includes(post.contentFormat) ? post.contentFormat : "markdown",
        readingMinutes: post.readingMinutes || estimateReadingMinutes(post.content || ""),
        attachments: normalizeAttachments(post.attachments),
      })),
    ),
    repositories: normalizeCodeRepositories(input.repositories),
    tools: normalizeCollectionItems(input.tools, "tool"),
    devLogs: normalizeCollectionItems(input.devLogs, "devlog"),
    modules: input.modules || getDefaultModules(),
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
    repositories: [],
    tools: [],
    devLogs: [],
    modules: getDefaultModules(),
    profile: getDefaultProfile(),
  };
}

function getDefaultModules() {
  return {
    settings: { maxTopModules: 6, globalDisplayStyle: "list", moduleDisplayStyles: {} },
    modules: [
      { id: "posts", label: "文章", href: "#posts", enabled: true, order: 10, surface: "top" },
      { id: "code", label: "代码库", href: "#code", enabled: true, order: 20, surface: "top" },
      { id: "tools", label: "工具库", href: "#tools", enabled: true, order: 30, surface: "top" },
      { id: "devlogs", label: "开发日志", href: "#devlogs", enabled: true, order: 40, surface: "top" },
      { id: "profile", label: "个人", href: "#profile", enabled: true, order: 50, surface: "top" },
      { id: "guestbook", label: "留言", href: "#guestbook", enabled: true, order: 60, surface: "top" },
      { id: "modules", label: "设置", href: "#modules", enabled: true, order: 90, surface: "top" },
      { id: "admin", label: "管理", href: "./admin.html", enabled: true, order: 100, surface: "top", external: true },
    ],
  };
}

function normalizeProfile(profile = {}) {
  const fallback = getDefaultProfile();
  return {
    name: profile.name || fallback.name,
    headline: profile.headline || fallback.headline,
    photoUrl: profile.photoUrl || "",
    contacts: Array.isArray(profile.contacts) ? profile.contacts : fallback.contacts,
    intent: profile.intent || fallback.intent,
    summary: profile.summary || fallback.summary,
    advantages: Array.isArray(profile.advantages) ? profile.advantages : fallback.advantages,
    skills: Array.isArray(profile.skills) ? profile.skills : fallback.skills,
    workExperience: Array.isArray(profile.workExperience) ? profile.workExperience : fallback.workExperience,
    projects: Array.isArray(profile.projects) ? profile.projects : fallback.projects,
    education: Array.isArray(profile.education) ? profile.education : fallback.education,
    selfReview: Array.isArray(profile.selfReview) ? profile.selfReview : fallback.selfReview,
    sections: getProfileSections(profile).length ? getProfileSections(profile) : fallback.sections,
  };
}

function getDefaultProfile() {
  return {
    name: "Ralph Rong / Ra",
    headline: "Android 系统工程师｜智能穿戴 / 安卓系统",
    photoUrl: "",
    contacts: ["手机：【待补充】", "邮箱：【待补充】", "城市：【待补充】"],
    intent: "Android 系统工程师 / Android Framework 工程师 / 智能穿戴系统工程师",
    summary: "记录 Android 系统开发、智能穿戴项目、系统调试和版本问题闭环。",
    advantages: [],
    skills: [],
    workExperience: [],
    projects: [],
    education: [],
    selfReview: [],
    sections: [
      { title: "求职意向", content: "Android 系统工程师 / Android Framework 工程师 / 智能穿戴系统工程师" },
      { title: "个人优势", content: "" },
      { title: "核心技能", content: "" },
      { title: "工作经历", content: "" },
      { title: "项目经历", content: "" },
      { title: "教育经历", content: "" },
      { title: "个人评价", content: "" },
    ],
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

function normalizePostVisibility(value) {
  return value === "password" || value === "private" ? "password" : "public";
}

function updateAccessPasswordField() {
  const locked = RaEls.visibility.value === "password";
  RaEls.accessPassword.disabled = !locked;
  RaEls.accessPassword.placeholder = locked ? "密码文章必填，可发布后修改" : "公开文章不需要密码";
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

function setCodeStatus(message) {
  if (RaEls.codeStatus) RaEls.codeStatus.textContent = message;
}

function setToolsStatus(message) {
  if (RaEls.toolsStatus) RaEls.toolsStatus.textContent = message;
}

function setDevLogsStatus(message) {
  if (RaEls.devLogsStatus) RaEls.devLogsStatus.textContent = message;
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
RaEls.tabButtons.forEach((button) => {
  button.addEventListener("click", () => showAdminPanel(button.dataset.raAdminTab));
});
window.addEventListener("hashchange", () => showAdminPanel(getPanelFromHash(), false));
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
RaEls.postSearch.addEventListener("input", () => {
  RaPostSearchQuery = RaEls.postSearch.value;
  renderPostList();
});
RaEls.togglePostList.addEventListener("click", togglePostList);
RaEls.adminPostList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-RaSlug]");
  if (item) selectPost(item.dataset.raslug);
});
RaEls.newPost.addEventListener("click", createNewPost);
RaEls.form.addEventListener("submit", saveCurrentPost);
RaEls.previewPost.addEventListener("click", renderPostPreview);
RaEls.deletePost.addEventListener("click", deleteSelectedPost);
RaEls.tagPicker.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ra-tag-option]");
  if (button) toggleEditorTag(button.dataset.raTagOption);
});
RaEls.clearTags.addEventListener("click", () => setEditorTags([]));
RaEls.textContentFile.addEventListener("change", importTextContent);
RaEls.attachmentFile.addEventListener("change", addAttachments);
RaEls.clearAttachments.addEventListener("click", clearAttachments);
RaEls.attachmentList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ra-delete-attachment]");
  if (button) deleteAttachment(Number(button.dataset.raDeleteAttachment));
});
RaEls.docModeGroup.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ra-doc-mode]");
  if (button) setDocumentMode(button.dataset.raDocMode);
});
RaEls.docContent.addEventListener("input", () => {
  syncPostFromDocument({ showMessage: false });
  refreshDocumentStudio();
});
RaEls.docRichEditor.addEventListener("input", () => {
  saveRichSelection();
  syncPostFromDocument({ showMessage: false });
  renderDocumentPreview();
  setDocStatus("富文本内容已更新。");
});
RaEls.docRichEditor.addEventListener("paste", pasteIntoRichEditor);
RaEls.docRichEditor.addEventListener("click", handleRichEditorClick);
RaEls.docRichEditor.addEventListener("keyup", saveRichSelection);
RaEls.docRichEditor.addEventListener("mouseup", saveRichSelection);
RaEls.docRichEditor.addEventListener("focus", saveRichSelection);
document.addEventListener("selectionchange", () => {
  if (document.activeElement === RaEls.docRichEditor) saveRichSelection();
});
RaEls.docContent.addEventListener("scroll", () => {
  if (RaEls.docLineNumbers) RaEls.docLineNumbers.scrollTop = RaEls.docContent.scrollTop;
});
RaEls.docSyncFromPost.addEventListener("click", () => {
  syncDocumentFromPost();
  flashDocButton(RaEls.docSyncFromPost, "已读取");
  setDocStatus("已读取当前文章的全部信息。");
});
RaEls.docApplyToPost.addEventListener("click", () => {
  syncPostFromDocument();
  flashDocButton(RaEls.docApplyToPost, "已同步");
  if (saveCurrentPost()) setDocStatus("已同步并保存到文章数据。");
});
RaEls.docPublish.addEventListener("click", async () => {
  flashDocButton(RaEls.docPublish, "发布中...");
  setDocStatus("正在保存并发布...");
  syncPostFromDocument({ showMessage: false });
  if (saveCurrentPost()) await publishData("posts");
  flashDocButton(RaEls.docPublish, "已提交");
  setDocStatus("发布请求已提交，请等待部署完成。");
});
[
  RaEls.docTitle,
  RaEls.docSlug,
  RaEls.docDate,
  RaEls.docTags,
  RaEls.docVisibility,
  RaEls.docAccessPassword,
  RaEls.docSummary,
].forEach((input) => {
  input.addEventListener("input", () => {
    syncPostFromDocument({ showMessage: false });
    setDocStatus("文章信息已同步。");
  });
  input.addEventListener("change", () => {
    syncPostFromDocument({ showMessage: false });
    setDocStatus("文章信息已同步。");
  });
});
RaEls.docApplyHeading.addEventListener("click", applyDocumentHeading);
RaEls.docApplyStyle.addEventListener("click", () => applyDocumentStyle("rich"));
RaEls.docBold.addEventListener("click", () => applyDocumentStyle("bold"));
RaEls.docItalic.addEventListener("click", () => applyDocumentStyle("italic"));
RaEls.docUnderline.addEventListener("click", () => applyDocumentStyle("underline"));
RaEls.docHeading.addEventListener("change", () => {
  if (selectedDocumentText()) applyDocumentHeading();
});
RaEls.docFontSize.addEventListener("change", applyDocumentStyleIfSelection);
RaEls.docFontFamily.addEventListener("change", applyDocumentStyleIfSelection);
RaEls.docTextColor.addEventListener("input", applyDocumentStyleIfSelection);
RaEls.docBgColor.addEventListener("input", applyDocumentStyleIfSelection);
RaEls.docLineNumbersToggle.addEventListener("change", updateDocumentChrome);
RaEls.docRulerToggle.addEventListener("change", updateDocumentChrome);
RaEls.docGridToggle.addEventListener("change", updateDocumentChrome);
RaEls.docInsertCode.addEventListener("mousedown", saveRichSelection);
RaEls.docInsertCode.addEventListener("click", insertDocumentCode);
RaEls.docImage.addEventListener("click", saveRichSelection);
RaEls.docImage.addEventListener("change", insertDocumentImage);
RaEls.docAttachment.addEventListener("click", saveRichSelection);
RaEls.docAttachment.addEventListener("change", insertDocumentAttachments);
RaEls.saveSite.addEventListener("click", saveSiteInfo);
RaEls.publishSite.addEventListener("click", publishSiteInfo);
RaEls.saveProfile.addEventListener("click", saveProfileInfo);
RaEls.publishProfile.addEventListener("click", publishProfileInfo);
RaEls.saveCode.addEventListener("click", saveCodeConfig);
RaEls.publishCode.addEventListener("click", publishCodeConfig);
RaEls.saveToolsConfig.addEventListener("click", saveToolsConfig);
RaEls.publishTools.addEventListener("click", publishToolsConfig);
RaEls.newTool.addEventListener("click", newToolItem);
RaEls.saveTool.addEventListener("click", saveToolItem);
RaEls.deleteTool.addEventListener("click", deleteToolItem);
RaEls.toolAttachmentFile.addEventListener("change", addToolAttachments);
RaEls.clearToolAttachments.addEventListener("click", clearToolAttachments);
RaEls.toolAttachmentList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ra-delete-tool-attachment]");
  if (button) deleteToolAttachment(Number(button.dataset.raDeleteToolAttachment));
});
RaEls.toolList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-ra-tool-slug]");
  if (item) selectToolItem(item.dataset.raToolSlug);
});
RaEls.toolTitle.addEventListener("input", () => {
  if (!RaSelectedToolSlug) RaEls.toolSlug.value = slugify(RaEls.toolTitle.value);
});
RaEls.saveDevLogsConfig.addEventListener("click", saveDevLogsConfig);
RaEls.publishDevLogs.addEventListener("click", publishDevLogsConfig);
RaEls.newDevLog.addEventListener("click", newDevLogItem);
RaEls.appendDeployLog.addEventListener("click", appendCurrentDeployLog);
RaEls.saveDevLog.addEventListener("click", saveDevLogItem);
RaEls.deleteDevLog.addEventListener("click", deleteDevLogItem);
RaEls.devLogList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-ra-devlog-slug]");
  if (item) selectDevLogItem(item.dataset.raDevlogSlug);
});
RaEls.devLogTitle.addEventListener("input", () => {
  if (!RaSelectedDevLogSlug) RaEls.devLogSlug.value = slugify(RaEls.devLogTitle.value);
});
RaEls.newCode.addEventListener("click", newCodeItem);
RaEls.codeLanguagePreset.addEventListener("change", () => {
  RaEls.codeLanguage.value = "";
});
RaEls.codeTagPicker.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ra-code-tag-option]");
  if (button) toggleCodeEditorTag(button.dataset.raCodeTagOption);
});
RaEls.codeTags.addEventListener("input", renderCodeTagPicker);
RaEls.codeTags.addEventListener("change", () => setCodeEditorTags(RaEls.codeTags.value));
RaEls.formatCode.addEventListener("click", formatCurrentCodeSnippet);
RaEls.downloadCode.addEventListener("click", downloadCurrentCodeSnippet);
RaEls.saveCodeItem.addEventListener("click", saveCodeItem);
RaEls.deleteCodeItem.addEventListener("click", deleteCodeItem);
RaEls.codeAttachmentFile.addEventListener("change", addCodeAttachments);
RaEls.clearCodeAttachments.addEventListener("click", clearCodeAttachments);
RaEls.codeAttachmentList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ra-delete-code-attachment]");
  if (button) deleteCodeAttachment(Number(button.dataset.raDeleteCodeAttachment));
});
RaEls.codeList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-ra-code-id]");
  if (item) selectCodeItem(item.dataset.raCodeId);
});
RaEls.profilePhoto.addEventListener("input", updateProfilePhotoPreview);
RaEls.profilePhotoFile.addEventListener("change", selectProfilePhoto);
RaEls.clearProfilePhoto.addEventListener("click", clearProfilePhoto);
RaEls.addProfileSection.addEventListener("click", addProfileSection);
RaEls.profileSectionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ra-delete-profile-section]");
  if (!button) return;
  deleteProfileSection(Number(button.dataset.raDeleteProfileSection));
});
RaEls.title.addEventListener("input", () => {
  if (!RaSelectedSlug) RaEls.slug.value = slugify(RaEls.title.value);
  refreshPostPreviewIfOpen();
});
RaEls.date.addEventListener("input", refreshPostPreviewIfOpen);
RaEls.tags.addEventListener("input", () => {
  renderTagPicker();
  refreshPostPreviewIfOpen();
});
RaEls.tags.addEventListener("change", () => setEditorTags(RaEls.tags.value));
RaEls.summary.addEventListener("input", refreshPostPreviewIfOpen);
RaEls.content.addEventListener("input", () => {
  syncDocumentFromPost();
  refreshPostPreviewIfOpen();
});
RaEls.visibility.addEventListener("change", updateAccessPasswordField);
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
