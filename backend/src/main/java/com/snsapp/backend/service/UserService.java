package com.snsapp.backend.service;

import com.snsapp.backend.dto.UpdateProfileRequest;
import com.snsapp.backend.dto.UserProfileResponse;
import com.snsapp.backend.dto.UserSummaryResponse;
import com.snsapp.backend.exception.UserNotFoundException;
import com.snsapp.backend.mapper.FollowMapper;
import com.snsapp.backend.mapper.UserMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class UserService {

    private static final int SEARCH_RESULT_LIMIT = 20;

    private final UserMapper userMapper;
    private final FollowMapper followMapper;

    public UserService(UserMapper userMapper, FollowMapper followMapper) {
        this.userMapper = userMapper;
        this.followMapper = followMapper;
    }

    public UserProfileResponse getProfile(String username, Long currentUserId) {
        return userMapper.findProfileByUsername(username, currentUserId)
                .orElseThrow(UserNotFoundException::new);
    }

    public UserProfileResponse updateProfile(Long currentUserId, UpdateProfileRequest request) {
        userMapper.updateProfile(currentUserId, request.displayName(), request.bio(), request.avatarUrl(), LocalDateTime.now());
        return userMapper.findById(currentUserId)
                .map(user -> getProfile(user.getUsername(), currentUserId))
                .orElseThrow(UserNotFoundException::new);
    }

    public List<UserSummaryResponse> listFollowing(String username, Long currentUserId) {
        Long targetUserId = resolveUserId(username);
        return followMapper.findFollowing(targetUserId, currentUserId);
    }

    public List<UserSummaryResponse> listFollowers(String username, Long currentUserId) {
        Long targetUserId = resolveUserId(username);
        return followMapper.findFollowers(targetUserId, currentUserId);
    }

    /** キーワード未入力の場合はDBにアクセスせず空リストを返す(検索を実行しない仕様)。 */
    public List<UserSummaryResponse> searchUsers(String keyword, Long currentUserId) {
        String trimmed = keyword == null ? "" : keyword.trim();
        if (trimmed.isEmpty()) {
            return List.of();
        }
        return userMapper.search(trimmed, currentUserId, SEARCH_RESULT_LIMIT);
    }

    private Long resolveUserId(String username) {
        return userMapper.findByUsername(username)
                .orElseThrow(UserNotFoundException::new)
                .getId();
    }
}
