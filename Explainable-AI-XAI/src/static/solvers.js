// ============================================================================
// OLS SOLVER
// ============================================================================

class OLSSolver {
  solve(points) {
    const n = points.length;
    if (n < 2) throw new Error('Need at least 2 points!');

    let Sx = 0, Sy = 0, Sxx = 0, Sxy = 0;
    for (const p of points) {
      Sx += p.x; Sy += p.y; Sxx += p.x * p.x; Sxy += p.x * p.y;
    }

    const det = Sxx * n - Sx * Sx;
    if (Math.abs(det) < 1e-12) throw new Error('Singular matrix.');

    const m = (n * Sxy - Sx * Sy) / det;
    const b = (Sxx * Sy - Sx * Sxy) / det;

    return { m, b, fitted: true };
  }

  displaySteps(points, model) {
    const n = points.length;
    let Sx = 0, Sy = 0, Sxx = 0, Sxy = 0;
    for (const p of points) {
      Sx += p.x; Sy += p.y; Sxx += p.x * p.x; Sxy += p.x * p.y;
    }

    const steps = [
      `X^{\\top}X=\\begin{bmatrix}${Sxx.toFixed(3)}&${Sx.toFixed(3)}\\\\${Sx.toFixed(3)}&${n}\\end{bmatrix}`,
      `X^{\\top}y=\\begin{bmatrix}${Sxy.toFixed(3)}\\\\${Sy.toFixed(3)}\\end{bmatrix}`,
      `\\beta=(X^{\\top}X)^{-1}X^{\\top}y=\\begin{bmatrix}${model.m.toFixed(6)}\\\\${model.b.toFixed(6)}\\end{bmatrix}`
    ];

    const cont = document.getElementById('ols-steps');
    cont.innerHTML = '';
    steps.forEach(tex => {
      const div = document.createElement('div');
      div.className = 'calc-step';
      cont.appendChild(div);
      AppUtils.kRender(div, tex, true);
    });
    document.getElementById('ols-calculations').style.display = 'block';
  }

  updateDisplay(points, model) {
    document.getElementById('ols-m').textContent = model.fitted ? model.m.toFixed(6) : '—';
    document.getElementById('ols-b').textContent = model.fitted ? model.b.toFixed(6) : '—';
    
    if (model.fitted && points.length) {
      const mse = AppUtils.calculateMSE(points, model.m, model.b);
      const r2 = AppUtils.calculateR2(points, model.m, model.b);
      document.getElementById('ols-mse').textContent = mse.toFixed(6);
      document.getElementById('ols-r2').textContent = r2.toFixed(6);
    }
  }
}

// ============================================================================
// GRADIENT DESCENT
// ============================================================================

class GradientDescent {
  constructor() {
    this.reset();
  }

  reset() {
    this.initialized = false;
    this.currentStep = -1;
    this.iteration = 0;
    this.lossHistory = [];
    this.autoRunning = false;
    this.stepData = {};
    this.autoTimeoutId = null;
  }

  initialize(points) {
    if (points.length < 2) throw new Error('Add at least 2 points first!');
    
    const meanY = points.reduce((s, p) => s + p.y, 0) / points.length;
    const model = { m: 0, b: meanY, fitted: true };
    
    this.initialized = true;
    this.currentStep = 0;
    this.iteration = 0;
    this.lossHistory = [];
    this.stopAutoRun();
    this.stepData = {};

    document.getElementById('next-step').disabled = false;
    this.showAllSteps();
    this.showStep(0);
    AppUtils.kRender(document.getElementById('gd-init-formula'), 
                    `m_0=${model.m.toFixed(6)},\\; b_0=${model.b.toFixed(6)}`);
    this.updateStepDisplay();
    
    return model;
  }

  executeStep(points, model) {
    if (!this.initialized) return model;

    switch(this.currentStep) {
      case 0: return this.initStep(model);
      case 1: return this.predictionStep(points, model);
      case 2: return this.costStep(points, model);
      case 3: return this.gradientStep(points, model);
      case 4: return this.updateStep(model);
    }
    return model;
  }

  initStep(model) {
    this.showStep(0);
    AppUtils.kRender(document.getElementById('gd-init-formula'), 
                    `m_0=${model.m.toFixed(6)},\\; b_0=${model.b.toFixed(6)}`);
    this.currentStep++;
    this.updateStepDisplay();
    return model;
  }

  predictionStep(points, model) {
    this.stepData.predictions = [];
    this.stepData.errors = [];
    for (const p of points) {
      const pred = model.m * p.x + model.b;
      this.stepData.predictions.push(pred);
      this.stepData.errors.push(pred - p.y);
    }
    
    this.showStep(1);
    AppUtils.kRender(document.getElementById('gd-h-formula'), `h_i = m\\,x_i + b`);
    this.displayPredictionsTable(points);
    this.currentStep++;
    this.updateStepDisplay();
    return model;
  }

  costStep(points, model) {
    const sumSqErrors = this.stepData.errors.reduce((s, e) => s + e * e, 0);
    this.stepData.cost = sumSqErrors / (2 * points.length);
    this.lossHistory.push(this.stepData.cost);
    
    this.showStep(2);
    AppUtils.kRender(document.getElementById('gd-j-formula'), 
                    `J=\\tfrac{1}{2n}\\sum (h_i-y_i)^2 = ${this.stepData.cost.toFixed(6)}`);
    document.getElementById('cost-value').textContent = this.stepData.cost.toFixed(6);
    this.currentStep++;
    this.updateStepDisplay();
    return model;
  }

  gradientStep(points, model) {
    const n = points.length;
    this.stepData.gradM = 0;
    this.stepData.gradB = 0;
    for (let i = 0; i < n; i++) {
      this.stepData.gradM += points[i].x * this.stepData.errors[i] / n;
      this.stepData.gradB += this.stepData.errors[i] / n;
    }
    
    this.showStep(3);
    AppUtils.kRender(document.getElementById('gd-grads-formula'),
                    `\\frac{\\partial J}{\\partial m}=\\tfrac{1}{n}\\sum x_i(h_i-y_i),\\; \\frac{\\partial J}{\\partial b}=\\tfrac{1}{n}\\sum (h_i-y_i)`);
    document.getElementById('grad-m-val').textContent = this.stepData.gradM.toFixed(6);
    document.getElementById('grad-b-val').textContent = this.stepData.gradB.toFixed(6);
    this.currentStep++;
    this.updateStepDisplay();
    return model;
  }

  updateStep(model) {
    const lr = parseFloat(document.getElementById('lr').value) || 0.1;
    const newModel = {
      m: model.m - lr * this.stepData.gradM,
      b: model.b - lr * this.stepData.gradB,
      fitted: true
    };
    
    this.showStep(4);
    AppUtils.kRender(document.getElementById('gd-update-formula'),
                    `m\\leftarrow m-\\eta\\,\\tfrac{\\partial J}{\\partial m},\\; b\\leftarrow b-\\eta\\,\\tfrac{\\partial J}{\\partial b}`);
    document.getElementById('new-m-val').textContent = newModel.m.toFixed(6);
    document.getElementById('new-b-val').textContent = newModel.b.toFixed(6);
    
    this.iteration++;
    this.currentStep = 0;
    this.updateStepDisplay();
    return newModel;
  }

  displayPredictionsTable(points) {
    const tbody = document.getElementById('pred-body');
    tbody.innerHTML = '';
    for (let i = 0; i < points.length; i++) {
      const row = tbody.insertRow();
      row.insertCell(0).textContent = i + 1;
      row.insertCell(1).textContent = points[i].x.toFixed(3);
      row.insertCell(2).textContent = points[i].y.toFixed(3);
      row.insertCell(3).textContent = this.stepData.predictions[i].toFixed(3);
      row.insertCell(4).textContent = this.stepData.errors[i].toFixed(3);
    }
  }

  showAllSteps() {
    for (let i = 0; i <= 4; i++) {
      const el = document.getElementById(`step-${i}`);
      if (el) el.style.display = 'block';
    }
  }

  showStep(stepNum) {
    for (let i = 0; i <= 4; i++) {
      const el = document.getElementById(`step-${i}`);
      if (el) el.classList.remove('current-step');
    }
    const cur = document.getElementById(`step-${stepNum}`);
    if (cur) cur.classList.add('current-step');
  }

  updateStepDisplay() {
    const names = ['Initialization', 'Predictions', 'Cost', 'Gradients', 'Update'];
    document.getElementById('iteration').textContent = this.iteration;
    document.getElementById('current-step-name').textContent = 
      this.currentStep >= 0 ? names[this.currentStep] : 'Not Started';
  }

  runOneIteration(points, model) {
    const startIter = this.iteration;
    let newModel = model;
    let guard = 0;
    while (this.iteration === startIter && guard < 10) {
      newModel = this.executeStep(points, newModel);
      guard++;
    }
    return newModel;
  }

  startAutoRun(points, getCurrentModel, onUpdate) {
    this.autoRunning = !this.autoRunning;
    document.getElementById('auto-run').textContent = this.autoRunning ? 'Stop' : 'Auto';
    
    if (this.autoTimeoutId) {
      clearTimeout(this.autoTimeoutId);
      this.autoTimeoutId = null;
    }
    
    if (this.autoRunning) {
      const autoStep = () => {
        if (!this.autoRunning) return;
        
        const currentModel = getCurrentModel();
        const newModel = this.runOneIteration(points, currentModel);
        onUpdate(newModel);
        
        this.autoTimeoutId = setTimeout(autoStep, 50);
      };
      autoStep();
    }
  }

  stopAutoRun() {
    this.autoRunning = false;
    if (this.autoTimeoutId) {
      clearTimeout(this.autoTimeoutId);
      this.autoTimeoutId = null;
    }
    document.getElementById('auto-run').textContent = 'Auto';
  }
}

// ============================================================================
// MANUAL CALCULATOR
// ============================================================================

class ManualCalculator {
  calculate(points) {
    const n = points.length;
    if (n < 2) throw new Error('Need at least 2 points!');
    
    const meanX = points.reduce((s, p) => s + p.x, 0) / n;
    const meanY = points.reduce((s, p) => s + p.y, 0) / n;

    let ssxx = 0, ssyy = 0, ssxy = 0;
    for (const p of points) {
      const dx = p.x - meanX, dy = p.y - meanY;
      ssxx += dx * dx; ssyy += dy * dy; ssxy += dx * dy;
    }
    
    const b1 = ssxy / ssxx;
    const b0 = meanY - b1 * meanX;
    const model = {m: b1, b: b0, fitted: true};

    this.displayCalculations(points, meanX, meanY, ssxx, ssyy, ssxy, b1, b0);
    this.populateDataTable(points, meanX, meanY);
    
    return model;
  }

  displayCalculations(points, meanX, meanY, ssxx, ssyy, ssxy, b1, b0) {
    const n = points.length;
    
    // Calculate error metrics
    let ess = 0, rss = 0;
    for (const p of points) {
      const pred = b1 * p.x + b0;
      ess += (pred - meanY) ** 2;
      rss += (p.y - pred) ** 2;
    }
    
    const tss = ssyy;
    const r2 = ess / tss;
    const mse = rss / (n - 2);
    const rmse = Math.sqrt(mse);

    // Render formulas
    AppUtils.kRender(document.getElementById('mean-x-tex'), `\\bar{x}=\\tfrac{\\sum x_i}{n}=${meanX.toFixed(6)}`);
    AppUtils.kRender(document.getElementById('mean-y-tex'), `\\bar{y}=\\tfrac{\\sum y_i}{n}=${meanY.toFixed(6)}`);
    AppUtils.kRender(document.getElementById('ssxx-tex'), `SS_{xx}=\\sum(x_i-\\bar{x})^2=${ssxx.toFixed(6)}`);
    AppUtils.kRender(document.getElementById('ssyy-tex'), `SS_{yy}=\\sum(y_i-\\bar{y})^2=${ssyy.toFixed(6)}`);
    AppUtils.kRender(document.getElementById('ssxy-tex'), `SS_{xy}=\\sum(x_i-\\bar{x})(y_i-\\bar{y})=${ssxy.toFixed(6)}`);
    AppUtils.kRender(document.getElementById('b1-tex'), `b_1=\\tfrac{SS_{xy}}{SS_{xx}}=${b1.toFixed(6)}`);
    AppUtils.kRender(document.getElementById('b0-tex'), `b_0=\\bar{y}-b_1\\bar{x}=${b0.toFixed(6)}`);
    AppUtils.kRender(document.getElementById('tss-tex'), `TSS=\\sum(y_i-\\bar{y})^2=${tss.toFixed(6)}`);
    AppUtils.kRender(document.getElementById('ess-tex'), `ESS=\\sum(\\hat y_i-\\bar{y})^2=${ess.toFixed(6)}`);
    AppUtils.kRender(document.getElementById('rss-tex'), `RSS=\\sum(y_i-\\hat y_i)^2=${rss.toFixed(6)}`);
    AppUtils.kRender(document.getElementById('r2-tex'), `R^2=\\tfrac{ESS}{TSS}=${r2.toFixed(6)}`);
    AppUtils.kRender(document.getElementById('mse-tex'), `MSE=\\tfrac{RSS}{n-2}=${mse.toFixed(6)}`);
    AppUtils.kRender(document.getElementById('rmse-tex'), `RMSE=\\sqrt{MSE}=${rmse.toFixed(6)}`);

    document.getElementById('final-b1').textContent = b1.toFixed(6);
    document.getElementById('final-b0').textContent = b0.toFixed(6);
    document.getElementById('manual-calculations').style.display = 'block';
  }

  populateDataTable(points, meanX, meanY) {
    const tbody = document.getElementById('manual-body');
    tbody.innerHTML = '';
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const dx = p.x - meanX, dy = p.y - meanY;
      const row = tbody.insertRow();
      row.insertCell(0).textContent = i + 1;
      row.insertCell(1).textContent = p.x.toFixed(3);
      row.insertCell(2).textContent = p.y.toFixed(3);
      row.insertCell(3).textContent = dx.toFixed(3);
      row.insertCell(4).textContent = dy.toFixed(3);
      row.insertCell(5).textContent = (dx * dx).toFixed(3);
      row.insertCell(6).textContent = (dy * dy).toFixed(3);
      row.insertCell(7).textContent = (dx * dy).toFixed(3);
    }
  }
}

// ============================================================================
// LOGISTIC REGRESSION
// ============================================================================

class LogisticRegression {
  constructor() {
    this.reset();
  }

  reset() {
    this.initialized = false;
    this.currentStep = -1;
    this.iteration = 0;
    this.lossHistory = [];
    this.autoRunning = false;
    this.stepData = {};
    this.autoTimeoutId = null;
  }

  sigmoid(z) {
    return 1 / (1 + Math.exp(-z));
  }

  initialize(points) {
    if (points.length < 2) throw new Error('Add at least 2 points first!');

    const model = { m: 0, b: 0, fitted: true };

    this.initialized = true;
    this.currentStep = 0;
    this.iteration = 0;
    this.lossHistory = [];
    this.stopAutoRun();
    this.stepData = {};

    document.getElementById('next-step-lr').disabled = false;
    this.showAllSteps();
    this.showStep(0);
    AppUtils.kRender(document.getElementById('lr-init-formula'),
                    `m_0=${model.m.toFixed(6)},\\; b_0=${model.b.toFixed(6)}`);
    this.updateStepDisplay();

    return model;
  }

  executeStep(points, model) {
    if (!this.initialized) return model;

    switch(this.currentStep) {
      case 0: return this.initStep(model);
      case 1: return this.predictionStep(points, model);
      case 2: return this.costStep(points, model);
      case 3: return this.gradientStep(points, model);
      case 4: return this.updateStep(model);
    }
    return model;
  }

  initStep(model) {
    this.showStep(0);
    AppUtils.kRender(document.getElementById('lr-init-formula'),
                    `m_0=${model.m.toFixed(6)},\\; b_0=${model.b.toFixed(6)}`);
    this.currentStep++;
    this.updateStepDisplay();
    return model;
  }

  predictionStep(points, model) {
    this.stepData.predictions = [];
    this.stepData.errors = [];
    for (const p of points) {
      const z = model.m * p.x + model.b;
      const pred = this.sigmoid(z);
      this.stepData.predictions.push(pred);
      this.stepData.errors.push(pred - p.label);
    }

    this.showStep(1);
    AppUtils.kRender(document.getElementById('lr-h-formula'),
                    `h_i = \\sigma(m\\,x_i + b) = \\frac{1}{1+e^{-(mx_i+b)}}`);
    this.displayPredictionsTable(points);
    this.currentStep++;
    this.updateStepDisplay();
    return model;
  }

  costStep(points, model) {
    let cost = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const h = this.stepData.predictions[i];
      const y = points[i].label;
      cost += -(y * Math.log(h + 1e-10) + (1 - y) * Math.log(1 - h + 1e-10));
    }
    this.stepData.cost = cost / n;
    this.lossHistory.push(this.stepData.cost);

