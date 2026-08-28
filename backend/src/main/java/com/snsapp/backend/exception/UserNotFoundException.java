package com.snsapp.backend.exception;

public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException() {
        super("ユーザーが見つかりません。");
    }
}
