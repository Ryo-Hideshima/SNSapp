package com.snsapp.backend.controller;

import com.snsapp.backend.dto.CreatePostRequest;
import com.snsapp.backend.dto.PostListResponse;
import com.snsapp.backend.dto.PostResponse;
import com.snsapp.backend.dto.UpdatePostRequest;
import com.snsapp.backend.security.UserPrincipal;
import com.snsapp.backend.service.PostService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public PostListResponse list(
            @RequestParam(required = false) Long sinceId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String authorUsername,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        int boundedSize = boundSize(size);
        if (sinceId != null) {
            return postService.listNewerThan(sinceId, boundedSize, principal.getId());
        }
        return postService.listPosts(Math.max(page, 0), boundedSize, principal.getId(), authorUsername);
    }

    @GetMapping("/{id}")
    public PostResponse get(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return postService.getPost(id, principal.getId());
    }

    @PostMapping
    public ResponseEntity<PostResponse> create(
            @Valid @RequestBody CreatePostRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.createPost(principal.getId(), request));
    }

    @PutMapping("/{id}")
    public PostResponse update(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePostRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return postService.updatePost(id, principal.getId(), request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        postService.deletePost(id, principal.getId());
        return ResponseEntity.noContent().build();
    }

    private int boundSize(int size) {
        if (size <= 0) return DEFAULT_PAGE_SIZE;
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
