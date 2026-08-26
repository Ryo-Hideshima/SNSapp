package com.snsapp.backend.service;

import com.snsapp.backend.domain.User;
import com.snsapp.backend.dto.AuthResponse;
import com.snsapp.backend.dto.LoginRequest;
import com.snsapp.backend.dto.RegisterRequest;
import com.snsapp.backend.exception.DuplicateResourceException;
import com.snsapp.backend.exception.InvalidCredentialsException;
import com.snsapp.backend.mapper.UserMapper;
import com.snsapp.backend.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserMapper userMapper, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
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

        String token = jwtService.generateToken(user.getId(), user.getUsername());
        return new AuthResponse(token, user.getId(), user.getUsername(), user.getDisplayName());
    }

    public AuthResponse login(LoginRequest request) {
        User user = userMapper.findByEmail(request.email())
                .orElseThrow(() -> new InvalidCredentialsException("メールアドレスまたはパスワードが正しくありません。"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("メールアドレスまたはパスワードが正しくありません。");
        }

        String token = jwtService.generateToken(user.getId(), user.getUsername());
        return new AuthResponse(token, user.getId(), user.getUsername(), user.getDisplayName());
    }
}
