import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const DEFAULT_TAG = "Android开发记录";
const today = new Date().toISOString().slice(0, 10);

const sourceDir = process.argv[2];
if (!sourceDir) {
  console.error("Usage: node scripts/import-md-posts.mjs <markdown-directory>");
  process.exit(1);
}

const postsPath = join(process.cwd(), "data", "posts.json");
const data = JSON.parse(await readFile(postsPath, "utf8"));
const entries = await readdir(sourceDir, { withFileTypes: true });
const files = entries
  .filter((entry) => entry.isFile() && /\.(md|markdown)$/i.test(entry.name))
  .map((entry) => join(sourceDir, entry.name))
  .sort((left, right) => basename(left).localeCompare(basename(right), "zh-CN", { numeric: true }));

const postsBySlug = new Map((data.posts || []).map((post) => [post.slug, post]));
let imported = 0;
let updated = 0;

for (const filePath of files) {
  const fileName = basename(filePath);
  const content = normalizeMarkdown(await readFile(filePath, "utf8"));
  if (!content.trim()) continue;

  const title = extractMarkdownTitle(content, fileName);
  const baseSlug = slugify(title || fileName.replace(/\.[^.]+$/, ""));
  const slug = uniqueSlug(baseSlug, postsBySlug);
  const existing = postsBySlug.get(baseSlug) || postsBySlug.get(slug);
  const now = new Date().toISOString();
  const post = {
    ...(existing || {}),
    title,
    slug: existing?.slug || slug,
    date: existing?.date || today,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    tags: normalizeTags([...(existing?.tags || []), DEFAULT_TAG]),
    visibility: existing?.visibility || "public",
    accessPassword: existing?.visibility === "password" ? existing.accessPassword || "" : "",
    summary: existing?.summary || extractMarkdownSummary(content, title),
    content,
    contentFormat: "markdown",
    readingMinutes: estimateReadingMinutes(content),
    attachments: existing?.attachments || [],
  };

  postsBySlug.set(post.slug, post);
  if (existing) updated += 1;
  else imported += 1;
}

data.posts = [...postsBySlug.values()].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
await writeFile(postsPath, `${JSON.stringify(data, null, 2)}\n`);

console.log(`Imported ${imported} markdown posts, updated ${updated}, total ${data.posts.length}.`);

function normalizeMarkdown(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

function extractMarkdownTitle(content, fileName) {
  const heading = content.match(/^\s*#\s+(.+?)\s*$/m)?.[1];
  return cleanTitle(heading || fileName.replace(/\.[^.]+$/, ""));
}

function cleanTitle(value) {
  return String(value || "")
    .replace(/^\d+[_-]/, "")
    .replace(/^[#\s]+/, "")
    .replace(/[｜|]\s*$/, "")
    .trim();
}

function extractMarkdownSummary(content, title) {
  const withoutTitle = String(content || "").replace(/^\s*#\s+.+?\s*$/m, "");
  const paragraph = withoutTitle
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .find((item) => item && !item.startsWith("#") && !item.startsWith("```") && !item.startsWith("|"));
  return plainText(paragraph || title).slice(0, 160);
}

function plainText(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_>#\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "post";
}

function uniqueSlug(baseSlug, postsBySlug) {
  if (!postsBySlug.has(baseSlug)) return baseSlug;
  let index = 2;
  while (postsBySlug.has(`${baseSlug}-${index}`)) index += 1;
  return `${baseSlug}-${index}`;
}

function normalizeTags(tags) {
  const seen = new Set();
  const normalized = [];
  for (const tag of tags || []) {
    const clean = String(tag || "").trim().replace(/\s+/g, " ");
    const key = clean.toLocaleLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    normalized.push(clean);
  }
  return normalized;
}

function estimateReadingMinutes(content) {
  const length = String(content || "").replace(/\s/g, "").length;
  return Math.max(1, Math.ceil(length / 500));
}
