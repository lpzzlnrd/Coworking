package com.coworking.billing.dto.response;

import java.math.BigDecimal;

public record RevenueSummaryResponse(
    String period,        // "daily" | "monthly" | "yearly"
    String label,         // e.g. "2026-05-24" | "2026-05" | "2026"
    BigDecimal totalRevenue,
    long invoiceCount
) {}
