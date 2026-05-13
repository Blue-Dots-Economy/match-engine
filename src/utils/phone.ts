export const normalizeIndianPhone = (
  value: unknown,
  context?: string,
): string => {
  if (!value) {
    throw new Error(`Phone number missing${context ? ` (${context})` : ''}`);
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(
      `Invalid phone number type${context ? ` (${context})` : ''}`,
    );
  }

  let phone = String(value).trim().toLowerCase();

  if (['na', 'n/a', 'null', 'undefined', ''].includes(phone)) {
    throw new Error(
      `Invalid phone number value${context ? ` (${context})` : ''}`,
    );
  }

  phone = phone.replace(/\D/g, '');

  if (phone.length === 11 && phone.startsWith('0')) {
    phone = phone.slice(1);
  }

  if (phone.length === 10) {
    return `+91${phone}`;
  }

  if (phone.length === 12 && phone.startsWith('91')) {
    return `+${phone}`;
  }

  throw new Error(
    `Invalid Indian phone number format: ${value}${
      context ? ` (${context})` : ''
    }`,
  );
};