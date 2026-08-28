package com.snsapp.backend.service;

import com.snsapp.backend.exception.ImageUploadFailedException;
import com.snsapp.backend.exception.InvalidFileTypeException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class S3ServiceTest {

    @Mock
    private S3Client s3Client;

    private S3Service s3Service;

    @BeforeEach
    void setUp() {
        s3Service = new S3Service(s3Client, "snsapp-images", "ap-northeast-1");
    }

    @Test
    void uploadAvatar_uploadsToBucketAndReturnsPublicUrl() {
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[] {1, 2, 3});

        String url = s3Service.uploadAvatar(file, 42L);

        verify(s3Client).putObject(any(PutObjectRequest.class), any(software.amazon.awssdk.core.sync.RequestBody.class));
        assertThat(url).startsWith("https://snsapp-images.s3.ap-northeast-1.amazonaws.com/avatars/42/");
        assertThat(url).endsWith(".png");
    }

    @Test
    void uploadAvatar_whenContentTypeIsNotImage_throwsInvalidFileTypeException() {
        MockMultipartFile file = new MockMultipartFile("file", "note.txt", "text/plain", new byte[] {1});

        assertThatThrownBy(() -> s3Service.uploadAvatar(file, 42L))
                .isInstanceOf(InvalidFileTypeException.class);
    }

    @Test
    void uploadAvatar_whenContentTypeIsMissing_throwsInvalidFileTypeException() {
        MockMultipartFile file = new MockMultipartFile("file", "avatar", null, new byte[] {1});

        assertThatThrownBy(() -> s3Service.uploadAvatar(file, 42L))
                .isInstanceOf(InvalidFileTypeException.class);
    }

    @Test
    void uploadAvatar_whenS3Fails_throwsImageUploadFailedExceptionInsteadOfLeakingSdkException() {
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[] {1, 2, 3});
        when(s3Client.putObject(any(PutObjectRequest.class), any(software.amazon.awssdk.core.sync.RequestBody.class)))
                .thenThrow(NoSuchBucketException.builder().message("The specified bucket does not exist").build());

        assertThatThrownBy(() -> s3Service.uploadAvatar(file, 42L))
                .isInstanceOf(ImageUploadFailedException.class);
    }
}