    this.showStep(2);
    AppUtils.kRender(document.getElementById('lr-j-formula'),
                    `J=-\\tfrac{1}{n}\\sum [y_i\\log(h_i)+(1-y_i)\\log(1-h_i)] = ${this.stepData.cost.toFixed(6)}`);
    document.getElementById('lr-cost-value').textContent = this.stepData.cost.toFixed(6);
    this.currentStep++;
    this.updateStepDisplay();
    return model;
  }

  gradientStep(points, model) {
    const n = points.length;
    this.stepData.gradM = 0;
    this.stepData.gradB = 0;
    for (let i = 0; i < n; i++) {
      this.stepData.gradM += points[i].x * this.stepData.errors[i] / n;
      this.stepData.gradB += this.stepData.errors[i] / n;
    }

    this.showStep(3);
    AppUtils.kRender(document.getElementById('lr-grads-formula'),
                    `\\frac{\\partial J}{\\partial m}=\\tfrac{1}{n}\\sum x_i(h_i-y_i),\\; \\frac{\\partial J}{\\partial b}=\\tfrac{1}{n}\\sum (h_i-y_i)`);
    document.getElementById('lr-grad-m-val').textContent = this.stepData.gradM.toFixed(6);
    document.getElementById('lr-grad-b-val').textContent = this.stepData.gradB.toFixed(6);
    this.currentStep++;
    this.updateStepDisplay();
    return model;
  }

  updateStep(model) {
    const lr = parseFloat(document.getElementById('lr-lr').value) || 0.1;
    const newModel = {
      m: model.m - lr * this.stepData.gradM,
      b: model.b - lr * this.stepData.gradB,
      fitted: true
    };

    this.showStep(4);
    AppUtils.kRender(document.getElementById('lr-update-formula'),
                    `m\\leftarrow m-\\eta\\,\\tfrac{\\partial J}{\\partial m},\\; b\\leftarrow b-\\eta\\,\\tfrac{\\partial J}{\\partial b}`);
    document.getElementById('lr-new-m-val').textContent = newModel.m.toFixed(6);
    document.getElementById('lr-new-b-val').textContent = newModel.b.toFixed(6);

    this.iteration++;
    this.currentStep = 0;
    this.updateStepDisplay();
    return newModel;
  }

  displayPredictionsTable(points) {
    const tbody = document.getElementById('lr-pred-body');
    tbody.innerHTML = '';
    for (let i = 0; i < points.length; i++) {
      const row = tbody.insertRow();
      row.insertCell(0).textContent = i + 1;
      row.insertCell(1).textContent = points[i].x.toFixed(3);
      row.insertCell(2).textContent = points[i].label;
      row.insertCell(3).textContent = this.stepData.predictions[i].toFixed(3);
      row.insertCell(4).textContent = this.stepData.errors[i].toFixed(3);
    }
  }

  showAllSteps() {
    for (let i = 0; i <= 4; i++) {
      const el = document.getElementById(`lr-step-${i}`);
      if (el) el.style.display = 'block';
    }
  }

  showStep(stepNum) {
    for (let i = 0; i <= 4; i++) {
      const el = document.getElementById(`lr-step-${i}`);
      if (el) el.classList.remove('current-step');
    }
    const cur = document.getElementById(`lr-step-${stepNum}`);
    if (cur) cur.classList.add('current-step');
  }

  updateStepDisplay() {
    const names = ['Initialization', 'Predictions', 'Cost', 'Gradients', 'Update'];
    document.getElementById('lr-iteration').textContent = this.iteration;
    document.getElementById('lr-current-step-name').textContent =
      this.currentStep >= 0 ? names[this.currentStep] : 'Not Started';
  }

  runOneIteration(points, model) {
    const startIter = this.iteration;
    let newModel = model;
    let guard = 0;
    while (this.iteration === startIter && guard < 10) {
      newModel = this.executeStep(points, newModel);
      guard++;
    }
    return newModel;
  }

  startAutoRun(points, getCurrentModel, onUpdate) {
    this.autoRunning = !this.autoRunning;
    document.getElementById('lr-auto-run').textContent = this.autoRunning ? 'Stop' : 'Auto';

    if (this.autoTimeoutId) {
      clearTimeout(this.autoTimeoutId);
      this.autoTimeoutId = null;
    }

    if (this.autoRunning) {
      const autoStep = () => {
        if (!this.autoRunning) return;

        const currentModel = getCurrentModel();
        const newModel = this.runOneIteration(points, currentModel);
        onUpdate(newModel);

        this.autoTimeoutId = setTimeout(autoStep, 50);
      };
      autoStep();
    }
  }

  stopAutoRun() {
    this.autoRunning = false;
    if (this.autoTimeoutId) {
      clearTimeout(this.autoTimeoutId);
      this.autoTimeoutId = null;
    }
    const btn = document.getElementById('lr-auto-run');
    if (btn) btn.textContent = 'Auto';
  }

  calculateMetrics(points, model, threshold = 0.5) {
    if (!points.length) return null;

    let tp = 0, fp = 0, tn = 0, fn = 0;
    const predictions = [];

    for (const p of points) {
      const z = model.m * p.x + model.b;
      const prob = this.sigmoid(z);
      const pred = prob >= threshold ? 1 : 0;
      predictions.push({ actual: p.label, predicted: pred, probability: prob });

      if (p.label === 1 && pred === 1) tp++;
      else if (p.label === 0 && pred === 1) fp++;
      else if (p.label === 0 && pred === 0) tn++;
      else if (p.label === 1 && pred === 0) fn++;
    }

    const accuracy = (tp + tn) / points.length;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0; // Also known as sensitivity
    const specificity = tn + fp > 0 ? tn / (tn + fp) : 0;
    const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    return {
      tp, fp, tn, fn,
      accuracy, precision, recall, specificity, f1,
      predictions
    };
  }

  calculateYoudenThreshold(points, model) {
    if (!points.length) return 0.5;

    // Calculate Youden index for various thresholds
    let bestThreshold = 0.5;
    let bestYouden = -1;

    for (let t = 0; t <= 1; t += 0.01) {
      const metrics = this.calculateMetrics(points, model, t);
      const youden = metrics.recall + metrics.specificity - 1;

      if (youden > bestYouden) {
        bestYouden = youden;
        bestThreshold = t;
      }
    }

    return bestThreshold;
  }
}

// ============================================================================
// STATISTICS CALCULATORS
// ============================================================================

class StatisticsCalculator {
  // Approximation of the gamma function using Lanczos approximation
  lnGamma(z) {
    const g = 7;
    const C = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];

    if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - this.lnGamma(1 - z);

    z -= 1;
    let x = C[0];
    for (let i = 1; i < g + 2; i++) x += C[i] / (z + i);

    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  // Regularized incomplete beta function (for t-distribution CDF)
  betaInc(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    const bt = Math.exp(this.lnGamma(a + b) - this.lnGamma(a) - this.lnGamma(b) +
                        a * Math.log(x) + b * Math.log(1 - x));

    if (x < (a + 1) / (a + b + 2)) {
      return bt * this.betaCF(x, a, b) / a;
    } else {
      return 1 - bt * this.betaCF(1 - x, b, a) / b;
    }
  }

  // Continued fraction for incomplete beta function
  betaCF(x, a, b, maxIter = 200, eps = 1e-10) {
    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;
    let c = 1;
    let d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    let h = d;

    for (let m = 1; m <= maxIter; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < eps) break;
    }
    return h;
  }

  // t-distribution CDF
  tCDF(t, df) {
    const x = df / (df + t * t);
    return 1 - 0.5 * this.betaInc(x, df / 2, 0.5);
  }

  // Two-tailed p-value for t-test
  tTestPValue(t, df) {
    const absT = Math.abs(t);
    const oneTailed = 1 - this.tCDF(absT, df);
    return 2 * oneTailed;
  }

  // F-distribution CDF (approximation)
  fCDF(f, df1, df2) {
    if (f <= 0) return 0;
    const x = df2 / (df2 + df1 * f);
    return 1 - this.betaInc(x, df2 / 2, df1 / 2);
  }

  // p-value for F-test (ANOVA)
  fTestPValue(f, df1, df2) {
    return 1 - this.fCDF(f, df1, df2);
  }

  calculateCorrelation(group1, group2) {
    const n = Math.min(group1.length, group2.length);
    if (n < 2) throw new Error('Need at least 2 paired observations!');

    const mean1 = group1.slice(0, n).reduce((s, v) => s + v, 0) / n;
    const mean2 = group2.slice(0, n).reduce((s, v) => s + v, 0) / n;

    let num = 0, den1 = 0, den2 = 0;
    for (let i = 0; i < n; i++) {
      const d1 = group1[i] - mean1;
      const d2 = group2[i] - mean2;
      num += d1 * d2;
      den1 += d1 * d1;
      den2 += d2 * d2;
    }

    const r = num / Math.sqrt(den1 * den2);
    return { r, n, mean1, mean2 };
  }

  calculateTTest(group1, group2) {
    const n1 = group1.length;
    const n2 = group2.length;
    if (n1 < 2 || n2 < 2) throw new Error('Each group needs at least 2 observations!');

    const mean1 = group1.reduce((s, v) => s + v, 0) / n1;
    const mean2 = group2.reduce((s, v) => s + v, 0) / n2;

    const var1 = group1.reduce((s, v) => s + Math.pow(v - mean1, 2), 0) / (n1 - 1);
    const var2 = group2.reduce((s, v) => s + Math.pow(v - mean2, 2), 0) / (n2 - 1);

    const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
    const se = Math.sqrt(pooledVar * (1/n1 + 1/n2));
    const t = (mean1 - mean2) / se;
    const df = n1 + n2 - 2;
    const pValue = this.tTestPValue(t, df);

    return { t, df, mean1, mean2, var1, var2, n1, n2, se, pValue };
  }

  calculateANOVA(groups) {
    if (groups.length < 2) throw new Error('Need at least 2 groups!');
    for (const g of groups) {
      if (g.length < 1) throw new Error('Each group needs at least 1 observation!');
    }

    // Grand mean
    let totalSum = 0, totalN = 0;
    for (const g of groups) {
      totalSum += g.reduce((s, v) => s + v, 0);
      totalN += g.length;
    }
    const grandMean = totalSum / totalN;

    // Group means
    const groupMeans = groups.map(g => g.reduce((s, v) => s + v, 0) / g.length);

    // Between-group sum of squares (SSB)
    let ssb = 0;
    for (let i = 0; i < groups.length; i++) {
      ssb += groups[i].length * Math.pow(groupMeans[i] - grandMean, 2);
    }

    // Within-group sum of squares (SSW)
    let ssw = 0;
    for (let i = 0; i < groups.length; i++) {
      for (const val of groups[i]) {
        ssw += Math.pow(val - groupMeans[i], 2);
      }
    }

    const dfb = groups.length - 1;
    const dfw = totalN - groups.length;
    const msb = ssb / dfb;
    const msw = ssw / dfw;
    const f = msb / msw;
    const pValue = this.fTestPValue(f, dfb, dfw);

    return { f, dfb, dfw, ssb, ssw, msb, msw, grandMean, groupMeans, groups, pValue };
  }
}

// ============================================================================
// DECISION TREE
// ============================================================================

class DecisionTree {
  constructor() {
    this.reset();
  }

  reset() {
    this.tree = null;
    this.buildSteps = [];
  }

  fit(points, taskType, maxDepth, minSamples) {
    if (points.length < 2) throw new Error('Need at least 2 points!');

    this.buildSteps = [];
    this.buildSteps.push(`<strong>Decision Tree Algorithm</strong><br><br>`);

    // Show step-by-step algorithm
    this.buildSteps.push(`<strong>Algorithm Steps:</strong><br>`);
    this.buildSteps.push(`<strong>Step 1:</strong> Calculate impurity of current node<br>`);

    if (taskType === 'regression') {
      const mseFormula = `\\text{MSE} = \\frac{1}{n}\\sum_{i=1}^{n}(y_i - \\bar{y})^2`;
      this.buildSteps.push(`&nbsp;&nbsp;<span class="formula-inline" data-formula="${mseFormula}"></span><br>`);
    } else {
      const giniFormula = `\\text{Gini} = 1 - \\sum_{k} p_k^2`;
      this.buildSteps.push(`&nbsp;&nbsp;<span class="formula-inline" data-formula="${giniFormula}"></span> where p_k = proportion of class k<br>`);
    }

    this.buildSteps.push(`<strong>Step 2:</strong> Try all possible split points<br>`);
    this.buildSteps.push(`&nbsp;&nbsp;For each threshold, split data into left (x ≤ threshold) and right (x > threshold)<br>`);

    this.buildSteps.push(`<strong>Step 3:</strong> Calculate gain for each split<br>`);
    const gainFormula = taskType === 'regression'
      ? `\\text{Gain} = \\text{MSE}_{parent} - \\frac{n_L}{n}\\text{MSE}_L - \\frac{n_R}{n}\\text{MSE}_R`
      : `\\text{Gain} = \\text{Gini}_{parent} - \\frac{n_L}{n}\\text{Gini}_L - \\frac{n_R}{n}\\text{Gini}_R`;
    this.buildSteps.push(`&nbsp;&nbsp;<span class="formula-inline" data-formula="${gainFormula}"></span><br>`);

    this.buildSteps.push(`<strong>Step 4:</strong> Choose split with highest gain<br>`);

    this.buildSteps.push(`<strong>Step 5:</strong> Recursively repeat for left and right children<br>`);
    this.buildSteps.push(`&nbsp;&nbsp;Stop when: max depth reached, not enough samples, or no gain<br>`);

    this.buildSteps.push(`<strong>Step 6:</strong> Create leaf node<br>`);
    if (taskType === 'regression') {
      const leafFormula = `\\text{prediction} = \\bar{y} = \\frac{1}{n}\\sum_{i=1}^{n} y_i`;
      this.buildSteps.push(`&nbsp;&nbsp;<span class="formula-inline" data-formula="${leafFormula}"></span><br><br>`);
    } else {
      this.buildSteps.push(`&nbsp;&nbsp;prediction = most frequent class in node<br><br>`);
    }

    this.buildSteps.push(`<strong>Building Tree (Max Depth: ${maxDepth}, Min Samples: ${minSamples})</strong><br>`);
    this.buildSteps.push(`Total Points: ${points.length}<br><br>`);

    const tree = this.buildTree(points, taskType, 0, maxDepth, minSamples, 'Root');

    this.buildSteps.push(`<br><strong>✓ Tree Complete!</strong> Nodes: ${this.countNodes(tree)}, Depth: ${this.getTreeDepth(tree)}`);

    return { fitted: true, tree: tree, taskType: taskType, buildSteps: this.buildSteps };
  }

  getTreeDepth(node) {
    if (!node || node.type === 'leaf') return 0;
    return 1 + Math.max(this.getTreeDepth(node.left), this.getTreeDepth(node.right));
  }

  countNodes(node) {
    if (!node) return 0;
    if (node.type === 'leaf') return 1;
    return 1 + this.countNodes(node.left) + this.countNodes(node.right);
  }

  buildTree(points, taskType, depth, maxDepth, minSamples, nodeName = 'Node') {
    const indent = '&nbsp;'.repeat(depth * 2);
    this.buildSteps.push(`${indent}<strong>${nodeName}</strong> (n=${points.length})<br>`);

    // Calculate current node impurity
    const nodeImpurity = taskType === 'regression' ? this.calculateMSE(points) : this.calculateGini(points);
    const impurityName = taskType === 'regression' ? 'MSE' : 'Gini';

    // Base cases
    if (depth >= maxDepth) {
      this.buildSteps.push(`${indent}→ Max depth reached. Creating leaf.<br>`);
      const leaf = this.createLeaf(points, taskType);
      this.buildSteps.push(`${indent}→ Leaf value: ${leaf.value.toFixed(4)}<br><br>`);
      return leaf;
    }

    if (points.length < minSamples) {
      this.buildSteps.push(`${indent}→ Not enough samples. Creating leaf.<br>`);
      const leaf = this.createLeaf(points, taskType);
      this.buildSteps.push(`${indent}→ Leaf value: ${leaf.value.toFixed(4)}<br><br>`);
      return leaf;
    }

    // Show impurity value
    this.buildSteps.push(`${indent}→ ${impurityName} = ${nodeImpurity.toFixed(6)}<br>`);

    // Find best split
    const bestSplit = this.findBestSplitDetailed(points, taskType, indent);

    if (!bestSplit || bestSplit.gain <= 0) {
      this.buildSteps.push(`${indent}→ No beneficial split found. Creating leaf.<br>`);
      const leaf = this.createLeaf(points, taskType);
      this.buildSteps.push(`${indent}→ Leaf value: ${leaf.value.toFixed(4)}<br><br>`);
      return leaf;
    }

    // Split the data
    const leftPoints = points.filter(p => p.x <= bestSplit.threshold);
    const rightPoints = points.filter(p => p.x > bestSplit.threshold);

    if (leftPoints.length === 0 || rightPoints.length === 0) {
      this.buildSteps.push(`${indent}→ Empty split. Creating leaf.<br>`);
      const leaf = this.createLeaf(points, taskType);
      this.buildSteps.push(`${indent}→ Leaf value: ${leaf.value.toFixed(4)}<br><br>`);
      return leaf;
    }

    // Show split result
    this.buildSteps.push(`${indent}→ <strong>Split:</strong> x ≤ ${bestSplit.threshold.toFixed(4)}, Gain = ${bestSplit.gain.toFixed(6)}<br>`);
    this.buildSteps.push(`${indent}&nbsp;&nbsp;Left: n=${leftPoints.length}, ${impurityName}=${bestSplit.leftImpurity.toFixed(6)}<br>`);
    this.buildSteps.push(`${indent}&nbsp;&nbsp;Right: n=${rightPoints.length}, ${impurityName}=${bestSplit.rightImpurity.toFixed(6)}<br><br>`);

    // Recursively build subtrees
    return {
      type: 'split',
      feature: 'x',
      threshold: bestSplit.threshold,
      gain: bestSplit.gain,
      samples: points.length,
      left: this.buildTree(leftPoints, taskType, depth + 1, maxDepth, minSamples, `${nodeName} → L`),
      right: this.buildTree(rightPoints, taskType, depth + 1, maxDepth, minSamples, `${nodeName} → R`)
    };
  }

  createLeaf(points, taskType) {
    if (taskType === 'regression') {
      const value = points.reduce((sum, p) => sum + (p.y || 0), 0) / points.length;
      return { type: 'leaf', value: value, samples: points.length };
    } else {
      // Classification: majority class
      const counts = {};
      points.forEach(p => {
        const label = p.label || 0;
        counts[label] = (counts[label] || 0) + 1;
      });
      const majorityClass = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      const prob = counts[majorityClass] / points.length;
      return { type: 'leaf', value: parseInt(majorityClass), probability: prob, samples: points.length, counts: counts };
    }
  }

  findBestSplit(points, taskType) {
    let bestGain = -Infinity;
    let bestThreshold = null;

    // Get unique x values and try midpoints
    const xValues = [...new Set(points.map(p => p.x))].sort((a, b) => a - b);

    for (let i = 0; i < xValues.length - 1; i++) {
      const threshold = (xValues[i] + xValues[i + 1]) / 2;
      const leftPoints = points.filter(p => p.x <= threshold);
      const rightPoints = points.filter(p => p.x > threshold);

      if (leftPoints.length === 0 || rightPoints.length === 0) continue;

      const gain = this.calculateGain(points, leftPoints, rightPoints, taskType);

      if (gain > bestGain) {
        bestGain = gain;
        bestThreshold = threshold;
      }
    }

    return bestThreshold !== null ? { threshold: bestThreshold, gain: bestGain } : null;
  }

  findBestSplitDetailed(points, taskType, indent) {
    let bestGain = -Infinity;
    let bestThreshold = null;
    let bestLeftImpurity = 0;
    let bestRightImpurity = 0;

    // Get unique x values and try midpoints
    const xValues = [...new Set(points.map(p => p.x))].sort((a, b) => a - b);

    this.buildSteps.push(`${indent}→ Evaluating ${xValues.length - 1} possible split points...<br>`);

    for (let i = 0; i < xValues.length - 1; i++) {
      const threshold = (xValues[i] + xValues[i + 1]) / 2;
      const leftPoints = points.filter(p => p.x <= threshold);
      const rightPoints = points.filter(p => p.x > threshold);

      if (leftPoints.length === 0 || rightPoints.length === 0) continue;

      const leftImpurity = taskType === 'regression'
        ? this.calculateMSE(leftPoints)
        : this.calculateGini(leftPoints);
      const rightImpurity = taskType === 'regression'
        ? this.calculateMSE(rightPoints)
        : this.calculateGini(rightPoints);

      const gain = this.calculateGain(points, leftPoints, rightPoints, taskType);

      if (gain > bestGain) {
        bestGain = gain;
        bestThreshold = threshold;
        bestLeftImpurity = leftImpurity;
        bestRightImpurity = rightImpurity;
      }
    }

    if (bestThreshold !== null) {
      return {
        threshold: bestThreshold,
        gain: bestGain,
        leftImpurity: bestLeftImpurity,
        rightImpurity: bestRightImpurity
      };
    }
    return null;
  }

