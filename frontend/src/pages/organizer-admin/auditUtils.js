export function readableAction(value) {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function safeAuditValue(value) {
  const blocked = /password|secret|token|otp|authorization|cookie|key/i;
  function redact(item) {
    if (Array.isArray(item)) return item.map(redact);
    if (item && typeof item === 'object') {
      return Object.fromEntries(
        Object.entries(item).map(([key, entry]) => [
          key,
          blocked.test(key) ? '[REDACTED]' : redact(entry),
        ]),
      );
    }
    return item;
  }
  return value == null ? null : redact(value);
}
