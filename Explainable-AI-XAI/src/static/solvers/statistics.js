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

// Export classes to global scope
window.StatisticsCalculator = StatisticsCalculator;
