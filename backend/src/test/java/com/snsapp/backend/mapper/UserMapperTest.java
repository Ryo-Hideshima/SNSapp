package com.snsapp.backend.mapper;

import com.snsapp.backend.domain.User;
import com.snsapp.backend.dto.UserProfileResponse;
import com.snsapp.backend.dto.UserSummaryResponse;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.boot.test.autoconfigure.MybatisTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * H2インメモリDB(PostgreSQL互換モード)に対してUserMapperのSQLを実際に実行して検証する。
 * @MybatisTestは各テストメソッドをトランザクション内で実行し、終了時に自動ロールバックする。
 */
@MybatisTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserMapperTest {

    @org.springframework.beans.factory.annotation.Autowired
    private UserMapper userMapper;

    private User newUser(String username, String displayName) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPasswordHash("hash");
        user.setDisplayName(displayName);
        user.setBio(null);
        user.setAvatarUrl(null);
        userMapper.insert(user);
        return user;
    }

    @Test
    void insertAndFindById_roundTripsAllFields() {
        User inserted = newUser("alice", "Alice");

        Optional<User> found = userMapper.findById(inserted.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getUsername()).isEqualTo("alice");
        assertThat(found.get().getEmail()).isEqualTo("alice@example.com");
        assertThat(found.get().getDisplayName()).isEqualTo("Alice");
    }

    @Test
    void findByEmail_and_findByUsername_returnSameUser() {
        User inserted = newUser("bob", "Bob");

        assertThat(userMapper.findByEmail("bob@example.com")).map(User::getId).contains(inserted.getId());
        assertThat(userMapper.findByUsername("bob")).map(User::getId).contains(inserted.getId());
    }

    @Test
    void findByUsername_whenNotFound_returnsEmpty() {
        assertThat(userMapper.findByUsername("no_such_user")).isEmpty();
    }

    @Test
    void updateProfile_updatesDisplayNameBioAvatarUrl() {
        User inserted = newUser("carol", "Carol");

        userMapper.updateProfile(inserted.getId(), "Carol Updated", "hello", "https://example.com/a.png", LocalDateTime.now());

        User updated = userMapper.findById(inserted.getId()).orElseThrow();
        assertThat(updated.getDisplayName()).isEqualTo("Carol Updated");
        assertThat(updated.getBio()).isEqualTo("hello");
        assertThat(updated.getAvatarUrl()).isEqualTo("https://example.com/a.png");
    }

    @Test
    void findProfileByUsername_whenNoFollowRelations_returnsZeroCountsAndNotFollowed() {
        User alice = newUser("alice2", "Alice2");

        UserProfileResponse profile = userMapper.findProfileByUsername("alice2", alice.getId()).orElseThrow();

        assertThat(profile.getFollowingCount()).isZero();
        assertThat(profile.getFollowerCount()).isZero();
        assertThat(profile.isFollowedByCurrentUser()).isFalse();
    }

    @Test
    void search_matchesUsernameOrDisplayNameCaseInsensitively() {
        newUser("search_bobby", "Bobby Search");
        newUser("search_alice", "Alice");
        User me = newUser("search_me", "Me");

        List<UserSummaryResponse> byUsername = userMapper.search("BOBBY", me.getId(), 20);
        assertThat(byUsername).extracting(UserSummaryResponse::getUsername).containsExactly("search_bobby");

        List<UserSummaryResponse> byDisplayName = userMapper.search("ali", me.getId(), 20);
        assertThat(byDisplayName).extracting(UserSummaryResponse::getUsername).containsExactly("search_alice");
    }

    @Test
    void search_excludesCurrentUserAndRespectsLimit() {
        User me = newUser("search2_me", "SearchTarget");
        for (int i = 0; i < 3; i++) {
            newUser("search2_user" + i, "SearchTarget " + i);
        }

        List<UserSummaryResponse> results = userMapper.search("searchtarget", me.getId(), 2);

        assertThat(results).hasSize(2);
        assertThat(results).extracting(UserSummaryResponse::getId).doesNotContain(me.getId());
    }

    @Test
    void search_whenNoMatch_returnsEmptyList() {
        User me = newUser("search3_me", "Me3");

        assertThat(userMapper.search("zzz_no_such_keyword_zzz", me.getId(), 20)).isEmpty();
    }
}
