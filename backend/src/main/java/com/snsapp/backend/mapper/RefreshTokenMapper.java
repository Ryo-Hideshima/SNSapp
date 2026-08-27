package com.snsapp.backend.mapper;

import com.snsapp.backend.domain.RefreshToken;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.Optional;

@Mapper
public interface RefreshTokenMapper {

    void insert(RefreshToken refreshToken);

    void revokeByTokenHash(@Param("tokenHash") String tokenHash, @Param("revokedAt") LocalDateTime revokedAt);

    /**
     * まだ有効(未失効・未期限切れ)なトークンだけを原子的に失効させ、失効できた場合にそのトークンを返す。
     * 条件に合致する行が無かった場合(既に失効済み・期限切れ・存在しない)はOptional.empty()。
     */
    Optional<RefreshToken> revokeIfUsable(
            @Param("tokenHash") String tokenHash,
            @Param("now") LocalDateTime now,
            @Param("revokedAt") LocalDateTime revokedAt
    );
}
