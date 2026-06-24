package com.ralph.notes;

import android.content.Context;
import android.content.SharedPreferences;

import java.util.Locale;
import java.util.UUID;

public class DeviceIdStore {
    private static final String PREF = "ra_device";
    private static final String KEY_VISITOR = "visitor_id";

    private final SharedPreferences preferences;

    public DeviceIdStore(Context context) {
        preferences = context.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    public String visitorId() {
        String existing = preferences.getString(KEY_VISITOR, "");
        if (!existing.isEmpty()) return existing;
        String next = "RA-ANDROID-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase(Locale.US);
        preferences.edit().putString(KEY_VISITOR, next).apply();
        return next;
    }
}
