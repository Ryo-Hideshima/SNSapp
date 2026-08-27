package com.snsapp.backend.mapper;

import com.snsapp.backend.domain.Comment;
import com.snsapp.backend.dto.CommentResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface CommentMapper {

    /** 1クエリで対象投稿の全コメント+投稿者情報を取得する(コメントごとの個別クエリは発行しない)。 */
    List<CommentResponse> findByPostId(@Param("postId") Long postId);

    Optional<CommentResponse> findResponseById(@Param("id") Long id);

    Optional<Comment> findById(@Param("id") Long id);

    void insert(Comment comment);

    int deleteById(@Param("id") Long id);
}
