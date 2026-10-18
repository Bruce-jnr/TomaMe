import { AppError } from '../errors/app-error.js';

export function normalizeGhanaPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  const normalized = digits.startsWith('233')
    ? digits
    : digits.startsWith('0')
      ? `233${digits.slice(1)}`
      : `233${digits}`;
  if (!/^233\d{9}$/.test(normalized))
    throw new AppError(
      400,
      'INVALID_PHONE',
      'Enter a valid Ghana phone number.',
    );
  return normalized;
}
