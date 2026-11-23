/** Normalise a phone number to digits only. 10-digit Indian numbers get the 91 prefix. */
export function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, "").replace(/^0+/, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export function looksLikeEmail(input: string) {
  return input.includes("@");
}

/** Internal placeholder email for users who log in with phone only (never receives mail). */
export function placeholderEmail(phone: string) {
  return `${phone}@phone.jobpilot.invalid`;
}
