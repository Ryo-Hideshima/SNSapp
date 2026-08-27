package com.snsapp.backend.service;

import com.snsapp.backend.dto.PostResponse;
import com.snsapp.backend.mapper.LikeMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LikeServiceTest {

    @Mock
    private LikeMapper likeMapper;

    @Mock
    private PostService postService;

    private LikeService likeService;

    @BeforeEach
    void setUp() {
        likeService = new LikeService(likeMapper, postService);
        when(postService.getPost(1L, 100L)).thenReturn(new PostResponse());
    }

    @Test
    void toggle_whenNotLiked_likesAndReturnsUpdatedCount() {
        when(likeMapper.existsByPostIdAndUserId(1L, 100L)).thenReturn(false);
        when(likeMapper.countByPostId(1L)).thenReturn(3L);

        var result = likeService.toggle(1L, 100L);

        assertThat(result.liked()).isTrue();
        assertThat(result.likeCount()).isEqualTo(3L);
        verify(likeMapper).insertIfAbsent(1L, 100L);
    }

    @Test
    void toggle_whenAlreadyLiked_unlikesAndReturnsUpdatedCount() {
        when(likeMapper.existsByPostIdAndUserId(1L, 100L)).thenReturn(true);
        when(likeMapper.countByPostId(1L)).thenReturn(2L);

        var result = likeService.toggle(1L, 100L);

        assertThat(result.liked()).isFalse();
        assertThat(result.likeCount()).isEqualTo(2L);
        verify(likeMapper).deleteByPostIdAndUserId(1L, 100L);
    }
}
