package com.coworking.billing.repository;

import com.coworking.billing.entity.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    // -----------------------------------------------------------------------
    // Per-member queries
    // -----------------------------------------------------------------------

    Page<Invoice> findByMemberIdOrderByCreatedAtDesc(UUID memberId, Pageable pageable);

    long countByMemberId(UUID memberId);

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i WHERE i.memberId = :memberId")
    BigDecimal sumAmountByMemberId(@Param("memberId") UUID memberId);

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i WHERE i.memberId = :memberId AND i.status = com.coworking.billing.enums.InvoiceStatus.PAID")
    BigDecimal sumPaidAmountByMemberId(@Param("memberId") UUID memberId);

    // -----------------------------------------------------------------------
    // Revenue report queries (native SQL for date-truncation grouping)
    // -----------------------------------------------------------------------

    @Query(value = """
        SELECT
            TO_CHAR(paid_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS label,
            SUM(amount)                                        AS total_revenue,
            COUNT(*)                                           AS invoice_count
        FROM invoices
        WHERE status = 'PAID'
          AND paid_at >= :from
          AND paid_at <  :to
        GROUP BY label
        ORDER BY label
        """, nativeQuery = true)
    List<Object[]> findDailyRevenue(@Param("from") Instant from, @Param("to") Instant to);

    @Query(value = """
        SELECT
            TO_CHAR(paid_at AT TIME ZONE 'UTC', 'YYYY-MM') AS label,
            SUM(amount)                                     AS total_revenue,
            COUNT(*)                                        AS invoice_count
        FROM invoices
        WHERE status = 'PAID'
          AND paid_at >= :from
          AND paid_at <  :to
        GROUP BY label
        ORDER BY label
        """, nativeQuery = true)
    List<Object[]> findMonthlyRevenue(@Param("from") Instant from, @Param("to") Instant to);

    @Query(value = """
        SELECT
            TO_CHAR(paid_at AT TIME ZONE 'UTC', 'YYYY') AS label,
            SUM(amount)                                  AS total_revenue,
            COUNT(*)                                     AS invoice_count
        FROM invoices
        WHERE status = 'PAID'
          AND paid_at >= :from
          AND paid_at <  :to
        GROUP BY label
        ORDER BY label
        """, nativeQuery = true)
    List<Object[]> findYearlyRevenue(@Param("from") Instant from, @Param("to") Instant to);

    // -----------------------------------------------------------------------
    // Batch status update
    // -----------------------------------------------------------------------

    @Modifying
    @Query("UPDATE Invoice i SET i.status = com.coworking.billing.enums.InvoiceStatus.OVERDUE " +
           "WHERE i.status = com.coworking.billing.enums.InvoiceStatus.PENDING AND i.dueDate < :now")
    int markOverdueInvoices(@Param("now") Instant now);
}
