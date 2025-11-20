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
          step3Tex += `s(${i+1},${j+1}) = 1.00 \\text{ (self)}\\,`;
        } else {
          if (similarityType === 'cosine') {
            const dotProduct = movieFeatures[i].reduce((sum, val, k) => sum + val * movieFeatures[j][k], 0);
            const normI = Math.sqrt(movieFeatures[i].reduce((sum, val) => sum + val * val, 0));
            const normJ = Math.sqrt(movieFeatures[j].reduce((sum, val) => sum + val * val, 0));
            score = (normI === 0 || normJ === 0) ? 0 : dotProduct / (normI * normJ);

            step3Tex += `s(${i+1},${j+1}) = ${score.toFixed(2)}\\,`;
          } else {
            const squaredDiffs = movieFeatures[i].map((val, k) => Math.pow(val - movieFeatures[j][k], 2));
            const distance = Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0));
            // Convert distance to similarity: s = 1/(1+d)
            score = 1.0 / (1.0 + distance);

            step3Tex += `d(${i+1},${j+1}) = ${distance.toFixed(2)}, s(${i+1},${j+1}) = ${score.toFixed(2)}\\,`;
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

// Export classes to global scope
window.RecommendationSystem = RecommendationSystem;
window.ContentBasedFiltering = ContentBasedFiltering;
window.CollaborativeFiltering = CollaborativeFiltering;
