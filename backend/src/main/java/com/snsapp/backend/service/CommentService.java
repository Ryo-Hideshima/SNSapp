package com.snsapp.backend.service;

import com.snsapp.backend.domain.Comment;
import com.snsapp.backend.dto.CommentResponse;
import com.snsapp.backend.dto.CreateCommentRequest;
import com.snsapp.backend.exception.CommentNotFoundException;
import com.snsapp.backend.exception.ForbiddenOperationException;
import com.snsapp.backend.mapper.CommentMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CommentService {

    private final CommentMapper commentMapper;
    private final PostService postService;

    public CommentService(CommentMapper commentMapper, PostService postService) {
        this.commentMapper = commentMapper;
        this.postService = postService;
    }

    /** 1クエリで対象投稿の全コメント+投稿者情報を取得する(コメントごとの個別クエリは発行しない)。 */
    public List<CommentResponse> listComments(Long postId, Long currentUserId) {
        postService.getPost(postId, currentUserId); // 存在確認
        return commentMapper.findByPostId(postId);
    }

    public CommentResponse createComment(Long postId, Long userId, CreateCommentRequest request) {
        postService.getPost(postId, userId); // 存在確認

        Comment comment = new Comment();
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setContent(request.content());
        commentMapper.insert(comment);

        return commentMapper.findResponseById(comment.getId()).orElseThrow(CommentNotFoundException::new);
    }

    public void deleteComment(Long commentId, Long currentUserId) {
        Comment comment = commentMapper.findById(commentId).orElseThrow(CommentNotFoundException::new);
        if (!comment.getUserId().equals(currentUserId)) {
            throw new ForbiddenOperationException();
        }
        commentMapper.deleteById(commentId);
    }
}
