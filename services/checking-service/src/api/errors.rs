// AppError: error HTTP-friendly.
// Mapping previsto:
//   Overlapping              -> 409 Conflict
//   InvalidTimeRange         -> 400 Bad Request
//   NotFound                 -> 404 Not Found
//   Forbidden                -> 403 Forbidden
//   InvalidStatusTransition  -> 409 Conflict
