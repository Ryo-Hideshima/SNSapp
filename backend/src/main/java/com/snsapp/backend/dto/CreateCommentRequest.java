package com.snsapp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCommentRequest(
        @NotBlank
        @Size(max = 140, message = "コメントは140文字以内で入力してください。")
        String content
) {
}
