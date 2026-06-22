const STORAGE_KEY = "tech-blog-admin-settings";
const LOCAL_DATA_KEY = "tech-blog-local-data";

let data = getDefaultData();
let selectedSlug = "";
let remoteSha = "";

const els = {
  owner: document.querySelector("#ownerInput"),
  repo: document.querySelector("#repoInput"),
  branch: document.querySelector("#branchInput"),
  path: document.querySelector("#pathInput"),
  token: document.querySelector("#tokenInput"),
  saveSettings: document.querySelector("#saveSettingsButton"),
  loadRemote: document.querySelector("#loadRemoteButton"),
  download: document.querySelector("#downloadButton"),
  importInput: document.querySelector("#importInput"),
  adminPostList: document.querySelector("#adminPostList"),
  newPost: document.querySelector("#newPostButton"),
  form: document.querySelector("#postForm"),
  title: document.querySelector("#titleInput"),
  slug: document.querySelector("#slugInput"),
  date: document.querySelector("#dateInput"),
  tags: document.querySelector("#tagsInput"),
  summary: document.querySelector("#summaryInput"),
  content: document.querySelector("#contentInput"),
  deletePost: document.querySelector("#deletePostButton"),
  publish: document.querySelector("#publishButton"),
  status: document.querySelector("#statusText"),
  siteTitle: document.querySelector("#siteTitleInput"),
  siteSubtitle: document.querySelector("#siteSubtitleInput"),
  author: document.querySelector("#authorInput"),
  bio: document.querySelector("#bioInput"),
  saveSite: document.querySelector("#saveSiteButton"),
};

init();

async function init() {
  loadSettings();
  await loadInitialData();
  renderSiteForm();
  renderPostList();
  selectPost(data.posts[0]?.slug || "");
}

function loadSettings() {
  const settings = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  els.owner.value = settings.owner || "";
  els.repo.value = settings.repo || "";
  els.branch.value = settings.branch || "main";
  els.path.value = settings.path || "data/posts.json";
  els.token.value = settings.token || "";
}

function saveSettings() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      owner: els.owner.value.trim(),
      repo: els.repo.value.trim(),
      branch: els.branch.value.trim() || "main",
      path: els.path.value.trim() || "data/posts.json",
      token: els.token.value.trim(),
    }),
  );
  setStatus("仓库设置已保存。");
}

async function loadInitialData() {
  const cached = localStorage.getItem(LOCAL_DATA_KEY);
  if (cached) {
    data = normalizeData(JSON.parse(cached));
    return;
  }

  try {
    const response = await fetch(`./data/posts.json?t=${Date.now()}`);
    if (!response.ok) throw new Error("Cannot load local posts");
    data = normalizeData(await response.json());
    saveLocalData();
  } catch (error) {
    data = getDefaultData();
  }
}

function saveLocalData() {
  data.posts = sortPosts(data.posts);
  localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(data, null, 2));
  renderPostList();
}

async function loadRemoteData() {
  try {
    saveSettings();
    const remote = await githubRequest("GET");
    remoteSha = remote.sha;
    data = normalizeData(JSON.parse(fromBase64(remote.content)));
    saveLocalData();
    renderSiteForm();
    selectPost(data.posts[0]?.slug || "");
    setStatus("已从 GitHub 读取最新数据。");
  } catch (error) {
    setStatus(`读取失败：${error.message}`);
  }
}

async function publishData() {
  try {
    saveSettings();
    if (!remoteSha) {
      try {
        const remote = await githubRequest("GET");
        remoteSha = remote.sha;
      } catch (error) {
        remoteSha = "";
      }
    }

    const payload = {
      message: `chore: update blog data ${new Date().toISOString()}`,
      content: toBase64(JSON.stringify(data, null, 2) + "\n"),
      branch: getSettings().branch,
    };
    if (remoteSha) payload.sha = remoteSha;

    const result = await githubRequest("PUT", payload);
    remoteSha = result.content.sha;
    setStatus("发布成功，GitHub Pages 稍后会展示新内容。");
  } catch (error) {
    setStatus(`发布失败：${error.message}`);
  }
}

async function githubRequest(method, body) {
  const settings = getSettings();
  if (!settings.owner || !settings.repo || !settings.token) {
    throw new Error("请填写 owner、repo 和 token");
  }

  const ref = method === "GET" ? `?ref=${encodeURIComponent(settings.branch)}` : "";
  const url = `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${settings.path}${ref}`;
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${settings.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || `GitHub API ${response.status}`);
  }
  return result;
}

function getSettings() {
  return {
    owner: els.owner.value.trim(),
    repo: els.repo.value.trim(),
    branch: els.branch.value.trim() || "main",
    path: els.path.value.trim() || "data/posts.json",
    token: els.token.value.trim(),
  };
}

function renderPostList() {
  els.adminPostList.innerHTML = data.posts
    .map(
      (post) => `
        <div class="admin-item ${post.slug === selectedSlug ? "active" : ""}" data-slug="${escapeAttr(post.slug)}">
          <strong>${escapeHtml(post.title)}</strong>
          <small>${escapeHtml(post.date)} · ${escapeHtml(post.tags.join(", "))}</small>
        </div>
      `,
    )
    .join("");
}

