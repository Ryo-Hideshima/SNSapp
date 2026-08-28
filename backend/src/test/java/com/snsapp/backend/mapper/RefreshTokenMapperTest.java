package com.snsapp.backend.mapper;

import com.snsapp.backend.domain.RefreshToken;
import com.snsapp.backend.domain.User;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.boot.test.autoconfigure.MybatisTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@MybatisTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class RefreshTokenMapperTest {

    @Autowired
    private RefreshTokenMapper refreshTokenMapper;

    @Autowired
    private UserMapper userMapper;

    private User newUser(String username) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPasswordHash("hash");
        user.setDisplayName(username);
        userMapper.insert(user);
        return user;
    }

    private RefreshToken newToken(Long userId, String tokenHash, LocalDateTime expiresAt) {
        RefreshToken token = new RefreshToken();
        token.setUserId(userId);
        token.setTokenHash(tokenHash);
        token.setExpiresAt(expiresAt);
        refreshTokenMapper.insert(token);
        return token;
    }

    @Test
    void insert_generatesId() {
        User alice = newUser("alice");

        RefreshToken token = newToken(alice.getId(), "hash-insert", LocalDateTime.now().plusDays(1));

        assertThat(token.getId()).isNotNull();
    }

    @Test
    void findByTokenHash_returnsInsertedToken() {
        User alice = newUser("alice2");
        newToken(alice.getId(), "hash-find", LocalDateTime.now().plusDays(1));

        Optional<RefreshToken> found = refreshTokenMapper.findByTokenHash("hash-find");

        assertThat(found).isPresent();
        assertThat(found.get().getUserId()).isEqualTo(alice.getId());
        assertThat(found.get().getRevokedAt()).isNull();
    }

    @Test
    void revokeIfStillValid_whenTokenIsValid_updatesOneRowAndSetsRevokedAt() {
        User alice = newUser("alice3");
        newToken(alice.getId(), "hash-valid", LocalDateTime.now().plusDays(1));

        int updated = refreshTokenMapper.revokeIfStillValid("hash-valid", LocalDateTime.now(), LocalDateTime.now());

        assertThat(updated).isEqualTo(1);
        assertThat(refreshTokenMapper.findByTokenHash("hash-valid").orElseThrow().getRevokedAt()).isNotNull();
    }

    @Test
    void revokeIfStillValid_whenAlreadyRevoked_updatesZeroRowsAndDoesNotDoubleRevoke() {
        User alice = newUser("alice4");
        newToken(alice.getId(), "hash-revoked", LocalDateTime.now().plusDays(1));
        LocalDateTime firstRevokedAt = LocalDateTime.now();
        refreshTokenMapper.revokeIfStillValid("hash-revoked", LocalDateTime.now(), firstRevokedAt);

        int secondAttempt = refreshTokenMapper.revokeIfStillValid("hash-revoked", LocalDateTime.now(), LocalDateTime.now());

        assertThat(secondAttempt).isZero();
    }

    @Test
    void revokeIfStillValid_whenExpired_updatesZeroRows() {
        User alice = newUser("alice5");
        newToken(alice.getId(), "hash-expired", LocalDateTime.now().minusDays(1));

        int updated = refreshTokenMapper.revokeIfStillValid("hash-expired", LocalDateTime.now(), LocalDateTime.now());

        assertThat(updated).isZero();
    }

    @Test
    void revokeIfStillValid_whenTokenDoesNotExist_updatesZeroRows() {
        int updated = refreshTokenMapper.revokeIfStillValid("no-such-hash", LocalDateTime.now(), LocalDateTime.now());

        assertThat(updated).isZero();
    }

    @Test
    void revokeByTokenHash_setsRevokedAtUnconditionally() {
        User alice = newUser("alice6");
        newToken(alice.getId(), "hash-plain", LocalDateTime.now().plusDays(1));

        refreshTokenMapper.revokeByTokenHash("hash-plain", LocalDateTime.now());

        assertThat(refreshTokenMapper.findByTokenHash("hash-plain").orElseThrow().getRevokedAt()).isNotNull();
        // 既に失効済みなので、この後revokeIfStillValidを呼んでも0件のまま(二重失効しない)
        assertThat(refreshTokenMapper.revokeIfStillValid("hash-plain", LocalDateTime.now(), LocalDateTime.now())).isZero();
    }
}
