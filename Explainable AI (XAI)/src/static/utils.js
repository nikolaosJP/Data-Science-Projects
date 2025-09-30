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
  dataToPx, pxToData, domain, margin
};

// ============================================================================
// CANVAS HANDLER
// ============================================================================

class CanvasHandler {
  constructor() {
    this.canvases = {
      ols: document.getElementById('plot-ols'),
      gd: document.getElementById('plot-gd'),
      manual: document.getElementById('plot-manual'),
      logistic: document.getElementById('plot-logistic')
    };
    this.contexts = {};
    Object.keys(this.canvases).forEach(key => {
      if (this.canvases[key]) {
        this.contexts[key] = this.canvases[key].getContext('2d');
      }
    });
    this.lossCanvas = document.getElementById('loss-plot');
    if (this.lossCanvas) {
      this.lossCtx = this.lossCanvas.getContext('2d');
    }
    this.dragging = -1;
    this.setupEvents();
  }

  draw(activeTab, points, models, showResiduals) {
    const canvas = this.canvases[activeTab];
    if (!canvas) return; // Tab not yet initialized
    const ctx = this.contexts[activeTab];

    if (activeTab === 'logistic') {
      this.drawLogisticCanvas(ctx, canvas, points, models[activeTab], showResiduals);
    } else {
      this.drawCanvas(ctx, canvas, points, models[activeTab], showResiduals);
    }

    const countEl = document.getElementById('point-count');
    if (countEl) countEl.textContent = points.length;
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

  drawLogisticCanvas(ctx, canvas, points, model, showResiduals) {
    // Clear
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    this.drawGrid(ctx, canvas);
    // Axes
    this.drawAxes(ctx, canvas);

    // Decision boundary
    if (model.fitted) {
      this.drawDecisionBoundary(ctx, canvas, model);
    }

    // Points with class colors
    this.drawClassificationPoints(ctx, canvas, points);
  }

  drawDecisionBoundary(ctx, canvas, model) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(AppUtils.margin, AppUtils.margin,
             canvas.width - 2 * AppUtils.margin,
             canvas.height - 2 * AppUtils.margin);
    ctx.clip();

    // Decision boundary is where mx + b = 0 (sigmoid = 0.5)
    // So x = -b/m
    if (Math.abs(model.m) > 1e-6) {
      const xBoundary = -model.b / model.m;
      if (xBoundary >= AppUtils.domain.xmin && xBoundary <= AppUtils.domain.xmax) {
        const [px] = AppUtils.dataToPx(xBoundary, AppUtils.domain.ymin, canvas);
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px, AppUtils.margin);
        ctx.lineTo(px, canvas.height - AppUtils.margin);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawClassificationPoints(ctx, canvas, points) {
    for (const p of points) {
      const [px, py] = AppUtils.dataToPx(p.x, p.y, canvas);
      // Color by class: red for 0, blue for 1
      ctx.fillStyle = p.label === 1 ? '#3b82f6' : '#ef4444';
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  drawLossPlot(lossHistory) {
    if (!this.lossCanvas) return;
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

  drawStatisticsPlot(canvasId, data, plotType) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);

    if (plotType === 'correlation') {
      this.drawCorrelationPlot(ctx, canvas, data);
    } else if (plotType === 'ttest') {
      this.drawTTestPlot(ctx, canvas, data);
    } else if (plotType === 'anova') {
      this.drawANOVAPlot(ctx, canvas, data);
    }
  }

  drawCorrelationPlot(ctx, canvas, data) {
    const { group1, group2 } = data;
    const n = Math.min(group1.length, group2.length);

    const margin = 50;
    const w = canvas.width - 2 * margin;
    const h = canvas.height - 2 * margin;

    // Use 0-10 scale for both axes
    const minVal = 0;
    const maxVal = 10;

    // Draw axes
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(margin, margin, w, h);

    // Draw x-axis labels
    ctx.fillStyle = '#374151';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 10; i++) {
      const px = margin + (i / 10) * w;
      ctx.fillText(i.toString(), px, canvas.height - margin + 20);
    }

    // Draw y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 10; i++) {
      const py = margin + h - (i / 10) * h;
      ctx.fillText(i.toString(), margin - 10, py + 4);
    }

    // Draw points
    if (n > 0) {
      ctx.fillStyle = '#3b82f6';
      for (let i = 0; i < n; i++) {
        const px = margin + (group1[i] / maxVal) * w;
        const py = margin + h - (group2[i] / maxVal) * h;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // Axis labels
    ctx.fillStyle = '#374151';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Variable 1', canvas.width / 2, canvas.height - 10);
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Variable 2', 0, 0);
    ctx.restore();
  }

  drawTTestPlot(ctx, canvas, data) {
    const { group1, group2, mean1, mean2 } = data;
    const margin = 50;
    const w = canvas.width - 2 * margin;
    const h = canvas.height - 2 * margin;

    // Use 0-10 scale
    const minVal = 0;
    const maxVal = 10;
    const range = 10;

    // Draw boundary regions with light backgrounds
    ctx.fillStyle = '#fee2e2'; // Light red for group 1
    ctx.fillRect(margin, margin, w / 2, h);
    ctx.fillStyle = '#dbeafe'; // Light blue for group 2
    ctx.fillRect(margin + w / 2, margin, w / 2, h);

    // Draw center divider
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(margin + w / 2, margin);
    ctx.lineTo(margin + w / 2, margin + h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw axes
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(margin, margin, w, h);

    // Draw y-axis labels
    ctx.fillStyle = '#374151';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 10; i++) {
      const py = margin + h - (i / 10) * h;
      ctx.fillText(i.toString(), margin - 10, py + 4);
    }

    const drawGroup = (group, xPos, color, label) => {
      ctx.fillStyle = color;
      group.forEach((val, idx) => {
        const py = margin + h - (val / maxVal) * h;
        const px = xPos + ((idx % 10) - 4.5) * 5; // Spread horizontally
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Label
      ctx.fillStyle = '#374151';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(label, xPos, margin - 20);
    };

    drawGroup(group1, margin + w * 0.25, '#dc2626', 'Group 1 (Left)');
    drawGroup(group2, margin + w * 0.75, '#2563eb', 'Group 2 (Right)');

    // Draw means if data exists
    if (group1.length > 0) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      const mean1Py = margin + h - (mean1 / maxVal) * h;
      ctx.beginPath();
      ctx.moveTo(margin + 10, mean1Py);
      ctx.lineTo(margin + w / 2 - 10, mean1Py);
      ctx.stroke();
    }

    if (group2.length > 0) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      const mean2Py = margin + h - (mean2 / maxVal) * h;
      ctx.beginPath();
      ctx.moveTo(margin + w / 2 + 10, mean2Py);
      ctx.lineTo(margin + w - 10, mean2Py);
      ctx.stroke();
    }
  }

  drawANOVAPlot(ctx, canvas, data) {
    const { groups, groupMeans } = data;
    const margin = 50;
    const w = canvas.width - 2 * margin;
    const h = canvas.height - 2 * margin;

    // Use 0-10 scale
    const minVal = 0;
    const maxVal = 10;
    const range = 10;

    // Draw each group with background colors (show all 5 regions)
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];
    const bgColors = ['#fee2e2', '#dbeafe', '#dcfce7', '#fed7aa', '#ede9fe'];
    const numRegions = 5;
    const regionWidth = w / numRegions;

    // Draw background regions for all 5 groups
    for (let i = 0; i < numRegions; i++) {
      ctx.fillStyle = bgColors[i % bgColors.length];
      ctx.fillRect(margin + i * regionWidth, margin, regionWidth, h);
    }

    // Draw dividers between regions
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (let i = 1; i < numRegions; i++) {
      ctx.beginPath();
      ctx.moveTo(margin + i * regionWidth, margin);
      ctx.lineTo(margin + i * regionWidth, margin + h);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw axes
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(margin, margin, w, h);

    // Draw y-axis labels
    ctx.fillStyle = '#374151';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 10; i++) {
      const py = margin + h - (i / 10) * h;
      ctx.fillText(i.toString(), margin - 10, py + 4);
    }

    // Draw group labels for all 5 regions
    ctx.fillStyle = '#374151';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    for (let i = 0; i < numRegions; i++) {
      const xCenter = margin + regionWidth * (i + 0.5);
      ctx.fillText(`G${i + 1}`, xCenter, canvas.height - margin + 20);
    }

    // Draw points for each group that has data
    groups.forEach((group, i) => {
      const xCenter = margin + regionWidth * (i + 0.5);
      ctx.fillStyle = colors[i % colors.length];

      // Draw points with deterministic positioning
      group.forEach((val, j) => {
        const py = margin + h - (val / maxVal) * h;
        // Use deterministic offset based on index
        const offset = ((j % 10) - 4.5) * (regionWidth * 0.08);
        const px = xCenter + offset;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Draw mean line
      if (groupMeans[i] !== undefined) {
        const meanY = margin + h - (groupMeans[i] / maxVal) * h;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(margin + i * regionWidth + 10, meanY);
        ctx.lineTo(margin + (i + 1) * regionWidth - 10, meanY);
        ctx.stroke();
      }
    });
  }

  setupEvents() {
    Object.values(this.canvases).forEach(canvas => {
      if (!canvas) return;
      canvas.addEventListener('contextmenu', e => e.preventDefault());
      canvas.addEventListener('mousedown', e => this.onMouseDown(e, canvas));
      canvas.addEventListener('mousemove', e => this.onMouseMove(e, canvas));
      canvas.addEventListener('mouseup', () => this.dragging = -1);
      canvas.addEventListener('mouseleave', () => this.dragging = -1);
    });

    // Statistics canvas event handlers
    const corrCanvas = document.getElementById('plot-correlation');
    if (corrCanvas) {
      corrCanvas.addEventListener('click', e => this.onStatisticsClick(e, corrCanvas, 'correlation'));
      corrCanvas.addEventListener('contextmenu', e => {
        e.preventDefault();
        this.onStatisticsRightClick('correlation');
      });
    }

    const ttestCanvas = document.getElementById('plot-ttest');
    if (ttestCanvas) {
      ttestCanvas.addEventListener('click', e => this.onStatisticsClick(e, ttestCanvas, 'ttest'));
      ttestCanvas.addEventListener('contextmenu', e => {
        e.preventDefault();
        this.onStatisticsRightClick('ttest');
      });
    }

    const anovaCanvas = document.getElementById('plot-anova');
    if (anovaCanvas) {
      anovaCanvas.addEventListener('click', e => this.onStatisticsClick(e, anovaCanvas, 'anova'));
      anovaCanvas.addEventListener('contextmenu', e => {
        e.preventDefault();
        this.onStatisticsRightClick('anova');
      });
    }
  }

  onStatisticsClick(e, canvas, type) {
    const [px, py] = this.getMousePos(e, canvas);
    const w = canvas.width, h = canvas.height;
    const margin = 50;

    if (type === 'correlation') {
      // Map click to 0-10 data coordinates for both axes
      const x = ((px - margin) / (w - 2 * margin)) * 10;
      const y = ((h - margin - py) / (h - 2 * margin)) * 10;

      if (x >= 0 && x <= 10 && y >= 0 && y <= 10) {
        window.App.statData.correlation.push({ x, y });
        document.getElementById('corr-point-count').textContent = window.App.statData.correlation.length;
        const group1 = window.App.statData.correlation.map(p => p.x);
        const group2 = window.App.statData.correlation.map(p => p.y);
        this.drawStatisticsPlot('plot-correlation', { group1, group2 }, 'correlation');
      }
    } else if (type === 'ttest') {
      // Determine which group based on x position (left or right half)
      const halfWidth = (w - 2 * margin) / 2;
      const clickX = px - margin;
      const activeGroup = clickX < halfWidth ? 0 : 1;

      // Update active group selection
      window.App.statData.ttest.activeGroup = activeGroup;
      window.App.setTTestGroup(activeGroup);

      // Map to 0-10 coordinate space
      const value = ((h - margin - py) / (h - 2 * margin)) * 10;

      if (value >= 0 && value <= 10 && clickX >= 0 && clickX < (w - 2 * margin)) {
        if (activeGroup === 0) {
          window.App.statData.ttest.group1.push(value);
          document.getElementById('ttest-n1').textContent = window.App.statData.ttest.group1.length;
        } else {
          window.App.statData.ttest.group2.push(value);
          document.getElementById('ttest-n2').textContent = window.App.statData.ttest.group2.length;
        }

        const mean1 = window.App.statData.ttest.group1.length > 0 ?
          window.App.statData.ttest.group1.reduce((s,v) => s+v, 0) / window.App.statData.ttest.group1.length : 0;
        const mean2 = window.App.statData.ttest.group2.length > 0 ?
          window.App.statData.ttest.group2.reduce((s,v) => s+v, 0) / window.App.statData.ttest.group2.length : 0;
        this.drawStatisticsPlot('plot-ttest', {...window.App.statData.ttest, mean1, mean2 }, 'ttest');
      }
    } else if (type === 'anova') {
      // Determine which group based on x position (divide into 5 regions)
      const clickX = px - margin;
      const regionWidth = (w - 2 * margin) / 5;
      const activeGroup = Math.floor(clickX / regionWidth);

      if (activeGroup >= 0 && activeGroup < 5) {
        // Update active group selection
        window.App.statData.anova.activeGroup = activeGroup;
        window.App.setAnovaGroup(activeGroup);

        // Map to 0-10 coordinate space
        const value = ((h - margin - py) / (h - 2 * margin)) * 10;

        if (value >= 0 && value <= 10 && clickX >= 0 && clickX < (w - 2 * margin)) {
          window.App.statData.anova.groups[activeGroup].push(value);
          for (let i = 1; i <= 5; i++) {
            document.getElementById(`anova-g${i}`).textContent = `G${i}: ${window.App.statData.anova.groups[i-1].length}`;
          }

          const groups = window.App.statData.anova.groups.filter(g => g.length > 0);
          const groupMeans = groups.map(g => g.reduce((s,v)=>s+v,0)/g.length);
          this.drawStatisticsPlot('plot-anova', { groups, groupMeans }, 'anova');
        }
      }
    }
  }

  onStatisticsRightClick(type) {
    if (type === 'correlation') {
      if (window.App.statData.correlation.length > 0) {
        window.App.statData.correlation.pop();
        document.getElementById('corr-point-count').textContent = window.App.statData.correlation.length;
        const group1 = window.App.statData.correlation.map(p => p.x);
        const group2 = window.App.statData.correlation.map(p => p.y);
        this.drawStatisticsPlot('plot-correlation', { group1, group2 }, 'correlation');
      }
    } else if (type === 'ttest') {
      // Remove from the group that has the most recent addition
      if (window.App.statData.ttest.group2.length > 0) {
        window.App.statData.ttest.group2.pop();
        document.getElementById('ttest-n2').textContent = window.App.statData.ttest.group2.length;
      } else if (window.App.statData.ttest.group1.length > 0) {
        window.App.statData.ttest.group1.pop();
        document.getElementById('ttest-n1').textContent = window.App.statData.ttest.group1.length;
      }

      const mean1 = window.App.statData.ttest.group1.length > 0 ?
        window.App.statData.ttest.group1.reduce((s,v) => s+v, 0) / window.App.statData.ttest.group1.length : 0;
      const mean2 = window.App.statData.ttest.group2.length > 0 ?
        window.App.statData.ttest.group2.reduce((s,v) => s+v, 0) / window.App.statData.ttest.group2.length : 0;
      this.drawStatisticsPlot('plot-ttest', {...window.App.statData.ttest, mean1, mean2 }, 'ttest');
    } else if (type === 'anova') {
      const activeGroup = window.App.statData.anova.activeGroup;
      if (window.App.statData.anova.groups[activeGroup].length > 0) {
        window.App.statData.anova.groups[activeGroup].pop();
        for (let i = 1; i <= 5; i++) {
          document.getElementById(`anova-g${i}`).textContent = `G${i}: ${window.App.statData.anova.groups[i-1].length}`;
        }

        const groups = window.App.statData.anova.groups.filter(g => g.length > 0);
        const groupMeans = groups.map(g => g.reduce((s,v)=>s+v,0)/g.length);
        this.drawStatisticsPlot('plot-anova', { groups, groupMeans }, 'anova');
      }
    }
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
      // For logistic regression, assign class based on selected group
      const isLogistic = window.App && window.App.activeRegTab === 'logistic';
      const label = isLogistic ? window.App.getActiveLogisticGroup() : undefined;
      window.App.addPoint(isLogistic ? {x, y, label} : {x, y});
    }
  }

  onMouseMove(e, canvas) {
    if (this.dragging < 0) return;
    const [px, py] = this.getMousePos(e, canvas);
    const [x, y] = AppUtils.pxToData(px, py, canvas);
    const isLogistic = window.App && window.App.activeRegTab === 'logistic';
    const currentPoint = window.App.getPoints()[this.dragging];
    if (isLogistic && currentPoint) {
      window.App.updatePoint(this.dragging, {x, y, label: currentPoint.label});
    } else {
      window.App.updatePoint(this.dragging, {x, y});
    }
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
