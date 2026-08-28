package com.snsapp.backend.controller;

import com.snsapp.backend.dto.LikeResponse;
import com.snsapp.backend.security.UserPrincipal;
import com.snsapp.backend.service.LikeService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "いいね")
@RestController
@RequestMapping("/api/posts/{postId}/likes")
public class LikeController {

    private final LikeService likeService;

    public LikeController(LikeService likeService) {
        this.likeService = likeService;
    }

    @PostMapping
    public LikeResponse toggle(@PathVariable Long postId, @AuthenticationPrincipal UserPrincipal principal) {
        return likeService.toggle(postId, principal.getId());
    }
}
