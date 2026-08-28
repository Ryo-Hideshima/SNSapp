package com.snsapp.backend.exception;

public class InvalidFileTypeException extends RuntimeException {

    public InvalidFileTypeException() {
        super("画像ファイルのみアップロードできます。");
    }
}
