package com.ralph.notes;

import java.util.ArrayList;
import java.util.List;

public class CodeRepository {
    public String id = "";
    public String name = "";
    public String fileName = "";
    public String description = "";
    public String language = "";
    public String url = "";
    public String sourcePath = "";
    public String updatedAt = "";
    public String snippet = "";
    public String notes = "";
    public final List<String> tags = new ArrayList<>();
    public final List<PostAttachment> attachments = new ArrayList<>();
}