  calculateGain(parent, left, right, taskType) {
    const parentImpurity = taskType === 'regression'
      ? this.calculateMSE(parent)
      : this.calculateGini(parent);

    const leftImpurity = taskType === 'regression'
      ? this.calculateMSE(left)
      : this.calculateGini(left);

    const rightImpurity = taskType === 'regression'
      ? this.calculateMSE(right)
      : this.calculateGini(right);

    const n = parent.length;
    const nL = left.length;
    const nR = right.length;

    const weightedImpurity = (nL / n) * leftImpurity + (nR / n) * rightImpurity;

    return parentImpurity - weightedImpurity;
  }

  calculateMSE(points) {
    if (points.length === 0) return 0;
    const mean = points.reduce((sum, p) => sum + (p.y || 0), 0) / points.length;
    return points.reduce((sum, p) => sum + Math.pow((p.y || 0) - mean, 2), 0) / points.length;
  }

  calculateGini(points) {
    if (points.length === 0) return 0;

    const counts = {};
    points.forEach(p => {
      const label = p.label || 0;
      counts[label] = (counts[label] || 0) + 1;
    });

    let gini = 1;
    for (const label in counts) {
      const prob = counts[label] / points.length;
      gini -= prob * prob;
    }

    return gini;
  }

  predict(point, tree) {
    if (!tree || tree.type === 'leaf') {
      return tree ? tree.value : 0;
    }

    if (point.x <= tree.threshold) {
      return this.predict(point, tree.left);
    } else {
      return this.predict(point, tree.right);
    }
  }

  updateDisplay(points, model, taskType) {
    if (!model.fitted) return;

    if (taskType === 'regression') {
      const mse = this.calculateTestMSE(points, model.tree);
      const r2 = this.calculateTestR2(points, model.tree);
      const mae = this.calculateTestMAE(points, model.tree);

      document.getElementById('dt-mse').textContent = mse.toFixed(6);
      document.getElementById('dt-r2').textContent = r2.toFixed(6);
      document.getElementById('dt-mae').textContent = mae.toFixed(6);
    } else {
      const metrics = this.calculateClassificationMetrics(points, model.tree);

      document.getElementById('dt-accuracy').textContent = metrics.accuracy.toFixed(4);
      document.getElementById('dt-precision').textContent = metrics.precision.toFixed(4);
      document.getElementById('dt-recall').textContent = metrics.recall.toFixed(4);
      document.getElementById('dt-f1').textContent = metrics.f1.toFixed(4);
    }

    // Display tree structure
    this.displayTree(model.tree);
  }

  calculateTestMSE(points, tree) {
    if (points.length === 0) return 0;
    const errors = points.map(p => Math.pow(p.y - this.predict(p, tree), 2));
    return errors.reduce((a, b) => a + b, 0) / points.length;
  }

  calculateTestMAE(points, tree) {
    if (points.length === 0) return 0;
    const errors = points.map(p => Math.abs(p.y - this.predict(p, tree)));
    return errors.reduce((a, b) => a + b, 0) / points.length;
  }

  calculateTestR2(points, tree) {
    if (points.length === 0) return 0;
    const yMean = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    const ssTot = points.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
    const ssRes = points.reduce((sum, p) => sum + Math.pow(p.y - this.predict(p, tree), 2), 0);
    return 1 - (ssRes / ssTot);
  }

  calculateClassificationMetrics(points, tree) {
    let tp = 0, fp = 0, tn = 0, fn = 0;

    points.forEach(p => {
      const pred = this.predict(p, tree);
      const actual = p.label || 0;

      if (actual === 1 && pred === 1) tp++;
      else if (actual === 0 && pred === 1) fp++;
      else if (actual === 0 && pred === 0) tn++;
      else if (actual === 1 && pred === 0) fn++;
    });

    const accuracy = (tp + tn) / points.length;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    return { accuracy, precision, recall, f1 };
  }

  displayTree(tree, depth = 0) {
    const display = document.getElementById('dt-tree-display');
    display.innerHTML = this.renderTreeHTML(tree, depth);
  }

  renderTreeHTML(node, depth) {
    const indent = '&nbsp;'.repeat(depth * 4);

    if (node.type === 'leaf') {
      return `${indent}├─ <strong>Leaf:</strong> value=${node.value.toFixed(4)}, samples=${node.samples}<br>`;
    } else {
      let html = `${indent}├─ <strong>Split:</strong> x ≤ ${node.threshold.toFixed(4)} (gain=${node.gain.toFixed(4)}, samples=${node.samples})<br>`;
      html += this.renderTreeHTML(node.left, depth + 1);
      html += this.renderTreeHTML(node.right, depth + 1);
      return html;
    }
  }
}

// ============================================================================
// RANDOM FOREST
// ============================================================================

class RandomForest {
  constructor() {
    this.reset();
  }

  reset() {
    this.trees = [];
    this.oobIndices = [];
    this.buildSteps = [];
  }

  fit(points, taskType, nTrees, maxDepth, minSamples, maxFeatures) {
    if (points.length < 2) throw new Error('Need at least 2 points!');

    this.buildSteps = [];
    this.buildSteps.push(`<strong>Random Forest Algorithm</strong><br><br>`);

    // Show step-by-step algorithm
    this.buildSteps.push(`<strong>Algorithm Steps:</strong><br>`);
    this.buildSteps.push(`<strong>Step 1:</strong> For each tree t = 1 to T:<br>`);
    this.buildSteps.push(`&nbsp;&nbsp;a) Create bootstrap sample by sampling n points with replacement<br>`);
    const bootstrapFormula = `D_t = \\{(x_i, y_i)\\}_{i=1}^{n}`;
    this.buildSteps.push(`&nbsp;&nbsp;&nbsp;&nbsp;<span class="formula-inline" data-formula="${bootstrapFormula}"></span> where each point is sampled randomly<br>`);
    this.buildSteps.push(`&nbsp;&nbsp;&nbsp;&nbsp;Expected: ~63.2% unique samples, ~36.8% out-of-bag (OOB)<br>`);
    this.buildSteps.push(`&nbsp;&nbsp;b) Train decision tree on bootstrap sample D_t<br>`);

    this.buildSteps.push(`<strong>Step 2:</strong> Make predictions by aggregating all trees<br>`);
    if (taskType === 'regression') {
      const predFormula = `\\hat{y}(x) = \\frac{1}{T}\\sum_{t=1}^{T} f_t(x)`;
      this.buildSteps.push(`&nbsp;&nbsp;<span class="formula-inline" data-formula="${predFormula}"></span> (average)<br>`);
    } else {
      const predFormula = `\\hat{y}(x) = \\text{mode}\\{f_1(x), ..., f_T(x)\\}`;
      this.buildSteps.push(`&nbsp;&nbsp;<span class="formula-inline" data-formula="${predFormula}"></span> (majority vote)<br>`);
    }

    this.buildSteps.push(`<strong>Step 3:</strong> Evaluate using Out-of-Bag samples<br>`);
    if (taskType === 'regression') {
      const oobFormula = `\\text{OOB Error} = \\frac{1}{n}\\sum_{i=1}^{n}(y_i - \\hat{y}_i^{\\text{OOB}})^2`;
      this.buildSteps.push(`&nbsp;&nbsp;<span class="formula-inline" data-formula="${oobFormula}"></span><br>`);
    } else {
      const oobFormula = `\\text{OOB Error} = \\frac{1}{n}\\sum_{i=1}^{n} \\mathbb{1}(y_i \\neq \\hat{y}_i^{\\text{OOB}})`;
      this.buildSteps.push(`&nbsp;&nbsp;<span class="formula-inline" data-formula="${oobFormula}"></span><br>`);
    }
    this.buildSteps.push(`&nbsp;&nbsp;For each point, use only trees where it was OOB<br><br>`);

    this.buildSteps.push(`<strong>Building Forest (${nTrees} trees, max depth: ${maxDepth})</strong><br>`);
    this.buildSteps.push(`Total Points: ${points.length}<br><br>`);

    const trees = [];
    const oobIndices = [];

    for (let i = 0; i < nTrees; i++) {
      this.buildSteps.push(`<strong>Tree ${i + 1}:</strong> `);

      // Bootstrap sample
      const { bootstrap, oob, uniqueCount } = this.bootstrapSample(points);

      // Build tree on bootstrap sample
      const dt = new DecisionTree();
      dt.buildSteps = []; // Disable DT's verbose output for RF
      const treeModel = dt.fit(bootstrap, taskType, maxDepth, minSamples);

      const depth = dt.getTreeDepth(treeModel.tree);
      const nodes = dt.countNodes(treeModel.tree);
      this.buildSteps.push(`Bootstrap n=${uniqueCount}/${points.length}, OOB n=${oob.length}, Depth=${depth}, Nodes=${nodes}<br>`);

      trees.push(treeModel.tree);
      oobIndices.push(oob);
    }

    // Calculate and show OOB error
    const oobError = this.calculateOOBError(points, trees, oobIndices, taskType);
    const avgDepth = (trees.reduce((sum, t) => sum + (new DecisionTree()).getTreeDepth(t), 0) / trees.length).toFixed(1);

    this.buildSteps.push(`<br><strong>✓ Forest Complete!</strong><br>`);
    this.buildSteps.push(`Trees: ${trees.length}, Avg Depth: ${avgDepth}<br>`);
    this.buildSteps.push(`OOB Error: ${oobError.toFixed(6)}<br>`);

    return { fitted: true, trees: trees, oobIndices: oobIndices, taskType: taskType, buildSteps: this.buildSteps };
  }

  bootstrapSample(points) {
    const bootstrap = [];
    const oob = [];
    const indices = new Set();

    for (let i = 0; i < points.length; i++) {
      const idx = Math.floor(Math.random() * points.length);
      bootstrap.push(points[idx]);
      indices.add(idx);
    }

    for (let i = 0; i < points.length; i++) {
      if (!indices.has(i)) {
        oob.push(i);
      }
    }

    return { bootstrap, oob, uniqueCount: indices.size };
  }

  predict(point, trees, taskType) {
    if (!trees || trees.length === 0) return 0;

    const dt = new DecisionTree();
    const predictions = trees.map(tree => dt.predict(point, tree));

    if (taskType === 'regression') {
      // Average predictions
      return predictions.reduce((a, b) => a + b, 0) / predictions.length;
    } else {
      // Majority vote
      const counts = {};
      predictions.forEach(pred => {
        counts[pred] = (counts[pred] || 0) + 1;
      });
      return parseInt(Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b));
    }
  }

  calculateOOBError(points, trees, oobIndices, taskType) {
    if (trees.length === 0) return 0;

    let totalError = 0;
    let count = 0;

    for (let i = 0; i < points.length; i++) {
      // Find trees where this point was OOB
      const oobTrees = [];
      for (let t = 0; t < trees.length; t++) {
        if (oobIndices[t].includes(i)) {
          oobTrees.push(trees[t]);
        }
      }

      if (oobTrees.length === 0) continue;

      const prediction = this.predict(points[i], oobTrees, taskType);

      if (taskType === 'regression') {
        totalError += Math.pow(points[i].y - prediction, 2);
      } else {
        totalError += (points[i].label !== prediction) ? 1 : 0;
      }
      count++;
    }

    return count > 0 ? totalError / count : 0;
  }

  updateDisplay(points, model, taskType) {
    if (!model.fitted) return;

    const dt = new DecisionTree();

    if (taskType === 'regression') {
      const predictions = points.map(p => this.predict(p, model.trees, taskType));
      const mse = points.reduce((sum, p, i) => sum + Math.pow(p.y - predictions[i], 2), 0) / points.length;
      const yMean = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      const ssTot = points.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
      const ssRes = points.reduce((sum, p, i) => sum + Math.pow(p.y - predictions[i], 2), 0);
      const r2 = 1 - (ssRes / ssTot);
      const mae = points.reduce((sum, p, i) => sum + Math.abs(p.y - predictions[i]), 0) / points.length;
      const oobError = this.calculateOOBError(points, model.trees, model.oobIndices, taskType);

      document.getElementById('rf-mse').textContent = mse.toFixed(6);
      document.getElementById('rf-r2').textContent = r2.toFixed(6);
      document.getElementById('rf-mae').textContent = mae.toFixed(6);
      document.getElementById('rf-oob').textContent = oobError.toFixed(6);
    } else {
      let tp = 0, fp = 0, tn = 0, fn = 0;

      points.forEach(p => {
        const pred = this.predict(p, model.trees, taskType);
        const actual = p.label || 0;

        if (actual === 1 && pred === 1) tp++;
        else if (actual === 0 && pred === 1) fp++;
        else if (actual === 0 && pred === 0) tn++;
        else if (actual === 1 && pred === 0) fn++;
      });

      const accuracy = (tp + tn) / points.length;
      const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
      const oobScore = 1 - this.calculateOOBError(points, model.trees, model.oobIndices, taskType);

      document.getElementById('rf-accuracy').textContent = accuracy.toFixed(4);
      document.getElementById('rf-precision').textContent = precision.toFixed(4);
      document.getElementById('rf-recall').textContent = recall.toFixed(4);
      document.getElementById('rf-f1').textContent = f1.toFixed(4);
      document.getElementById('rf-oob-cls').textContent = oobScore.toFixed(4);
    }

    // Display forest summary
    document.getElementById('rf-tree-count').textContent = model.trees.length;
    const display = document.getElementById('rf-trees-display');
    display.innerHTML = `<p><strong>Forest contains ${model.trees.length} trees</strong></p>` +
      `<p>Task: ${taskType}</p>` +
      `<p>Average tree depth: ${this.calculateAverageDepth(model.trees).toFixed(1)}</p>`;
  }

  calculateAverageDepth(trees) {
    const depths = trees.map(tree => this.getTreeDepth(tree));
    return depths.reduce((a, b) => a + b, 0) / depths.length;
  }

  getTreeDepth(node) {
    if (!node || node.type === 'leaf') return 0;
    return 1 + Math.max(this.getTreeDepth(node.left), this.getTreeDepth(node.right));
  }
}

// ============================================================================
// XGBOOST
// ============================================================================

class XGBoost {
  constructor() {
    this.reset();
  }

  reset() {
    this.autoRunning = false;
    this.lossHistory = [];
  }

  startAutoRun() {
    this.autoRunning = true;
  }

  stopAutoRun() {
    this.autoRunning = false;
  }

  initialize(points, taskType) {
    if (points.length < 2) throw new Error('Add at least 2 points first!');

    // Initialize with mean (regression) or log(odds) (classification)
    let basePrediction;
    if (taskType === 'regression') {
      basePrediction = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    } else {
      // For classification, start with log(odds)
      const positives = points.filter(p => (p.label || 0) === 1).length;
      const negatives = points.length - positives;
      basePrediction = Math.log((positives + 1) / (negatives + 1));
    }

    this.lossHistory = [];

    // Create initial explanation with formulas
    const explanation = this.createAlgorithmExplanation(taskType, basePrediction);

    return {
      fitted: true,
      trees: [],
      basePrediction: basePrediction,
      iteration: 0,
      taskType: taskType,
      lossHistory: [],
      initialExplanation: explanation
    };
  }

  createAlgorithmExplanation(taskType, basePrediction) {
    let html = `<strong>XGBoost Algorithm</strong><br><br>`;

    html += `<strong>Algorithm Steps:</strong><br>`;
    html += `<strong>Step 1:</strong> Initialize model with base prediction<br>`;
    const modelFormula = `F_0(x) = \\text{constant}`;
    html += `&nbsp;&nbsp;<span class="formula-inline" data-formula="${modelFormula}"></span>`;
    html += ` (regression: mean, classification: log-odds)<br>`;
    html += `&nbsp;&nbsp;F₀ = ${basePrediction.toFixed(4)}<br>`;

    html += `<strong>Step 2:</strong> For each boosting round t = 1 to T:<br>`;
    html += `&nbsp;&nbsp;a) Compute gradients and hessians of loss function<br>`;

    if (taskType === 'regression') {
      const gradFormula = `g_i = \\frac{\\partial L}{\\partial \\hat{y}_i} = \\hat{y}_i - y_i`;
      const hessFormula = `h_i = \\frac{\\partial^2 L}{\\partial \\hat{y}_i^2} = 1`;
      html += `&nbsp;&nbsp;&nbsp;&nbsp;<span class="formula-inline" data-formula="${gradFormula}"></span>, <span class="formula-inline" data-formula="${hessFormula}"></span><br>`;
    } else {
      const predFormula = `p_i = \\sigma(F_{t-1}(x_i))`;
      const gradFormula = `g_i = p_i - y_i`;
      const hessFormula = `h_i = p_i(1-p_i)`;
      html += `&nbsp;&nbsp;&nbsp;&nbsp;<span class="formula-inline" data-formula="${predFormula}"></span>, `;
      html += `<span class="formula-inline" data-formula="${gradFormula}"></span>, `;
      html += `<span class="formula-inline" data-formula="${hessFormula}"></span><br>`;
    }

    html += `&nbsp;&nbsp;b) Build regression tree on gradients using gain:<br>`;
    const gainFormula = `Gain = \\frac{1}{2}\\left[\\frac{G_L^2}{H_L+\\lambda} + \\frac{G_R^2}{H_R+\\lambda} - \\frac{G^2}{H+\\lambda}\\right] - \\gamma`;
    html += `&nbsp;&nbsp;&nbsp;&nbsp;<span class="formula-inline" data-formula="${gainFormula}"></span><br>`;
    html += `&nbsp;&nbsp;&nbsp;&nbsp;where G = sum of gradients, H = sum of hessians<br>`;

    html += `&nbsp;&nbsp;c) Compute leaf weights:<br>`;
    const leafFormula = `w = -\\frac{G}{H + \\lambda}`;
    html += `&nbsp;&nbsp;&nbsp;&nbsp;<span class="formula-inline" data-formula="${leafFormula}"></span><br>`;

    html += `&nbsp;&nbsp;d) Update model:<br>`;
    const updateFormula = `F_t(x) = F_{t-1}(x) + \\eta \\cdot f_t(x)`;
    html += `&nbsp;&nbsp;&nbsp;&nbsp;<span class="formula-inline" data-formula="${updateFormula}"></span> where η = learning rate<br>`;

    html += `<strong>Step 3:</strong> Calculate loss<br>`;
    if (taskType === 'regression') {
      const lossFormula = `L = \\frac{1}{n}\\sum_{i=1}^{n}(y_i - F_t(x_i))^2`;
      html += `&nbsp;&nbsp;<span class="formula-inline" data-formula="${lossFormula}"></span><br><br>`;
    } else {
      const lossFormula = `L = -\\frac{1}{n}\\sum[y_i\\log(p_i) + (1-y_i)\\log(1-p_i)]`;
      html += `&nbsp;&nbsp;<span class="formula-inline" data-formula="${lossFormula}"></span><br><br>`;
    }

    html += `<strong>Regularization:</strong> λ (L2 on weights), γ (min split gain), subsample (row sampling)<br><br>`;

    html += `Click "Next Boost" to build trees iteratively.<br>`;

    return html;
  }

