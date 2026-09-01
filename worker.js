function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleContact(request, env) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { name, company, email, type, message } = body || {};

  if (!name || !email || !type || !message) {
    return json({ error: 'Missing required fields' }, 400);
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

  const html = `
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
      `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || 'Alnair <onboarding@resend.dev>',
        to: env.RESEND_TO_EMAIL || 'u2kvviiuueeu2k@gmail.com',
        reply_to: email,
        subject: `【お問い合わせ】${escapeHtml(type)} — ${escapeHtml(name)}様より`,
        html,
      }),
    });

    if (!res.ok) {
      console.error('Resend error:', res.status, await res.text());
      return json({ error: 'Failed to send email' }, 500);
    }

    if (env.LINE_NOTIFY_TOKEN) {
      const params = new URLSearchParams();
      params.append('message', lineMessage);
      const lineRes = await fetch('https://notify-api.line.me/api/notify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.LINE_NOTIFY_TOKEN}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      if (!lineRes.ok) {
        console.error('LINE Notify error:', lineRes.status);
      }
    }

    return json({ success: true });
  } catch (err) {
    console.error('Resend exception:', err);
    return json({ error: 'Failed to send email' }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact') {
      return handleContact(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
