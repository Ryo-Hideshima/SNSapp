package com.snsapp.backend.controller;

import com.snsapp.backend.dto.UploadResponse;
import com.snsapp.backend.security.UserPrincipal;
import com.snsapp.backend.service.S3Service;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "アップロード")
@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private final S3Service s3Service;

    public UploadController(S3Service s3Service) {
        this.s3Service = s3Service;
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UploadResponse uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String url = s3Service.uploadAvatar(file, principal.getId());
        return new UploadResponse(url);
    }
}
