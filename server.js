// Backend mínimo para el probador virtual (App Proxy de Shopify -> este servidor)
// Despliega esto en Vercel/Render/Railway/Cloud Run. Nunca en el frontend.
//
// npm install express node-fetch dotenv
//
// Variables de entorno necesarias:
//   FAL_KEY=tu_api_key_de_fal.ai

require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json({ limit: '15mb' })); // las fotos base64 pesan

const FAL_KEY = process.env.FAL_KEY;
const FAL_MODEL_URL = 'https://queue.fal.run/fal-ai/idm-vton';

app.post('/apps/virtual-tryon/generate', async (req, res) => {
  try {
    const { face_image, garment_image_url } = req.body;

    if (!face_image || !garment_image_url) {
      return res.status(400).json({ error: 'Faltan imágenes' });
    }

    // 1) Encolar el trabajo en fal.ai
    const submitRes = await fetch(FAL_MODEL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        human_image_url: face_image,       // acepta data URI base64 directamente
        garment_image_url: garment_image_url,
        garment_description: 'clothing item'
      })
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      throw new Error('Fal.ai rechazó la solicitud: ' + errText);
    }

    const { request_id, status_url, response_url } = await submitRes.json();

    // 2) Sondear hasta que el resultado esté listo
    let result = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 2000));

      const statusRes = await fetch(status_url, {
        headers: { 'Authorization': `Key ${FAL_KEY}` }
      });
      const statusData = await statusRes.json();

      if (statusData.status === 'COMPLETED') {
        const finalRes = await fetch(response_url, {
          headers: { 'Authorization': `Key ${FAL_KEY}` }
        });
        result = await finalRes.json();
        break;
      }
      if (statusData.status === 'FAILED') {
        throw new Error('La generación falló en fal.ai');
      }
    }

    if (!result || !result.image || !result.image.url) {
      return res.status(504).json({ error: 'Tiempo de espera agotado' });
    }

    res.json({ result_url: result.image.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor de probador virtual en :${PORT}`));
