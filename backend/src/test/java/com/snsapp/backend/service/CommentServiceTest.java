package com.snsapp.backend.service;

import com.snsapp.backend.domain.Comment;
import com.snsapp.backend.dto.CommentResponse;
import com.snsapp.backend.dto.CreateCommentRequest;
import com.snsapp.backend.dto.PostResponse;
import com.snsapp.backend.exception.CommentNotFoundException;
import com.snsapp.backend.exception.ForbiddenOperationException;
import com.snsapp.backend.mapper.CommentMapper;
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
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentMapper commentMapper;

    @Mock
    private PostService postService;

    private CommentService commentService;

    @BeforeEach
    void setUp() {
        commentService = new CommentService(commentMapper, postService);
    }

    private Comment comment(long id, long postId, long userId) {
        Comment comment = new Comment();
        comment.setId(id);
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setContent("comment-" + id);
        comment.setCreatedAt(LocalDateTime.now());
        return comment;
    }

    @Test
    void listComments_returnsMapperResult() {
        when(postService.getPost(1L, 100L)).thenReturn(new PostResponse());
        List<CommentResponse> expected = List.of(new CommentResponse());
        when(commentMapper.findByPostId(1L)).thenReturn(expected);

        var result = commentService.listComments(1L, 100L);

        assertThat(result).isSameAs(expected);
    }

    @Test
    void createComment_insertsAndReturnsFreshlyFetchedComment() {
        when(postService.getPost(1L, 100L)).thenReturn(new PostResponse());
        doAnswer(invocation -> {
            Comment comment = invocation.getArgument(0);
            comment.setId(50L);
            return null;
        }).when(commentMapper).insert(any(Comment.class));
        CommentResponse expected = new CommentResponse();
        when(commentMapper.findResponseById(50L)).thenReturn(Optional.of(expected));

        var result = commentService.createComment(1L, 100L, new CreateCommentRequest("hello"));

        assertThat(result).isSameAs(expected);
    }

    @Test
    void deleteComment_byOwner_deletes() {
        when(commentMapper.findById(50L)).thenReturn(Optional.of(comment(50L, 1L, 100L)));

        commentService.deleteComment(50L, 100L);

        verify(commentMapper).deleteById(50L);
    }

    @Test
    void deleteComment_byNonOwner_throwsForbiddenAndDoesNotDelete() {
        when(commentMapper.findById(50L)).thenReturn(Optional.of(comment(50L, 1L, 100L)));

        assertThatThrownBy(() -> commentService.deleteComment(50L, 999L))
                .isInstanceOf(ForbiddenOperationException.class);

        verify(commentMapper, times(0)).deleteById(50L);
    }

    @Test
    void deleteComment_whenNotFound_throwsCommentNotFoundException() {
        when(commentMapper.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> commentService.deleteComment(99L, 100L))
                .isInstanceOf(CommentNotFoundException.class);
    }
}