  sigmoid(z) {
    return 1 / (1 + Math.exp(-z));
  }

  executeBoost(points, model, taskType, learningRate, maxDepth, lambda, gamma, subsample = 1.0) {
    const stepDisplay = [];
    stepDisplay.push(`<strong>Round ${model.iteration + 1}</strong><br>`);

    // Subsample training data (row sampling for regularization)
    let subsampledPoints = points;
    let subsampledIndices = points.map((_, i) => i);

    if (subsample < 1.0) {
      const sampleSize = Math.max(1, Math.floor(points.length * subsample));
      subsampledIndices = [];
      const indices = points.map((_, i) => i);

      // Random sampling without replacement
      for (let i = 0; i < sampleSize; i++) {
        const randomIndex = Math.floor(Math.random() * indices.length);
        subsampledIndices.push(indices[randomIndex]);
        indices.splice(randomIndex, 1);
      }

      subsampledPoints = subsampledIndices.map(i => points[i]);
    }

    // Calculate current predictions
    const predictions = subsampledPoints.map(p => this.predictRaw(p, model));

    // Calculate gradients and hessians
    const gradients = subsampledPoints.map((p, i) => {
      if (taskType === 'regression') {
        return predictions[i] - p.y;
      } else {
        const prob = this.sigmoid(predictions[i]);
        return prob - (p.label || 0);
      }
    });

    const hessians = subsampledPoints.map((p, i) => {
      if (taskType === 'regression') {
        return 1;
      } else {
        const prob = this.sigmoid(predictions[i]);
        return prob * (1 - prob);
      }
    });

    const avgGrad = gradients.reduce((a, b) => a + b, 0) / gradients.length;
    const avgHess = hessians.reduce((a, b) => a + b, 0) / hessians.length;

    // Build tree on gradients using subsampled data
    const tree = this.buildBoostTree(subsampledPoints, gradients, hessians, 0, maxDepth, lambda, gamma);
    const treeDepth = this.getTreeDepth(tree);
    const treeNodes = this.countNodes(tree);

    // Add tree to model
    model.trees.push(tree);
    model.iteration++;

    // Calculate loss on full dataset
    const loss = this.calculateLoss(points, model, taskType);
    model.lossHistory = model.lossHistory || [];
    model.lossHistory.push(loss);
    this.lossHistory = model.lossHistory;

    // Create concise display
    if (subsample < 1.0) {
      stepDisplay.push(`Subsample: ${subsampledPoints.length}/${points.length} (${(subsample*100).toFixed(0)}%)<br>`);
    }
    stepDisplay.push(`Avg grad: ${avgGrad.toFixed(4)}, Avg hess: ${avgHess.toFixed(4)}<br>`);
    stepDisplay.push(`Tree: depth=${treeDepth}, nodes=${treeNodes}, λ=${lambda}, γ=${gamma}<br>`);
    stepDisplay.push(`Loss: ${loss.toFixed(6)}`);
    if (model.lossHistory.length > 1) {
      const prevLoss = model.lossHistory[model.lossHistory.length - 2];
      const improvement = prevLoss - loss;
      stepDisplay.push(` (↓ ${improvement.toFixed(6)})`);
    }
    stepDisplay.push(`<br>`);

    model.currentStepDisplay = stepDisplay.join('');

    return model;
  }

  getTreeDepth(node) {
    if (!node || node.type === 'leaf') return 0;
    return 1 + Math.max(
      this.getTreeDepth(node.left || null),
      this.getTreeDepth(node.right || null)
    );
  }

  countNodes(node) {
    if (!node) return 0;
    if (node.type === 'leaf') return 1;
    return 1 + this.countNodes(node.left) + this.countNodes(node.right);
  }

  buildBoostTree(points, gradients, hessians, depth, maxDepth, lambda, gamma) {
    // Base case: max depth or no points
    if (depth >= maxDepth || points.length === 0) {
      return this.createBoostLeaf(gradients, hessians, lambda);
    }

    // Find best split
    const bestSplit = this.findBestBoostSplit(points, gradients, hessians, lambda, gamma);

    if (!bestSplit || bestSplit.gain <= gamma) {
      return this.createBoostLeaf(gradients, hessians, lambda);
    }

    // Split the data
    const leftIndices = [];
    const rightIndices = [];
    points.forEach((p, i) => {
      if (p.x <= bestSplit.threshold) {
        leftIndices.push(i);
      } else {
        rightIndices.push(i);
      }
    });

    if (leftIndices.length === 0 || rightIndices.length === 0) {
      return this.createBoostLeaf(gradients, hessians, lambda);
    }

    const leftPoints = leftIndices.map(i => points[i]);
    const leftGradients = leftIndices.map(i => gradients[i]);
    const leftHessians = leftIndices.map(i => hessians[i]);

    const rightPoints = rightIndices.map(i => points[i]);
    const rightGradients = rightIndices.map(i => gradients[i]);
    const rightHessians = rightIndices.map(i => hessians[i]);

    return {
      type: 'split',
      threshold: bestSplit.threshold,
      gain: bestSplit.gain,
      left: this.buildBoostTree(leftPoints, leftGradients, leftHessians, depth + 1, maxDepth, lambda, gamma),
      right: this.buildBoostTree(rightPoints, rightGradients, rightHessians, depth + 1, maxDepth, lambda, gamma)
    };
  }

  createBoostLeaf(gradients, hessians, lambda) {
    const G = gradients.reduce((a, b) => a + b, 0);
    const H = hessians.reduce((a, b) => a + b, 0);
    const weight = -G / (H + lambda);
    return { type: 'leaf', weight: weight };
  }

  findBestBoostSplit(points, gradients, hessians, lambda, gamma) {
    let bestGain = -Infinity;
    let bestThreshold = null;

    const xValues = [...new Set(points.map(p => p.x))].sort((a, b) => a - b);

    for (let i = 0; i < xValues.length - 1; i++) {
      const threshold = (xValues[i] + xValues[i + 1]) / 2;

      const leftIndices = [];
      const rightIndices = [];
      points.forEach((p, idx) => {
        if (p.x <= threshold) {
          leftIndices.push(idx);
        } else {
          rightIndices.push(idx);
        }
      });

      if (leftIndices.length === 0 || rightIndices.length === 0) continue;

      const GL = leftIndices.reduce((sum, idx) => sum + gradients[idx], 0);
      const HL = leftIndices.reduce((sum, idx) => sum + hessians[idx], 0);
      const GR = rightIndices.reduce((sum, idx) => sum + gradients[idx], 0);
      const HR = rightIndices.reduce((sum, idx) => sum + hessians[idx], 0);
      const G = GL + GR;
      const H = HL + HR;

      const gain = 0.5 * (
        (GL * GL) / (HL + lambda) +
        (GR * GR) / (HR + lambda) -
        (G * G) / (H + lambda)
      );

      if (gain > bestGain) {
        bestGain = gain;
        bestThreshold = threshold;
      }
    }

    return bestThreshold !== null ? { threshold: bestThreshold, gain: bestGain } : null;
  }

  predictTree(point, tree) {
    if (!tree || tree.type === 'leaf') {
      return tree ? tree.weight : 0;
    }

    if (point.x <= tree.threshold) {
      return this.predictTree(point, tree.left);
    } else {
      return this.predictTree(point, tree.right);
    }
  }

  predictRaw(point, model) {
    let pred = model.basePrediction;
    for (const tree of model.trees) {
      pred += this.predictTree(point, tree);
    }
    return pred;
  }

  predict(point, model, taskType) {
    const raw = this.predictRaw(point, model);
    if (taskType === 'regression') {
      return raw;
    } else {
      return this.sigmoid(raw) >= 0.5 ? 1 : 0;
    }
  }

  calculateLoss(points, model, taskType) {
    if (taskType === 'regression') {
      const mse = points.reduce((sum, p) => {
        const pred = this.predictRaw(p, model);
        return sum + Math.pow(p.y - pred, 2);
      }, 0) / points.length;
      return mse;
    } else {
      const logLoss = points.reduce((sum, p) => {
        const raw = this.predictRaw(p, model);
        const prob = this.sigmoid(raw);
        const label = p.label || 0;
        return sum - (label * Math.log(prob + 1e-15) + (1 - label) * Math.log(1 - prob + 1e-15));
      }, 0) / points.length;
      return logLoss;
    }
  }

  updateDisplay(points, model, taskType) {
    if (!model.fitted) return;

    if (taskType === 'regression') {
      const predictions = points.map(p => this.predictRaw(p, model));
      const mse = points.reduce((sum, p, i) => sum + Math.pow(p.y - predictions[i], 2), 0) / points.length;
      const yMean = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      const ssTot = points.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
      const ssRes = points.reduce((sum, p, i) => sum + Math.pow(p.y - predictions[i], 2), 0);
      const r2 = 1 - (ssRes / ssTot);
      const mae = points.reduce((sum, p, i) => sum + Math.abs(p.y - predictions[i]), 0) / points.length;
      const rmse = Math.sqrt(mse);

      document.getElementById('xgb-mse').textContent = mse.toFixed(6);
      document.getElementById('xgb-r2').textContent = r2.toFixed(6);
      document.getElementById('xgb-mae').textContent = mae.toFixed(6);
      document.getElementById('xgb-rmse').textContent = rmse.toFixed(6);
    } else {
      let tp = 0, fp = 0, tn = 0, fn = 0;

      points.forEach(p => {
        const pred = this.predict(p, model, taskType);
        const actual = p.label || 0;

        if (actual === 1 && pred === 1) tp++;
        else if (actual === 0 && pred === 1) fp++;
        else if (actual === 0 && pred === 0) tn++;
        else if (actual === 1 && pred === 0) fn++;
      });

      const accuracy = (tp + tn) / points.length;
      const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
      const logLoss = this.calculateLoss(points, model, taskType);

      document.getElementById('xgb-accuracy').textContent = accuracy.toFixed(4);
      document.getElementById('xgb-precision').textContent = precision.toFixed(4);
      document.getElementById('xgb-recall').textContent = recall.toFixed(4);
      document.getElementById('xgb-f1').textContent = f1.toFixed(4);
      document.getElementById('xgb-logloss').textContent = logLoss.toFixed(6);
    }

    // Display current tree
    if (model.trees.length > 0) {
      document.getElementById('xgb-current-tree-iter').textContent = model.iteration;
      document.getElementById('xgb-tree-viz').style.display = 'block';
      const display = document.getElementById('xgb-tree-display');
      const lastTree = model.trees[model.trees.length - 1];
      display.innerHTML = this.renderTreeHTML(lastTree, 0);
    }
  }

  renderTreeHTML(node, depth) {
    const indent = '&nbsp;'.repeat(depth * 4);

    if (node.type === 'leaf') {
      return `${indent}├─ <strong>Leaf:</strong> weight=${node.weight.toFixed(4)}<br>`;
    } else {
      let html = `${indent}├─ <strong>Split:</strong> x ≤ ${node.threshold.toFixed(4)} (gain=${node.gain.toFixed(4)})<br>`;
      html += this.renderTreeHTML(node.left, depth + 1);
      html += this.renderTreeHTML(node.right, depth + 1);
      return html;
    }
  }
}

// ============================================================================
// NEURAL NETWORK (MLP)
// ============================================================================

class NeuralNetwork {
  constructor() {
    this.reset();
  }

  reset() {
    this.autoRunning = false;
    this.lossHistory = [];
    this.weights = [];
    this.biases = [];
  }

  startAutoRun() {
    this.autoRunning = true;
  }

  stopAutoRun() {
    this.autoRunning = false;
  }

  initialize(points, taskType, hiddenLayerSizes, activationName) {
    if (points.length < 2) throw new Error('Add at least 2 points first!');

    // hiddenLayerSizes is already an array of integers from app.js
    const hiddenSizes = Array.isArray(hiddenLayerSizes) ? hiddenLayerSizes :
                        hiddenLayerSizes.split(',').map(s => parseInt(s.trim())).filter(n => n > 0);

    if (hiddenSizes.length === 0) throw new Error('Invalid hidden layer sizes!');

    // Build architecture: input(1) -> hidden layers -> output(1)
    const architecture = [1, ...hiddenSizes, 1];

    // Initialize weights and biases with Xavier initialization
    this.weights = [];
    this.biases = [];

    for (let i = 0; i < architecture.length - 1; i++) {
      const inputSize = architecture[i];
      const outputSize = architecture[i + 1];

      // Xavier initialization: scale = sqrt(2 / (input_size + output_size))
      const scale = Math.sqrt(2 / (inputSize + outputSize));

      const W = [];
      for (let j = 0; j < outputSize; j++) {
        const row = [];
        for (let k = 0; k < inputSize; k++) {
          row.push((Math.random() * 2 - 1) * scale);
        }
        W.push(row);
      }
      this.weights.push(W);

      // Initialize biases to zero
      const b = new Array(outputSize).fill(0);
      this.biases.push(b);
    }

    this.lossHistory = [];
    this.activationName = activationName;

    // Count parameters
    let totalParams = 0;
    for (let i = 0; i < this.weights.length; i++) {
      totalParams += this.weights[i].length * this.weights[i][0].length; // weights
      totalParams += this.biases[i].length; // biases
    }

    // Create initial explanation
    const explanation = this.createAlgorithmExplanation(taskType, architecture, activationName, totalParams);

    return {
      fitted: true,
      weights: this.weights,
      biases: this.biases,
      architecture: architecture,
      activationName: activationName,
      taskType: taskType,
      epoch: 0,
      lossHistory: [],
      initialExplanation: explanation,
      totalParams: totalParams
    };
  }

  createAlgorithmExplanation(taskType, architecture, activationName, totalParams) {
    let html = `<strong>Feedforward Neural Network</strong><br><br>`;

    html += `<strong>Architecture:</strong> ${architecture.join(' → ')} (${totalParams} parameters)<br>`;
    html += `Activation: ${activationName}, Task: ${taskType}<br><br>`;

    html += `<strong>Algorithm Steps:</strong><br>`;
    html += `<strong>Step 1:</strong> Initialize weights and biases<br>`;
    const initFormula = `W^{(l)} \\sim \\mathcal{N}(0, \\frac{2}{n_{in} + n_{out}})`;
    html += `&nbsp;&nbsp;<span class="formula-inline" data-formula="${initFormula}"></span> (Xavier), <span class="formula-inline" data-formula="b^{(l)} = 0"></span><br>`;

    html += `<strong>Step 2:</strong> Forward propagation<br>`;
    html += `&nbsp;&nbsp;For each layer l = 1 to L:<br>`;
    const forwardZ = `z^{(l)} = W^{(l)}a^{(l-1)} + b^{(l)}`;
    const forwardA = `a^{(l)} = \\sigma(z^{(l)})`;
    html += `&nbsp;&nbsp;&nbsp;&nbsp;<span class="formula-inline" data-formula="${forwardZ}"></span><br>`;
    html += `&nbsp;&nbsp;&nbsp;&nbsp;<span class="formula-inline" data-formula="${forwardA}"></span> where σ = ${activationName}<br>`;

    html += `<strong>Step 3:</strong> Compute loss with regularization<br>`;
    if (taskType === 'regression') {
      const lossFormula = `L = \\frac{1}{n}\\sum_{i=1}^{n}(y_i - \\hat{y}_i)^2 + \\frac{\\lambda}{2}\\sum ||W||^2`;
      html += `&nbsp;&nbsp;<span class="formula-inline" data-formula="${lossFormula}"></span> (MSE + L2)<br>`;
    } else {
      const lossFormula = `L = -\\frac{1}{n}\\sum [y_i\\log(\\hat{y}_i) + (1-y_i)\\log(1-\\hat{y}_i)] + \\frac{\\lambda}{2}\\sum ||W||^2`;
      html += `&nbsp;&nbsp;<span class="formula-inline" data-formula="${lossFormula}"></span> (BCE + L2)<br>`;
    }

    html += `<strong>Step 4:</strong> Apply dropout to hidden layers (if enabled)<br>`;
    const dropoutFormula = `a^{(l)} \\leftarrow a^{(l)} \\odot \\text{mask}`;
    html += `&nbsp;&nbsp;<span class="formula-inline" data-formula="${dropoutFormula}"></span> where mask ~ Bernoulli(1-p)<br>`;

    html += `<strong>Step 5:</strong> Backward propagation (chain rule)<br>`;
    const deltaL = `\\delta^{(L)} = \\frac{\\partial L}{\\partial z^{(L)}}`;
    const deltaHidden = `\\delta^{(l)} = (W^{(l+1)})^T \\delta^{(l+1)} \\odot \\sigma'(z^{(l)})`;
    html += `&nbsp;&nbsp;<span class="formula-inline" data-formula="${deltaL}"></span> (output layer)<br>`;
    html += `&nbsp;&nbsp;<span class="formula-inline" data-formula="${deltaHidden}"></span> (hidden layers)<br>`;

    html += `<strong>Step 6:</strong> Update weights with L2 regularization<br>`;
    const updateW = `W^{(l)} \\leftarrow W^{(l)} - \\eta (\\frac{\\partial L}{\\partial W^{(l)}} + \\lambda W^{(l)})`;
    const updateB = `b^{(l)} \\leftarrow b^{(l)} - \\eta \\frac{\\partial L}{\\partial b^{(l)}}`;
    html += `&nbsp;&nbsp;<span class="formula-inline" data-formula="${updateW}"></span><br>`;
    html += `&nbsp;&nbsp;<span class="formula-inline" data-formula="${updateB}"></span><br><br>`;

    html += `<strong>Hyperparameters:</strong> η (learning rate), λ (L2 penalty), dropout rate, max epochs<br>`;
    html += `Click "Next Epoch" to train iteratively or "Auto" to train until max epochs.<br>`;

    return html;
  }

