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

// Export classes to global scope
window.OLSSolver = OLSSolver;
window.GradientDescent = GradientDescent;
window.ManualCalculator = ManualCalculator;

// ============================================================================
// STATISTICS CALCULATOR
// ============================================================================

class StatisticsCalculator {
  constructor() {
    this.lanczosCoefficients = [
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];
  }

  mean(values) {
    if (!values.length) return 0;
    return values.reduce((s, v) => s + v, 0) / values.length;
  }

  variance(values) {
    if (values.length < 2) return 0;
    const m = this.mean(values);
    const ss = values.reduce((s, v) => s + (v - m) ** 2, 0);
    return ss / (values.length - 1);
  }

  covariance(xs, ys) {
    if (xs.length !== ys.length) throw new Error('X and Y must have the same length.');
    if (xs.length < 2) throw new Error('Need at least two paired observations.');
    const meanX = this.mean(xs);
    const meanY = this.mean(ys);
    let sum = 0;
    for (let i = 0; i < xs.length; i++) {
      sum += (xs[i] - meanX) * (ys[i] - meanY);
    }
    return sum / (xs.length - 1);
  }

  correlation(xs, ys) {
    const cov = this.covariance(xs, ys);

    const meanX = this.mean(xs);
    const meanY = this.mean(ys);
    const ssxx = xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
    const ssyy = ys.reduce((s, y) => s + (y - meanY) ** 2, 0);
    const ssxy = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0);
    const varX = ssxx / (xs.length - 1);
    const varY = ssyy / (ys.length - 1);

    if (varX <= 0 || varY <= 0) {
      throw new Error('Variance is zero; correlation undefined.');
    }
    const corr = cov / Math.sqrt(varX * varY);

    return {
      n: xs.length,
      covariance: cov,
      correlation: corr,
      meanX,
      meanY,
      ssxx,
      ssyy,
      ssxy
    };

  }

  tTest(groupA, groupB) {
    if (groupA.length < 2 || groupB.length < 2) {
      throw new Error('Provide at least two values per group.');
    }
    const meanA = this.mean(groupA);
    const meanB = this.mean(groupB);
    const varA = this.variance(groupA);
    const varB = this.variance(groupB);
    const se = Math.sqrt(varA / groupA.length + varB / groupB.length);
    if (!Number.isFinite(se) || se === 0) {
      throw new Error('Standard error is zero; samples may be identical.');
    }
    const t = (meanA - meanB) / se;
    const numerator = (varA / groupA.length + varB / groupB.length) ** 2;
    const denominator =
      (varA ** 2) / (groupA.length ** 2 * (groupA.length - 1)) +
      (varB ** 2) / (groupB.length ** 2 * (groupB.length - 1));
    const df = numerator / denominator;
    const p = this.twoTailedPValue(t, df);

    return {
      t,
      df,
      p,
      meanA,
      meanB,
      varA,
      varB,
      se,
      n1: groupA.length,
      n2: groupB.length
    };

  }

  anova(groups) {
    const filtered = groups.filter(g => g.length > 0);
    if (filtered.length < 2) {
      throw new Error('Provide at least two non-empty groups.');
    }
    const totalN = filtered.reduce((s, g) => s + g.length, 0);
    if (totalN <= filtered.length) {
      throw new Error('Each group needs at least two observations.');
    }
    const means = filtered.map(g => this.mean(g));
    const grandMean = filtered.reduce((s, g, i) => s + g.length * means[i], 0) / totalN;

    let ssBetween = 0;
    let ssWithin = 0;
    filtered.forEach((group, idx) => {
      ssBetween += group.length * (means[idx] - grandMean) ** 2;
      ssWithin += group.reduce((s, v) => s + (v - means[idx]) ** 2, 0);
    });

    const dfBetween = filtered.length - 1;
    const dfWithin = totalN - filtered.length;
    if (dfWithin <= 0) {
      throw new Error('Not enough data to estimate within-group variance.');
    }
    const msBetween = ssBetween / dfBetween;
    const msWithin = ssWithin / dfWithin;
    const f = msWithin === 0 ? Infinity : msBetween / msWithin;
    const p = msWithin === 0 ? 0 : this.fTailProbability(f, dfBetween, dfWithin);

    return {
      f,
      df1: dfBetween,
      df2: dfWithin,
      p,
      means,
      grandMean,
      ssBetween,
      ssWithin,
      msBetween,
      msWithin,
      totalN,
      k: filtered.length
    };

  }

  logGamma(z) {
    if (z < 0.5) {
      return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - this.logGamma(1 - z);
    }
    z -= 1;
    let x = 0.99999999999980993;
    for (let i = 0; i < this.lanczosCoefficients.length; i++) {
      x += this.lanczosCoefficients[i] / (z + i + 1);
    }
    const t = z + this.lanczosCoefficients.length - 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  beta(a, b) {
    return Math.exp(this.logGamma(a) + this.logGamma(b) - this.logGamma(a + b));
  }

  tPDF(x, df) {
    const half = 0.5 * (df + 1);
    const logCoeff = this.logGamma(half) - this.logGamma(df / 2) - 0.5 * Math.log(df * Math.PI);
    return Math.exp(logCoeff - half * Math.log(1 + (x * x) / df));
  }

  tCDF(value, df) {
    if (!Number.isFinite(value)) return value > 0 ? 1 : 0;
    if (df <= 0) return NaN;
    const x = Math.abs(value);
    if (x === 0) return 0.5;
    const steps = Math.max(200, Math.min(2000, Math.ceil(x * 40)));
    const h = x / steps;
    let sum = 0;
    for (let i = 0; i <= steps; i++) {
      const weight = (i === 0 || i === steps) ? 1 : (i % 2 === 0 ? 2 : 4);
      sum += weight * this.tPDF(i * h, df);
    }
    const integral = sum * h / 3;
    const cdf = Math.min(1, Math.max(0, 0.5 + integral));
    return value < 0 ? 1 - cdf : cdf;
  }

  twoTailedPValue(t, df) {
    const cdf = this.tCDF(Math.abs(t), df);
    return Math.max(0, Math.min(1, 2 * (1 - cdf)));
  }

  fPDF(x, d1, d2) {
    if (x <= 0) return 0;
    const half1 = d1 / 2;
    const half2 = d2 / 2;
    const logNumerator = half1 * Math.log(d1 / d2) + (half1 - 1) * Math.log(x);
    const logDenominator = Math.log(this.beta(half1, half2)) + ((d1 + d2) / 2) * Math.log(1 + (d1 / d2) * x);
    return Math.exp(logNumerator - logDenominator);
  }

  fCDF(value, d1, d2) {
    if (!Number.isFinite(value)) return value > 0 ? 1 : 0;
    if (value <= 0) return 0;
    const steps = Math.max(400, Math.min(4000, Math.ceil(Math.sqrt(value) * 80)));
    const h = value / steps;
    let sum = 0;
    for (let i = 0; i <= steps; i++) {
      const weight = (i === 0 || i === steps) ? 1 : (i % 2 === 0 ? 2 : 4);
      sum += weight * this.fPDF(i * h, d1, d2);
    }
    return Math.min(1, Math.max(0, sum * h / 3));
  }

  fTailProbability(f, d1, d2) {
    const cdf = this.fCDF(f, d1, d2);
    return Math.max(0, Math.min(1, 1 - cdf));
  }
}

window.StatisticsCalculator = StatisticsCalculator;
