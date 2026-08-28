package com.snsapp.backend.service;

import com.snsapp.backend.domain.User;
import com.snsapp.backend.dto.UpdateProfileRequest;
import com.snsapp.backend.dto.UserProfileResponse;
import com.snsapp.backend.dto.UserSummaryResponse;
import com.snsapp.backend.exception.UserNotFoundException;
import com.snsapp.backend.mapper.FollowMapper;
import com.snsapp.backend.mapper.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserMapper userMapper;

    @Mock
    private FollowMapper followMapper;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userMapper, followMapper);
    }

    private UserProfileResponse profile(long id, String username) {
        UserProfileResponse response = new UserProfileResponse();
        response.setId(id);
        response.setUsername(username);
        response.setDisplayName("Display " + username);
        return response;
    }

    private User user(long id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        return user;
    }

    @Test
    void getProfile_whenFound_returnsProfile() {
        when(userMapper.findProfileByUsername("alice", 100L)).thenReturn(Optional.of(profile(1, "alice")));

        var result = userService.getProfile("alice", 100L);

        assertThat(result.getUsername()).isEqualTo("alice");
    }

    @Test
    void getProfile_whenNotFound_throwsUserNotFoundException() {
        when(userMapper.findProfileByUsername("missing", 100L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getProfile("missing", 100L))
                .isInstanceOf(UserNotFoundException.class);
    }

    @Test
    void updateProfile_updatesThenReturnsFreshProfile() {
        when(userMapper.findById(100L)).thenReturn(Optional.of(user(100, "alice")));
        when(userMapper.findProfileByUsername("alice", 100L)).thenReturn(Optional.of(profile(100, "alice")));

        var request = new UpdateProfileRequest("New Name", "new bio", null);
        var result = userService.updateProfile(100L, request);

        verify(userMapper).updateProfile(eq(100L), eq("New Name"), eq("new bio"), isNull(), any());
        assertThat(result.getUsername()).isEqualTo("alice");
    }

    @Test
    void listFollowing_resolvesUsernameToIdThenDelegates() {
        when(userMapper.findByUsername("alice")).thenReturn(Optional.of(user(1, "alice")));
        List<UserSummaryResponse> expected = List.of(new UserSummaryResponse());
        when(followMapper.findFollowing(1L, 100L)).thenReturn(expected);

        var result = userService.listFollowing("alice", 100L);

        assertThat(result).isSameAs(expected);
    }

    @Test
    void listFollowers_resolvesUsernameToIdThenDelegates() {
        when(userMapper.findByUsername("alice")).thenReturn(Optional.of(user(1, "alice")));
        List<UserSummaryResponse> expected = List.of(new UserSummaryResponse());
        when(followMapper.findFollowers(1L, 100L)).thenReturn(expected);

        var result = userService.listFollowers("alice", 100L);

        assertThat(result).isSameAs(expected);
    }

    @Test
    void listFollowing_whenUserNotFound_throwsUserNotFoundException() {
        when(userMapper.findByUsername("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.listFollowing("missing", 100L))
                .isInstanceOf(UserNotFoundException.class);
    }

    @Test
    void searchUsers_delegatesTrimmedKeywordToMapperWithLimit() {
        List<UserSummaryResponse> expected = List.of(new UserSummaryResponse());
        when(userMapper.search("ali", 100L, 20)).thenReturn(expected);

        var result = userService.searchUsers("  ali  ", 100L);

        assertThat(result).isSameAs(expected);
        verify(userMapper).search("ali", 100L, 20);
    }

    @Test
    void searchUsers_whenKeywordBlank_returnsEmptyListWithoutQueryingMapper() {
        var result = userService.searchUsers("   ", 100L);

        assertThat(result).isEmpty();
        verify(userMapper, org.mockito.Mockito.never()).search(any(), any(), org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void searchUsers_whenKeywordNull_returnsEmptyListWithoutQueryingMapper() {
        var result = userService.searchUsers(null, 100L);

        assertThat(result).isEmpty();
        verify(userMapper, org.mockito.Mockito.never()).search(any(), any(), org.mockito.ArgumentMatchers.anyInt());
    }
}
