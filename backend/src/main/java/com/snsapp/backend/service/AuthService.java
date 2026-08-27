package com.snsapp.backend.service;

import com.snsapp.backend.domain.User;
import com.snsapp.backend.dto.AuthResponse;
import com.snsapp.backend.dto.LoginRequest;
import com.snsapp.backend.dto.RefreshRequest;
import com.snsapp.backend.dto.RegisterRequest;
import com.snsapp.backend.exception.DuplicateResourceException;
import com.snsapp.backend.exception.InvalidCredentialsException;
import com.snsapp.backend.exception.InvalidRefreshTokenException;
import com.snsapp.backend.mapper.UserMapper;
import com.snsapp.backend.security.JwtService;
import com.snsapp.backend.security.RefreshTokenService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    public AuthService(
            UserMapper userMapper,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenService refreshTokenService
    ) {
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userMapper.findByUsername(request.username()).isPresent()) {
            throw new DuplicateResourceException("このユーザー名は既に使用されています。");
        }
        if (userMapper.findByEmail(request.email()).isPresent()) {
            throw new DuplicateResourceException("このメールアドレスは既に登録されています。");
        }

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(
                request.displayName() == null || request.displayName().isBlank()
                        ? request.username()
                        : request.displayName()
        );

        userMapper.insert(user);

        return issueTokens(user);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userMapper.findByEmail(request.email())
                .orElseThrow(() -> new InvalidCredentialsException("メールアドレスまたはパスワードが正しくありません。"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("メールアドレスまたはパスワードが正しくありません。");
        }

        return issueTokens(user);
    }

    public AuthResponse refresh(RefreshRequest request) {
        Long userId = refreshTokenService.validateAndRevoke(request.refreshToken());
        User user = userMapper.findById(userId)
                .orElseThrow(InvalidRefreshTokenException::new);

        return issueTokens(user);
    }

    public void logout(RefreshRequest request) {
        refreshTokenService.revoke(request.refreshToken());
    }

    private AuthResponse issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getUsername());
        String refreshToken = refreshTokenService.issue(user.getId());
        return new AuthResponse(accessToken, refreshToken, user.getId(), user.getUsername(), user.getDisplayName());
    }
}
