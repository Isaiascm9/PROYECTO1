export default {
  async fetch(request, env) {
    // Responde a la verificación previa del navegador (CORS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response('Método no permitido', { status: 405 });
    }

    // env.GEMINI_API_KEY se configura como "Secret" en Cloudflare (nunca queda visible en el código)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;

    const cuerpo = await request.text();

    const respuestaGemini = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: cuerpo
    });

    const datos = await respuestaGemini.text();

    return new Response(datos, {
      status: respuestaGemini.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