  activation(z, name) {
    switch(name) {
      case 'relu':
        return z > 0 ? z : 0;
      case 'tanh':
        return Math.tanh(z);
      case 'sigmoid':
        return 1 / (1 + Math.exp(-z));
      default:
        return z;
    }
  }

  activationDerivative(z, name) {
    switch(name) {
      case 'relu':
        return z > 0 ? 1 : 0;
      case 'tanh':
        const t = Math.tanh(z);
        return 1 - t * t;
      case 'sigmoid':
        const s = 1 / (1 + Math.exp(-z));
        return s * (1 - s);
      default:
        return 1;
    }
  }

  forward(x, model) {
    // Store activations for each layer
    const activations = [x]; // a^(0) = input
    const zValues = []; // pre-activation values

    for (let l = 0; l < model.weights.length; l++) {
      const W = model.weights[l];
      const b = model.biases[l];
      const prevA = activations[l];

      // z = W * a_prev + b
      const z = [];
      for (let i = 0; i < W.length; i++) {
        let sum = b[i];
        for (let j = 0; j < W[i].length; j++) {
          sum += W[i][j] * prevA[j];
        }
        z.push(sum);
      }
      zValues.push(z);

      // a = activation(z), but use linear for output layer in regression
      const a = [];
      const isOutputLayer = l === model.weights.length - 1;
      const activationFunc = (isOutputLayer && model.taskType === 'regression') ? 'linear' : model.activationName;

      for (let i = 0; i < z.length; i++) {
        if (activationFunc === 'linear') {
          a.push(z[i]);
        } else if (isOutputLayer && model.taskType === 'classification') {
          // Use sigmoid for output in classification
          a.push(1 / (1 + Math.exp(-z[i])));
        } else {
          a.push(this.activation(z[i], activationFunc));
        }
      }
      activations.push(a);
    }

    return { activations, zValues };
  }

  trainEpoch(points, model, taskType, learningRate, lambda = 0, dropoutRate = 0) {
    const stepDisplay = [];
    stepDisplay.push(`<strong>Epoch ${model.epoch + 1}</strong><br>`);

    let totalLoss = 0;
    const n = points.length;

    // For each training example (batch gradient descent)
    const gradW = model.weights.map(W => W.map(row => row.map(() => 0)));
    const gradB = model.biases.map(b => b.map(() => 0));

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const x = [point.x];
      const y = model.taskType === 'regression' ? point.y : (point.label || 0);

      // Forward pass with dropout
      const { activations, zValues } = this.forward(x, model);

      // Apply dropout to hidden layers (not input or output)
      const dropoutMasks = [];
      if (dropoutRate > 0) {
        for (let l = 1; l < activations.length - 1; l++) {
          const mask = activations[l].map(() => Math.random() > dropoutRate ? 1 / (1 - dropoutRate) : 0);
          dropoutMasks.push(mask);
          activations[l] = activations[l].map((a, idx) => a * mask[idx]);
        }
      }

      const yPred = activations[activations.length - 1][0];

      // Compute loss
      if (model.taskType === 'regression') {
        totalLoss += Math.pow(y - yPred, 2);
      } else {
        totalLoss += -(y * Math.log(yPred + 1e-10) + (1 - y) * Math.log(1 - yPred + 1e-10));
      }

      // Backward pass
      const deltas = [];

      // Output layer delta
      let delta;
      if (model.taskType === 'regression') {
        delta = [yPred - y]; // derivative of MSE with linear activation
      } else {
        delta = [yPred - y]; // derivative of BCE with sigmoid activation
      }
      deltas.unshift(delta);

      // Hidden layer deltas (backpropagate)
      for (let l = model.weights.length - 2; l >= 0; l--) {
        const newDelta = [];
        const W = model.weights[l + 1];
        const z = zValues[l];

        for (let j = 0; j < z.length; j++) {
          let sum = 0;
          for (let k = 0; k < W.length; k++) {
            sum += W[k][j] * deltas[0][k];
          }
          const derivative = this.activationDerivative(z[j], model.activationName);
          newDelta.push(sum * derivative);
        }
        deltas.unshift(newDelta);
      }

      // Accumulate gradients
      for (let l = 0; l < model.weights.length; l++) {
        const delta = deltas[l];
        const prevA = activations[l];

        for (let i = 0; i < gradW[l].length; i++) {
          for (let j = 0; j < gradW[l][i].length; j++) {
            gradW[l][i][j] += delta[i] * prevA[j] / n;
          }
          gradB[l][i] += delta[i] / n;
        }
      }
    }

    // Update weights and biases with L2 regularization
    for (let l = 0; l < model.weights.length; l++) {
      for (let i = 0; i < model.weights[l].length; i++) {
        for (let j = 0; j < model.weights[l][i].length; j++) {
          // L2 regularization: add lambda * weight to gradient
          const l2Penalty = lambda * model.weights[l][i][j];
          model.weights[l][i][j] -= learningRate * (gradW[l][i][j] + l2Penalty);
        }
        model.biases[l][i] -= learningRate * gradB[l][i];
      }
    }

    // Calculate average loss with L2 penalty
    let l2Loss = 0;
    if (lambda > 0) {
      for (let l = 0; l < model.weights.length; l++) {
        for (let i = 0; i < model.weights[l].length; i++) {
          for (let j = 0; j < model.weights[l][i].length; j++) {
            l2Loss += model.weights[l][i][j] * model.weights[l][i][j];
          }
        }
      }
      l2Loss = 0.5 * lambda * l2Loss;
    }

    const avgLoss = (totalLoss / n) + l2Loss;
    model.lossHistory = model.lossHistory || [];
    model.lossHistory.push(avgLoss);
    this.lossHistory = model.lossHistory;

    model.epoch++;

    // Create concise display
    const avgGradNorm = Math.sqrt(
      gradW.reduce((sum, W) => sum + W.reduce((s, row) => s + row.reduce((ss, v) => ss + v*v, 0), 0), 0) / model.totalParams
    );

    stepDisplay.push(`Avg gradient norm: ${avgGradNorm.toFixed(6)}<br>`);
    stepDisplay.push(`Loss: ${avgLoss.toFixed(6)}`);
    if (model.lossHistory.length > 1) {
      const prevLoss = model.lossHistory[model.lossHistory.length - 2];
      const improvement = prevLoss - avgLoss;
      stepDisplay.push(` (↓ ${improvement.toFixed(6)})`);
    }
    stepDisplay.push(`<br>`);

    model.currentStepDisplay = stepDisplay.join('');

    return model;
  }

  predict(point, model, taskType = null) {
    const x = [point.x];
    const { activations } = this.forward(x, model);
    const output = activations[activations.length - 1][0];

    const task = taskType || model.taskType;
    if (task === 'regression') {
      return output;
    } else {
      return output >= 0.5 ? 1 : 0;
    }
  }

  predictRaw(point, model) {
    // For regression, return raw output (same as predict)
    const x = [point.x];
    const { activations } = this.forward(x, model);
    return activations[activations.length - 1][0];
  }

  predictProba(point, model) {
    const x = [point.x];
    const { activations } = this.forward(x, model);
    return activations[activations.length - 1][0];
  }

  updateDisplay(points, model, taskType) {
    if (!model.fitted || model.epoch === 0) return;

    if (taskType === 'regression') {
      const predictions = points.map(p => this.predict(p, model));
      const mse = points.reduce((sum, p, i) => sum + Math.pow(p.y - predictions[i], 2), 0) / points.length;
      const yMean = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      const ssTot = points.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
      const ssRes = points.reduce((sum, p, i) => sum + Math.pow(p.y - predictions[i], 2), 0);
      const r2 = 1 - (ssRes / ssTot);
      const mae = points.reduce((sum, p, i) => sum + Math.abs(p.y - predictions[i]), 0) / points.length;

      document.getElementById('nn-mse').textContent = mse.toFixed(6);
      document.getElementById('nn-r2').textContent = r2.toFixed(6);
      document.getElementById('nn-mae').textContent = mae.toFixed(6);
    } else {
      let tp = 0, fp = 0, tn = 0, fn = 0;
      let totalLogLoss = 0;

      points.forEach(p => {
        const pred = this.predict(p, model);
        const proba = this.predictProba(p, model);
        const actual = p.label || 0;

        if (actual === 1 && pred === 1) tp++;
        else if (actual === 0 && pred === 1) fp++;
        else if (actual === 0 && pred === 0) tn++;
        else if (actual === 1 && pred === 0) fn++;

        totalLogLoss += -(actual * Math.log(proba + 1e-10) + (1 - actual) * Math.log(1 - proba + 1e-10));
      });

      const accuracy = (tp + tn) / points.length;
      const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
      const logLoss = totalLogLoss / points.length;

      document.getElementById('nn-accuracy').textContent = accuracy.toFixed(4);
      document.getElementById('nn-precision').textContent = precision.toFixed(4);
      document.getElementById('nn-recall').textContent = recall.toFixed(4);
      document.getElementById('nn-f1').textContent = f1.toFixed(4);
      document.getElementById('nn-logloss').textContent = logLoss.toFixed(6);
    }
  }
}

// ============================================================================
// RECOMMENDATION SYSTEMS
// ============================================================================

class RecommendationSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.ratingsMatrix = this.getDefaultRatings();
    this.userNames = ['User 1', 'User 2', 'User 3', 'User 4', 'User 5'];
    this.movieNames = ['Movie 1', 'Movie 2', 'Movie 3'];
  }

  getDefaultRatings() {
    return [
      [5, 3, 0],
      [4, 0, 0],
      [1, 1, 0],
      [1, 0, 5],
      [0, 1, 5]
    ];
  }

  getRatingsFromTable() {
    const table = document.getElementById('recsys-ratings-table');
    const rows = table.querySelectorAll('tbody tr');
    const ratings = [];
    const userNames = [];
    const movieNames = [];

    // Get movie names from header
    const headerCells = table.querySelectorAll('thead th');
    for (let i = 1; i < headerCells.length; i++) {
      movieNames.push(headerCells[i].textContent.trim());
    }

    // Get user names and ratings
    rows.forEach(row => {
      const userNameCell = row.querySelector('th');
      userNames.push(userNameCell.textContent.trim());

      const cells = row.querySelectorAll('td');
      const userRatings = [];
      cells.forEach(cell => {
        const val = parseFloat(cell.textContent.trim()) || 0;
        userRatings.push(Math.max(0, Math.min(5, val))); // Clamp to 0-5
      });
      ratings.push(userRatings);
    });

    this.ratingsMatrix = ratings;
    this.userNames = userNames;
    this.movieNames = movieNames;
    return { ratings, userNames, movieNames };
  }

  addUserRow() {
    const table = document.getElementById('recsys-ratings-table');
    const tbody = table.querySelector('tbody');
    const numMovies = this.movieNames.length;
    const newUserNum = this.userNames.length + 1;

    const row = document.createElement('tr');
    const th = document.createElement('th');
    th.contentEditable = true;
    th.className = 'user-name';
    th.textContent = `User ${newUserNum}`;
    row.appendChild(th);

    for (let i = 0; i < numMovies; i++) {
      const td = document.createElement('td');
      td.contentEditable = true;
      td.className = 'rating-cell';
      td.textContent = '0';
      row.appendChild(td);
    }
    tbody.appendChild(row);

    this.userNames.push(`User ${newUserNum}`);
    this.ratingsMatrix.push(new Array(numMovies).fill(0));
  }

  addMovieColumn() {
    const table = document.getElementById('recsys-ratings-table');
    const numUsers = this.userNames.length;
    const newMovieNum = this.movieNames.length + 1;

    // Add to header
    const headerRow = table.querySelector('thead tr');
    const th = document.createElement('th');
    th.contentEditable = true;
    th.className = 'movie-name';
    th.textContent = `Movie ${newMovieNum}`;
    headerRow.appendChild(th);

    // Add to each user row
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const td = document.createElement('td');
      td.contentEditable = true;
      td.className = 'rating-cell';
      td.textContent = '0';
      row.appendChild(td);
    });

    this.movieNames.push(`Movie ${newMovieNum}`);
    this.ratingsMatrix.forEach(userRatings => userRatings.push(0));
  }

  resetToDefault() {
    const defaultRatings = this.getDefaultRatings();
    const defaultUserNames = ['User 1', 'User 2', 'User 3', 'User 4', 'User 5'];
    const defaultMovieNames = ['Movie 1', 'Movie 2', 'Movie 3'];

    this.ratingsMatrix = defaultRatings;
    this.userNames = defaultUserNames;
    this.movieNames = defaultMovieNames;

    this.renderTable();
  }

  generateRandomRatings() {
    const numUsers = this.userNames.length;
    const numMovies = this.movieNames.length;

    for (let i = 0; i < numUsers; i++) {
      for (let j = 0; j < numMovies; j++) {
        // 30% chance of no rating (0), otherwise 1-5
        this.ratingsMatrix[i][j] = Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 5) + 1;
      }
    }

    this.renderTable();
  }

  renderTable() {
    const table = document.getElementById('recsys-ratings-table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    // Clear existing content
    thead.innerHTML = '';
    tbody.innerHTML = '';

    // Create header
    const headerRow = document.createElement('tr');
    const emptyTh = document.createElement('th');
    headerRow.appendChild(emptyTh);

    this.movieNames.forEach(name => {
      const th = document.createElement('th');
      th.contentEditable = true;
      th.className = 'movie-name';
      th.textContent = name;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Create body rows
    this.ratingsMatrix.forEach((userRatings, i) => {
      const row = document.createElement('tr');
      const th = document.createElement('th');
      th.contentEditable = true;
      th.className = 'user-name';
      th.textContent = this.userNames[i];
      row.appendChild(th);

      userRatings.forEach(rating => {
        const td = document.createElement('td');
        td.contentEditable = true;
        td.className = 'rating-cell';
        td.textContent = rating.toString();
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
  }
}

class ContentBasedFiltering {
  constructor(recSys) {
    this.recSys = recSys;
    this.syncMovieLabels(); // Sync movie names with features table on init
  }

  // Sync movie names from ratings table to features table
  syncMovieLabels() {
    const { movieNames } = this.recSys.getRatingsFromTable();
    const featureRows = document.querySelectorAll('#movie-features-body tr');

    featureRows.forEach((row, idx) => {
      if (idx < movieNames.length) {
        const label = row.querySelector('.movie-label');
        if (label) {
          label.textContent = movieNames[idx];
        }
      }
    });
  }

  // Get movie features from the features table
  getMovieFeaturesFromTable() {
    const table = document.getElementById('movie-features-table');
    const headerRow = table.querySelector('thead tr');
    const genreNames = Array.from(headerRow.querySelectorAll('.genre-name')).map(th => th.textContent.trim());

    const rows = table.querySelectorAll('#movie-features-body tr');
    const movieFeatures = [];
    const movieNames = [];

    rows.forEach(row => {
      const label = row.querySelector('.movie-label');
      if (label) {
        movieNames.push(label.textContent.trim());
      }

      const featureCells = row.querySelectorAll('.feature-cell');
      const features = Array.from(featureCells).map(cell => parseFloat(cell.textContent.trim()) || 0);
      movieFeatures.push(features);
    });

    return { movieFeatures, movieNames, genreNames };
  }

  addFeature() {
    const headerRow = document.getElementById('movie-features-header').querySelector('tr');
    const newTh = document.createElement('th');
    newTh.contentEditable = 'true';
    newTh.className = 'genre-name';
    newTh.textContent = `Feature ${headerRow.querySelectorAll('.genre-name').length + 1}`;
    headerRow.appendChild(newTh);

    // Add a cell to each movie row
    const rows = document.querySelectorAll('#movie-features-body tr');
    rows.forEach(row => {
      const newTd = document.createElement('td');
      newTd.contentEditable = 'true';
      newTd.className = 'feature-cell';
      newTd.textContent = '0';
      row.appendChild(newTd);
    });
  }

  resetFeatures() {
    // Reset to default 3 movies × 5 genres
    const tbody = document.getElementById('movie-features-body');
    const header = document.getElementById('movie-features-header').querySelector('tr');

    // Reset header
    header.innerHTML = `
      <th></th>
      <th contenteditable="true" class="genre-name">Action</th>
      <th contenteditable="true" class="genre-name">Romance</th>
      <th contenteditable="true" class="genre-name">Comedy</th>
      <th contenteditable="true" class="genre-name">Drama</th>
      <th contenteditable="true" class="genre-name">Sci-Fi</th>
    `;

    // Reset body - sync with current movie count
    const { movieNames } = this.recSys.getRatingsFromTable();
    const defaultFeatures = [
      [1, 0, 0, 1, 0], // Movie 1: Action, Drama
      [0, 1, 1, 0, 0], // Movie 2: Romance, Comedy
      [1, 0, 0, 0, 1]  // Movie 3: Action, Sci-Fi
    ];

    tbody.innerHTML = '';
    movieNames.forEach((name, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.movieIdx = idx;

      const th = document.createElement('th');
      th.className = 'movie-label';
      th.textContent = name;
      tr.appendChild(th);

      const features = defaultFeatures[idx % defaultFeatures.length];
      features.forEach(val => {
        const td = document.createElement('td');
        td.contentEditable = 'true';
        td.className = 'feature-cell';
        td.textContent = val;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  randomizeFeatures() {
    const rows = document.querySelectorAll('#movie-features-body tr');
    rows.forEach(row => {
      const featureCells = row.querySelectorAll('.feature-cell');
      featureCells.forEach(cell => {
        cell.textContent = Math.random() > 0.5 ? '1' : '0';
      });
    });
  }

  computeRecommendations() {
    this.syncMovieLabels(); // Ensure movie names are synced

    const { ratings, userNames, movieNames } = this.recSys.getRatingsFromTable();
    const { movieFeatures, genreNames } = this.getMovieFeaturesFromTable();
    const numUsers = ratings.length;
    const numMovies = ratings[0].length;
    const numFeatures = genreNames.length;

    // Validate dimensions
    if (movieFeatures.length !== numMovies) {
      throw new Error(`Movie features table has ${movieFeatures.length} movies, but ratings table has ${numMovies} movies. They must match!`);
    }

    const similarityType = document.getElementById('cb-similarity-select').value;

    // Display algorithm equations
    this.displayEquations(similarityType, genreNames);

    // ============================================
    // STEP 1: Show Ratings Matrix & Movie Content Features
    // ============================================
    let step1Tex = `\\text{Ratings Matrix } R \\text{ (${numUsers} users × ${numMovies} movies)}:\\\\\\\\`;
    step1Tex += `R = \\begin{array}{c|`;
    for (let j = 0; j < numMovies; j++) step1Tex += 'c';
    step1Tex += `}`;
    step1Tex += ` & ${movieNames.join(' & ')} \\\\ \\hline `;

    for (let i = 0; i < numUsers; i++) {
      const row = [];
      for (let j = 0; j < numMovies; j++) {
        row.push(ratings[i][j].toFixed(0));
      }
      step1Tex += `${userNames[i]} & ${row.join(' & ')}`;
      if (i < numUsers - 1) step1Tex += ' \\\\ ';
    }
    step1Tex += `\\end{array}\\\\\\\\`;

    // Display movie content features
    step1Tex += `\\text{Movie Content Features } F \\text{ (${numMovies} movies × ${numFeatures} features)}:\\\\\\\\`;
    step1Tex += `F = \\begin{array}{c|`;
    for (let k = 0; k < numFeatures; k++) step1Tex += 'c';
    step1Tex += `}`;
    step1Tex += ` & ${genreNames.join(' & ')} \\\\ \\hline `;

    movieNames.forEach((name, idx) => {
      step1Tex += `${name} & ${movieFeatures[idx].map(v => v.toFixed(1)).join(' & ')}`;
      if (idx < numMovies - 1) step1Tex += ' \\\\ ';
    });
    step1Tex += `\\end{array}\\\\\\\\`;

    step1Tex += `\\text{Each movie } j \\text{ is represented by feature vector:}\\\\`;
    movieNames.forEach((name, idx) => {
      step1Tex += `\\mathbf{f}_{${idx+1}} \\text{ (${name})} = [${movieFeatures[idx].map(v => v.toFixed(1)).join(', ')}]^T\\\\`;
    });

    AppUtils.kRender(document.getElementById('cb-step1-tex'), step1Tex, true);

    // ============================================
    // STEP 2: Build User Profiles from Rated Movies' Features
    // ============================================
    const userProfiles = [];
    let step2Tex = `\\text{Build user profile as weighted average of rated movies' content features:}\\\\\\\\`;

    for (let i = 0; i < numUsers; i++) {
      const userRatings = ratings[i];
      let userProfile = new Array(numFeatures).fill(0);
      let totalWeight = 0;

      // Collect rated movies
      const ratedIndices = [];
      for (let j = 0; j < numMovies; j++) {
        if (userRatings[j] > 0) {
          ratedIndices.push(j);
          totalWeight += userRatings[j];
        }
      }

      // Build weighted profile from movie FEATURES (not ratings!)
      for (let j of ratedIndices) {
        const weight = userRatings[j];
        for (let k = 0; k < numFeatures; k++) {
          userProfile[k] += weight * movieFeatures[j][k];
        }
      }

      // Normalize
      if (totalWeight > 0) {
        userProfile = userProfile.map(val => val / totalWeight);
      }

      userProfiles.push(userProfile);

      // Show computation for this user
      step2Tex += `\\mathbf{u}_{${i+1}} \\text{ (${userNames[i]})}:\\\\`;
      if (ratedIndices.length > 0) {
        const ratedMoviesStr = ratedIndices.map(j => `${movieNames[j]}(${userRatings[j]})`).join(', ');
        step2Tex += `\\text{Rated: } ${ratedMoviesStr}\\\\`;

        const weightedStr = ratedIndices.map(j => `${userRatings[j]} \\cdot \\mathbf{f}_{${j+1}}`).join(' + ');
        step2Tex += `\\mathbf{u}_{${i+1}} = \\frac{${weightedStr}}{${totalWeight.toFixed(0)}}\\\\`;

        // Show the actual calculation with feature vectors
        step2Tex += `= \\frac{`;
        const terms = [];
        for (let j of ratedIndices) {
          terms.push(`${userRatings[j]} \\cdot [${movieFeatures[j].map(v => v.toFixed(1)).join(', ')}]`);
        }
        step2Tex += terms.join(' + ');
        step2Tex += `}{${totalWeight.toFixed(0)}}\\\\`;

        step2Tex += `= [${userProfile.map(v => v.toFixed(2)).join(', ')}]\\\\`;
        step2Tex += `\\text{Interpretation: User } ${userNames[i]} \\text{ prefers [${genreNames.join(', ')}] with weights [${userProfile.map(v => v.toFixed(2)).join(', ')}]}\\\\\\\\`;
      } else {
        step2Tex += `\\text{No rated movies - profile is zero vector}\\\\\\\\`;
      }
    }

    AppUtils.kRender(document.getElementById('cb-step2-tex'), step2Tex, true);

    // ============================================
    // STEP 3: Compute Item-to-Item Similarities Based on Content Features
    // ============================================
    const itemSimilarityMatrix = []; // [numMovies][numMovies] - similarity between movies
    let step3Tex = `\\text{Compute similarity between each pair of movies based on their features:}\\\\\\\\`;

    for (let i = 0; i < numMovies; i++) {
      const similarities = [];
      step3Tex += `\\text{Movie } ${i+1} \\text{ (${movieNames[i]}) similarities:}\\\\`;

      for (let j = 0; j < numMovies; j++) {
        let score;

        if (i === j) {
          score = 1.0; // Perfect similarity with itself
          step3Tex += `s(${i+1},${j+1}) = 1.00 \\text{ (self)}\\quad`;
        } else {
          if (similarityType === 'cosine') {
            const dotProduct = movieFeatures[i].reduce((sum, val, k) => sum + val * movieFeatures[j][k], 0);
            const normI = Math.sqrt(movieFeatures[i].reduce((sum, val) => sum + val * val, 0));
            const normJ = Math.sqrt(movieFeatures[j].reduce((sum, val) => sum + val * val, 0));
            score = (normI === 0 || normJ === 0) ? 0 : dotProduct / (normI * normJ);

            step3Tex += `s(${i+1},${j+1}) = ${score.toFixed(2)}\\quad`;
          } else {
            const squaredDiffs = movieFeatures[i].map((val, k) => Math.pow(val - movieFeatures[j][k], 2));
            const distance = Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0));
            // Convert distance to similarity: s = 1/(1+d)
            score = 1.0 / (1.0 + distance);

            step3Tex += `d(${i+1},${j+1}) = ${distance.toFixed(2)}, s(${i+1},${j+1}) = ${score.toFixed(2)}\\quad`;
          }
        }

        similarities.push(score);
      }
      itemSimilarityMatrix.push(similarities);
      step3Tex += `\\\\`;
    }

    AppUtils.kRender(document.getElementById('cb-step3-tex'), step3Tex, true);

    // ============================================
    // STEP 4: Display Rating Prediction Formula
    // ============================================
    let step4Tex = `\\text{Convert similarity scores to predicted ratings using weighted average:}\\\\\\\\`;

    step4Tex += `\\text{Standard Item-Based Collaborative Filtering Formula:}\\\\\\\\`;
    step4Tex += `\\hat{r}_{ui} = r_{u,\\text{avg}} + \\frac{\\sum_{j \\in \\text{rated}} s(i,j) \\cdot (r_{uj} - r_{u,\\text{avg}})}{\\sum_{j \\in \\text{rated}} |s(i,j)|}\\\\\\\\`;
    step4Tex += `\\text{where:}\\\\`;
    step4Tex += `\\hat{r}_{ui} = \\text{predicted rating for user } u \\text{ on item } i\\\\`;
    step4Tex += `r_{u,\\text{avg}} = \\text{average rating of user } u\\\\`;
    step4Tex += `s(i,j) = \\text{similarity between target item } i \\text{ and rated item } j\\\\`;
    step4Tex += `r_{uj} = \\text{user's actual rating for item } j\\\\`;
    step4Tex += `\\text{Sum over all items } j \\text{ that user } u \\text{ has rated}\\\\\\\\`;

    if (similarityType === 'cosine') {
      step4Tex += `\\text{Using cosine similarity } s(i,j) \\in [-1, 1]\\\\`;
      step4Tex += `\\text{Positive } s(i,j) \\text{ means items are similar}\\\\`;
      step4Tex += `\\text{Negative } s(i,j) \\text{ means items are dissimilar}`;
    } else {
      step4Tex += `\\text{Using Euclidean distance } d(i,j) \\in [0, \\infty)\\\\`;
      step4Tex += `\\text{Convert to similarity: } s(i,j) = \\frac{1}{1 + d(i,j)}\\\\`;
      step4Tex += `\\text{Smaller distance yields higher similarity}`;
    }

    AppUtils.kRender(document.getElementById('cb-step4-tex'), step4Tex, true);

    // ============================================
    // STEP 5: Display Predictions Table
    // ============================================
    this.displayPredictionsTable(ratings, itemSimilarityMatrix, userNames, movieNames, similarityType);

    document.getElementById('cb-equations').style.display = 'block';
    document.getElementById('cb-results').style.display = 'block';
  }

  displayEquations(similarityType, genreNames) {
    // Item Features equation
    const featuresEq = `\\text{Each movie is represented by explicit content features (genres):}\\\\\\mathbf{f}_j = [g_1, g_2, \\ldots, g_k]\\\\\\text{where } g_i \\in \\{0, 1\\} \\text{ or } g_i \\in [0, 1] \\text{ (weighted)}\\\\\\text{Examples: Action, Romance, Comedy, Drama, Sci-Fi}`;
    AppUtils.kRender(document.getElementById('cb-eq-features'), featuresEq, true);

    // User Profile equation
    const profileEq = `\\text{Build user profile from FEATURES of movies they rated:}\\\\\\mathbf{u} = \\frac{\\sum_{j \\in \\text{rated}} r_{u,j} \\cdot \\mathbf{f}_j}{\\sum_{j \\in \\text{rated}} r_{u,j}}\\\\\\text{where } r_{u,j} \\text{ is the user's rating for movie } j\\\\\\text{and } \\mathbf{f}_j \\text{ is movie } j\\text{'s feature vector}\\\\\\text{This creates a profile showing what genres the user likes}`;
    AppUtils.kRender(document.getElementById('cb-eq-profile'), profileEq, true);

    // Similarity equation
    let simEq;
    if (similarityType === 'cosine') {
      simEq = `\\text{Cosine Similarity between user profile and movie features:}\\\\\\\\\\text{sim}(\\mathbf{u}, \\mathbf{f}_j) = \\cos(\\theta) = \\frac{\\mathbf{u} \\cdot \\mathbf{f}_j}{\\|\\mathbf{u}\\| \\|\\mathbf{f}_j\\|}\\\\\\\\= \\frac{\\sum_{k=1}^{n} u_k \\times f_{j,k}}{\\sqrt{\\sum_{k=1}^{n} u_k^2} \\times \\sqrt{\\sum_{k=1}^{n} f_{j,k}^2}}\\\\\\\\\\text{Range: } [-1, 1]\\\\\\text{1 = perfectly similar, 0 = no correlation, -1 = opposite}`;
    } else {
      simEq = `\\text{Euclidean Distance between user profile and movie features:}\\\\\\\\d(\\mathbf{u}, \\mathbf{f}_j) = \\|\\mathbf{u} - \\mathbf{f}_j\\| = \\sqrt{\\sum_{k=1}^{n} (u_k - f_{j,k})^2}\\\\\\\\\\text{Range: } [0, \\infty)\\\\\\text{0 = identical, larger values = more different}\\\\\\text{Lower distance = better recommendation}`;
    }
    AppUtils.kRender(document.getElementById('cb-eq-similarity'), simEq, true);
  }

  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
  }

  euclideanDistance(a, b) {
    let sumSquares = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sumSquares += diff * diff;
    }
    return Math.sqrt(sumSquares);
  }

  displayPredictionsTable(ratings, itemSimilarityMatrix, userNames, movieNames, similarityType) {
    const numUsers = ratings.length;
    const numMovies = ratings[0].length;

    const table = document.getElementById('cb-predictions-table');
    table.innerHTML = '';

    // Header
    let headerRow = document.createElement('tr');
    let th = document.createElement('th');
    th.textContent = 'User / Movie';
    headerRow.appendChild(th);

    movieNames.forEach(name => {
      th = document.createElement('th');
      th.textContent = name;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Body - show predicted ratings using item-based collaborative filtering formula
    for (let userIdx = 0; userIdx < numUsers; userIdx++) {
      const tr = document.createElement('tr');

      const nameTh = document.createElement('th');
      nameTh.textContent = userNames[userIdx];
      tr.appendChild(nameTh);

      // Calculate user's average rating (excluding unrated items)
      const userRatings = ratings[userIdx].filter(r => r > 0);
      const userAvg = userRatings.length > 0
        ? userRatings.reduce((a, b) => a + b, 0) / userRatings.length
        : 3.0; // Default to neutral if no ratings

      for (let targetItem = 0; targetItem < numMovies; targetItem++) {
        const td = document.createElement('td');

        const actualRating = ratings[userIdx][targetItem];

        if (actualRating > 0) {
          // Already rated - show actual rating
          td.innerHTML = `<strong>${actualRating.toFixed(1)}</strong>`;
          td.style.backgroundColor = '#e0f2fe';
        } else {
          // Not rated - predict using item-based collaborative filtering formula:
          // r_hat = r_avg + sum(s(i,j) * (r_j - r_avg)) / sum(|s(i,j)|)

          let numerator = 0;
          let denominator = 0;
          let countRatedItems = 0;

          // Sum over all items j that this user has rated
          for (let ratedItem = 0; ratedItem < numMovies; ratedItem++) {
            if (ratings[userIdx][ratedItem] > 0) {
              const similarity = itemSimilarityMatrix[targetItem][ratedItem];
              const ratingDeviation = ratings[userIdx][ratedItem] - userAvg;

              numerator += similarity * ratingDeviation;
              denominator += Math.abs(similarity);
              countRatedItems++;
            }
          }

          let predictedRating;
          if (countRatedItems > 0 && denominator > 0) {
            // Apply the formula
            predictedRating = userAvg + (numerator / denominator);
          } else {
            // No rated items - use user average (or neutral rating)
            predictedRating = userAvg;
          }

          // Clamp to valid rating range [1, 5]
          predictedRating = Math.max(1, Math.min(5, predictedRating));

          td.textContent = predictedRating.toFixed(2);
          td.style.color = '#22c55e';
          td.style.fontWeight = 'bold';
          td.title = `Formula: ${userAvg.toFixed(2)} + ${numerator.toFixed(3)} / ${denominator.toFixed(3)} = ${predictedRating.toFixed(2)}`;
        }

        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
  }
}

class CollaborativeFiltering {
  constructor(recSys) {
    this.recSys = recSys;
    this.reset();
  }

  reset() {
    this.initialized = false;
    this.epoch = 0;
    this.P = null; // User features
    this.Q = null; // Item features
    this.lossHistory = [];
    this.autoRunning = false;
    this.autoTimeoutId = null;
  }

  initialize() {
    const { ratings } = this.recSys.getRatingsFromTable();
    const k = parseInt(document.getElementById('cf-k').value);

    const numUsers = ratings.length;
    const numMovies = ratings[0].length;

    // Initialize P (numUsers x k) and Q (numMovies x k) with small random values
    this.P = [];
    this.Q = [];

    for (let i = 0; i < numUsers; i++) {
      const row = [];
      for (let j = 0; j < k; j++) {
        row.push(Math.random() * 0.1);
      }
      this.P.push(row);
    }

    for (let i = 0; i < numMovies; i++) {
      const row = [];
      for (let j = 0; j < k; j++) {
        row.push(Math.random() * 0.1);
      }
      this.Q.push(row);
    }

    this.initialized = true;
    this.epoch = 0;
    this.lossHistory = [];
    this.stopAutoRun();

    document.getElementById('next-epoch-cf').disabled = false;
    document.getElementById('cf-epoch').textContent = '0';
    document.getElementById('cf-loss').textContent = '—';

    this.displaySteps();
    this.updateCanvas();

    return { P: this.P, Q: this.Q };
  }

  trainEpoch() {
    if (!this.initialized) throw new Error('Initialize first!');

    const { ratings } = this.recSys.getRatingsFromTable();
    const lr = parseFloat(document.getElementById('cf-lr').value);
    const lambda = parseFloat(document.getElementById('cf-lambda').value);
    const k = this.P[0].length;
    const numUsers = ratings.length;
    const numMovies = ratings[0].length;

    // Get all rated entries
    const ratedEntries = [];
    for (let i = 0; i < numUsers; i++) {
      for (let j = 0; j < numMovies; j++) {
        if (ratings[i][j] > 0) {
          ratedEntries.push({ i, j, rating: ratings[i][j] });
        }
      }
    }

    // Shuffle for SGD
    for (let idx = ratedEntries.length - 1; idx > 0; idx--) {
      const swapIdx = Math.floor(Math.random() * (idx + 1));
      [ratedEntries[idx], ratedEntries[swapIdx]] = [ratedEntries[swapIdx], ratedEntries[idx]];
    }

    // SGD updates
    ratedEntries.forEach(entry => {
      const { i, j, rating } = entry;

      // Compute prediction
      let pred = 0;
      for (let f = 0; f < k; f++) {
        pred += this.P[i][f] * this.Q[j][f];
      }

      // Compute error
      const error = rating - pred;

      // Update P[i] and Q[j]
      for (let f = 0; f < k; f++) {
        const pOld = this.P[i][f];
        const qOld = this.Q[j][f];

        this.P[i][f] += lr * (2 * error * qOld - 2 * lambda * pOld);
        this.Q[j][f] += lr * (2 * error * pOld - 2 * lambda * qOld);
      }
    });

    // Compute loss
    let totalLoss = 0;
    let count = 0;
    for (let i = 0; i < numUsers; i++) {
      for (let j = 0; j < numMovies; j++) {
        if (ratings[i][j] > 0) {
          let pred = 0;
          for (let f = 0; f < k; f++) {
            pred += this.P[i][f] * this.Q[j][f];
          }
          const error = ratings[i][j] - pred;
          totalLoss += error * error;
          count++;
        }
      }
    }

    // Add regularization to loss
    let regLoss = 0;
    for (let i = 0; i < numUsers; i++) {
      for (let f = 0; f < k; f++) {
        regLoss += lambda * this.P[i][f] * this.P[i][f];
      }
    }
    for (let j = 0; j < numMovies; j++) {
      for (let f = 0; f < k; f++) {
        regLoss += lambda * this.Q[j][f] * this.Q[j][f];
      }
    }

    const loss = totalLoss / count + regLoss;
    this.lossHistory.push(loss);
    this.epoch++;

    document.getElementById('cf-epoch').textContent = this.epoch;
    document.getElementById('cf-loss').textContent = loss.toFixed(6);

    this.displaySteps();
    this.updateCanvas();
    this.displayMatrices();
    this.displayPredictions();
    this.updateMetrics();

    return loss;
  }

  displaySteps() {
    const k = this.P[0].length;
    const lr = parseFloat(document.getElementById('cf-lr').value);
    const lambda = parseFloat(document.getElementById('cf-lambda').value);

    // Display comprehensive equations
    const initEq = `P \\in \\mathbb{R}^{n \\times k}, \\; Q \\in \\mathbb{R}^{m \\times k}\\\\\\text{Initialize with small random values: } P_{if}, Q_{jf} \\sim \\text{Uniform}(0, 0.1)\\\\\\text{where } n = \\text{users}, m = \\text{items}, k = \\text{latent factors}`;
    AppUtils.kRender(document.getElementById('cf-eq-init'), initEq, true);

    const predictEq = `\\text{Predicted rating for user } i \\text{ and item } j:\\\\\\\\\\hat{r}_{ij} = \\sum_{f=1}^{k} P_{if} \\times Q_{jf} = \\mathbf{P}_i \\cdot \\mathbf{Q}_j^T\\\\\\\\\\text{This is the dot product of user and item latent feature vectors}`;
    AppUtils.kRender(document.getElementById('cf-eq-predict'), predictEq, true);

    const errorEq = `e_{ij} = r_{ij} - \\hat{r}_{ij}\\\\\\\\\\text{where } r_{ij} \\text{ is the actual rating}\\\\\\text{and } \\hat{r}_{ij} \\text{ is our prediction}`;
    AppUtils.kRender(document.getElementById('cf-eq-error'), errorEq, true);

    const updateEq = `\\text{Gradient Descent Update (for each rated entry):}\\\\\\\\\\text{For user features:}\\\\P_{if}^{\\text{new}} = P_{if}^{\\text{old}} + \\eta \\times (2 \\times e_{ij} \\times Q_{jf} - 2 \\times \\lambda \\times P_{if}^{\\text{old}})\\\\\\\\\\text{For item features:}\\\\Q_{jf}^{\\text{new}} = Q_{jf}^{\\text{old}} + \\eta \\times (2 \\times e_{ij} \\times P_{if} - 2 \\times \\lambda \\times Q_{jf}^{\\text{old}})\\\\\\\\\\text{where } \\eta = ${lr} \\text{ (learning rate)}, \\lambda = ${lambda} \\text{ (regularization)}`;
    AppUtils.kRender(document.getElementById('cf-eq-update'), updateEq, true);

    const lossEq = `\\text{Total Loss Function:}\\\\\\\\L = \\underbrace{\\frac{1}{|R|} \\sum_{(i,j) \\in R} (r_{ij} - \\hat{r}_{ij})^2}_{\\text{Prediction Error}} + \\underbrace{\\lambda \\left(\\sum_{i,f} P_{if}^2 + \\sum_{j,f} Q_{jf}^2\\right)}_{\\text{Regularization}}\\\\\\\\\\text{where } |R| \\text{ = number of rated entries}\\\\\\text{Regularization prevents overfitting by penalizing large weights}`;
    AppUtils.kRender(document.getElementById('cf-eq-loss'), lossEq, true);

    document.getElementById('cf-equations').style.display = 'block';
  }

  displayMatrices() {
    const { userNames, movieNames } = this.recSys.getRatingsFromTable();
    const k = this.P[0].length;

    // Display P matrix
    const pTable = document.getElementById('cf-p-matrix');
    pTable.innerHTML = '';

    // Header
    let headerRow = document.createElement('tr');
    let th = document.createElement('th');
    headerRow.appendChild(th);
    for (let f = 0; f < k; f++) {
      th = document.createElement('th');
      th.textContent = `f${f + 1}`;
      headerRow.appendChild(th);
    }
    pTable.appendChild(headerRow);

    // Body
    this.P.forEach((row, i) => {
      const tr = document.createElement('tr');
      const nameTh = document.createElement('th');
      nameTh.textContent = userNames[i];
      tr.appendChild(nameTh);

      row.forEach(val => {
        const td = document.createElement('td');
        td.textContent = val.toFixed(3);
        td.style.fontSize = '11px';
        tr.appendChild(td);
      });
      pTable.appendChild(tr);
    });

    // Display Q matrix
    const qTable = document.getElementById('cf-q-matrix');
    qTable.innerHTML = '';

    // Header
    headerRow = document.createElement('tr');
    th = document.createElement('th');
    headerRow.appendChild(th);
    for (let f = 0; f < k; f++) {
      th = document.createElement('th');
      th.textContent = `f${f + 1}`;
      headerRow.appendChild(th);
    }
    qTable.appendChild(headerRow);

    // Body
    this.Q.forEach((row, j) => {
      const tr = document.createElement('tr');
      const nameTh = document.createElement('th');
      nameTh.textContent = movieNames[j];
      tr.appendChild(nameTh);

      row.forEach(val => {
        const td = document.createElement('td');
        td.textContent = val.toFixed(3);
        td.style.fontSize = '11px';
        tr.appendChild(td);
      });
      qTable.appendChild(tr);
    });

    document.getElementById('cf-matrices').style.display = 'block';
  }

  displayPredictions() {
    const { ratings, userNames, movieNames } = this.recSys.getRatingsFromTable();
    const numUsers = ratings.length;
    const numMovies = ratings[0].length;
    const k = this.P[0].length;

    const predTable = document.getElementById('cf-pred-table');
    predTable.innerHTML = '';

    // Header
    let headerRow = document.createElement('tr');
    let th = document.createElement('th');
    headerRow.appendChild(th);
    movieNames.forEach(name => {
      th = document.createElement('th');
      th.textContent = name;
      headerRow.appendChild(th);
    });
    predTable.appendChild(headerRow);

    // Body
    for (let i = 0; i < numUsers; i++) {
      const tr = document.createElement('tr');
      const nameTh = document.createElement('th');
      nameTh.textContent = userNames[i];
      tr.appendChild(nameTh);

      for (let j = 0; j < numMovies; j++) {
        let pred = 0;
        for (let f = 0; f < k; f++) {
          pred += this.P[i][f] * this.Q[j][f];
        }
        pred = Math.max(0, Math.min(5, pred)); // Clamp to 0-5

        const td = document.createElement('td');
        const actual = ratings[i][j];
        if (actual > 0) {
          td.innerHTML = `${pred.toFixed(2)}<br><small style="color:#999">(${actual})</small>`;
        } else {
          td.textContent = pred.toFixed(2);
          td.style.fontWeight = 'bold';
          td.style.color = '#22c55e';
        }
        td.style.fontSize = '11px';
        tr.appendChild(td);
      }
      predTable.appendChild(tr);
    }

    document.getElementById('cf-predictions').style.display = 'block';
  }

  updateMetrics() {
    const { ratings } = this.recSys.getRatingsFromTable();
    const numUsers = ratings.length;
    const numMovies = ratings[0].length;
    const k = this.P[0].length;

    let sumSquaredError = 0;
    let sumAbsError = 0;
    let count = 0;

    for (let i = 0; i < numUsers; i++) {
      for (let j = 0; j < numMovies; j++) {
        if (ratings[i][j] > 0) {
          let pred = 0;
          for (let f = 0; f < k; f++) {
            pred += this.P[i][f] * this.Q[j][f];
          }
          const error = ratings[i][j] - pred;
          sumSquaredError += error * error;
          sumAbsError += Math.abs(error);
          count++;
        }
      }
    }

    const rmse = Math.sqrt(sumSquaredError / count);
    const mae = sumAbsError / count;

    document.getElementById('cf-rmse').textContent = rmse.toFixed(4);
    document.getElementById('cf-mae').textContent = mae.toFixed(4);
    document.getElementById('cf-metrics').style.display = 'block';
  }

  updateCanvas() {
    this.drawLossPlot();
    this.drawHeatmap();
  }

  drawLossPlot() {
    const canvas = document.getElementById('cf-loss-plot');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (this.lossHistory.length < 2) return;

    const maxLoss = Math.max(...this.lossHistory);
    const minLoss = Math.min(...this.lossHistory);
    const range = maxLoss - minLoss || 1;

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    this.lossHistory.forEach((loss, idx) => {
      const x = (idx / (this.lossHistory.length - 1)) * (w - 60) + 30;
      const y = h - 40 - ((loss - minLoss) / range) * (h - 80);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    // Draw axes
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 20);
    ctx.lineTo(30, h - 40);
    ctx.lineTo(w - 30, h - 40);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px monospace';
    ctx.fillText('Epoch', w / 2 - 20, h - 10);
    ctx.save();
    ctx.translate(10, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Loss', -20, 0);
    ctx.restore();
  }

  drawHeatmap() {
    const canvas = document.getElementById('cf-heatmap');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (!this.initialized) return;

    const { ratings } = this.recSys.getRatingsFromTable();
    const numUsers = ratings.length;
    const numMovies = ratings[0].length;
    const k = this.P[0].length;

    const cellWidth = Math.min(60, (w - 100) / numMovies);
    const cellHeight = Math.min(60, (h - 100) / numUsers);

    // Compute all predictions
    const predictions = [];
    for (let i = 0; i < numUsers; i++) {
      const row = [];
      for (let j = 0; j < numMovies; j++) {
        let pred = 0;
        for (let f = 0; f < k; f++) {
          pred += this.P[i][f] * this.Q[j][f];
        }
        row.push(Math.max(0, Math.min(5, pred)));
      }
      predictions.push(row);
    }

    // Draw heatmap
    for (let i = 0; i < numUsers; i++) {
      for (let j = 0; j < numMovies; j++) {
        const x = 80 + j * cellWidth;
        const y = 40 + i * cellHeight;
        const pred = predictions[i][j];

        // Color based on rating (0=white, 5=blue)
        const intensity = Math.floor((pred / 5) * 255);
        ctx.fillStyle = `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
        ctx.fillRect(x, y, cellWidth - 2, cellHeight - 2);

        // Draw value
        ctx.fillStyle = '#000';
        ctx.font = '10px monospace';
        ctx.fillText(pred.toFixed(1), x + cellWidth / 2 - 12, y + cellHeight / 2 + 4);
      }
    }

    // Draw labels
    ctx.fillStyle = '#64748b';
    ctx.font = '11px monospace';
    for (let i = 0; i < numUsers; i++) {
      const y = 40 + i * cellHeight + cellHeight / 2;
      ctx.fillText(`U${i + 1}`, 50, y + 4);
    }
    for (let j = 0; j < numMovies; j++) {
      const x = 80 + j * cellWidth + cellWidth / 2;
      ctx.fillText(`M${j + 1}`, x - 12, 30);
    }
  }

  autoRun() {
    if (this.autoRunning) return;
    this.autoRunning = true;

    const maxEpochs = parseInt(document.getElementById('cf-max-epochs').value);
    const runStep = () => {
      if (!this.autoRunning || this.epoch >= maxEpochs) {
        this.stopAutoRun();
        return;
      }

      try {
        this.trainEpoch();
        this.autoTimeoutId = setTimeout(runStep, 50);
      } catch (e) {
        this.stopAutoRun();
        alert(e.message);
      }
    };

    runStep();
  }

  stopAutoRun() {
    this.autoRunning = false;
    if (this.autoTimeoutId) {
      clearTimeout(this.autoTimeoutId);
      this.autoTimeoutId = null;
    }
  }
}

// ============================================================================
// CLUSTERING
// ============================================================================

class ClusteringManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.dataPoints = [];
    this.pointNames = [];
  }

  getDataFromApp() {
    // Get points from the app's clusteringPoints array
    const points = window.App ? window.App.clusteringPoints : [];
    const pointNames = points.map((_, i) => `P${i + 1}`);

    this.dataPoints = points;
    this.pointNames = pointNames;
    return { points, pointNames };
  }
}

class KMeansClustering {
  constructor(clusteringManager) {
    this.manager = clusteringManager;
    this.reset();
  }

  reset() {
    this.initialized = false;
    this.iteration = 0;
    this.centers = [];
    this.assignments = [];
    this.inertiaHistory = [];
    this.autoRunning = false;
    this.autoTimeoutId = null;
  }

  initialize() {
    const { points, pointNames } = this.manager.getDataFromApp();
    if (points.length < 2) throw new Error('Need at least 2 points! Click on canvas to add.');

    const k = parseInt(document.getElementById('kmeans-k').value);
    if (k > points.length) throw new Error('K cannot exceed number of points!');

    // Initialize K random centers using k-means++ style
    this.centers = [];
    const usedIndices = new Set();

    // First center is random
    let idx = Math.floor(Math.random() * points.length);
    usedIndices.add(idx);
    this.centers.push({ x: points[idx].x, y: points[idx].y });

    // Remaining centers: pick points with probability proportional to distance squared
    for (let i = 1; i < k; i++) {
      const distances = points.map((p, pIdx) => {
        if (usedIndices.has(pIdx)) return 0;
        let minDist = Infinity;
        this.centers.forEach(c => {
          const d = Math.sqrt(Math.pow(p.x - c.x, 2) + Math.pow(p.y - c.y, 2));
          if (d < minDist) minDist = d;
        });
        return minDist * minDist;
      });

      const totalDist = distances.reduce((s, d) => s + d, 0);
      let r = Math.random() * totalDist;
      let chosenIdx = 0;
      for (let j = 0; j < distances.length; j++) {
        r -= distances[j];
        if (r <= 0) {
          chosenIdx = j;
          break;
        }
      }

      usedIndices.add(chosenIdx);
      this.centers.push({ x: points[chosenIdx].x, y: points[chosenIdx].y });
    }

    this.initialized = true;
    this.iteration = 0;
    this.inertiaHistory = [];
    this.assignments = new Array(points.length).fill(0);

    document.getElementById('next-kmeans').disabled = false;

    // Display algorithm equations
    this.displayEquations(k);

    // Show results sections
    document.getElementById('kmeans-equations').style.display = 'block';
    document.getElementById('kmeans-results').style.display = 'block';

    // Initial assignment
    this.assignPoints();
    this.displayResults(points, pointNames);
  }

  displayEquations(k) {
    const initEq = `\\text{Randomly select } K = ${k} \\text{ initial centroids from data points}\\\\
\\text{Using k-means++ initialization for better starting positions}`;
    AppUtils.kRender(document.getElementById('kmeans-eq-init'), initEq, true);

    const assignEq = `\\text{For each point } \\mathbf{x}_i, \\text{ assign to nearest centroid:}\\\\
c_i = \\arg\\min_j \\|\\mathbf{x}_i - \\boldsymbol{\\mu}_j\\|^2\\\\
\\text{where } \\|\\mathbf{a} - \\mathbf{b}\\| = \\sqrt{(a_x - b_x)^2 + (a_y - b_y)^2}`;
    AppUtils.kRender(document.getElementById('kmeans-eq-assign'), assignEq, true);

    const updateEq = `\\text{Update each centroid as the mean of assigned points:}\\\\
\\boldsymbol{\\mu}_j = \\frac{1}{|C_j|} \\sum_{\\mathbf{x}_i \\in C_j} \\mathbf{x}_i`;
    AppUtils.kRender(document.getElementById('kmeans-eq-update'), updateEq, true);

    const lossEq = `\\text{Inertia (within-cluster sum of squares):}\\\\
\\text{WCSS} = \\sum_{j=1}^{K} \\sum_{\\mathbf{x}_i \\in C_j} \\|\\mathbf{x}_i - \\boldsymbol{\\mu}_j\\|^2`;
    AppUtils.kRender(document.getElementById('kmeans-eq-loss'), lossEq, true);
  }

  assignPoints() {
    const { points } = this.manager.getDataFromApp();

    // Assign each point to nearest center
    this.assignments = points.map(point => {
      let minDist = Infinity;
      let nearestCluster = 0;

      this.centers.forEach((center, clusterIdx) => {
        const dist = Math.sqrt(
          Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearestCluster = clusterIdx;
        }
      });

      return nearestCluster;
    });
  }

  trainIteration() {
    if (!this.initialized) throw new Error('Initialize first!');

    const { points, pointNames } = this.manager.getDataFromApp();
    const k = this.centers.length;

    // Store old centers to check convergence
    const oldCenters = this.centers.map(c => ({ x: c.x, y: c.y }));

    // STEP 1: Assignment - assign points to nearest center
    this.assignPoints();

    // STEP 2: Update centers
    const newCenters = [];
    for (let c = 0; c < k; c++) {
      const clusterPoints = points.filter((_, idx) => this.assignments[idx] === c);

      if (clusterPoints.length > 0) {
        const sumX = clusterPoints.reduce((s, p) => s + p.x, 0);
        const sumY = clusterPoints.reduce((s, p) => s + p.y, 0);
        newCenters.push({
          x: sumX / clusterPoints.length,
          y: sumY / clusterPoints.length
        });
      } else {
        // Keep old center if cluster is empty
        newCenters.push({ x: this.centers[c].x, y: this.centers[c].y });
      }
    }
    this.centers = newCenters;

    // STEP 3: Compute inertia
    let inertia = 0;
    points.forEach((point, idx) => {
      const center = this.centers[this.assignments[idx]];
      const dist = Math.sqrt(
        Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2)
      );
      inertia += dist * dist;
    });
    this.inertiaHistory.push(inertia);

    // Update iteration counter
    this.iteration++;

    // Update UI
    document.getElementById('kmeans-iter').textContent = this.iteration;
    document.getElementById('kmeans-inertia').textContent = inertia.toFixed(4);

    // Display results
    this.displayResults(points, pointNames);

    // Check for convergence
    let converged = true;
    for (let c = 0; c < k; c++) {
      const dx = Math.abs(this.centers[c].x - oldCenters[c].x);
      const dy = Math.abs(this.centers[c].y - oldCenters[c].y);
      if (dx > 0.0001 || dy > 0.0001) {
        converged = false;
        break;
      }
    }

    return converged;
  }

  displayResults(points, pointNames) {
    const k = this.centers.length;

    // Display step details
    let stepText = `<strong>Iteration ${this.iteration}:</strong><br>`;

    // Count points per cluster
    const clusterCounts = new Array(k).fill(0);
    this.assignments.forEach(a => clusterCounts[a]++);

    stepText += `Cluster sizes: ${clusterCounts.map((c, i) => `C${i+1}: ${c}`).join(', ')}<br>`;

    if (this.inertiaHistory.length > 0) {
      const currentInertia = this.inertiaHistory[this.inertiaHistory.length - 1];
      stepText += `Current inertia: ${currentInertia.toFixed(4)}`;

      if (this.inertiaHistory.length > 1) {
        const improvement = this.inertiaHistory[this.inertiaHistory.length - 2] - currentInertia;
        stepText += ` (change: ${improvement >= 0 ? '-' : '+'}${Math.abs(improvement).toFixed(4)})`;
      }
    }

    document.getElementById('kmeans-step-display').innerHTML = stepText;

    // Display assignments table
    this.displayAssignments(points, pointNames);

    // Display centers table
    this.displayCenters();

    // Update metrics
    this.updateMetrics(points);
  }

  displayAssignments(points, pointNames) {
    const table = document.getElementById('kmeans-assignments-table');
    table.innerHTML = '';

    // Header
    const headerRow = document.createElement('tr');
    ['Point', 'X', 'Y', 'Cluster', 'Distance'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Colors for clusters
    const colors = ['#fca5a5', '#86efac', '#93c5fd', '#fcd34d', '#d8b4fe', '#fda4af', '#a5f3fc', '#fdba74', '#c4b5fd', '#bef264'];

    // Body
    points.forEach((point, idx) => {
      const tr = document.createElement('tr');
      const clusterIdx = this.assignments[idx];
      const center = this.centers[clusterIdx];
      const dist = Math.sqrt(Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2));

      // Point name
      let td = document.createElement('td');
      td.textContent = pointNames[idx];
      tr.appendChild(td);

      // X
      td = document.createElement('td');
      td.textContent = point.x.toFixed(2);
      tr.appendChild(td);

      // Y
      td = document.createElement('td');
      td.textContent = point.y.toFixed(2);
      tr.appendChild(td);

      // Cluster
      td = document.createElement('td');
      td.textContent = `C${clusterIdx + 1}`;
      td.style.fontWeight = 'bold';
      td.style.backgroundColor = colors[clusterIdx % colors.length];
      tr.appendChild(td);

      // Distance
      td = document.createElement('td');
      td.textContent = dist.toFixed(4);
      tr.appendChild(td);

      table.appendChild(tr);
    });
  }

  displayCenters() {
    const table = document.getElementById('kmeans-centers-table');
    table.innerHTML = '';

    // Header
    const headerRow = document.createElement('tr');
    ['Centroid', 'X', 'Y', 'Points'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Colors for clusters
    const colors = ['#fca5a5', '#86efac', '#93c5fd', '#fcd34d', '#d8b4fe', '#fda4af', '#a5f3fc', '#fdba74', '#c4b5fd', '#bef264'];

    // Count points per cluster
    const clusterCounts = new Array(this.centers.length).fill(0);
    this.assignments.forEach(a => clusterCounts[a]++);

    // Body
    this.centers.forEach((center, idx) => {
      const tr = document.createElement('tr');

      // Centroid name
      let td = document.createElement('td');
      td.textContent = `C${idx + 1}`;
      td.style.fontWeight = 'bold';
      td.style.backgroundColor = colors[idx % colors.length];
      tr.appendChild(td);

      // X
      td = document.createElement('td');
      td.textContent = center.x.toFixed(4);
      tr.appendChild(td);

      // Y
      td = document.createElement('td');
      td.textContent = center.y.toFixed(4);
      tr.appendChild(td);

      // Points count
      td = document.createElement('td');
      td.textContent = clusterCounts[idx];
      tr.appendChild(td);

      table.appendChild(tr);
    });
  }

  updateMetrics(points) {
    // Inertia
    const inertia = this.inertiaHistory.length > 0 ?
      this.inertiaHistory[this.inertiaHistory.length - 1] : 0;
    document.getElementById('kmeans-inertia-val').textContent = inertia.toFixed(4);
    document.getElementById('kmeans-n-points').textContent = points.length;

    // Silhouette score (simplified version)
    if (this.centers.length > 1 && points.length > this.centers.length) {
      let silhouetteSum = 0;

      points.forEach((point, idx) => {
        const cluster = this.assignments[idx];

        // a: average distance to points in same cluster
        let aSum = 0;
        let aCount = 0;
        points.forEach((other, otherIdx) => {
          if (idx !== otherIdx && this.assignments[otherIdx] === cluster) {
            aSum += Math.sqrt(Math.pow(point.x - other.x, 2) + Math.pow(point.y - other.y, 2));
            aCount++;
          }
        });
        const a = aCount > 0 ? aSum / aCount : 0;

        // b: minimum average distance to points in other clusters
        let b = Infinity;
        for (let c = 0; c < this.centers.length; c++) {
          if (c !== cluster) {
            let bSum = 0;
            let bCount = 0;
            points.forEach((other, otherIdx) => {
              if (this.assignments[otherIdx] === c) {
                bSum += Math.sqrt(Math.pow(point.x - other.x, 2) + Math.pow(point.y - other.y, 2));
                bCount++;
              }
            });
            if (bCount > 0) {
              const avgDist = bSum / bCount;
              if (avgDist < b) b = avgDist;
            }
          }
        }

        if (b === Infinity) b = 0;
        const s = Math.max(a, b) > 0 ? (b - a) / Math.max(a, b) : 0;
        silhouetteSum += s;
      });

      const silhouette = silhouetteSum / points.length;
      document.getElementById('kmeans-silhouette').textContent = silhouette.toFixed(4);
    } else {
      document.getElementById('kmeans-silhouette').textContent = '—';
    }
  }

  autoRun() {
    if (this.autoRunning) return;
    this.autoRunning = true;

    const maxIterations = 100;
    const runStep = () => {
      if (!this.autoRunning || this.iteration >= maxIterations) {
        this.stopAutoRun();
        return;
      }

      try {
        const converged = this.trainIteration();
        if (converged) {
          this.stopAutoRun();
          return;
        }
        this.autoTimeoutId = setTimeout(runStep, 200);
      } catch (e) {
        this.stopAutoRun();
        alert(e.message);
      }
    };

    runStep();
  }

  stopAutoRun() {
    this.autoRunning = false;
    if (this.autoTimeoutId) {
      clearTimeout(this.autoTimeoutId);
      this.autoTimeoutId = null;
    }
  }
}

class HierarchicalClustering {
  constructor(clusteringManager) {
    this.manager = clusteringManager;
    this.reset();
  }

  reset() {
    this.mergeHistory = [];
    this.assignments = [];
    this.dendrogram = [];
  }

  computeClustering() {
    const { points, pointNames } = this.manager.getDataFromApp();
    if (points.length < 2) throw new Error('Need at least 2 points! Click on canvas to add.');

    const linkage = document.getElementById('hierarchical-linkage').value;
    const nClusters = parseInt(document.getElementById('hierarchical-n-clusters').value);

    if (nClusters > points.length) throw new Error('Number of clusters cannot exceed number of points!');

    const n = points.length;

    // Initialize: each point is its own cluster
    let clusters = points.map((p, i) => ({
      id: i,
      points: [i],
      x: p.x,
      y: p.y
    }));

    // Distance matrix
    const distMatrix = [];
    for (let i = 0; i < n; i++) {
      distMatrix[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          distMatrix[i][j] = Infinity;
        } else {
          distMatrix[i][j] = Math.sqrt(
            Math.pow(points[i].x - points[j].x, 2) +
            Math.pow(points[i].y - points[j].y, 2)
          );
        }
      }
    }

    // Display algorithm equations
    this.displayEquations(linkage);

    // Merge history for display
    this.mergeHistory = [];
    this.dendrogram = [];

    let clusterIdCounter = n;
    const clusterMap = new Map();
    clusters.forEach(c => clusterMap.set(c.id, c));

    // Agglomerative clustering
    while (clusters.length > 1) {
      // Find closest pair of clusters
      let minDist = Infinity;
      let mergeI = -1;
      let mergeJ = -1;

      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const dist = this.clusterDistance(clusters[i], clusters[j], points, linkage);
          if (dist < minDist) {
            minDist = dist;
            mergeI = i;
            mergeJ = j;
          }
        }
      }

      // Merge clusters
      const clusterA = clusters[mergeI];
      const clusterB = clusters[mergeJ];

      const mergedPoints = [...clusterA.points, ...clusterB.points];
      const mergedX = mergedPoints.reduce((s, idx) => s + points[idx].x, 0) / mergedPoints.length;
      const mergedY = mergedPoints.reduce((s, idx) => s + points[idx].y, 0) / mergedPoints.length;

      const newCluster = {
        id: clusterIdCounter++,
        points: mergedPoints,
        x: mergedX,
        y: mergedY,
        left: clusterA.id,
        right: clusterB.id,
        distance: minDist
      };

      clusterMap.set(newCluster.id, newCluster);

      // Record merge
      this.mergeHistory.push({
        cluster1: clusterA.points.map(i => pointNames[i]).join(', '),
        cluster2: clusterB.points.map(i => pointNames[i]).join(', '),
        distance: minDist,
        newCluster: newCluster.id
      });

      this.dendrogram.push({
        left: clusterA.id,
        right: clusterB.id,
        distance: minDist,
        id: newCluster.id,
        size: mergedPoints.length
      });

      // Remove merged clusters and add new one
      clusters = clusters.filter((_, idx) => idx !== mergeI && idx !== mergeJ);
      clusters.push(newCluster);
    }

    // Cut dendrogram to get nClusters
    this.assignments = this.cutDendrogram(points.length, nClusters, clusterMap);

    // Display results
    this.displayResults(points, pointNames, nClusters);

    // Draw dendrogram
    this.drawDendrogram(points.length, pointNames, clusterMap);

    // Show results
    document.getElementById('hierarchical-equations').style.display = 'block';
    document.getElementById('hierarchical-results').style.display = 'block';
  }

  clusterDistance(clusterA, clusterB, points, linkage) {
    const distances = [];

    clusterA.points.forEach(i => {
      clusterB.points.forEach(j => {
        const dist = Math.sqrt(
          Math.pow(points[i].x - points[j].x, 2) +
          Math.pow(points[i].y - points[j].y, 2)
        );
        distances.push(dist);
      });
    });

    switch (linkage) {
      case 'single':
        return Math.min(...distances);
      case 'complete':
        return Math.max(...distances);
      case 'average':
      default:
        return distances.reduce((s, d) => s + d, 0) / distances.length;
    }
  }

  cutDendrogram(n, nClusters, clusterMap) {
    // Start with all points in separate clusters
    const assignments = new Array(n).fill(-1);

    if (nClusters >= n) {
      // Each point is its own cluster
      for (let i = 0; i < n; i++) {
        assignments[i] = i;
      }
      return assignments;
    }

    // Find the merge step where we go from nClusters to nClusters-1
    const numMerges = n - nClusters;

    // Get the clusters after numMerges merges
    const finalClusters = [];
    const merged = new Set();

    for (let i = 0; i < numMerges; i++) {
      const merge = this.dendrogram[i];
      merged.add(merge.left);
      merged.add(merge.right);
    }

    // Collect final cluster IDs
    // Original points that were never merged
    for (let i = 0; i < n; i++) {
      if (!merged.has(i)) {
        finalClusters.push(i);
      }
    }

    // Plus the merged clusters at the cut point
    for (let i = 0; i < numMerges; i++) {
      const merge = this.dendrogram[i];
      if (!merged.has(merge.id)) {
        finalClusters.push(merge.id);
      }
    }

    // Assign points to clusters
    finalClusters.forEach((clusterId, clusterIdx) => {
      const cluster = clusterMap.get(clusterId);
      if (cluster) {
        cluster.points.forEach(pointIdx => {
          assignments[pointIdx] = clusterIdx;
        });
      }
    });

    return assignments;
  }

  displayEquations(linkage) {
    const initEq = `\\text{Compute pairwise distance matrix:}\\\\
D_{ij} = \\|\\mathbf{x}_i - \\mathbf{x}_j\\| = \\sqrt{(x_i - x_j)^2 + (y_i - y_j)^2}`;
    AppUtils.kRender(document.getElementById('hierarchical-eq-init'), initEq, true);

    const findEq = `\\text{Find pair of clusters with minimum distance:}\\\\
(C_a, C_b) = \\arg\\min_{i,j} d(C_i, C_j)`;
    AppUtils.kRender(document.getElementById('hierarchical-eq-find'), findEq, true);

    let linkageFormula;
    switch (linkage) {
      case 'single':
        linkageFormula = `d(C_a, C_b) = \\min_{\\mathbf{x} \\in C_a, \\mathbf{y} \\in C_b} \\|\\mathbf{x} - \\mathbf{y}\\|`;
        break;
      case 'complete':
        linkageFormula = `d(C_a, C_b) = \\max_{\\mathbf{x} \\in C_a, \\mathbf{y} \\in C_b} \\|\\mathbf{x} - \\mathbf{y}\\|`;
        break;
      case 'average':
      default:
        linkageFormula = `d(C_a, C_b) = \\frac{1}{|C_a||C_b|} \\sum_{\\mathbf{x} \\in C_a} \\sum_{\\mathbf{y} \\in C_b} \\|\\mathbf{x} - \\mathbf{y}\\|`;
    }

    const mergeEq = `\\text{Merge clusters } C_a \\text{ and } C_b \\text{ into } C_{new}\\\\
\\text{Linkage: ${linkage.charAt(0).toUpperCase() + linkage.slice(1)}}\\\\
${linkageFormula}`;
    AppUtils.kRender(document.getElementById('hierarchical-eq-merge'), mergeEq, true);

    const updateEq = `\\text{Update distance matrix:}\\\\
\\text{Remove rows/columns for } C_a, C_b\\\\
\\text{Add row/column for } C_{new}\\\\
\\text{Repeat until one cluster remains}`;
    AppUtils.kRender(document.getElementById('hierarchical-eq-update'), updateEq, true);
  }

  displayResults(points, pointNames, nClusters) {
    // Display merge history
    let historyText = '<strong>Merge sequence:</strong><br>';
    this.mergeHistory.forEach((merge, idx) => {
      historyText += `${idx + 1}. Merge {${merge.cluster1}} and {${merge.cluster2}} (distance: ${merge.distance.toFixed(4)})<br>`;
    });
    document.getElementById('hierarchical-merge-history').innerHTML = historyText;

    // Display assignments table
    const table = document.getElementById('hierarchical-assignments-table');
    table.innerHTML = '';

    // Header
    const headerRow = document.createElement('tr');
    ['Point', 'X', 'Y', 'Cluster'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Colors for clusters
    const colors = ['#fca5a5', '#86efac', '#93c5fd', '#fcd34d', '#d8b4fe', '#fda4af', '#a5f3fc', '#fdba74', '#c4b5fd', '#bef264'];

    // Body
    points.forEach((point, idx) => {
      const tr = document.createElement('tr');
      const clusterIdx = this.assignments[idx];

      // Point name
      let td = document.createElement('td');
      td.textContent = pointNames[idx];
      tr.appendChild(td);

      // X
      td = document.createElement('td');
      td.textContent = point.x.toFixed(2);
      tr.appendChild(td);

      // Y
      td = document.createElement('td');
      td.textContent = point.y.toFixed(2);
      tr.appendChild(td);

      // Cluster
      td = document.createElement('td');
      td.textContent = `C${clusterIdx + 1}`;
      td.style.fontWeight = 'bold';
      td.style.backgroundColor = colors[clusterIdx % colors.length];
      tr.appendChild(td);

      table.appendChild(tr);
    });

    // Update metrics
    document.getElementById('hierarchical-n-clusters-val').textContent = nClusters;
    document.getElementById('hierarchical-n-points').textContent = points.length;
  }

  drawDendrogram(n, pointNames, clusterMap) {
    const canvas = document.getElementById('hierarchical-dendrogram');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (this.dendrogram.length === 0) return;

    const marginL = 40;
    const marginR = 20;
    const marginT = 20;
    const marginB = 40;

    const plotW = w - marginL - marginR;
    const plotH = h - marginT - marginB;

    // Find max distance for scaling
    const maxDist = Math.max(...this.dendrogram.map(d => d.distance));

    // Calculate x positions for each leaf (original point)
    const leafPositions = {};
    const leafSpacing = plotW / (n + 1);
    for (let i = 0; i < n; i++) {
      leafPositions[i] = marginL + (i + 1) * leafSpacing;
    }

    // Calculate positions for merged clusters
    const clusterPositions = { ...leafPositions };

    this.dendrogram.forEach(merge => {
      const leftPos = clusterPositions[merge.left];
      const rightPos = clusterPositions[merge.right];
      clusterPositions[merge.id] = (leftPos + rightPos) / 2;
    });

    // Draw the dendrogram
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;

    this.dendrogram.forEach(merge => {
      const leftX = clusterPositions[merge.left];
      const rightX = clusterPositions[merge.right];
      const mergeX = clusterPositions[merge.id];
      const mergeY = marginT + plotH - (merge.distance / maxDist) * plotH;

      // Get heights of child clusters
      const leftCluster = clusterMap.get(merge.left);
      const rightCluster = clusterMap.get(merge.right);

      const leftY = leftCluster && leftCluster.distance !== undefined ?
        marginT + plotH - (leftCluster.distance / maxDist) * plotH :
        marginT + plotH;
      const rightY = rightCluster && rightCluster.distance !== undefined ?
        marginT + plotH - (rightCluster.distance / maxDist) * plotH :
        marginT + plotH;

      // Draw vertical lines from children to merge height
      ctx.beginPath();
      ctx.moveTo(leftX, leftY);
      ctx.lineTo(leftX, mergeY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rightX, rightY);
      ctx.lineTo(rightX, mergeY);
      ctx.stroke();

      // Draw horizontal line connecting children
      ctx.beginPath();
      ctx.moveTo(leftX, mergeY);
      ctx.lineTo(rightX, mergeY);
      ctx.stroke();
    });

    // Draw leaf labels
    ctx.fillStyle = '#374151';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    for (let i = 0; i < n; i++) {
      ctx.fillText(pointNames[i], leafPositions[i], h - marginB + 15);
    }

    // Draw y-axis (distance)
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginL - 5, marginT);
    ctx.lineTo(marginL - 5, marginT + plotH);
    ctx.stroke();

    // Y-axis labels
    ctx.textAlign = 'right';
    const numTicks = 5;
    for (let i = 0; i <= numTicks; i++) {
      const y = marginT + plotH - (i / numTicks) * plotH;
      const val = (i / numTicks) * maxDist;
      ctx.fillText(val.toFixed(1), marginL - 10, y + 4);
    }

    // Y-axis title
    ctx.save();
    ctx.translate(10, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Distance', 0, 0);
    ctx.restore();
  }
}

// Export classes to global scope
window.OLSSolver = OLSSolver;
window.GradientDescent = GradientDescent;
window.ManualCalculator = ManualCalculator;
window.LogisticRegression = LogisticRegression;
window.StatisticsCalculator = StatisticsCalculator;
window.DecisionTree = DecisionTree;
window.RandomForest = RandomForest;
window.XGBoost = XGBoost;
window.NeuralNetwork = NeuralNetwork;
window.RecommendationSystem = RecommendationSystem;
window.ContentBasedFiltering = ContentBasedFiltering;
window.CollaborativeFiltering = CollaborativeFiltering;
window.ClusteringManager = ClusteringManager;
window.KMeansClustering = KMeansClustering;
window.HierarchicalClustering = HierarchicalClustering;
