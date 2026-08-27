package com.snsapp.backend.exception;

public class InvalidRefreshTokenException extends RuntimeException {

    public static final String DEFAULT_MESSAGE = "リフレッシュトークンが無効です。再度ログインしてください。";

    public InvalidRefreshTokenException() {
        super(DEFAULT_MESSAGE);
    }

    public InvalidRefreshTokenException(String message) {
        super(message);
    }
}
