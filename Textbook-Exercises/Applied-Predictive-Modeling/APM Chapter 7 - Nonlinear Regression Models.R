#Chapter 7 - Nonlinear Regression Models
#Chapter 7 - Computing

library(AppliedPredictiveModeling)
library(nnet)
library(caret)
library(earth)
library(ksvm)
library(knnreg)

#Neural Networks

nnetFit <- nnet(predictors, outcome,
                size = 5,
                decay = 0.01,
                linout = TRUE,
                ## Reduce the amount of printed output
                  trace = FALSE,
                ## Expand the number of iterations to find
                  ## parameter estimates..
                  maxit = 500,
                ## and the number of parameters used by the model
                  MaxNWts = 5 * (ncol(predictors) + 1) + 5 + 1)

nnetAvg <- avNNet(predictors, outcome,
                  size = 5,
                  decay = 0.01,
                  ## Specify how many models to average
                    repeats = 5,
                  linout = TRUE,
                  ## Reduce the amount of printed output
                    trace = FALSE,
                  ## Expand the number of iterations to find
                    ## parameter estimates..
                    maxit = 500,
                  ## and the number of parameters used by the model
                    MaxNWts = 5 * (ncol(predictors) + 1) + 5 + 1)

predict(nnetFit, newData)
## or
predict(nnetAvg, newData)

## The findCorrelation takes a correlation matrix and determines the
  ## column numbers that should be removed to keep all pair-wise
  ## correlations below a threshold
  tooHigh <- findCorrelation(cor(solTrainXtrans), cutoff = .75)
trainXnnet <- solTrainXtrans[, -tooHigh]
testXnnet <- solTestXtrans[, -tooHigh]
## Create a specific candidate set of models to evaluate:
  nnetGrid <- expand.grid(.decay = c(0, 0.01, .1),
                            .size = c(1:10),
                            ## The next option is to use bagging (see the
                              ## next chapter) instead of different random
                              ## seeds.
                              .bag = FALSE)
set.seed(100)
nnetTune <- train(solTrainXtrans, solTrainY,
                    method = "avNNet",
                    tuneGrid = nnetGrid,
                    trControl = ctrl,
                    ## Automatically standardize data prior to modeling
                      ## and prediction
                      preProc = c("center", "scale"),
                    linout = TRUE,
                    trace = FALSE,
                    MaxNWts = 10 * (ncol(trainXnnet) + 1) + 10 + 1,
                    maxit = 500)

#Multivariate Adaptive Regression Splines

marsFit <- earth(solTrainXtrans, solTrainY)
marsFit
summary(marsFit)

# Define the candidate models to test
  marsGrid <- expand.grid(.degree = 1:2, .nprune = 2:38)
# Fix the seed so that the results can be reproduced
  set.seed(100)
marsTuned <- train(solTrainXtrans, solTrainY,
                     method = "earth",
                     # Explicitly declare the candidate models to test
                       tuneGrid = marsGrid,
                     trControl = trainControl(method = "cv"))
marsTuned
head(predict(marsTuned, solTestXtrans))
varImp(marsTuned)

#Support Vector Machines

svmFit <- ksvm(x = solTrainXtrans, y = solTrainY,
               kernel ="rbfdot", kpar = "automatic",
               C = 1, epsilon = 0.1)

svmRTuned <- train(solTrainXtrans, solTrainY,
                     method = "svmRadial",
                     preProc = c("center", "scale"),
                     tuneLength = 14,
                     trControl = trainControl(method = "cv"))
svmRTuned
svmRTuned$finalModel

#K-Nearest Neighbors

# Remove a few sparse and unbalanced fingerprints first
knnDescr <- solTrainXtrans[, -nearZeroVar(solTrainXtrans)]
set.seed(100)
knnTune <- train(knnDescr,
                   solTrainY,
                   method = "knn",
                   # Center and scaling will occur for new predictions too
                     preProc = c("center", "scale"),
                   tuneGrid = data.frame(.k = 1:20),
                   trControl = trainControl(method = "cv"))

#Exercise 7.1 

library(caret) 
library(kernlab)

# Generate data to predict: 
set.seed(100)
x = runif(100,min=2,max=100)
y = sin(x) + rnorm(length(x)) * 0.25
sinData = data.frame(x=x,y=y)
plot(x,y)

