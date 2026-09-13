require('dotenv').config();
const express = require('express');

const app = express();
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json({ limit: '15mb' }));

var FAL_KEY = process.env.FAL_KEY;
var FAL_MODEL_URL = 'https://queue.fal.run/fal-ai/idm-vton';

app.post('/submit', function (req, res) {
  var face_image = req.body.face_image;
  var garment_image_url = req.body.garment_image_url;

  if (!face_image || !garment_image_url) {
    return res.status(400).json({ error: 'Faltan imagenes' });
  }

  fetch(FAL_MODEL_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Key ' + FAL_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      human_image_url: face_image,
      garment_image_url: garment_image_url,
      garment_description: 'clothing item'
    })
  })
  .then(function (submitRes) {
    if (!submitRes.ok) {
      return submitRes.text().then(function (t) {
        res.status(502).json({ error: 'Fal.ai rechazo: ' + t });
      });
    } else {
      return submitRes.json().then(function (data) {
        res.json({ status_url: data.status_url, response_url: data.response_url });
      });
    }
  })
  .catch(function (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  });
});

app.get('/check', function (req, res) {
  var statusUrl = req.query.status_url;
  var responseUrl = req.query.response_url;
  if (!statusUrl) {
    return res.status(400).json({ error: 'Falta status_url' });
  }

  fetch(statusUrl, { headers: { 'Authorization': 'Key ' + FAL_KEY } })
    .then(function (r) { return r.json(); })
    .then(function (statusData) {
      if (statusData.status === 'COMPLETED') {
        fetch(responseUrl, { headers: { 'Authorization': 'Key ' + FAL_KEY } })
          .then(function (r) { return r.json(); })
          .then(function (result) {
            if (result && result.image && result.image.url) {
              res.json({ status: 'COMPLETED', result_url: result.image.url });
            } else {
              res.json({ status: 'COMPLETED', error: 'Sin resultado' });
            }
          });
      } else if (statusData.status === 'FAILED') {
        res.json({ status: 'FAILED' });
      } else {
        res.json({ status: statusData.status || 'IN_PROGRESS' });
      }
    })
    .catch(function (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    });
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
  console.log('Servidor de probador virtual en el puerto ' + PORT);
});
