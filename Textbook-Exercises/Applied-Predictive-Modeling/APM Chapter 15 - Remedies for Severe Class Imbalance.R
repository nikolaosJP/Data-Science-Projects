#15 Remedies for Severe Class Imbalance

# Libraries
# Package names
packages <- c("caret", "C50", "DMwR", "DWD", "kernlab",
              "pROC", "rpart")

# Install packages not yet installed
installed_packages <- packages %in% rownames(installed.packages())
if (any(installed_packages == FALSE)) {
  install.packages(packages[!installed_packages])
}

# Packages loading
invisible(lapply(packages, library, character.only = TRUE))

## Computing

data(ticdata)

recodeLevels <- function(x)
  {
    x <- as.numeric(x)
    ## Add zeros to the text version:
      x <- gsub(" ", "0",format(as.numeric(x)))
      factor(x)
      }
## Find which columns are regular factors or ordered factors
isOrdered <- unlist(lapply(ticdata, is.ordered))
isFactor <- unlist(lapply(ticdata, is.factor))
convertCols <- names(isOrdered)[isOrdered | isFactor]
for(i in convertCols) ticdata[,i] <- recodeLevels(ticdata[,i])
## Make the level 'insurance' the first factor level
  
ticdata$CARAVAN <- factor(as.character(ticdata$CARAVAN),
                              levels = rev(levels(ticdata$CARAVAN)))
## The training and test sets were created using stratified random sampling:

## First, split the training set off
set.seed(156)
split1 <- createDataPartition(ticdata$CARAVAN, p = .7)[[1]]
other <- ticdata[-split1,]
training <- ticdata[ split1,]
## Now create the evaluation and test sets
set.seed(934)
split2 <- createDataPartition(other$CARAVAN, p = 1/3)[[1]]
evaluation <- other[ split2,]
testing <- other[-split2,]
## Determine the predictor names
predictors <- names(training)[names(training) != "CARAVAN"]

#The customer type predictor has 39 levels, so a predictor set of dummy variables is created for this and other models using the model.matrix function:

## The first column is the intercept, which is eliminated:
trainingInd <- data.frame(model.matrix(CARAVAN ~ .,
                                           + data = training))[,-1]
evaluationInd <- data.frame(model.matrix(CARAVAN ~ .,
                                           + data = evaluation))[,-1]
testingInd <- data.frame(model.matrix(CARAVAN ~ .,
                                        + data = testing))[,-1]
## Add the outcome back into the data set
trainingInd$CARAVAN <- training$CARAVAN
evaluationInd$CARAVAN <- evaluation$CARAVAN
testingInd$CARAVAN <- testing$CARAVAN
## Determine a predictor set without highly sparse and unbalanced distributions:
isNZV <- nearZeroVar(trainingInd)
noNZVSet <- names(trainingInd)[-isNZV]
## To obtain different performance measures, two wrapper functions were created:
## For accuracy, Kappa, the area under the ROC curve,
## sensitivity and specificity:
fiveStats <- function(...) c(twoClassSummary(...),
                                 + defaultSummary(...))
## Everything but the area under the ROC curve:
  fourStats <- function (data, lev = levels(data$obs), model = NULL)
    {
      
        accKapp <- postResample(data[, "pred"], data[, "obs"])
        out <- c(accKapp,
                   sensitivity(data[, "pred"], data[, "obs"], lev[1]),
                   specificity(data[, "pred"], data[, "obs"], lev[2]))
        names(out)[3:4] <- c("Sens", "Spec")
        out
        }

#Two control functions are developed for situations when class probabilities can be created and when they cannot:
ctrl <- trainControl(method = "cv",
                         classProbs = TRUE,
                         summaryFunction = fiveStats,
                         verboseIter = TRUE)
ctrlNoProb <- ctrl
ctrlNoProb$summaryFunction <- fourStats
ctrlNoProb$classProbs <- FALSE
##The three baseline models were fit with the syntax:
set.seed(1410)
rfFit <- train(CARAVAN ~ ., data = trainingInd,
                 method = "rf",
                 trControl = ctrl,
                 ntree = 1500,
                 tuneLength = 5,
                 metric = "ROC")
