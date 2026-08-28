package com.snsapp.backend.controller;

import com.snsapp.backend.dto.FollowResponse;
import com.snsapp.backend.security.UserPrincipal;
import com.snsapp.backend.service.FollowService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/{username}/follow")
public class FollowController {

    private final FollowService followService;

    public FollowController(FollowService followService) {
        this.followService = followService;
    }

    @PostMapping
    public FollowResponse toggle(@PathVariable String username, @AuthenticationPrincipal UserPrincipal principal) {
        return followService.toggle(username, principal.getId());
    }
}
