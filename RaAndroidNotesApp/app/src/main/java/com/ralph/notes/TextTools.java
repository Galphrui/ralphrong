package com.ralph.notes;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public final class TextTools {
    private TextTools() {
    }

    public static String join(List<String> values, String separator) {
        StringBuilder builder = new StringBuilder();
        for (String value : values) {
            if (value == null || value.trim().isEmpty()) continue;
            if (builder.length() > 0) builder.append(separator);
            builder.append(value.trim());
        }
        return builder.toString();
    }

    public static List<String> splitLines(String text) {
        List<String> out = new ArrayList<>();
        if (text == null) return out;
        String[] lines = text.split("\\n");
        for (String line : lines) {
            String value = line.trim();
            if (!value.isEmpty()) out.add(value);
        }
        return out;
    }

    public static List<String> splitTags(String text) {
        List<String> out = new ArrayList<>();
        if (text == null) return out;
        String[] tags = text.split("[,，]");
        for (String tag : tags) {
            String value = tag.trim();
            if (!value.isEmpty()) out.add(value);
        }
        return out;
    }

    public static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    public static String slugify(String text) {
        String source = text == null ? "" : text.trim().toLowerCase(Locale.US);
        String slug = source.replaceAll("[^a-z0-9\\u4e00-\\u9fa5]+", "-");
        slug = slug.replaceAll("^-+", "").replaceAll("-+$", "");
        if (slug.isEmpty()) slug = "ra-note-" + System.currentTimeMillis();
        return slug;
    }

    public static Bitmap decodeDataImage(String dataUrl) {
        if (dataUrl == null || !dataUrl.startsWith("data:image")) return null;
        int comma = dataUrl.indexOf(',');
        if (comma < 0) return null;
        byte[] bytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT);
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
    }
}