set.seed(1410)
lrFit <- train(CARAVAN ~ .,
                 data = trainingInd[, noNZVSet],
                 method = "glm",
                 trControl = ctrl,
                 metric = "ROC")
set.seed(1401)
fdaFit <- train(CARAVAN ~ ., data = training,
                  method = "fda",
                  tuneGrid = data.frame(.degree = 1, .nprune = 1:25),
                  metric = "ROC",
                  trControl = ctrl)
## A data frame is used to house the predictions from different models:
evalResults <- data.frame(CARAVAN = evaluation$CARAVAN)
evalResults$RF <- predict(rfFit,
                            newdata = evaluationInd,
                            type = "prob")[,1]

evalResults$FDA <- predict(fdaFit,
                             newdata = evaluation[, predictors],
                             type = "prob")[,1]
evalResults$LogReg <- predict(lrFit,
                                newdata = valuationInd[, noNZVSet],
                                type = "prob")[,1]
## The ROC and lift curves are created from these objects. For example:

rfROC <- roc(evalResults$CARAVAN, evalResults$RF,
               levels = rev(levels(evalResults$CARAVAN)))
## Create labels for the models:
labs <- c(RF = "Random Forest", LogReg = "Logistic Regression",
              FDA = "FDA (MARS)")
lift1 <- lift(CARAVAN ~ RF + LogReg + FDA, data = evalResults,
                labels = labs)
rfROC
lift1
#To plot the curves:
plot(rfROC, legacy.axes = TRUE)
xyplot(lift1,
         ylab = "%Events Found", xlab = "%Customers Evaluated",
         lwd = 2, type = "l")

## Alternative Cutoffs

rfThresh <- coords(rfROC, x = "best", best.method = "closest.topleft")
rfThresh

## For this, new predicted classes can be calculated:
newValue <- factor(ifelse(evalResults$RF > rfThresh,
                              "insurance", "noinsurance"),
                       levels = levels(evalResults$CARAVAN))

## Sampling Methods

set.seed(1103)
upSampledTrain <- upSample(x = training[,predictors],
                             y = training$CARAVAN,
                             ## keep the class variable name the same:
                               yname = "CARAVAN")
dim(training)
dim(upSampledTrain)

table(upSampledTrain$CARAVAN)


set.seed(1103)
smoteTrain <- SMOTE(CARAVAN ~ ., data = training)
dim(smoteTrain)
table(smoteTrain$CARAVAN)


## Cost-Sensitive Training


## We will train over a large cost range, so we precompute the sigma
## parameter and make a custom tuning grid:
set.seed(1157)
sigma <- sigest(CARAVAN ~ ., data = trainingInd[, noNZVSet], frac = .75)
names(sigma) <- NULL
svmGrid <- data.frame(.sigma = sigma[2],
                        .C = 2^seq(-6, 1, length = 15))
## Class probabilities cannot be generated with class weights, so
## use the control object 'ctrlNoProb' to avoid estimating the
## ROC curve.
set.seed(1401)
SVMwts <- train(CARAVAN ~ .,
                  data = trainingInd[, noNZVSet],
                  method = "svmRadial",
                  tuneGrid = svmGrid,
                  preProc = c("center", "scale"),
                  class.weights = c(insurance = 18, noinsurance = 1),
                  metric = "Sens",
                  trControl = ctrlNoProb)
SVMwts

costMatrix <- matrix(c(0, 1, 20, 0), ncol = 2)
rownames(costMatrix) <- levels(training$CARAVAN)
colnames(costMatrix) <- levels(training$CARAVAN)
costMatrix

## Here, there would be a 20-fold higher cost of a false negative than a false positive. To fit the model:

set.seed(1401)
cartCosts <- train(x = training[,predictors],
                     y = training$CARAVAN,
                     method = "rpart",
                     trControl = ctrlNoProb,
                     metric = "Kappa",
                     tuneLength = 10,
                     parms = list(loss = costMatrix))