## Create a grid of x values to use for prediction
dataGrid = data.frame(x=seq(2,100,length=100))

# Train some SVM models on this data and plot them:
#

# Reasonable looking predictions:
# 
rbfSVM = ksvm( x=x, y=y, data=sinData, kernel="rbfdot", kpar="automatic", C=1, epsilon=0.1 )
modelPrediction = predict( rbfSVM, newdata=dataGrid )
points( x=dataGrid$x, y=modelPrediction[,1], type="l", col="blue" )

if( TRUE ){
  # A large value for sigma: 
  # 
  rbfSVM = ksvm( x=x, y=y, data=sinData, kernel="rbfdot", kpar=list(sigma=100.0), C=1, epsilon=0.1 )
  modelPrediction = predict( rbfSVM, newdata=dataGrid )
  points( x=dataGrid$x, y=modelPrediction[,1], type="l", col="red" )
  
  # A small value for sigma:
  #
  rbfSVM = ksvm( x=x, y=y, data=sinData, kernel="rbfdot", kpar=list(sigma=1e-2), C=1, epsilon=0.1 )
  modelPrediction = predict( rbfSVM, newdata=dataGrid )
  points( x=dataGrid$x, y=modelPrediction[,1], type="l", col="green" )
  
  if( save_plots ){ dev.off() }
}

if( FALSE ){ 
  # A very large value of the cost C (should overfit):
  # 
  rbfSVM = ksvm( x=x, y=y, data=sinData, kernel="rbfdot", kpar="automatic", C=10^7, epsilon=0.1 )
  modelPrediction = predict( rbfSVM, newdata=dataGrid )
  points( x=dataGrid$x, y=modelPrediction[,1], type="l", col="red" )
  
  # A very small value of the cost C (should underfit):
  #
  rbfSVM = ksvm( x=x, y=y, data=sinData, kernel="rbfdot", kpar="automatic", C=10^(-2), epsilon=0.1 )
  modelPrediction = predict( rbfSVM, newdata=dataGrid )
  points( x=dataGrid$x, y=modelPrediction[,1], type="l", col="green", main='changes in cost' )
  
  if( save_plots ){ dev.off() }
}

if( FALSE ){
  # A large value for epsilon: 
  # 
  rbfSVM = ksvm( x=x, y=y, data=sinData, kernel="rbfdot", kpar="automatic", C=1, epsilon=0.5 )
  modelPrediction = predict( rbfSVM, newdata=dataGrid )
  points( x=dataGrid$x, y=modelPrediction[,1], type="l", col="red" )
  
  # A small value for epsilon:
  #
  rbfSVM = ksvm( x=x, y=y, data=sinData, kernel="rbfdot", kpar="automatic", C=1, epsilon=0.001 )
  modelPrediction = predict( rbfSVM, newdata=dataGrid )
  points( x=dataGrid$x, y=modelPrediction[,1], type="l", col="green" )
  
  if( save_plots ){ dev.off() }
}

#Exercise 7.2

library(caret) 
library(mlbench)

set.seed(200)
trainingData = mlbench.friedman1(200,sd=1)
## We convert the 'x' data from a matrix to a data frame
## One reason we do this is that this will give the columns names
trainingData$x = data.frame(trainingData$x)
## Look at the data using
## or other methods

testData = mlbench.friedman1(5000,sd=1)
testData$x = data.frame(testData$x)

# Note we use the default "trainControl" bootstrap evaluations for each of the models below: 

# A K-NN model:
# 
set.seed(0)
knnModel = train(x=trainingData$x, y=trainingData$y, method="knn",
                 preProc=c("center","scale"),
                 tuneLength=10)

knnPred = predict(knnModel, newdata=testData$x)
## The function 'postResample' can be used to get the test set performance values
knnPR = postResample(pred=knnPred, obs=testData$y)
rmses = c(knnPR[1])
r2s = c(knnPR[2])
methods = c("KNN")

# A Neural Network model:
#
nnGrid = expand.grid( .decay=c(0,0.01,0.1), .size=1:10, .bag=FALSE )
set.seed(0)
nnetModel = train(x=trainingData$x, y=trainingData$y, method="nnet", preProc=c("center", "scale"),
                  linout=TRUE,trace=FALSE,MaxNWts=10 * (ncol(trainingData$x)+1) + 10 + 1, maxit=500)

