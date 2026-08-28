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
     * まだ有効(未失効・未期限切れ)なトークンだけを原子的に失効させる。WHERE句に有効性の条件を
     * 含めた1回のUPDATEで判定と失効を同時に行うため、同じトークンでの同時リクエストが両方とも
     * 検証を通過してしまう競合状態は発生しない(2件目のUPDATEはWHERE句にマッチせず0件更新になる)。
     * 実際に更新できた行数(0または1)を返す。
     */
    int revokeIfStillValid(
            @Param("tokenHash") String tokenHash,
            @Param("now") LocalDateTime now,
            @Param("revokedAt") LocalDateTime revokedAt
    );

    Optional<RefreshToken> findByTokenHash(@Param("tokenHash") String tokenHash);
}
