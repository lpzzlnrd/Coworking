package com.coworking.billing.dto.response;

import com.coworking.billing.enums.InvoiceStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record InvoiceResponse(
    UUID id,
    UUID memberId,
    BigDecimal amount,
    String description,
    InvoiceStatus status,
    Instant dueDate,
    Instant paidAt,
    Instant createdAt,
    Instant updatedAt
) {}
