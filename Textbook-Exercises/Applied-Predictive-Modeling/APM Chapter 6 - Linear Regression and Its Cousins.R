#Chapter 4 -  Over-Fitting and Model Tuning
#Chapter 4 - Computing

library(AppliedPredictiveModeling)
library(caret)
library(MASS)
library(pls)
library(elasticnet)
data(solubility)
## The data objects begin with "sol":
ls(pattern = "^solT")

set.seed(2)
sample(names(solTrainX), 8)

#Ordinary Linear Regression
trainingData <- solTrainXtrans
## Add the solubility outcome
trainingData$Solubility <- solTrainY

lmFitAllPredictors <- lm(Solubility ~ ., data = trainingData)
summary(lmFitAllPredictors)

#Predicting new data and examining its performance
lmPred1 <- predict(lmFitAllPredictors, solTestXtrans)
head(lmPred1)

lmValues1 <- data.frame(obs = solTestY, pred = lmPred1)
defaultSummary(lmValues1)

#Robuest LR

rlmFitAllPredictors <- rlm(Solubility ~ ., data = trainingData)
ctrl <- trainControl(method = "cv", number = 10)
set.seed(100)
lmFit1 <- train(x = solTrainXtrans, y = solTrainY,
                  method = "lm", trControl = ctrl)

lmFit1

#Plotting the residuals
xyplot(solTrainY ~ predict(lmFit1),
       ## plot the points (type = 'p') and a background grid ('g')
         type = c("p", "g"),
         xlab = "Predicted", ylab = "Observed")
xyplot(resid(lmFit1) ~ predict(lmFit1),
         type = c("p", "g"),
         xlab = "Predicted", ylab = "Residuals")

#Reducing correlations
corThresh <- .9
tooHigh <- findCorrelation(cor(solTrainXtrans), corThresh)
corrPred <- names(solTrainXtrans)[tooHigh]
trainXfiltered <- solTrainXtrans[, -tooHigh]
testXfiltered <- solTestXtrans[, -tooHigh]
set.seed(100)
lmFiltered <- train(testXfiltered, solTrainY, method = "lm",
                      trControl = ctrl)
lmFiltered

#Partial Least Squares

plsFit <- plsr(Solubility ~ ., data = trainingData)
predict(plsFit, solTestXtrans[1:5,], ncomp = 1:2)

set.seed(100)
plsTune <- train(solTrainXtrans, solTrainY,
                   method = "pls",
                   ## The default tuning grid evaluates
                   ## components 1... tuneLength
                   tuneLength = 20,
                   trControl = ctrl,
                   preProc = c("center", "scale"))

plsTune

#Penalized Regression Models
ridgeModel <- enet(x = as.matrix(solTrainXtrans), y = solTrainY,
                   lambda = 0.001)

ridgePred <- predict(ridgeModel, newx = as.matrix(solTestXtrans),
                     s = 1, mode = "fraction",
                     type = "fit")                     
head(ridgePred$fit)

## Define the candidate set of values
ridgeGrid <- data.frame(.lambda = seq(0, .1, length = 15))
set.seed(100)
ridgeRegFit <- train(solTrainXtrans, solTrainY,
                       method = "ridge",
                       ## Fir the model over many penalty values
                         tuneGrid = ridgeGrid,
                       trControl = ctrl,
                       ## put the predictors on the same scale
                         preProc = c("center", "scale"))
ridgeRegFit

#Lasso
enetModel <- enet(x = as.matrix(solTrainXtrans), y = solTrainY,
                  lambda = 0.01, normalize = TRUE)

enetPred <- predict(enetModel, newx = as.matrix(solTestXtrans),
                    s = .1, mode = "fraction",
                    type = "fit")
## A list is returned with several items:
names(enetPred)
head(enetPred$fit)

enetCoef<- predict(enetModel, newx = as.matrix(solTestXtrans),
                   s = .1, mode = "fraction",
                   type = "coefficients")
tail(enetCoef$coefficients)

enetGrid <- expand.grid(.lambda = c(0, 0.01, .1),
                        + .fraction = seq(.05, 1, length = 20))
set.seed(100)
enetTune <- train(solTrainXtrans, solTrainY,
                    method = "enet",
                    tuneGrid = enetGrid,
                    trControl = ctrl,
                    preProc = c("center", "scale"))

# Exercises
# Exercise 6.1 

library(caret)
data(tecator)

# Part (b):
#
pcaObj <- prcomp(absorp, center = TRUE, scale = TRUE)

pctVar <- pcaObj$sdev^2/sum(pcaObj$sdev^2)*100
head(pctVar)

# Part (c):
# 
fat = endpoints[,2]
absorp = data.frame(absorp)

