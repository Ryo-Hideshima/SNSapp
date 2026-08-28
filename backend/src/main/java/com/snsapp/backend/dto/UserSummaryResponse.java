package com.snsapp.backend.dto;

/**
 * フォロー中一覧／フォロワー一覧用の軽量なユーザー表示。MyBatisのマッピング先も兼ねる。
 */
public class UserSummaryResponse {

    private Long id;
    private String username;
    private String displayName;
    private String avatarUrl;
    private boolean followedByCurrentUser;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public boolean isFollowedByCurrentUser() {
        return followedByCurrentUser;
    }

    public void setFollowedByCurrentUser(boolean followedByCurrentUser) {
        this.followedByCurrentUser = followedByCurrentUser;
    }
}
