"use client";

import { useState } from "react";

export default function CopyButton({
  text,
  label = "복사",
  className = "btn-outline",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const value = text.startsWith("/") ? `${window.location.origin}${text}` : text;
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "복사됨 ✓" : label}
    </button>
  );
}
