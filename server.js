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

app.post('/generate', function (req, res) {
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
        throw new Error('Fal.ai rechazo (' + submitRes.status + '): ' + t);
      });
    }
    return submitRes.json();
  })
  .then(function (data) {
    var status_url = data.status_url;
    var response_url = data.response_url;

    function checkStatus(attempts) {
      if (attempts <= 0) {
        return res.status(504).json({ error: 'Tiempo de espera agotado' });
      }
      setTimeout(function () {
        fetch(status_url, { headers: { 'Authorization': 'Key ' + FAL_KEY } })
          .then(function (r) { return r.json(); })
          .then(function (statusData) {
            if (statusData.status === 'COMPLETED') {
              fetch(response_url, { headers: { 'Authorization': 'Key ' + FAL_KEY } })
                .then(function (r) { return r.json(); })
                .then(function (result) {
                  if (result && result.image && result.image.url) {
                    res.json({ result_url: result.image.url });
                  } else {
                    res.status(504).json({ error: 'Sin resultado' });
                  }
                });
            } else if (statusData.status === 'FAILED') {
              res.status(500).json({ error: 'La generacion fallo' });
            } else {
              checkStatus(attempts - 1);
            }
          });
      }, 3000);
    }
    checkStatus(50);
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