nnetPred = predict(nnetModel, newdata=testData$x)
nnetPR = postResample(pred=nnetPred, obs=testData$y)
rmses = c(rmses,nnetPR[1])
r2s = c(r2s,nnetPR[2])
methods = c(methods,"NN")

# Averaged Neural Network models:
#
set.seed(0)
avNNetModel = train(x=trainingData$x, y=trainingData$y, method="avNNet", preProc=c("center", "scale"),
                    linout=TRUE,trace=FALSE,MaxNWts=10 * (ncol(trainingData$x)+1) + 10 + 1, maxit=500)

avNNetPred = predict(avNNetModel, newdata=testData$x)
avNNetPR = postResample(pred=avNNetPred, obs=testData$y)
rmses = c(rmses,avNNetPR[1])
r2s = c(r2s,avNNetPR[2])
methods = c(methods,"AvgNN")

# MARS model:
#
marsGrid = expand.grid(.degree=1:2, .nprune=2:38)
set.seed(0)
marsModel = train(x=trainingData$x, y=trainingData$y, method="earth", preProc=c("center", "scale"), tuneGrid=marsGrid)

marsPred = predict(marsModel, newdata=testData$x)
marsPR = postResample(pred=marsPred, obs=testData$y)
rmses = c(rmses,marsPR[1])
r2s = c(r2s,marsPR[2])
methods = c(methods,"MARS")

# Lets see what variables are most important: 
varImp(marsModel)

# A Support Vector Machine (SVM):
#
set.seed(0)
svmRModel = train(x=trainingData$x, y=trainingData$y, method="svmRadial", preProc=c("center", "scale"), tuneLength=20)

svmRPred = predict(svmRModel, newdata=testData$x)
svmPR = postResample(pred=svmRPred, obs=testData$y) 
rmses = c(rmses,svmPR[1])
r2s = c(r2s,svmPR[2])
methods = c(methods,"SVM")

res = data.frame( rmse=rmses, r2=r2s )
rownames(res) = methods

# Order the dataframe so that the best results are at the bottom:
#
res = res[ order( -res$rmse ), ]
print( "Final Results" ) 
print( res )

# Exercise 7.3

library(caret) 

set.seed(0)

data(tecator) 

fat = endpoints[,2] # what we want to predict 
absorp = data.frame(absorp)

zero_cols = nearZeroVar( absorp ) # look for highly correlated predictors ... none found ... 

# Split this data into training and testing sets:
#
training = createDataPartition( fat, p=0.8 )

absorp_training = absorp[training$Resample1,]
fat_training = fat[training$Resample1]

absorp_testing = absorp[-training$Resample1,]
fat_testing = fat[-training$Resample1]

# Build various nonlinear models and then compare performance:
# 
# Note we use the default "trainControl" of bootstrap evaluations for each of the models below: 
#
preProc_Arguments = c("center","scale")
#preProc_Arguments = c("center","scale","pca")

# A K-NN model:
# 
set.seed(0)
knnModel = train(x=absorp_training, y=fat_training, method="knn", preProc=preProc_Arguments, tuneLength=10)

# predict on training/testing sets
knnPred = predict(knnModel, newdata=absorp_training)
knnPR = postResample(pred=knnPred, obs=fat_training)
rmses_training = c(knnPR[1])
r2s_training = c(knnPR[2])
methods = c("KNN")

knnPred = predict(knnModel, newdata=absorp_testing)
knnPR = postResample(pred=knnPred, obs=fat_testing)
rmses_testing = c(knnPR[1])
r2s_testing = c(knnPR[2])


# A Neural Network model:
#
nnGrid = expand.grid( .decay=c(0,0.01,0.1), .size=1:10, .bag=FALSE )
set.seed(0)
nnetModel = train(x=absorp_training, y=fat_training, method="nnet", preProc=preProc_Arguments,
                  linout=TRUE,trace=FALSE,MaxNWts=10 * (ncol(absorp_training)+1) + 10 + 1, maxit=500)