function renderSiteForm() {
  els.siteTitle.value = data.site.title || "";
  els.siteSubtitle.value = data.site.subtitle || "";
  els.author.value = data.site.author?.name || "";
  els.bio.value = data.site.author?.bio || "";
}

function selectPost(slug) {
  selectedSlug = slug;
  const post = data.posts.find((item) => item.slug === slug) || createEmptyPost();
  els.title.value = post.title;
  els.slug.value = post.slug;
  els.date.value = post.date;
  els.tags.value = post.tags.join(", ");
  els.summary.value = post.summary;
  els.content.value = post.content;
  renderPostList();
}

function saveCurrentPost(event) {
  event.preventDefault();
  const post = {
    title: els.title.value.trim(),
    slug: slugify(els.slug.value || els.title.value),
    date: els.date.value || new Date().toISOString().slice(0, 10),
    tags: els.tags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    summary: els.summary.value.trim(),
    content: els.content.value.trim(),
    readingMinutes: estimateReadingMinutes(els.content.value),
  };

  if (!post.title || !post.slug) {
    setStatus("标题和 Slug 必填。");
    return;
  }

  const index = data.posts.findIndex((item) => item.slug === selectedSlug);
  if (index >= 0) {
    data.posts[index] = post;
  } else {
    data.posts.push(post);
  }

  selectedSlug = post.slug;
  saveLocalData();
  selectPost(post.slug);
  setStatus("已保存到浏览器本地数据，点击发布可写回 GitHub。");
}

function deleteSelectedPost() {
  if (!selectedSlug) return;
  const post = data.posts.find((item) => item.slug === selectedSlug);
  if (!post || !confirm(`确认删除《${post.title}》？`)) return;
  data.posts = data.posts.filter((item) => item.slug !== selectedSlug);
  saveLocalData();
  selectPost(data.posts[0]?.slug || "");
  setStatus("文章已从本地数据删除。");
}

function createNewPost() {
  selectedSlug = "";
  selectPost("");
  els.title.focus();
}

function saveSiteInfo() {
  data.site = {
    ...data.site,
    title: els.siteTitle.value.trim() || "Tech Notes",
    subtitle: els.siteSubtitle.value.trim() || "个人技术博客",
    author: {
      ...(data.site.author || {}),
      name: els.author.value.trim() || "作者名",
      bio: els.bio.value.trim(),
      links: data.site.author?.links || [{ label: "GitHub", url: "https://github.com/" }],
    },
  };
  saveLocalData();
  setStatus("站点信息已保存到本地数据。");
}

function exportJson() {
  const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" });
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
    data = normalizeData(JSON.parse(reader.result));
    saveLocalData();
    renderSiteForm();
    selectPost(data.posts[0]?.slug || "");
    setStatus("JSON 已导入本地数据。");
  };
  reader.readAsText(file);
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
      title: input.site?.title || "Tech Notes",
      subtitle: input.site?.subtitle || "个人技术博客",
      author: {
        name: input.site?.author?.name || "作者名",
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
      title: "Tech Notes",
      subtitle: "个人技术博客",
      author: {
        name: "作者名",
        bio: "专注构建可靠、清晰、可维护的软件系统。这里记录从问题到方案的完整思考。",
        links: [{ label: "GitHub", url: "https://github.com/" }],
      },
    },
    posts: [
      {
        title: "用 GitHub Pages 搭建可维护的个人技术博客",
        slug: "github-pages-tech-blog",
        date: "2026-06-22",
        tags: ["GitHub Pages", "前端", "博客"],
        summary: "一个无需传统服务器的博客方案：静态页面负责展示，GitHub 仓库负责持久化数据。",
        content:
          "## 核心思路\n\nGitHub Pages 只托管静态资源，但我们可以把 `data/posts.json` 当成数据源。前台页面读取 JSON 渲染文章，管理后台通过 GitHub API 把更新后的 JSON 提交回仓库。\n\n## 使用流程\n\n- 创建 GitHub 仓库并开启 Pages\n- 创建 fine-grained token，授予该仓库 Contents 读写权限\n- 在管理后台填写仓库信息并读取远程数据\n- 编辑文章后点击发布到 GitHub\n\n## 优点\n\n这个方案没有数据库和服务器运维成本，所有内容都有 Git 提交历史，适合个人博客、项目日志和作品集。",
        readingMinutes: 3,
      },
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

function toBase64(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

function fromBase64(value) {
  return decodeURIComponent(escape(atob(value.replace(/\n/g, ""))));
}

function setStatus(message) {
  els.status.textContent = message;
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

els.saveSettings.addEventListener("click", saveSettings);
els.loadRemote.addEventListener("click", loadRemoteData);
els.publish.addEventListener("click", publishData);
els.download.addEventListener("click", exportJson);
els.importInput.addEventListener("change", importJson);
els.adminPostList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-slug]");
  if (item) selectPost(item.dataset.slug);
});
els.newPost.addEventListener("click", createNewPost);
els.form.addEventListener("submit", saveCurrentPost);
els.deletePost.addEventListener("click", deleteSelectedPost);
els.saveSite.addEventListener("click", saveSiteInfo);
els.title.addEventListener("input", () => {
  if (!selectedSlug) els.slug.value = slugify(els.title.value);
});
