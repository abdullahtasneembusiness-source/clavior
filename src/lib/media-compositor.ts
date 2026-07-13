// Draws two live <video> sources onto a canvas every frame — screen as the
// full-bleed background, camera as a circular picture-in-picture bottom
// right — so canvas.captureStream() can feed a single MediaRecorder for
// "Camera and Screen" recording mode.
export function compositeScreenAndCamera(
  screenVideoEl: HTMLVideoElement,
  cameraVideoEl: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): { stop: () => void } {
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d")!;
  let frameId: number;

  function drawCover(video: HTMLVideoElement, dx: number, dy: number, dw: number, dh: number) {
    const vw = video.videoWidth || dw;
    const vh = video.videoHeight || dh;
    const scale = Math.max(dw / vw, dh / vh);
    const sw = dw / scale;
    const sh = dh / scale;
    const sx = (vw - sw) / 2;
    const sy = (vh - sh) / 2;
    ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  function draw() {
    ctx.fillStyle = "#0A0F1E";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (screenVideoEl.readyState >= 2) {
      drawCover(screenVideoEl, 0, 0, canvas.width, canvas.height);
    }

    if (cameraVideoEl.readyState >= 2) {
      const diameter = 168;
      const margin = 28;
      const cx = canvas.width - margin - diameter / 2;
      const cy = canvas.height - margin - diameter / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, diameter / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      drawCover(cameraVideoEl, cx - diameter / 2, cy - diameter / 2, diameter, diameter);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, diameter / 2, 0, Math.PI * 2);
      ctx.strokeStyle = "#3B6FE8";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    frameId = requestAnimationFrame(draw);
  }

  draw();

  return {
    stop: () => cancelAnimationFrame(frameId),
  };
}
