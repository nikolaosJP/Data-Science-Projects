// ============================================================================
// UTILITIES
// ============================================================================

// KaTeX rendering utilities
const katexQueue = [];

function kRender(el, tex, display = false) {
  if (!el) return;
  if (window.katex) {
    window.katex.render(tex, el, {displayMode: display, throwOnError: false});
  } else {
    katexQueue.push([el, tex, display]);
  }
}

function kFlush() {
  if (!window.katex) return;
  while (katexQueue.length) {
    const [el, tex, display] = katexQueue.shift();
    window.katex.render(tex, el, {displayMode: display, throwOnError: false});
  }
}

// Math utilities
function calculateMSE(points, m, b) {
  if (!points.length) return 0;
  return points.reduce((sum, p) => sum + Math.pow(p.y - (m * p.x + b), 2), 0) / points.length;
}

function calculateR2(points, m, b) {
  const n = points.length;
  if (!n) return 0;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  let ssRes = 0, ssTot = 0;
  for (const p of points) {
    const pred = m * p.x + b;
    ssRes += Math.pow(p.y - pred, 2);
    ssTot += Math.pow(p.y - meanY, 2);
  }
  return ssTot > 0 ? 1 - ssRes / ssTot : 0;
}

function parseNumberList(text) {
  if (!text) return [];
  return text
    .split(/[\s,;]+/)
    .map(v => parseFloat(v))
    .filter(v => Number.isFinite(v));
}

function formatNumber(value, digits = 4) {
  if (!Number.isFinite(value)) return '—';
  return parseFloat(value.toFixed(digits)).toString();
}

// Domain utilities
const domain = {xmin: 0, xmax: 10, ymin: 0, ymax: 10};
const margin = 50;

function dataToPx(x, y, canvas) {
  const w = canvas.width - 2 * margin, h = canvas.height - 2 * margin;
  const px = margin + (x - domain.xmin) / (domain.xmax - domain.xmin) * w;
  const py = margin + h - (y - domain.ymin) / (domain.ymax - domain.ymin) * h;
  return [px, py];
}

function pxToData(px, py, canvas) {
  const w = canvas.width - 2 * margin, h = canvas.height - 2 * margin;
  const nx = Math.max(0, Math.min(1, (px - margin) / w));
  const ny = Math.max(0, Math.min(1, 1 - (py - margin) / h));
  const x = domain.xmin + nx * (domain.xmax - domain.xmin);
  const y = domain.ymin + ny * (domain.ymax - domain.ymin);
  return [x, y];
}

// Export for global access
window.AppUtils = {
  kRender, kFlush, calculateMSE, calculateR2,
  dataToPx, pxToData, domain, margin,
  parseNumberList, formatNumber
};

// ============================================================================
// CANVAS HANDLER
// ============================================================================

class CanvasHandler {
  constructor() {
    this.canvases = {
      ols: document.getElementById('plot-ols'),
      gd: document.getElementById('plot-gd'),
      manual: document.getElementById('plot-manual')
    };
    this.contexts = {};
    Object.keys(this.canvases).forEach(key => {
      this.contexts[key] = this.canvases[key].getContext('2d');
    });
    this.lossCanvas = document.getElementById('loss-plot');
    this.lossCtx = this.lossCanvas.getContext('2d');
    this.statsCanvases = {
      corr: document.getElementById('corr-plot'),
      ttest: document.getElementById('ttest-plot'),
      anova: document.getElementById('anova-plot')
    };
    this.statsContexts = {};
    Object.keys(this.statsCanvases).forEach(key => {
      const canvas = this.statsCanvases[key];
      if (canvas) {
        this.statsContexts[key] = canvas.getContext('2d');
      }
    });
    this.dragging = -1;
    this.setupEvents();
  }

  draw(activeTab, points, models, showResiduals) {
    const canvas = this.canvases[activeTab];
    const ctx = this.contexts[activeTab];
    this.drawCanvas(ctx, canvas, points, models[activeTab], showResiduals);
    document.getElementById('point-count').textContent = points.length;
  }

