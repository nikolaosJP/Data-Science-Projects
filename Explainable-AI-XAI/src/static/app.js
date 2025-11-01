// ============================================================================
// MAIN APPLICATION
// ============================================================================

class App {
  constructor() {
    this.points = [];
    this.activeTab = 'regression';
    this.activeRegTab = 'ols';
    this.activeStatTab = 'correlation';
    this.showResiduals = true;
    this.activeLogisticGroup = 0; // Currently selected group for logistic regression (0 or 1)
    this.models = {
      ols: {m: 0, b: 0, fitted: false},
      gd: {m: 0, b: 0, fitted: false},
      manual: {m: 0, b: 0, fitted: false},
      logistic: {m: 0, b: 0, fitted: false}
    };

    // Statistics data storage
    this.statData = {
      correlation: [],
      ttest: { group1: [], group2: [], activeGroup: 0, testType: 'two-tailed' },
      anova: { groups: [[], [], [], [], []], activeGroup: 0 }
    };

    this.canvas = new CanvasHandler();
    this.olsSolver = new OLSSolver();
    this.gradientDescent = new GradientDescent();
    this.manualCalculator = new ManualCalculator();
    this.logisticRegression = new LogisticRegression();
    this.statisticsCalculator = new StatisticsCalculator();

    this.setupEventHandlers();
    this.initializeFormulas();
    this.canvas.draw(this.activeRegTab, this.points, this.models, this.showResiduals);
    AppUtils.kFlush();
  }

