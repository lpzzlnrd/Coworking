package com.coworking.billing.service;

import com.coworking.billing.dto.request.CreateInvoiceRequest;
import com.coworking.billing.dto.response.InvoiceResponse;
import com.coworking.billing.entity.Invoice;
import com.coworking.billing.enums.InvoiceStatus;
import com.coworking.billing.exception.InvoiceNotFoundException;
import com.coworking.billing.exception.InvalidStatusTransitionException;
import com.coworking.billing.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;

    // -----------------------------------------------------------------------
    // CRUD
    // -----------------------------------------------------------------------

    @Transactional
    public InvoiceResponse create(CreateInvoiceRequest req) {
        Invoice invoice = Invoice.builder()
                .memberId(req.memberId())
                .amount(req.amount())
                .description(req.description())
                .status(InvoiceStatus.PENDING)
                .dueDate(req.dueDate())
                .build();
        return toResponse(invoiceRepository.save(invoice));
    }

    @Transactional(readOnly = true)
    public InvoiceResponse findById(UUID id) {
        return toResponse(requireInvoice(id));
    }

    @Transactional(readOnly = true)
    public Page<InvoiceResponse> findAll(int page, int size) {
        return invoiceRepository
                .findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()))
                .map(this::toResponse);
    }

    // -----------------------------------------------------------------------
    // Status transitions
    // -----------------------------------------------------------------------

    @Transactional
    public InvoiceResponse markPaid(UUID id) {
        Invoice invoice = requireInvoice(id);
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new InvalidStatusTransitionException("Invoice is already PAID");
        }
        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaidAt(Instant.now());
        return toResponse(invoiceRepository.save(invoice));
    }

    @Transactional
    public InvoiceResponse markOverdue(UUID id) {
        Invoice invoice = requireInvoice(id);
        if (invoice.getStatus() != InvoiceStatus.PENDING) {
            throw new InvalidStatusTransitionException(
                    "Only PENDING invoices can be marked OVERDUE; current status: " + invoice.getStatus());
        }
        invoice.setStatus(InvoiceStatus.OVERDUE);
        return toResponse(invoiceRepository.save(invoice));
    }

    // -----------------------------------------------------------------------
    // Batch
    // -----------------------------------------------------------------------

    @Transactional
    public int bulkMarkOverdue() {
        return invoiceRepository.markOverdueInvoices(Instant.now());
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private Invoice requireInvoice(UUID id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new InvoiceNotFoundException("Invoice not found: " + id));
    }

    public InvoiceResponse toResponse(Invoice i) {
        return new InvoiceResponse(
                i.getId(), i.getMemberId(), i.getAmount(), i.getDescription(),
                i.getStatus(), i.getDueDate(), i.getPaidAt(), i.getCreatedAt(), i.getUpdatedAt());
    }
}