  drawCanvas(ctx, canvas, points, model, showResiduals) {
    // Clear
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    this.drawGrid(ctx, canvas);
    // Axes  
    this.drawAxes(ctx, canvas);
    // Fit + residuals
    if (model.fitted) {
      this.drawFit(ctx, canvas, model, points, showResiduals);
    }
    // Points
    this.drawPoints(ctx, canvas, points);
  }

  drawStats(tab, state = {}) {
    const canvas = this.statsCanvases[tab];
    const ctx = this.statsContexts[tab];
    if (!canvas || !ctx) return;
    switch (tab) {
      case 'corr':
        this.drawScatterPlot(ctx, canvas, state.points || [], state.meanX, state.meanY);
        break;
      case 'ttest':
        this.drawGroupedDotPlot(ctx, canvas, state.groups || []);
        break;
      case 'anova':
        this.drawGroupedDotPlot(ctx, canvas, state.groups || [], state.grandMean);
        break;
    }
  }

  drawScatterPlot(ctx, canvas, points, meanX, meanY) {
    this.clearStatsCanvas(ctx, canvas);
    if (!points.length) {
      this.drawStatsPlaceholder(ctx, canvas, 'Add paired samples to view the scatter plot');
      return;
    }

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    let minX = Math.min(...xs), maxX = Math.max(...xs);
    let minY = Math.min(...ys), maxY = Math.max(...ys);
    const padX = (maxX - minX) * 0.1 || 1;
    const padY = (maxY - minY) * 0.1 || 1;
    minX -= padX; maxX += padX;
    minY -= padY; maxY += padY;

    const marginX = 60;
    const marginY = 50;
    const innerW = canvas.width - marginX * 2;
    const innerH = canvas.height - marginY * 2;

    const toPx = (x, y) => {
      const px = marginX + ((x - minX) / (maxX - minX)) * innerW;
      const py = marginY + innerH - ((y - minY) / (maxY - minY)) * innerH;
      return [px, py];
    };

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const tx = minX + (i / ticks) * (maxX - minX);
      const ty = minY + (i / ticks) * (maxY - minY);
      const [px] = toPx(tx, minY);
      const [, py] = toPx(minX, ty);
      ctx.beginPath();
      ctx.moveTo(px, marginY);
      ctx.lineTo(px, canvas.height - marginY);
      ctx.moveTo(marginX, py);
      ctx.lineTo(canvas.width - marginX, py);
      ctx.stroke();
    }

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(marginX, marginY, innerW, innerH);

    ctx.fillStyle = '#334155';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    for (let i = 0; i <= ticks; i++) {
      const tx = minX + (i / ticks) * (maxX - minX);
      const [px] = toPx(tx, minY);
      ctx.fillText(AppUtils.formatNumber(tx, 2), px, canvas.height - marginY + 18);
    }
    ctx.textAlign = 'right';
    for (let i = 0; i <= ticks; i++) {
      const ty = minY + (i / ticks) * (maxY - minY);
      const [, py] = toPx(minX, ty);
      ctx.fillText(AppUtils.formatNumber(ty, 2), marginX - 8, py + 4);
    }

