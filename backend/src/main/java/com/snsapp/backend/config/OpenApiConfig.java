package com.snsapp.backend.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/**
 * springdoc-openapiによるAPI仕様書(Swagger UI)の設定。
 * JWTアクセストークンをBearer認証として登録し、Swagger UIの「Authorize」ボタンから
 * 認証必須エンドポイントも試せるようにする。
 */
@OpenAPIDefinition(
        info = @Info(
                title = "SNSapp API",
                version = "v1",
                description = "X/Twitter風SNSアプリのバックエンドAPI仕様書。エンドポイント定義から自動生成している。"
        ),
        security = @SecurityRequirement(name = "bearerAuth")
)
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT"
)
@Configuration
public class OpenApiConfig {
}
