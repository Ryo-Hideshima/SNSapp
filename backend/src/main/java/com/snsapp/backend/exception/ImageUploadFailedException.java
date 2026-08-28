package com.snsapp.backend.exception;

public class ImageUploadFailedException extends RuntimeException {

    public ImageUploadFailedException(Throwable cause) {
        super("画像のアップロードに失敗しました。しばらくしてから再度お試しください。", cause);
    }
}
