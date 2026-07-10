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
    public final List<CodeRepository> repositories = new ArrayList<>();
    public final List<Post> tools = new ArrayList<>();
    public final List<Post> devLogs = new ArrayList<>();
    public final List<ModuleEntry> modules = new ArrayList<>();
    public int maxTopModules = 6;
    public String globalDisplayStyle = "list";
    public boolean offlineMode;
    public boolean fromCache;
    public String sourceMessage = "";
}
