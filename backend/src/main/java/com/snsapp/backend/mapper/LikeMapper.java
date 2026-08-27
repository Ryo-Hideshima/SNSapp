package com.snsapp.backend.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface LikeMapper {

    boolean existsByPostIdAndUserId(@Param("postId") Long postId, @Param("userId") Long userId);

    /** 既に存在する場合は何もしない(ON CONFLICT DO NOTHING)。二重送信でも一意制約違反を起こさない。 */
    void insertIfAbsent(@Param("postId") Long postId, @Param("userId") Long userId);

    void deleteByPostIdAndUserId(@Param("postId") Long postId, @Param("userId") Long userId);

    long countByPostId(@Param("postId") Long postId);
}
