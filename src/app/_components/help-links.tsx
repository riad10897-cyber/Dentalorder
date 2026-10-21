import { emailHref, whatsappHref } from "@/lib/contact";

/**
 * "Still stuck? WhatsApp us or email us." Under every error a student or
 * seller can't fix by themselves, so a dead end always has a way out.
 * The number and address live only inside the links.
 */
export function HelpLinks({ topic, className = "" }: { topic: string; className?: string }) {
  const whatsapp = whatsappHref(`Hi, about Molaro (${topic}): `);
  return (
    <p className={`text-native-caption text-ink-muted ${className}`}>
      Still stuck?{" "}
      {whatsapp && (
        <>
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-2">
            WhatsApp us
          </a>{" "}
          or{" "}
        </>
      )}
      <a href={emailHref(`Molaro: ${topic}`)} className="text-ink underline underline-offset-2">
        email us
      </a>
      .
    </p>
  );
}
