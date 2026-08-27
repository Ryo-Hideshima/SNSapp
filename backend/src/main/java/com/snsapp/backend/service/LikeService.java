package com.snsapp.backend.service;

import com.snsapp.backend.dto.LikeResponse;
import com.snsapp.backend.mapper.LikeMapper;
import org.springframework.stereotype.Service;

@Service
public class LikeService {

    private final LikeMapper likeMapper;
    private final PostService postService;

    public LikeService(LikeMapper likeMapper, PostService postService) {
        this.likeMapper = likeMapper;
        this.postService = postService;
    }

    /** いいねのトグル。既にいいね済みなら取り消し、未いいねなら付与する。対象投稿が存在しない場合はPostNotFoundException。 */
    public LikeResponse toggle(Long postId, Long userId) {
        postService.getPost(postId, userId); // 存在確認(なければPostNotFoundExceptionが投げられる)

        boolean alreadyLiked = likeMapper.existsByPostIdAndUserId(postId, userId);
        if (alreadyLiked) {
            likeMapper.deleteByPostIdAndUserId(postId, userId);
        } else {
            likeMapper.insertIfAbsent(postId, userId);
        }

        long likeCount = likeMapper.countByPostId(postId);
        return new LikeResponse(!alreadyLiked, likeCount);
    }
}