nnetPred = predict(nnetModel, newdata=absorp_training)
nnetPR = postResample(pred=nnetPred, obs=fat_training)
rmses_training = c(rmses_training,nnetPR[1])
r2s_training = c(r2s_training,nnetPR[2])
methods = c(methods,"NN")

nnetPred = predict(nnetModel, newdata=absorp_testing)
nnetPR = postResample(pred=nnetPred, obs=fat_testing)
rmses_testing = c(rmses_testing,nnetPR[1])
r2s_testing = c(r2s_testing,nnetPR[2])


# Averaged Neural Network models:
#
set.seed(0)
avNNetModel = train(x=absorp_training, y=fat_training, method="avNNet", preProc=preProc_Arguments,
                    linout=TRUE,trace=FALSE,MaxNWts=10 * (ncol(absorp_training)+1) + 10 + 1, maxit=500)

avNNetPred = predict(avNNetModel, newdata=absorp_training)
avNNetPR = postResample(pred=avNNetPred, obs=fat_training)
rmses_training = c(rmses_training,avNNetPR[1])
r2s_training = c(r2s_training,avNNetPR[2])
methods = c(methods,"AvgNN")

avNNetPred = predict(avNNetModel, newdata=absorp_testing)
avNNetPR = postResample(pred=avNNetPred, obs=fat_testing)
rmses_testing = c(rmses_testing,avNNetPR[1])
r2s_testing = c(r2s_testing,avNNetPR[2])


# MARS model:
#
marsGrid = expand.grid(.degree=1:2, .nprune=2:38)
set.seed(0)
marsModel = train(x=absorp_training, y=fat_training, method="earth", preProc=preProc_Arguments, tuneGrid=marsGrid)

marsPred = predict(marsModel, newdata=absorp_training)
marsPR = postResample(pred=marsPred, obs=fat_training)
rmses_training = c(rmses_training,marsPR[1])
r2s_training = c(r2s_training,marsPR[2])
methods = c(methods,"MARS")

marsPred = predict(marsModel, newdata=absorp_testing)
marsPR = postResample(pred=marsPred, obs=fat_testing)
rmses_testing = c(rmses_testing,marsPR[1])
r2s_testing = c(r2s_testing,marsPR[2])

# Lets see what variables are most important in the MARS model: 
varImp(marsModel)

# A Support Vector Machine (SVM):
#
set.seed(0)
svmModel = train(x=absorp_training, y=fat_training, method="svmRadial", preProc=preProc_Arguments, tuneLength=20)

svmPred = predict(svmModel, newdata=absorp_training)
svmPR = postResample(pred=svmPred, obs=fat_training) 
rmses_training = c(rmses_training,svmPR[1])
r2s_training = c(r2s_training,svmPR[2])
methods = c(methods,"SVM")

svmPred = predict(svmModel, newdata=absorp_testing)
svmPR = postResample(pred=svmPred, obs=fat_testing)
rmses_testing = c(rmses_testing,svmPR[1])
r2s_testing = c(r2s_testing,svmPR[2])

# Package the results up:
# 
res_training = data.frame( rmse=rmses_training, r2=r2s_training )
rownames(res_training) = methods

training_order = order( -res_training$rmse )

res_training = res_training[ training_order, ] # Order the dataframe so that the best results are at the bottom:
print( "Final Training Results" ) 
print( res_training )

res_testing = data.frame( rmse=rmses_testing, r2=r2s_testing )
rownames(res_testing) = methods

res_testing = res_testing[ training_order, ] # Order the dataframe so that the best results for the training set are at the bottom:
print( "Final Testing Results" ) 
print( res_testing )

# EPage 82 
resamp = resamples( list(knn=knnModel,svm=svmModel,mars=marsModel,nnet=nnetModel,avnnet=avNNetModel) )
print( summary(resamp) )
print( summary(diff(resamp)) )

#Exercise 7.4

library(caret)
library(AppliedPredictiveModeling)

set.seed(0)

data(permeability)

# Part (b):
# 
zero_cols = nearZeroVar( fingerprints )
print( sprintf("Found %d zero variance columns from %d",length(zero_cols), dim(fingerprints)[2] ) )
fingerprints = fingerprints[,-zero_cols] # drop these zero variance columns 

# Split this data into training and testing sets:
#
training = createDataPartition( permeability, p=0.8 )

