package com.snsapp.backend.mapper;

import com.snsapp.backend.domain.User;
import com.snsapp.backend.dto.UserProfileResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
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
}
