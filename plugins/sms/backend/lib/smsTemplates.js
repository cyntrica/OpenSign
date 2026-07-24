// Default SMS message templates.
// All templates are designed to fit within a single GSM-7 segment (160 chars)
// when typical variable values are substituted.
//
// Available variables:
//   {{sender_name}}     - Document creator/sender name
//   {{signer_name}}     - Person who just signed
//   {{receiver_name}}   - SMS recipient name
//   {{document_title}}  - Document name
//   {{signing_url}}     - URL for the signer to open and sign
//   {{document_url}}    - URL to view completed document
//   {{remaining}}       - Number of remaining signers
//   {{company_name}}    - Sender's company name
//   {{expiry_date}}     - Document expiry date

export const DEFAULT_TEMPLATES = {
  sign_request:
    '{{sender_name}} sent you "{{document_title}}" to sign: {{signing_url}}',
  sign_notify:
    '{{signer_name}} signed "{{document_title}}". {{remaining}} signer(s) remaining.',
  completed:
    'All parties signed "{{document_title}}". View: {{document_url}}',
  reminder:
    'Reminder: "{{document_title}}" awaits your signature: {{signing_url}}',
};

/**
 * Interpolate a template string with variable values.
 * Replaces {{key}} placeholders with corresponding values from `vars`.
 * Missing keys are replaced with empty string.
 */
export function interpolate(template, vars) {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

/**
 * Get the template for an event, using tenant custom template if available.
 */
export function getTemplate(event, tenantTemplates) {
  if (tenantTemplates && typeof tenantTemplates[event] === 'string' && tenantTemplates[event].trim()) {
    return tenantTemplates[event];
  }
  return DEFAULT_TEMPLATES[event] || '';
}
