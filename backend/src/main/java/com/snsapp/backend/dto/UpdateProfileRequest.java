package com.snsapp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank
        @Size(max = 50, message = "表示名は50文字以内で入力してください。")
        String displayName,

        @Size(max = 160, message = "自己紹介は160文字以内で入力してください。")
        String bio,

        String avatarUrl
) {
}
