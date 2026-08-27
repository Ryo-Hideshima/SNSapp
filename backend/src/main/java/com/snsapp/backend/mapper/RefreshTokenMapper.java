package com.snsapp.backend.mapper;

import com.snsapp.backend.domain.RefreshToken;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.Optional;

@Mapper
public interface RefreshTokenMapper {

    Optional<RefreshToken> findByTokenHash(@Param("tokenHash") String tokenHash);

    void insert(RefreshToken refreshToken);

    void revokeByTokenHash(@Param("tokenHash") String tokenHash, @Param("revokedAt") LocalDateTime revokedAt);
}
