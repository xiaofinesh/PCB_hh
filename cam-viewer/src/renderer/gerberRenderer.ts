import type { GerberLayer, Aperture, LayerConfig, ViewState } from '../types/gerber';

/**
 * Canvas-based Gerber renderer
 * Renders parsed Gerber layers onto an HTML5 Canvas
 */
export class GerberRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
  }

  /**
   * Clear the canvas
   */
  clear() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = '#0e1a0e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Resize canvas to match container
   */
  resize(width: number, height: number) {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  /**
   * Render all visible layers
   */
  render(layers: LayerConfig[], viewState: ViewState) {
    this.clear();

    const { offsetX, offsetY, scale } = viewState;

    for (const layerConfig of layers) {
      if (!layerConfig.visible) continue;

      this.ctx.save();
      this.ctx.globalAlpha = layerConfig.opacity;

      // Apply transforms: DPR scaling, then view transform, then flip Y axis
      this.ctx.setTransform(
        scale * this.dpr, 0,
        0, -scale * this.dpr,
        offsetX * this.dpr,
        (this.canvas.height / this.dpr - offsetY) * this.dpr
      );

      this.renderLayer(layerConfig.layer, layerConfig.color);
      this.ctx.restore();
    }
  }

  /**
   * Render a single Gerber layer
   */
  private renderLayer(layer: GerberLayer, color: string) {
    const ctx = this.ctx;
    const apertures = layer.apertures;
    let currentAperture: Aperture | undefined;
    let currentX = 0;
    let currentY = 0;
    let inRegion = false;

    // Convert inches to a working unit scale
    const unitScale = layer.unit === 'MM' ? 1 : 25.4; // convert to mm

    for (const cmd of layer.commands) {
      switch (cmd.type) {
        case 'polarity':
          // Handle polarity changes
          if (cmd.polarity === 'clear') {
            ctx.globalCompositeOperation = 'destination-out';
          } else {
            ctx.globalCompositeOperation = 'source-over';
          }
          break;

        case 'move':
          currentX = cmd.x * unitScale;
          currentY = cmd.y * unitScale;
          break;

        case 'line':
          currentAperture = apertures.get(cmd.aperture);
          if (currentAperture) {
            const lineWidth = this.getApertureSize(currentAperture) * unitScale;
            const targetX = cmd.x * unitScale;
            const targetY = cmd.y * unitScale;

            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(currentX, currentY);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();

            currentX = targetX;
            currentY = targetY;
          }
          break;

        case 'arc': {
          currentAperture = apertures.get(cmd.aperture);
          if (currentAperture) {
            const lineWidth = this.getApertureSize(currentAperture) * unitScale;
            const targetX = cmd.x * unitScale;
            const targetY = cmd.y * unitScale;
            const ci = cmd.i * unitScale;
            const cj = cmd.j * unitScale;

            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';

            this.drawArc(ctx, currentX, currentY, targetX, targetY, ci, cj, cmd.interpolation === 'cw');

            currentX = targetX;
            currentY = targetY;
          }
          break;
        }

        case 'flash':
          currentAperture = apertures.get(cmd.aperture);
          if (currentAperture) {
            const fx = cmd.x * unitScale;
            const fy = cmd.y * unitScale;
            this.drawAperture(ctx, currentAperture, fx, fy, color, unitScale);
            currentX = fx;
            currentY = fy;
          }
          break;

        case 'regionStart':
          inRegion = true;
          ctx.beginPath();
          break;

        case 'regionEnd':
          if (inRegion) {
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
            inRegion = false;
          }
          break;

        case 'regionMove':
          currentX = cmd.x * unitScale;
          currentY = cmd.y * unitScale;
          if (inRegion) {
            ctx.moveTo(currentX, currentY);
          }
          break;

        case 'regionLine': {
          const rlx = cmd.x * unitScale;
          const rly = cmd.y * unitScale;
          if (inRegion) {
            ctx.lineTo(rlx, rly);
          }
          currentX = rlx;
          currentY = rly;
          break;
        }

        case 'regionArc': {
          const rax = cmd.x * unitScale;
          const ray = cmd.y * unitScale;
          const rai = cmd.i * unitScale;
          const raj = cmd.j * unitScale;
          if (inRegion) {
            this.addArcToPath(ctx, currentX, currentY, rax, ray, rai, raj, cmd.interpolation === 'cw');
          }
          currentX = rax;
          currentY = ray;
          break;
        }
      }
    }

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * Get the primary size of an aperture (diameter or width)
   */
  private getApertureSize(aperture: Aperture): number {
    if (aperture.params.length > 0) {
      return aperture.params[0];
    }
    return 0.01; // fallback
  }

  /**
   * Draw an aperture flash at a given position
   */
  private drawAperture(
    ctx: CanvasRenderingContext2D,
    aperture: Aperture,
    x: number,
    y: number,
    color: string,
    unitScale: number
  ) {
    ctx.fillStyle = color;

    switch (aperture.shape) {
      case 'C': {
        // Circle
        const radius = (aperture.params[0] * unitScale) / 2;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(radius, 0.001), 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'R': {
        // Rectangle
        const w = (aperture.params[0] || 0) * unitScale;
        const h = (aperture.params[1] || aperture.params[0] || 0) * unitScale;
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
        break;
      }
      case 'O': {
        // Obround (oval)
        const ow = (aperture.params[0] || 0) * unitScale;
        const oh = (aperture.params[1] || aperture.params[0] || 0) * unitScale;
        const or = Math.min(ow, oh) / 2;
        ctx.beginPath();
        this.roundRect(ctx, x - ow / 2, y - oh / 2, ow, oh, or);
        ctx.fill();
        break;
      }
      case 'P': {
        // Regular polygon
        const pd = (aperture.params[0] || 0) * unitScale;
        const vertices = aperture.params[1] || 4;
        const rotation = (aperture.params[2] || 0) * (Math.PI / 180);
        const pr = pd / 2;
        ctx.beginPath();
        for (let i = 0; i <= vertices; i++) {
          const angle = rotation + (i * 2 * Math.PI) / vertices;
          const px = x + pr * Math.cos(angle);
          const py = y + pr * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
    }
  }

  /**
   * Draw an arc stroke
   */
  private drawArc(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number,
    x2: number, y2: number,
    i: number, j: number,
    clockwise: boolean
  ) {
    const cx = x1 + i;
    const cy = y1 + j;
    const radius = Math.sqrt(i * i + j * j);

    if (radius < 0.0001) {
      // Degenerate arc, draw as line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      return;
    }

    const startAngle = Math.atan2(y1 - cy, x1 - cx);
    const endAngle = Math.atan2(y2 - cy, x2 - cx);

    ctx.beginPath();
    // Note: Canvas arc uses screen coordinates, but we flipped Y in our transform
    // so CW in Gerber becomes CCW in canvas (and vice versa)
    ctx.arc(cx, cy, radius, startAngle, endAngle, clockwise);
    ctx.stroke();
  }

  /**
   * Add an arc path segment (for regions)
   */
  private addArcToPath(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number,
    x2: number, y2: number,
    i: number, j: number,
    clockwise: boolean
  ) {
    const cx = x1 + i;
    const cy = y1 + j;
    const radius = Math.sqrt(i * i + j * j);

    if (radius < 0.0001) {
      ctx.lineTo(x2, y2);
      return;
    }

    const startAngle = Math.atan2(y1 - cy, x1 - cx);
    const endAngle = Math.atan2(y2 - cy, x2 - cx);

    ctx.arc(cx, cy, radius, startAngle, endAngle, clockwise);
  }

  /**
   * Draw a rounded rectangle
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    w: number, h: number,
    r: number
  ) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Calculate the view state to fit all layers
   */
  static calculateFitView(
    layers: LayerConfig[],
    canvasWidth: number,
    canvasHeight: number
  ): ViewState {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const lc of layers) {
      const b = lc.layer.bounds;
      const unitScale = lc.layer.unit === 'MM' ? 1 : 25.4;
      const bMinX = b.minX * unitScale;
      const bMinY = b.minY * unitScale;
      const bMaxX = b.maxX * unitScale;
      const bMaxY = b.maxY * unitScale;
      if (bMinX < minX) minX = bMinX;
      if (bMinY < minY) minY = bMinY;
      if (bMaxX > maxX) maxX = bMaxX;
      if (bMaxY > maxY) maxY = bMaxY;
    }

    if (minX === Infinity) {
      return { offsetX: 0, offsetY: 0, scale: 1 };
    }

    const dataWidth = maxX - minX;
    const dataHeight = maxY - minY;
    const padding = 40;

    const scaleX = (canvasWidth - padding * 2) / dataWidth;
    const scaleY = (canvasHeight - padding * 2) / dataHeight;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = padding + (canvasWidth - padding * 2 - dataWidth * scale) / 2 - minX * scale;
    const offsetY = padding + (canvasHeight - padding * 2 - dataHeight * scale) / 2 - minY * scale;

    return { offsetX, offsetY, scale };
  }
}
