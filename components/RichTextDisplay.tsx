"use client";

import { sanitizeHtml } from "@/lib/sanitize";

interface RichTextDisplayProps {
  html: string;
  className?: string;
}

export default function RichTextDisplay({
  html,
  className = "",
}: RichTextDisplayProps) {
  return (
    <div
      className={`rich-text ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
