#19 - An Introduction to Feature Selection

# Libraries
# Package names
packages <- c("AppliedPredictiveModeling", "caret", "klaR", 
              "leaps", "MASS", "pROC", "rms", "stats")

# Install packages not yet installed
installed_packages <- packages %in% rownames(installed.packages())
if (any(installed_packages == FALSE)) {
  install.packages(packages[!installed_packages])
}

# Packages loading
invisible(lapply(packages, library, character.only = TRUE))

## Computing

#The
following code was used to prepare the data for analysis:
data(AlzheimerDisease)
## Manually create new dummy variables
predictors$E2 <- predictors$E3 <- predictors$E4 <- 0
predictors$E2[grepl("2", predictors$Genotype)] <- 1
predictors$E3[grepl("3", predictors$Genotype)] <- 1
predictors$E4[grepl("4", predictors$Genotype)] <- 1

## Split the data using stratified sampling
set.seed(730)
split <- createDataPartition(diagnosis, p = .8, list = FALSE)
## Combine into one data frame
adData <- predictors
adData$Class <- diagnosis
training <- adData[ split, ]
testing <- adData[-split, ]
## Save a vector of predictor variable names
predVars <- names(adData)[!(names(adData) %in% c("Class", "Genotype"))]
## Compute the area under the ROC curve, sensitivity, specificity,
## accuracy and Kappa

fiveStats <- function(...) c(twoClassSummary(...),
                                 + defaultSummary(...))
## Create resampling data sets to use for all models
set.seed(104)
index <- createMultiFolds(training$Class, times = 5)
## Create a vector of subset sizes to evaluate
varSeq <- seq(1, length(predVars)-1, by = 2)

## Forward, Backward, and Stepwise Selection

initial <- glm(Class ~ tau + VEGF + E4 + IL_3, data = training,
                 family = binomial)

stepAIC(initial, direction = "both")

## Recursive Feature Elimination


## The built-in random forest functions are in rfFuncs.
  str(rfFuncs)

newRF <- rfFuncs
newRF$summary <- fiveStats

#To run the RFE procedure for random forests, the syntax is
## The control function is similar to trainControl():
ctrl <- rfeControl(method = "repeatedcv",
                       repeats = 5,
                       verbose = TRUE,
                       functions = newRF,
                       index = index)
set.seed(721)
rfRFE <- rfe(x = training[, predVars],
               y = training$Class,
               sizes = varSeq,
               metric = "ROC",
               rfeControl = ctrl,
               ## now pass options to randomForest()
               ntree = 1000)
rfRFE

predict(rfRFE, head(testing))
 
svmFuncs <- caretFuncs
svmFuncs$summary <- fivestats
ctrl <- rfeControl(method = "repeatedcv",
                      repeats = 5,
                      verbose = TRUE,
                      functions = svmFuncs,
                      index = index)
set.seed(721)
svmRFE <- rfe(x = training[, predVars],
                 y = training$Class,
                 sizes = varSeq,
                 metric = "ROC",
                 rfeControl = ctrl,
                 ## Now options to train()
                 method = "svmRadial",
                 tuneLength = 12,
                 preProc = c("center", "scale"),
                 ## Below specifies the inner resampling process
                   trControl = trainControl(method = "cv",
                                              verboseIter = FALSE,
                                              classProbs = TRUE))
svmRFE
 
 ## Filter Methods
 
 pScore <- function(x, y)
   {
     numX <- length(unique(x))
     if(numX > 2)
       {
         ## With many values in x, compute a t-test
           out <- t.test(x ~ y)$p.value
           } else {
             ## For binary predictors, test the odds ratio == 1 via
               ## Fisher's Exact Test
               out <- fisher.test(factor(x), y)$p.value
               }
     out
     }
## Apply the scores to each of the predictor columns
   scores <- apply(X = training[, predVars],
                     MARGIN = 2,
                     FUN = pScore,
                     y = training$Class)
tail(scores)
 
#A function can also be designed to apply a p-value correction, such as the
Bonferroni procedure:
   pCorrection <- function (score, x, y)
     {
       ## The options x and y are required by the caret package
         ## but are not used here
         score <- p.adjust(score, "bonferroni")
         ## Return a logical vector to decide which predictors
           ## to retain after the filter
           keepers <- (score <= 0.05)
           keepers
           }
tail(pCorrection(scores))
str(ldaSBF)
 