## C5.0 has similar syntax to rpart by taking a cost matrix, although this function uses the transpose of the cost matrix structure used by rpart:
c5Matrix <- matrix(c(0, 20, 1, 0), ncol = 2)
rownames(c5Matrix) <- levels(training$CARAVAN)
colnames(c5Matrix) <- levels(training$CARAVAN)
c5Matrix

set.seed(1401)
C5Cost <- train(x = training[, predictors],
                  y = training$CARAVAN,
                  method = "C5.0",
                  metric = "Kappa",
                  cost = c5Matrix,
                  trControl = ctrlNoProb)

## Exercise 16.1

library(caret)
library(arules) # needed for the AdultUCI data

data(AdultUCI)
AdultUCI$fnlwgt = NULL # we are told that this predictor is not informative and should not be used

# Drop any samples that don't have complete records:
AdultUCI = AdultUCI[complete.cases(AdultUCI),]

# Make sure that "large" is the first level of the factor:
AdultUCI$income = factor( as.character( AdultUCI$income ), levels=c( "large", "small" ) )

# Convert some of the column names so that they are easier to work with (i.e. remove the hyphens):
colnames( AdultUCI ) = as.character( lapply( colnames( AdultUCI ), function(x){ gsub("-","_",x) } ) )

# Lets look at the number of levels associated with each factor:
#
# seems like there are not any factors with a huge number of levels
#
print( levels( AdultUCI$workclass ) ) # 8 levels
print( levels( AdultUCI$education ) ) # 16 levels
print( levels( AdultUCI$marital_status ) ) # 7 levels
print( levels( AdultUCI$occupation ) ) # 14 levels
print( levels( AdultUCI$relationship ) ) # 6 levels
print( levels( AdultUCI$race ) ) # 5 levels
print( levels( AdultUCI$sex ) ) # 2 levels (of course)
print( levels( AdultUCI$native_country ) ) # 41 levels
print( levels( AdultUCI$income ) ) # 2 levels small & large

print( table( AdultUCI$income ) )

T = table( AdultUCI$income )
print( T / sum(T) )

# Break our dataset into a training/evaluation/testing dataset:
#
set.seed(156)
split1 = createDataPartition( AdultUCI$income, p=0.7 )[[1]]

# Simple verification that we have the same fraction of samples in each of these sets: 
#
T_split1 = table( AdultUCI$income[split1] )
print( T_split1 / sum(T_split1) )

T_not_split1 = table( AdultUCI$income[-split1] )
print( T_not_split1 / sum(T_not_split1) )

other = AdultUCI[-split1,]
training = AdultUCI[ split1,]

# Split "other" into an evaluation and a test set:
#
split2 = createDataPartition( other$income, p=1./3 )[[1]]
evaluation = other[ split2, ]
testing = other[-split2, ]

# Lets look if we have any zero variance predictors:
zero_cols = nearZeroVar( training[,-14] )
cn = colnames(training)
print( cn[zero_cols] )

# Drop the feature "native-country":
#
training$native_country = NULL
evaluation$native_country = NULL
testing$native_country = NULL

plot( density( training$capital_gain ) )
plot( density( training$capital_loss ) )

# There are no linearly dependent columns remaining from the continious features:
print( findLinearCombos(training[ , c( "age", "education_num", "capital_gain", "capital_loss", "hours_per_week" ) ]) )

# Lets look at how well some of these continious predictors work:
par(mfrow=c(1,2))
boxplot( age ~ income, data=training, ylab="Age" )
boxplot( education_num ~ income, data=training, ylab="Education Number" )
par(mfrow=c(1,1))

boxplot( capital_gain ~ income, data=training, main="captial gain as a function of age" )
boxplot( capital_loss ~ income, data=training, main="captial loss as a function of age" )
boxplot( hours_per_week ~ income, data=training, main="hours per week as a function of age" )

# Lets look at the correlation of the predictors that are numeric:
#
cor( training[ , c("age", "education_num", "capital_gain", "capital_loss", "hours_per_week") ] )

# Part (c) Build several classification models (we follow the book heavily here):
#

