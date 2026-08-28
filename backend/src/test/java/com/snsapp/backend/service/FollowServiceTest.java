package com.snsapp.backend.service;

import com.snsapp.backend.domain.User;
import com.snsapp.backend.exception.SelfFollowException;
import com.snsapp.backend.exception.UserNotFoundException;
import com.snsapp.backend.mapper.FollowMapper;
import com.snsapp.backend.mapper.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FollowServiceTest {

    @Mock
    private FollowMapper followMapper;

    @Mock
    private UserMapper userMapper;

    private FollowService followService;

    @BeforeEach
    void setUp() {
        followService = new FollowService(followMapper, userMapper);
    }

    private User user(long id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        return user;
    }

    @Test
    void toggle_whenNotFollowing_followsAndReturnsUpdatedCount() {
        when(userMapper.findByUsername("bob")).thenReturn(Optional.of(user(2, "bob")));
        when(followMapper.existsByFollowerAndFollowee(100L, 2L)).thenReturn(false);
        when(followMapper.countFollowers(2L)).thenReturn(5L);

        var result = followService.toggle("bob", 100L);

        assertThat(result.followed()).isTrue();
        assertThat(result.followerCount()).isEqualTo(5L);
        verify(followMapper).insertIfAbsent(100L, 2L);
    }

    @Test
    void toggle_whenAlreadyFollowing_unfollowsAndReturnsUpdatedCount() {
        when(userMapper.findByUsername("bob")).thenReturn(Optional.of(user(2, "bob")));
        when(followMapper.existsByFollowerAndFollowee(100L, 2L)).thenReturn(true);
        when(followMapper.countFollowers(2L)).thenReturn(4L);

        var result = followService.toggle("bob", 100L);

        assertThat(result.followed()).isFalse();
        assertThat(result.followerCount()).isEqualTo(4L);
        verify(followMapper).deleteByFollowerAndFollowee(100L, 2L);
    }

    @Test
    void toggle_onSelf_throwsSelfFollowException() {
        when(userMapper.findByUsername("alice")).thenReturn(Optional.of(user(100, "alice")));

        assertThatThrownBy(() -> followService.toggle("alice", 100L))
                .isInstanceOf(SelfFollowException.class);
    }

    @Test
    void toggle_onUnknownUsername_throwsUserNotFoundException() {
        when(userMapper.findByUsername("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> followService.toggle("missing", 100L))
                .isInstanceOf(UserNotFoundException.class);
    }
}
