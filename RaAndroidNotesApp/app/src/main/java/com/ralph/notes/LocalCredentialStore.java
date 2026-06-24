package com.ralph.notes;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;

import java.security.SecureRandom;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

public class LocalCredentialStore {
    private static final String PREF = "ra_local_admin";
    private static final String KEY_USER = "username";
    private static final String KEY_SALT = "salt";
    private static final String KEY_HASH = "hash";
    private static final int ITERATIONS = 120000;
    private static final int KEY_LENGTH = 256;

    private final SharedPreferences preferences;
    private boolean unlocked;

    public LocalCredentialStore(Context context) {
        preferences = context.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    public boolean hasLocalAccount() {
        return preferences.contains(KEY_USER) && preferences.contains(KEY_HASH) && preferences.contains(KEY_SALT);
    }

    public boolean isUnlocked() {
        return unlocked;
    }

    public String username() {
        return preferences.getString(KEY_USER, "");
    }

    public void register(String username, String password) throws Exception {
        validate(username, password);
        byte[] salt = new byte[16];
        new SecureRandom().nextBytes(salt);
        String hash = hash(password, salt);
        preferences.edit()
                .putString(KEY_USER, username.trim())
                .putString(KEY_SALT, Base64.encodeToString(salt, Base64.NO_WRAP))
                .putString(KEY_HASH, hash)
                .apply();
        unlocked = true;
    }

    public boolean unlock(String password) throws Exception {
        String saltText = preferences.getString(KEY_SALT, "");
        String expected = preferences.getString(KEY_HASH, "");
        if (saltText.isEmpty() || expected.isEmpty()) return false;
        byte[] salt = Base64.decode(saltText, Base64.NO_WRAP);
        unlocked = slowEquals(expected, hash(password, salt));
        return unlocked;
    }

    public void changePassword(String oldPassword, String newPassword) throws Exception {
        if (!unlock(oldPassword)) throw new IllegalStateException("本机旧密码错误。");
        register(username(), newPassword);
    }

    public void lock() {
        unlocked = false;
    }

    private void validate(String username, String password) {
        if (username == null || username.trim().length() < 2) {
            throw new IllegalArgumentException("本机账号至少 2 个字符。");
        }
        if (password == null || password.length() < 6) {
            throw new IllegalArgumentException("本机密码至少 6 位。");
        }
    }

    private String hash(String password, byte[] salt) throws Exception {
        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, ITERATIONS, KEY_LENGTH);
        byte[] encoded = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        return Base64.encodeToString(encoded, Base64.NO_WRAP);
    }

    private boolean slowEquals(String left, String right) {
        int diff = left.length() ^ right.length();
        for (int i = 0; i < left.length() && i < right.length(); i++) {
            diff |= left.charAt(i) ^ right.charAt(i);
        }
        return diff == 0;
    }
}
