package com.snsapp.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void register_thenLogin_thenAccessProtectedEndpoint() throws Exception {
        Map<String, String> registerBody = Map.of(
                "username", "alice",
                "email", "alice@example.com",
                "password", "password123",
                "displayName", "Alice"
        );

        String registerResponse = mockMvc.perform(post("/api/auth/register")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(registerBody)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn().getResponse().getContentAsString();

        String token = objectMapper.readTree(registerResponse).get("token").asText();

        mockMvc.perform(get("/api/hello").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Hello, Alice"));

        Map<String, String> loginBody = Map.of(
                "email", "alice@example.com",
                "password", "password123"
        );
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(loginBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void register_withDuplicateEmail_returns409() throws Exception {
        Map<String, String> registerBody = Map.of(
                "username", "bob",
                "email", "bob@example.com",
                "password", "password123",
                "displayName", "Bob"
        );

        mockMvc.perform(post("/api/auth/register")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(registerBody)))
                .andExpect(status().isCreated());

        Map<String, String> duplicateBody = Map.of(
                "username", "bob2",
                "email", "bob@example.com",
                "password", "password123",
                "displayName", "Bob2"
        );
        mockMvc.perform(post("/api/auth/register")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(duplicateBody)))
                .andExpect(status().isConflict());
    }

    @Test
    void login_withWrongPassword_returns401() throws Exception {
        Map<String, String> registerBody = Map.of(
                "username", "carol",
                "email", "carol@example.com",
                "password", "password123",
                "displayName", "Carol"
        );
        mockMvc.perform(post("/api/auth/register")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(registerBody)))
                .andExpect(status().isCreated());

        Map<String, String> loginBody = Map.of(
                "email", "carol@example.com",
                "password", "wrong-password"
        );
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(loginBody)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void hello_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/hello"))
                .andExpect(status().isUnauthorized());
    }
}
