-- ============================================================================
-- checking-service · projections & check-ins
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tabla: spaces (Proyección local del servicio de espacios)
-- Almacenamos lo mínimo necesario para validar y mostrar información básica.
-- ---------------------------------------------------------------------------

CREATE TABLE spaces (
    id            UUID PRIMARY KEY,
    name          TEXT NOT NULL,
    resource_type TEXT NOT NULL, -- 'desk', 'meeting_room', 'office', etc.
    capacity      INT NOT NULL DEFAULT 1,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spaces_resource_type ON spaces (resource_type);
CREATE INDEX idx_spaces_is_active     ON spaces (is_active) WHERE is_active = TRUE;

CREATE TRIGGER spaces_set_updated_at
    BEFORE UPDATE ON spaces
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Tabla: users (Proyección local del servicio de identidades)
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    id         UUID PRIMARY KEY,
    email      TEXT NOT NULL,
    full_name  TEXT,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_email ON users (email);

-- ---------------------------------------------------------------------------
-- Tabla: check_ins
-- Registra el momento exacto en que un usuario ocupa su reserva.
-- ---------------------------------------------------------------------------

CREATE TABLE check_ins (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id  UUID NOT NULL UNIQUE REFERENCES reservations(id) ON DELETE CASCADE,
    check_in_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id       TEXT, -- ID del sensor, tablet o dispositivo que registró el check-in
    metadata        JSONB DEFAULT '{}'
);

CREATE INDEX idx_check_ins_reservation_id ON check_ins (reservation_id);
CREATE INDEX idx_check_ins_at             ON check_ins (check_in_at DESC);

-- ---------------------------------------------------------------------------
-- Integridad Referencial para tablas existentes
-- ---------------------------------------------------------------------------

ALTER TABLE reservations 
    ADD CONSTRAINT fk_reservations_space_id 
    FOREIGN KEY (space_id) REFERENCES spaces(id);

ALTER TABLE reservations 
    ADD CONSTRAINT fk_reservations_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE waitlist 
    ADD CONSTRAINT fk_waitlist_space_id 
    FOREIGN KEY (space_id) REFERENCES spaces(id);

ALTER TABLE waitlist 
    ADD CONSTRAINT fk_waitlist_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id);
