package com.snsapp.backend.mapper;

import com.snsapp.backend.domain.Comment;
import com.snsapp.backend.domain.Post;
import com.snsapp.backend.domain.User;
import com.snsapp.backend.dto.CommentResponse;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.boot.test.autoconfigure.MybatisTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@MybatisTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class CommentMapperTest {

    @Autowired
    private CommentMapper commentMapper;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private PostMapper postMapper;

    private User newUser(String username) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPasswordHash("hash");
        user.setDisplayName("Display " + username);
        userMapper.insert(user);
        return user;
    }

    private Post newPost(Long userId) {
        Post post = new Post();
        post.setUserId(userId);
        post.setContent("post content");
        postMapper.insert(post);
        return post;
    }

    private Comment newComment(Long postId, Long userId, String content) {
        Comment comment = new Comment();
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setContent(content);
        commentMapper.insert(comment);
        return comment;
    }

    @Test
    void insertAndFindById_roundTripsFields() {
        User alice = newUser("alice");
        Post post = newPost(alice.getId());
        Comment inserted = newComment(post.getId(), alice.getId(), "nice post");

        Optional<Comment> found = commentMapper.findById(inserted.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getContent()).isEqualTo("nice post");
        assertThat(found.get().getPostId()).isEqualTo(post.getId());
    }

    @Test
    void findResponseById_includesAuthorInfo() {
        User alice = newUser("alice2");
        Post post = newPost(alice.getId());
        Comment inserted = newComment(post.getId(), alice.getId(), "hello");

        CommentResponse response = commentMapper.findResponseById(inserted.getId()).orElseThrow();

        assertThat(response.getContent()).isEqualTo("hello");
        assertThat(response.getAuthorUsername()).isEqualTo("alice2");
    }

    @Test
    void findByPostId_returnsCommentsInChronologicalOrderWithAuthorInfo_noPerCommentExtraQuery() {
        User alice = newUser("alice3");
        User bob = newUser("bob3");
        Post post = newPost(alice.getId());
        newComment(post.getId(), alice.getId(), "first comment");
        newComment(post.getId(), bob.getId(), "second comment");

        List<CommentResponse> comments = commentMapper.findByPostId(post.getId());

        assertThat(comments).extracting(CommentResponse::getContent)
                .containsExactly("first comment", "second comment");
        assertThat(comments).extracting(CommentResponse::getAuthorUsername)
                .containsExactly("alice3", "bob3");
    }

    @Test
    void deleteById_removesTheComment() {
        User alice = newUser("alice4");
        Post post = newPost(alice.getId());
        Comment inserted = newComment(post.getId(), alice.getId(), "to delete");

        int deleted = commentMapper.deleteById(inserted.getId());

        assertThat(deleted).isEqualTo(1);
        assertThat(commentMapper.findById(inserted.getId())).isEmpty();
    }
}
