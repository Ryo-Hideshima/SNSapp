package com.snsapp.backend.exception;

public class CommentNotFoundException extends RuntimeException {

    public CommentNotFoundException() {
        super("コメントが見つかりません。");
    }
}
