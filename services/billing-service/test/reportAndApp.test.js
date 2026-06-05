const assert = require("node:assert/strict");
const test = require("node:test");

const { createApp } = require("../src/app");
const { createReportService } = require("../src/services/reportService");

function createServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

test("reportService maps revenue summaries", async () => {
  const invoiceRepository = {
    async findRevenueSummary(period, from, to) {
      assert.equal(period, "monthly");
      assert.equal(from.toISOString(), "2026-01-01T00:00:00.000Z");
      assert.equal(to.toISOString(), "2026-02-01T00:00:00.000Z");
      return [
        {
          label: "2026-01",
          total_revenue: "2450.75",
          invoice_count: "3"
        }
      ];
    }
  };

  const reportService = createReportService({
    invoiceRepository,
    invoiceService: {
      toResponse() {
        throw new Error("should not be called");
      }
    }
  });

  const summary = await reportService.revenueSummary(
    "monthly",
    new Date("2026-01-01T00:00:00.000Z"),
    new Date("2026-02-01T00:00:00.000Z")
  );

  assert.deepEqual(summary, [
    {
      period: "monthly",
      label: "2026-01",
      totalRevenue: "2450.75",
      invoiceCount: 3
    }
  ]);
});

test("reportService maps member history items through invoiceService", async () => {
  const invoiceOne = {
    id: "invoice-1",
    member_id: "member-1",
    amount: 125,
    description: "Desk",
    status: "PAID",
    due_date: new Date("2100-01-01T00:00:00.000Z"),
    paid_at: new Date("2100-01-02T00:00:00.000Z"),
    created_at: new Date("2099-12-01T00:00:00.000Z"),
    updated_at: new Date("2099-12-02T00:00:00.000Z")
  };
  const invoiceTwo = {
    id: "invoice-2",
    member_id: "member-1",
    amount: 75,
    description: "Locker",
    status: "PENDING",
    due_date: new Date("2100-01-15T00:00:00.000Z"),
    paid_at: null,
    created_at: new Date("2099-12-03T00:00:00.000Z"),
    updated_at: new Date("2099-12-04T00:00:00.000Z")
  };

  const invoiceRepository = {
    async findMemberInvoices(memberId, page, size) {
      assert.equal(memberId, "550e8400-e29b-41d4-a716-446655440000");
      assert.equal(page, 1);
      assert.equal(size, 10);
      return {
        items: [invoiceOne, invoiceTwo],
        totalInvoices: 2,
        totalBilled: "200",
        totalPaid: "125"
      };
    }
  };

  const invoiceService = {
    toResponse(invoice) {
      return {
        id: invoice.id,
        status: invoice.status,
        mapped: true
      };
    }
  };

  const reportService = createReportService({ invoiceRepository, invoiceService });
  const history = await reportService.memberHistory(
    "550e8400-e29b-41d4-a716-446655440000",
    1,
    10
  );

  assert.deepEqual(history, {
    memberId: "550e8400-e29b-41d4-a716-446655440000",
    totalInvoices: 2,
    totalBilled: "200",
    totalPaid: "125",
    invoices: [
      { id: "invoice-1", status: "PAID", mapped: true },
      { id: "invoice-2", status: "PENDING", mapped: true }
    ]
  });
});

test("createApp wires health and error responses", async () => {
  const app = createApp({
    invoiceService: {
      async create() {
        return { ok: true };
      },
      async findAll(page, size) {
        assert.equal(page, 2);
        assert.equal(size, 5);
        return { content: [], pageable: {}, totalElements: 0 };
      },
      async findById() {
        return { ok: true };
      },
      async markPaid() {
        return { ok: true };
      },
      async markOverdue() {
        return { ok: true };
      },
      async bulkMarkOverdue() {
        return 0;
      }
    },
    reportService: {
      async revenueSummary() {
        return [];
      },
      async memberHistory() {
        return { invoices: [] };
      }
    }
  });

  const { server, baseUrl } = await createServer(app);

  try {
    const healthResponse = await fetch(`${baseUrl}/health`);
    assert.equal(healthResponse.status, 200);
    const healthBody = await healthResponse.json();
    assert.equal(healthBody.status, "ok");
    assert.equal(healthBody.service, "billing-service");
    assert.equal(Object.hasOwn(healthBody, "env"), false);

    const invoicesResponse = await fetch(`${baseUrl}/invoices?page=2&size=5`);
    assert.equal(invoicesResponse.status, 200);
    assert.deepEqual(await invoicesResponse.json(), {
      content: [],
      pageable: {},
      totalElements: 0
    });

    const invalidInvoiceResponse = await fetch(`${baseUrl}/invoices/not-a-uuid`);
    assert.equal(invalidInvoiceResponse.status, 400);
    const invalidInvoiceBody = await invalidInvoiceResponse.json();
    assert.equal(invalidInvoiceBody.error, "Bad Request");
    assert.equal(invalidInvoiceBody.message, "id must be a valid UUID");

    const revenueResponse = await fetch(
      `${baseUrl}/reports/revenue?period=monthly&from=2026-02-01T00:00:00.000Z&to=2026-01-01T00:00:00.000Z`
    );
    assert.equal(revenueResponse.status, 400);
    const revenueBody = await revenueResponse.json();
    assert.equal(revenueBody.error, "Bad Request");
    assert.equal(revenueBody.message, "'from' must not be after 'to'");

    const notFoundResponse = await fetch(`${baseUrl}/missing-route`);
    assert.equal(notFoundResponse.status, 404);
    const notFoundBody = await notFoundResponse.json();
    assert.equal(notFoundBody.error, "Not Found");
    assert.equal(notFoundBody.message, "Route not found: GET /missing-route");
  } finally {
    await closeServer(server);
  }
});
