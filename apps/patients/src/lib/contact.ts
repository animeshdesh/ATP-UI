/* Indian phone numbers and the hand-off links staff use (call, WhatsApp, maps). */

const last10 = (phone: string) => phone.replace(/\D/g, '').slice(-10);

/** "98220 41721", "+91 98220 41721", "09822041721" → "+919822041721"; null if not a mobile number. */
export function toE164(input: string): string | null {
  const d = input.replace(/\D/g, '');
  const local =
    d.length === 12 && d.startsWith('91')
      ? d.slice(2)
      : d.length === 11 && d.startsWith('0')
        ? d.slice(1)
        : d;
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}

/** "+919822041721" → "+91 98220 41721". */
export function formatPhone(phone: string): string {
  const d = last10(phone);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : phone;
}

export const samePhone = (a: string, b: string) =>
  last10(a) === last10(b) && last10(a).length === 10;

export const telLink = (phone: string) => `tel:+91${last10(phone)}`;

/** Opens WhatsApp with the message filled in; staff press send (V2a, D-045). */
export const waLink = (phone: string, text: string) =>
  `https://wa.me/91${last10(phone)}?text=${encodeURIComponent(text)}`;

export const mapLink = (address: string) =>
  `https://maps.google.com/?q=${encodeURIComponent(address)}`;

/** "Dr. Neha Patil" → "NP". */
export const initialsOf = (name: string) =>
  name
    .replace(/^Dr\.\s*/, '')
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const firstName = (name: string) => name.replace(/^Dr\.\s*/, '').split(/\s+/)[0] ?? name;
