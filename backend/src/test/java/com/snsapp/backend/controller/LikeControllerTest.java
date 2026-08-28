package com.snsapp.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class LikeControllerTest {

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
    void toggle_likesThenUnlikes() throws Exception {
        String ownerToken = registerAndGetAccessToken("liker_owner");
        String likerToken = registerAndGetAccessToken("liker_user");
        long postId = createPost(ownerToken, "like me");

        mockMvc.perform(post("/api/posts/" + postId + "/likes").header("Authorization", "Bearer " + likerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.liked").value(true))
                .andExpect(jsonPath("$.likeCount").value(1));

        mockMvc.perform(post("/api/posts/" + postId + "/likes").header("Authorization", "Bearer " + likerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.liked").value(false))
                .andExpect(jsonPath("$.likeCount").value(0));
    }

    @Test
    void toggle_onNonExistentPost_returns404() throws Exception {
        String token = registerAndGetAccessToken("liker_missing");

        mockMvc.perform(post("/api/posts/999999/likes").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void toggle_withoutToken_returns401() throws Exception {
        String ownerToken = registerAndGetAccessToken("liker_owner2");
        long postId = createPost(ownerToken, "post");

        mockMvc.perform(post("/api/posts/" + postId + "/likes"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void toggle_repeatedRequests_doNotCauseErrors() throws Exception {
        String ownerToken = registerAndGetAccessToken("liker_owner3");
        String likerToken = registerAndGetAccessToken("liker_user3");
        long postId = createPost(ownerToken, "double toggle");

        // 同じユーザーが連続でトグルしても例外にならないことを確認(二重送信耐性)
        for (int i = 0; i < 4; i++) {
            mockMvc.perform(post("/api/posts/" + postId + "/likes").header("Authorization", "Bearer " + likerToken))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(get("/api/posts/" + postId).header("Authorization", "Bearer " + likerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likedByCurrentUser").value(false))
                .andExpect(jsonPath("$.likeCount").value(0));
    }
}
