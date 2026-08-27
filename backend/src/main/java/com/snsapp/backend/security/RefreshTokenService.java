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
import java.util.HexFormat;

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
     *
     * 検証と失効は1回のUPDATE(条件付き・RETURNING)で原子的に行う。SELECTしてから別途UPDATEする
     * 2ステップだと、同じトークンでの同時リクエストが両方とも検証を通過してしまう競合状態が生じるため。
     */
    public Long validateAndRevoke(String rawToken) {
        String tokenHash = hash(rawToken);
        LocalDateTime now = LocalDateTime.now();

        RefreshToken refreshToken = refreshTokenMapper.revokeIfUsable(tokenHash, now, now)
                .orElseThrow(InvalidRefreshTokenException::new);

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
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
