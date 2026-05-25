package com.coworking.billing.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record MemberBillingHistoryResponse(
    UUID memberId,
    long totalInvoices,
    BigDecimal totalBilled,
    BigDecimal totalPaid,
    List<InvoiceResponse> invoices
) {}
