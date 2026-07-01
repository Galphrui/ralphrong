package com.ralph.notes;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.media.MediaPlayer;
import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;
import java.io.FileInputStream;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class VoiceMessageActivity extends Activity {
    private static final String PREFS_NAME = "ra_app_settings";
    private static final String KEY_ROTATION_ENABLED = "rotation_enabled";
    private static final int BG = Color.rgb(246, 251, 248);
    private static final int PANEL = Color.WHITE;
    private static final int PRIMARY = Color.rgb(7, 95, 81);
    private static final int TEXT = Color.rgb(2, 6, 23);
    private static final int MUTED = Color.rgb(100, 116, 139);
    private static final int REQUEST_RECORD_AUDIO = 41;
    private static final int REQUEST_EXPORT_AUDIO = 42;
    private static final int SAMPLE_RATE = 16000;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private MediaRecorder recorder;
    private MediaPlayer player;
    private SharedPreferences appSettings;
    private File currentFile;
    private long recordStartedAt;
    private boolean recording;
    private boolean playing;
    private TextView status;
    private TextView fileLabel;
    private TextView durationLabel;
    private Button recordButton;
    private Button playButton;
    private Button exportButton;
    private final Runnable timer = new Runnable() {
        @Override
        public void run() {
            updateDuration();
            if (recording) handler.postDelayed(this, 500);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        appSettings = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        applyRotationPreference();
        configureSystemBars();
        buildUi();
        loadLatestRecording();
    }

    @Override
    protected void onResume() {
        super.onResume();
        applyRotationPreference();
    }

    @Override
    protected void onPause() {
        if (recording) stopRecording();
        if (playing) stopPlayback();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        releaseRecorder();
        releasePlayer();
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_RECORD_AUDIO
                && grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startRecording();
        } else if (requestCode == REQUEST_RECORD_AUDIO) {
            setStatus("需要麦克风权限才能录制语音留言。");
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_EXPORT_AUDIO && resultCode == RESULT_OK && data != null && data.getData() != null) {
            exportTo(data.getData());
        }
    }

    private void configureSystemBars() {
        getWindow().setStatusBarColor(PANEL);
        getWindow().setNavigationBarColor(BG);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }
    }

    private void applyRotationPreference() {
        boolean rotationEnabled = appSettings == null || appSettings.getBoolean(KEY_ROTATION_ENABLED, true);
        setRequestedOrientation(rotationEnabled
                ? ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR
                : ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
    }

    private void buildUi() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);

        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setPadding(dp(18), dp(18), dp(18), dp(18));
        scroll.addView(page, new ScrollView.LayoutParams(-1, -2));

        LinearLayout header = card();
        header.addView(label("VOICE MESSAGE"));
        header.addView(title("语音留言专区", 26));
        header.addView(paragraph("采样率 16KHz，录音文件保存为 mp3，录完后可在本页播放或导出。"));
        page.addView(header);

        LinearLayout recorderCard = card();
        recorderCard.addView(label("RECORDER"));
        durationLabel = text("00:00", 34, PRIMARY, Typeface.BOLD);
        durationLabel.setGravity(Gravity.CENTER);
        durationLabel.setPadding(0, dp(8), 0, dp(8));
        recorderCard.addView(durationLabel);

        status = paragraph("点击开始录音。");
        fileLabel = paragraph("暂无本地语音留言。");
        recordButton = primaryButton("开始录音");
        playButton = secondaryButton("播放");
        exportButton = secondaryButton("导出");

        recordButton.setOnClickListener(v -> {
            if (recording) stopRecording();
            else ensurePermissionAndRecord();
        });
        playButton.setOnClickListener(v -> {
            if (playing) stopPlayback();
            else startPlayback();
        });
        exportButton.setOnClickListener(v -> startExport());

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.addView(playButton);
        actions.addView(exportButton);

        recorderCard.addView(recordButton);
        recorderCard.addView(actions);
        recorderCard.addView(fileLabel);
        recorderCard.addView(status);
        page.addView(recorderCard);

        Button back = secondaryButton("返回留言板");
        back.setOnClickListener(v -> finish());
        page.addView(back);

        setContentView(scroll);
        updateActionButtons();
    }

    private void ensurePermissionAndRecord() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQUEST_RECORD_AUDIO);
            return;
        }
        startRecording();
    }

    private void startRecording() {
        try {
            stopPlayback();
            currentFile = createOutputFile();
            recorder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? new MediaRecorder(this) : new MediaRecorder();
            recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            recorder.setAudioSamplingRate(SAMPLE_RATE);
            recorder.setAudioChannels(1);
            recorder.setAudioEncodingBitRate(64000);
            recorder.setOutputFile(currentFile.getAbsolutePath());
            recorder.prepare();
            recorder.start();
            recording = true;
            recordStartedAt = System.currentTimeMillis();
            recordButton.setText("停止录音");
            setStatus("正在录音...");
            updateActionButtons();
            handler.post(timer);
        } catch (Exception error) {
            releaseRecorder();
            recording = false;
            setStatus("录音启动失败：" + error.getMessage());
            updateActionButtons();
        }
    }

    private void stopRecording() {
        try {
            if (recorder != null) recorder.stop();
            setStatus("录音已保存。");
        } catch (Exception error) {
            setStatus("录音结束失败：" + error.getMessage());
        } finally {
            releaseRecorder();
            recording = false;
            recordButton.setText("重新录音");
            updateFileLabel();
            updateActionButtons();
        }
    }

    private void startPlayback() {
        if (!hasRecording()) {
            setStatus("请先录制一条语音留言。");
            return;
        }
        try {
            player = new MediaPlayer();
            player.setDataSource(currentFile.getAbsolutePath());
            player.setOnCompletionListener(mp -> stopPlayback());
            player.prepare();
            player.start();
            playing = true;
            playButton.setText("停止");
            setStatus("正在本地播放...");
        } catch (Exception error) {
            releasePlayer();
            playing = false;
            setStatus("播放失败：" + error.getMessage());
        }
    }

    private void stopPlayback() {
        if (player != null) {
            try {
                player.stop();
            } catch (Exception ignored) {
            }
        }
        releasePlayer();
        playing = false;
        if (playButton != null) playButton.setText("播放");
    }

    private void startExport() {
        if (!hasRecording()) {
            setStatus("请先录制一条语音留言。");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("audio/mpeg");
        intent.putExtra(Intent.EXTRA_TITLE, currentFile.getName());
        startActivityForResult(intent, REQUEST_EXPORT_AUDIO);
    }

    private void exportTo(Uri uri) {
        try (FileInputStream input = new FileInputStream(currentFile);
             OutputStream output = getContentResolver().openOutputStream(uri)) {
            if (output == null) throw new IllegalStateException("无法打开导出位置");
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            setStatus("语音留言已导出。");
        } catch (Exception error) {
            setStatus("导出失败：" + error.getMessage());
        }
    }

    private File createOutputFile() {
        File dir = new File(getExternalFilesDir(Environment.DIRECTORY_MUSIC), "voice-messages");
        if (!dir.exists()) dir.mkdirs();
        String stamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        return new File(dir, "voice_message_" + stamp + ".mp3");
    }

    private void loadLatestRecording() {
        File dir = new File(getExternalFilesDir(Environment.DIRECTORY_MUSIC), "voice-messages");
        File[] files = dir.listFiles((file, name) -> name.endsWith(".mp3"));
        if (files == null || files.length == 0) {
            updateFileLabel();
            updateActionButtons();
            return;
        }
        File latest = files[0];
        for (File file : files) {
            if (file.lastModified() > latest.lastModified()) latest = file;
        }
        currentFile = latest;
        updateFileLabel();
        updateActionButtons();
    }

    private void updateDuration() {
        long elapsed = recording ? System.currentTimeMillis() - recordStartedAt : 0L;
        long seconds = elapsed / 1000L;
        durationLabel.setText(String.format(Locale.US, "%02d:%02d", seconds / 60L, seconds % 60L));
    }

    private void updateFileLabel() {
        if (!hasRecording()) {
            fileLabel.setText("暂无本地语音留言。");
            durationLabel.setText("00:00");
            return;
        }
        fileLabel.setText(currentFile.getName() + " · " + Math.max(1, currentFile.length() / 1024L) + " KB");
    }

    private void updateActionButtons() {
        boolean hasRecording = hasRecording() && !recording;
        if (playButton != null) playButton.setEnabled(hasRecording);
        if (exportButton != null) exportButton.setEnabled(hasRecording);
    }

    private boolean hasRecording() {
        return currentFile != null && currentFile.exists() && currentFile.length() > 0L;
    }

    private void releaseRecorder() {
        if (recorder != null) {
            recorder.release();
            recorder = null;
        }
        handler.removeCallbacks(timer);
    }

    private void releasePlayer() {
        if (player != null) {
            player.release();
            player = null;
        }
    }

    private void setStatus(String value) {
        if (status != null) status.setText(value == null ? "" : value);
        Toast.makeText(this, value == null ? "操作完成" : value, Toast.LENGTH_SHORT).show();
    }

    private LinearLayout card() {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(16), dp(16), dp(16), dp(16));
        card.setBackgroundResource(R.drawable.bg_panel);
        card.setLayoutParams(margins(new LinearLayout.LayoutParams(-1, -2), 0, 0, 0, 12));
        return card;
    }

    private TextView label(String value) {
        TextView label = text(value, 12, PRIMARY, Typeface.BOLD);
        label.setAllCaps(true);
        return label;
    }

    private TextView title(String value, int size) {
        TextView title = text(value, size, TEXT, Typeface.BOLD);
        title.setPadding(0, dp(6), 0, dp(6));
        title.setLineSpacing(dp(2), 1.02f);
        return title;
    }

    private TextView paragraph(String value) {
        TextView text = text(value, 15, MUTED, Typeface.NORMAL);
        text.setLineSpacing(dp(2), 1.05f);
        text.setPadding(0, dp(4), 0, dp(6));
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

    private LinearLayout.LayoutParams margins(LinearLayout.LayoutParams params, int left, int top, int right, int bottom) {
        params.setMargins(dp(left), dp(top), dp(right), dp(bottom));
        return params;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
