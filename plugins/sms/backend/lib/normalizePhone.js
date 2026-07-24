// E.164 phone number normalization and validation.
//
// Accepts various formats:
//   "+1-234-567-8900"  → "+12345678900"
//   "(234) 567-8900"   → "+12345678900"  (US default)
//   "12345678900"      → "+12345678900"
//   "+442071234567"    → "+442071234567"
//   15551234567        → "+15551234567"   (numeric input coerced)
//
// Returns null if the result does not pass E.164 validation.

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

/**
 * Normalize a phone string to E.164 format.
 * Strips all non-digit/non-plus characters.
 * If the result is 10 digits (no country code), prepends +1 (US default).
 * If the result is 11+ digits without a leading +, prepends +.
 * Returns null if the result is not valid E.164.
 */
export function normalizeE164(phone) {
  if (!phone) return null;

  // Coerce numbers to strings (some DBs store phone as integer)
  const phoneStr = typeof phone === 'string' ? phone : String(phone);

  // Strip everything except digits and leading +
  let cleaned = phoneStr.replace(/[^\d+]/g, '');

  // If starts with +, keep it; otherwise work with digits only
  if (cleaned.startsWith('+')) {
    // Already has country code indicator
  } else if (cleaned.length === 10) {
    // US number without country code
    cleaned = '+1' + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // US number with country code but no +
    cleaned = '+' + cleaned;
  } else if (cleaned.length >= 7) {
    // International number without +
    cleaned = '+' + cleaned;
  }

  return E164_REGEX.test(cleaned) ? cleaned : null;
}

/**
 * Check if a phone string is valid E.164.
 */
export function isValidE164(phone) {
  return normalizeE164(phone) !== null;
}
