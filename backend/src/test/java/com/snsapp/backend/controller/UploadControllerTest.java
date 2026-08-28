package com.snsapp.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.snsapp.backend.exception.InvalidFileTypeException;
import com.snsapp.backend.service.S3Service;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * S3への実アップロードは行わず、S3Serviceを@MockBeanに差し替えてコントローラーの
 * リクエスト処理・バリデーション・エラーハンドリングだけを検証する。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UploadControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private S3Service s3Service;

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
    void uploadAvatar_withValidImage_returnsUrlFromS3Service() throws Exception {
        String token = registerAndGetAccessToken("upload_user");
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[] {1, 2, 3});
        when(s3Service.uploadAvatar(any(), any())).thenReturn("https://example.com/avatars/1/a.png");

        mockMvc.perform(multipart("/api/uploads/avatar").file(file).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("https://example.com/avatars/1/a.png"));
    }

    @Test
    void uploadAvatar_whenS3ServiceRejectsFileType_returns400() throws Exception {
        String token = registerAndGetAccessToken("upload_user2");
        MockMultipartFile file = new MockMultipartFile("file", "note.txt", "text/plain", new byte[] {1});
        when(s3Service.uploadAvatar(any(), any())).thenThrow(new InvalidFileTypeException());

        mockMvc.perform(multipart("/api/uploads/avatar").file(file).header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void uploadAvatar_withoutToken_returns401() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[] {1});

        mockMvc.perform(multipart("/api/uploads/avatar").file(file))
                .andExpect(status().isUnauthorized());
    }
}