fingerprints_training = fingerprints[training$Resample1,]
permeability_training = permeability[training$Resample1]

fingerprints_testing = fingerprints[-training$Resample1,]
permeability_testing = permeability[-training$Resample1]


# Build various nonlinear models and then compare performance:
# 
# Note we use the default "trainControl" bootstrap evaluations for each of the models below: 
#
preProc_Arguments = c("center","scale")

# A K-NN model:
# 
set.seed(0)
knnModel = train(x=fingerprints_training, y=permeability_training, method="knn", preProc=preProc_Arguments, tuneLength=10)

# predict on training/testing sets
knnPred = predict(knnModel, newdata=fingerprints_training)
knnPR = postResample(pred=knnPred, obs=permeability_training)
rmses_training = c(knnPR[1])
r2s_training = c(knnPR[2])
methods = c("KNN")

knnPred = predict(knnModel, newdata=fingerprints_testing)
knnPR = postResample(pred=knnPred, obs=permeability_testing)
rmses_testing = c(knnPR[1])
r2s_testing = c(knnPR[2])


# A Neural Network model:
#
nnGrid = expand.grid( .decay=c(0,0.01,0.1), .size=1:10, .bag=FALSE )
set.seed(0)
nnetModel = train(x=fingerprints_training, y=permeability_training, method="nnet", preProc=preProc_Arguments,
                  linout=TRUE,trace=FALSE,MaxNWts=10 * (ncol(fingerprints_training)+1) + 10 + 1, maxit=500)

nnetPred = predict(nnetModel, newdata=fingerprints_training)
nnetPR = postResample(pred=nnetPred, obs=permeability_training)
rmses_training = c(rmses_training,nnetPR[1])
r2s_training = c(r2s_training,nnetPR[2])
methods = c(methods,"NN")

nnetPred = predict(nnetModel, newdata=fingerprints_testing)
nnetPR = postResample(pred=nnetPred, obs=permeability_testing)
rmses_testing = c(rmses_testing,nnetPR[1])
r2s_testing = c(r2s_testing,nnetPR[2])


# Averaged Neural Network models:
#
set.seed(0)
avNNetModel = train(x=fingerprints_training, y=permeability_training, method="avNNet", preProc=preProc_Arguments,
                    linout=TRUE,trace=FALSE,MaxNWts=10 * (ncol(fingerprints_training)+1) + 10 + 1, maxit=500)

avNNetPred = predict(avNNetModel, newdata=fingerprints_training)
avNNetPR = postResample(pred=avNNetPred, obs=permeability_training)
rmses_training = c(rmses_training,avNNetPR[1])
r2s_training = c(r2s_training,avNNetPR[2])
methods = c(methods,"AvgNN")

avNNetPred = predict(avNNetModel, newdata=fingerprints_testing)
avNNetPR = postResample(pred=avNNetPred, obs=permeability_testing)
rmses_testing = c(rmses_testing,avNNetPR[1])
r2s_testing = c(r2s_testing,avNNetPR[2])


# MARS model:
#
marsGrid = expand.grid(.degree=1:2, .nprune=2:38)
set.seed(0)
marsModel = train(x=fingerprints_training, y=permeability_training, method="earth", preProc=preProc_Arguments, tuneGrid=marsGrid)

marsPred = predict(marsModel, newdata=fingerprints_training)
marsPR = postResample(pred=marsPred, obs=permeability_training)
rmses_training = c(rmses_training,marsPR[1])
r2s_training = c(r2s_training,marsPR[2])
methods = c(methods,"MARS")

marsPred = predict(marsModel, newdata=fingerprints_testing)
marsPR = postResample(pred=marsPred, obs=permeability_testing)
rmses_testing = c(rmses_testing,marsPR[1])
r2s_testing = c(r2s_testing,marsPR[2])

# Lets see what variables are most important in the MARS model: 
varImp(marsModel)

# A Support Vector Machine (SVM):
#
set.seed(0)
svmModel = train(x=fingerprints_training, y=permeability_training, method="svmRadial", preProc=preProc_Arguments, tuneLength=20)

svmPred = predict(svmModel, newdata=fingerprints_training)
svmPR = postResample(pred=svmPred, obs=permeability_training) 
rmses_training = c(rmses_training,svmPR[1])
r2s_training = c(r2s_training,svmPR[2])
methods = c(methods,"SVM")

