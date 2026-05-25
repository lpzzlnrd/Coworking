-- V1__create_invoices_table.sql
-- Flyway baseline migration for billing-service

CREATE TYPE invoice_status AS ENUM ('PENDING', 'PAID', 'OVERDUE');

CREATE TABLE invoices (
    id          UUID            NOT NULL DEFAULT gen_random_uuid(),
    member_id   UUID            NOT NULL,
    amount      NUMERIC(12, 2)  NOT NULL,
    description VARCHAR(500)    NOT NULL,
    status      invoice_status  NOT NULL DEFAULT 'PENDING',
    due_date    TIMESTAMPTZ     NOT NULL,
    paid_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT pk_invoices PRIMARY KEY (id),
    CONSTRAINT chk_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_invoices_member_id ON invoices (member_id);
CREATE INDEX idx_invoices_status    ON invoices (status);
CREATE INDEX idx_invoices_due_date  ON invoices (due_date);

-- Trigger to keep updated_at current on any row modification
CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  invoices              IS 'Billing invoices for coworking members';
COMMENT ON COLUMN invoices.member_id    IS 'UUID of the member from role-manage service';
COMMENT ON COLUMN invoices.amount       IS 'Amount due in platform currency (must be positive)';
COMMENT ON COLUMN invoices.status       IS 'PENDING | PAID | OVERDUE';
COMMENT ON COLUMN invoices.due_date     IS 'Payment deadline';
COMMENT ON COLUMN invoices.paid_at      IS 'Timestamp when payment was confirmed; null if unpaid';
