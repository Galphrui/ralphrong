package com.ralph.notes;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Log;
import android.util.Base64;
import android.net.Uri;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.Surface;
import android.view.View;
import android.view.WindowInsets;
import android.view.inputmethod.InputMethodManager;
import android.content.Context;
import android.widget.Button;
import android.widget.CheckBox;
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
import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String PREFS_NAME = "ra_app_settings";
    private static final String KEY_ROTATION_ENABLED = "rotation_enabled";
    private static final String KEY_PROFILE_VISIBLE = "profile_visible";
    private static final String KEY_CODE_VISIBLE = "code_visible";
    private static final String KEY_STATS_VISIBLE = "stats_visible";
    private static final String KEY_MESSAGE_RECORDS_VISIBLE = "message_records_visible";
    private static final String KEY_VOICE_MESSAGE_VISIBLE = "voice_message_visible";
    private static final String GSENSOR_TAG = "Ra_YR_GSENSER";
    private static final String DIRECTION_TAG = "Ra_YR_Direction";
    private static final long GSENSOR_LOG_INTERVAL_MS = 500L;
    private static final int BG = Color.rgb(246, 251, 248);
    private static final int PANEL = Color.WHITE;
    private static final int PRIMARY = Color.rgb(7, 95, 81);
    private static final int PRIMARY_LIGHT = Color.rgb(233, 251, 246);
    private static final int ACCENT = Color.rgb(245, 158, 11);
    private static final int TEXT = Color.rgb(2, 6, 23);
    private static final int MUTED = Color.rgb(100, 116, 139);
    private static final int LINE = Color.rgb(216, 228, 224);

    private BlogRepository repository;
    private SharedPreferences appSettings;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Set<String> unlockedPostSlugs = new LinkedHashSet<>();

    private View root;
    private LinearLayout content;
    private ScrollView pageScroll;
    private View refreshIndicator;
    private TextView refreshStatus;
    private TextView floatingSortButton;
    private LinearLayout floatingSortPanel;
    private TextView navArticles;
    private TextView navCode;
    private TextView navProfile;
    private TextView navGuestbook;
    private TextView navStats;
    private TextView navAdmin;
    private TextView navSettings;
    private LinearLayout homePostList;
    private LinearLayout homeTagsRow;
    private TextView homeListTitle;
    private LinearLayout homePromoTabs;
    private LinearLayout homePromoCard;
    private TextView adminStatus;
    private LinearLayout adminEditorContainer;
    private BlogData data;
    private BlogData adminData;
    private VisitStats visitStats;
    private List<GuestMessage> guestMessages = new ArrayList<>();
    private Map<String, PostMetric> postMetrics = new HashMap<>();
    private AdminSession adminSession;
    private LocalCredentialStore localCredentials;
    private DeviceIdStore deviceIdStore;
    private SensorManager sensorManager;
    private Sensor accelerometerSensor;
    private long lastGsensorLogAt;
    private String lastGsensorCandidate = "";
    private boolean backendAvailable = true;
    private boolean refreshing;
    private boolean pullTracking;
    private boolean sortPanelOpen;
    private float pullStartY;
    private String selectedTag = "全部";
    private String searchQuery = "";
    private String sortMode = "date-desc";
    private String promoMode = "latest";
    private int promoIndex;
    private String currentPage = "home";
    private String currentDetailSlug = "";
    private Post selectedAdminPost;
    private String selectedAdminSlug = "";
    private long lastBackPressedAt;
    private final Runnable promoTicker = new Runnable() {
        @Override
        public void run() {
            if (!"home".equals(currentPage) || data == null || data.posts.size() <= 1) return;
            promoIndex = (promoIndex + 1) % Math.min(5, data.posts.size());
            updateHomePromo();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        repository = new BlogRepository(this);
        appSettings = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        localCredentials = new LocalCredentialStore(this);
        deviceIdStore = new DeviceIdStore(this);
        applyRotationPreference();
        initRotationDebugLogging();
        buildShell();
        loadPublicData();
    }

    @Override
    protected void onResume() {
        super.onResume();
        applyRotationPreference();
        if (isRotationEnabled()) startRotationDebugLogging();
    }

    @Override
    protected void onPause() {
        stopRotationDebugLogging();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if ("detail".equals(currentPage) || !"home".equals(currentPage)) {
            renderHome();
            return;
        }
        long now = System.currentTimeMillis();
        if (now - lastBackPressedAt < 1800) {
            super.onBackPressed();
            return;
        }
        lastBackPressedAt = now;
        toast("再按一次返回退出。");
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
        navCode = findViewById(R.id.nav_code);
        navProfile = findViewById(R.id.nav_profile);
        navGuestbook = findViewById(R.id.nav_guestbook);
        navStats = findViewById(R.id.nav_stats);
        navAdmin = findViewById(R.id.nav_admin);
        navSettings = findViewById(R.id.nav_settings);

        findViewById(R.id.brand_area).setOnClickListener(v -> renderHome());
        navArticles.setOnClickListener(v -> renderHome());
        navCode.setOnClickListener(v -> renderCodeRepository());
        navProfile.setOnClickListener(v -> renderProfile());
        navGuestbook.setOnClickListener(v -> renderGuestbook());
        navStats.setOnClickListener(v -> renderStats());
        navAdmin.setOnClickListener(v -> renderAdmin());
        navSettings.setOnClickListener(v -> renderSettings());
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

    private final SensorEventListener rotationDebugListener = new SensorEventListener() {
        @Override
        public void onSensorChanged(SensorEvent event) {
            if (event == null || event.sensor == null || event.sensor.getType() != Sensor.TYPE_ACCELEROMETER) {
                return;
            }
            float x = event.values[0];
            float y = event.values[1];
            float z = event.values[2];
            long now = System.currentTimeMillis();
            RotationGuess guess = guessRotationFromGsensor(x, y, z);
            boolean candidateChanged = !guess.candidate.equals(lastGsensorCandidate);
            if (!candidateChanged && now - lastGsensorLogAt < GSENSOR_LOG_INTERVAL_MS) {
                return;
            }
            lastGsensorLogAt = now;
            lastGsensorCandidate = guess.candidate;

            String currentOrientation = currentResourceOrientationLabel();
            String currentRotation = displayRotationLabel();
            if (isRotationEnabled()) {
                handleSensorDrivenOrientation(guess, currentOrientation, currentRotation, x, y, z);
            }
            Log.d(GSENSOR_TAG, "Gsensor x=" + formatFloat(x)
                    + ", y=" + formatFloat(y)
                    + ", z=" + formatFloat(z)
                    + ", horizontalG=" + formatFloat(guess.horizontalG)
                    + ", totalG=" + formatFloat(guess.totalG)
                    + ", candidate=" + guess.candidate
                    + ", currentOrientation=" + currentOrientation
                    + ", displayRotation=" + currentRotation
                    + ", autoRotate=" + isSystemAutoRotateEnabled()
                    + ", requestedOrientation=" + requestedOrientationLabel()
                    + ", noRotateReason=" + noRotateReason(guess, currentOrientation));
        }

        @Override
        public void onAccuracyChanged(Sensor sensor, int accuracy) {
            Log.d(GSENSOR_TAG, "Gsensor accuracy changed: sensor="
                    + (sensor == null ? "null" : sensor.getName())
                    + ", accuracy=" + accuracy);
        }
    };

    private void initRotationDebugLogging() {
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager == null) {
            Log.w(GSENSOR_TAG, "SensorManager is null; cannot read Gsensor data.");
            return;
        }
        accelerometerSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        if (accelerometerSensor == null) {
            Log.w(GSENSOR_TAG, "No accelerometer sensor found; Android cannot rotate from Gsensor data on this device.");
            return;
        }
        Log.d(DIRECTION_TAG, "Rotation debug ready: sensor=" + accelerometerSensor.getName()
                + ", vendor=" + accelerometerSensor.getVendor()
                + ", requestedOrientation=" + requestedOrientationLabel()
                + ", autoRotate=" + isSystemAutoRotateEnabled()
                + ", displayRotation=" + displayRotationLabel()
                + ", resourceOrientation=" + currentResourceOrientationLabel());
    }

    private void startRotationDebugLogging() {
        if (!isRotationEnabled()) {
            Log.d(DIRECTION_TAG, "Rotation debug not started: app rotation setting is off.");
            return;
        }
        if (sensorManager == null || accelerometerSensor == null) {
            Log.w(GSENSOR_TAG, "Rotation debug not started: accelerometer unavailable.");
            return;
        }
        lastGsensorLogAt = 0L;
        lastGsensorCandidate = "";
        boolean registered = sensorManager.registerListener(
                rotationDebugListener,
                accelerometerSensor,
                SensorManager.SENSOR_DELAY_NORMAL
        );
        Log.d(DIRECTION_TAG, "Rotation debug listener registered=" + registered
                + ", requestedOrientation=" + requestedOrientationLabel()
                + ", autoRotate=" + isSystemAutoRotateEnabled()
                + ", displayRotation=" + displayRotationLabel()
                + ", resourceOrientation=" + currentResourceOrientationLabel());
    }

    private void stopRotationDebugLogging() {
        if (sensorManager != null) {
            sensorManager.unregisterListener(rotationDebugListener);
            Log.d(DIRECTION_TAG, "Rotation debug listener unregistered.");
        }
    }

    private RotationGuess guessRotationFromGsensor(float x, float y, float z) {
        float horizontalG = (float) Math.sqrt(x * x + y * y);
        float totalG = (float) Math.sqrt(x * x + y * y + z * z);
        String candidate;
        String reason;
        if (totalG < 6.0f || totalG > 14.0f) {
            candidate = "unknown";
            reason = "Gsensor total gravity is outside normal range, probably moving/shaking.";
        } else if (Math.abs(z) > 7.2f && horizontalG < 6.0f) {
            candidate = "unknown";
            reason = "device is too flat; Android usually avoids rotating from flat-table readings.";
        } else if (horizontalG < 5.5f) {
            candidate = "unknown";
            reason = "side gravity is too small; tilt has not crossed a clear rotation threshold.";
        } else if (Math.abs(x) > Math.abs(y)) {
            candidate = x > 0 ? "landscape-estimated" : "landscape-reverse-estimated";
            reason = "Gsensor points closer to landscape than portrait.";
        } else {
            candidate = y > 0 ? "portrait-estimated" : "portrait-reverse-estimated";
            reason = "Gsensor points closer to portrait than landscape.";
        }
        return new RotationGuess(candidate, reason, horizontalG, totalG);
    }

    private void handleSensorDrivenOrientation(RotationGuess guess, String currentOrientation, String currentRotation, float x, float y, float z) {
        if (!isRotationEnabled()) return;
        if (guess == null || "unknown".equals(guess.candidate)) {
            Log.d(DIRECTION_TAG, "RA_YR方向判断：Gsensor暂不满足切屏条件，原因=" + (guess == null ? "guess为空" : guess.reason));
            return;
        }
        int targetOrientation = targetOrientationForCandidate(guess.candidate);
        String targetLabel = targetOrientationLabel(targetOrientation);
        if (targetOrientation == getRequestedOrientation()) {
            Log.d(DIRECTION_TAG, "RA_YR方向判断：Gsensor已符合" + targetLabel
                    + "，但当前已经请求过该方向，不重复切换。candidate=" + guess.candidate
                    + ", currentOrientation=" + currentOrientation
                    + ", displayRotation=" + currentRotation);
            return;
        }
        Log.d(DIRECTION_TAG, "RA_YR方向切换：Gsensor符合" + targetLabel
                + "，准备主动调用setRequestedOrientation。x=" + formatFloat(x)
                + ", y=" + formatFloat(y)
                + ", z=" + formatFloat(z)
                + ", candidate=" + guess.candidate
                + ", currentOrientation=" + currentOrientation
                + ", displayRotation=" + currentRotation
                + ", requestedBefore=" + requestedOrientationLabel());
        setRequestedOrientation(targetOrientation);
        Log.d(DIRECTION_TAG, "RA_YR方向切换：已请求" + targetLabel
                + "，requestedAfter=" + requestedOrientationLabel());
    }

    private int targetOrientationForCandidate(String candidate) {
        if ("landscape-estimated".equals(candidate)) return ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE;
        if ("landscape-reverse-estimated".equals(candidate)) return ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE;
        if ("portrait-reverse-estimated".equals(candidate)) return ActivityInfo.SCREEN_ORIENTATION_REVERSE_PORTRAIT;
        return ActivityInfo.SCREEN_ORIENTATION_PORTRAIT;
    }

    private String targetOrientationLabel(int orientation) {
        if (orientation == ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE) return "横屏";
        if (orientation == ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE) return "反向横屏";
        if (orientation == ActivityInfo.SCREEN_ORIENTATION_REVERSE_PORTRAIT) return "反向竖屏";
        return "竖屏";
    }

    private String noRotateReason(RotationGuess guess, String currentOrientation) {
        if ("unknown".equals(guess.candidate)) return guess.reason;
        String candidateOrientation = guess.candidate.contains("landscape") ? "landscape" : "portrait";
        if (candidateOrientation.equals(currentOrientation)) {
            return "candidate matches current orientation; no Activity recreation/rotation expected.";
        }
        if (getRequestedOrientation() == ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR) {
            return "Gsensor suggests " + candidateOrientation + "; Activity is fullSensor, so if UI does not rotate check system policy, flat/debounce timing, launcher/window mode, or OEM rotation lock.";
        }
        if (!isSystemAutoRotateEnabled()) {
            return "system auto-rotate is off; fullSensor may still rotate, but OEM policy can still block it.";
        }
        return "Gsensor suggests " + candidateOrientation + "; waiting for Android orientation hysteresis/debounce to accept it.";
    }

    private boolean isSystemAutoRotateEnabled() {
        try {
            return Settings.System.getInt(getContentResolver(), Settings.System.ACCELEROMETER_ROTATION) == 1;
        } catch (Exception error) {
            Log.w(DIRECTION_TAG, "Cannot read system auto-rotate setting: " + error.getMessage());
            return false;
        }
    }

    private String currentResourceOrientationLabel() {
        int orientation = getResources().getConfiguration().orientation;
        if (orientation == Configuration.ORIENTATION_LANDSCAPE) return "landscape";
        if (orientation == Configuration.ORIENTATION_PORTRAIT) return "portrait";
        return "undefined";
    }

    private String displayRotationLabel() {
        int rotation = getWindowManager().getDefaultDisplay().getRotation();
        if (rotation == Surface.ROTATION_0) return "ROTATION_0";
        if (rotation == Surface.ROTATION_90) return "ROTATION_90";
        if (rotation == Surface.ROTATION_180) return "ROTATION_180";
        if (rotation == Surface.ROTATION_270) return "ROTATION_270";
        return "ROTATION_UNKNOWN(" + rotation + ")";
    }

    private String requestedOrientationLabel() {
        int orientation = getRequestedOrientation();
        if (orientation == ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR) return "fullSensor";
        if (orientation == ActivityInfo.SCREEN_ORIENTATION_SENSOR) return "sensor";
        if (orientation == ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED) return "unspecified";
        if (orientation == ActivityInfo.SCREEN_ORIENTATION_PORTRAIT) return "portrait";
        if (orientation == ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE) return "landscape";
        if (orientation == ActivityInfo.SCREEN_ORIENTATION_REVERSE_PORTRAIT) return "reversePortrait";
        if (orientation == ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE) return "reverseLandscape";
        if (orientation == ActivityInfo.SCREEN_ORIENTATION_LOCKED) return "locked";
        return "value=" + orientation;
    }

    private String formatFloat(float value) {
        return String.format(Locale.US, "%.2f", value);
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
            if (backendAvailable) syncPostMetrics();
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
        if ("profile".equals(targetPage) && isProfileVisible()) {
            renderProfile();
        } else if ("code".equals(targetPage) && isCodeVisible()) {
            renderCodeRepository();
        } else if ("guestbook".equals(targetPage)) {
            renderGuestbook();
        } else if ("detail".equals(targetPage)) {
            Post post = findPost(targetSlug);
            if (post == null) renderHome();
            else renderPostDetail(post);
        } else if ("stats".equals(targetPage) && isStatsVisible() && backendAvailable && !data.offlineMode) {
            renderStats();
        } else if ("admin".equals(targetPage) && backendAvailable && !data.offlineMode) {
            renderAdmin();
        } else if ("settings".equals(targetPage)) {
            renderSettings();
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

    private void syncPostMetrics() {
        runAsyncQuiet(() -> repository.fetchPostMetrics(), result -> {
            postMetrics = result;
            if ("home".equals(currentPage)) {
                updateHomePromo();
                renderPostListOnly();
            } else if ("detail".equals(currentPage)) {
                Post post = findPost(currentDetailSlug);
                if (post != null) renderPostDetail(post);
            }
        }, error -> {
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
        homePromoTabs = page.findViewById(R.id.home_promo_tabs);
        homePromoCard = page.findViewById(R.id.home_promo_card);

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
        updateHomePromo();
        renderTags();
        renderPostListOnly();
        updateFloatingSort();
    }

    private void updateHomePromo() {
        if (homePromoTabs == null || homePromoCard == null || data == null) return;
        mainHandler.removeCallbacks(promoTicker);
        homePromoTabs.removeAllViews();
        addPromoTab("最近发布", "latest");
        addPromoTab("点击最多", "views");
        addPromoTab("点赞最多", "likes");

        Post post = promotedPost();
        if (post == null) {
            homePromoCard.setVisibility(View.GONE);
            return;
        }
        homePromoCard.setVisibility(View.VISIBLE);
        PostMetric metric = metricFor(post.slug);
        setText(homePromoCard, R.id.home_promo_meta, promoLabel() + " · " + metric.views + " 点击 · " + metric.likes + " 赞");
        setText(homePromoCard, R.id.home_promo_title, post.title);
        setText(homePromoCard, R.id.home_promo_summary, post.summary);
        homePromoCard.setOnClickListener(v -> openPostDetail(post));
        if ("home".equals(currentPage) && data.posts.size() > 1) {
            mainHandler.postDelayed(promoTicker, 4200);
        }
    }

    private void addPromoTab(String label, String mode) {
        TextView tab = actionText(label, promoMode.equals(mode));
        tab.setOnClickListener(v -> {
            promoMode = mode;
            promoIndex = 0;
            updateHomePromo();
        });
        homePromoTabs.addView(tab);
    }

    private Post promotedPost() {
        if (data == null || data.posts.isEmpty()) return null;
        List<Post> sorted = new ArrayList<>(data.posts);
        if ("views".equals(promoMode)) {
            Collections.sort(sorted, (left, right) -> Integer.compare(metricFor(right.slug).views, metricFor(left.slug).views));
        } else if ("likes".equals(promoMode)) {
            Collections.sort(sorted, (left, right) -> Integer.compare(metricFor(right.slug).likes, metricFor(left.slug).likes));
        } else {
            Collections.sort(sorted, postComparator());
        }
        int index = Math.min(promoIndex, Math.min(5, sorted.size()) - 1);
        return sorted.get(Math.max(0, index));
    }

    private String promoLabel() {
        if ("views".equals(promoMode)) return "点击最多";
        if ("likes".equals(promoMode)) return "点赞最多";
        return "最近发布";
    }

    private PostMetric metricFor(String slug) {
        PostMetric metric = postMetrics == null ? null : postMetrics.get(slug);
        return metric == null ? new PostMetric() : metric;
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
            item.setOnClickListener(v -> openPostDetail(post));
            String updatedAt = postUpdatedAt(post);
            PostMetric metric = metricFor(post.slug);
            String meta = post.date + " · " + post.readingMinutes + " 分钟阅读 · " + metric.views + " 点击 · " + metric.likes + " 赞";
            if (!updatedAt.isEmpty() && !updatedAt.startsWith(post.date)) meta += " · 修改 " + updatedAt.substring(0, Math.min(10, updatedAt.length()));
            ((TextView) item.findViewById(R.id.post_meta)).setText(meta);
            ((TextView) item.findViewById(R.id.post_title)).setText(post.title);
            ((TextView) item.findViewById(R.id.post_summary)).setText(post.summary);
            ((TextView) item.findViewById(R.id.post_tags)).setText(TextTools.join(post.tags, "  "));
            item.setLayoutParams(margins(new LinearLayout.LayoutParams(-1, -2), 0, 0, 0, 12));
            homePostList.addView(item);
        }
    }

    private void openPostDetail(Post post) {
        renderPostDetail(post);
        if (backendAvailable) {
            runAsyncQuiet(() -> repository.recordPostView(post.slug), result -> {
                postMetrics = result;
                if ("detail".equals(currentPage) && post.slug.equals(currentDetailSlug)) renderPostDetail(post);
            }, error -> {
            });
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
        PostMetric metric = metricFor(post.slug);
        setText(page, R.id.detail_meta, "作者：Ralph Rong / Ra · " + post.date + " · " + post.readingMinutes + " 分钟阅读 · " + metric.views + " 点击 · " + metric.likes + " 赞");
        setText(page, R.id.detail_summary, post.summary);
        LinearLayout body = page.findViewById(R.id.detail_body);
        body.removeAllViews();
        if (isPasswordPost(post) && !unlockedPostSlugs.contains(post.slug)) {
            renderPostUnlock(body, post);
            return;
        }
        Button like = primaryButton("点赞 " + metric.likes);
        like.setOnClickListener(v -> {
            if (!backendAvailable) {
                toast("后台 API 暂不可用，稍后再点赞。");
                return;
            }
            runAsync(() -> repository.likePost(post.slug, deviceIdStore.visitorId()), result -> {
                postMetrics = result;
                toast("已记录点赞。");
                renderPostDetail(post);
            }, error -> toast("点赞失败：" + error.getMessage()));
        });
        body.addView(like);
        renderMarkdown(body, post.content);
        renderAttachments(body, post);
        if (isMessageRecordsVisible()) renderArticleMessages(body, post);
    }

    private void renderAttachments(LinearLayout parent, Post post) {
        if (post == null || post.attachments.isEmpty()) return;
        renderAttachmentList(parent, post.attachments, "文章附件");
    }

    private void renderAttachmentList(LinearLayout parent, List<PostAttachment> attachments, String heading) {
        if (attachments == null || attachments.isEmpty()) return;
        LinearLayout card = card();
        card.addView(label("RA ATTACHMENTS"));
        card.addView(title(heading, 20));
        for (PostAttachment attachment : attachments) {
            LinearLayout item = card();
            item.addView(title(attachment.name == null || attachment.name.isEmpty() ? attachment.fileName : attachment.name, 16));
            item.addView(paragraph((attachment.fileName == null ? "" : attachment.fileName)
                    + (attachment.size > 0 ? " · " + formatBytes(attachment.size) : "")));
            Button open = primaryButton(attachment.url == null || attachment.url.isEmpty() ? "保存附件" : "打开附件");
            open.setOnClickListener(v -> openAttachment(attachment));
            item.addView(open);
            card.addView(item);
        }
        parent.addView(card);
    }

    private void openAttachment(PostAttachment attachment) {
        try {
            if (attachment.url != null && !attachment.url.isEmpty()) {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(attachment.url)));
                return;
            }
            File file = saveDataUrlAttachment(attachment);
            toast("附件已保存：" + file.getAbsolutePath());
        } catch (Exception error) {
            toast("附件处理失败：" + error.getMessage());
        }
    }

    private File saveDataUrlAttachment(PostAttachment attachment) throws Exception {
        String dataUrl = attachment.dataUrl == null ? "" : attachment.dataUrl;
        int comma = dataUrl.indexOf(',');
        if (!dataUrl.startsWith("data:") || comma < 0) throw new IllegalArgumentException("附件数据无效");
        byte[] bytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT);
        File dir = new File(getExternalFilesDir(android.os.Environment.DIRECTORY_DOWNLOADS), "attachments");
        if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("无法创建附件目录");
        String cleanName = sanitizeFileName(attachment.fileName == null || attachment.fileName.isEmpty() ? attachment.name : attachment.fileName);
        File file = new File(dir, cleanName);
        try (FileOutputStream output = new FileOutputStream(file)) {
            output.write(bytes);
        }
        return file;
    }

    private String sanitizeFileName(String value) {
        String clean = String.valueOf(value == null ? "attachment" : value).replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        return clean.isEmpty() ? "attachment" : clean;
    }

    private String formatBytes(int size) {
        if (size < 1024) return size + " B";
        if (size < 1024 * 1024) return String.format(Locale.US, "%.1f KB", size / 1024f);
        return String.format(Locale.US, "%.1f MB", size / 1024f / 1024f);
    }

    private boolean isPasswordPost(Post post) {
        return post != null && "password".equals(post.visibility);
    }

    private void renderPostUnlock(LinearLayout body, Post post) {
        LinearLayout card = card();
        card.addView(title("这篇文章需要密码授权", 20));
        card.addView(paragraph("输入发布者设置的访问密码后，可以在本次打开 App 期间阅读正文。"));
        EditText password = input("访问密码");
        password.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);
        card.addView(password);
        Button unlock = primaryButton("授权阅读");
        unlock.setOnClickListener(v -> {
            if (!password.getText().toString().equals(post.accessPassword)) {
                toast("密码不正确，请重新输入。");
                return;
            }
            unlockedPostSlugs.add(post.slug);
            hideKeyboard(password);
            renderPostDetail(post);
        });
        card.addView(unlock);
        body.addView(card);
    }

    private void renderArticleMessages(LinearLayout parent, Post post) {
        LinearLayout card = card();
        card.addView(label("ARTICLE MESSAGES"));
        card.addView(title("文章留言", 20));
        EditText name = input("昵称，可留空");
        EditText message = multiline("写下这篇文章的留言", 3);
        TextView status = paragraph("正在同步留言...");
        Button submit = primaryButton("发布留言");
        LinearLayout list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        card.addView(name);
        card.addView(message);
        card.addView(submit);
        card.addView(status);
        card.addView(list);
        parent.addView(card);

        runAsync(() -> repository.fetchMessages(post.slug), result -> {
            status.setText(result.isEmpty() ? "还没有留言。" : "");
            renderMessageList(list, result);
        }, failure -> status.setText("留言同步失败：" + failure.getMessage()));

        submit.setOnClickListener(v -> {
            String cleanName = name.getText().toString().trim();
            String cleanMessage = message.getText().toString().trim();
            String validationError = validateMessage(cleanName, cleanMessage);
            if (!validationError.isEmpty()) {
                status.setText(validationError);
                return;
            }
            status.setText("正在发布留言...");
            hideKeyboard(message);
            runAsync(() -> repository.createMessage(cleanName, cleanMessage, post.slug), result -> {
                name.setText("");
                message.setText("");
                status.setText("留言已发布。");
                renderMessageList(list, result);
            }, failure -> status.setText("留言发布失败：" + failure.getMessage()));
        });
    }

    private void renderCodeRepository() {
        currentPage = "code";
        currentDetailSlug = "";
        if (!isCodeVisible()) {
            renderHiddenModule("代码库模块已在设置中关闭。");
            return;
        }
        selectTab(navCode);
        clear();

        LinearLayout page = card();
        page.addView(label("RA CODE LIBRARY"));
        page.addView(title("代码库", 24));
        page.addView(paragraph("存放可复用代码片段、排查脚本、工程模板和项目仓库说明。"));
        if (data == null || data.repositories.isEmpty()) {
            page.addView(paragraph("暂无代码库内容。"));
            content.addView(page);
            updateFloatingSort();
            return;
        }

        for (CodeRepository repo : data.repositories) {
            LinearLayout item = card();
            item.addView(label(repo.language == null || repo.language.isEmpty() ? "CODE" : repo.language));
            item.addView(title(repo.name, 20));
            if (repo.updatedAt != null && !repo.updatedAt.isEmpty()) item.addView(paragraph("更新：" + repo.updatedAt));
            if (repo.description != null && !repo.description.isEmpty()) item.addView(paragraph(repo.description));
            if (repo.sourcePath != null && !repo.sourcePath.isEmpty()) item.addView(paragraph("路径：" + repo.sourcePath));
            if (repo.snippet != null && !repo.snippet.isEmpty()) {
                TextView snippet = paragraph(repo.snippet);
                snippet.setTypeface(Typeface.MONOSPACE);
                snippet.setTextColor(TEXT);
                snippet.setBackgroundColor(Color.rgb(241, 245, 249));
                snippet.setPadding(dp(12), dp(10), dp(12), dp(10));
                item.addView(snippet);
            }
            item.setOnClickListener(v -> renderCodeDetail(repo));
            page.addView(item);
        }
        content.addView(page);
        updateFloatingSort();
    }

    private void renderCodeDetail(CodeRepository repo) {
        currentPage = "code";
        currentDetailSlug = "";
        selectTab(navCode);
        clear();

        LinearLayout page = card();
        Button back = secondaryButton("返回代码库");
        back.setOnClickListener(v -> renderCodeRepository());
        page.addView(back);
        page.addView(label(repo.language == null || repo.language.isEmpty() ? "CODE" : repo.language));
        page.addView(title(repo.name, 24));
        if (repo.updatedAt != null && !repo.updatedAt.isEmpty()) page.addView(paragraph("更新：" + repo.updatedAt));
        if (repo.sourcePath != null && !repo.sourcePath.isEmpty()) page.addView(paragraph("文件：" + codeFileName(repo)));
        if (repo.description != null && !repo.description.isEmpty()) page.addView(paragraph(repo.description));

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.setGravity(Gravity.START);
        Button save = primaryButton("保存代码");
        save.setOnClickListener(v -> saveCodeSnippet(repo));
        actions.addView(save);
        if (repo.url != null && !repo.url.isEmpty()) {
            Button open = secondaryButton("打开仓库");
            open.setOnClickListener(v -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(repo.url))));
            actions.addView(open);
        }
        page.addView(actions);

        if (repo.snippet != null && !repo.snippet.isEmpty()) {
            TextView snippet = paragraph(formatCodeSnippet(repo.snippet, repo.language));
            snippet.setTypeface(Typeface.MONOSPACE);
            snippet.setTextColor(Color.WHITE);
            snippet.setBackgroundColor(Color.rgb(2, 6, 23));
            snippet.setPadding(dp(12), dp(10), dp(12), dp(10));
            page.addView(snippet);
        }
        if (repo.notes != null && !repo.notes.isEmpty()) page.addView(paragraph(repo.notes));
        renderAttachmentList(page, repo.attachments, "代码附件");
        content.addView(page);
        updateFloatingSort();
    }

    private void saveCodeSnippet(CodeRepository repo) {
        try {
            File dir = new File(getExternalFilesDir(android.os.Environment.DIRECTORY_DOWNLOADS), "code");
            if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("无法创建代码目录");
            File file = new File(dir, codeFileName(repo));
            try (FileOutputStream output = new FileOutputStream(file)) {
                output.write(formatCodeSnippet(repo.snippet, repo.language).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            }
            toast("代码已保存：" + file.getAbsolutePath());
        } catch (Exception error) {
            toast("代码保存失败：" + error.getMessage());
        }
    }

    private String codeFileName(CodeRepository repo) {
        String base = sanitizeFileName(repo.name == null || repo.name.isEmpty() ? repo.id : repo.name);
        return base + "." + codeExtension(repo.language);
    }

    private String codeExtension(String language) {
        String clean = String.valueOf(language == null ? "" : language).trim().toLowerCase(Locale.US);
        if (clean.equals("c")) return "c";
        if (clean.equals("c++") || clean.equals("cpp")) return "cpp";
        if (clean.equals("python")) return "py";
        if (clean.equals("java")) return "java";
        if (clean.equals("kotlin") || clean.equals("kt")) return "kt";
        if (clean.equals("javascript") || clean.equals("js")) return "js";
        if (clean.equals("typescript") || clean.equals("ts")) return "ts";
        if (clean.equals("shell") || clean.equals("adb")) return "sh";
        if (clean.equals("xml")) return "xml";
        if (clean.equals("json")) return "json";
        if (clean.equals("markdown") || clean.equals("md")) return "md";
        if (clean.equals("swift")) return "swift";
        if (clean.equals("go")) return "go";
        if (clean.equals("rust")) return "rs";
        if (clean.equals("gradle")) return "gradle";
        if (clean.equals("sql")) return "sql";
        if (clean.equals("yaml")) return "yml";
        return clean.replaceAll("[^a-z0-9]", "").isEmpty() ? "txt" : clean.replaceAll("[^a-z0-9]", "");
    }

    private String formatCodeSnippet(String source, String language) {
        String code = String.valueOf(source == null ? "" : source).replace("\r\n", "\n").replace("\r", "\n").trim();
        String clean = String.valueOf(language == null ? "" : language).trim().toLowerCase(Locale.US);
        if (clean.equals("json")) {
            try {
                return new JSONObject(code).toString(2);
            } catch (Exception ignored) {
                try {
                    return new JSONArray(code).toString(2);
                } catch (Exception ignoredAgain) {
                    return code;
                }
            }
        }
        if (clean.equals("c") || clean.equals("c++") || clean.equals("java") || clean.equals("kotlin")
                || clean.equals("javascript") || clean.equals("typescript") || clean.equals("swift")
                || clean.equals("go") || clean.equals("rust") || clean.equals("gradle")) {
            return formatBracedCode(code);
        }
        return code;
    }

    private String formatBracedCode(String code) {
        String[] lines = code.replaceAll("\\{\\s*", "{\n")
                .replaceAll("\\s*\\}", "\n}")
                .replaceAll(";\\s*", ";\n")
                .replaceAll("\\n{2,}", "\n")
                .split("\n");
        StringBuilder out = new StringBuilder();
        int level = 0;
        for (String line : lines) {
            String clean = line.trim();
            if (clean.isEmpty()) continue;
            if (clean.startsWith("}")) level = Math.max(0, level - 1);
            for (int i = 0; i < level; i++) out.append("  ");
            out.append(clean).append('\n');
            if (clean.endsWith("{")) level++;
        }
        return out.toString().trim();
    }

    private void renderProfile() {
        currentPage = "profile";
        currentDetailSlug = "";
        if (!isProfileVisible()) {
            renderHiddenModule("简历模块已在设置中关闭。");
            return;
        }
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

    private void renderGuestbook() {
        currentPage = "guestbook";
        currentDetailSlug = "";
        if (!isAnyGuestbookFeatureVisible()) {
            renderHiddenModule("留言记录和语音留言都已在设置中关闭。");
            return;
        }
        selectTab(navGuestbook);
        clear();

        LinearLayout composer = card();
        composer.addView(label("RA GUESTBOOK"));
        composer.addView(title("留言板", 24));
        if (isVoiceMessageVisible()) {
            LinearLayout voiceZone = card();
            voiceZone.addView(label("VOICE MESSAGE"));
            voiceZone.addView(title("语音留言专区", 22));
            voiceZone.addView(paragraph("录制 16KHz 语音留言，支持本地播放和导出。"));
            Button voiceButton = primaryButton("进入语音留言");
            voiceButton.setOnClickListener(v -> startActivity(new Intent(this, VoiceMessageActivity.class)));
            voiceZone.addView(voiceButton);
            content.addView(voiceZone);
        }

        EditText name = input("昵称，可留空");
        EditText message = multiline("给 Ra 留句话", 4);
        TextView status = paragraph("正在同步留言...");
        Button submit = primaryButton("发布留言");
        composer.addView(name);
        composer.addView(message);
        composer.addView(submit);
        composer.addView(status);
        content.addView(composer);

        LinearLayout list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        if (isMessageRecordsVisible()) {
            LinearLayout listCard = card();
            listCard.addView(label("PUBLIC MESSAGES"));
            listCard.addView(list);
            content.addView(listCard);
        }

        if (isMessageRecordsVisible()) {
            renderMessageList(list);
            runAsync(() -> repository.fetchMessages(), result -> {
                guestMessages = result;
                status.setText(result.isEmpty() ? "还没有留言，欢迎写下第一条。" : "留言已同步。");
                renderMessageList(list);
            }, failure -> status.setText("留言同步失败：" + failure.getMessage()));
        } else {
            status.setText("留言记录显示已在设置中关闭。");
        }

        submit.setOnClickListener(v -> {
            String cleanName = name.getText().toString().trim();
            String cleanMessage = message.getText().toString().trim();
            String validationError = validateMessage(cleanName, cleanMessage);
            if (!validationError.isEmpty()) {
                status.setText(validationError);
                return;
            }
            status.setText("正在发布留言...");
            hideKeyboard(message);
            runAsync(() -> repository.createMessage(cleanName, cleanMessage), result -> {
                guestMessages = result;
                name.setText("");
                message.setText("");
                status.setText("留言已发布，全站可见。");
                if (isMessageRecordsVisible()) renderMessageList(list);
            }, failure -> status.setText("留言发布失败：" + failure.getMessage()));
        });
    }

    private void renderMessageList(LinearLayout list) {
        renderMessageList(list, guestMessages);
    }

    private void renderMessageList(LinearLayout list, List<GuestMessage> messages) {
        if (list == null) return;
        list.removeAllViews();
        if (messages == null || messages.isEmpty()) {
            list.addView(paragraph("暂无留言。"));
            return;
        }
        for (GuestMessage item : messages) {
            LinearLayout block = new LinearLayout(this);
            block.setOrientation(LinearLayout.VERTICAL);
            block.setPadding(0, dp(10), 0, dp(10));
            TextView header = text((item.name == null || item.name.isEmpty() ? "陌生朋友" : item.name)
                    + " · " + formatDate(item.createdAt), 13, PRIMARY, Typeface.BOLD);
            block.addView(header);
            block.addView(paragraph(item.message));
            list.addView(block);
        }
    }

    private String validateMessage(String name, String message) {
        String source = ((name == null ? "" : name) + " " + (message == null ? "" : message)).replaceAll("\\s+", " ").trim();
        if (message == null || message.trim().length() < 2) return "留言至少需要 2 个字。";
        if (message.trim().length() > 240) return "留言最多 240 个字。";
        String lower = source.toLowerCase(Locale.US);
        String[] blocked = new String[]{"傻逼", "傻b", "煞笔", "蠢货", "废物", "去死", "滚蛋", "妈的", "操你", "草你", "fuck", "shit", "bitch", "nazi", "恐怖主义", "炸弹", "枪支", "毒品", "博彩", "赌博", "色情"};
        for (String word : blocked) {
            if (lower.contains(word)) return "留言包含明显不友好的词汇，请调整后再发布。";
        }
        return "";
    }

    private void renderStats() {
        currentPage = "stats";
        currentDetailSlug = "";
        if (!isStatsVisible()) {
            renderHiddenModule("统计模块已在设置中关闭。");
            return;
        }
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

    private void renderSettings() {
        currentPage = "settings";
        currentDetailSlug = "";
        selectTab(navSettings);
        clear();

        LinearLayout page = card();
        page.addView(label("APP SETTINGS"));
        page.addView(title("设置", 24));
        page.addView(paragraph("控制 App 旋转和各个模块是否显示。"));
        page.addView(settingCheckBox("允许 App 旋转", KEY_ROTATION_ENABLED, true, checked -> {
            applyRotationPreference();
            toast(checked ? "已允许 App 旋转。" : "已锁定为竖屏。");
        }));
        page.addView(settingCheckBox("显示代码库模块", KEY_CODE_VISIBLE, true, checked -> updateNavigation()));
        page.addView(settingCheckBox("显示简历模块", KEY_PROFILE_VISIBLE, true, checked -> updateNavigation()));
        page.addView(settingCheckBox("显示统计模块", KEY_STATS_VISIBLE, true, checked -> updateNavigation()));
        page.addView(settingCheckBox("显示留言记录", KEY_MESSAGE_RECORDS_VISIBLE, true, checked -> updateNavigation()));
        page.addView(settingCheckBox("显示语音留言", KEY_VOICE_MESSAGE_VISIBLE, true, checked -> updateNavigation()));
        content.addView(page);
    }

    private void renderHiddenModule(String message) {
        selectTab(navSettings);
        clear();
        LinearLayout page = card();
        page.addView(label("MODULE HIDDEN"));
        page.addView(title("模块已关闭", 22));
        page.addView(paragraph(message));
        Button settings = primaryButton("前往设置");
        settings.setOnClickListener(v -> renderSettings());
        page.addView(settings);
        content.addView(page);
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
        CheckBox passwordVisible = page.findViewById(R.id.editor_password_visible);
        EditText accessPassword = page.findViewById(R.id.editor_access_password);
        EditText summary = page.findViewById(R.id.editor_summary);
        EditText contentText = page.findViewById(R.id.editor_content);
        if (selectedAdminPost != null) {
            title.setText(selectedAdminPost.title);
            date.setText(selectedAdminPost.date);
            tags.setText(TextTools.join(selectedAdminPost.tags, ", "));
            passwordVisible.setChecked("password".equals(selectedAdminPost.visibility));
            accessPassword.setText(selectedAdminPost.accessPassword);
            accessPassword.setEnabled(passwordVisible.isChecked());
            summary.setText(selectedAdminPost.summary);
            contentText.setText(selectedAdminPost.content);
        }
        passwordVisible.setOnCheckedChangeListener((buttonView, isChecked) -> {
            accessPassword.setEnabled(isChecked);
            if (!isChecked) accessPassword.setText("");
        });

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
            post.visibility = passwordVisible.isChecked() ? "password" : "public";
            post.accessPassword = passwordVisible.isChecked() ? accessPassword.getText().toString().trim() : "";
            if ("password".equals(post.visibility) && post.accessPassword.isEmpty()) {
                toast("密码可见文章需要填写访问密码。");
                return;
            }
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
        String[] lines = markdown == null ? new String[0] : markdown.replace("\r\n", "\n").replace("\r", "\n").split("\\n", -1);
        boolean inCode = false;
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < lines.length; i++) {
            String raw = lines[i];
            String line = raw.trim();
            if (line.startsWith("```")) {
                if (inCode) {
                    parent.addView(monoText(code.toString(), 13, TEXT));
                    code.setLength(0);
                    inCode = false;
                } else {
                    inCode = true;
                }
            } else if (inCode) {
                if (code.length() > 0) code.append("\n");
                code.append(raw);
            } else if (isSetextUnderline(line) && parent.getChildCount() == 0) {
                parent.addView(spacer(6));
            } else if (i + 1 < lines.length && isSetextUnderline(lines[i + 1].trim()) && !line.isEmpty()) {
                parent.addView(title(line, lines[i + 1].trim().startsWith("=") ? 22 : 20));
                i++;
            } else if (line.isEmpty()) {
                parent.addView(spacer(6));
            } else if (line.startsWith("# ")) {
                parent.addView(title(line.substring(2), 22));
            } else if (line.startsWith("## ")) {
                parent.addView(title(line.substring(3), 20));
            } else if (line.startsWith("### ")) {
                parent.addView(title(line.substring(4), 18));
            } else if (line.startsWith("- ") || line.startsWith("* ")) {
                parent.addView(bullet(line.substring(2)));
            } else {
                parent.addView(paragraph(raw));
            }
        }
        if (code.length() > 0) parent.addView(monoText(code.toString(), 13, TEXT));
    }

    private boolean isSetextUnderline(String line) {
        return line != null && line.length() >= 3 && (line.matches("=+") || line.matches("-+"));
    }

    private void clear() {
        mainHandler.removeCallbacks(promoTicker);
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

    private CheckBox settingCheckBox(String label, String key, boolean defaultValue, SettingChangeHandler handler) {
        CheckBox box = new CheckBox(this);
        box.setText(label);
        box.setTextColor(TEXT);
        box.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        box.setTextSize(16);
        box.setButtonTintList(android.content.res.ColorStateList.valueOf(PRIMARY));
        box.setPadding(0, dp(8), 0, dp(8));
        box.setChecked(settingEnabled(key, defaultValue));
        box.setLayoutParams(margins(new LinearLayout.LayoutParams(-1, -2), 0, 2, 0, 2));
        box.setOnCheckedChangeListener((buttonView, checked) -> {
            appSettings.edit().putBoolean(key, checked).apply();
            if (handler != null) handler.onChanged(checked);
        });
        return box;
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
        TextView[] tabs = new TextView[]{navArticles, navCode, navProfile, navGuestbook, navStats, navAdmin, navSettings};
        for (TextView tab : tabs) {
            if (tab == null) continue;
            boolean selected = tab == active;
            tab.setTextColor(selected ? Color.WHITE : PRIMARY);
            tab.setBackgroundResource(selected ? R.drawable.bg_button_primary : R.drawable.bg_button_secondary);
        }
    }

    private void updateNavigation() {
        boolean readOnly = data != null && (data.offlineMode || !backendAvailable);
        if (navCode != null) navCode.setVisibility(isCodeVisible() ? View.VISIBLE : View.GONE);
        if (navProfile != null) navProfile.setVisibility(isProfileVisible() ? View.VISIBLE : View.GONE);
        if (navStats != null) navStats.setVisibility(!readOnly && isStatsVisible() ? View.VISIBLE : View.GONE);
        if (navAdmin != null) navAdmin.setVisibility(readOnly ? View.GONE : View.VISIBLE);
        if (navGuestbook != null) navGuestbook.setVisibility(isAnyGuestbookFeatureVisible() ? View.VISIBLE : View.GONE);
        if ("code".equals(currentPage) && !isCodeVisible()) renderHome();
        if ("profile".equals(currentPage) && !isProfileVisible()) renderHome();
        if ("stats".equals(currentPage) && (!isStatsVisible() || readOnly)) renderHome();
        if ("guestbook".equals(currentPage) && !isAnyGuestbookFeatureVisible()) renderHome();
    }

    private boolean settingEnabled(String key, boolean defaultValue) {
        return appSettings == null || appSettings.getBoolean(key, defaultValue);
    }

    private boolean isRotationEnabled() {
        return settingEnabled(KEY_ROTATION_ENABLED, true);
    }

    private boolean isProfileVisible() {
        return settingEnabled(KEY_PROFILE_VISIBLE, true);
    }

    private boolean isCodeVisible() {
        return settingEnabled(KEY_CODE_VISIBLE, true);
    }

    private boolean isStatsVisible() {
        return settingEnabled(KEY_STATS_VISIBLE, true);
    }

    private boolean isMessageRecordsVisible() {
        return settingEnabled(KEY_MESSAGE_RECORDS_VISIBLE, true);
    }

    private boolean isVoiceMessageVisible() {
        return settingEnabled(KEY_VOICE_MESSAGE_VISIBLE, true);
    }

    private boolean isAnyGuestbookFeatureVisible() {
        return isMessageRecordsVisible() || isVoiceMessageVisible();
    }

    private void applyRotationPreference() {
        if (isRotationEnabled()) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR);
        } else {
            stopRotationDebugLogging();
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        }
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

    private interface SettingChangeHandler {
        void onChanged(boolean checked);
    }

    private static class RotationGuess {
        final String candidate;
        final String reason;
        final float horizontalG;
        final float totalG;

        RotationGuess(String candidate, String reason, float horizontalG, float totalG) {
            this.candidate = candidate;
            this.reason = reason;
            this.horizontalG = horizontalG;
            this.totalG = totalG;
        }
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
