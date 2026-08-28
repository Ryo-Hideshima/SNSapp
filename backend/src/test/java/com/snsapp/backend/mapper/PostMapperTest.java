package com.snsapp.backend.mapper;

import com.snsapp.backend.domain.Post;
import com.snsapp.backend.domain.User;
import com.snsapp.backend.dto.PostResponse;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.boot.test.autoconfigure.MybatisTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@MybatisTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class PostMapperTest {

    @Autowired
    private PostMapper postMapper;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private LikeMapper likeMapper;

    @Autowired
    private CommentMapper commentMapper;

    private User newUser(String username) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPasswordHash("hash");
        user.setDisplayName("Display " + username);
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
    void insertAndFindById_roundTripsAuthorInfoAndZeroCounts() {
        User alice = newUser("alice");
        Post post = newPost(alice.getId(), "hello world");

        Optional<PostResponse> found = postMapper.findById(post.getId(), alice.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getContent()).isEqualTo("hello world");
        assertThat(found.get().getAuthorUsername()).isEqualTo("alice");
        assertThat(found.get().getLikeCount()).isZero();
        assertThat(found.get().getCommentCount()).isZero();
        assertThat(found.get().isLikedByCurrentUser()).isFalse();
    }

    @Test
    void findById_includesLikeAndCommentCountsAndLikedFlagViaLeftJoin() {
        User alice = newUser("alice2");
        User bob = newUser("bob2");
        Post post = newPost(alice.getId(), "post with engagement");
        likeMapper.insertIfAbsent(post.getId(), alice.getId());
        likeMapper.insertIfAbsent(post.getId(), bob.getId());
        com.snsapp.backend.domain.Comment comment = new com.snsapp.backend.domain.Comment();
        comment.setPostId(post.getId());
        comment.setUserId(bob.getId());
        comment.setContent("nice post");
        commentMapper.insert(comment);

        PostResponse found = postMapper.findById(post.getId(), alice.getId()).orElseThrow();

        assertThat(found.getLikeCount()).isEqualTo(2);
        assertThat(found.getCommentCount()).isEqualTo(1);
        assertThat(found.isLikedByCurrentUser()).isTrue();
    }

    @Test
    void findAll_ordersByCreatedAtDescAndSupportsPagination() {
        User alice = newUser("alice3");
        Post first = newPost(alice.getId(), "first");
        Post second = newPost(alice.getId(), "second");
        Post third = newPost(alice.getId(), "third");

        List<PostResponse> page1 = postMapper.findAll(2, 0, alice.getId(), null);
        List<PostResponse> page2 = postMapper.findAll(2, 2, alice.getId(), null);

        assertThat(page1).extracting(PostResponse::getId).containsExactly(third.getId(), second.getId());
        assertThat(page2).extracting(PostResponse::getId).containsExactly(first.getId());
    }

    @Test
    void findAll_filtersByAuthorUsername() {
        User alice = newUser("alice4");
        User bob = newUser("bob4");
        newPost(alice.getId(), "alice post");
        newPost(bob.getId(), "bob post");

        List<PostResponse> aliceOnly = postMapper.findAll(20, 0, alice.getId(), "alice4");

        assertThat(aliceOnly).hasSize(1);
        assertThat(aliceOnly.get(0).getAuthorUsername()).isEqualTo("alice4");
    }

    @Test
    void findNewerThan_returnsOnlyPostsWithGreaterId() {
        User alice = newUser("alice5");
        Post first = newPost(alice.getId(), "first5");
        Post second = newPost(alice.getId(), "second5");

        List<PostResponse> newer = postMapper.findNewerThan(first.getId(), 20, alice.getId());

        assertThat(newer).extracting(PostResponse::getId).containsExactly(second.getId());
    }

    @Test
    void updateContent_updatesContentAndUpdatedAt() {
        User alice = newUser("alice6");
        Post post = newPost(alice.getId(), "original");

        int updated = postMapper.updateContent(post.getId(), "edited", LocalDateTime.now());

        assertThat(updated).isEqualTo(1);
        assertThat(postMapper.findById(post.getId(), alice.getId()).orElseThrow().getContent()).isEqualTo("edited");
    }

    @Test
    void deleteById_removesThePost() {
        User alice = newUser("alice7");
        Post post = newPost(alice.getId(), "to be deleted");

        int deleted = postMapper.deleteById(post.getId());

        assertThat(deleted).isEqualTo(1);
        assertThat(postMapper.findById(post.getId(), alice.getId())).isEmpty();
    }
}