# Wrapper functions for performance measures:
#
fiveStats = function(...) c(twoClassSummary(...), defaultSummary(...))
fourStats = function( data, lev=levels(data$obs), model=NULL ){
  accKapp = postResample( data[, "pred"], data[, "obs"] )
  out = c( accKapp, sensitivity(data[, "pred"], data[, "obs"], lev[1]), specificity(data[, "pred"], data[, "obs"], lev[2]) )
  names(out)[3:4] = c("Sens", "Spec")
  out
}

ctrl = trainControl( method="cv", number=5, classProbs=TRUE, summaryFunction=fiveStats, verboseIter=TRUE )

ctrlNoProb = ctrl
ctrlNoProb$classProbs = FALSE
ctrlNoProb$summaryFunction = fourStats

set.seed(1410)
rfFit = train( income ~ ., data=training, method="rf", trControl = ctrl, ntree = 500, tuneLength = 5, metric = "ROC" )

set.seed(1410)
lrFit = train( income ~ ., data=training, method="glm", trControl = ctrl, metric = "ROC" )

set.seed(1410)
fdaFit = train( income ~ ., data=training, method="fda", tuneGrid = data.frame(.degree=1, .nprune=1:25), trControl = ctrl, metric = "ROC" )

# Compare our estimated sensitivity and specificity for these methods on the training data:
#
res = matrix( data=c( mean( rfFit$resample$ROC ), mean( rfFit$resample$Spec ), mean( rfFit$resample$Sens ),
                      mean( lrFit$resample$ROC ), mean( lrFit$resample$Spec ), mean( lrFit$resample$Sens ),
                      mean( fdaFit$resample$ROC ), mean( fdaFit$resample$Spec ),mean( fdaFit$resample$Sens ) ),
              nrow=3, ncol=3, byrow=T )
res = data.frame( res )
rownames(res) = c("RF", "LR", "FDA" )
colnames(res) = c("AUC", "Spec", "Sens" )
print(res)

# Lets look at the predictions from each model on the evaluation dataset:
#
evalResults = data.frame( income = evaluation$income ) # put in the truth
evalResults$RF = predict( rfFit, newdata=evaluation, type="prob" )[,1]
evalResults$LogReg = predict( lrFit, newdata=evaluation, type="prob" )[,1]
evalResults$FDA = predict( fdaFit, newdata=evaluation, type="prob" )[,1]

# Part (d): Find a good trade-off between sensitivity and specificity:
#

# The ROC curves (see the note on the event of interest class in the text):
#
library(pROC)
rfROC = roc( evalResults$income, evalResults$RF, levels=rev( levels(evalResults$income) ) )
logRegROC = roc( evalResults$income, evalResults$LogReg, levels=rev(levels(evalResults$income) ) ) 
FDAROC = roc( evalResults$income, evalResults$FDA, levels=rev( levels(evalResults$income) ) )

plot(rfROC, legacy.axes=TRUE, col="red")
plot(logRegROC, legacy.axes=TRUE, add=T, col="blue")
plot(FDAROC, legacy.axes=TRUE, add=T, col="green")
legend( x="bottomright", c(sprintf("RF (%f)", rfROC$auc), sprintf("LR (%f)", logRegROC$auc), sprintf("FDA (%f)", FDAROC$auc)), col=c("red","blue", "green"), lty=c(1,1,1) )

# The lift plots:
#
labs = c(RF = "Random Forest", LogReg = "Logistic Regression", FDA = "FDA (MARS)")
lift1 = lift( income ~ RF + LogReg + FDA, data=evalResults, labels=labs )
xyplot(lift1, ylab="%Events Found", xlab="%Customers Evaluated", lwd=2, type="l", col=c("red", "blue", "green"))

# Alternate Cutoffs (using the logistic regression classifier):
# 
baseline = coords( logRegROC, x=0.5, input="threshold" )
logRegThresh_ctopleft = coords( logRegROC, x="best", best.method="closest.topleft" )
logRegThresh_youden = coords( logRegROC, x="best", best.method="youden" )
print( rbind( baseline, logRegThresh_ctopleft, logRegThresh_youden ) )

#
# Sampling Methods (EPage 422):
#

# Upsampling:
#
set.seed(1103)
upSampleTraining = upSample( x=training[,-13] , y=training$income, yname="income" )
print( table( upSampleTraining$income ) )

