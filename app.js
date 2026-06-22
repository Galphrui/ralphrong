const DATA_PATH = "./data/posts.json";

const state = {
  data: null,
  posts: [],
  query: "",
  tag: "全部",
};

const els = {
  siteTitle: document.querySelector("#siteTitle"),
  siteSubtitle: document.querySelector("#siteSubtitle"),
  postCount: document.querySelector("#postCount"),
  tagCount: document.querySelector("#tagCount"),
  latestDate: document.querySelector("#latestDate"),
  searchInput: document.querySelector("#searchInput"),
  tagFilter: document.querySelector("#tagFilter"),
  postList: document.querySelector("#postList"),
  emptyState: document.querySelector("#emptyState"),
  authorName: document.querySelector("#authorName"),
  authorBio: document.querySelector("#authorBio"),
  profileLinks: document.querySelector("#profileLinks"),
  reader: document.querySelector("#reader"),
  readerMeta: document.querySelector("#readerMeta"),
  readerTitle: document.querySelector("#readerTitle"),
  readerSummary: document.querySelector("#readerSummary"),
  readerBody: document.querySelector("#readerBody"),
  backButton: document.querySelector("#backButton"),
};

async function loadData() {
  try {
    const response = await fetch(`${DATA_PATH}?t=${Date.now()}`);
    if (!response.ok) throw new Error("Cannot load posts");
    state.data = await response.json();
  } catch (error) {
    state.data = getFallbackData();
  }

  state.posts = [...state.data.posts].sort((a, b) => b.date.localeCompare(a.date));
  renderSite();
  renderTags();
  renderPosts();
  openPostFromHash();
}

function renderSite() {
  const { site } = state.data;
  document.title = site.title;
  els.siteTitle.textContent = site.title;
  els.siteSubtitle.textContent = site.subtitle;
  els.authorName.textContent = site.author.name;
  els.authorBio.textContent = site.author.bio;
  els.postCount.textContent = state.posts.length;

  const tags = getAllTags();
  els.tagCount.textContent = tags.length;
  els.latestDate.textContent = state.posts[0]?.date ?? "-";
  els.profileLinks.innerHTML = site.author.links
    .map((link) => `<a href="${escapeAttr(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`)
    .join("");
}

function renderTags() {
  const tags = ["全部", ...getAllTags()];
  els.tagFilter.innerHTML = tags
    .map(
      (tag) =>
        `<button class="tag-chip ${tag === state.tag ? "active" : ""}" type="button" data-tag="${escapeAttr(tag)}">${escapeHtml(tag)}</button>`,
    )
    .join("");
}

function renderPosts() {
  const posts = getFilteredPosts();
  els.postList.innerHTML = posts.map(renderPostCard).join("");
  els.emptyState.hidden = posts.length > 0;
}

function renderPostCard(post) {
  const tags = post.tags.map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join("");
  return `
    <article class="post-card" tabindex="0" data-slug="${escapeAttr(post.slug)}">
      <p class="post-meta">${formatDate(post.date)} · ${post.readingMinutes || 3} 分钟阅读</p>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.summary)}</p>
      <div class="post-tags">${tags}</div>
    </article>
  `;
}

function openPostFromHash() {
  const match = location.hash.match(/^#post\/(.+)$/);
  if (!match) return closeReader();
  const post = state.posts.find((item) => item.slug === decodeURIComponent(match[1]));
  if (post) openPost(post);
}

function openPost(post) {
  els.reader.hidden = false;
  els.readerMeta.textContent = `${formatDate(post.date)} · ${post.tags.join(" / ")}`;
  els.readerTitle.textContent = post.title;
  els.readerSummary.textContent = post.summary;
  els.readerBody.innerHTML = markdownToHtml(post.content);
  els.reader.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeReader() {
  els.reader.hidden = true;
}

function getFilteredPosts() {
  const query = state.query.trim().toLowerCase();
  return state.posts.filter((post) => {
    const inTag = state.tag === "全部" || post.tags.includes(state.tag);
    const haystack = `${post.title} ${post.summary} ${post.tags.join(" ")}`.toLowerCase();
    return inTag && (!query || haystack.includes(query));
  });
}

function getAllTags() {
  return [...new Set(state.posts.flatMap((post) => post.tags))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function markdownToHtml(markdown) {
  const lines = markdown.split("\n");
  const html = [];
  let inCode = false;
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      flushParagraph();
      inCode = !inCode;
      html.push(inCode ? "<pre><code>" : "</code></pre>");
      continue;
    }

    if (inCode) {
      html.push(escapeHtml(line));
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      html.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      flushParagraph();
      html.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      flushParagraph();
      html.push(`<h2>${inlineMarkdown(line.slice(2))}</h2>`);
    } else if (line.startsWith("- ")) {
      flushParagraph();
      html.push(`<p>• ${inlineMarkdown(line.slice(2))}</p>`);
    } else {
      paragraph.push(line.trim());
    }
  }

  flushParagraph();
  return html.join("\n");
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function formatDate(date) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(date));
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

function getFallbackData() {
  return {
    site: {
      title: "Tech Notes",
      subtitle: "个人技术博客",
      author: {
        name: "作者名",
        bio: "专注构建可靠、清晰、可维护的软件系统。",
        links: [{ label: "GitHub", url: "https://github.com/" }],
      },
    },
    posts: [],
  };
}

els.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderPosts();
});

els.tagFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tag]");
  if (!button) return;
  state.tag = button.dataset.tag;
  renderTags();
  renderPosts();
});

els.postList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-slug]");
  if (!card) return;
  location.hash = `post/${encodeURIComponent(card.dataset.slug)}`;
});

els.postList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const card = event.target.closest("[data-slug]");
  if (card) location.hash = `post/${encodeURIComponent(card.dataset.slug)}`;
});

els.backButton.addEventListener("click", () => {
  history.pushState("", document.title, location.pathname + location.search);
  closeReader();
});

window.addEventListener("hashchange", openPostFromHash);
loadData();
