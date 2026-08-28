package com.snsapp.backend.controller;

import com.snsapp.backend.dto.UpdateProfileRequest;
import com.snsapp.backend.dto.UserProfileResponse;
import com.snsapp.backend.dto.UserSummaryResponse;
import com.snsapp.backend.security.UserPrincipal;
import com.snsapp.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{username}")
    public UserProfileResponse getProfile(@PathVariable String username, @AuthenticationPrincipal UserPrincipal principal) {
        return userService.getProfile(username, principal.getId());
    }

    @GetMapping
    public List<UserSummaryResponse> search(
            @RequestParam(defaultValue = "") String q,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return userService.searchUsers(q, principal.getId());
    }

    @PutMapping("/me")
    public UserProfileResponse updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return userService.updateProfile(principal.getId(), request);
    }

    @GetMapping("/{username}/following")
    public List<UserSummaryResponse> listFollowing(@PathVariable String username, @AuthenticationPrincipal UserPrincipal principal) {
        return userService.listFollowing(username, principal.getId());
    }

    @GetMapping("/{username}/followers")
    public List<UserSummaryResponse> listFollowers(@PathVariable String username, @AuthenticationPrincipal UserPrincipal principal) {
        return userService.listFollowers(username, principal.getId());
    }
}
