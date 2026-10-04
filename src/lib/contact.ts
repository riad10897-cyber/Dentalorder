/*
 * How students and sellers reach Riad. Neither is shown on screen: the
 * Contact row opens to two buttons, and the number and address live only
 * inside their links. (Anyone reading the page source can still find
 * them; this keeps them off the screen, not secret.)
 */

export const CONTACT_EMAIL = "riad10897@gmail.com";

/**
 * WhatsApp number in international form, digits only, no "+" or spaces:
 * 961 and the Lebanese number, e.g. "96170123456". Empty hides the
 * WhatsApp button and leaves email.
 */
export const CONTACT_WHATSAPP = "";

export function whatsappHref(text: string): string | null {
  if (!/^\d{8,15}$/.test(CONTACT_WHATSAPP)) return null;
  return `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

export function emailHref(subject: string): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
