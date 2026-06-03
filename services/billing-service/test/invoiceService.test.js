const assert = require("node:assert/strict");
const test = require("node:test");

const { ConflictError, NotFoundError } = require("../src/errors");
const { createInvoiceService } = require("../src/services/invoiceService");

function createInvoiceRow(overrides = {}) {
  return {
    id: "invoice-1",
    member_id: "550e8400-e29b-41d4-a716-446655440000",
    amount: 125.5,
    description: "Monthly desk rental",
    status: "PENDING",
    due_date: new Date("2100-01-01T00:00:00.000Z"),
    paid_at: null,
    created_at: new Date("2099-12-01T00:00:00.000Z"),
    updated_at: new Date("2099-12-02T00:00:00.000Z"),
    ...overrides
  };
}

test("create maps repository rows to API responses", async () => {
  const payload = {
    memberId: "550e8400-e29b-41d4-a716-446655440000",
    amount: 125.5,
    description: "Monthly desk rental",
    dueDate: new Date("2100-01-01T00:00:00.000Z")
  };

  const invoiceRepository = {
    async create(receivedPayload) {
      assert.deepEqual(receivedPayload, payload);
      return createInvoiceRow();
    }
  };

  const service = createInvoiceService({ invoiceRepository });
  const invoice = await service.create(payload);

  assert.deepEqual(invoice, {
    id: "invoice-1",
    memberId: "550e8400-e29b-41d4-a716-446655440000",
    amount: 125.5,
    description: "Monthly desk rental",
    status: "PENDING",
    dueDate: "2100-01-01T00:00:00.000Z",
    paidAt: null,
    createdAt: "2099-12-01T00:00:00.000Z",
    updatedAt: "2099-12-02T00:00:00.000Z"
  });
});

test("findById throws a not found error for missing invoices", async () => {
  const invoiceRepository = {
    async findById() {
      return null;
    }
  };

  const service = createInvoiceService({ invoiceRepository });

  await assert.rejects(
    () => service.findById("invoice-1"),
    (error) => error instanceof NotFoundError && error.message === "Invoice not found: invoice-1"
  );
});

test("findAll returns a paginated response", async () => {
  const invoiceRepository = {
    async findAll(page, size) {
      assert.equal(page, 2);
      assert.equal(size, 5);
      return {
        items: [createInvoiceRow()],
        total: 11
      };
    }
  };

  const service = createInvoiceService({ invoiceRepository });
  const result = await service.findAll(2, 5);

  assert.equal(result.totalElements, 11);
  assert.equal(result.totalPages, 3);
  assert.equal(result.pageable.pageNumber, 2);
  assert.equal(result.numberOfElements, 1);
  assert.equal(result.content[0].id, "invoice-1");
});

test("markPaid updates pending invoices", async () => {
  let capturedArguments = null;
  const invoiceRepository = {
    async findById() {
      return createInvoiceRow();
    },
    async updateStatus(id, status, paidAt) {
      capturedArguments = { id, status, paidAt };
      return createInvoiceRow({
        status: "PAID",
        paid_at: paidAt,
        updated_at: new Date("2100-01-02T00:00:00.000Z")
      });
    }
  };

  const service = createInvoiceService({ invoiceRepository });
  const invoice = await service.markPaid("invoice-1");

  assert.equal(capturedArguments.id, "invoice-1");
  assert.equal(capturedArguments.status, "PAID");
  assert.ok(capturedArguments.paidAt instanceof Date);
  assert.equal(invoice.status, "PAID");
  assert.equal(invoice.paidAt, capturedArguments.paidAt.toISOString());
});

test("markPaid rejects invoices that are already paid", async () => {
  const invoiceRepository = {
    async findById() {
      return createInvoiceRow({ status: "PAID" });
    },
    async updateStatus() {
      throw new Error("should not be called");
    }
  };

  const service = createInvoiceService({ invoiceRepository });

  await assert.rejects(
    () => service.markPaid("invoice-1"),
    (error) => error instanceof ConflictError && error.message === "Invoice is already PAID"
  );
});

test("markOverdue updates only pending invoices", async () => {
  let capturedArguments = null;
  const invoiceRepository = {
    async findById() {
      return createInvoiceRow({ paid_at: null });
    },
    async updateStatus(id, status, paidAt) {
      capturedArguments = { id, status, paidAt };
      return createInvoiceRow({
        status: "OVERDUE",
        paid_at: null,
        updated_at: new Date("2100-01-03T00:00:00.000Z")
      });
    }
  };

  const service = createInvoiceService({ invoiceRepository });
  const invoice = await service.markOverdue("invoice-1");

  assert.equal(capturedArguments.id, "invoice-1");
  assert.equal(capturedArguments.status, "OVERDUE");
  assert.equal(capturedArguments.paidAt, null);
  assert.equal(invoice.status, "OVERDUE");
});

test("markOverdue rejects non-pending invoices", async () => {
  const invoiceRepository = {
    async findById() {
      return createInvoiceRow({ status: "PAID" });
    },
    async updateStatus() {
      throw new Error("should not be called");
    }
  };

  const service = createInvoiceService({ invoiceRepository });

  await assert.rejects(
    () => service.markOverdue("invoice-1"),
    (error) =>
      error instanceof ConflictError &&
      error.message === "Only PENDING invoices can be marked OVERDUE; current status: PAID"
  );
});

test("bulkMarkOverdue delegates to the repository with a current date", async () => {
  let receivedDate = null;
  const invoiceRepository = {
    async markOverdueInvoices(now) {
      receivedDate = now;
      return 7;
    }
  };

  const service = createInvoiceService({ invoiceRepository });
  const updatedCount = await service.bulkMarkOverdue();

  assert.equal(updatedCount, 7);
  assert.ok(receivedDate instanceof Date);
});
