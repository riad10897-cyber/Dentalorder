"use client";

import { useState } from "react";
import { ChatIcon, MailIcon } from "@/app/_components/icons";
import { emailHref, whatsappHref } from "@/lib/contact";
import { NativeChevron, NativeRowBody, nativeRowClass } from "./menu";

const nativeOptionClass =
  "flex min-h-11 items-center gap-3 border-b-[0.5px] border-separator px-3.5 text-native-body text-ink last:border-none active:bg-card-sunk";

const optionClass =
  "pressable flex min-h-11 items-center gap-3 border-b border-hairline px-4 py-2 text-body text-ink last:border-none";

/**
 * "Contact us": a settings row that opens to WhatsApp and email. The
 * number and address are never printed, only carried by the two links.
 */
export function ContactRow({ native = false }: { native?: boolean }) {
  const [open, setOpen] = useState(false);
  const whatsapp = whatsappHref("Hi, about Molaro: ");

  if (native) {
    return (
      <li className="group/row">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`${nativeRowClass} w-full text-left active:bg-card-sunk`}
        >
          <NativeRowBody
            icon={<ChatIcon />}
            label="Contact us"
            detail={whatsapp ? "WhatsApp or email" : "Email"}
            chevron={<NativeChevron rotated={open} />}
          />
        </button>
        {open && (
          <div className="menu-in mx-3 mb-2 mt-2.5 overflow-hidden rounded-field bg-fill-faint">
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={nativeOptionClass}>
                <ChatIcon />
                Message on WhatsApp
              </a>
            )}
            <a href={emailHref("Molaro feedback")} className={nativeOptionClass}>
              <MailIcon />
              Send an email
            </a>
          </div>
        )}
      </li>
    );
  }

  return (
    <li className="border-b border-hairline last:border-none">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="pressable flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left"
      >
        <span className="shrink-0 text-ink-muted">
          <ChatIcon />
        </span>
        <span className="shrink-0 text-body text-ink">Contact us</span>
        <span className="min-w-0 flex-1 truncate text-right text-small text-ink-muted">
          {whatsapp ? "WhatsApp or email" : "Email"}
        </span>
        <svg
          aria-hidden
          className={`h-4 w-4 shrink-0 text-ink-faint transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          viewBox="0 0 24 24"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      {open && (
        <div className="menu-in border-t border-hairline bg-card-sunk">
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={optionClass}>
              <span className="shrink-0 text-ink-muted">
                <ChatIcon />
              </span>
              Message on WhatsApp
            </a>
          )}
          <a href={emailHref("Molaro feedback")} className={optionClass}>
            <span className="shrink-0 text-ink-muted">
              <MailIcon />
            </span>
            Send an email
          </a>
        </div>
      )}
    </li>
  );
}
