function createReportService({ invoiceRepository, invoiceService }) {
  return {
    async revenueSummary(period, from, to) {
      const rows = await invoiceRepository.findRevenueSummary(period, from, to);
      return rows.map((row) => ({
        period,
        label: row.label,
        totalRevenue: row.total_revenue,
        invoiceCount: Number.parseInt(row.invoice_count, 10)
      }));
    },

    async memberHistory(memberId, page, size) {
      const result = await invoiceRepository.findMemberInvoices(memberId, page, size);
      return {
        memberId,
        totalInvoices: result.totalInvoices,
        totalBilled: result.totalBilled,
        totalPaid: result.totalPaid,
        invoices: result.items.map(invoiceService.toResponse)
      };
    }
  };
}

module.exports = { createReportService };
