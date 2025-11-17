# Machine Learning & Statistics Learning Platform

An interactive web application for learning machine learning algorithms and statistical methods through visualization. Click to add data, see algorithms work step-by-step, and build intuition through real-time feedback.

![Application Screenshot](screenshots/app-preview.png)

## Features

**Linear Models**: OLS, Gradient Descent with loss visualization, Manual calculations (TSS/ESS/RSS), Logistic Regression with classification metrics

**Nonlinear Models**: Decision Tree with step-by-step building, Random Forest with bootstrap sampling and OOB validation, XGBoost with iterative boosting and loss history, Neural Network (MLP) with backpropagation, L2 regularization, and dropout. Supports both regression and classification tasks.

**Statistics**: Pearson Correlation, Two-sample t-Test, One-way ANOVA with distribution visualizations

**Recommendation Systems**: Content-Based Filtering with item features and user profiles, Collaborative Filtering with matrix factorization. Implements standard item-based collaborative filtering formula with similarity measures (cosine, Euclidean). Interactive rating matrix editor with step-by-step algorithm explanations.

## Setup

```bash
pip install -r requirements.txt
python src/app.py
```

Visit http://127.0.0.1:5000

## Usage

**Linear Models tabs**: Click to add points, drag to move, right-click to delete. Use "Solve" to fit model. Gradient Descent shows step-by-step optimization. Logistic Regression: Select group, add points, click "Initialize" then "Auto" to train.

**Nonlinear Models tabs**: Select task type (regression/classification), add points, and build models. Decision Tree shows recursive partitioning, Random Forest displays ensemble predictions with OOB scores, XGBoost demonstrates sequential boosting with loss curves, Neural Network shows backpropagation with configurable architecture and hyperparameters (learning rate, L2 regularization, dropout, max epochs).

**Statistics tabs**: Add data points by clicking canvas regions. View detailed calculations, test statistics, and distribution plots.

**Recommendation Systems tab**: Edit user-movie rating matrix and movie feature matrix directly in the tables. Content-Based: Select similarity measure, compute recommendations based on movie features and user preferences. Collaborative Filtering: Initialize matrix factorization, train with gradient descent to learn latent factors. View step-by-step formula derivations, loss curves, and predicted ratings with detailed tooltips.

## Architecture

- **Backend**: Flask 3.0.0 serving static files
- **Frontend**: Vanilla JavaScript (utils.js, solvers.js, app.js), KaTeX for formulas, Canvas API for rendering

