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
