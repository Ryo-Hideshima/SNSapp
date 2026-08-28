package com.snsapp.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FollowControllerTest {

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
    void toggle_followsThenUnfollows() throws Exception {
        String followerToken = registerAndGetAccessToken("follow_grace");
        registerAndGetAccessToken("follow_henry");

        mockMvc.perform(post("/api/users/follow_henry/follow").header("Authorization", "Bearer " + followerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.followed").value(true))
                .andExpect(jsonPath("$.followerCount").value(1));

        mockMvc.perform(post("/api/users/follow_henry/follow").header("Authorization", "Bearer " + followerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.followed").value(false))
                .andExpect(jsonPath("$.followerCount").value(0));
    }

    @Test
    void toggle_onSelf_returns400() throws Exception {
        String token = registerAndGetAccessToken("follow_iris");

        mockMvc.perform(post("/api/users/follow_iris/follow").header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void toggle_onUnknownUsername_returns404() throws Exception {
        String token = registerAndGetAccessToken("follow_jack");

        mockMvc.perform(post("/api/users/no_such_user/follow").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void toggle_withoutToken_returns401() throws Exception {
        registerAndGetAccessToken("follow_kate");

        mockMvc.perform(post("/api/users/follow_kate/follow"))
                .andExpect(status().isUnauthorized());
    }
}
