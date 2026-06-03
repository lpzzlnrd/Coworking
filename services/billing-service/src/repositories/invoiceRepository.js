function createInvoiceRepository(pool) {
  return {
    async create({ memberId, amount, description, dueDate }) {
      const result = await pool.query(
        `
          INSERT INTO invoices (member_id, amount, description, status, due_date)
          VALUES ($1, $2, $3, 'PENDING', $4)
          RETURNING *
        `,
        [memberId, amount, description, dueDate]
      );

      return result.rows[0];
    },

    async findById(id) {
      const result = await pool.query("SELECT * FROM invoices WHERE id = $1", [id]);
      return result.rows[0] ?? null;
    },

    async findAll(page, size) {
      const offset = page * size;
      const [itemsResult, countResult] = await Promise.all([
        pool.query(
          `
            SELECT *
            FROM invoices
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
          `,
          [size, offset]
        ),
        pool.query("SELECT COUNT(*) AS total FROM invoices")
      ]);

      return {
        items: itemsResult.rows,
        total: Number.parseInt(countResult.rows[0].total, 10)
      };
    },

    async updateStatus(id, status, paidAt = null) {
      const result = await pool.query(
        `
          UPDATE invoices
          SET status = $2,
              paid_at = $3
          WHERE id = $1
          RETURNING *
        `,
        [id, status, paidAt]
      );

      return result.rows[0] ?? null;
    },

    async markOverdueInvoices(now) {
      const result = await pool.query(
        `
          UPDATE invoices
          SET status = 'OVERDUE'
          WHERE status = 'PENDING'
            AND due_date < $1
        `,
        [now]
      );

      return result.rowCount ?? 0;
    },

    async findMemberInvoices(memberId, page, size) {
      const offset = page * size;
      const [itemsResult, countResult, billedResult, paidResult] = await Promise.all([
        pool.query(
          `
            SELECT *
            FROM invoices
            WHERE member_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
          `,
          [memberId, size, offset]
        ),
        pool.query("SELECT COUNT(*) AS total FROM invoices WHERE member_id = $1", [memberId]),
        pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM invoices WHERE member_id = $1", [memberId]),
        pool.query(
          `
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM invoices
            WHERE member_id = $1
              AND status = 'PAID'
          `,
          [memberId]
        )
      ]);

      return {
        items: itemsResult.rows,
        totalInvoices: Number.parseInt(countResult.rows[0].total, 10),
        totalBilled: billedResult.rows[0].total,
        totalPaid: paidResult.rows[0].total
      };
    },

    async findRevenueSummary(period, from, to) {
      const formats = {
        daily: "YYYY-MM-DD",
        monthly: "YYYY-MM",
        yearly: "YYYY"
      };

      const result = await pool.query(
        `
          SELECT
            TO_CHAR(paid_at AT TIME ZONE 'UTC', '${formats[period]}') AS label,
            SUM(amount) AS total_revenue,
            COUNT(*) AS invoice_count
          FROM invoices
          WHERE status = 'PAID'
            AND paid_at >= $1
            AND paid_at < $2
          GROUP BY label
          ORDER BY label
        `,
        [from, to]
      );

      return result.rows;
    }
  };
}

module.exports = { createInvoiceRepository };