#For the biomarker data, the filtered LDA model was fit using
ldaWithPvalues <- ldaSBF
ldaWithPvalues$score <- pScore
ldaWithPvalues$summary <- fiveStats
ldaWithPvalues$filter <- pCorrection
sbfCtrl <- sbfControl(method = "repeatedcv",
                         repeats = 5,
                         verbose = TRUE,
                         functions = ldaWithPvalues,
                         index = index)
ldaFilter <- sbf(training[, predVars],
                    training$Class,
                    tol = 1.0e-12,
                    sbfControl = sbfCtrl)
ldaFilter
 
# Exercise 19.1

library(caret)
library(AppliedPredictiveModeling)
data(AlzheimerDisease)

# Lets look at the code for this chapter using the command:
#
# scriptLocation()
#
# We will use some of the code there for this problem
#--

# We start by loaing in the data exactly as is done in the .R file for this chapter:
#

## The baseline set of predictors
bl <- c("Genotype", "age", "tau", "p_tau", "Ab_42", "male")

## The set of new assays
newAssays <- colnames(predictors)
newAssays <- newAssays[!(newAssays %in% c("Class", bl))]

## Decompose the genotype factor into binary dummy variables

predictors$E2 <- predictors$E3 <- predictors$E4 <- 0
predictors$E2[grepl("2", predictors$Genotype)] <- 1
predictors$E3[grepl("3", predictors$Genotype)] <- 1
predictors$E4[grepl("4", predictors$Genotype)] <- 1
genotype <- predictors$Genotype

## Partition the data
library(caret)
set.seed(730)
split <- createDataPartition(diagnosis, p = .8, list = FALSE)

adData <- predictors
adData$Class <- diagnosis

training <- adData[ split, ]
testing <- adData[-split, ]

predVars <- names(adData)[!(names(adData) %in% c("Class","Genotype"))]

## This summary function is used to evaluate the models.
fiveStats <- function(...) c(twoClassSummary(...), defaultSummary(...))

## We create the cross-validation files as a list to use with different
## functions

set.seed(104)
index <- createMultiFolds(training$Class, times = 5)

## The candidate set of the number of predictors to evaluate
varSeq <- seq(1, length(predVars)-1, by = 2)

## We can also use parallel processing to run each resampled RFE
## iteration (or resampled model with train()) using different
## workers.

library(doMC)
registerDoMC(num_processors_to_use)

## The rfe() function in the caret package is used for recursive feature
## elimination. We setup control functions for this and train() that use
## the same cross-validation folds. The 'ctrl' object will be modifed several 
## times as we try different models

ctrl <- rfeControl(method = "repeatedcv", repeats = 5,
                   saveDetails = TRUE,
                   index = index,
                   returnResamp = "final")

fullCtrl <- trainControl(method = "repeatedcv",
                         repeats = 5,
                         summaryFunction = fiveStats,
                         classProbs = TRUE,
                         index = index)

## The original correlation matrix of the new data without dropping highly correlated features:
predCor <- cor(training[, newAssays])

library(RColorBrewer)
cols <- c(rev(brewer.pal(7, "Blues")), brewer.pal(7, "Reds"))
library(corrplot)
corrplot(predCor, order = "hclust", tl.pos = "n", addgrid.col = rgb(1,1,1,.01), col = colorRampPalette(cols)(51))

#
# Part (a):
#
predictors_to_drop = findCorrelation( predCor, cutoff=0.75 )
print( "Predictors to drop ... as they are too correlated" )
print( newAssays[ predictors_to_drop ] )

#--
# Drop these correlated predictors:
#--
newAssays = newAssays[ -predictors_to_drop ]
training = training[, -predictors_to_drop ]
testing = testing[, -predictors_to_drop ]
predVars = newAssays

# Replot the correlation plot with these highly correlated predictors dropped:
#
cols <- c(rev(brewer.pal(7, "Blues")), brewer.pal(7, "Reds"))
library(corrplot)
corrplot(cor(training[,newAssays]), order = "hclust", tl.pos = "n",addgrid.col = rgb(1,1,1,.01), col = colorRampPalette(cols)(51))

#
# Part (b): With this reduced features selection we now try to perform recursive feature selection:
#
# Again borrowed from the code location above:
#
## Now fit the RFE versions. To do this, the 'functions' argument of the rfe()
## object is modified to the approproate functions. For model details about
## these functions and their arguments, see
## 
## http://caret.r-forge.r-project.org/featureSelection.html
##
## for more information.
#

