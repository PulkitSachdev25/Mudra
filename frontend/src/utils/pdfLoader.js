import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker using unpkg or local ESM worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.2.67'}/pdf.worker.min.mjs`;
}

export async function loadPdfDocument(fileOrUrl) {
  let loadingTask;
  if (typeof fileOrUrl === 'string') {
    loadingTask = pdfjsLib.getDocument(fileOrUrl);
  } else {
    const arrayBuffer = await fileOrUrl.arrayBuffer();
    loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  }
  return await loadingTask.promise;
}

export async function renderPdfPageToCanvas(pdfDoc, pageNum, canvas) {
  if (!pdfDoc || !canvas) return;
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.5 });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
  };
  await page.render(renderContext).promise;
}

export function renderSampleSlideToCanvas(slide, canvas) {
  if (!slide || !canvas) return;
  const width = 1920;
  const height = 1080;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background - Sleek textured obsidian
  ctx.fillStyle = '#07080c';
  ctx.fillRect(0, 0, width, height);

  // Subtle grid texture
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 1;
  const gridSize = 48;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Inner card container
  const padding = 120;
  const cardX = padding;
  const cardY = padding;
  const cardW = width - padding * 2;
  const cardH = height - padding * 2;

  ctx.fillStyle = 'rgba(16, 18, 27, 0.7)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.fill();
  ctx.stroke();

  // Accent vertical stripe
  ctx.fillStyle = slide.accent || '#38bdf8';
  roundRect(ctx, cardX + 48, cardY + 54, 8, 80, 4);
  ctx.fill();

  // Slide Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(slide.title, cardX + 80, cardY + 115);

  // Subtitle
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(slide.subtitle, cardX + 80, cardY + 175);

  // Tagline Box
  if (slide.tagline) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    roundRect(ctx, cardX + 80, cardY + 230, cardW - 160, 64, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(slide.tagline, cardX + 110, cardY + 270);
  }

  // Bullets
  let bulletY = cardY + 360;
  ctx.font = '400 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  (slide.bullets || []).forEach((bullet) => {
    // Dot
    ctx.fillStyle = slide.accent || '#38bdf8';
    ctx.beginPath();
    ctx.arc(cardX + 96, bulletY - 10, 8, 0, Math.PI * 2);
    ctx.fill();

    // Text
    ctx.fillStyle = '#f1f5f9';
    ctx.fillText(bullet, cardX + 130, bulletY);
    bulletY += 80;
  });

  // Embedded Link Badge (AirBlast Target)
  if (slide.link) {
    const linkBadgeY = cardY + cardH - 120;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 2;
    roundRect(ctx, cardX + 80, linkBadgeY, cardW - 160, 64, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`AIRBLAST READY URL: ${slide.link}`, cardX + 110, linkBadgeY + 41);
  }
}

export function extractCanvasSnapshot(canvas) {
  if (!canvas) return null;
  return canvas.toDataURL('image/jpeg', 0.92);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