svmPred = predict(svmModel, newdata=fingerprints_testing)
svmPR = postResample(pred=svmPred, obs=permeability_testing)
rmses_testing = c(rmses_testing,svmPR[1])
r2s_testing = c(r2s_testing,svmPR[2])

# Package the results up:
# 
res_training = data.frame( rmse=rmses_training, r2=r2s_training )
rownames(res_training) = methods

training_order = order( -res_training$rmse )

res_training = res_training[ training_order, ] # Order the dataframe so that the best results are at the bottom:
print( "Final Training Results" ) 
print( res_training )

res_testing = data.frame( rmse=rmses_testing, r2=r2s_testing )
rownames(res_testing) = methods

res_testing = res_testing[ training_order, ] # Order the dataframe so that the best results for the training set are at the bottom:
print( "Final Testing Results" ) 
print( res_testing )

# EPage 82 
resamp = resamples( list(svm=svmModel,knn=knnModel,nnet=nnetModel,avnnet=avNNetModel,mars=marsModel) )
print( summary(resamp) )
print( summary(diff(resamp)) )

#Exercise 7.5

library(caret)
library(AppliedPredictiveModeling)

set.seed(0)

data(ChemicalManufacturingProcess)

processPredictors = ChemicalManufacturingProcess[,2:58]
yield = ChemicalManufacturingProcess[,1]

n_samples = dim(processPredictors)[1]
n_features = dim(processPredictors)[2]

# Fill in missing values where we have NAs with the median over the non-NA values: 
#
replacements = sapply( processPredictors, median, na.rm=TRUE )
for( ci in 1:n_features ){
  bad_inds = is.na( processPredictors[,ci] )
  processPredictors[bad_inds,ci] = replacements[ci]
}

# Look for any features with no variance:
# 
zero_cols = nearZeroVar( processPredictors )
print( sprintf("Found %d zero variance columns from %d",length(zero_cols), dim(processPredictors)[2] ) )
processPredictors = processPredictors[,-zero_cols] # drop these zero variance columns 

# Split this data into training and testing sets:
#
training = createDataPartition( yield, p=0.8 )

processPredictors_training = processPredictors[training$Resample1,]
yield_training = yield[training$Resample1]

processPredictors_testing = processPredictors[-training$Resample1,]
yield_testing = yield[-training$Resample1]

# Build various nonlinear models and then compare performance:
# 
# Note we use the default "trainControl" of bootstrap evaluations for each of the models below: 
#
preProc_Arguments = c("center","scale")

# A K-NN model:
# 
set.seed(0)
knnModel = train(x=processPredictors_training, y=yield_training, method="knn", preProc=preProc_Arguments, tuneLength=10)

# predict on training/testing sets
knnPred = predict(knnModel, newdata=processPredictors_training)
knnPR = postResample(pred=knnPred, obs=yield_training)
rmses_training = c(knnPR[1])
r2s_training = c(knnPR[2])
methods = c("KNN")

knnPred = predict(knnModel, newdata=processPredictors_testing)
knnPR = postResample(pred=knnPred, obs=yield_testing)
rmses_testing = c(knnPR[1])
r2s_testing = c(knnPR[2])


# A Neural Network model:
#
nnGrid = expand.grid( .decay=c(0,0.01,0.1), .size=1:10, .bag=FALSE )
set.seed(0)
nnetModel = train(x=processPredictors_training, y=yield_training, method="nnet", preProc=preProc_Arguments,
                  linout=TRUE,trace=FALSE,MaxNWts=10 * (ncol(processPredictors_training)+1) + 10 + 1, maxit=500)

nnetPred = predict(nnetModel, newdata=processPredictors_training)
nnetPR = postResample(pred=nnetPred, obs=yield_training)
rmses_training = c(rmses_training,nnetPR[1])
r2s_training = c(r2s_training,nnetPR[2])
methods = c(methods,"NN")

nnetPred = predict(nnetModel, newdata=processPredictors_testing)
nnetPR = postResample(pred=nnetPred, obs=yield_testing)
rmses_testing = c(rmses_testing,nnetPR[1])
r2s_testing = c(r2s_testing,nnetPR[2])


