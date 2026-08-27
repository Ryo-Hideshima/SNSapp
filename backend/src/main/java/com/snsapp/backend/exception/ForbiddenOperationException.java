package com.snsapp.backend.exception;

public class ForbiddenOperationException extends RuntimeException {

    public ForbiddenOperationException() {
        super("この操作を行う権限がありません。");
    }
}
