package com.snsapp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreatePostRequest(
        @NotBlank
        @Size(max = 280, message = "投稿は280文字以内で入力してください。")
        String content
) {
}