# Lets build the same models as above but using this new dataset:
#
set.seed(1410)
rfFit_us = train( income ~ ., data=upSampleTraining, method="rf", trControl = ctrl, ntree = 500, tuneLength = 5, metric = "ROC" )

set.seed(1410)
lrFit_us = train( income ~ ., data=upSampleTraining, method="glm", trControl = ctrl, metric = "ROC" )

set.seed(1410)
fdaFit_us = train( income ~ ., data=upSampleTraining, method="fda", tuneLength = 10, trControl = ctrl, metric = "ROC" )

# Compare our estimated sensitivity and specificity for these methods on the training data:
#
res = matrix( data=c( mean( rfFit_us$resample$ROC ), mean( rfFit_us$resample$Spec ), mean( rfFit_us$resample$Sens ),
                      mean( lrFit_us$resample$ROC ), mean( lrFit_us$resample$Spec ), mean( lrFit_us$resample$Sens ),
                      mean( fdaFit_us$resample$ROC ), mean( fdaFit_us$resample$Spec ), mean( fdaFit_us$resample$Sens ) ),
              nrow=3, ncol=3, byrow=T )
res = data.frame( res )
rownames(res) = c("RF", "LR", "FDA" )
colnames(res) = c("AUC", "Spec", "Sens" )
print(res)

# What are our default sensitivity and specificity for these methods on the evaluation set?
#
evalResults = data.frame( income = evaluation$income ) # put in the truth
evalResults$RF = predict( rfFit_us, newdata=evaluation, type="prob" )[,1]
evalResults$LogReg = predict( lrFit_us, newdata=evaluation, type="prob" )[,1]
evalResults$FDA = predict( fdaFit_us, newdata=evaluation, type="prob" )[,1]

rfROC = roc( evalResults$income, evalResults$RF, levels:rev( levels(evalResults$income) ) )
logRegROC = roc( evalResults$income, evalResults$LogReg, levels=rev( levels(evalResults$income) ) )
FDAROC = roc( evalResults$income, evalResults$FDA, levels=rev( levels(evalResults$income) ) )

baseline = coords( logRegROC, x=0.5, input="threshold" )
logRegThresh_ctopleft = coords( logRegROC, x="best", best.method="closest.topleft" )
logRegThresh_youden = coords( logRegROC, x="best", best.method="youden" )
print( rbind( baseline, logRegThresh_ctopleft, logRegThresh_youden ) )

#---
# Part (f): Cost Sensitive Models (EPage 423):
#---

# Cost Sensitive SVMs:
#
library(kernlab)
set.seed(1157)
sigma = sigest( income ~ ., data=training, frac=0.75 )
names(sigma) = NULL
svmGrid = data.frame( .sigma=sigma[2], .C=2^seq( -6, +1, length=15 ) )
set.seed(1401)
SVMwts = train( income ~ ., data=training,
                method="svmRadial", tuneGrid=svmGrid,
                preProc=c("center", "scale"),
                class.weights=c(large=10, small=1),
                metric="Sens",
                trControl=ctrlNoProb )

SVMwts_predictions = predict( SVMwts, newdata=evaluation )
SVMwts_results = c( sensitivity( data=SVMwts_predictions, reference=evaluation$income, postive="large" ),
                    specificity( data=SVMwts_predictions, reference=evaluation$income, postive="large" ) )

# Lets check the functions we are using above are correct:
#
sum( SVMwts_predictions=="large" & evaluation$income=="large" ) / sum( evaluation$income=="large" ) # check the calculation of sensitivity
sum( SVMwts_predictions!="large" & evaluation$income!="large" ) / sum( evaluation$income!="large" ) # check the calculation of specificity

# Cost Sensitive CART models:
#
costMatrix = matrix( c(0, 1, 10, 0), ncol=2 ) # 10 fold increase in the cost for a false negative than a false positive
rownames(costMatrix) = levels(training$income)
colnames(costMatrix) = levels(training$income)

library(rpart)
set.seed(1401)
cartCosts = train( x=training[,-13], y=training$income, method="rpart", tuneLength=10, parms = list(loss=costMatrix), metric="Kappa", trControl=ctrlNoProb )

