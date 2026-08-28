package com.snsapp.backend.controller;

import com.snsapp.backend.security.UserPrincipal;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * ログイン後の画面は未実装のため、認証必須の仮エンドポイントとして用意する。
 */
@Tag(name = "動作確認")
@RestController
public class HelloController {

    @GetMapping("/api/hello")
    public Map<String, String> hello(@AuthenticationPrincipal UserPrincipal principal) {
        return Map.of("message", "Hello, " + principal.getUser().getDisplayName());
    }
}
