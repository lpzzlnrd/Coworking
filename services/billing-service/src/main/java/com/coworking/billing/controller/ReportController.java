package com.coworking.billing.controller;

import com.coworking.billing.dto.response.MemberBillingHistoryResponse;
import com.coworking.billing.dto.response.RevenueSummaryResponse;
import com.coworking.billing.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    /**
     * GET /reports/revenue?period=monthly&from=2026-01-01T00:00:00Z&to=2026-06-01T00:00:00Z
     *
     * period: daily | monthly | yearly
     * from/to: ISO-8601 UTC instants (inclusive lower, exclusive upper)
     */
    @GetMapping("/revenue")
    public ResponseEntity<List<RevenueSummaryResponse>> revenue(
            @RequestParam String  period,
            @RequestParam Instant from,
            @RequestParam Instant to
    ) {
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("'from' must not be after 'to'");
        }
        return ResponseEntity.ok(reportService.revenueSummary(period, from, to));
    }

    /**
     * GET /reports/members/{memberId}/billing?page=0&size=20
     *
     * Returns aggregate stats + paginated invoice list for a single member.
     * Returns 200 with empty list if member has no invoices (member existence
     * is managed by role-manage, not billing).
     */
    @GetMapping("/members/{memberId}/billing")
    public ResponseEntity<MemberBillingHistoryResponse> memberBilling(
            @PathVariable UUID memberId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(reportService.memberHistory(memberId, page, size));
    }
}
