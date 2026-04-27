const { Resend } = require('resend');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, company, email, type, message } = req.body || {};

  if (!name || !email || !type || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const companyRow = company
    ? `<tr style="border-bottom:1px solid #eee;">
        <th style="text-align:left;padding:12px 0;width:120px;color:#888;font-weight:normal;vertical-align:top;">会社名</th>
        <td style="padding:12px 0;">${escapeHtml(company)}</td>
      </tr>`
    : '';

  const lineMessage = [
    '\n【Alnair HP お問い合わせ】',
    `お名前: ${name}`,
    company ? `会社名: ${company}` : null,
    `メール: ${email}`,
    `種別: ${type}`,
    '',
    message.slice(0, 300) + (message.length > 300 ? '…' : ''),
  ].filter(Boolean).join('\n');

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Alnair <onboarding@resend.dev>',
      to: process.env.RESEND_TO_EMAIL || 'u2kvviiuueeu2k@gmail.com',
      replyTo: email,
      subject: `【お問い合わせ】${escapeHtml(type)} — ${escapeHtml(name)}様より`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;padding:24px;">
          <h2 style="font-weight:400;border-bottom:1px solid #ddd;padding-bottom:12px;margin-bottom:24px;">
            Alnair HP お問い合わせ
          </h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr style="border-bottom:1px solid #eee;">
              <th style="text-align:left;padding:12px 0;width:120px;color:#888;font-weight:normal;vertical-align:top;">お名前</th>
              <td style="padding:12px 0;">${escapeHtml(name)}</td>
            </tr>
            ${companyRow}
            <tr style="border-bottom:1px solid #eee;">
              <th style="text-align:left;padding:12px 0;width:120px;color:#888;font-weight:normal;vertical-align:top;">メール</th>
              <td style="padding:12px 0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td>
            </tr>
            <tr style="border-bottom:1px solid #eee;">
              <th style="text-align:left;padding:12px 0;width:120px;color:#888;font-weight:normal;vertical-align:top;">種別</th>
              <td style="padding:12px 0;">${escapeHtml(type)}</td>
            </tr>
            <tr>
              <th style="text-align:left;padding:12px 0;width:120px;color:#888;font-weight:normal;vertical-align:top;">内容</th>
              <td style="padding:12px 0;white-space:pre-wrap;">${escapeHtml(message)}</td>
            </tr>
          </table>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error.statusCode, error.name, error.message);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    if (process.env.LINE_NOTIFY_TOKEN) {
      const params = new URLSearchParams();
      params.append('message', lineMessage);
      const lineRes = await fetch('https://notify-api.line.me/api/notify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.LINE_NOTIFY_TOKEN}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      if (!lineRes.ok) {
        console.error('LINE Notify error:', lineRes.status);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Resend exception:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
};
