package com.snsapp.backend.service;

import com.snsapp.backend.domain.Post;
import com.snsapp.backend.dto.CreatePostRequest;
import com.snsapp.backend.dto.PostListResponse;
import com.snsapp.backend.dto.PostResponse;
import com.snsapp.backend.dto.UpdatePostRequest;
import com.snsapp.backend.exception.ForbiddenOperationException;
import com.snsapp.backend.exception.PostNotFoundException;
import com.snsapp.backend.mapper.PostMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PostService {

    private final PostMapper postMapper;

    public PostService(PostMapper postMapper) {
        this.postMapper = postMapper;
    }

    public PostListResponse listPosts(int page, int size, Long currentUserId, String authorUsername) {
        List<PostResponse> posts = postMapper.findAll(size + 1, page * size, currentUserId, authorUsername);
        return toPage(posts, page, size);
    }

    /** sinceIdより新しい投稿を取得する(新着チェック・手動更新用)。pageは常に0として扱う。 */
    public PostListResponse listNewerThan(long sinceId, int size, Long currentUserId) {
        List<PostResponse> posts = postMapper.findNewerThan(sinceId, size + 1, currentUserId);
        return toPage(posts, 0, size);
    }

    public PostResponse getPost(Long id, Long currentUserId) {
        return postMapper.findById(id, currentUserId).orElseThrow(PostNotFoundException::new);
    }

    public PostResponse createPost(Long userId, CreatePostRequest request) {
        Post post = new Post();
        post.setUserId(userId);
        post.setContent(request.content());
        postMapper.insert(post);
        return getPost(post.getId(), userId);
    }

    public PostResponse updatePost(Long postId, Long currentUserId, UpdatePostRequest request) {
        PostResponse existing = getPost(postId, currentUserId);
        requireOwner(existing, currentUserId);

        postMapper.updateContent(postId, request.content(), LocalDateTime.now());
        return getPost(postId, currentUserId);
    }

    public void deletePost(Long postId, Long currentUserId) {
        PostResponse existing = getPost(postId, currentUserId);
        requireOwner(existing, currentUserId);

        postMapper.deleteById(postId);
    }

    private void requireOwner(PostResponse post, Long currentUserId) {
        if (!post.getAuthorId().equals(currentUserId)) {
            throw new ForbiddenOperationException();
        }
    }

    private PostListResponse toPage(List<PostResponse> fetched, int page, int size) {
        boolean hasMore = fetched.size() > size;
        List<PostResponse> posts = hasMore ? fetched.subList(0, size) : fetched;
        return new PostListResponse(posts, page, size, hasMore);
    }
}
