/**
 * Mesh Warp Worker
 *
 * Handles heavy image processing (warping, shading, transformations)
 * outside the main thread to prevent UI freezing.
 */

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === "WARP_IMAGE") {
    const {
      bitmap,
      width,
      height,
      surface,
      config,
      rotation = 0,
      flipH = false,
      flipV = false,
    } = payload;

    try {
      // Use OffscreenCanvas for worker-side rendering
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get OffscreenCanvas context");

      // 1. Initial transformations (Rotate/Flip)
      const tempCanvas = new OffscreenCanvas(width, height);
      const tempCtx = tempCanvas.getContext("2d")!;
      tempCtx.save();
      tempCtx.translate(width / 2, height / 2);
      tempCtx.rotate((rotation * Math.PI) / 180);
      tempCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      tempCtx.drawImage(bitmap, -width / 2, -height / 2, width, height);
      tempCtx.restore();

      // 2. Mesh Warp Logic (Ported from mesh-warp.ts)
      const strips = config.strips || 1;
      const stripW = width / strips;
      const srcW = tempCanvas.width;
      const srcH = tempCanvas.height;
      const srcStripW = srcW / strips;

      for (let i = 0; i < strips; i++) {
        const t = (i / (strips - 1)) * 2 - 1;
        const curve = Math.sin((t * Math.PI) / 2);
        const curveFull = Math.cos((t * Math.PI) / 2);

        let yOffset = 0;
        let yScale = 1;

        if (surface === "cylindrical") {
          yScale = 1 - config.intensity * (1 - curveFull) * 0.3;
          yOffset = config.intensity * curve * height * 0.05;
        } else if (surface === "spherical") {
          const dist = Math.abs(t);
          yScale = 1 - config.verticalBulge * dist * dist;
          yOffset = config.intensity * curve * height * 0.08;
          const vCurve = Math.sqrt(1 - dist * dist * config.intensity);
          yScale *= vCurve;
          yOffset += (1 - vCurve) * height * 0.5;
        } else if (surface === "curved") {
          yOffset = config.intensity * curve * height * 0.03;
          yScale = 1 - config.intensity * Math.abs(t) * 0.05;
        } else if (surface === "angled") {
          const skew = t * config.intensity * 0.5;
          yScale = 1 - skew * 0.15;
          yOffset = skew * height * 0.08;
        }

        const xSqueeze = config.squeeze + (1 - config.squeeze) * curveFull;
        const destStripW = stripW * xSqueeze;
        const centerX = width / 2;
        const normalDestX = i * stripW;
        const destX =
          centerX +
          (normalDestX - centerX) * config.squeeze +
          (1 - config.squeeze) * curve * width * 0.02;

        const destY = yOffset;
        const destH = height * yScale;

        ctx.save();
        ctx.beginPath();
        ctx.rect(destX, 0, destStripW + 1, height);
        ctx.clip();
        ctx.drawImage(
          tempCanvas,
          i * srcStripW,
          0,
          srcStripW + 1,
          srcH,
          destX,
          destY,
          destStripW + 1,
          destH,
        );
        ctx.restore();
      }

      // 3. Shading (Ported)
      if (config.edgeShading && config.shadingOpacity > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        if (surface === "cylindrical" || surface === "curved") {
          const grad = ctx.createLinearGradient(0, 0, width, 0);
          const opacity = config.shadingOpacity;
          grad.addColorStop(0, `rgba(0,0,0,${opacity})`);
          grad.addColorStop(0.15, `rgba(128,128,128,${opacity * 0.1})`);
          grad.addColorStop(0.4, "rgba(255,255,255,0)");
          grad.addColorStop(0.6, "rgba(255,255,255,0)");
          grad.addColorStop(0.85, `rgba(128,128,128,${opacity * 0.1})`);
          grad.addColorStop(1, `rgba(0,0,0,${opacity})`);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
        } else if (surface === "spherical") {
          const cx = width / 2;
          const cy = height / 2;
          const rad = Math.max(width, height) * 0.5;
          const grad = ctx.createRadialGradient(cx * 0.9, cy * 0.85, rad * 0.1, cx, cy, rad);
          grad.addColorStop(0, "rgba(255,255,255,0)");
          grad.addColorStop(0.6, "rgba(0,0,0,0)");
          grad.addColorStop(1, `rgba(0,0,0,${config.shadingOpacity})`);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
        }
        ctx.restore();
      }

      // Convert result to ImageBitmap for fastest transfer
      const resultBitmap = canvas.transferToImageBitmap();
      self.postMessage({ type: "WARP_RESULT", payload: { bitmap: resultBitmap } }, [
        resultBitmap,
      ] as any);
    } catch (err) {
      self.postMessage({ type: "ERROR", payload: { message: (err as Error).message } });
    }
  }
};
