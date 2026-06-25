package com.ralph.notes;

import android.app.Activity;
import android.os.Build;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowInsets;
import android.view.inputmethod.InputMethodManager;
import android.content.Context;
import android.widget.Button;
import android.widget.EditText;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.Collator;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final int BG = Color.rgb(246, 251, 248);
    private static final int PANEL = Color.WHITE;
    private static final int PRIMARY = Color.rgb(7, 95, 81);
    private static final int PRIMARY_LIGHT = Color.rgb(233, 251, 246);
    private static final int ACCENT = Color.rgb(245, 158, 11);
    private static final int TEXT = Color.rgb(2, 6, 23);
    private static final int MUTED = Color.rgb(100, 116, 139);
    private static final int LINE = Color.rgb(216, 228, 224);

    private BlogRepository repository;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private View root;
    private LinearLayout content;
    private ScrollView pageScroll;
    private View refreshIndicator;
    private TextView refreshStatus;
    private TextView floatingSortButton;
    private LinearLayout floatingSortPanel;
    private TextView navArticles;
    private TextView navProfile;
    private TextView navStats;
    private TextView navAdmin;
    private LinearLayout homePostList;
    private LinearLayout homeTagsRow;
    private TextView homeListTitle;
    private TextView adminStatus;
    private LinearLayout adminEditorContainer;
    private BlogData data;
    private BlogData adminData;
    private VisitStats visitStats;
    private AdminSession adminSession;
    private LocalCredentialStore localCredentials;
    private DeviceIdStore deviceIdStore;
    private boolean backendAvailable = true;
    private boolean refreshing;
    private boolean pullTracking;
    private boolean sortPanelOpen;
    private float pullStartY;
    private String selectedTag = "全部";
    private String searchQuery = "";
    private String sortMode = "date-desc";
    private String currentPage = "home";
    private String currentDetailSlug = "";
    private Post selectedAdminPost;
    private String selectedAdminSlug = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        repository = new BlogRepository(this);
        localCredentials = new LocalCredentialStore(this);
        deviceIdStore = new DeviceIdStore(this);
        buildShell();
        loadPublicData();
    }

    @Override
    protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }

    private void buildShell() {
        configureSystemBars();
        setContentView(R.layout.activity_main);
        root = findViewById(R.id.app_root);
        content = findViewById(R.id.content_container);
        pageScroll = findViewById(R.id.page_scroll);
        refreshIndicator = findViewById(R.id.refresh_indicator);
        refreshStatus = findViewById(R.id.refresh_status);
        floatingSortButton = findViewById(R.id.floating_sort_button);
        floatingSortPanel = findViewById(R.id.floating_sort_panel);
        navArticles = findViewById(R.id.nav_articles);
        navProfile = findViewById(R.id.nav_profile);
        navStats = findViewById(R.id.nav_stats);
        navAdmin = findViewById(R.id.nav_admin);

        findViewById(R.id.brand_area).setOnClickListener(v -> renderHome());
        navArticles.setOnClickListener(v -> renderHome());
        navProfile.setOnClickListener(v -> renderProfile());
        navStats.setOnClickListener(v -> renderStats());
        navAdmin.setOnClickListener(v -> renderAdmin());
        floatingSortButton.setOnClickListener(v -> {
            sortPanelOpen = !sortPanelOpen;
            updateFloatingSort();
        });
        applySystemBarInsets();
        installPullRefresh();
        bindFloatingSortControls();
        selectTab(navArticles);
        updateNavigation();
    }

    private void configureSystemBars() {
        getWindow().setStatusBarColor(PANEL);
        getWindow().setNavigationBarColor(BG);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }
    }

    private void applySystemBarInsets() {
        View topBar = findViewById(R.id.top_bar);
        int baseLeft = topBar.getPaddingLeft();
        int baseTop = topBar.getPaddingTop();
        int baseRight = topBar.getPaddingRight();
        int baseBottom = topBar.getPaddingBottom();
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int topInset = insets.getSystemWindowInsetTop();
            topBar.setPadding(baseLeft, baseTop + topInset, baseRight, baseBottom);
            return insets;
        });
        root.requestApplyInsets();
    }

    private void loadPublicData() {
        loadPublicData(false);
    }

    private void loadPublicData(boolean manualRefresh) {
        if (refreshing) return;
        refreshing = manualRefresh;
        if (manualRefresh) {
            setRefreshIndicator("正在刷新 Ra 数据...", true);
        } else {
            showLoading("正在加载 Ra 博客数据...");
        }
        String targetPage = currentPage;
        String targetSlug = currentDetailSlug;
        runAsync(() -> repository.fetchPublicData(), result -> {
            data = result;
            backendAvailable = !data.offlineMode;
            updateNavigation();
            if (manualRefresh) finishRefresh(data.offlineMode ? "已切换到离线缓存。" : "刷新完成。");
            renderAfterDataRefresh(manualRefresh, targetPage, targetSlug);
            if (backendAvailable) recordVisit();
        }, error -> {
            if (manualRefresh) finishRefresh("刷新失败：" + error.getMessage());
            else toast(error.getMessage());
        });
    }

    private void installPullRefresh() {
        int triggerDistance = dp(76);
        pageScroll.setOnTouchListener((view, event) -> {
            if (refreshing) return false;
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    pullTracking = pageScroll.getScrollY() == 0;
                    pullStartY = event.getY();
                    break;
                case MotionEvent.ACTION_MOVE:
                    if (pullTracking && pageScroll.getScrollY() == 0) {
                        float distance = event.getY() - pullStartY;
                        if (distance > dp(14)) {
                            setRefreshIndicator(distance >= triggerDistance ? "松开刷新 Ra 数据" : "下拉刷新 Ra 数据", true);
                        }
                    }
                    break;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    if (pullTracking) {
                        float distance = event.getY() - pullStartY;
                        pullTracking = false;
                        if (distance >= triggerDistance) {
                            loadPublicData(true);
                        } else if (!refreshing) {
                            setRefreshIndicator("", false);
                        }
                    }
                    break;
                default:
                    break;
            }
            return false;
        });
    }

    private void setRefreshIndicator(String message, boolean visible) {
        if (refreshIndicator == null) return;
        if (refreshStatus != null) refreshStatus.setText(message == null ? "" : message);
        refreshIndicator.setContentDescription(message == null ? "" : message);
        refreshIndicator.setVisibility(visible ? View.VISIBLE : View.GONE);
    }

    private void finishRefresh(String message) {
        refreshing = false;
        setRefreshIndicator(message, true);
        mainHandler.postDelayed(() -> setRefreshIndicator("", false), 900);
    }

    private void renderAfterDataRefresh(boolean manualRefresh, String targetPage, String targetSlug) {
        if (!manualRefresh) {
            renderHome();
            return;
        }
        if ("profile".equals(targetPage)) {
            renderProfile();
        } else if ("detail".equals(targetPage)) {
            Post post = findPost(targetSlug);
            if (post == null) renderHome();
            else renderPostDetail(post);
        } else if ("stats".equals(targetPage) && backendAvailable && !data.offlineMode) {
            renderStats();
        } else if ("admin".equals(targetPage) && backendAvailable && !data.offlineMode) {
            renderAdmin();
        } else {
            renderHome();
        }
    }

    private Post findPost(String slug) {
        if (data == null || slug == null || slug.isEmpty()) return null;
        for (Post post : data.posts) {
            if (slug.equals(post.slug)) return post;
        }
        return null;
    }

    private void recordVisit() {
        runAsyncQuiet(() -> repository.recordVisit(deviceIdStore.visitorId()), result -> {
            backendAvailable = true;
            visitStats = result;
            updateNavigation();
            updateHomeSourceHint();
            if (navStats == null || navStats.getVisibility() != View.VISIBLE) return;
            if (content.findViewById(R.id.stats_visits) != null) renderStats();
        }, error -> {
            backendAvailable = false;
            updateNavigation();
            updateHomeSourceHint();
            if ("stats".equals(currentPage) || "admin".equals(currentPage)) renderHome();
        });
    }

    private void renderHome() {
        currentPage = "home";
        currentDetailSlug = "";
        selectTab(navArticles);
        clear();
        if (data == null) {
            showLoading("正在加载文章...");
            return;
        }

        View page = inflatePage(R.layout.page_home);
        content.addView(page);

        setText(page, R.id.home_stat_articles, data.posts.size() + "\n文章");
        setText(page, R.id.home_stat_tags, allTags().size() + "\n标签");
        setText(page, R.id.home_stat_latest, (data.posts.isEmpty() ? "-" : data.posts.get(0).date) + "\n最近");
        setText(page, R.id.home_data_source, homeSourceText());

        EditText search = page.findViewById(R.id.home_search);
        search.setText(searchQuery);
        search.addTextChangedListener(new SimpleWatcher() {
            @Override
            public void afterTextChanged(Editable s) {
                searchQuery = s.toString();
                renderPostListOnly();
            }
        });
        homeTagsRow = page.findViewById(R.id.home_tags_row);
        homePostList = page.findViewById(R.id.home_post_list);
        homeListTitle = page.findViewById(R.id.home_list_title);
        renderTags();
        renderPostListOnly();
        updateFloatingSort();
    }

    private void bindFloatingSortControls() {
        bindSort(findViewById(R.id.sort_overlay_date_desc), "date-desc");
        bindSort(findViewById(R.id.sort_overlay_date_asc), "date-asc");
        bindSort(findViewById(R.id.sort_overlay_title_asc), "title-asc");
        bindSort(findViewById(R.id.sort_overlay_title_desc), "title-desc");
        bindSort(findViewById(R.id.sort_overlay_updated_desc), "updated-desc");
    }

    private void bindSort(TextView view, String mode) {
        if (view == null) return;
        boolean selected = sortMode.equals(mode);
        view.setTextColor(selected ? Color.WHITE : PRIMARY);
        view.setBackgroundResource(selected ? R.drawable.bg_button_primary : R.drawable.bg_button_secondary);
        view.setOnClickListener(v -> {
            sortMode = mode;
            sortPanelOpen = false;
            renderHome();
        });
    }

    private void updateFloatingSort() {
        boolean show = "home".equals(currentPage) && data != null;
        if (floatingSortButton != null) {
            floatingSortButton.setVisibility(show ? View.VISIBLE : View.GONE);
            floatingSortButton.setText("排序 · " + sortLabel());
        }
        if (floatingSortPanel != null) {
            floatingSortPanel.setVisibility(show && sortPanelOpen ? View.VISIBLE : View.GONE);
        }
        bindFloatingSortControls();
    }

    private void renderTags() {
        if (homeTagsRow == null) return;
        homeTagsRow.removeAllViews();
        homeTagsRow.addView(chip("全部", "全部".equals(selectedTag), v -> {
            selectedTag = "全部";
            renderHome();
        }));
        for (String tag : allTags()) {
            homeTagsRow.addView(chip(tag, tag.equals(selectedTag), v -> {
                selectedTag = ((TextView) v).getText().toString();
                renderHome();
            }));
        }
    }

    private void renderPostListOnly() {
        if (homePostList == null) return;
        homePostList.removeAllViews();

        List<Post> filtered = filteredPosts();
        if (homeListTitle != null) homeListTitle.setText("文章列表 · " + filtered.size() + " 篇 · " + sortLabel());
        if (filtered.isEmpty()) {
            homePostList.addView(paragraph("没有匹配的文章。"));
            return;
        }
        for (Post post : filtered) {
            View item = LayoutInflater.from(this).inflate(R.layout.view_post_item, homePostList, false);
            item.setOnClickListener(v -> renderPostDetail(post));
            String updatedAt = postUpdatedAt(post);
            String meta = post.date + " · " + post.readingMinutes + " 分钟阅读";
            if (!updatedAt.isEmpty() && !updatedAt.startsWith(post.date)) meta += " · 修改 " + updatedAt.substring(0, Math.min(10, updatedAt.length()));
            ((TextView) item.findViewById(R.id.post_meta)).setText(meta);
            ((TextView) item.findViewById(R.id.post_title)).setText(post.title);
            ((TextView) item.findViewById(R.id.post_summary)).setText(post.summary);
            ((TextView) item.findViewById(R.id.post_tags)).setText(TextTools.join(post.tags, "  "));
            item.setLayoutParams(margins(new LinearLayout.LayoutParams(-1, -2), 0, 0, 0, 12));
            homePostList.addView(item);
        }
    }

    private void renderPostDetail(Post post) {
        currentPage = "detail";
        currentDetailSlug = post.slug;
        selectTab(navArticles);
        clear();
        View page = inflatePage(R.layout.page_post_detail);
        content.addView(page);
        page.findViewById(R.id.detail_back).setOnClickListener(v -> renderHome());
        setText(page, R.id.detail_label, TextTools.join(post.tags, " / "));
        setText(page, R.id.detail_title, post.title);
        setText(page, R.id.detail_meta, "作者：Ralph Rong / Ra · " + post.date + " · " + post.readingMinutes + " 分钟阅读");
        setText(page, R.id.detail_summary, post.summary);
        LinearLayout body = page.findViewById(R.id.detail_body);
        body.removeAllViews();
        renderMarkdown(body, post.content);
    }

    private void renderProfile() {
        currentPage = "profile";
        currentDetailSlug = "";
        selectTab(navProfile);
        clear();
        if (data == null) {
            showLoading("正在加载简历...");
            return;
        }
        Profile profile = data.profile;

        View page = inflatePage(R.layout.page_profile);
        content.addView(page);
        setText(page, R.id.profile_name, profile.name);
        setText(page, R.id.profile_headline, profile.headline);
        setText(page, R.id.profile_summary, profile.summary);

        ImageView photo = page.findViewById(R.id.profile_photo);
        Bitmap bitmap = TextTools.decodeDataImage(profile.photoUrl);
        if (bitmap != null) {
            photo.setImageBitmap(bitmap);
        } else {
            photo.setImageDrawable(null);
        }

        LinearLayout contacts = page.findViewById(R.id.profile_contacts);
        contacts.removeAllViews();
        for (String contact : profile.contacts) {
            contacts.addView(text(contact.replace("【", "").replace("】", ""), 14, MUTED, Typeface.BOLD));
        }

        LinearLayout sections = page.findViewById(R.id.profile_sections);
        sections.removeAllViews();
        sections.addView(profileBlock("求职意向", profile.intent));
        sections.addView(bulletBlock("个人优势", profile.advantages));
        sections.addView(skillsBlock(profile.skills));
        sections.addView(experienceBlock("工作经历", profile.workExperience));
        sections.addView(experienceBlock("项目经历", profile.projects));
        sections.addView(experienceBlock("教育经历", profile.education));
        sections.addView(bulletBlock("个人评价", profile.selfReview));
    }

    private void renderStats() {
        currentPage = "stats";
        currentDetailSlug = "";
        if (data != null && (data.offlineMode || !backendAvailable)) {
            renderHome();
            return;
        }
        selectTab(navStats);
        clear();
        View page = inflatePage(R.layout.page_stats);
        content.addView(page);
        if (visitStats == null) {
            setText(page, R.id.stats_hint, "访问统计正在同步，稍后刷新可查看。");
            setText(page, R.id.stats_visits, "");
            setText(page, R.id.stats_visitors, "");
            setText(page, R.id.stats_last_visit, "");
            setText(page, R.id.stats_device, "");
        } else {
            setText(page, R.id.stats_hint, "");
            setText(page, R.id.stats_visits, visitStats.visits + "\n全站访问次数");
            setText(page, R.id.stats_visitors, visitStats.visitors + "\n全站访客数");
            setText(page, R.id.stats_last_visit, formatDate(visitStats.lastVisitAt) + "\n最近访问时间");
            setText(page, R.id.stats_device, deviceIdStore.visitorId() + "\n本机访客标识");
        }
        runAsync(() -> repository.fetchVisitStats(), result -> {
            visitStats = result;
            setText(page, R.id.stats_hint, result.fromCache ? "当前显示最近一次缓存统计。" : "统计已刷新。");
            setText(page, R.id.stats_visits, result.visits + "\n全站访问次数");
            setText(page, R.id.stats_visitors, result.visitors + "\n全站访客数");
            setText(page, R.id.stats_last_visit, formatDate(result.lastVisitAt) + "\n最近访问时间");
            setText(page, R.id.stats_device, deviceIdStore.visitorId() + "\n本机访客标识");
        }, error -> {
            backendAvailable = false;
            updateNavigation();
            setText(page, R.id.stats_hint, "统计同步失败：" + error.getMessage());
            setText(page, R.id.stats_visits, "暂不可用\n全站访问次数");
            setText(page, R.id.stats_visitors, "暂不可用\n全站访客数");
            setText(page, R.id.stats_last_visit, "-\n最近访问时间");
            setText(page, R.id.stats_device, deviceIdStore.visitorId() + "\n本机访客标识");
        });
    }

    private void renderAdmin() {
        currentPage = "admin";
        currentDetailSlug = "";
        if (data != null && (data.offlineMode || !backendAvailable)) {
            renderHome();
            return;
        }
        selectTab(navAdmin);
        clear();
        View page = inflatePage(R.layout.page_admin);
        content.addView(page);

        adminStatus = page.findViewById(R.id.admin_status);
        adminEditorContainer = page.findViewById(R.id.admin_editor_container);
        EditText username = page.findViewById(R.id.admin_username);
        EditText password = page.findViewById(R.id.admin_password);
        TextView login = page.findViewById(R.id.admin_login_button);
        TextView localHint = page.findViewById(R.id.local_security_hint);
        TextView localAction = page.findViewById(R.id.local_security_primary);

        username.setText(adminSession == null ? "" : adminSession.user);
        localHint.setText(localCredentials.hasLocalAccount()
                ? "本机已配置设备侧密码。它只保护当前手机，不参与网页后台账号校验。"
                : "本机未配置设备侧密码。你可以选择配置，但后台登录不再被本机密码拦截。");
        localAction.setText(localCredentials.hasLocalAccount() ? "修改本机密码" : "注册本机密码");
        localAction.setOnClickListener(v -> renderLocalPasswordChange());

        login.setOnClickListener(v -> {
            String user = username.getText().toString().trim();
            String pass = password.getText().toString();
            adminStatus.setText("正在登录并读取后台数据...");
            hideKeyboard(password);
            runAsync(() -> {
                adminSession = repository.login(user, pass);
                adminData = repository.fetchAdminData(adminSession.token);
                repository.saveBlogCache(adminData.raw);
                return adminData;
            }, result -> {
                adminStatus.setText("后台数据已读取，可以编辑并发布。");
                renderAdmin();
            }, error -> adminStatus.setText("登录失败：" + error.getMessage()));
        });

        if (adminData != null) {
            adminStatus.setText("已登录：" + adminSession.user);
            renderAdminEditor();
        }
    }

    private void renderLocalPasswordChange() {
        currentPage = "admin";
        currentDetailSlug = "";
        selectTab(navAdmin);
        clear();
        View page = inflatePage(R.layout.page_local_password);
        content.addView(page);
        EditText username = page.findViewById(R.id.local_user);
        EditText oldPassword = page.findViewById(R.id.local_old_password);
        EditText newPassword = page.findViewById(R.id.local_new_password);
        TextView save = page.findViewById(R.id.local_save_password);
        TextView back = page.findViewById(R.id.local_back_admin);
        username.setText(localCredentials.username());
        oldPassword.setVisibility(localCredentials.hasLocalAccount() ? View.VISIBLE : View.GONE);
        save.setOnClickListener(v -> {
            try {
                if (localCredentials.hasLocalAccount()) {
                    localCredentials.changePassword(oldPassword.getText().toString(), newPassword.getText().toString());
                    toast("本机密码已修改。");
                } else {
                    localCredentials.register(username.getText().toString(), newPassword.getText().toString());
                    toast("本机密码已注册。");
                }
                renderAdmin();
            } catch (Exception error) {
                toast(error.getMessage());
            }
        });
        back.setOnClickListener(v -> renderAdmin());
    }

    private void renderAdminEditor() {
        if (adminEditorContainer == null) return;
        adminEditorContainer.removeAllViews();
        View page = inflatePage(R.layout.page_admin_editor);
        adminEditorContainer.addView(page);

        LinearLayout list = page.findViewById(R.id.admin_post_list);
        list.removeAllViews();
        EditText postSearch = page.findViewById(R.id.admin_post_search);
        int count = Math.min(12, adminData.posts.size());
        for (int i = 0; i < count; i++) {
            Post post = adminData.posts.get(i);
            TextView item = actionText(post.title, false);
            item.setOnClickListener(v -> {
                selectedAdminPost = post;
                selectedAdminSlug = post.slug;
                renderAdmin();
            });
            list.addView(item);
        }

        if (selectedAdminPost == null && !adminData.posts.isEmpty()) {
            selectedAdminPost = adminData.posts.get(0);
            selectedAdminSlug = selectedAdminPost.slug;
        }

        EditText title = page.findViewById(R.id.editor_title);
        EditText date = page.findViewById(R.id.editor_date);
        EditText tags = page.findViewById(R.id.editor_tags);
        EditText summary = page.findViewById(R.id.editor_summary);
        EditText contentText = page.findViewById(R.id.editor_content);
        if (selectedAdminPost != null) {
            title.setText(selectedAdminPost.title);
            date.setText(selectedAdminPost.date);
            tags.setText(TextTools.join(selectedAdminPost.tags, ", "));
            summary.setText(selectedAdminPost.summary);
            contentText.setText(selectedAdminPost.content);
        }

        postSearch.addTextChangedListener(new SimpleWatcher() {
            @Override
            public void afterTextChanged(Editable s) {
                String query = s.toString().trim().toLowerCase(Locale.US);
                list.removeAllViews();
                for (Post post : adminData.posts) {
                    String haystack = (post.title + " " + TextTools.join(post.tags, " ")).toLowerCase(Locale.US);
                    if (!query.isEmpty() && !haystack.contains(query)) continue;
                    TextView item = actionText(post.title, false);
                    item.setOnClickListener(v -> {
                        selectedAdminPost = post;
                        selectedAdminSlug = post.slug;
                        renderAdmin();
                    });
                    list.addView(item);
                }
            }
        });

        TextView add = page.findViewById(R.id.editor_add);
        add.setOnClickListener(v -> {
            selectedAdminPost = new Post();
            selectedAdminPost.title = "新的 Ra 文章";
            selectedAdminPost.date = TextTools.today();
            selectedAdminPost.createdAt = TextTools.nowIso();
            selectedAdminPost.updatedAt = selectedAdminPost.createdAt;
            selectedAdminPost.summary = "在这里填写摘要。";
            selectedAdminPost.content = "## 背景\n\n记录问题背景。\n\n## 方案\n\n记录解决方案。";
            selectedAdminPost.tags.add("Ra记录");
            selectedAdminSlug = "";
            renderAdmin();
        });

        TextView save = page.findViewById(R.id.editor_save);
        save.setOnClickListener(v -> {
            Post post = selectedAdminPost == null ? new Post() : selectedAdminPost;
            post.title = title.getText().toString().trim();
            post.slug = selectedAdminSlug.isEmpty() ? TextTools.slugify(post.title) : selectedAdminSlug;
            post.date = date.getText().toString().trim().isEmpty() ? TextTools.today() : date.getText().toString().trim();
            if (post.createdAt.isEmpty()) post.createdAt = TextTools.nowIso();
            post.updatedAt = TextTools.nowIso();
            post.tags.clear();
            post.tags.addAll(TextTools.splitTags(tags.getText().toString()));
            post.summary = summary.getText().toString();
            post.content = contentText.getText().toString();
            post.readingMinutes = Math.max(1, Math.round(post.content.length() / 500f));
            upsertPost(post);
            selectedAdminPost = post;
            selectedAdminSlug = post.slug;
            toast("已保存到待发布数据。");
            hideKeyboard(title);
        });

        TextView delete = page.findViewById(R.id.editor_delete);
        delete.setOnClickListener(v -> {
            if (selectedAdminPost != null) {
                deletePost(selectedAdminPost.slug);
                selectedAdminPost = null;
                selectedAdminSlug = "";
                toast("已从待发布数据删除。");
                renderAdmin();
            }
        });

        TextView publish = page.findViewById(R.id.editor_publish);
        publish.setOnClickListener(v -> runAsync(() -> repository.publish(adminSession.token, adminData.raw), result -> {
            toast("发布成功：" + shortSha(result.commitSha));
            data = adminData;
            data.offlineMode = false;
            data.fromCache = false;
            data.sourceMessage = "发布后的本地缓存";
            repository.saveBlogCache(adminData.raw);
            updateNavigation();
            renderAdmin();
        }));

        Profile profile = adminData.profile;
        EditText name = page.findViewById(R.id.profile_edit_name);
        EditText headline = page.findViewById(R.id.profile_edit_headline);
        EditText profileSummary = page.findViewById(R.id.profile_edit_summary);
        EditText contacts = page.findViewById(R.id.profile_edit_contacts);
        name.setText(profile.name);
        headline.setText(profile.headline);
        profileSummary.setText(profile.summary);
        contacts.setText(TextTools.join(profile.contacts, "\n"));
        TextView saveProfile = page.findViewById(R.id.profile_edit_save);
        saveProfile.setOnClickListener(v -> {
            try {
                JsonMapper.updateProfileSummary(
                        adminData.raw,
                        name.getText().toString(),
                        headline.getText().toString(),
                        profileSummary.getText().toString(),
                        TextTools.splitLines(contacts.getText().toString())
                );
                adminData = JsonMapper.parseBlog(adminData.raw);
                toast("简历基础信息已保存到待发布数据。");
            } catch (Exception e) {
                toast("简历保存失败：" + e.getMessage());
            }
        });
    }

    private void upsertPost(Post post) {
        try {
            JSONArray array = adminData.raw.optJSONArray("posts");
            if (array == null) {
                array = new JSONArray();
                adminData.raw.put("posts", array);
            }
            JSONObject next = JsonMapper.postToJson(post);
            boolean updated = false;
            for (int i = 0; i < array.length(); i++) {
                JSONObject item = array.optJSONObject(i);
                if (item != null && post.slug.equals(item.optString("slug"))) {
                    array.put(i, next);
                    updated = true;
                    break;
                }
            }
            if (!updated) array.put(next);
            adminData = JsonMapper.parseBlog(adminData.raw);
        } catch (Exception e) {
            toast("文章保存失败：" + e.getMessage());
        }
    }

    private void deletePost(String slug) {
        try {
            JSONArray array = adminData.raw.optJSONArray("posts");
            if (array == null) return;
            JSONArray next = new JSONArray();
            for (int i = 0; i < array.length(); i++) {
                JSONObject item = array.optJSONObject(i);
                if (item == null || !slug.equals(item.optString("slug"))) next.put(item);
            }
            adminData.raw.put("posts", next);
            adminData = JsonMapper.parseBlog(adminData.raw);
        } catch (Exception e) {
            toast("文章删除失败：" + e.getMessage());
        }
    }

    private List<Post> filteredPosts() {
        List<Post> out = new ArrayList<>();
        String query = searchQuery.trim().toLowerCase(Locale.US);
        for (Post post : data.posts) {
            if (!"全部".equals(selectedTag) && !post.tags.contains(selectedTag)) continue;
            String haystack = (post.title + " " + post.summary + " " + TextTools.join(post.tags, " ")).toLowerCase(Locale.US);
            if (!query.isEmpty() && !haystack.contains(query)) continue;
            out.add(post);
        }
        Collections.sort(out, postComparator());
        return out;
    }

    private Comparator<Post> postComparator() {
        final Collator collator = Collator.getInstance(Locale.CHINA);
        return new Comparator<Post>() {
            @Override
            public int compare(Post left, Post right) {
                if ("date-asc".equals(sortMode)) {
                    int value = Long.compare(timeValue(left.date), timeValue(right.date));
                    return value != 0 ? value : compareTitle(left, right, collator);
                }
                if ("title-asc".equals(sortMode)) {
                    int value = compareTitle(left, right, collator);
                    return value != 0 ? value : Long.compare(timeValue(right.date), timeValue(left.date));
                }
                if ("title-desc".equals(sortMode)) {
                    int value = compareTitle(right, left, collator);
                    return value != 0 ? value : Long.compare(timeValue(right.date), timeValue(left.date));
                }
                if ("updated-desc".equals(sortMode)) {
                    int value = Long.compare(timeValue(postUpdatedAt(right)), timeValue(postUpdatedAt(left)));
                    return value != 0 ? value : Long.compare(timeValue(right.date), timeValue(left.date));
                }
                int value = Long.compare(timeValue(right.date), timeValue(left.date));
                return value != 0 ? value : compareTitle(left, right, collator);
            }
        };
    }

    private int compareTitle(Post left, Post right, Collator collator) {
        String leftTitle = left == null || left.title == null ? "" : left.title;
        String rightTitle = right == null || right.title == null ? "" : right.title;
        return collator.compare(leftTitle, rightTitle);
    }

    private String postUpdatedAt(Post post) {
        if (post == null) return "";
        if (post.updatedAt != null && !post.updatedAt.isEmpty()) return post.updatedAt;
        return post.date == null ? "" : post.date;
    }

    private long timeValue(String value) {
        if (value == null || value.isEmpty()) return 0L;
        String[] patterns = new String[]{
                "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
                "yyyy-MM-dd'T'HH:mm:ssXXX",
                "yyyy-MM-dd"
        };
        for (String pattern : patterns) {
            try {
                Date parsed = new SimpleDateFormat(pattern, Locale.US).parse(value);
                if (parsed != null) return parsed.getTime();
            } catch (Exception ignored) {
            }
        }
        return 0L;
    }

    private String sortLabel() {
        if ("date-asc".equals(sortMode)) return "最早发布";
        if ("title-asc".equals(sortMode)) return "标题 A-Z";
        if ("title-desc".equals(sortMode)) return "标题 Z-A";
        if ("updated-desc".equals(sortMode)) return "最近修改";
        return "最新发布";
    }

    private Set<String> allTags() {
        Set<String> tags = new LinkedHashSet<>();
        if (data == null) return tags;
        for (Post post : data.posts) tags.addAll(post.tags);
        return tags;
    }

    private LinearLayout profileBlock(String title, String body) {
        LinearLayout card = sectionCard(title);
        LinearLayout bodyContainer = card.findViewById(R.id.section_body);
        bodyContainer.addView(paragraph(body));
        return card;
    }

    private LinearLayout bulletBlock(String title, List<String> items) {
        LinearLayout card = sectionCard(title);
        LinearLayout bodyContainer = card.findViewById(R.id.section_body);
        for (String item : items) bodyContainer.addView(bullet(item));
        return card;
    }

    private LinearLayout skillsBlock(List<SkillGroup> groups) {
        LinearLayout card = sectionCard("核心技能");
        LinearLayout bodyContainer = card.findViewById(R.id.section_body);
        for (SkillGroup group : groups) {
            bodyContainer.addView(text(group.name, 16, TEXT, Typeface.BOLD));
            bodyContainer.addView(paragraph(TextTools.join(group.items, " / ")));
        }
        return card;
    }

    private LinearLayout experienceBlock(String title, List<ExperienceItem> items) {
        LinearLayout card = sectionCard(title);
        LinearLayout bodyContainer = card.findViewById(R.id.section_body);
        for (ExperienceItem item : items) {
            bodyContainer.addView(text(item.title.replace("【", "").replace("】", ""), 16, TEXT, Typeface.BOLD));
            if (!item.period.isEmpty()) bodyContainer.addView(text(item.period.replace("【", "").replace("】", ""), 13, PRIMARY, Typeface.BOLD));
            if (!item.meta.isEmpty()) bodyContainer.addView(text(item.meta.replace("【", "").replace("】", ""), 13, MUTED, Typeface.NORMAL));
            for (String detail : item.details) bodyContainer.addView(bullet(detail));
        }
        return card;
    }

    private LinearLayout sectionCard(String label) {
        LinearLayout card = (LinearLayout) LayoutInflater.from(this).inflate(R.layout.view_profile_section, content, false);
        setText(card, R.id.section_label, label);
        LinearLayout bodyContainer = card.findViewById(R.id.section_body);
        bodyContainer.removeAllViews();
        return card;
    }

    private void renderMarkdown(LinearLayout parent, String markdown) {
        String[] lines = markdown == null ? new String[0] : markdown.split("\\n");
        for (String raw : lines) {
            String line = raw.trim();
            if (line.isEmpty()) {
                parent.addView(spacer(6));
            } else if (line.startsWith("## ")) {
                parent.addView(title(line.substring(3), 20));
            } else if (line.startsWith("- ") || line.startsWith("* ")) {
                parent.addView(bullet(line.substring(2)));
            } else if (line.startsWith("```")) {
                parent.addView(monoText("----", 13, MUTED));
            } else {
                parent.addView(paragraph(line));
            }
        }
    }

    private void clear() {
        content.removeAllViews();
        if (!"home".equals(currentPage)) {
            sortPanelOpen = false;
            if (floatingSortButton != null) floatingSortButton.setVisibility(View.GONE);
            if (floatingSortPanel != null) floatingSortPanel.setVisibility(View.GONE);
        }
        if (pageScroll != null) pageScroll.post(() -> pageScroll.scrollTo(0, 0));
    }

    private void showLoading(String message) {
        clear();
        LinearLayout card = card();
        card.addView(title(message, 22));
        content.addView(card);
    }

    private View inflatePage(int layoutId) {
        return LayoutInflater.from(this).inflate(layoutId, content, false);
    }

    private void setText(View rootView, int id, String value) {
        TextView view = rootView.findViewById(id);
        if (view != null) view.setText(value == null ? "" : value);
    }

    private LinearLayout card() {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(16), dp(16), dp(16), dp(16));
        card.setBackgroundResource(R.drawable.bg_panel);
        card.setLayoutParams(margins(new LinearLayout.LayoutParams(-1, -2), 0, 0, 0, 12));
        return card;
    }

    private LinearLayout horizontalCard() {
        LinearLayout card = card();
        card.setOrientation(LinearLayout.HORIZONTAL);
        return card;
    }

    private TextView label(String value) {
        TextView label = text(value, 12, PRIMARY, Typeface.BOLD);
        label.setAllCaps(true);
        return label;
    }

    private TextView title(String value, int size) {
        TextView title = text(value, adjustedTitleSize(size), TEXT, Typeface.BOLD);
        title.setPadding(0, dp(6), 0, dp(6));
        title.setLineSpacing(dp(2), 1.02f);
        return title;
    }

    private TextView paragraph(String value) {
        TextView text = text(value == null ? "" : value, 15, MUTED, Typeface.NORMAL);
        text.setLineSpacing(dp(2), 1.05f);
        text.setPadding(0, dp(4), 0, dp(6));
        return text;
    }

    private TextView bullet(String value) {
        return paragraph("• " + value);
    }

    private TextView stat(String label, String value) {
        TextView text = text(value + "\n" + label, 16, PRIMARY, Typeface.BOLD);
        text.setGravity(Gravity.CENTER);
        text.setPadding(dp(8), dp(6), dp(8), dp(6));
        text.setLayoutParams(new LinearLayout.LayoutParams(0, -2, 1));
        return text;
    }

    private TextView statVertical(String label, String value) {
        TextView text = text(value + "\n" + label, 20, TEXT, Typeface.BOLD);
        text.setPadding(0, dp(8), 0, dp(8));
        return text;
    }

    private TextView text(String value, int sp, int color, int style) {
        TextView view = new TextView(this);
        view.setText(value == null ? "" : value);
        view.setTextSize(sp);
        view.setTextColor(color);
        view.setTypeface(Typeface.DEFAULT, style);
        view.setIncludeFontPadding(true);
        return view;
    }

    private TextView monoText(String value, int sp, int color) {
        TextView view = text(value, sp, color, Typeface.NORMAL);
        view.setTypeface(Typeface.MONOSPACE);
        return view;
    }

    private EditText input(String hint) {
        EditText input = new EditText(this);
        input.setHint(hint);
        input.setSingleLine(true);
        input.setTextColor(TEXT);
        input.setHintTextColor(MUTED);
        input.setBackgroundResource(R.drawable.bg_input);
        input.setPadding(dp(10), dp(8), dp(10), dp(8));
        input.setMinHeight(dp(44));
        input.setTextSize(15);
        input.setLayoutParams(margins(new LinearLayout.LayoutParams(-1, -2), 0, 6, 0, 6));
        return input;
    }

    private EditText passwordInput(String hint) {
        EditText input = input(hint);
        input.setInputType(0x00000081);
        return input;
    }

    private EditText multiline(String hint, int lines) {
        EditText input = input(hint);
        input.setSingleLine(false);
        input.setMinLines(lines);
        input.setGravity(Gravity.TOP);
        return input;
    }

    private Button navButton(String label, View.OnClickListener listener) {
        Button button = secondaryButton(label);
        button.setOnClickListener(listener);
        return button;
    }

    private TextView actionText(String label, boolean primary) {
        TextView action = (TextView) LayoutInflater.from(this).inflate(R.layout.view_action_chip, content, false);
        action.setText(label);
        action.setTextColor(primary ? Color.WHITE : PRIMARY);
        action.setBackgroundResource(primary ? R.drawable.bg_button_primary : R.drawable.bg_button_secondary);
        return action;
    }

    private Button primaryButton(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextColor(Color.WHITE);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setBackgroundResource(R.drawable.bg_button_primary);
        button.setAllCaps(false);
        button.setMinHeight(0);
        button.setMinimumHeight(0);
        button.setMinWidth(0);
        button.setMinimumWidth(0);
        button.setPadding(dp(14), 0, dp(14), 0);
        button.setLayoutParams(margins(new LinearLayout.LayoutParams(-1, -2), 0, 6, 0, 6));
        return button;
    }

    private Button secondaryButton(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextColor(PRIMARY);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setBackgroundResource(R.drawable.bg_button_secondary);
        button.setAllCaps(false);
        button.setMinHeight(0);
        button.setMinimumHeight(0);
        button.setMinWidth(0);
        button.setMinimumWidth(0);
        button.setPadding(dp(12), 0, dp(12), 0);
        button.setLayoutParams(margins(new LinearLayout.LayoutParams(-2, -2), 4, 4, 4, 4));
        return button;
    }

    private TextView chip(String label, boolean selected, View.OnClickListener listener) {
        TextView chip = (TextView) LayoutInflater.from(this).inflate(R.layout.view_tag_chip, content, false);
        chip.setText(label);
        chip.setTextColor(selected ? Color.WHITE : PRIMARY);
        chip.setBackgroundResource(selected ? R.drawable.bg_chip_selected : R.drawable.bg_chip);
        chip.setOnClickListener(listener);
        return chip;
    }

    private void selectTab(TextView active) {
        TextView[] tabs = new TextView[]{navArticles, navProfile, navStats, navAdmin};
        for (TextView tab : tabs) {
            if (tab == null) continue;
            boolean selected = tab == active;
            tab.setTextColor(selected ? Color.WHITE : PRIMARY);
            tab.setBackgroundResource(selected ? R.drawable.bg_button_primary : R.drawable.bg_button_secondary);
        }
    }

    private void updateNavigation() {
        boolean readOnly = data != null && (data.offlineMode || !backendAvailable);
        if (navStats != null) navStats.setVisibility(readOnly ? View.GONE : View.VISIBLE);
        if (navAdmin != null) navAdmin.setVisibility(readOnly ? View.GONE : View.VISIBLE);
    }

    private void updateHomeSourceHint() {
        TextView source = content == null ? null : content.findViewById(R.id.home_data_source);
        if (source != null) source.setText(homeSourceText());
    }

    private String homeSourceText() {
        if (data == null) return "";
        if (data.offlineMode) return "离线模式：" + data.sourceMessage + "。当前仅开放文章和简历。";
        if (!backendAvailable) return "已同步文章和简历；后台 API 当前不可用，当前仅开放文章和简历。";
        return "已同步公网数据。";
    }

    private int adjustedTitleSize(int requested) {
        int widthDp = getResources().getConfiguration().screenWidthDp;
        if (widthDp <= 360 && requested > 24) return 24;
        if (widthDp <= 420 && requested > 26) return 26;
        return requested;
    }

    private View spacer(int dpValue) {
        View view = new View(this);
        view.setLayoutParams(new LinearLayout.LayoutParams(1, dp(dpValue)));
        return view;
    }

    private LinearLayout.LayoutParams margins(LinearLayout.LayoutParams params, int left, int top, int right, int bottom) {
        params.setMargins(dp(left), dp(top), dp(right), dp(bottom));
        return params;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private String shortSha(String sha) {
        if (sha == null || sha.length() < 7) return sha == null ? "" : sha;
        return sha.substring(0, 7);
    }

    private String formatDate(String iso) {
        try {
            String source = iso.replace("Z", "+0000");
            Date date = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ", Locale.US).parse(source);
            return new SimpleDateFormat("MM/dd HH:mm", Locale.US).format(date);
        } catch (Exception error) {
            return iso == null || iso.isEmpty() ? "-" : iso;
        }
    }

    private void hideKeyboard(View view) {
        InputMethodManager manager = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        if (manager != null) manager.hideSoftInputFromWindow(view.getWindowToken(), 0);
    }

    private <T> void runAsync(Callable<T> task, ResultHandler<T> handler) {
        runAsync(task, handler, true);
    }

    private <T> void runAsync(Callable<T> task, ResultHandler<T> handler, ErrorHandler errorHandler) {
        executor.execute(() -> {
            try {
                T result = task.call();
                mainHandler.post(() -> handler.onResult(result));
            } catch (Exception error) {
                mainHandler.post(() -> {
                    errorHandler.onError(error);
                    toast(error.getMessage());
                });
            }
        });
    }

    private <T> void runAsync(Callable<T> task, ResultHandler<T> handler, boolean showErrors) {
        executor.execute(() -> {
            try {
                T result = task.call();
                mainHandler.post(() -> handler.onResult(result));
            } catch (Exception error) {
                if (showErrors) mainHandler.post(() -> toast(error.getMessage()));
            }
        });
    }

    private <T> void runAsyncQuiet(Callable<T> task, ResultHandler<T> handler, ErrorHandler errorHandler) {
        executor.execute(() -> {
            try {
                T result = task.call();
                mainHandler.post(() -> handler.onResult(result));
            } catch (Exception error) {
                mainHandler.post(() -> errorHandler.onError(error));
            }
        });
    }

    private void toast(String message) {
        Toast.makeText(this, message == null ? "操作失败" : message, Toast.LENGTH_LONG).show();
    }

    private interface ResultHandler<T> {
        void onResult(T result);
    }

    private interface ErrorHandler {
        void onError(Exception error);
    }

    private abstract static class SimpleWatcher implements TextWatcher {
        @Override
        public void beforeTextChanged(CharSequence s, int start, int count, int after) {
        }

        @Override
        public void onTextChanged(CharSequence s, int start, int before, int count) {
        }
    }
}
