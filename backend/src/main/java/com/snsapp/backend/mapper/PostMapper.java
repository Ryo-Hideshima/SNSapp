package com.snsapp.backend.mapper;

import com.snsapp.backend.domain.Post;
import com.snsapp.backend.dto.PostResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Mapper
public interface PostMapper {

    List<PostResponse> findAll(@Param("limit") int limit, @Param("offset") int offset);

    /** idがsinceIdより大きい(=新しい)投稿を新着順に最大limit件返す。X/TwitterのsinceIdと同じ考え方。 */
    List<PostResponse> findNewerThan(@Param("sinceId") long sinceId, @Param("limit") int limit);

    Optional<PostResponse> findById(@Param("id") Long id);

    void insert(Post post);

    int updateContent(@Param("id") Long id, @Param("content") String content, @Param("updatedAt") LocalDateTime updatedAt);

    int deleteById(@Param("id") Long id);
}
