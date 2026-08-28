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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserControllerTest {

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
    void getProfile_returnsProfileWithZeroCounts() throws Exception {
        String token = registerAndGetAccessToken("profile_alice");

        mockMvc.perform(get("/api/users/profile_alice").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("profile_alice"))
                .andExpect(jsonPath("$.followingCount").value(0))
                .andExpect(jsonPath("$.followerCount").value(0))
                .andExpect(jsonPath("$.followedByCurrentUser").value(false));
    }

    @Test
    void getProfile_forUnknownUsername_returns404() throws Exception {
        String token = registerAndGetAccessToken("profile_bob");

        mockMvc.perform(get("/api/users/no_such_user").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateProfile_updatesOwnProfile() throws Exception {
        String token = registerAndGetAccessToken("profile_carol");

        mockMvc.perform(put("/api/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of(
                                "displayName", "Carol Updated",
                                "bio", "hello world",
                                "avatarUrl", "data:image/png;base64,abc"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Carol Updated"))
                .andExpect(jsonPath("$.bio").value("hello world"));

        mockMvc.perform(get("/api/users/profile_carol").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Carol Updated"));
    }

    @Test
    void updateProfile_withBlankDisplayName_returns400() throws Exception {
        String token = registerAndGetAccessToken("profile_dave");

        mockMvc.perform(put("/api/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("displayName", "", "bio", ""))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void followListEndpoints_reflectFollowState() throws Exception {
        String aliceToken = registerAndGetAccessToken("profile_erin");
        String bobToken = registerAndGetAccessToken("profile_frank");

        mockMvc.perform(post("/api/users/profile_frank/follow").header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.followed").value(true));

        mockMvc.perform(get("/api/users/profile_erin/following").header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].username").value("profile_frank"));

        mockMvc.perform(get("/api/users/profile_frank/followers").header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].username").value("profile_erin"));

        mockMvc.perform(get("/api/users/profile_frank").header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.followerCount").value(1))
                .andExpect(jsonPath("$.followedByCurrentUser").value(true));
    }

    @Test
    void endpoints_withoutToken_return401() throws Exception {
        mockMvc.perform(get("/api/users/anyone")).andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/users/me")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("displayName", "x"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void search_matchesUsernameOrDisplayNameCaseInsensitively_andExcludesSelf() throws Exception {
        String searcherToken = registerAndGetAccessToken("search_alice");
        registerAndGetAccessToken("search_bobby");

        mockMvc.perform(get("/api/users").param("q", "BOB").header("Authorization", "Bearer " + searcherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].username").value("search_bobby"));

        mockMvc.perform(get("/api/users").param("q", "search_alice").header("Authorization", "Bearer " + searcherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void search_withBlankKeyword_returnsEmptyList() throws Exception {
        String token = registerAndGetAccessToken("search_carol");

        mockMvc.perform(get("/api/users").param("q", "").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void search_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/users").param("q", "anything")).andExpect(status().isUnauthorized());
    }
}
