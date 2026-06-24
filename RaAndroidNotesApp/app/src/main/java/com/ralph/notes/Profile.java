package com.ralph.notes;

import java.util.ArrayList;
import java.util.List;

public class Profile {
    public String name = "Ralph Rong / Ra";
    public String headline = "";
    public String summary = "";
    public String intent = "";
    public String photoUrl = "";
    public final List<String> contacts = new ArrayList<>();
    public final List<String> advantages = new ArrayList<>();
    public final List<SkillGroup> skills = new ArrayList<>();
    public final List<ExperienceItem> workExperience = new ArrayList<>();
    public final List<ExperienceItem> projects = new ArrayList<>();
    public final List<ExperienceItem> education = new ArrayList<>();
    public final List<String> selfReview = new ArrayList<>();
    public final List<ResumeSection> sections = new ArrayList<>();
}