# Averaged Neural Network models:
#
set.seed(0)
avNNetModel = train(x=processPredictors_training, y=yield_training, method="avNNet", preProc=preProc_Arguments,
                    linout=TRUE,trace=FALSE,MaxNWts=10 * (ncol(processPredictors_training)+1) + 10 + 1, maxit=500)

avNNetPred = predict(avNNetModel, newdata=processPredictors_training)
avNNetPR = postResample(pred=avNNetPred, obs=yield_training)
rmses_training = c(rmses_training,avNNetPR[1])
r2s_training = c(r2s_training,avNNetPR[2])
methods = c(methods,"AvgNN")

avNNetPred = predict(avNNetModel, newdata=processPredictors_testing)
avNNetPR = postResample(pred=avNNetPred, obs=yield_testing)
rmses_testing = c(rmses_testing,avNNetPR[1])
r2s_testing = c(r2s_testing,avNNetPR[2])


# MARS model:
#
marsGrid = expand.grid(.degree=1:2, .nprune=2:38)
set.seed(0)
marsModel = train(x=processPredictors_training, y=yield_training, method="earth", preProc=preProc_Arguments, tuneGrid=marsGrid)

marsPred = predict(marsModel, newdata=processPredictors_training)
marsPR = postResample(pred=marsPred, obs=yield_training)
rmses_training = c(rmses_training,marsPR[1])
r2s_training = c(r2s_training,marsPR[2])
methods = c(methods,"MARS")

marsPred = predict(marsModel, newdata=processPredictors_testing)
marsPR = postResample(pred=marsPred, obs=yield_testing)
rmses_testing = c(rmses_testing,marsPR[1])
r2s_testing = c(r2s_testing,marsPR[2])

# Lets see what variables are most important in the MARS model: 
varImp(marsModel)

# A Support Vector Machine (SVM):
#
set.seed(0)
svmModel = train(x=processPredictors_training, y=yield_training, method="svmRadial", preProc=preProc_Arguments, tuneLength=20)

svmPred = predict(svmModel, newdata=processPredictors_training)
svmPR = postResample(pred=svmPred, obs=yield_training) 
rmses_training = c(rmses_training,svmPR[1])
r2s_training = c(r2s_training,svmPR[2])
methods = c(methods,"SVM")

svmPred = predict(svmModel, newdata=processPredictors_testing)
svmPR = postResample(pred=svmPred, obs=yield_testing)
rmses_testing = c(rmses_testing,svmPR[1])
r2s_testing = c(r2s_testing,svmPR[2])

# Package the results up:
# 
res_training = data.frame( rmse=rmses_training, r2=r2s_training )
rownames(res_training) = methods

training_order = order( -res_training$rmse )

res_training = res_training[ training_order, ] # Order the dataframe so that the best results are at the bottom:
print( "Final Training Results" ) 
print( res_training )

res_testing = data.frame( rmse=rmses_testing, r2=r2s_testing )
rownames(res_testing) = methods

res_testing = res_testing[ training_order, ] # Order the dataframe so that the best results for the training set are at the bottom:
print( "Final Testing Results" ) 
print( res_testing )

# EPage 82 
resamp = resamples( list(knn=knnModel,svm=svmModel,mars=marsModel,nnet=nnetModel,avnnet=avNNetModel) )
print( summary(resamp) )
print( summary(diff(resamp)) )

# Part (b): the variable importance
#
varImp(svmModel)

# Part (c): Explore yield output as we vary the most important predictors of the SVM model:
#
# We pick a predictor and plot how the responce varies as a function of this value
#
p_range = range( processPredictors$ManufacturingProcess32 )
variation = seq( from=p_range[1], to=p_range[2], length.out=100 )
mean_predictor_values = apply( processPredictors, 2, mean )

# build a dataframe with variation in only one dimension (for this part we pick ManufacturingProcess32)
if( !require(pracma) ){
  install.packages('pracma') # needed for repmat
  library(pracma)
}

newdata = repmat( as.double(mean_predictor_values), length(variation), 1 )
newdata = data.frame( newdata )
colnames( newdata ) = colnames( processPredictors )
newdata$ManufacturingProcess32 = variation

xs = variation
y_hat = predict( svmModel, newdata=as.matrix(newdata) )