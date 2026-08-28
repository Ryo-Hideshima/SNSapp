package com.snsapp.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CommentControllerTest {

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

    private long createPost(String token, String content) throws Exception {
        String response = mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", content))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    @Test
    void create_thenAppearsInList() throws Exception {
        String ownerToken = registerAndGetAccessToken("commenter_owner");
        String commenterToken = registerAndGetAccessToken("commenter_user");
        long postId = createPost(ownerToken, "comment on me");

        mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .header("Authorization", "Bearer " + commenterToken)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "nice post"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("nice post"))
                .andExpect(jsonPath("$.authorUsername").value("commenter_user"));

        mockMvc.perform(get("/api/posts/" + postId + "/comments").header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].content").value("nice post"));
    }

    @Test
    void delete_byOwner_succeeds_byOtherUser_returns403() throws Exception {
        String postOwnerToken = registerAndGetAccessToken("commenter_owner2");
        String commenterToken = registerAndGetAccessToken("commenter_user2");
        String otherToken = registerAndGetAccessToken("commenter_other2");
        long postId = createPost(postOwnerToken, "post for delete test");

        String createResponse = mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .header("Authorization", "Bearer " + commenterToken)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "to be deleted"))))
                .andReturn().getResponse().getContentAsString();
        long commentId = objectMapper.readTree(createResponse).get("id").asLong();

        // 投稿者本人でもコメント投稿者本人でなければ削除できない
        mockMvc.perform(delete("/api/posts/" + postId + "/comments/" + commentId)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/posts/" + postId + "/comments/" + commentId)
                        .header("Authorization", "Bearer " + postOwnerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/posts/" + postId + "/comments/" + commentId)
                        .header("Authorization", "Bearer " + commenterToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/posts/" + postId + "/comments").header("Authorization", "Bearer " + postOwnerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void create_withBlankContent_returns400() throws Exception {
        String token = registerAndGetAccessToken("commenter_blank");
        long postId = createPost(token, "post");

        mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", ""))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_onNonExistentPost_returns404() throws Exception {
        String token = registerAndGetAccessToken("commenter_missing");

        mockMvc.perform(post("/api/posts/999999/comments")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "hi"))))
                .andExpect(status().isNotFound());
    }

    @Test
    void endpoints_withoutToken_return401() throws Exception {
        String token = registerAndGetAccessToken("commenter_owner3");
        long postId = createPost(token, "post");

        mockMvc.perform(get("/api/posts/" + postId + "/comments")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "x"))))
                .andExpect(status().isUnauthorized());
    }
}
