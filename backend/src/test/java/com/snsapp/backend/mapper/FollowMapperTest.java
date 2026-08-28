package com.snsapp.backend.mapper;

import com.snsapp.backend.domain.User;
import com.snsapp.backend.dto.UserSummaryResponse;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.boot.test.autoconfigure.MybatisTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@MybatisTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class FollowMapperTest {

    @Autowired
    private FollowMapper followMapper;

    @Autowired
    private UserMapper userMapper;

    private User newUser(String username) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPasswordHash("hash");
        user.setDisplayName(username);
        userMapper.insert(user);
        return user;
    }

    @Test
    void insertIfAbsent_thenExists_returnsTrue() {
        User alice = newUser("alice");
        User bob = newUser("bob");

        assertThat(followMapper.existsByFollowerAndFollowee(alice.getId(), bob.getId())).isFalse();

        followMapper.insertIfAbsent(alice.getId(), bob.getId());

        assertThat(followMapper.existsByFollowerAndFollowee(alice.getId(), bob.getId())).isTrue();
    }

    @Test
    void insertIfAbsent_calledTwiceWithSameKey_doesNotThrowAndStaysOneRow() {
        User alice = newUser("alice2");
        User bob = newUser("bob2");

        followMapper.insertIfAbsent(alice.getId(), bob.getId());
        followMapper.insertIfAbsent(alice.getId(), bob.getId());

        assertThat(followMapper.countFollowing(alice.getId())).isEqualTo(1);
    }

    @Test
    void deleteByFollowerAndFollowee_removesTheRelation() {
        User alice = newUser("alice3");
        User bob = newUser("bob3");
        followMapper.insertIfAbsent(alice.getId(), bob.getId());

        followMapper.deleteByFollowerAndFollowee(alice.getId(), bob.getId());

        assertThat(followMapper.existsByFollowerAndFollowee(alice.getId(), bob.getId())).isFalse();
    }

    @Test
    void countFollowing_and_countFollowers_reflectRelations() {
        User alice = newUser("alice4");
        User bob = newUser("bob4");
        User carol = newUser("carol4");
        followMapper.insertIfAbsent(alice.getId(), bob.getId());
        followMapper.insertIfAbsent(alice.getId(), carol.getId());
        followMapper.insertIfAbsent(carol.getId(), bob.getId());

        assertThat(followMapper.countFollowing(alice.getId())).isEqualTo(2);
        assertThat(followMapper.countFollowers(bob.getId())).isEqualTo(2);
    }

    @Test
    void findFollowing_includesFollowedByCurrentUserFlagViaLeftJoin() {
        User alice = newUser("alice5");
        User bob = newUser("bob5");
        User carol = newUser("carol5");
        followMapper.insertIfAbsent(alice.getId(), bob.getId());
        followMapper.insertIfAbsent(alice.getId(), carol.getId());
        // aliceは自分自身もcarolをフォローしているものとして、currentUserIdをcarolにして確認する
        followMapper.insertIfAbsent(carol.getId(), bob.getId());

        List<UserSummaryResponse> following = followMapper.findFollowing(alice.getId(), carol.getId());

        assertThat(following).hasSize(2);
        UserSummaryResponse bobEntry = following.stream().filter(u -> u.getUsername().equals("bob5")).findFirst().orElseThrow();
        assertThat(bobEntry.isFollowedByCurrentUser()).isTrue();
        UserSummaryResponse carolEntry = following.stream().filter(u -> u.getUsername().equals("carol5")).findFirst().orElseThrow();
        assertThat(carolEntry.isFollowedByCurrentUser()).isFalse();
    }

    @Test
    void findFollowers_includesFollowedByCurrentUserFlagViaLeftJoin() {
        User alice = newUser("alice6");
        User bob = newUser("bob6");
        followMapper.insertIfAbsent(alice.getId(), bob.getId());

        List<UserSummaryResponse> followers = followMapper.findFollowers(bob.getId(), bob.getId());

        assertThat(followers).hasSize(1);
        assertThat(followers.get(0).getUsername()).isEqualTo("alice6");
        assertThat(followers.get(0).isFollowedByCurrentUser()).isFalse();
    }
}
