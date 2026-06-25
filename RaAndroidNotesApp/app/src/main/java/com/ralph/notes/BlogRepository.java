package com.ralph.notes;

import android.content.Context;

import org.json.JSONObject;
import org.json.JSONArray;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.net.URLEncoder;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class BlogRepository {
    public static final String PUBLIC_DATA_URL = "https://galphrui.github.io/ralphrong/data/posts.json";
    public static final String WORKER_BASE_URL = "https://ralphrong-blog-admin.ralphrong.workers.dev";

    private final Context context;
    private final CacheStore cacheStore;

    public BlogRepository(Context context) {
        this.context = context.getApplicationContext();
        this.cacheStore = new CacheStore(this.context);
    }

    public BlogData fetchPublicData() throws Exception {
        JSONObject json;
        BlogData data;
        try {
            String body = request("GET", PUBLIC_DATA_URL + "?t=" + System.currentTimeMillis(), null, null);
            json = new JSONObject(body);
            cacheStore.saveBlog(json);
            data = JsonMapper.parseBlog(json);
            data.offlineMode = false;
            data.fromCache = false;
            data.sourceMessage = "公网数据";
        } catch (Exception error) {
            json = cacheStore.loadBlog();
            if (json != null) {
                data = JsonMapper.parseBlog(json);
                data.offlineMode = true;
                data.fromCache = true;
                data.sourceMessage = "本地缓存";
            } else {
                String body = readAll(context.getAssets().open("offline-posts.json"));
                data = JsonMapper.parseBlog(new JSONObject(body));
                data.offlineMode = true;
                data.fromCache = false;
                data.sourceMessage = "内置离线数据";
            }
        }
        return data;
    }

    public VisitStats recordVisit(String visitorId) throws Exception {
        try {
            JSONObject body = new JSONObject();
            body.put("visitorId", visitorId);
            JSONObject response = new JSONObject(request("POST", WORKER_BASE_URL + "/api/visits", body, null));
            VisitStats stats = statsFromResponse(response);
            stats.fromCache = false;
            stats.sourceMessage = "公网统计";
            cacheStore.saveStats(stats);
            return stats;
        } catch (Exception error) {
            VisitStats cached = cacheStore.loadStats();
            if (cached != null) return cached;
            throw error;
        }
    }

    public VisitStats fetchVisitStats() throws Exception {
        try {
            JSONObject response = new JSONObject(request("GET", WORKER_BASE_URL + "/api/visits", null, null));
            VisitStats stats = statsFromResponse(response);
            stats.fromCache = false;
            stats.sourceMessage = "公网统计";
            cacheStore.saveStats(stats);
            return stats;
        } catch (Exception error) {
            VisitStats cached = cacheStore.loadStats();
            if (cached != null) return cached;
            throw error;
        }
    }

    public List<GuestMessage> fetchMessages() throws Exception {
        return fetchMessages("");
    }

    public List<GuestMessage> fetchMessages(String postSlug) throws Exception {
        String suffix = postSlug == null || postSlug.isEmpty() ? "" : "?postSlug=" + URLEncoder.encode(postSlug, "UTF-8");
        JSONObject response = new JSONObject(request("GET", WORKER_BASE_URL + "/api/messages" + suffix, null, null));
        if (!response.optBoolean("ok")) throw new IllegalStateException(response.optString("error", "读取留言失败"));
        return messagesFromResponse(response);
    }

    public List<GuestMessage> createMessage(String name, String message) throws Exception {
        return createMessage(name, message, "");
    }

    public List<GuestMessage> createMessage(String name, String message, String postSlug) throws Exception {
        JSONObject body = new JSONObject();
        body.put("name", name);
        body.put("message", message);
        body.put("postSlug", postSlug == null ? "" : postSlug);
        JSONObject response = new JSONObject(request("POST", WORKER_BASE_URL + "/api/messages", body, null));
        if (!response.optBoolean("ok")) throw new IllegalStateException(response.optString("error", "留言发布失败"));
        return messagesFromResponse(response);
    }

    public Map<String, PostMetric> fetchPostMetrics() throws Exception {
        JSONObject response = new JSONObject(request("GET", WORKER_BASE_URL + "/api/post-metrics", null, null));
        if (!response.optBoolean("ok")) throw new IllegalStateException(response.optString("error", "读取文章指标失败"));
        return metricsFromResponse(response);
    }

    public Map<String, PostMetric> recordPostView(String slug) throws Exception {
        JSONObject body = new JSONObject();
        body.put("slug", slug);
        JSONObject response = new JSONObject(request("POST", WORKER_BASE_URL + "/api/post-view", body, null));
        if (!response.optBoolean("ok")) throw new IllegalStateException(response.optString("error", "点击记录失败"));
        return metricsFromResponse(response);
    }

    public Map<String, PostMetric> likePost(String slug, String visitorId) throws Exception {
        JSONObject body = new JSONObject();
        body.put("slug", slug);
        body.put("visitorId", visitorId);
        JSONObject response = new JSONObject(request("POST", WORKER_BASE_URL + "/api/post-like", body, null));
        if (!response.optBoolean("ok")) throw new IllegalStateException(response.optString("error", "点赞失败"));
        return metricsFromResponse(response);
    }

    public void saveBlogCache(JSONObject data) {
        cacheStore.saveBlog(data);
    }

    private VisitStats statsFromResponse(JSONObject response) {
        JSONObject data = response.optJSONObject("data");
        VisitStats stats = new VisitStats();
        if (data != null) {
            stats.visits = data.optInt("visits", 0);
            stats.visitors = data.optInt("visitors", 0);
            stats.lastVisitAt = data.optString("lastVisitAt", "");
        }
        return stats;
    }

    private List<GuestMessage> messagesFromResponse(JSONObject response) {
        List<GuestMessage> messages = new ArrayList<>();
        JSONArray array = response.optJSONArray("data");
        if (array == null) return messages;
        for (int i = 0; i < array.length(); i++) {
            JSONObject item = array.optJSONObject(i);
            if (item == null) continue;
            GuestMessage message = new GuestMessage();
            message.id = item.optString("id", "");
            message.name = item.optString("name", "陌生朋友");
            message.message = item.optString("message", "");
            message.createdAt = item.optString("createdAt", "");
            messages.add(message);
        }
        return messages;
    }

    private Map<String, PostMetric> metricsFromResponse(JSONObject response) {
        Map<String, PostMetric> metrics = new HashMap<>();
        JSONObject data = response.optJSONObject("data");
        if (data == null) return metrics;
        JSONArray names = data.names();
        if (names == null) return metrics;
        for (int i = 0; i < names.length(); i++) {
            String slug = names.optString(i, "");
            JSONObject item = data.optJSONObject(slug);
            if (slug.isEmpty() || item == null) continue;
            PostMetric metric = new PostMetric();
            metric.views = item.optInt("views", 0);
            metric.likes = item.optInt("likes", 0);
            metrics.put(slug, metric);
        }
        return metrics;
    }

    public AdminSession login(String username, String password) throws Exception {
        JSONObject body = new JSONObject();
        body.put("username", username);
        body.put("password", password);
        JSONObject response = new JSONObject(request("POST", WORKER_BASE_URL + "/api/login", body, null));
        if (!response.optBoolean("ok")) throw new IllegalStateException(response.optString("error", "登录失败"));
        AdminSession session = new AdminSession();
        session.user = response.optString("user", username);
        session.token = response.optString("sessionToken", "");
        return session;
    }

    public BlogData fetchAdminData(String token) throws Exception {
        JSONObject response = new JSONObject(request("GET", WORKER_BASE_URL + "/api/posts", null, token));
        if (!response.optBoolean("ok")) throw new IllegalStateException(response.optString("error", "读取后台数据失败"));
        return JsonMapper.parseBlog(response.getJSONObject("data"));
    }

    public DeployResult publish(String token, JSONObject data) throws Exception {
        JSONObject body = new JSONObject();
        body.put("data", data);
        JSONObject response = new JSONObject(request("PUT", WORKER_BASE_URL + "/api/posts", body, token));
        if (!response.optBoolean("ok")) throw new IllegalStateException(response.optString("error", "发布失败"));
        JSONObject deploy = response.optJSONObject("deploy");
        DeployResult result = new DeployResult();
        if (deploy != null) {
            result.commitSha = deploy.optString("commitSha", "");
            result.workflowTriggered = deploy.optBoolean("workflowTriggered", false);
            result.workflowError = deploy.optString("workflowError", "");
            result.message = deploy.optString("message", "");
        }
        return result;
    }

    private String request(String method, String url, JSONObject body, String bearerToken) throws Exception {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setRequestMethod(method);
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(12000);
            connection.setRequestProperty("Accept", "application/json");
            if (bearerToken != null && !bearerToken.isEmpty()) {
                connection.setRequestProperty("Authorization", "Bearer " + bearerToken);
            }
            if (body != null) {
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                OutputStream output = connection.getOutputStream();
                BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(output, StandardCharsets.UTF_8));
                writer.write(body.toString());
                writer.flush();
                writer.close();
            }

            int code = connection.getResponseCode();
            InputStream stream = code >= 200 && code < 300 ? connection.getInputStream() : connection.getErrorStream();
            String response = readAll(stream);
            if (code < 200 || code >= 300) {
                String message = response;
                try {
                    message = new JSONObject(response).optString("error", response);
                } catch (Exception ignored) {
                }
                throw new IllegalStateException(message);
            }
            return response;
        } catch (SocketTimeoutException | ConnectException | UnknownHostException error) {
            throw new IllegalStateException("无法连接后台 API，请确认当前网络能访问 Cloudflare Worker：" + baseOf(url), error);
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private String baseOf(String url) {
        try {
            URL parsed = new URL(url);
            return parsed.getProtocol() + "://" + parsed.getHost();
        } catch (Exception ignored) {
            return url;
        }
    }

    private String readAll(InputStream stream) throws Exception {
        if (stream == null) return "";
        BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8));
        StringBuilder builder = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            builder.append(line).append('\n');
        }
        reader.close();
        return builder.toString();
    }
}
