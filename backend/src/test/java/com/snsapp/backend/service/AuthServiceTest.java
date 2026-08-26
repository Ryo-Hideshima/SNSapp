package com.snsapp.backend.service;

import com.snsapp.backend.domain.User;
import com.snsapp.backend.dto.LoginRequest;
import com.snsapp.backend.dto.RegisterRequest;
import com.snsapp.backend.exception.DuplicateResourceException;
import com.snsapp.backend.exception.InvalidCredentialsException;
import com.snsapp.backend.mapper.UserMapper;
import com.snsapp.backend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserMapper userMapper;

    @Mock
    private JwtService jwtService;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userMapper, passwordEncoder, jwtService);
    }

    @Test
    void register_savesUserWithHashedPasswordAndReturnsToken() {
        RegisterRequest request = new RegisterRequest("alice", "alice@example.com", "password123", "Alice");
        when(userMapper.findByUsername("alice")).thenReturn(Optional.empty());
        when(userMapper.findByEmail("alice@example.com")).thenReturn(Optional.empty());
        doAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(1L);
            return null;
        }).when(userMapper).insert(any(User.class));
        when(jwtService.generateToken(anyLong(), anyString())).thenReturn("dummy-token");

        var response = authService.register(request);

        assertThat(response.token()).isEqualTo("dummy-token");
        assertThat(response.username()).isEqualTo("alice");
        assertThat(response.displayName()).isEqualTo("Alice");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userMapper).insert(captor.capture());
        assertThat(captor.getValue().getPasswordHash()).isNotEqualTo("password123");
        assertThat(passwordEncoder.matches("password123", captor.getValue().getPasswordHash())).isTrue();
    }

    @Test
    void register_withDuplicateUsername_throwsDuplicateResourceException() {
        RegisterRequest request = new RegisterRequest("alice", "alice@example.com", "password123", null);
        when(userMapper.findByUsername("alice")).thenReturn(Optional.of(new User()));

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void register_withDuplicateEmail_throwsDuplicateResourceException() {
        RegisterRequest request = new RegisterRequest("alice", "alice@example.com", "password123", null);
        when(userMapper.findByUsername("alice")).thenReturn(Optional.empty());
        when(userMapper.findByEmail("alice@example.com")).thenReturn(Optional.of(new User()));

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void register_withBlankDisplayName_fallsBackToUsername() {
        RegisterRequest request = new RegisterRequest("bob", "bob@example.com", "password123", "  ");
        when(userMapper.findByUsername("bob")).thenReturn(Optional.empty());
        when(userMapper.findByEmail("bob@example.com")).thenReturn(Optional.empty());
        doAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(2L);
            return null;
        }).when(userMapper).insert(any(User.class));
        when(jwtService.generateToken(anyLong(), anyString())).thenReturn("dummy-token");

        var response = authService.register(request);

        assertThat(response.displayName()).isEqualTo("bob");
    }

    @Test
    void login_withCorrectCredentials_returnsToken() {
        User user = new User();
        user.setId(1L);
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setDisplayName("Alice");
        user.setPasswordHash(passwordEncoder.encode("password123"));

        when(userMapper.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(1L, "alice")).thenReturn("dummy-token");

        var response = authService.login(new LoginRequest("alice@example.com", "password123"));

        assertThat(response.token()).isEqualTo("dummy-token");
        assertThat(response.userId()).isEqualTo(1L);
    }

    @Test
    void login_withWrongPassword_throwsInvalidCredentialsException() {
        User user = new User();
        user.setPasswordHash(passwordEncoder.encode("password123"));
        when(userMapper.findByEmail("alice@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("alice@example.com", "wrong-password")))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_withUnknownEmail_throwsInvalidCredentialsException() {
        when(userMapper.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("unknown@example.com", "password123")))
                .isInstanceOf(InvalidCredentialsException.class);
    }
}
