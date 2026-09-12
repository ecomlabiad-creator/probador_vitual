(function () {
  const faceInput = document.getElementById('tryon-face-input');
  const uploadBox = document.getElementById('tryon-upload-label');
  const facePreview = document.getElementById('tryon-face-preview');
  const generateBtn = document.getElementById('tryon-generate-btn');
  const statusEl = document.getElementById('tryon-status');
  const resultWrap = document.getElementById('tryon-result-wrap');
  const resultImg = document.getElementById('tryon-result-img');
  const downloadBtn = document.getElementById('tryon-download-btn');
  const garmentUrl = document.getElementById('tryon-garment-url').value;

  let faceBase64 = null;

  const ENDPOINT = 'https://probador-virtual-wx2h.onrender.com/generate';

  faceInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      faceBase64 = reader.result; // data:image/...;base64,....
      facePreview.src = faceBase64;
      facePreview.style.display = 'block';
      uploadBox.style.display = 'none';
      generateBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  });

  generateBtn.addEventListener('click', async () => {
    if (!faceBase64) return;

    generateBtn.disabled = true;
    statusEl.textContent = 'Generando tu look... esto puede tardar 15-30s ⏳';
    resultWrap.style.display = 'none';

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          face_image: faceBase64,
          garment_image_url: garmentUrl,
          shop: window.Shopify ? window.Shopify.shop : null
        })
      });

      if (!res.ok) throw new Error('Error del servidor: ' + res.status);

      const data = await res.json();
      if (!data.result_url) throw new Error('Sin resultado');

      resultImg.src = data.result_url;
      downloadBtn.onclick = () => window.open(data.result_url, '_blank');
      resultWrap.style.display = 'block';
      statusEl.textContent = '';
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Ups, algo falló. Intenta con otra foto o vuelve a intentarlo.';
    } finally {
      generateBtn.disabled = false;
    }
  });
})();
