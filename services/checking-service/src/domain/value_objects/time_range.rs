use chrono::{DateTime, Utc};

use crate::domain::DomainError;

// TimeRange representa un intervalo [start, end) en UTC.
// El por qué de envolverlo en un value object:
//   1. centralizar la regla "start < end" para que el dominio no la revalide en cada uso.
//   2. permitir métodos como `overlaps_with` que serían torpes como funciones sueltas.
//   3. evitar pasar dos DateTime sueltos por toda la firma de funciones (más legible).
// El intervalo es semiabierto por la derecha (end exclusivo), igual que TSTZRANGE en
// Postgres por defecto, para evitar bugs de fencepost cuando dos reservas se tocan
// en el límite (ej. una termina a las 10:00 y otra empieza a las 10:00 NO chocan).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TimeRange {
    start: DateTime<Utc>,
    end: DateTime<Utc>,
}

impl TimeRange {
    pub fn new(start: DateTime<Utc>, end: DateTime<Utc>) -> Result<Self, DomainError> {
        if start >= end {
            return Err(DomainError::InvalidTimeRange(format!(
                "start ({start}) debe ser estrictamente menor que end ({end})"
            )));
        }
        Ok(Self { start, end })
    }

    pub fn start(&self) -> DateTime<Utc> {
        self.start
    }

    pub fn end(&self) -> DateTime<Utc> {
        self.end
    }

    pub fn duration_minutes(&self) -> i64 {
        (self.end - self.start).num_minutes()
    }

    // Dos rangos se solapan si comparten al menos un instante interior.
    // Con la regla "fin exclusivo", `[10, 11)` y `[11, 12)` NO se solapan.
    // Útil para validar antes de pegarle a la DB y dar mensajes claros al usuario
    // (la verificación dura ya la hace EXCLUDE USING gist en Postgres).
    pub fn overlaps_with(&self, other: &TimeRange) -> bool {
        self.start < other.end && other.start < self.end
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn at(hour: u32) -> DateTime<Utc> {
        Utc.with_ymd_and_hms(2026, 6, 1, hour, 0, 0).unwrap()
    }

    #[test]
    fn rejects_inverted_range() {
        let err = TimeRange::new(at(11), at(10)).unwrap_err();
        assert!(matches!(err, DomainError::InvalidTimeRange(_)));
    }

    #[test]
    fn rejects_empty_range() {
        let err = TimeRange::new(at(10), at(10)).unwrap_err();
        assert!(matches!(err, DomainError::InvalidTimeRange(_)));
    }

    #[test]
    fn accepts_valid_range() {
        let r = TimeRange::new(at(10), at(12)).unwrap();
        assert_eq!(r.duration_minutes(), 120);
    }

    #[test]
    fn touching_ranges_do_not_overlap() {
        // [10, 11) y [11, 12) se "tocan" pero no se solapan: el fin es exclusivo.
        let a = TimeRange::new(at(10), at(11)).unwrap();
        let b = TimeRange::new(at(11), at(12)).unwrap();
        assert!(!a.overlaps_with(&b));
        assert!(!b.overlaps_with(&a));
    }

    #[test]
    fn overlapping_ranges_detected() {
        let a = TimeRange::new(at(10), at(12)).unwrap();
        let b = TimeRange::new(at(11), at(13)).unwrap();
        assert!(a.overlaps_with(&b));
        assert!(b.overlaps_with(&a));
    }

    #[test]
    fn contained_range_is_overlap() {
        let outer = TimeRange::new(at(10), at(14)).unwrap();
        let inner = TimeRange::new(at(11), at(12)).unwrap();
        assert!(outer.overlaps_with(&inner));
        assert!(inner.overlaps_with(&outer));
    }
}
