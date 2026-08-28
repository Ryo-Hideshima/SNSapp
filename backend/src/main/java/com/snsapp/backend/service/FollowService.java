package com.snsapp.backend.service;

import com.snsapp.backend.dto.FollowResponse;
import com.snsapp.backend.exception.SelfFollowException;
import com.snsapp.backend.exception.UserNotFoundException;
import com.snsapp.backend.mapper.FollowMapper;
import com.snsapp.backend.mapper.UserMapper;
import org.springframework.stereotype.Service;

@Service
public class FollowService {

    private final FollowMapper followMapper;
    private final UserMapper userMapper;

    public FollowService(FollowMapper followMapper, UserMapper userMapper) {
        this.followMapper = followMapper;
        this.userMapper = userMapper;
    }

    /** フォローのトグル。既にフォロー済みなら解除し、未フォローなら付与する。 */
    public FollowResponse toggle(String targetUsername, Long currentUserId) {
        Long targetUserId = userMapper.findByUsername(targetUsername)
                .orElseThrow(UserNotFoundException::new)
                .getId();

        if (targetUserId.equals(currentUserId)) {
            throw new SelfFollowException();
        }

        boolean alreadyFollowing = followMapper.existsByFollowerAndFollowee(currentUserId, targetUserId);
        if (alreadyFollowing) {
            followMapper.deleteByFollowerAndFollowee(currentUserId, targetUserId);
        } else {
            followMapper.insertIfAbsent(currentUserId, targetUserId);
        }

        long followerCount = followMapper.countFollowers(targetUserId);
        return new FollowResponse(!alreadyFollowing, followerCount);
    }
}
