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

  const { name, email, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      // 送信元ドメインを取得後は noreply@yourdomain.com に変更してください
      from: 'Alnair <onboarding@resend.dev>',
      to: 'alnair.llc.info@gmail.com',
      replyTo: email,
      subject: `【お問い合わせ】${escapeHtml(name)}様より`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; padding: 24px;">
          <h2 style="font-weight: 400; border-bottom: 1px solid #ddd; padding-bottom: 12px; margin-bottom: 24px;">
            Alnair HP お問い合わせ
          </h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #eee;">
              <th style="text-align: left; padding: 12px 0; width: 120px; color: #888; font-weight: normal; vertical-align: top;">お名前</th>
              <td style="padding: 12px 0;">${escapeHtml(name)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <th style="text-align: left; padding: 12px 0; width: 120px; color: #888; font-weight: normal; vertical-align: top;">メール</th>
              <td style="padding: 12px 0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td>
            </tr>
            <tr>
              <th style="text-align: left; padding: 12px 0; width: 120px; color: #888; font-weight: normal; vertical-align: top;">内容</th>
              <td style="padding: 12px 0; white-space: pre-wrap;">${escapeHtml(message)}</td>
            </tr>
          </table>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error.statusCode, error.name, error.message);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Resend exception:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
};
