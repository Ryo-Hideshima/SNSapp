package com.snsapp.backend.dto;

public record AuthResponse(
        String token,
        Long userId,
        String username,
        String displayName
) {
}
