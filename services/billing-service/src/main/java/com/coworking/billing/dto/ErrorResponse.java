package com.coworking.billing.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
    int status,
    String error,
    String message,
    List<String> details,
    Instant timestamp
) {
    public static ErrorResponse of(int status, String error, String message) {
        return new ErrorResponse(status, error, message, null, Instant.now());
    }

    public static ErrorResponse ofValidation(int status, List<String> details) {
        return new ErrorResponse(status, "Validation Failed",
                "One or more fields are invalid", details, Instant.now());
    }
}