ctrl$functions <- rfFuncs
ctrl$functions$summary <- fiveStats
set.seed(721)
rfRFE <- rfe(training[, predVars],
             training$Class,
             sizes = varSeq,
             metric = "ROC",
             ntree = 1000,
             rfeControl = ctrl)
rfRFE

ctrl$functions <- ldaFuncs
ctrl$functions$summary <- fiveStats
set.seed(721)
ldaRFE <- rfe(training[, predVars],
              training$Class,
              sizes = varSeq,
              metric = "ROC",
              tol = 1.0e-12,
              rfeControl = ctrl)
ldaRFE

ctrl$functions <- nbFuncs
ctrl$functions$summary <- fiveStats
set.seed(721)
nbRFE <- rfe(training[, predVars],
             training$Class,
             sizes = varSeq,
             metric = "ROC",
             rfeControl = ctrl)
nbRFE

## This options tells train() to run it's model tuning
## sequentially. Otherwise, there would be parallel processing at two
## levels, which is possible but requires W^2 workers. On our machine,
## it was more efficient to only run the RFE process in parallel.

cvCtrl <- trainControl(method = "cv",
                       verboseIter = FALSE,
                       classProbs = TRUE,
                       allowParallel = FALSE)

## Here, the caretFuncs list allows for a model to be tuned at each iteration
## of feature seleciton.
##
ctrl$functions <- caretFuncs
ctrl$functions$summary <- fiveStats
set.seed(721)
smvRFE <- rfe(training[, predVars],
              training$Class, 
              sizes = varSeq,
              rfeControl = ctrl,
              metric = "ROC", 
              ## Now arguments to train() are used.
              method = "svmRadial",
              tuneLength = 12, 
              preProc = c("center", "scale"),
              trControl = cvCtrl)
smvRFE

ctrl$functions <- lrFuncs
ctrl$functions$summary <- fiveStats
set.seed(721)
lrRFE <- rfe(training[, predVars],
             training$Class,
             sizes = varSeq,
             metric = "ROC",
             rfeControl = ctrl)
lrRFE

ctrl$functions <- caretFuncs
ctrl$functions$summary <- fiveStats
set.seed(721)
knnRFE <- rfe(training[, predVars],
              training$Class,
              sizes = varSeq,
              metric = "ROC",
              method = "knn",
              tuneLength = 20,
              preProc = c("center", "scale"),
              trControl = cvCtrl,
              rfeControl = ctrl)
knnRFE

# Here we want to plot the same profiles as in Figure 19.5 (Page 506) we could use:
# 
# http://www.cookbook-r.com/Graphs/Facets_%28ggplot2%29/
#

# Extract the (x,y) points from the "plot" command:
#
p_lda = plot(ldaRFE)
p_rf = plot(rfRFE)
p_nb = plot(nbRFE)
p_lr = plot(lrRFE)
p_knn = plot(knnRFE)
p_svm = plot(smvRFE)

# Plot these in the same "format" as the figure in the book:
#
min_y = min( p_lda$panel.args[[1]]$y, p_rf$panel.args[[1]]$y, p_nb$panel.args[[1]]$y, p_lr$panel.args[[1]]$y, p_knn$panel.args[[1]]$y, p_svm$panel.args[[1]]$y )
max_y = max( p_lda$panel.args[[1]]$y, p_rf$panel.args[[1]]$y, p_nb$panel.args[[1]]$y, p_lr$panel.args[[1]]$y, p_knn$panel.args[[1]]$y, p_svm$panel.args[[1]]$y )

par(mfrow=c(3,2))
plot( p_lda$panel.args[[1]]$x, p_lda$panel.args[[1]]$y, ylim=c(min_y,max_y), xlab="", ylab="", main="LDA" )
plot( p_rf$panel.args[[1]]$x, p_rf$panel.args[[1]]$y, ylim=c(min_y,max_y), xlab="", ylab="", main="RF" )
plot( p_nb$panel.args[[1]]$x, p_nb$panel.args[[1]]$y, ylim=c(min_y,max_y), xlab="", ylab="ROC", main="NB" )
plot( p_lr$panel.args[[1]]$x, p_lr$panel.args[[1]]$y, ylim=c(min_y,max_y), xlab="", ylab="ROC", main="LR" )
plot( p_knn$panel.args[[1]]$x, p_knn$panel.args[[1]]$y, ylim=c(min_y,max_y), xlab="Number of Predictors", ylab="", main="KNN" )
plot( p_svm$panel.args[[1]]$x, p_svm$panel.args[[1]]$y, ylim=c(min_y,max_y), xlab="Number of Predictors", ylab="", main="SVM" )
grid()
par(mfrow=c(1,1))

