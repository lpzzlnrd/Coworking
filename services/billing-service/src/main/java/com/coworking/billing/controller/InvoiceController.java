package com.coworking.billing.controller;

import com.coworking.billing.dto.request.CreateInvoiceRequest;
import com.coworking.billing.dto.response.InvoiceResponse;
import com.coworking.billing.service.InvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    /**
     * POST /invoices
     * Creates a new PENDING invoice.
     */
    @PostMapping
    public ResponseEntity<InvoiceResponse> create(@Valid @RequestBody CreateInvoiceRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.create(req));
    }

    /**
     * GET /invoices?page=0&size=20
     * Returns paginated list of all invoices, newest first.
     */
    @GetMapping
    public ResponseEntity<Page<InvoiceResponse>> list(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(invoiceService.findAll(page, size));
    }

    /**
     * GET /invoices/{id}
     * Returns a single invoice by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<InvoiceResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.findById(id));
    }

    /**
     * PATCH /invoices/{id}/pay
     * Marks an invoice as PAID and records paidAt timestamp.
     */
    @PatchMapping("/{id}/pay")
    public ResponseEntity<InvoiceResponse> pay(@PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.markPaid(id));
    }

    /**
     * PATCH /invoices/{id}/overdue
     * Manually marks a PENDING invoice as OVERDUE.
     */
    @PatchMapping("/{id}/overdue")
    public ResponseEntity<InvoiceResponse> overdue(@PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.markOverdue(id));
    }

    /**
     * POST /invoices/overdue-sweep
     * Batch job: marks all PENDING past-due invoices as OVERDUE.
     */
    @PostMapping("/overdue-sweep")
    public ResponseEntity<Map<String, Integer>> overdueSweep() {
        int count = invoiceService.bulkMarkOverdue();
        return ResponseEntity.ok(Map.of("updatedCount", count));
    }
}
