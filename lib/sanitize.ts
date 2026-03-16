import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "strong", "em", "s", "span",
  "ul", "ol", "li", "a", "br",
  "blockquote", "hr", "code",
];

const ALLOWED_ATTR = ["href", "target", "rel", "style"];

// Only allow font-size in inline styles
const STYLE_ALLOWLIST = /^font-size:\s*[\d.]+rem$/;

let hooksRegistered = false;

function ensureHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.hasAttribute("style")) {
      const style = node.getAttribute("style")!.trim().replace(/;$/, "");
      if (!STYLE_ALLOWLIST.test(style)) {
        node.removeAttribute("style");
      }
    }
  });
}

export function sanitizeHtml(dirty: string): string {
  if (typeof window === "undefined") return dirty;
  ensureHooks();
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
