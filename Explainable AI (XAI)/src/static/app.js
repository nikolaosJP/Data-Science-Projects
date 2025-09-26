// ============================================================================
// MAIN APPLICATION
// ============================================================================

class App {
  constructor() {
    this.points = [];
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
    
    this.setupEventHandlers();
    this.initializeFormulas();
    this.canvas.draw(this.activeTab, this.points, this.models, this.showResiduals);
    AppUtils.kFlush();
  }

  setupEventHandlers() {
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
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.App = new App();
});
