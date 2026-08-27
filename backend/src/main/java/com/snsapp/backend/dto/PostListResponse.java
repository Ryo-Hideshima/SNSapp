package com.snsapp.backend.dto;

import java.util.List;

public record PostListResponse(
        List<PostResponse> posts,
        int page,
        int size,
        boolean hasMore
) {
}
