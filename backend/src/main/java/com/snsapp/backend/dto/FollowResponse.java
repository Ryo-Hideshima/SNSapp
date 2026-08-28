package com.snsapp.backend.dto;

public record FollowResponse(
        boolean followed,
        long followerCount
) {
}