cart_predictions = predict( cartCosts, newdata=evaluation )
cart_results = c( sensitivity( data=cart_predictions, reference=evaluation$income, postive="large" ),
                  specificity( data=cart_predictions, reference=evaluation$income, postive="large" ) )

# Cost Sensitive C5.0 models:
#
c5Matrix = matrix( c(0, 10, 1, 0), ncol=2 )
rownames(c5Matrix) = levels(training$income)
colnames(c5Matrix) = levels(training$income)

library(C50)
set.seed(1401)
C5Costs = train( x=training[,-13], y=training$income, method="C5.0", tuneLength=10, cost = c5Matrix, metric="Kappa", trControl=ctrlNoProb )

C5_predictions = predict( C5Costs, newdata=evaluation )
C5_results = c( sensitivity( data=C5_predictions, reference=evaluation$income, postive="large" ), 
                specificity( data=C5_predictions, reference=evaluation$income, postive="large" ) )

# Print all of the results:
#
M = matrix( c( SVMwts_results, cart_results, C5_results ), nrow=3, ncol=2, byrow=T )
rownames(M) = c("SVM", "CART", "C5.0")
colnames(M) = c("sensitivity", "specificity")
print( M[ order( M[,1] ), ] )

## Exercise 16.2

library(caret)

DF = read.csv("../../Data/Clothing_Store.csv", header=TRUE)

# Drop any samples that don't have complete records:
DF = DF[complete.cases(DF),]

# Lets look at what "type" of variable each one is:
#
## The variables are:
##
## > colnames(DF)
##  [1] "HHKEY"        "ZIP_CODE"     "REC"          "FRE"          "MON"         
##  [6] "CC_CARD"      "AVRG"         "PC_CALC20"    "PSWEATERS"    "PKNIT_TOPS"  
## [11] "PKNIT_DRES"   "PBLOUSES"     "PJACKETS"     "PCAR_PNTS"    "PCAS_PNTS"   
## [16] "PSHIRTS"      "PDRESSES"     "PSUITS"       "POUTERWEAR"   "PJEWELRY"    
## [21] "PFASHION"     "PLEGWEAR"     "PCOLLSPND"    "AMSPEND"      "PSSPEND"     
## [26] "CCSPEND"      "AXSPEND"      "TMONSPEND"    "OMONSPEND"    "SMONSPEND"   
## [31] "PREVPD"       "GMP"          "PROMOS"       "DAYS"         "FREDAYS"     
## [36] "MARKDOWN"     "CLASSES"      "COUPONS"      "STYLES"       "STORES"      
## [41] "STORELOY"     "VALPHON"      "WEB"          "MAILED"       "RESPONDED"   
## [46] "RESPONSERATE" "HI"           "LTFREDAY"     "CLUSTYPE"     "PERCRET"     
## [51] "RESP"        

## Only one variable is not numeric (VALPHON):
##
for( k in colnames(DF) ){
  c = class( DF[,k] )
  if( (c != "numeric") && (c != "integer") ){
    print( k )
  }
}

valphon = rep( 0.0, dim(DF)[1] )
valphon[DF$VALPHON=="Y"] = 1.0
DF$VALPHON = valphon

# Make sure that "true/yes" is the first level of the factor:
inds_true = DF$RESP == 1
inds_false = DF$RESP == 0
DF$RESP[inds_true] = "Yes"
DF$RESP[inds_false] = "No" 
DF$RESP = factor( DF$RESP, levels=c("Yes","No") )

# How imbalanced are our classes:
print( table( DF$RESP ) )
T = table( DF$RESP )
print( T / sum(T) )

# Lets look if we have any zero variance predictors in the features themselves:
#
# This is a property of each feature itself
#
zero_cols = nearZeroVar( DF[,-51] )
cn = colnames(DF)
print( sprintf("Dropping %5d features (due to zero variance) from %5d (%8.4f fraction)", length(zero_cols), length(cn), length(zero_cols)/length(cn)) )
print( "Features dropped would be:" )
print( cn[zero_cols] )