# Exercise 19.2

library(caret)
library(AppliedPredictiveModeling)
data(AlzheimerDisease)

# Lets look at the code for this chapter from the book.  The location of that code can be found using the command:
#
# scriptLocation()
#

# We start by loading in the data exactly as is done in the .R file for this chapter:
#

## The baseline set of predictors
bl <- c("Genotype", "age", "tau", "p_tau", "Ab_42", "male")

## The set of new assays
newAssays <- colnames(predictors)
newAssays <- newAssays[!(newAssays %in% c("Class", bl))]

## Decompose the genotype factor into binary dummy variables

predictors$E2 <- predictors$E3 <- predictors$E4 <- 0
predictors$E2[grepl("2", predictors$Genotype)] <- 1
predictors$E3[grepl("3", predictors$Genotype)] <- 1
predictors$E4[grepl("4", predictors$Genotype)] <- 1
genotype <- predictors$Genotype

## Partition the data
library(caret)
set.seed(730)
split <- createDataPartition(diagnosis, p = .8, list = FALSE)

adData <- predictors
adData$Class <- diagnosis

training <- adData[ split, ]
testing <- adData[-split, ]

predVars <- names(adData)[!(names(adData) %in% c("Class","Genotype"))]

## This summary function is used to evaluate the models.
fiveStats <- function(...) c(twoClassSummary(...), defaultSummary(...))

## We create the cross-validation files as a list to use with different 
## functions

set.seed(104)
index <- createMultiFolds(training$Class, times = 5)

## The candidate set of the number of predictors to evaluate
varSeq <- seq(1, length(predVars)-1, by = 2)

## We can also use parallel processing to run each resampled RFE
## iteration (or resampled model with train()) using different
## workers.
library(doMC)
registerDoMC(num_processors_to_use)

## The rfe() function in the caret package is used for recursive feature
## elimiation. We setup control functions for this and train() that use
## the same cross-validation folds. The 'Ctrl' object will be modifed several 
## times as we try different models

ctrl <- rfeControl(method = "repeatedcv", repeats = 5,
                   saveDetails = TRUE,
                   index = index,
                   returnResamp = "final")

fullCtrl <- trainControl(method = "repeatedcv", repeats = 5,
                         summaryFunction = fiveStats,
                         classProbs = TRUE,
                         index = index)

## This options tells train() to run it's model tuning
## sequentially. Otherwise, there would be parallel processing at two
## levels, which is possible but requires W^2 workers. On our machine,
## it was more efficient to only run the REF process in parallel.

cvCtrl <- trainControl(method = "cv",
                       verboseIter = FALSE,
                       classProbs = TRUE,
                       allowParallel = FALSE)

#--
# Fit the full model (using all predictors) under RFE using train with method="sparseLDA"
#--
ctrl$functions <- caretFuncs
ctrl$functions$summary <- fiveStats
set.seed(721)
sparseLDA_full <- rfe(training[, predVars],
                      training$Class,
                      sizes = varSeq,
                      rfeControl = ctrl,
                      metric = "ROC",
                      ## Now arguments to train() are used.
                      method = "sparseLDA",
                      tuneLength = 5,
                      trControl = cvCtrl)
sparseLDA_full


#--
# Fit the reduced model (using smaller predictor set) under RFE using train with method="sparseLDA"
#--

predCor <- cor(training[, newAssays])
predictors_to_drop = findCorrelation( predCor, cutoff=0.75 )
print( "Predictors to drop ... as they are too correlated" )
print( newAssays[ predictors_to_drop ] )

newAssays = newAssays[ -predictors_to_drop ]
training = training[, -predictors_to_drop ]
testing = testing[, -predictors_to_drop ]
predVars = newAssays

ctrl$functions <- caretFuncs
ctrl$functions$summary <- fiveStats
set.seed(721)
sparseLDA_filter <- rfe(training[, predVars],
                        training$Class,
                        sizes = varSeq,
                        rfeControl = ctrl,
                        metric = "ROC",
                        ## Now arguments to train() are used.
                        method = "sparseLDA",
                        tuneLength = 5,
                        trControl = cvCtrl)
sparseLDA_filter


# Lets plot the performance profiles for each of these two

# Extract the (x,y) points from the "plot" command:
#
p_full = plot(sparseLDA_full)
p_filter = plot(sparseLDA_filter)

