package com.snsapp.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank
        @Pattern(regexp = "^[A-Za-z0-9_]+$", message = "ユーザー名は半角英数字とアンダースコアのみ使用できます。")
        String username,

        @NotBlank
        @Email
        String email,

        @NotBlank
        @Size(min = 8, message = "パスワードは8文字以上で入力してください。")
        String password,

        String displayName
) {
}
