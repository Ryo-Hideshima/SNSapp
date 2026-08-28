package com.snsapp.backend.mapper;

import com.snsapp.backend.dto.UserSummaryResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FollowMapper {

    boolean existsByFollowerAndFollowee(@Param("followerId") Long followerId, @Param("followeeId") Long followeeId);

    /** 既に存在する場合は何もしない(ON CONFLICT DO NOTHING)。二重送信でも一意制約違反を起こさない。 */
    void insertIfAbsent(@Param("followerId") Long followerId, @Param("followeeId") Long followeeId);

    void deleteByFollowerAndFollowee(@Param("followerId") Long followerId, @Param("followeeId") Long followeeId);

    long countFollowing(@Param("userId") Long userId);

    long countFollowers(@Param("userId") Long userId);

    /** userIdがフォローしているユーザー一覧(1クエリでusers情報+自分のフォロー状態を取得)。 */
    List<UserSummaryResponse> findFollowing(@Param("userId") Long userId, @Param("currentUserId") Long currentUserId);

    /** userIdをフォローしているユーザー一覧(1クエリでusers情報+自分のフォロー状態を取得)。 */
    List<UserSummaryResponse> findFollowers(@Param("userId") Long userId, @Param("currentUserId") Long currentUserId);
}
