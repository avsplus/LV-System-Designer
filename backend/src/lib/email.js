import { config, requireConfig } from '../config.js';

const buildFromHeader = () => `${config.emailFromName} <${config.emailFromAddress}>`;

export const sendEmail = async ({ to, subject, html, text }) => {
  requireConfig('RESEND_API_KEY', config.resendApiKey);
  requireConfig('EMAIL_FROM_ADDRESS', config.emailFromAddress);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: buildFromHeader(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text
    })
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Resend API error (${response.status}): ${errorBody || 'unknown error'}`);
  }

  return response.json().catch(() => ({}));
};