# Lets look at these features with KDE:
plot( density( DF[,"PKNIT_DRES"] ) )
plot( density( DF[,"PJACKETS"] ) )

# There are no linearly dependent columns remaining (or to start with)
print( findLinearCombos(DF[,-51]) )

# Break our dataset into a training/evaluation/testing dataset:
#
set.seed(156)
split1 = createDataPartition( DF$VALPHON, p=0.7 )[[1]]

# Simple verification that we have the same fraction of samples in each of these sets:
#
T_split1 = table( DF$VALPHON[split1] )
print( T_split1 / sum(T_split1) )

T_not_split1 = table( DF$VALPHON[-split1] )
print( T_not_split1 / sum(T_not_split1) )

other = DF[-split1,]
training = DF[ split1,]

# Split "other" into an evaluation and a test set:
#
split2 = createDataPartition( other$VALPHON, p=1./3 )[[1]]
evaluation = other[ split2, ]
testing = other[-split2, ]

# Part (c) Build several classification models (we follow the books examples from this chapter closely here):
#

# Wrapper functions for performance measures:
#
fiveStats = function(...) c(twoClassSummary(...), defaultSummary(...))
fourStats = function( data, lev=levels(data$obs), model=NULL ){
  accKapp = postResample( data[, "pred"], data[, "obs"] )
  out = c(accKapp,
          sensitivity(data[, "pred"], data[, "obs"], lev[1]),
          specificity(data[, "pred"], data[, "obs"], lev[2]))
  names(out)[3:4] = c("Sens", "Spec")
  out
}

ctrl = trainControl( method="cv", number=5, classProbs=TRUE, summaryFunction=fiveStats, verboseIter=TRUE )

ctrlNoProb = ctrl
ctrlNoProb$classProbs = FALSE
ctrlNoProb$summaryFunction = fourStats

set.seed(1410)
rfFit = train( RESP ~ ., data=training, method="rf", trControl=ctrl, ntree=500, tuneLength=5, metric="ROC" )

set.seed(1410)
lrFit = train( RESP ~ ., data=training, method="glm", trControl=ctrl, metric="ROC" )

set.seed(1410)
fdaFit = train( RESP ~ ., data=training, method="fda", tuneLength=10, trControl=ctrl, metric="ROC" )

# Compare our estimated sensitivity and specificity for these methods on the training data:
# 
res = matrix( data=c( mean( rfFit$resample$ROC ), mean( rfFit$resample$Spec ), mean( rfFit$resample$Sens ),
                      mean( lrFit$resample$ROC ), mean( lrFit$resample$Spec), mean( lrFit$resample$Sens ),
                      mean( fdaFit$resample$ROC ), mean( fdaFit$resample$Spec ), mean( fdaFit$resample$Sens ) ),
              nrow=3, ncol=3, byrow=T )
res = data.frame( res )
rownames(res) = c("RF", "LR", "FDA" )
colnames(res) = c("AUC", "Spec", "Sens" )
print(res)

# What are our default sensitivity and specificity for these methods on the evaluation set?
#
evalResults = data.frame( RESP = evaluation$RESP ) # put in the truth
evalResults$RF = predict( rfFit, newdata=evaluation, type="prob" )[,1]
evalResults$LogReg = predict( lrFit, newdata=evaluation, type="prob" )[,1]
evalResults$FDA = predict( fdaFit, newdata=evaluation, type="prob" )[,1]

# Part (c): Construct lift plots on the above classifiers
#
library(pROC)
rfROC = roc( evalResults$RESP, evalResults$RF, levels=rev( levels(evalResults$RESP) ) )
logRegROC = roc( evalResults$RESP, evalResults$LogReg, levels=rev( levels(evalResults$RESP) ) )
FDAROC = roc( evalResults$RESP, evalResults$FDA, levels=rev( levels(evalResults$RESP) ) )

plot(rfROC, legacy.axes=TRUE, col="red")
plot(logRegROC, legacy.axes=TRUE, add=T, col="blue")
plot(FDAROC, legacy.axes=TRUE, add=T, col="green")
legend( x="bottomright",c(sprintf("RF (%f)", rfROC$auc), sprintf("LR (%f)", logRegROC$auc), sprintf("FDA (%f)", FDAROC$auc)), col=c("red","blue", "green"), lty=c(1,1,1) )