  setupEventHandlers() {
    // Main tabs
    document.querySelectorAll('.tab[data-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.dataset.tab) this.switchTab(tab.dataset.tab);
      });
    });

    // Regression subtabs
    document.querySelectorAll('.tab[data-regtab]').forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.dataset.regtab) this.switchRegTab(tab.dataset.regtab);
      });
    });

    // Statistics subtabs
    document.querySelectorAll('.tab[data-subtab]').forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.dataset.subtab) this.switchStatTab(tab.dataset.subtab);
      });
    });

    // OLS Controls
    document.getElementById('solve-ols').onclick = () => this.solveOLS();

    // GD Controls
    document.getElementById('init-gd').onclick = () => this.initializeGD();
    document.getElementById('next-step').onclick = () => this.nextGDStep();
    document.getElementById('auto-run').onclick = () => this.autoRunGD();
    document.getElementById('reset-gd').onclick = () => this.resetGD();

    // Manual Controls
    document.getElementById('calculate-manual').onclick = () => this.calculateManual();

    // Logistic Regression Controls
    document.getElementById('init-lr').onclick = () => this.initializeLR();
    document.getElementById('next-step-lr').onclick = () => this.nextLRStep();
    document.getElementById('lr-auto-run').onclick = () => this.autoRunLR();
    document.getElementById('reset-lr').onclick = () => this.resetLR();
    document.getElementById('lr-threshold').oninput = (e) => this.updateLRMetrics(parseFloat(e.target.value));
    document.getElementById('lr-youden-btn').onclick = () => this.useYoudenThreshold();
    document.getElementById('lr-group0-btn').onclick = () => this.setLogisticGroup(0);
    document.getElementById('lr-group1-btn').onclick = () => this.setLogisticGroup(1);

    // Statistics Controls - Correlation
    document.getElementById('calc-correlation').onclick = () => this.calculateCorrelation();
    document.getElementById('clear-correlation').onclick = () => this.clearStatData('correlation');
    document.getElementById('sample-correlation').onclick = () => this.sampleStatData('correlation');

    // Statistics Controls - t-Test
    document.getElementById('calc-ttest').onclick = () => this.calculateTTest();
    document.getElementById('clear-ttest').onclick = () => this.clearStatData('ttest');
    document.getElementById('sample-ttest').onclick = () => this.sampleStatData('ttest');
    document.getElementById('ttest-group1-btn').onclick = () => this.setTTestGroup(0);
    document.getElementById('ttest-group2-btn').onclick = () => this.setTTestGroup(1);

    // t-Test type selection
    document.querySelectorAll('input[name="ttest-type"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.statData.ttest.testType = e.target.value;
      });
    });

    // Statistics Controls - ANOVA
    document.getElementById('calc-anova').onclick = () => this.calculateANOVA();
    document.getElementById('clear-anova').onclick = () => this.clearStatData('anova');
    document.getElementById('sample-anova').onclick = () => this.sampleStatData('anova');
    for (let i = 1; i <= 5; i++) {
      document.getElementById(`anova-g${i}-btn`).onclick = () => this.setAnovaGroup(i - 1);
    }

    // General Controls
    document.getElementById('clear').onclick = () => this.clear();
    document.getElementById('sample').onclick = () => this.generateSample();
    const residualsCheckbox = document.getElementById('residuals');
    if (residualsCheckbox) {
      residualsCheckbox.onchange = e => {
        this.showResiduals = e.target.checked;
        this.canvas.draw(this.activeRegTab, this.points, this.models, this.showResiduals);
      };
    }

    // Keyboard controls for ANOVA group selection
    document.addEventListener('keydown', (e) => {
      if (this.activeTab === 'stats' && this.activeStatTab === 'anova') {
        const key = parseInt(e.key);
        if (key >= 1 && key <= 5) {
          this.statData.anova.activeGroup = key - 1;
          document.getElementById('anova-active-group').textContent = key;
        }
      }
    });
  }

  switchTab(tab) {
    document.querySelectorAll('.tab[data-tab]').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const tabButton = document.querySelector(`[data-tab="${tab}"]`);
    if (tabButton) tabButton.classList.add('active');
    const tabContent = document.getElementById(`tab-${tab}`);
    if (tabContent) tabContent.classList.add('active');
    this.activeTab = tab;
  }

  switchRegTab(regtab) {
    document.querySelectorAll('.tab[data-regtab]').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.regtab-content').forEach(t => t.classList.remove('active'));
    const tabButton = document.querySelector(`[data-regtab="${regtab}"]`);
    if (tabButton) tabButton.classList.add('active');
    const tabContent = document.getElementById(`regtab-${regtab}`);
    if (tabContent) tabContent.classList.add('active');
    this.activeRegTab = regtab;

    // Draw appropriate canvas
    this.canvas.draw(regtab, this.points, this.models, this.showResiduals);

    if (regtab === 'gd') {
      this.canvas.drawLossPlot(this.gradientDescent.lossHistory);
    } else if (regtab === 'logistic') {
      this.drawLRLossPlot();
    }
  }

  switchStatTab(subtab) {
    document.querySelectorAll('.tab[data-subtab]').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.subtab-content').forEach(t => t.classList.remove('active'));
    const tabButton = document.querySelector(`[data-subtab="${subtab}"]`);
    if (tabButton) tabButton.classList.add('active');
    const tabContent = document.getElementById(`subtab-${subtab}`);
    if (tabContent) tabContent.classList.add('active');
    this.activeStatTab = subtab;
  }

  addPoint(point) {
    this.points.push(point);
    this.canvas.draw(this.activeRegTab, this.points, this.models, this.showResiduals);
    if (this.activeRegTab === 'gd') {
      this.canvas.drawLossPlot(this.gradientDescent.lossHistory);
    } else if (this.activeRegTab === 'logistic') {
      this.drawLRLossPlot();
    }
  }

  removePoint(index) {
    this.points.splice(index, 1);
    this.canvas.draw(this.activeRegTab, this.points, this.models, this.showResiduals);
    if (this.activeRegTab === 'gd') {
      this.canvas.drawLossPlot(this.gradientDescent.lossHistory);
    } else if (this.activeRegTab === 'logistic') {
      this.drawLRLossPlot();
    }
  }

  updatePoint(index, point) {
    this.points[index] = point;
    this.canvas.draw(this.activeRegTab, this.points, this.models, this.showResiduals);
    if (this.activeRegTab === 'gd') {
      this.canvas.drawLossPlot(this.gradientDescent.lossHistory);
    } else if (this.activeRegTab === 'logistic') {
      this.drawLRLossPlot();
    }
  }

  getPoints() { return this.points; }

  setLogisticGroup(groupIdx) {
    this.activeLogisticGroup = groupIdx;
    // Update button styles
    document.getElementById('lr-group0-btn').className = groupIdx === 0 ? 'warning' : '';
    document.getElementById('lr-group1-btn').className = groupIdx === 1 ? 'success' : '';
  }

  getActiveLogisticGroup() {
    return this.activeLogisticGroup;
  }

  solveOLS() {
    try {
      this.models.ols = this.olsSolver.solve(this.points);
      this.olsSolver.displaySteps(this.points, this.models.ols);
      this.olsSolver.updateDisplay(this.points, this.models.ols);
      this.canvas.draw(this.activeRegTab, this.points, this.models, this.showResiduals);
    } catch (e) {
      alert(e.message);
    }
  }

  initializeGD() {
    try {
      this.models.gd = this.gradientDescent.initialize(this.points);
      this.canvas.draw(this.activeRegTab, this.points, this.models, this.showResiduals);
    } catch (e) {
      alert(e.message);
    }
  }

  nextGDStep() {
    this.models.gd = this.gradientDescent.executeStep(this.points, this.models.gd);
    this.canvas.draw(this.activeRegTab, this.points, this.models, this.showResiduals);
    this.canvas.drawLossPlot(this.gradientDescent.lossHistory);
  }

  autoRunGD() {
    if (!this.gradientDescent.initialized) {
      this.initializeGD();
    }
    
    this.gradientDescent.startAutoRun(
      this.points,
      () => this.models.gd, // Function to get current model
      (newModel) => {       // Callback to update model
        this.models.gd = newModel;
        this.canvas.draw(this.activeRegTab, this.points, this.models, this.showResiduals);
        this.canvas.drawLossPlot(this.gradientDescent.lossHistory);
      }
    );
  }

  resetGD() {
    this.gradientDescent.stopAutoRun();
    this.gradientDescent.reset();
    this.models.gd = {m: 0, b: 0, fitted: false};
    document.getElementById('next-step').disabled = true;
    for (let i = 0; i <= 4; i++) {
      const el = document.getElementById(`step-${i}`);
      if (el) el.style.display = 'none';
    }
    this.gradientDescent.updateStepDisplay();
    this.canvas.draw(this.activeRegTab, this.points, this.models, this.showResiduals);
    this.canvas.drawLossPlot(this.gradientDescent.lossHistory);
  }

  calculateManual() {
    try {
      this.models.manual = this.manualCalculator.calculate(this.points);
      this.canvas.draw(this.activeRegTab, this.points, this.models, this.showResiduals);
    } catch (e) {
      alert(e.message);
    }
  }

  clear() {
    this.points = [];
    this.models = {
      ols: {m:0, b:0, fitted:false},
      gd: {m:0, b:0, fitted:false},
      manual: {m:0, b:0, fitted:false},
      logistic: {m:0, b:0, fitted:false}
    };
    this.gradientDescent.stopAutoRun();
    this.gradientDescent.reset();
    this.logisticRegression.stopAutoRun();
    this.logisticRegression.reset();

    const nextStep = document.getElementById('next-step');
    if (nextStep) nextStep.disabled = true;
    const nextStepLR = document.getElementById('next-step-lr');
    if (nextStepLR) nextStepLR.disabled = true;

    const olsCalc = document.getElementById('ols-calculations');
    if (olsCalc) olsCalc.style.display = 'none';
    const manualCalc = document.getElementById('manual-calculations');
    if (manualCalc) manualCalc.style.display = 'none';

    for (let i = 0; i <= 4; i++) {
      const el = document.getElementById(`step-${i}`);
      if (el) el.style.display = 'none';
      const elLR = document.getElementById(`lr-step-${i}`);
      if (elLR) elLR.style.display = 'none';
    }

    this.gradientDescent.updateStepDisplay();
    this.logisticRegression.updateStepDisplay();
    this.canvas.draw(this.activeRegTab, this.points, this.models, this.showResiduals);
    this.canvas.drawLossPlot(this.gradientDescent.lossHistory);
    this.drawLRLossPlot();

    const accEl = document.getElementById('lr-accuracy');
    if (accEl) accEl.textContent = '—';
  }

  generateSample() {
    this.points = [];
    const n = 30;

    if (this.activeRegTab === 'logistic') {
      // Generate classification data with clear x-based separation
      for (let i = 0; i < n; i++) {
        const x = i * 10 / (n - 1);
        const label = x > 5 ? 1 : 0; // Separate by x position
        const centerY = label === 1 ? 6 + Math.random() * 3 : 2 + Math.random() * 3;
        const y = centerY + (Math.random() - 0.5) * 1;
        this.points.push({
          x: Math.max(0, Math.min(10, x)),
          y: Math.max(0, Math.min(10, y)),
          label
        });
      }
    } else {
      // Generate regression data
      for (let i = 0; i < n; i++) {
        const x = i * 10 / (n - 1);
        const y = 0.7 * x + 1.5 + (Math.random() - 0.5) * 2.0;
        this.points.push({
          x: Math.max(0, Math.min(10, x)),
          y: Math.max(0, Math.min(10, y))
        });
      }
    }

    this.canvas.draw(this.activeRegTab, this.points, this.models, this.showResiduals);
    if (this.activeRegTab === 'gd') {
      this.canvas.drawLossPlot(this.gradientDescent.lossHistory);
    } else if (this.activeRegTab === 'logistic') {
      this.drawLRLossPlot();
    }
  }

  // Logistic Regression Methods
  initializeLR() {
    try {
      this.models.logistic = this.logisticRegression.initialize(this.points);
      this.canvas.draw(this.activeRegTab, this.points, this.models, this.showResiduals);
      this.updateLRMetrics();
    } catch (e) {
      alert(e.message);
    }
  }

  nextLRStep() {
    this.models.logistic = this.logisticRegression.executeStep(this.points, this.models.logistic);
    this.canvas.draw(this.activeRegTab, this.points, this.models, this.showResiduals);
    this.drawLRLossPlot();
    this.updateLRMetrics();
  }

  autoRunLR() {
    if (!this.logisticRegression.initialized) {
      this.initializeLR();
    }

    this.logisticRegression.startAutoRun(
      this.points,
      () => this.models.logistic,
      (newModel) => {
        this.models.logistic = newModel;
        this.canvas.draw(this.activeRegTab, this.points, this.models, this.showResiduals);
        this.drawLRLossPlot();
        this.updateLRMetrics();
      }
    );
  }

  resetLR() {
    this.logisticRegression.stopAutoRun();
    this.logisticRegression.reset();
    this.models.logistic = {m: 0, b: 0, fitted: false};
    const nextBtn = document.getElementById('next-step-lr');
    if (nextBtn) nextBtn.disabled = true;
    for (let i = 0; i <= 4; i++) {
      const el = document.getElementById(`lr-step-${i}`);
      if (el) el.style.display = 'none';
    }
    this.logisticRegression.updateStepDisplay();
    this.canvas.draw(this.activeRegTab, this.points, this.models, this.showResiduals);
    this.drawLRLossPlot();
    const accEl = document.getElementById('lr-accuracy');
    if (accEl) accEl.textContent = '—';
  }

  updateLRMetrics(threshold = 0.5) {
    if (!this.models.logistic.fitted || this.points.length === 0) return;

    const metrics = this.logisticRegression.calculateMetrics(this.points, this.models.logistic, threshold);
    if (!metrics) return;

    // Update threshold display
    document.getElementById('lr-threshold-val').textContent = threshold.toFixed(2);

    // Update confusion matrix
    document.getElementById('cm-tp').textContent = metrics.tp;
    document.getElementById('cm-fp').textContent = metrics.fp;
    document.getElementById('cm-tn').textContent = metrics.tn;
    document.getElementById('cm-fn').textContent = metrics.fn;
    document.getElementById('lr-confusion-matrix').style.display = 'block';

    // Update metrics
    document.getElementById('lr-accuracy').textContent = (metrics.accuracy * 100).toFixed(2) + '%';
    document.getElementById('lr-precision').textContent = (metrics.precision * 100).toFixed(2) + '%';
    document.getElementById('lr-recall').textContent = (metrics.recall * 100).toFixed(2) + '%';
    document.getElementById('lr-specificity').textContent = (metrics.specificity * 100).toFixed(2) + '%';
    document.getElementById('lr-f1').textContent = metrics.f1.toFixed(4);

    // Calculate and display Youden index
    const youdenThreshold = this.logisticRegression.calculateYoudenThreshold(this.points, this.models.logistic);
    document.getElementById('lr-youden').textContent = youdenThreshold.toFixed(2);
  }

  useYoudenThreshold() {
    if (!this.models.logistic.fitted || this.points.length === 0) return;
    const youdenThreshold = this.logisticRegression.calculateYoudenThreshold(this.points, this.models.logistic);
    document.getElementById('lr-threshold').value = youdenThreshold;
    this.updateLRMetrics(youdenThreshold);
  }

  drawLRLossPlot() {
    const canvas = document.getElementById('lr-loss-plot');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const lossHistory = this.logisticRegression.lossHistory;
    const w = canvas.width, h = canvas.height;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    if (lossHistory.length < 2) return;

    const marginL = 30, marginT = 20, marginR = 10, marginB = 30;
    const minLoss = Math.min(...lossHistory);
    const maxLoss = Math.max(...lossHistory);
    const range = maxLoss - minLoss || 1;

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(marginL, marginT, w - marginL - marginR, h - marginT - marginB);

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < lossHistory.length; i++) {
      const x = marginL + i * (w - marginL - marginR) / (lossHistory.length - 1);
      const y = marginT + (1 - (lossHistory[i] - minLoss) / range) * (h - marginT - marginB);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Statistics Methods
  setTTestGroup(groupIdx) {
    this.statData.ttest.activeGroup = groupIdx;
    // Update button styles
    document.getElementById('ttest-group1-btn').className = groupIdx === 0 ? 'success' : '';
    document.getElementById('ttest-group2-btn').className = groupIdx === 1 ? 'success' : '';
  }

  setAnovaGroup(groupIdx) {
    this.statData.anova.activeGroup = groupIdx;
    // Update button styles
    for (let i = 1; i <= 5; i++) {
      document.getElementById(`anova-g${i}-btn`).className = (groupIdx === i - 1) ? 'success' : '';
    }
  }

  clearStatData(type) {
    if (type === 'correlation') {
      this.statData.correlation = [];
      this.canvas.drawStatisticsPlot('plot-correlation', { group1: [], group2: [] }, 'correlation');
      document.getElementById('corr-point-count').textContent = '0';
      document.getElementById('corr-results').style.display = 'none';
    } else if (type === 'ttest') {
      this.statData.ttest = { group1: [], group2: [] };
      this.canvas.drawStatisticsPlot('plot-ttest', { group1: [], group2: [], mean1: 0, mean2: 0 }, 'ttest');
      document.getElementById('ttest-n1').textContent = '0';
      document.getElementById('ttest-n2').textContent = '0';
      document.getElementById('ttest-results').style.display = 'none';
    } else if (type === 'anova') {
      this.statData.anova.groups = [[], [], [], [], []];
      this.canvas.drawStatisticsPlot('plot-anova', { groups: [], groupMeans: [] }, 'anova');
      for (let i = 1; i <= 5; i++) {
        document.getElementById(`anova-g${i}`).textContent = `G${i}: 0`;
      }
      document.getElementById('anova-results').style.display = 'none';
    }
  }

  sampleStatData(type) {
    if (type === 'correlation') {
      this.statData.correlation = [];
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * 10;
        const y = x * 0.7 + Math.random() * 3;
        this.statData.correlation.push({ x, y });
      }
      document.getElementById('corr-point-count').textContent = this.statData.correlation.length;
      const group1 = this.statData.correlation.map(p => p.x);
      const group2 = this.statData.correlation.map(p => p.y);
      this.canvas.drawStatisticsPlot('plot-correlation', { group1, group2 }, 'correlation');
    } else if (type === 'ttest') {
      this.statData.ttest.group1 = Array.from({length: 15}, () => 5 + Math.random() * 3);
      this.statData.ttest.group2 = Array.from({length: 15}, () => 8 + Math.random() * 3);
      document.getElementById('ttest-n1').textContent = this.statData.ttest.group1.length;
      document.getElementById('ttest-n2').textContent = this.statData.ttest.group2.length;
      const mean1 = this.statData.ttest.group1.reduce((s,v) => s+v, 0) / this.statData.ttest.group1.length;
      const mean2 = this.statData.ttest.group2.reduce((s,v) => s+v, 0) / this.statData.ttest.group2.length;
      this.canvas.drawStatisticsPlot('plot-ttest', {...this.statData.ttest, mean1, mean2 }, 'ttest');
    } else if (type === 'anova') {
      for (let g = 0; g < 3; g++) {
        this.statData.anova.groups[g] = Array.from({length: 10}, () => (g * 3 + 5) + Math.random() * 2);
      }
      for (let i = 1; i <= 5; i++) {
        document.getElementById(`anova-g${i}`).textContent = `G${i}: ${this.statData.anova.groups[i-1].length}`;
      }
      const groupMeans = this.statData.anova.groups.map(g => g.length > 0 ? g.reduce((s,v)=>s+v,0)/g.length : 0);
      this.canvas.drawStatisticsPlot('plot-anova', { groups: this.statData.anova.groups.filter(g => g.length > 0), groupMeans }, 'anova');
    }
  }

  calculateCorrelation() {
    try {
      if (this.statData.correlation.length < 2) {
        alert('Need at least 2 points! Click on canvas to add or use Sample Data.');
        return;
      }

      const group1 = this.statData.correlation.map(p => p.x);
      const group2 = this.statData.correlation.map(p => p.y);
      const result = this.statisticsCalculator.calculateCorrelation(group1, group2);

      // Calculate covariance and standard deviations for detailed steps
      const n = result.n;
      let cov = 0, var1 = 0, var2 = 0;
      for (let i = 0; i < n; i++) {
        const d1 = group1[i] - result.mean1;
        const d2 = group2[i] - result.mean2;
        cov += d1 * d2;
        var1 += d1 * d1;
        var2 += d2 * d2;
      }
      cov /= (n - 1);
      const std1 = Math.sqrt(var1 / (n - 1));
      const std2 = Math.sqrt(var2 / (n - 1));

      // Display formulas
      AppUtils.kRender(document.getElementById('corr-formula-tex'),
        `r = \\frac{\\text{Cov}(x,y)}{s_x s_y}`, true);
      AppUtils.kRender(document.getElementById('corr-cov-formula-tex'),
        `\\text{Cov}(x,y) = \\frac{1}{n-1}\\sum (x_i - \\bar{x})(y_i - \\bar{y})`, true);
      AppUtils.kRender(document.getElementById('corr-std-formula-tex'),
        `s_x = \\sqrt{\\frac{1}{n-1}\\sum (x_i - \\bar{x})^2}, \\quad s_y = \\sqrt{\\frac{1}{n-1}\\sum (y_i - \\bar{y})^2}`, true);

      // Display steps
      AppUtils.kRender(document.getElementById('corr-n-tex'), `n = ${n}`);
      AppUtils.kRender(document.getElementById('corr-mean1-tex'), `\\bar{x} = ${result.mean1.toFixed(4)}`);
      AppUtils.kRender(document.getElementById('corr-mean2-tex'), `\\bar{y} = ${result.mean2.toFixed(4)}`);
      AppUtils.kRender(document.getElementById('corr-cov-tex'), `\\text{Cov}(x,y) = ${cov.toFixed(4)}`);
      AppUtils.kRender(document.getElementById('corr-std1-tex'), `s_x = ${std1.toFixed(4)}`);
      AppUtils.kRender(document.getElementById('corr-std2-tex'), `s_y = ${std2.toFixed(4)}`);

      document.getElementById('corr-r-val').textContent = result.r.toFixed(6);
      document.getElementById('corr-results').style.display = 'block';
      this.canvas.drawStatisticsPlot('plot-correlation', { group1, group2 }, 'correlation');
    } catch (e) {
      alert(e.message);
    }
  }

  calculateTTest() {
    try {
      const { group1, group2 } = this.statData.ttest;
      if (group1.length < 2 || group2.length < 2) {
        alert('Each group needs at least 2 observations! Click canvas to add or use Sample Data.');
        return;
      }

      const result = this.statisticsCalculator.calculateTTest(group1, group2);

      // Display formulas
      AppUtils.kRender(document.getElementById('ttest-formula-tex'),
        `t = \\frac{\\bar{x}_1 - \\bar{x}_2}{SE}`, true);
      AppUtils.kRender(document.getElementById('ttest-pooled-formula-tex'),
        `s_p^2 = \\frac{(n_1-1)s_1^2 + (n_2-1)s_2^2}{n_1+n_2-2}`, true);
      AppUtils.kRender(document.getElementById('ttest-se-formula-tex'),
        `SE = \\sqrt{s_p^2(\\frac{1}{n_1} + \\frac{1}{n_2})}`, true);

      // Display steps
      AppUtils.kRender(document.getElementById('ttest-n-tex'), `n_1 = ${result.n1}, \\quad n_2 = ${result.n2}`);
      AppUtils.kRender(document.getElementById('ttest-mean1-tex'), `\\bar{x}_1 = ${result.mean1.toFixed(4)}`);
      AppUtils.kRender(document.getElementById('ttest-mean2-tex'), `\\bar{x}_2 = ${result.mean2.toFixed(4)}`);
      AppUtils.kRender(document.getElementById('ttest-var1-tex'), `s_1^2 = ${result.var1.toFixed(4)}`);
      AppUtils.kRender(document.getElementById('ttest-var2-tex'), `s_2^2 = ${result.var2.toFixed(4)}`);

      const pooledVar = ((result.n1 - 1) * result.var1 + (result.n2 - 1) * result.var2) / (result.n1 + result.n2 - 2);
      AppUtils.kRender(document.getElementById('ttest-pooled-tex'), `s_p^2 = ${pooledVar.toFixed(4)}`);
      AppUtils.kRender(document.getElementById('ttest-se-tex'), `SE = ${result.se.toFixed(4)}`);
      AppUtils.kRender(document.getElementById('ttest-df-tex'), `df = ${result.df}`);

      // Calculate p-value based on test type
      const testType = this.statData.ttest.testType;
      let pValue;
      let hypothesisText = '';

      if (testType === 'two-tailed') {
        pValue = result.pValue; // Already two-tailed from calculator
        hypothesisText = 'μ₁ ≠ μ₂';
      } else if (testType === 'left') {
        // One-tailed left: H₁: μ₁ < μ₂ (or t < 0)
        pValue = this.statisticsCalculator.tCDF(-Math.abs(result.t), result.df);
        if (result.t < 0) {
          pValue = 1 - this.statisticsCalculator.tCDF(Math.abs(result.t), result.df);
        }
        hypothesisText = 'μ₁ < μ₂';
      } else { // right
        // One-tailed right: H₁: μ₁ > μ₂ (or t > 0)
        pValue = 1 - this.statisticsCalculator.tCDF(Math.abs(result.t), result.df);
        if (result.t < 0) {
          pValue = this.statisticsCalculator.tCDF(-Math.abs(result.t), result.df);
        }
        hypothesisText = 'μ₁ > μ₂';
      }

      document.getElementById('ttest-t-val').textContent = result.t.toFixed(6);
      document.getElementById('ttest-df-val').textContent = result.df;
      document.getElementById('ttest-t-abs').textContent = Math.abs(result.t).toFixed(4);
      document.getElementById('ttest-pval').textContent = pValue.toFixed(6);

      // P-value interpretation
      let pvalText = '';
      const testTypeLabel = testType === 'two-tailed' ? 'Two-tailed' :
                           testType === 'left' ? 'One-tailed (left)' : 'One-tailed (right)';

      if (pValue > 0.05) {
        pvalText = `${testTypeLabel} test: Not significant at α=0.05 (p = ${pValue.toFixed(4)} > 0.05). Fail to reject H₀. No evidence for H₁: ${hypothesisText}.`;
      } else if (pValue > 0.01) {
        pvalText = `${testTypeLabel} test: Significant at α=0.05 (p = ${pValue.toFixed(4)} < 0.05). Reject H₀. Evidence for H₁: ${hypothesisText}.`;
      } else {
        pvalText = `${testTypeLabel} test: Highly significant at α=0.01 (p = ${pValue.toFixed(4)} < 0.01). Strong evidence for H₁: ${hypothesisText}.`;
      }
      document.getElementById('ttest-pval-text').textContent = pvalText;

      // Draw distribution
      this.drawTDistribution(result.t, result.df, testType);

      document.getElementById('ttest-results').style.display = 'block';
      this.canvas.drawStatisticsPlot('plot-ttest', { group1, group2, mean1: result.mean1, mean2: result.mean2 }, 'ttest');
    } catch (e) {
      alert(e.message);
    }
  }

  calculateANOVA() {
    try {
      const groups = this.statData.anova.groups.filter(g => g.length > 0);
      if (groups.length < 2) {
        alert('Need at least 2 groups with data! Click canvas and use keys 1-5 to select groups, or use Sample Data.');
        return;
      }

      const result = this.statisticsCalculator.calculateANOVA(groups);

      // Display formulas
      AppUtils.kRender(document.getElementById('anova-formula-tex'),
        `F = \\frac{MS_{between}}{MS_{within}} = \\frac{SS_B / df_B}{SS_W / df_W}`, true);
      AppUtils.kRender(document.getElementById('anova-ssb-formula-tex'),
        `SS_B = \\sum_{j=1}^{k} n_j(\\bar{x}_j - \\bar{x}_{grand})^2`, true);
      AppUtils.kRender(document.getElementById('anova-ssw-formula-tex'),
        `SS_W = \\sum_{j=1}^{k} \\sum_{i=1}^{n_j} (x_{ij} - \\bar{x}_j)^2`, true);
      AppUtils.kRender(document.getElementById('anova-df-formula-tex'),
        `df_B = k - 1, \\quad df_W = N - k`, true);

      // Display steps
      AppUtils.kRender(document.getElementById('anova-grand-tex'), `\\bar{x}_{grand} = ${result.grandMean.toFixed(4)}`);
      const meansStr = result.groupMeans.map((m, i) => `\\bar{x}_{${i+1}} = ${m.toFixed(4)}`).join(', \\; ');
      AppUtils.kRender(document.getElementById('anova-means-tex'), meansStr);
      AppUtils.kRender(document.getElementById('anova-ssb-tex'), `SS_B = ${result.ssb.toFixed(4)}`);
      AppUtils.kRender(document.getElementById('anova-ssw-tex'), `SS_W = ${result.ssw.toFixed(4)}`);
      AppUtils.kRender(document.getElementById('anova-dfb-tex'), `df_B = k - 1 = ${result.dfb}`);
      AppUtils.kRender(document.getElementById('anova-dfw-tex'), `df_W = N - k = ${result.dfw}`);
      AppUtils.kRender(document.getElementById('anova-msb-tex'), `MS_B = SS_B / df_B = ${result.msb.toFixed(4)}`);
      AppUtils.kRender(document.getElementById('anova-msw-tex'), `MS_W = SS_W / df_W = ${result.msw.toFixed(4)}`);

      document.getElementById('anova-f-val').textContent = result.f.toFixed(6);
      document.getElementById('anova-df-val').textContent = `${result.dfb}, ${result.dfw}`;
      document.getElementById('anova-pval').textContent = result.pValue.toFixed(6);

      // P-value interpretation
      let pvalText = '';
      if (result.pValue > 0.05) {
        pvalText = `Not significant at α=0.05 (p = ${result.pValue.toFixed(4)} > 0.05). Fail to reject H₀: group means are not significantly different.`;
      } else if (result.pValue > 0.01) {
        pvalText = `Significant at α=0.05 (p = ${result.pValue.toFixed(4)} < 0.05). Reject H₀: at least one group mean differs.`;
      } else {
        pvalText = `Highly significant at α=0.01 (p = ${result.pValue.toFixed(4)} < 0.01). Strong evidence that group means differ.`;
      }
      document.getElementById('anova-pval-text').textContent = pvalText;

      // Draw distribution
      this.drawFDistribution(result.f, result.dfb, result.dfw);

      document.getElementById('anova-results').style.display = 'block';
      this.canvas.drawStatisticsPlot('plot-anova', result, 'anova');
    } catch (e) {
      alert(e.message);
    }
  }

  drawTDistribution(tStat, df, testType = 'two-tailed') {
    const canvas = document.getElementById('ttest-dist-plot');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    // Clear
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);

    const marginL = 40, marginR = 20, marginT = 20, marginB = 40;
    const plotW = w - marginL - marginR;
    const plotH = h - marginT - marginB;

    // Determine x range based on t-stat and df
    const tAbs = Math.abs(tStat);
    const xMax = Math.max(4, tAbs + 1);
    const xMin = -xMax;

    // Helper: t-distribution PDF
    const tPDF = (x, df) => {
      const num = Math.exp(this.statisticsCalculator.lnGamma((df + 1) / 2));
      const denom = Math.sqrt(df * Math.PI) * Math.exp(this.statisticsCalculator.lnGamma(df / 2));
      return (num / denom) * Math.pow(1 + (x * x) / df, -(df + 1) / 2);
    };

    // Find max y for scaling
    let maxY = tPDF(0, df);

    // Draw axes
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(marginL, marginT, plotW, plotH);

    // Draw t-distribution curve
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = xMin + (i / 200) * (xMax - xMin);
      const y = tPDF(x, df);
      const px = marginL + ((x - xMin) / (xMax - xMin)) * plotW;
      const py = marginT + plotH - (y / maxY) * plotH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Shade rejection regions based on test type
    ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';

    if (testType === 'two-tailed') {
      // Left tail
      ctx.beginPath();
      const leftCrit = -tAbs;
      for (let i = 0; i <= 100; i++) {
        const x = xMin + (i / 100) * (leftCrit - xMin);
        const y = tPDF(x, df);
        const px = marginL + ((x - xMin) / (xMax - xMin)) * plotW;
        const py = marginT + plotH - (y / maxY) * plotH;
        if (i === 0) {
          ctx.moveTo(px, marginT + plotH);
          ctx.lineTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.lineTo(marginL + ((leftCrit - xMin) / (xMax - xMin)) * plotW, marginT + plotH);
      ctx.closePath();
      ctx.fill();

      // Right tail
      ctx.beginPath();
      const rightCrit = tAbs;
      for (let i = 0; i <= 100; i++) {
        const x = rightCrit + (i / 100) * (xMax - rightCrit);
        const y = tPDF(x, df);
        const px = marginL + ((x - xMin) / (xMax - xMin)) * plotW;
        const py = marginT + plotH - (y / maxY) * plotH;
        if (i === 0) {
          ctx.moveTo(px, marginT + plotH);
          ctx.lineTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.lineTo(marginL + plotW, marginT + plotH);
      ctx.closePath();
      ctx.fill();
    } else if (testType === 'left') {
      // Shade left tail only (from -infinity to tStat)
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const x = xMin + (i / 100) * (tStat - xMin);
        const y = tPDF(x, df);
        const px = marginL + ((x - xMin) / (xMax - xMin)) * plotW;
        const py = marginT + plotH - (y / maxY) * plotH;
        if (i === 0) {
          ctx.moveTo(px, marginT + plotH);
          ctx.lineTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.lineTo(marginL + ((tStat - xMin) / (xMax - xMin)) * plotW, marginT + plotH);
      ctx.closePath();
      ctx.fill();
    } else { // right
      // Shade right tail only (from tStat to +infinity)
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const x = tStat + (i / 100) * (xMax - tStat);
        const y = tPDF(x, df);
        const px = marginL + ((x - xMin) / (xMax - xMin)) * plotW;
        const py = marginT + plotH - (y / maxY) * plotH;
        if (i === 0) {
          ctx.moveTo(px, marginT + plotH);
          ctx.lineTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.lineTo(marginL + plotW, marginT + plotH);
      ctx.closePath();
      ctx.fill();
    }

    // Draw vertical line for observed t-statistic
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3;
    const tPx = marginL + ((tStat - xMin) / (xMax - xMin)) * plotW;
    ctx.beginPath();
    ctx.moveTo(tPx, marginT);
    ctx.lineTo(tPx, marginT + plotH);
    ctx.stroke();

    // Draw x-axis labels
    ctx.fillStyle = '#374151';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
      const px = marginL + ((x - xMin) / (xMax - xMin)) * plotW;
      ctx.fillText(x.toFixed(0), px, h - marginB + 15);
    }

    // Label
    ctx.fillText('t-value', w / 2, h - 5);
  }

  drawFDistribution(fStat, df1, df2) {
    const canvas = document.getElementById('anova-dist-plot');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    // Clear
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);

    const marginL = 40, marginR = 20, marginT = 20, marginB = 40;
    const plotW = w - marginL - marginR;
    const plotH = h - marginT - marginB;

    // Determine x range
    const xMin = 0;
    const xMax = Math.max(6, fStat + 1);

    // Helper: F-distribution PDF approximation
    const fPDF = (x, d1, d2) => {
      if (x <= 0) return 0;
      const a = d1 / 2;
      const b = d2 / 2;
      const num = Math.exp(this.statisticsCalculator.lnGamma(a + b) - this.statisticsCalculator.lnGamma(a) - this.statisticsCalculator.lnGamma(b));
      const pow1 = Math.pow(d1 / d2, a);
      const pow2 = Math.pow(x, a - 1);
      const pow3 = Math.pow(1 + (d1 * x) / d2, -(a + b));
      return num * pow1 * pow2 * pow3;
    };

    // Find max y for scaling
    let maxY = 0;
    for (let i = 0; i <= 200; i++) {
      const x = xMin + (i / 200) * (xMax - xMin);
      const y = fPDF(x, df1, df2);
      if (y > maxY) maxY = y;
    }

    // Draw axes
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(marginL, marginT, plotW, plotH);

    // Draw F-distribution curve
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = xMin + (i / 200) * (xMax - xMin);
      const y = fPDF(x, df1, df2);
      const px = marginL + ((x - xMin) / (xMax - xMin)) * plotW;
      const py = marginT + plotH - (y / maxY) * plotH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Shade rejection region (right tail)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const x = fStat + (i / 100) * (xMax - fStat);
      const y = fPDF(x, df1, df2);
      const px = marginL + ((x - xMin) / (xMax - xMin)) * plotW;
      const py = marginT + plotH - (y / maxY) * plotH;
      if (i === 0) {
        ctx.moveTo(px, marginT + plotH);
        ctx.lineTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.lineTo(marginL + plotW, marginT + plotH);
    ctx.closePath();
    ctx.fill();

    // Draw vertical line for observed F-statistic
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3;
    const fPx = marginL + ((fStat - xMin) / (xMax - xMin)) * plotW;
    ctx.beginPath();
    ctx.moveTo(fPx, marginT);
    ctx.lineTo(fPx, marginT + plotH);
    ctx.stroke();

    // Draw x-axis labels
    ctx.fillStyle = '#374151';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    for (let x = 0; x <= Math.floor(xMax); x++) {
      const px = marginL + ((x - xMin) / (xMax - xMin)) * plotW;
      ctx.fillText(x.toFixed(0), px, h - marginB + 15);
    }

    // Label
    ctx.fillText('F-value', w / 2, h - 5);
  }

  initializeFormulas() {
    AppUtils.kRender(document.getElementById('ols-formula'),
      `\\beta=(X^{\\top}X)^{-1}X^{\\top}y,\\quad X=\\begin{bmatrix}x_1&1\\\\\\vdots&\\vdots\\\\x_n&1\\end{bmatrix},\\; \\beta=\\begin{bmatrix}m\\\\b\\end{bmatrix}`, true);
    AppUtils.kRender(document.getElementById('gd-h-formula'), `h_i = m\\,x_i + b`);
    AppUtils.kRender(document.getElementById('gd-j-formula'), `J=\\tfrac{1}{2n}\\sum (h_i-y_i)^2`);
    AppUtils.kRender(document.getElementById('gd-grads-formula'),
      `\\frac{\\partial J}{\\partial m}=\\tfrac{1}{n}\\sum x_i(h_i-y_i),\\; \\frac{\\partial J}{\\partial b}=\\tfrac{1}{n}\\sum (h_i-y_i)`);
    AppUtils.kRender(document.getElementById('gd-update-formula'),
      `m\\leftarrow m-\\eta\\,\\tfrac{\\partial J}{\\partial m},\\; b\\leftarrow b-\\eta\\,\\tfrac{\\partial J}{\\partial b}`);
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.App = new App();
});
