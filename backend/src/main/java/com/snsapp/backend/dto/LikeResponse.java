package com.snsapp.backend.dto;

public record LikeResponse(
        boolean liked,
        long likeCount
) {
}
