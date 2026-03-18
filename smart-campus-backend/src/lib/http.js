export function ok(res, data) {
  res.status(200).json({ ok: true, ...data });
}

export function badRequest(res, message, details) {
  res.status(400).json({ ok: false, error: message, details });
}

export function unauthorized(res, message = 'Unauthorized') {
  res.status(401).json({ ok: false, error: message });
}

export function forbidden(res, message = 'Forbidden') {
  res.status(403).json({ ok: false, error: message });
}

export function notFound(res, message = 'Not found') {
  res.status(404).json({ ok: false, error: message });
}

