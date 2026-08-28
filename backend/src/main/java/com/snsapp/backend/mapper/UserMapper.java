package com.snsapp.backend.mapper;

import com.snsapp.backend.domain.User;
import com.snsapp.backend.dto.UserProfileResponse;
import com.snsapp.backend.dto.UserSummaryResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Mapper
public interface UserMapper {

    Optional<User> findById(@Param("id") Long id);

    Optional<User> findByEmail(@Param("email") String email);

    Optional<User> findByUsername(@Param("username") String username);

    void insert(User user);

    /** プロフィール取得。フォロー中数・フォロワー数・自分がフォロー済みかを1クエリで取得する(N+1回避)。 */
    Optional<UserProfileResponse> findProfileByUsername(
            @Param("username") String username,
            @Param("currentUserId") Long currentUserId
    );

    void updateProfile(
            @Param("id") Long id,
            @Param("displayName") String displayName,
            @Param("bio") String bio,
            @Param("avatarUrl") String avatarUrl,
            @Param("updatedAt") LocalDateTime updatedAt
    );

    /**
     * username/display_nameの部分一致(大文字小文字無視)でユーザーを検索する。
     * 自分がフォロー済みかもfindFollowing/findFollowersと同じLEFT JOINパターンで1クエリに含める(N+1回避)。
     * 検索対象からは自分自身を除外する。
     */
    List<UserSummaryResponse> search(
            @Param("keyword") String keyword,
            @Param("currentUserId") Long currentUserId,
            @Param("limit") int limit
    );
}
