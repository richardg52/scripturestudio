// Netlify serverless function — generates Daily.co meeting tokens
// Called by the admin page, never exposes the API key to the browser

exports.handler = async function(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Simple admin password check
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'scripturestudio2026';
  const DAILY_API_KEY  = process.env.DAILY_API_KEY;

  if (!DAILY_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Daily.co API key not configured in Netlify environment variables.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const { password, emails } = body;

  if (password !== ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid admin password.' }) };
  }

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No emails provided.' }) };
  }

  const results = [];

  for (const email of emails) {
    try {
      const response = await fetch('https://api.daily.co/v1/meeting-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DAILY_API_KEY}`
        },
        body: JSON.stringify({
          properties: {
            room_name: 'book-society',
            is_owner: false,
            enable_screenshare: false,
            start_video_off: true,
            start_audio_off: false,
            exp: Math.floor(new Date('2026-05-23T21:00:00Z').getTime() / 1000) // expires after session ends
          }
        })
      });

      const data = await response.json();

      if (data.token) {
        results.push({
          email: email.trim(),
          link: `https://scripturestudio.daily.co/book-society?t=${data.token}`,
          status: 'success'
        });
      } else {
        results.push({ email: email.trim(), link: null, status: 'failed', error: data.error || 'Unknown error' });
      }
    } catch(err) {
      results.push({ email: email.trim(), link: null, status: 'failed', error: err.message });
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results })
  };
};
