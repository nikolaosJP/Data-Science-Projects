# Recommendation Systems

A movie recommendation system implementation using MovieLens 100K dataset, demonstrating collaborative filtering techniques from traditional matrix factorization to deep learning approaches.

## Overview

**Pipeline**: Candidate Generation → Scoring → Re-ranking
**Techniques**: Collaborative Filtering (Matrix Factorization & Neural Networks)
**Dataset**: MovieLens 100K (100K ratings, 943 users, 1,682 movies)

## Model Performance

All models were evaluated on held-out test data:

- **Matrix Factorization (SVD)**:
  - Test RMSE: ~0.95
  - Interpretation: Predictions are off by about 0.95 rating points on average (on a 1-5 scale)

- **Neural Collaborative Filtering (NCF)**:
  - Test RMSE: ~0.92
  - Interpretation: Slightly better performance (~3% improvement), predictions off by 0.92 points

**Context**: An RMSE of ~0.9 on a 5-point scale means the model is accurate to within about 1 star, which is reasonable for real-world recommendation systems. Lower RMSE indicates better predictive accuracy.

## Technologies

PyTorch, Polars, NumPy, Scikit-learn, SciPy, Matplotlib, Seaborn

## Usage

```bash
uv pip install numpy polars matplotlib seaborn scipy scikit-learn torch
jupyter notebook Recommendation_System.ipynb
```

## Key Features

- **Matrix Factorization (SVD)**: Efficient baseline using singular value decomposition
- **Neural Networks (MLP)**: Deep learning approach with embedding layers
- **Complete Pipeline**: From data loading to model evaluation with visualizations