    ctx.fillStyle = '#2563eb';
    points.forEach(pt => {
      const [px, py] = toPx(pt.x, pt.y);
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    if (Number.isFinite(meanX)) {
      const [mx1] = toPx(meanX, minY);
      ctx.strokeStyle = '#fb7185';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(mx1, marginY);
      ctx.lineTo(mx1, canvas.height - marginY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (Number.isFinite(meanY)) {
      const [, my] = toPx(minX, meanY);
      ctx.strokeStyle = '#f97316';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(marginX, my);
      ctx.lineTo(canvas.width - marginX, my);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  drawGroupedDotPlot(ctx, canvas, groups, grandMean) {
    this.clearStatsCanvas(ctx, canvas);
    const nonEmpty = (groups || []).filter(g => g.values && g.values.length);
    if (!nonEmpty.length) {
      this.drawStatsPlaceholder(ctx, canvas, 'Add group samples to compare distributions');
      return;
    }

    const values = nonEmpty.flatMap(g => g.values);
    let minY = Math.min(...values);
    let maxY = Math.max(...values);
    const pad = (maxY - minY) * 0.1 || 1;
    minY -= pad;
    maxY += pad;

    const left = 80;
    const right = 40;
    const top = 40;
    const bottom = 70;
    const innerW = canvas.width - left - right;
    const innerH = canvas.height - top - bottom;
    const toPy = value => top + innerH - ((value - minY) / (maxY - minY)) * innerH;

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const ty = minY + (i / ticks) * (maxY - minY);
      const py = toPy(ty);
      ctx.beginPath();
      ctx.moveTo(left, py);
      ctx.lineTo(canvas.width - right, py);
      ctx.stroke();
    }

    if (Number.isFinite(grandMean)) {
      const py = toPy(grandMean);
      ctx.strokeStyle = '#0ea5e9';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(left, py);
      ctx.lineTo(canvas.width - right, py);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(left, top, innerW, innerH);

    ctx.fillStyle = '#334155';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';
    for (let i = 0; i <= ticks; i++) {
      const ty = minY + (i / ticks) * (maxY - minY);
      const py = toPy(ty);
      ctx.fillText(AppUtils.formatNumber(ty, 2), left - 8, py + 4);
    }

    const step = innerW / (nonEmpty.length + 1);
    nonEmpty.forEach((group, idx) => {
      const cx = left + step * (idx + 1);
      group.values.forEach((value, i) => {
        const py = toPy(value);
        const offset = ((i % 5) - 2) * 6;
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(cx + offset, py, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      if (Number.isFinite(group.mean)) {
        const py = toPy(group.mean);
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 30, py);
        ctx.lineTo(cx + 30, py);
        ctx.stroke();
      }

      ctx.fillStyle = '#334155';
      ctx.textAlign = 'center';
      ctx.fillText(group.label || `Group ${idx + 1}`, cx, canvas.height - bottom + 28);
    });
  }

  clearStatsCanvas(ctx, canvas) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawStatsPlaceholder(ctx, canvas, message) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  }

  drawGrid(ctx, canvas) {
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = AppUtils.margin + i * (canvas.width - 2 * AppUtils.margin) / 10;
      const y = AppUtils.margin + i * (canvas.height - 2 * AppUtils.margin) / 10;
      ctx.beginPath();
      ctx.moveTo(x, AppUtils.margin); 
      ctx.lineTo(x, canvas.height - AppUtils.margin);
      ctx.moveTo(AppUtils.margin, y); 
      ctx.lineTo(canvas.width - AppUtils.margin, y);
      ctx.stroke();
    }
  }

  drawAxes(ctx, canvas) {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(AppUtils.margin, AppUtils.margin, 
                   canvas.width - 2 * AppUtils.margin, 
                   canvas.height - 2 * AppUtils.margin);

    // Labels
    ctx.fillStyle = '#374151';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 10; i++) {
      const xVal = AppUtils.domain.xmin + i;
      const [px] = AppUtils.dataToPx(xVal, AppUtils.domain.ymin, canvas);
      ctx.fillText(xVal.toFixed(0), px, canvas.height - AppUtils.margin + 20);
    }
    ctx.textAlign = 'right';
    for (let i = 0; i <= 10; i++) {
      const yVal = AppUtils.domain.ymin + i;
      const [, py] = AppUtils.dataToPx(AppUtils.domain.xmin, yVal, canvas);
      ctx.fillText(yVal.toFixed(0), AppUtils.margin - 10, py + 4);
    }
  }

  drawFit(ctx, canvas, model, points, showResiduals) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(AppUtils.margin, AppUtils.margin, 
             canvas.width - 2 * AppUtils.margin, 
             canvas.height - 2 * AppUtils.margin);
    ctx.clip();

    const y1 = model.m * AppUtils.domain.xmin + model.b;
    const y2 = model.m * AppUtils.domain.xmax + model.b;
    const [x1, py1] = AppUtils.dataToPx(AppUtils.domain.xmin, y1, canvas);
    const [x2, py2] = AppUtils.dataToPx(AppUtils.domain.xmax, y2, canvas);
    
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, py1);
    ctx.lineTo(x2, py2);
    ctx.stroke();

    if (showResiduals) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      for (const p of points) {
        const pred = model.m * p.x + model.b;
        const [px, py] = AppUtils.dataToPx(p.x, p.y, canvas);
        const [, pyPred] = AppUtils.dataToPx(p.x, pred, canvas);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, pyPred);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawPoints(ctx, canvas, points) {
    ctx.fillStyle = '#1f2937';
    for (const p of points) {
      const [px, py] = AppUtils.dataToPx(p.x, p.y, canvas);
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  drawLossPlot(lossHistory) {
    const w = this.lossCanvas.width, h = this.lossCanvas.height;
    this.lossCtx.fillStyle = '#fff';
    this.lossCtx.fillRect(0, 0, w, h);
    if (lossHistory.length < 2) return;

    const marginL = 30, marginT = 20, marginR = 10, marginB = 30;
    const minLoss = Math.min(...lossHistory);
    const maxLoss = Math.max(...lossHistory);
    const range = maxLoss - minLoss || 1;

    this.lossCtx.strokeStyle = '#e2e8f0';
    this.lossCtx.lineWidth = 1;
    this.lossCtx.strokeRect(marginL, marginT, w - marginL - marginR, h - marginT - marginB);

    this.lossCtx.strokeStyle = '#dc2626';
    this.lossCtx.lineWidth = 2;
    this.lossCtx.beginPath();
    for (let i = 0; i < lossHistory.length; i++) {
      const x = marginL + i * (w - marginL - marginR) / (lossHistory.length - 1);
      const y = marginT + (1 - (lossHistory[i] - minLoss) / range) * (h - marginT - marginB);
      if (i === 0) this.lossCtx.moveTo(x, y);
      else this.lossCtx.lineTo(x, y);
    }
    this.lossCtx.stroke();
  }

  setupEvents() {
    Object.values(this.canvases).forEach(canvas => {
      canvas.addEventListener('contextmenu', e => e.preventDefault());
      canvas.addEventListener('mousedown', e => this.onMouseDown(e, canvas));
      canvas.addEventListener('mousemove', e => this.onMouseMove(e, canvas));
      canvas.addEventListener('mouseup', () => this.dragging = -1);
      canvas.addEventListener('mouseleave', () => this.dragging = -1);
    });
  }

  onMouseDown(e, canvas) {
    const [px, py] = this.getMousePos(e, canvas);
    const idx = this.findNearestPoint(px, py, canvas);

    if (e.button === 2 && idx >= 0) {
      window.App.removePoint(idx);
      return;
    }
    if (idx >= 0) {
      this.dragging = idx;
    } else {
      const [x, y] = AppUtils.pxToData(px, py, canvas);
      window.App.addPoint({x, y});
    }
  }

  onMouseMove(e, canvas) {
    if (this.dragging < 0) return;
    const [px, py] = this.getMousePos(e, canvas);
    const [x, y] = AppUtils.pxToData(px, py, canvas);
    window.App.updatePoint(this.dragging, {x, y});
  }

  getMousePos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY];
  }

  findNearestPoint(px, py, canvas) {
    let best = -1, bestDist = 400;
    const points = window.App.getPoints();
    for (let i = 0; i < points.length; i++) {
      const [x, y] = AppUtils.dataToPx(points[i].x, points[i].y, canvas);
      const d = (x - px) ** 2 + (y - py) ** 2;
      if (d < bestDist) { best = i; bestDist = d; }
    }
    return best;
  }
}

window.CanvasHandler = CanvasHandler;
