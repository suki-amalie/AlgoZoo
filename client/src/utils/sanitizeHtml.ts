import DOMPurify from 'dompurify'

// Only the CSS the rich-text toolbar can actually produce (size/colour) is
// allowed to survive sanitization — anything else in a style attribute is stripped.
const ALLOWED_STYLE_PROPS = ['color', 'font-size']

// The only class the toolbar ever emits (table styling lives in index.css,
// not inline, so we don't need to allow arbitrary style props for it).
const ALLOWED_CLASSES = ['rich-table']

DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName === 'style') {
    data.attrValue = data.attrValue
      .split(';')
      .map(rule => rule.trim())
      .filter(rule => ALLOWED_STYLE_PROPS.some(prop => rule.startsWith(`${prop}:`)))
      .join('; ')
  }
  if (data.attrName === 'class') {
    data.attrValue = data.attrValue
      .split(/\s+/)
      .filter(cls => ALLOWED_CLASSES.includes(cls))
      .join(' ')
  }
})

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'strong', 'i', 'em', 'u', 'span', 'br', 'div',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['style', 'class'],
  })
}