# For various models build and then compare performance:
#
set.seed(0)
lm_model = train( absorp, fat, method="lm", preProcess=c("center","scale"), trControl=trainControl(method="repeatedcv",repeats=5) )

# For rlm we cannot have a singular predictor covariance matrix thus we preprocess with PCA:
# 
set.seed(0)
rlm_model = train( absorp, fat, method="rlm", preProcess=c("pca"), trControl=trainControl(method="repeatedcv",repeats=5) )

set.seed(0)
pls_model = train( absorp, fat, method="pls",
                   # the default tuning grid evaluates comonents 1 ... tuneLength
                   tuneLength=40, 
                   preProcess=c("center","scale"), trControl=trainControl(method="repeatedcv",repeats=5) )

# Ridge regression training:
#
if( FALSE ){ 
  ridgeGrid = data.frame(.lambda=seq(0,1,length=20))
  set.seed(0)
  ridge_model = train( absorp, fat, method="ridge",
                       # fit the model over many penalty values
                       tuneGrid = ridgeGrid,
                       preProcess=c("center","scale"), trControl=trainControl(method="repeatedcv",repeats=5) )
}

# Elastic net training:
# 
enetGrid = expand.grid(.lambda=seq(0,1,length=20), .fraction=seq(0.05, 1.0, length=20))
set.seed(0)
enet_model = train( absorp, fat, method="enet",
                    # fit the model over many penalty values
                    tuneGrid = enetGrid,
                    preProcess=c("center","scale"), trControl=trainControl(method="repeatedcv",repeats=5) )

# 
resamp = resamples( list(lm=lm_model,rlm=rlm_model,pls=pls_model,enet=enet_model) )
print( summary(resamp) )
print( summary(diff(resamp)) )

# Exercise 6.2 

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

# Part (c): Build a PLSR model on this data: 
#
set.seed(0)
pls_model = train( fingerprints_training, permeability_training, method="pls",
                   # the default tuning grid evaluates components 1 ... tuneLength
                   tuneLength=40, 
                   preProcess=c("center","scale"), trControl=trainControl(method="repeatedcv",repeats=5) )

# Part (d): Predict performance using PLS
#
y_hat = predict( pls_model, newdata=fingerprints_testing )
r2_pls = cor(y_hat,permeability_testing,method="pearson")^2
rmse_pls = sqrt( mean( (y_hat-permeability_testing)^2 ) )
print( sprintf( "%-10s: Testing R^2= %10.6f; RMSE= %10.6f", "PLS", r2_pls, rmse_pls ) )


# Part (e): Build models to predict permeability using other methods: 
#

# Lets try an Elastic net (this seems to have performed well in past problems) and some other models:
# 
enetGrid = expand.grid(.lambda=seq(0,1,length=20), .fraction=seq(0.05, 1.0, length=20))
set.seed(0)
enet_model = train( fingerprints_training, permeability_training, method="enet",
                    # fit the model over many penalty values
                    tuneGrid = enetGrid,
                    preProcess=c("center","scale"), trControl=trainControl(method="repeatedcv",repeats=5) )
y_hat = predict( enet_model, newdata=fingerprints_testing )
r2_enet = cor(y_hat,permeability_testing,method="pearson")^2
rmse_enet = sqrt( mean( (y_hat-permeability_testing)^2 ) )
print( sprintf( "%-10s: Testing R^2= %10.6f; RMSE= %10.6f", "ENET", r2_enet, rmse_enet ) )

set.seed(0)
lm_model = train( fingerprints_training, permeability_training, method="lm", preProcess=c("center","scale"), trControl=trainControl(method="repeatedcv",repeats=5) )
y_hat = predict( lm_model, newdata=fingerprints_testing )
r2_lm = cor(y_hat,permeability_testing,method="pearson")^2
rmse_lm = sqrt( mean( (y_hat-permeability_testing)^2 ) )
print( sprintf( "%-10s: Testing R^2= %10.6f; RMSE= %10.6f", "LM", r2_lm, rmse_lm ) )

# For rlm we cannot have a singular predictor covariance matrix thus we preprocess with PCA:
# 
set.seed(0)
rlm_model = train( fingerprints_training, permeability_training, method="rlm", preProcess=c("pca"), trControl=trainControl(method="repeatedcv",repeats=5) )
y_hat = predict( rlm_model, newdata=fingerprints_testing )
r2_rlm = cor(y_hat,permeability_testing,method="pearson")^2
rmse_rlm = sqrt( mean( (y_hat-permeability_testing)^2 ) )
print( sprintf( "%-10s: Testing R^2= %10.6f; RMSE= %10.6f", "RLM", r2_rlm, rmse_rlm ) )

