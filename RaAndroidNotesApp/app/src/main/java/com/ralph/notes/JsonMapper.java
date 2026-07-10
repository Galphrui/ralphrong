package com.ralph.notes;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public final class JsonMapper {
    private JsonMapper() {
    }

    public static BlogData parseBlog(JSONObject root) {
        BlogData data = new BlogData();
        data.raw = root;

        JSONObject site = root.optJSONObject("site");
        if (site != null) {
            data.title = site.optString("title", data.title);
            data.subtitle = site.optString("subtitle", data.subtitle);
        }

        data.profile = parseProfile(root.optJSONObject("profile"));
        JSONArray posts = root.optJSONArray("posts");
        if (posts != null) {
            for (int i = 0; i < posts.length(); i++) {
                JSONObject item = posts.optJSONObject(i);
                if (item != null) data.posts.add(parsePost(item));
            }
        }
        JSONArray repositories = root.optJSONArray("repositories");
        if (repositories != null) {
            for (int i = 0; i < repositories.length(); i++) {
                JSONObject item = repositories.optJSONObject(i);
                if (item != null) data.repositories.add(parseRepository(item));
            }
        }
        JSONArray tools = root.optJSONArray("tools");
        if (tools != null) {
            for (int i = 0; i < tools.length(); i++) {
                JSONObject item = tools.optJSONObject(i);
                if (item != null) data.tools.add(parsePost(item));
            }
        }
        JSONArray devLogs = root.optJSONArray("devLogs");
        if (devLogs != null) {
            for (int i = 0; i < devLogs.length(); i++) {
                JSONObject item = devLogs.optJSONObject(i);
                if (item != null) data.devLogs.add(parsePost(item));
            }
        }
        parseModules(root.optJSONObject("modules"), data);

        Collections.sort(data.posts, new Comparator<Post>() {
            @Override
            public int compare(Post left, Post right) {
                return safe(right.date).compareTo(safe(left.date));
            }
        });
        sortByDateDesc(data.tools);
        sortByDateDesc(data.devLogs);
        return data;
    }

    public static CodeRepository parseRepository(JSONObject json) {
        CodeRepository repo = new CodeRepository();
        repo.id = json.optString("id", json.optString("slug", ""));
        repo.name = json.optString("name", "未命名代码库");
        repo.description = json.optString("description", "");
        repo.language = json.optString("language", "Code");
        repo.url = json.optString("url", "");
        repo.sourcePath = json.optString("sourcePath", "");
        repo.updatedAt = json.optString("updatedAt", json.optString("date", ""));
        repo.snippet = json.optString("snippet", "");
        repo.notes = json.optString("notes", "");
        readStringArray(json.optJSONArray("tags"), repo.tags);
        readAttachmentArray(json.optJSONArray("attachments"), repo.attachments);
        return repo;
    }

    public static Post parsePost(JSONObject json) {
        Post post = new Post();
        post.title = json.optString("title", "");
        post.slug = json.optString("slug", "");
        post.date = json.optString("date", "");
        post.createdAt = json.optString("createdAt", post.date);
        post.updatedAt = json.optString("updatedAt",
                json.optString("modifiedAt", json.optString("lastModified", post.date)));
        post.summary = json.optString("summary", "");
        post.content = json.optString("content", "");
        post.visibility = normalizeVisibility(json.optString("visibility", "public"));
        post.accessPassword = json.optString("accessPassword", json.optString("password", ""));
        post.readingMinutes = json.optInt("readingMinutes", 3);
        readStringArray(json.optJSONArray("tags"), post.tags);
        readAttachmentArray(json.optJSONArray("attachments"), post.attachments);
        return post;
    }

    public static JSONObject postToJson(Post post) {
        try {
            JSONObject json = new JSONObject();
            json.put("title", post.title);
            json.put("slug", post.slug);
            json.put("date", post.date);
            if (!post.createdAt.isEmpty()) json.put("createdAt", post.createdAt);
            if (!post.updatedAt.isEmpty()) json.put("updatedAt", post.updatedAt);
            JSONArray tags = new JSONArray();
            for (String tag : post.tags) tags.put(tag);
            json.put("tags", tags);
            json.put("summary", post.summary);
            json.put("content", post.content);
            json.put("visibility", normalizeVisibility(post.visibility));
            json.put("accessPassword", "password".equals(normalizeVisibility(post.visibility)) ? post.accessPassword : "");
            json.put("readingMinutes", post.readingMinutes);
            JSONArray attachments = new JSONArray();
            for (PostAttachment attachment : post.attachments) {
                JSONObject item = new JSONObject();
                item.put("id", attachment.id);
                item.put("name", attachment.name);
                item.put("fileName", attachment.fileName);
                item.put("mimeType", attachment.mimeType);
                item.put("size", attachment.size);
                item.put("url", attachment.url);
                item.put("rawUrl", attachment.rawUrl);
                item.put("path", attachment.path);
                item.put("dataUrl", attachment.dataUrl);
                attachments.put(item);
            }
            json.put("attachments", attachments);
            return json;
        } catch (Exception e) {
            throw new IllegalStateException("文章 JSON 生成失败", e);
        }
    }

    public static Profile parseProfile(JSONObject json) {
        Profile profile = new Profile();
        if (json == null) return profile;

        profile.name = json.optString("name", profile.name);
        profile.headline = json.optString("headline", "");
        profile.summary = json.optString("summary", "");
        profile.intent = json.optString("intent", "");
        profile.photoUrl = json.optString("photoUrl", "");
        readStringArray(json.optJSONArray("contacts"), profile.contacts);
        readStringArray(json.optJSONArray("advantages"), profile.advantages);
        readStringArray(json.optJSONArray("selfReview"), profile.selfReview);

        JSONArray skills = json.optJSONArray("skills");
        if (skills != null) {
            for (int i = 0; i < skills.length(); i++) {
                JSONObject item = skills.optJSONObject(i);
                if (item == null) continue;
                SkillGroup group = new SkillGroup();
                group.name = item.optString("name", "");
                readStringArray(item.optJSONArray("items"), group.items);
                profile.skills.add(group);
            }
        }

        readExperienceArray(json.optJSONArray("workExperience"), profile.workExperience);
        readExperienceArray(json.optJSONArray("projects"), profile.projects);
        readExperienceArray(json.optJSONArray("education"), profile.education);

        JSONArray sections = json.optJSONArray("sections");
        if (sections != null) {
            for (int i = 0; i < sections.length(); i++) {
                JSONObject item = sections.optJSONObject(i);
                if (item == null) continue;
                ResumeSection section = new ResumeSection();
                section.title = item.optString("title", "");
                section.content = item.optString("content", "");
                profile.sections.add(section);
            }
        }
        return profile;
    }

    public static void updateProfileSummary(JSONObject root, String name, String headline, String summary, List<String> contacts) {
        try {
            JSONObject profile = root.optJSONObject("profile");
            if (profile == null) {
                profile = new JSONObject();
                root.put("profile", profile);
            }
            profile.put("name", name);
            profile.put("headline", headline);
            profile.put("summary", summary);
            JSONArray contactArray = new JSONArray();
            for (String contact : contacts) {
                if (!contact.trim().isEmpty()) contactArray.put(contact.trim());
            }
            profile.put("contacts", contactArray);
        } catch (Exception e) {
            throw new IllegalStateException("简历 JSON 更新失败", e);
        }
    }

    private static void readStringArray(JSONArray array, List<String> out) {
        if (array == null) return;
        for (int i = 0; i < array.length(); i++) {
            String value = array.optString(i, "").trim();
            if (!value.isEmpty()) out.add(value);
        }
    }

    private static void readAttachmentArray(JSONArray array, List<PostAttachment> out) {
        if (array == null) return;
        for (int i = 0; i < array.length(); i++) {
            JSONObject item = array.optJSONObject(i);
            if (item == null) continue;
            PostAttachment attachment = new PostAttachment();
            attachment.id = item.optString("id", "");
            attachment.name = item.optString("name", item.optString("fileName", "附件"));
            attachment.fileName = item.optString("fileName", attachment.name);
            attachment.mimeType = item.optString("mimeType", "application/octet-stream");
            attachment.size = item.optInt("size", 0);
            attachment.url = item.optString("url", "");
            attachment.rawUrl = item.optString("rawUrl", "");
            attachment.path = item.optString("path", "");
            attachment.dataUrl = item.optString("dataUrl", "");
            if (!attachment.url.isEmpty() || !attachment.rawUrl.isEmpty() || !attachment.dataUrl.isEmpty()) out.add(attachment);
        }
    }

    private static void parseModules(JSONObject modulesRoot, BlogData data) {
        if (modulesRoot == null) {
            addDefaultModules(data);
            return;
        }
        JSONObject settings = modulesRoot.optJSONObject("settings");
        if (settings != null) {
            data.maxTopModules = Math.max(1, settings.optInt("maxTopModules", data.maxTopModules));
            data.globalDisplayStyle = settings.optString("globalDisplayStyle", data.globalDisplayStyle);
        }
        JSONArray modules = modulesRoot.optJSONArray("modules");
        if (modules != null) {
            for (int i = 0; i < modules.length(); i++) {
                JSONObject item = modules.optJSONObject(i);
                if (item == null) continue;
                ModuleEntry entry = new ModuleEntry();
                entry.id = item.optString("id", "");
                entry.label = item.optString("label", entry.id);
                entry.href = item.optString("href", "");
                entry.enabled = item.optBoolean("enabled", true);
                entry.order = item.optInt("order", i * 10);
                entry.surface = item.optString("surface", "top");
                entry.displayStyle = item.optString("displayStyle", data.globalDisplayStyle);
                entry.external = item.optBoolean("external", false);
                if (!entry.id.isEmpty()) data.modules.add(entry);
            }
        }
        Collections.sort(data.modules, new Comparator<ModuleEntry>() {
            @Override
            public int compare(ModuleEntry left, ModuleEntry right) {
                return Integer.compare(left.order, right.order);
            }
        });
        if (data.modules.isEmpty()) addDefaultModules(data);
    }

    private static void addDefaultModules(BlogData data) {
        addModule(data, "posts", "文章", 10);
        addModule(data, "code", "代码库", 20);
        addModule(data, "tools", "工具库", 30);
        addModule(data, "devlogs", "开发日志", 40);
        addModule(data, "profile", "个人", 50);
        addModule(data, "guestbook", "留言", 60);
        addModule(data, "admin", "管理", 100);
    }

    private static void addModule(BlogData data, String id, String label, int order) {
        ModuleEntry entry = new ModuleEntry();
        entry.id = id;
        entry.label = label;
        entry.order = order;
        data.modules.add(entry);
    }

    private static void sortByDateDesc(List<Post> posts) {
        Collections.sort(posts, new Comparator<Post>() {
            @Override
            public int compare(Post left, Post right) {
                return safe(right.date).compareTo(safe(left.date));
            }
        });
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }

    private static String normalizeVisibility(String value) {
        return "password".equals(value) || "private".equals(value) ? "password" : "public";
    }

    private static void readExperienceArray(JSONArray array, List<ExperienceItem> out) {
        if (array == null) return;
        for (int i = 0; i < array.length(); i++) {
            JSONObject item = array.optJSONObject(i);
            if (item == null) continue;
            ExperienceItem experience = new ExperienceItem();
            experience.title = item.optString("title", "");
            experience.period = item.optString("period", "");
            experience.meta = item.optString("meta", "");
            readStringArray(item.optJSONArray("details"), experience.details);
            out.add(experience);
        }
    }
}
