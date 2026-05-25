-- ============================================================================
-- checking-service · initial schema (modo simple: todo en `public`)
-- Las extensiones uuid-ossp y btree_gist deben estar habilitadas en la DB.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE reservation_status AS ENUM (
    'pending',
    'confirmed',
    'cancelled',
    'completed',
    'no_show'
);

CREATE TYPE waitlist_status AS ENUM (
    'waiting',
    'notified',
    'expired',
    'converted'
);

-- ---------------------------------------------------------------------------
-- Trigger genérico para updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Tabla: reservations
-- Entidad central. Una reserva ocupa un espacio en un rango de tiempo.
-- El EXCLUDE garantiza atómicamente que no haya dos reservas activas solapadas
-- para el mismo espacio.
-- ---------------------------------------------------------------------------

CREATE TABLE reservations (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Referencias a otros microservicios (FKs pendientes hasta que existan las tablas)
    user_id              UUID NOT NULL,
    space_id             UUID NOT NULL,

    -- Rango temporal [inicio, fin) -- end exclusivo para evitar fencepost bugs
    time_range           TSTZRANGE NOT NULL,

    -- Estado de la reserva
    status               reservation_status NOT NULL DEFAULT 'pending',

    -- Metadata
    notes                TEXT,
    cancellation_reason  TEXT,
    cancelled_at         TIMESTAMPTZ,

    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Validaciones a nivel DB
    CONSTRAINT reservations_time_range_non_empty CHECK (NOT isempty(time_range)),
    CONSTRAINT reservations_cancelled_consistent CHECK (
        (status = 'cancelled' AND cancelled_at IS NOT NULL)
        OR (status <> 'cancelled')
    ),

    -- ★ EL CORAZÓN DEL MÓDULO ★
    -- Para un mismo space_id, no permitir que dos rangos solapen mientras
    -- la reserva esté activa (pending o confirmed).
    CONSTRAINT reservations_no_overlap EXCLUDE USING gist (
        space_id WITH =,
        time_range WITH &&
    ) WHERE (status IN ('pending', 'confirmed'))
);

CREATE INDEX idx_reservations_user_id          ON reservations (user_id);
CREATE INDEX idx_reservations_space_id         ON reservations (space_id);
CREATE INDEX idx_reservations_status           ON reservations (status);
CREATE INDEX idx_reservations_time_range_gist  ON reservations USING gist (time_range);

CREATE TRIGGER reservations_set_updated_at
    BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Tabla: reservation_status_history
-- Bitácora de cambios de estado para auditoría.
-- ---------------------------------------------------------------------------

CREATE TABLE reservation_status_history (
    id              BIGSERIAL PRIMARY KEY,
    reservation_id  UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    from_status     reservation_status,
    to_status       reservation_status NOT NULL,
    changed_by      UUID NOT NULL,           -- ref auth-service (FK pendiente)
    reason          TEXT,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_history_reservation_id ON reservation_status_history (reservation_id);
CREATE INDEX idx_status_history_changed_at     ON reservation_status_history (changed_at DESC);

-- ---------------------------------------------------------------------------
-- Tabla: waitlist
-- Lista de espera para cuando un espacio está ocupado en el rango deseado.
-- ---------------------------------------------------------------------------

CREATE TABLE waitlist (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL,
    space_id        UUID NOT NULL,
    desired_range   TSTZRANGE NOT NULL,
    status          waitlist_status NOT NULL DEFAULT 'waiting',
    notified_at     TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT waitlist_range_non_empty CHECK (NOT isempty(desired_range)),
    CONSTRAINT waitlist_expires_future CHECK (expires_at > created_at)
);

CREATE INDEX idx_waitlist_space_status ON waitlist (space_id, status);
CREATE INDEX idx_waitlist_user_id      ON waitlist (user_id);
CREATE INDEX idx_waitlist_expires_at   ON waitlist (expires_at) WHERE status = 'waiting';
