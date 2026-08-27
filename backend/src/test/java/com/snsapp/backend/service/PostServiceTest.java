package com.snsapp.backend.service;

import com.snsapp.backend.domain.Post;
import com.snsapp.backend.dto.CreatePostRequest;
import com.snsapp.backend.dto.PostResponse;
import com.snsapp.backend.dto.UpdatePostRequest;
import com.snsapp.backend.exception.ForbiddenOperationException;
import com.snsapp.backend.exception.PostNotFoundException;
import com.snsapp.backend.mapper.PostMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    @Mock
    private PostMapper postMapper;

    private PostService postService;

    @BeforeEach
    void setUp() {
        postService = new PostService(postMapper);
    }

    private PostResponse response(long id, long authorId) {
        PostResponse response = new PostResponse();
        response.setId(id);
        response.setContent("content-" + id);
        response.setCreatedAt(LocalDateTime.now());
        response.setUpdatedAt(LocalDateTime.now());
        response.setAuthorId(authorId);
        response.setAuthorUsername("user" + authorId);
        response.setAuthorDisplayName("User " + authorId);
        return response;
    }

    @Test
    void listPosts_whenMoreThanSizeAvailable_setsHasMoreAndTrims() {
        List<PostResponse> fetched = List.of(response(3, 1), response(2, 1), response(1, 1));
        when(postMapper.findAll(3, 0, 100L)).thenReturn(fetched);

        var result = postService.listPosts(0, 2, 100L);

        assertThat(result.hasMore()).isTrue();
        assertThat(result.posts()).hasSize(2);
        assertThat(result.posts()).extracting(PostResponse::getId).containsExactly(3L, 2L);
    }

    @Test
    void listPosts_whenExactlySizeAvailable_hasMoreIsFalse() {
        List<PostResponse> fetched = List.of(response(2, 1), response(1, 1));
        when(postMapper.findAll(3, 0, 100L)).thenReturn(fetched);

        var result = postService.listPosts(0, 2, 100L);

        assertThat(result.hasMore()).isFalse();
        assertThat(result.posts()).hasSize(2);
    }

    @Test
    void listNewerThan_delegatesToMapperWithSinceId() {
        List<PostResponse> fetched = List.of(response(5, 1));
        when(postMapper.findNewerThan(3, 21, 100L)).thenReturn(fetched);

        var result = postService.listNewerThan(3, 20, 100L);

        assertThat(result.posts()).hasSize(1);
        assertThat(result.hasMore()).isFalse();
    }

    @Test
    void getPost_whenNotFound_throwsPostNotFoundException() {
        when(postMapper.findById(99L, 100L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> postService.getPost(99L, 100L))
                .isInstanceOf(PostNotFoundException.class);
    }

    @Test
    void createPost_insertsAndReturnsFreshlyFetchedPost() {
        doAnswer(invocation -> {
            Post post = invocation.getArgument(0);
            post.setId(10L);
            return null;
        }).when(postMapper).insert(any(Post.class));
        when(postMapper.findById(10L, 1L)).thenReturn(Optional.of(response(10, 1)));

        var result = postService.createPost(1L, new CreatePostRequest("hello"));

        assertThat(result.getId()).isEqualTo(10L);
    }

    @Test
    void updatePost_byOwner_updatesAndReturnsFreshPost() {
        when(postMapper.findById(1L, 100L)).thenReturn(Optional.of(response(1, 100)));

        postService.updatePost(1L, 100L, new UpdatePostRequest("updated"));

        verify(postMapper).updateContent(eq(1L), eq("updated"), any());
        verify(postMapper, times(2)).findById(1L, 100L);
    }

    @Test
    void updatePost_byNonOwner_throwsForbiddenAndDoesNotUpdate() {
        when(postMapper.findById(1L, 999L)).thenReturn(Optional.of(response(1, 100)));

        assertThatThrownBy(() -> postService.updatePost(1L, 999L, new UpdatePostRequest("updated")))
                .isInstanceOf(ForbiddenOperationException.class);

        verify(postMapper, times(0)).updateContent(anyLong(), any(), any());
    }

    @Test
    void deletePost_byOwner_deletes() {
        when(postMapper.findById(1L, 100L)).thenReturn(Optional.of(response(1, 100)));

        postService.deletePost(1L, 100L);

        verify(postMapper).deleteById(1L);
    }

    @Test
    void deletePost_byNonOwner_throwsForbiddenAndDoesNotDelete() {
        when(postMapper.findById(1L, 999L)).thenReturn(Optional.of(response(1, 100)));

        assertThatThrownBy(() -> postService.deletePost(1L, 999L))
                .isInstanceOf(ForbiddenOperationException.class);

        verify(postMapper, times(0)).deleteById(anyLong());
    }
}