# Compare the given models using resamples
#
resamp = resamples( list(pls=pls_model,enet=enet_model,lm=lm_model,rlm=rlm_model) ) # examples of using this are on EPage 82 
print( summary(resamp) )
print( summary(diff(resamp)) )

# Exercise 6.3

library(caret)
library(AppliedPredictiveModeling)

set.seed(0)

# Part (a):
# 
data(ChemicalManufacturingProcess)

processPredictors = ChemicalManufacturingProcess[,2:58]
yield = ChemicalManufacturingProcess[,1]

n_samples = dim(processPredictors)[1]
n_features = dim(processPredictors)[2]

# Part (b): Fill in missing values where we have NAs with the median over the non-NA values: 
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

# Part (c): Split this data into training and testing sets:
#
training = createDataPartition( yield, p=0.8 )

processPredictors_training = processPredictors[training$Resample1,]
yield_training = yield[training$Resample1]

processPredictors_testing = processPredictors[-training$Resample1,]
yield_testing = yield[-training$Resample1]

# Build some linear models and predict the performance on the testing data set: 
#
set.seed(0)
pls_model = train( processPredictors_training, yield_training, method="pls",
                   # the default tuning grid evaluates components 1 ... tuneLength
                   tuneLength=40, 
                   preProcess=c("center","scale"), trControl=trainControl(method="repeatedcv",repeats=5) )

y_hat = predict( pls_model, newdata=processPredictors_testing )
r2_pls = cor(y_hat,yield_testing,method="pearson")^2
rmse_pls = sqrt( mean( (y_hat-yield_testing)^2 ) )
print( sprintf( "%-10s: Testing R^2= %10.6f; RMSE= %10.6f", "PLS", r2_pls, rmse_pls ) )

# Lets try an Elastic net (this seems to have performed well in past problems) and some other models:
# 
enetGrid = expand.grid(.lambda=seq(0,1,length=20), .fraction=seq(0.05, 1.0, length=20))
set.seed(0)
enet_model = train( processPredictors_training, yield_training, method="enet",
                    # fit the model over many penalty values
                    tuneGrid = enetGrid,
                    preProcess=c("center","scale"), trControl=trainControl(method="repeatedcv",repeats=5) )
y_hat = predict( enet_model, newdata=processPredictors_testing )
r2_enet = cor(y_hat,yield_testing,method="pearson")^2
rmse_enet = sqrt( mean( (y_hat-yield_testing)^2 ) )
print( sprintf( "%-10s: Testing R^2= %10.6f; RMSE= %10.6f", "ENET", r2_enet, rmse_enet ) )

set.seed(0)
lm_model = train( processPredictors_training, yield_training, method="lm", preProcess=c("center","scale"), trControl=trainControl(method="repeatedcv",repeats=5) )
y_hat = predict( lm_model, newdata=processPredictors_testing )
r2_lm = cor(y_hat,yield_testing,method="pearson")^2
rmse_lm = sqrt( mean( (y_hat-yield_testing)^2 ) )
print( sprintf( "%-10s: Testing R^2= %10.6f; RMSE= %10.6f", "LM", r2_lm, rmse_lm ) )

# For rlm we cannot have a singular predictor covariance matrix thus we preprocess with PCA:
# 
set.seed(0)
rlm_model = train( processPredictors_training, yield_training, method="rlm", preProcess=c("pca"), trControl=trainControl(method="repeatedcv",repeats=5) )
y_hat = predict( rlm_model, newdata=processPredictors_testing )
r2_rlm = cor(y_hat,yield_testing,method="pearson")^2
rmse_rlm = sqrt( mean( (y_hat-yield_testing)^2 ) )
print( sprintf( "%-10s: Testing R^2= %10.6f; RMSE= %10.6f", "RLM", r2_rlm, rmse_rlm ) )

# Compare the given models using resamples
#
resamp = resamples( list(pls=pls_model,enet=enet_model,lm=lm_model,rlm=rlm_model) ) # examples of using this are on EPage 82 
print( summary(resamp) )
print( summary(diff(resamp)) )

# Part (e): Lets look at the coefficients choosen selected by the optimal model:
#
enet_base_model = enet( x=as.matrix(processPredictors_training), y=yield_training, lambda=0.5263158, normalize=TRUE )
enet_coefficients = predict( enet_base_model, newx=as.matrix(processPredictors_testing), s=0.35, mode="fraction", type="coefficients" )

non_zero = enet_coefficients$coefficients != 0
enet_coefficients$coefficients[ non_zero ]

# Part (f): Explore the relationships between the top predictors and the response:
#
# Pick a predictor and plot how the responce varies as a function of this value
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
y_hat = predict( enet_base_model, newx=as.matrix(newdata), s=0.35, mode="fraction", type="fit" )


