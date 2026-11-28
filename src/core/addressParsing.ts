export function parseStrictAddressInteger(
  input: string,
  allowLetterLedHex = false
): number | null {
  const value = input.trim();
  if (!value) return null;

  let parsed: number;
  if (/^0x[0-9a-f]+$/i.test(value)) {
    parsed = Number.parseInt(value.slice(2), 16);
  } else if (/^\d+$/.test(value)) {
    parsed = Number(value);
  } else if (
    allowLetterLedHex &&
    value.length <= 4 &&
    /^[0-9a-f]+$/i.test(value) &&
    /[a-f]/i.test(value)
  ) {
    // Keep legacy 16-bit unprefixed hex; longer hex values must use a 0x prefix.
    parsed = Number.parseInt(value, 16);
  } else {
    return null;
  }

  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}
