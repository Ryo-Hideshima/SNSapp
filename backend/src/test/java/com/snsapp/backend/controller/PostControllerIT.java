package com.snsapp.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class PostControllerIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String registerAndGetAccessToken(String username) throws Exception {
        Map<String, String> body = Map.of(
                "username", username,
                "email", username + "@example.com",
                "password", "password123",
                "displayName", username
        );
        String response = mockMvc.perform(post("/api/auth/register")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("accessToken").asText();
    }

    @Test
    void create_thenAppearsInList_thenGetById() throws Exception {
        String token = registerAndGetAccessToken("alice");

        String createResponse = mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "hello world"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("hello world"))
                .andExpect(jsonPath("$.authorUsername").value("alice"))
                .andReturn().getResponse().getContentAsString();
        long postId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(get("/api/posts").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts[0].content").value("hello world"));

        mockMvc.perform(get("/api/posts/" + postId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("hello world"));
    }

    @Test
    void update_byOwner_succeeds_byOtherUser_returns403() throws Exception {
        String ownerToken = registerAndGetAccessToken("bob");
        String otherToken = registerAndGetAccessToken("carol");

        String createResponse = mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "original"))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long postId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(put("/api/posts/" + postId)
                        .header("Authorization", "Bearer " + otherToken)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "hijacked"))))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/posts/" + postId)
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "edited"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("edited"));
    }

    @Test
    void delete_byOwner_succeeds_byOtherUser_returns403() throws Exception {
        String ownerToken = registerAndGetAccessToken("dave");
        String otherToken = registerAndGetAccessToken("erin");

        String createResponse = mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "to be deleted"))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long postId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(delete("/api/posts/" + postId).header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/posts/" + postId).header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/posts/" + postId).header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void create_withBlankContent_returns400() throws Exception {
        String token = registerAndGetAccessToken("frank");

        mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", ""))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void list_withSinceId_returnsOnlyNewerPosts() throws Exception {
        String token = registerAndGetAccessToken("grace");

        String first = mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "first"))))
                .andReturn().getResponse().getContentAsString();
        long firstId = objectMapper.readTree(first).get("id").asLong();

        mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "second"))))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/posts?sinceId=" + firstId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts.length()").value(1))
                .andExpect(jsonPath("$.posts[0].content").value("second"));
    }

    @Test
    void list_includesLikeAndCommentCountsAndLikedByCurrentUser() throws Exception {
        String ownerToken = registerAndGetAccessToken("henry");
        String otherToken = registerAndGetAccessToken("iris");

        String createResponse = mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "counts test"))))
                .andReturn().getResponse().getContentAsString();
        long postId = objectMapper.readTree(createResponse).get("id").asLong();

        // 別ユーザーがいいね・コメントする
        mockMvc.perform(post("/api/posts/" + postId + "/likes").header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .header("Authorization", "Bearer " + otherToken)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "nice post"))))
                .andExpect(status().isCreated());

        // 投稿者本人からは「自分はいいねしていない」ことが見える
        mockMvc.perform(get("/api/posts/" + postId).header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likeCount").value(1))
                .andExpect(jsonPath("$.commentCount").value(1))
                .andExpect(jsonPath("$.likedByCurrentUser").value(false));

        // いいねした本人からは「自分はいいねした」ことが見える
        mockMvc.perform(get("/api/posts/" + postId).header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likeCount").value(1))
                .andExpect(jsonPath("$.likedByCurrentUser").value(true));
    }

    @Test
    void list_withAuthorUsername_returnsOnlyThatAuthorsPosts() throws Exception {
        String aliceToken = registerAndGetAccessToken("filter_alice");
        String bobToken = registerAndGetAccessToken("filter_bob");

        mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "alice's post"))))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + bobToken)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "bob's post"))))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/posts?authorUsername=filter_alice").header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts.length()").value(1))
                .andExpect(jsonPath("$.posts[0].authorUsername").value("filter_alice"));
    }

    @Test
    void endpoints_withoutToken_return401() throws Exception {
        mockMvc.perform(get("/api/posts")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/posts")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "x"))))
                .andExpect(status().isUnauthorized());
    }
}
