import DOMPurify from "dompurify";

// The Notes editor is contenteditable + document.execCommand, so it
// produces raw HTML (not React-rendered text), and stores/loads that HTML
// verbatim via .innerHTML. Every other piece of user content in this app
// goes through JSX (auto-escaped); this is the one place that doesn't, so
// it's the one place that needs explicit sanitization — an allowlist of
// exactly the formatting the toolbar can produce, nothing else (no
// scripts, no event handler attributes, no iframes).
const ALLOWED_TAGS = ["b", "strong", "i", "em", "ul", "li", "div", "br", "p"];

export function sanitizeNotesHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: [] });
}