# The lift plots:
#
labs = c(RF = "Random Forest", LogReg = "Logistic Regression", FDA = "FDA (MARS)")
lift1 = lift( RESP ~ RF + LogReg + FDA, data=evalResults, labels=labs )
xyplot(lift1, ylab="%Events Found", xlab ="%Customers Evaluated", lwd=2, type="l", col=c("red", "blue", "green"))
grid()

# Part (d): Using sampling methods on several models
#
#
set.seed(1103)
upSampleTraining = upSample( x=training[,-51] , y=training$RESP, yname="RESP" )
print( table( upSampleTraining$RESP ) )

# Lets build the same models as above but using this new dataset:
#
set.seed(1410)
rfFit_us = train( RESP ~ ., data=upSampleTraining, method="rf", trControl = ctrl, ntree = 500, tuneLength = 5, metric = "ROC" )

set.seed(1410)
lrFit_us = train( RESP ~ ., data=upSampleTraining, method="glm", trControl = ctrl, metric = "ROC" )

set.seed(1410)
fdaFit_us = train( RESP ~ ., data=upSampleTraining, method="fda", tuneLength = 10, trControl = ctrl, metric = "ROC" )

# Compare our estimated sensitivity and specificity for these methods on the training data:
#
res = matrix( data=c( mean( rfFit_us$resample$ROC ), mean( rfFit_us$resample$Spec ), mean( rfFit_us$Eesample$Sens ), 
                      mean( lrFit_us$resample$ROC ), mean( lrFit_us$resample$Spec ), mean( lrFit_us$resample$Sens ), 
                      mean( fdaFit_us$resample$ROC ), mean( fdaFit_us$resample$Spec ), mean( fdaFit_us$resample$Sens ) ),
              nrow=3, ncol=3, byrow=T )
res = data.frame( res )
rownames(res) = c("RF", "LR", "FDA" )
colnames(res) = c("AUC", "Spec", "Sens" )
print(res)

# What are our default sensitivity and specificity for these upsampled methods on the evaluation set?
#
evalResults = data.frame( RESP = evaluation$RESP ) # put in the truth
evalResults$RF = predict( rfFit_us, newdata=evaluation, type="prob" )[,1]
evalResultssLogReg = predict( lrFit_us, newdata=evaluation,type="prob" )[,1] 
evalResults$FDA = predict( fdaFit_us, newdata=evaluation, type="prob" )[,1]

library(pROC)
rfROC = roc( evalResults$RESP, evalResults$RF, levels=rev( levels(evalResults$RESP) ) )
logRegROC = roc( evalResults$RESP, evalResults$LogReg, levels=rev(levels(evalResults$RESP) ) )
FDAROC = roc( evalResults$RESP, evalResults$FDA, levels=rev( levels(evalResults$RESP) ) )

plot(rfROC, legacy.axes=TRUE, col="red")
plot(logRegROC, legacy.axes=TRUE, add=T, col="blue")
plot(FDAROC, legacy.axes=TRUE, add=T, col="green")
legend( x="bottomright", c(sprintf("RF (%f)", rfROC$auc), sprintf("LR (%f)", logRegROC$auc), sprintf("FDA (%f)", FDAROC$auc)), col=c("red","blue", "green"), lty=c(1,1,1) )

baseline = coords( logRegROC, X=0.5, input="threshold" )
logRegThresh_ctopleft = coords( logRegROC, x="best", best.method="closest.topleft" )
logRegThresh_youden = coords( logRegROC, x="best", best.method="youden" )
print( rbind( baseline, logRegThresh_ctopleft, logRegThresh_youden ) )

# Lets create a lift plot with the random forest results:
#
labs = c(RF = "Random Forest", LogReg = "Logistic Regression", FDA = "FDA (MARS)")
lift1 = lift( RESP ~ RF + LogReg + FDA, data=evalResults, labels=labs )
xyplot(lift1, ylab="%Events Found", xlab="%Customers Evaluated", lwd=2, type="l", col=c("red", "blue", "green"))
grid()

