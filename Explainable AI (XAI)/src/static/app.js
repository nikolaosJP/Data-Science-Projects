// ============================================================================
// MAIN APPLICATION
// ============================================================================

class App {
  constructor() {
    this.points = [];
    this.activeCategory = 'regression';
    this.activeTab = 'ols';
    this.showResiduals = true;
    this.models = {
      ols: {m: 0, b: 0, fitted: false},
      gd: {m: 0, b: 0, fitted: false},
      manual: {m: 0, b: 0, fitted: false}
    };

    this.canvas = new CanvasHandler();
    this.olsSolver = new OLSSolver();
    this.gradientDescent = new GradientDescent();
    this.manualCalculator = new ManualCalculator();
    this.statisticsCalculator = new StatisticsCalculator();

    this.setupEventHandlers();
    this.initializeFormulas();
    this.canvas.draw(this.activeTab, this.points, this.models, this.showResiduals);
    AppUtils.kFlush();
  }

  setupEventHandlers() {
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchCategory(tab.dataset.category));
    });

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // Controls
    document.getElementById('solve-ols').onclick = () => this.solveOLS();
    document.getElementById('init-gd').onclick = () => this.initializeGD();
    document.getElementById('next-step').onclick = () => this.nextGDStep();
    document.getElementById('auto-run').onclick = () => this.autoRunGD();
    document.getElementById('reset-gd').onclick = () => this.resetGD();
    document.getElementById('calculate-manual').onclick = () => this.calculateManual();
    document.getElementById('clear').onclick = () => this.clear();
    document.getElementById('sample').onclick = () => this.generateSample();
    document.getElementById('residuals').onchange = e => {
      this.showResiduals = e.target.checked;
      this.canvas.draw(this.activeTab, this.points, this.models, this.showResiduals);
    };

    const corrBtn = document.getElementById('compute-corr');
    if (corrBtn) corrBtn.onclick = () => this.computeCorrelation();
    const ttestBtn = document.getElementById('compute-ttest');
    if (ttestBtn) ttestBtn.onclick = () => this.computeTTest();
    const anovaBtn = document.getElementById('compute-anova');
    if (anovaBtn) anovaBtn.onclick = () => this.computeAnova();
  }

  switchCategory(category) {
    if (this.activeCategory === category) return;
    document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.category-content').forEach(cont => cont.classList.remove('active'));
    const tab = document.querySelector(`.category-tab[data-category="${category}"]`);
    const content = document.getElementById(`category-${category}`);
    if (tab && content) {
      tab.classList.add('active');
      content.classList.add('active');
      this.activeCategory = category;
      if (category === 'regression') {
        this.canvas.draw(this.activeTab, this.points, this.models, this.showResiduals);
        this.canvas.drawLossPlot(this.gradientDescent.lossHistory);
      }
    }
  }

  switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
    this.activeTab = tab;
    this.canvas.draw(this.activeTab, this.points, this.models, this.showResiduals);
    this.canvas.drawLossPlot(this.gradientDescent.lossHistory);
  }

  addPoint(point) {
    this.points.push(point);
    this.canvas.draw(this.activeTab, this.points, this.models, this.showResiduals);
    this.canvas.drawLossPlot(this.gradientDescent.lossHistory);
  }

  removePoint(index) {
    this.points.splice(index, 1);
    this.canvas.draw(this.activeTab, this.points, this.models, this.showResiduals);
    this.canvas.drawLossPlot(this.gradientDescent.lossHistory);
  }

  updatePoint(index, point) {
    this.points[index] = point;
    this.canvas.draw(this.activeTab, this.points, this.models, this.showResiduals);
    this.canvas.drawLossPlot(this.gradientDescent.lossHistory);
  }

  getPoints() { return this.points; }

  solveOLS() {
    try {
      this.models.ols = this.olsSolver.solve(this.points);
      this.olsSolver.displaySteps(this.points, this.models.ols);
      this.olsSolver.updateDisplay(this.points, this.models.ols);
      this.canvas.draw(this.activeTab, this.points, this.models, this.showResiduals);
    } catch (e) {
      alert(e.message);
    }
  }

  initializeGD() {
    try {
      this.models.gd = this.gradientDescent.initialize(this.points);
      this.canvas.draw(this.activeTab, this.points, this.models, this.showResiduals);
    } catch (e) {
      alert(e.message);
    }
  }

  nextGDStep() {
    this.models.gd = this.gradientDescent.executeStep(this.points, this.models.gd);
    this.canvas.draw(this.activeTab, this.points, this.models, this.showResiduals);
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
        this.canvas.draw(this.activeTab, this.points, this.models, this.showResiduals);
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
    this.canvas.draw(this.activeTab, this.points, this.models, this.showResiduals);
    this.canvas.drawLossPlot(this.gradientDescent.lossHistory);
  }

  calculateManual() {
    try {
      this.models.manual = this.manualCalculator.calculate(this.points);
      this.canvas.draw(this.activeTab, this.points, this.models, this.showResiduals);
    } catch (e) {
      alert(e.message);
    }
  }

  clear() {
    this.points = [];
    this.models = {ols: {m:0, b:0, fitted:false}, gd: {m:0, b:0, fitted:false}, manual: {m:0, b:0, fitted:false}};
    this.gradientDescent.stopAutoRun();
    this.gradientDescent.reset();
    document.getElementById('next-step').disabled = true;
    document.getElementById('ols-calculations').style.display = 'none';
    document.getElementById('manual-calculations').style.display = 'none';
    for (let i = 0; i <= 4; i++) {
      const el = document.getElementById(`step-${i}`);
      if (el) el.style.display = 'none';
    }
    this.gradientDescent.updateStepDisplay();
    this.canvas.draw(this.activeTab, this.points, this.models, this.showResiduals);
    this.canvas.drawLossPlot(this.gradientDescent.lossHistory);
  }

  generateSample() {
    this.points = [];
    const n = 30;
    for (let i = 0; i < n; i++) {
      const x = i * 10 / (n - 1);
      const y = 0.7 * x + 1.5 + (Math.random() - 0.5) * 2.0;
      this.points.push({
        x: Math.max(0, Math.min(10, x)),
        y: Math.max(0, Math.min(10, y))
      });
    }
    this.canvas.draw(this.activeTab, this.points, this.models, this.showResiduals);
    this.canvas.drawLossPlot(this.gradientDescent.lossHistory);
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
    AppUtils.kRender(document.getElementById('corr-formula'),
      `r=\\frac{\\sum (x_i-\\bar{x})(y_i-\\bar{y})}{\\sqrt{\\sum (x_i-\\bar{x})^2\\sum (y_i-\\bar{y})^2}}`);
    AppUtils.kRender(document.getElementById('ttest-formula'),
      `t=\\frac{\\bar{x}_1-\\bar{x}_2}{\\sqrt{\\tfrac{s_1^2}{n_1}+\\tfrac{s_2^2}{n_2}}}`);
    AppUtils.kRender(document.getElementById('anova-formula'),
      `F=\\frac{MS_B}{MS_W}=\\frac{\\tfrac{\\sum n_j(\\bar{x}_j-\\bar{x})^2}{k-1}}{\\tfrac{\\sum (x_{ij}-\\bar{x}_j)^2}{N-k}}`);
  }

  computeCorrelation() {
    try {
      const xs = AppUtils.parseNumberList(document.getElementById('stats-x-input').value);
      const ys = AppUtils.parseNumberList(document.getElementById('stats-y-input').value);
      const result = this.statisticsCalculator.correlation(xs, ys);
      document.getElementById('corr-n').textContent = result.n;
      document.getElementById('corr-cov').textContent = AppUtils.formatNumber(result.covariance);
      document.getElementById('corr-r').textContent = AppUtils.formatNumber(result.correlation);
    } catch (e) {
      alert(e.message);
    }
  }

  computeTTest() {
    try {
      const groupA = AppUtils.parseNumberList(document.getElementById('ttest-group-a').value);
      const groupB = AppUtils.parseNumberList(document.getElementById('ttest-group-b').value);
      const result = this.statisticsCalculator.tTest(groupA, groupB);
      document.getElementById('ttest-t').textContent = AppUtils.formatNumber(result.t);
      document.getElementById('ttest-df').textContent = AppUtils.formatNumber(result.df, 2);
      document.getElementById('ttest-p').textContent = AppUtils.formatNumber(result.p, 4);
    } catch (e) {
      alert(e.message);
    }
  }

  computeAnova() {
    try {
      const groups = Array.from(document.querySelectorAll('.anova-group'))
        .map(el => AppUtils.parseNumberList(el.value));
      const result = this.statisticsCalculator.anova(groups);
      document.getElementById('anova-f').textContent = AppUtils.formatNumber(result.f);
      document.getElementById('anova-df1').textContent = AppUtils.formatNumber(result.df1, 2);
      document.getElementById('anova-df2').textContent = AppUtils.formatNumber(result.df2, 2);
      document.getElementById('anova-p').textContent = AppUtils.formatNumber(result.p, 4);
    } catch (e) {
      alert(e.message);
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.App = new App();
});
