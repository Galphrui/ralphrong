package com.ralph.notes;

import java.util.ArrayList;
import java.util.List;

public class Post {
    public String title = "";
    public String slug = "";
    public String date = "";
    public String createdAt = "";
    public String updatedAt = "";
    public String summary = "";
    public String content = "";
    public String visibility = "public";
    public String accessPassword = "";
    public int readingMinutes = 3;
    public final List<String> tags = new ArrayList<>();
    public final List<PostAttachment> attachments = new ArrayList<>();
}