# Plot these in the same "format" as the figure in the book:
#
min_y = min( p_full$panel.args[[1]]$y, p_filter$panel.args[[1]]$y )
max_y = max( p_full$panel.args[[1]]$y, p_filter$panel.args[[1]]$y )

par(mfrow=c(1,2))
plot( p_full$panel.args[[1]]$x, p_full$panel.args[[1]]$y, ylim=c(min_y,max_y), xlab="", ylab="", main="All predictors" ); grid()
plot( p_filter$panel.args[[1]]$x, p_filter$panel.args[[1]]$y, ylim=c(min_y,max_y), xlab="", ylab="", main="Filtered prediCtors" ); grid()
par(mfrow=c(1,1))

# Exercise 19.4

library(caret)
library(AppliedPredictiveModeling)
library(mlbench) # has the function friedman1

#
# Exercise 7.2 can be found on EPage 160
#
set.seed(200)
trainingData = mlbench.friedman1( 500, sd=1 )
trainingData$x = data.frame(trainingData$x)
testingData = mlbench.friedman1( 500, sd=1 )
testingData$x = data.frame(testingData$x)

featurePlot( trainingData$x, trainingData$y )

pairs( trainingData$x )

library(RColorBrewer)
cols <- c(rev(brewer.pal(7, "Blues")), brewer.pal(7, "Reds"))
library(corrplot)
corrplot(cor(trainingData$x),order = "hclust",tl.pos = "n",addgrid.col = rgb(1,1,1,.01),col = colorRampPalette(cols)(51))

#
# Part (b):
#
df = trainingData$x; df$Y = trainingData$y
null = lm( Y ~ 1, data=df )
full = lm( Y ~ ., data=df )

# Forward selection:
step( null, scope=list(lower=null, upper=full), direction="forward", data=df )

# Backward selection:
step( full, direction="backward", data=df )

# Both directions:
step( null, scope=list(upper=full), direction="both", data=df )

#
# Part (c): Use recursive feature selection with a couple of different model types:
#
library(doMC)
registerDoMC(num_processors_to_use)

set.seed(104)
index <- createMultiFolds(trainingData$y, times = 5)

## The candidate set of the number of predictors to evaluate
varSeq <- seq(1, dim(trainingData$x)[2], by=1)

## This is the control
ctrl <- rfeControl(method = "repeatedcv", repeats = 5,
                   saveDetails = TRUE,
                   index = index,
                   returnResamp = "final")

ctrl$functions <- rfFuncs
set.seed(721)
rfRFE <- rfe(trainingData$x,
             trainingData$y,
             sizes = varSeq,
             ntree = 1000,
             rfeControl = ctrl)
rfRFE

ctrl$functions <- lmFuncs
set.seed(721)
lmRFE <- rfe(trainingData$x,
             trainingData$y,
             sizes = varSeq,
             tol = 1.0e-12,
             rfeControl = ctrl,
             preProc = c("center", "scale"))
lmRFE

# For these models we will also perform cross-validation to select parameters:
cvCtrl <- trainControl(method = "cv",
                       verboseIter = FALSE,
                       classProbs = TRUE,
                       allowParallel = FALSE)

ctrl$functions <- caretFuncs
set.seed(721)
svmRFE <- rfe(trainingData$x,
              trainingData$y,
              sizes = varSeq,
              rfeControl = ctrl,
              ## Now arguments to train() are used.
              method = "svmRadial",
              tuneLength = 10,
              preProc = c("center", "scale"),
              trControl = cvCtrl)
svmRFE

ctrl$functions <- caretFuncs
set.seed(721)
knnRFE <- rfe(trainingData$x,
              trainingData$y,
              sizes = varSeq,
              method = "knn",
              tuneLength = 20,
              preProc = c("center", "scale"),
              trControl = cvCtrl,
              rfeControl = ctrl)
knnRFE

# Package the results on what variables were selected at each subset size: WWX: Here 
#
paste0( "RF: ", paste( sprintf( "%s", rownames(rfRFE$fit[[7]]) ), collapse=", " ) )
paste0( "LM: ", paste( sprintf( "%s", names(lmRFE$fit$coefficients) ), collapse=", " ) )
cn = colnames(svmRFE$fit$trainingData[-length(svmRFE$fit$trainingData)])
paste0( "SVM: ", paste( cn, collapse=", " ) )
paste0( "KNN: ", paste( sprintf( "%s", colnames(knnRFE$fit$finalModel$learn$X) ), collapse=", " ) )

