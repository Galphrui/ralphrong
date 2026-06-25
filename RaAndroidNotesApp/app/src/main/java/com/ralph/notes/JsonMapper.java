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

        Collections.sort(data.posts, new Comparator<Post>() {
            @Override
            public int compare(Post left, Post right) {
                return right.date.compareTo(left.date);
            }
        });
        return data;
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
        post.readingMinutes = json.optInt("readingMinutes", 3);
        readStringArray(json.optJSONArray("tags"), post.tags);
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
            json.put("readingMinutes", post.readingMinutes);
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
