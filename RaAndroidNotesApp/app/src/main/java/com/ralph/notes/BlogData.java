package com.ralph.notes;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class BlogData {
    public JSONObject raw;
    public String title = "Ra Android Notes";
    public String subtitle = "工程实践与调试笔记";
    public Profile profile = new Profile();
    public final List<Post> posts = new ArrayList<>();
    public boolean offlineMode;
    public boolean fromCache;
    public String sourceMessage = "";
}
