package com.snsapp.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

/**
 * S3クライアントの設定。認証情報はコード上に持たず、SDKのデフォルト認証情報プロバイダーチェーン
 * (環境変数 AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY を優先的に読む)に任せる。
 */
@Configuration
public class S3Config {

    @Value("${aws.s3.region}")
    private String region;

    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
                .region(Region.of(region))
                .build();
    }
}
