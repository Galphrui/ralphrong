package com.ralph.notes;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

public class CacheStore {
    private static final String PREF = "ra_content_cache";
    private static final String KEY_BLOG_JSON = "blog_json";
    private static final String KEY_BLOG_TIME = "blog_cached_at";
    private static final String KEY_STATS_JSON = "stats_json";
    private static final String KEY_STATS_TIME = "stats_cached_at";

    private final SharedPreferences preferences;

    public CacheStore(Context context) {
        preferences = context.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    public void saveBlog(JSONObject data) {
        if (data == null) return;
        preferences.edit()
                .putString(KEY_BLOG_JSON, data.toString())
                .putLong(KEY_BLOG_TIME, System.currentTimeMillis())
                .apply();
    }

    public JSONObject loadBlog() {
        String raw = preferences.getString(KEY_BLOG_JSON, "");
        if (raw.isEmpty()) return null;
        try {
            return new JSONObject(raw);
        } catch (Exception ignored) {
            return null;
        }
    }

    public long blogCachedAt() {
        return preferences.getLong(KEY_BLOG_TIME, 0L);
    }

    public void saveStats(VisitStats stats) {
        if (stats == null) return;
        try {
            JSONObject json = new JSONObject();
            json.put("visits", stats.visits);
            json.put("visitors", stats.visitors);
            json.put("lastVisitAt", stats.lastVisitAt);
            preferences.edit()
                    .putString(KEY_STATS_JSON, json.toString())
                    .putLong(KEY_STATS_TIME, System.currentTimeMillis())
                    .apply();
        } catch (Exception ignored) {
        }
    }

    public VisitStats loadStats() {
        String raw = preferences.getString(KEY_STATS_JSON, "");
        if (raw.isEmpty()) return null;
        try {
            JSONObject json = new JSONObject(raw);
            VisitStats stats = new VisitStats();
            stats.visits = json.optInt("visits", 0);
            stats.visitors = json.optInt("visitors", 0);
            stats.lastVisitAt = json.optString("lastVisitAt", "");
            stats.fromCache = true;
            stats.sourceMessage = "本地缓存";
            return stats;
        } catch (Exception ignored) {
            return null;
        }
    }

    public long statsCachedAt() {
        return preferences.getLong(KEY_STATS_TIME, 0L);
    }
}
