package com.snsapp.backend.dto;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        Long userId,
        String username,
        String displayName
) {
}
