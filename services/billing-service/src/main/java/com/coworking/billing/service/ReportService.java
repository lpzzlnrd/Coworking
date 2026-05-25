package com.coworking.billing.service;

import com.coworking.billing.dto.response.MemberBillingHistoryResponse;
import com.coworking.billing.dto.response.RevenueSummaryResponse;
import com.coworking.billing.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceService invoiceService;

    // -----------------------------------------------------------------------
    // Revenue summary
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<RevenueSummaryResponse> revenueSummary(String period, Instant from, Instant to) {
        List<Object[]> rows = switch (period.toLowerCase()) {
            case "daily"   -> invoiceRepository.findDailyRevenue(from, to);
            case "monthly" -> invoiceRepository.findMonthlyRevenue(from, to);
            case "yearly"  -> invoiceRepository.findYearlyRevenue(from, to);
            default -> throw new IllegalArgumentException(
                    "Invalid period '" + period + "'. Valid values: daily, monthly, yearly");
        };

        return rows.stream()
                .map(row -> new RevenueSummaryResponse(
                        period,
                        (String) row[0],
                        (BigDecimal) row[1],
                        ((Number) row[2]).longValue()
                ))
                .toList();
    }

    // -----------------------------------------------------------------------
    // Per-member billing history
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public MemberBillingHistoryResponse memberHistory(UUID memberId, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        var invoicePage = invoiceRepository.findByMemberIdOrderByCreatedAtDesc(memberId, pageable);

        long totalInvoices   = invoiceRepository.countByMemberId(memberId);
        BigDecimal totalBilled = invoiceRepository.sumAmountByMemberId(memberId);
        BigDecimal totalPaid   = invoiceRepository.sumPaidAmountByMemberId(memberId);

        var invoiceResponses = invoicePage.getContent()
                .stream()
                .map(invoiceService::toResponse)
                .toList();

        return new MemberBillingHistoryResponse(
                memberId, totalInvoices, totalBilled, totalPaid, invoiceResponses);
    }
}
