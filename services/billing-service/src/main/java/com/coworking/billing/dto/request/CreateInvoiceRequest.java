package com.coworking.billing.dto.request;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CreateInvoiceRequest(

    @NotNull(message = "memberId is required")
    UUID memberId,

    @NotNull(message = "amount is required")
    @DecimalMin(value = "0.01", message = "amount must be greater than zero")
    @Digits(integer = 10, fraction = 2, message = "amount must have at most 10 integer digits and 2 decimal places")
    BigDecimal amount,

    @NotBlank(message = "description is required")
    @Size(max = 500, message = "description must not exceed 500 characters")
    String description,

    @NotNull(message = "dueDate is required")
    @Future(message = "dueDate must be in the future")
    Instant dueDate
) {}