#
# Part (d): Apply filter methods
#

# Evaluate each predictor separately and take the top five:
#
VI = filterVarImp( trainingData$x, trainingData$y )
print( VI[ order(VI$Overall, decreasing=T), , drop=F ] )

# Evaluate them together using ReliefF and take the top five:
#
library(CORElearn)
df = trainingData$x; df$Y = trainingData$y

reliefValues = attrEval( Y ~ ., data=df, estimator="RReliefFequalK" )
print( sort( reliefValues, decreasing=TRUE ) )

#
# Part (e):
#

# Take 100 data points and build model with step and observe how it performs:
#
set.seed(201)
trainingData = mlbench.friedman1( 100, sd=1 )
trainingData$x = data.frame(trainingData$x)

df = trainingData$x; df$Y = trainingData$y
null = lm( Y ~ 1, data=df )
full = lm( Y ~ ., data=df )

# Forward selection:
step( null, scope=list(lower=null, upper=full), direction="forward", data=df )

# Backward selection:
step( full, direction="backward", data=df )

# Both directions:
step( null, scope=list(upper=full), direction="both", data=df )

# Exercise 19.5

library(caret)
library(AppliedPredictiveModeling)
data(segmentationOriginal) # found examples for reading this data in the file: O3_Data_Pre_Processing.R

## Retain the original training set
segTrain <- subset(segmentationOriginal, Case == "Train")

## Remove the first three columns (identifier columns)
segTrainX <- segTrain[, -(1:3)]
segTrainClass <- segTrain$Class

#--
# Part (a)
#--
zero_cols = nearZeroVar( segTrainX )
print( colnames( segTrainX )[zero_cols] )
segTrainX = segTrainX[,-zero_cols]

# What pairs of predictors have the largest correlations between them:
LC = largest_cors( segTrainX )
print( head( LC ) )

# Remove highly correlated features:
#
highCorr = findCorrelation( cor( segTrainX ), cutoff=0.75 )
segTrainX = segTrainX[,-highCorr]

#--
# Apply wrapper methods:
#--

# Using the "step" function:
#
df = segTrainX; df$Class = segTrainClass
null = glm( Class ~ 1, data=df, family=binomial )
full = glm( Class ~ ., data=df, family=binomial )

# Forward selection:
step( null, scope=list(lower=null, upper=full), direction="forward", data=df )

# Backward selection:
step( full, direction="backward", data=df )

# Both directions:
step( null, scope=list(upper=full), direction="both", data=df )

# Using the "fastbw" function:
#
## library(rms)
## fastbw()

# Using the "regsubsets" function:
#
## library(leaps)
## regsubsets(Class ~ ., data=df, nbest=1, really.big=T, method="forward" )
## regsubsets(Class ~ ., data=df, nbest=1, really.big=T, method="backward" )

# Using the "stepclass" function:
#
library(klaR)
stepclass( Class ~ ., data=df, method="lda", direction="forward" )

stepclass( Class ~ ., data=df, method="lda", direction="backward" )

stepclass( Class ~ ., data=df, method="lda", direction="both" )

#--
# Apply filter methods:
#--

# Evaluate each predictor separately and take the top five:
#
VI = filterVarImp( df[,-114], df$Class )
print( VI[ order(VI$PS, decreasing=T), , drop=F ] )

# Evaluate them together using ReliefF and take the top five:
#
library(CORElearn)
relieralues = attrEval( Class ~ ., data=df, estimator="Relief" )
print( sort( relieralues, decreasing=TRUE ) )

# If we use recursive feature estimation we find that the models with lots of features do better:
#
library(doMC)
registerDoMC(num_processors_to_use)

fiveStats <- function(...) c(twoClassSummary(...), defaultSummary(...))

set.seed(104)
index <- createMultiFolds(df$Class, times = 5)

varSeq <- seq(1, dim(df)[2]-1, by = 2)

ctrl <- rfeControl(method = "repeatedcv", repeats = 5,
                   saveDetails = TRUE,
                   index = index,
                   returnResamp = "final")

fullCtrl <- trainControl(method = "repeatedcv",
                         repeats = 5,
                         summaryFunction = fiveStats,
                         classProbs = TRUE,
                         index = index)

ctrl$functions <- rfFuncs
ctrl$functions$summary <- fiveStats
set.seed(721)
rfRFE <- rfe(df[, -67],
             df$Class,
             sizes = varSeq,
             metric = "ROC",
             ntree = 1000,
             rfeControl = ctrl)
rfRFE


  