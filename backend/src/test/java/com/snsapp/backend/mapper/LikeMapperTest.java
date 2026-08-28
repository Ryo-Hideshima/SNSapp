package com.snsapp.backend.mapper;

import com.snsapp.backend.domain.Post;
import com.snsapp.backend.domain.User;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.boot.test.autoconfigure.MybatisTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;

import static org.assertj.core.api.Assertions.assertThat;

@MybatisTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class LikeMapperTest {

    @Autowired
    private LikeMapper likeMapper;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private PostMapper postMapper;

    private User newUser(String username) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPasswordHash("hash");
        user.setDisplayName(username);
        userMapper.insert(user);
        return user;
    }

    private Post newPost(Long userId, String content) {
        Post post = new Post();
        post.setUserId(userId);
        post.setContent(content);
        postMapper.insert(post);
        return post;
    }

    @Test
    void insertIfAbsent_thenExists_returnsTrue() {
        User alice = newUser("alice");
        Post post = newPost(alice.getId(), "hello");

        assertThat(likeMapper.existsByPostIdAndUserId(post.getId(), alice.getId())).isFalse();

        likeMapper.insertIfAbsent(post.getId(), alice.getId());

        assertThat(likeMapper.existsByPostIdAndUserId(post.getId(), alice.getId())).isTrue();
    }

    @Test
    void insertIfAbsent_calledTwice_doesNotThrowAndCountStaysOne() {
        User alice = newUser("alice2");
        Post post = newPost(alice.getId(), "hello2");

        likeMapper.insertIfAbsent(post.getId(), alice.getId());
        likeMapper.insertIfAbsent(post.getId(), alice.getId());

        assertThat(likeMapper.countByPostId(post.getId())).isEqualTo(1);
    }

    @Test
    void deleteByPostIdAndUserId_removesTheLike() {
        User alice = newUser("alice3");
        Post post = newPost(alice.getId(), "hello3");
        likeMapper.insertIfAbsent(post.getId(), alice.getId());

        likeMapper.deleteByPostIdAndUserId(post.getId(), alice.getId());

        assertThat(likeMapper.existsByPostIdAndUserId(post.getId(), alice.getId())).isFalse();
        assertThat(likeMapper.countByPostId(post.getId())).isZero();
    }

    @Test
    void countByPostId_countsMultipleUsersLikes() {
        User alice = newUser("alice4");
        User bob = newUser("bob4");
        Post post = newPost(alice.getId(), "hello4");

        likeMapper.insertIfAbsent(post.getId(), alice.getId());
        likeMapper.insertIfAbsent(post.getId(), bob.getId());

        assertThat(likeMapper.countByPostId(post.getId())).isEqualTo(2);
    }
}
