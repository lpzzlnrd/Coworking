const { ConflictError, NotFoundError } = require("../errors");
const { buildPageResponse } = require("../utils/pagination");

const INVOICE_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  OVERDUE: "OVERDUE"
};

function mapInvoice(row) {
  return {
    id: row.id,
    memberId: row.member_id,
    amount: row.amount,
    description: row.description,
    status: row.status,
    dueDate: row.due_date.toISOString(),
    paidAt: row.paid_at ? row.paid_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function createInvoiceService({ invoiceRepository }) {
  async function requireInvoice(id) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) {
      throw new NotFoundError(`Invoice not found: ${id}`);
    }

    return invoice;
  }

  return {
    async create(payload) {
      const created = await invoiceRepository.create(payload);
      return mapInvoice(created);
    },

    async findById(id) {
      return mapInvoice(await requireInvoice(id));
    },

    async findAll(page, size) {
      const result = await invoiceRepository.findAll(page, size);
      return buildPageResponse(result.items.map(mapInvoice), page, size, result.total);
    },

    async markPaid(id) {
      const invoice = await requireInvoice(id);
      if (invoice.status === INVOICE_STATUS.PAID) {
        throw new ConflictError("Invoice is already PAID");
      }

      const updated = await invoiceRepository.updateStatus(id, INVOICE_STATUS.PAID, new Date());
      return mapInvoice(updated);
    },

    async markOverdue(id) {
      const invoice = await requireInvoice(id);
      if (invoice.status !== INVOICE_STATUS.PENDING) {
        throw new ConflictError(
          `Only PENDING invoices can be marked OVERDUE; current status: ${invoice.status}`
        );
      }

      const updated = await invoiceRepository.updateStatus(id, INVOICE_STATUS.OVERDUE, invoice.paid_at);
      return mapInvoice(updated);
    },

    async bulkMarkOverdue() {
      return invoiceRepository.markOverdueInvoices(new Date());
    },

    toResponse(invoice) {
      return mapInvoice(invoice);
    }
  };
}

module.exports = { createInvoiceService };
