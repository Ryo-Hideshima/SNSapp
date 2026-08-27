package com.snsapp.backend.security;

import com.snsapp.backend.domain.RefreshToken;
import com.snsapp.backend.exception.InvalidRefreshTokenException;
import com.snsapp.backend.mapper.RefreshTokenMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
public class RefreshTokenService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final RefreshTokenMapper refreshTokenMapper;
    private final Duration expiration;

    public RefreshTokenService(
            RefreshTokenMapper refreshTokenMapper,
            @Value("${app.jwt.refresh-expiration-days}") long refreshExpirationDays
    ) {
        this.refreshTokenMapper = refreshTokenMapper;
        this.expiration = Duration.ofDays(refreshExpirationDays);
    }

    /**
     * 新しいリフレッシュトークンを発行し、生の値(クライアントに返す用)を返す。
     * DBにはハッシュ値のみ保存する。
     */
    public String issue(Long userId) {
        String rawToken = generateRawToken();

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUserId(userId);
        refreshToken.setTokenHash(hash(rawToken));
        refreshToken.setExpiresAt(LocalDateTime.now().plus(expiration));
        refreshTokenMapper.insert(refreshToken);

        return rawToken;
    }

    /**
     * リフレッシュトークンを検証し、有効なら失効させたうえで所有者のuserIdを返す(ローテーション)。
     * 無効・期限切れ・失効済みの場合は例外を投げる。
     */
    public Long validateAndRevoke(String rawToken) {
        String tokenHash = hash(rawToken);
        RefreshToken refreshToken = refreshTokenMapper.findByTokenHash(tokenHash)
                .orElseThrow(() -> new InvalidRefreshTokenException("リフレッシュトークンが無効です。再度ログインしてください。"));

        if (!refreshToken.isUsable(LocalDateTime.now())) {
            throw new InvalidRefreshTokenException("リフレッシュトークンが無効です。再度ログインしてください。");
        }

        refreshTokenMapper.revokeByTokenHash(tokenHash, LocalDateTime.now());
        return refreshToken.getUserId();
    }

    public void revoke(String rawToken) {
        refreshTokenMapper.revokeByTokenHash(hash(rawToken), LocalDateTime.now());
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
