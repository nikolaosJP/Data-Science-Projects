#12.7 Discriminant Analysis and Other Linear Classification Models

# Libraries
# Package names
packages <- c("AppliedPredictiveModeling",
              "caret", "glmnet", "MASS", "pamr", "pls", "pROC", "rms", "sparseLDA", "subselect")

# Install packages not yet installed
installed_packages <- packages %in% rownames(installed.packages())
if (any(installed_packages == FALSE)) {
  install.packages(packages[!installed_packages])
}

# Packages loading
invisible(lapply(packages, library, character.only = TRUE))

## Starting the analysis
length(fullSet)
head(fullSet)
length(reducedSet)
head(reducedSet)

reducedCovMat <- cov(training[, reducedSet])
trimmingResults <- trim.matrix(reducedCovMat)
names(trimmingResults)
## See if any predictors were eliminated:
trimmingResults$names.discarded

#However, when we apply the same function to the full set, several predictors are identified:
fullCovMat <- cov(training[, fullSet])
fullSetResults <- trim.matrix(fullCovMat)

## A different choices for the day to exclude was
## made by this function
fullSetResults$names.discarded

ctrl <- trainControl(summaryFunction = twoClassSummary,
                     classProbs = TRUE)

ctrl <- trainControl(method = "LGOCV",
                     summaryFunction = twoClassSummary,
                     classProbs = TRUE,
                     index = list(TrainSet = pre2008))

ctrl <- trainControl(method = "LGOCV",
                     summaryFunction = twoClassSummary,
                     classProbs = TRUE,
                     index = list(TrainSet = pre2008),
                     savePredictions = TRUE)

## Logistic Regression

levels(training$Class)
modelFit <- glm(Class ~ Day,
                  ## Select the rows for the pre-2008 data:
                    data = training[pre2008,],
                  ## 'family' relates to the distribution of the data.
                    ## A value of 'binomial' is used for logistic regression
                    family = binomial)
modelFit

#To get the probability of a successful grant, we subtract from one:
successProb <- 1 - predict(modelFit,
                             ## Predict for several days
                               newdata = data.frame(Day = c(10, 150, 300,
                                                              350)),
                             ## glm does not predict the class, but can
                               ## produce the probability of the event
                               type = "response")
successProb

daySquaredModel <- glm(Class ~ Day + I(Day^2),
                         data = training[pre2008,],
                         family = binomial)
daySquaredModel


rcsFit <- lrm(Class ~ rcs(Day), data = training[pre2008,])
rcsFit

dayProfile <- Predict(rcsFit,
                        ## Specify the range of the plot variable
                          Day = 0:365,
                        ## Flip the prediction to get the model for
                          ## successful grants
                          fun = function(x) -x)
plot(dayProfile, ylab = "Log Odds")

training$Day2 <- training$Day^2
fullSet <- c(fullSet, "Day2")
reducedSet <- c(reducedSet, "Day2")


set.seed(476)
lrFull <- train(training[,fullSet],
                  y = training$Class,
                  method = "glm",
                  metric = "ROC",
                  trControl = ctrl)

lrFull

set.seed(476)
lrReduced <- train(training[,reducedSet],
                     y = training$Class,
                     method = "glm",
                     metric = "ROC",
                     trControl = ctrl)
lrReduced
head(lrReduced$pred)

confusionMatrix(data = lrReduced$pred$pred,
                  reference = lrReduced$pred$obs)

reducedRoc <- roc(response = lrReduced$pred$obs,
                    predictor = lrReduced$pred$successful,
                    levels = rev(levels(lrReduced$pred$obs)))
plot(reducedRoc, legacy.axes = TRUE)
auc(reducedRoc)

## Linear Discriminant Analysis

#We can fit the LDA model as follows:
## First, center and scale the data
grantPreProcess <- preProcess(training[pre2008, reducedSet])
grantPreProcess

scaledPre2008 <- predict(grantPreProcess,
                           newdata = training[pre2008, reducedSet])
scaled2008HoldOut <- predict(grantPreProcess,
                               newdata = training[-pre2008, reducedSet])
ldaModel <- lda(x = scaledPre2008,
                  grouping = training$Class[pre2008])

head(ldaModel$scaling)

ldaHoldOutPredictions <- predict(ldaModel, scaled2008HoldOut)

set.seed(476)
ldaFit1 <- train(x = training[, reducedSet],
                   y = training$Class,
                   method = "lda",
                   preProc = c("center","scale"),
                   metric = "ROC",
                   ## Defined above
                     trControl = ctrl)
ldaFit1

ldaTestClasses <- predict(ldaFit1,
                            + newdata = testing[,reducedSet])
ldaTestProbs <- predict(ldaFit1,
                          newdata = testing[,reducedSet],
                          type = "prob")

## Partial Least Squares Discriminant Analysis

plsdaModel <- plsda(x = training[pre2008,reducedSet],
                      y = training[pre2008, "Class"],
                      ## The data should be on the same scale for PLS. The
                        ## 'scale' option applies this pre-processing step
                        scale = TRUE,
                      ## Use Bayes method to compute the probabilities
                        probMethod = "Bayes",
                      ## Specify the number of components to model
                        ncomp = 4)
## Predict the 2008 hold-out set
plsPred <- predict(plsdaModel,
                       newdata = training[-pre2008, reducedSet])

head(plsPred)

plsProbs <- predict(plsdaModel,
                    newdata = training[-pre2008, reducedSet],
                    type = "prob")
head(plsProbs)

set.seed(476)
plsFit2 <- train(x = training[, reducedSet],
                   y = training$Class,
                   method = "pls",
                   tuneGrid = expand.grid(.ncomp = 1:10),
                   preProc = c("center","scale"),
                   metric = "ROC",
                   trControl = ctrl)

plsImpGrant <- varImp(plsFit2, scale = FALSE)
plsImpGrant

plot(plsImpGrant, top = 20, scales = list(y = list(cex = .95)))

## Penalized Models


glmnetModel <- glmnet(x = as.matrix(training[,fullSet]),
                        + y = training$Class,
                        + family = "binomial")
## Compute predictions for three difference levels of regularization.
## Note that the results are not factors
 predict(glmnetModel,
            newx = as.matrix(training[1:5,fullSet]),
            s = c(0.05, 0.1, 0.2),
            type = "class")

## Which predictors were used in the model?
predict(glmnetModel,
          newx = as.matrix(training[1:5,fullSet]),
          s = c(0.05, 0.1, 0.2),
          type = "nonzero")

## Specify the tuning values:
glmnGrid <- expand.grid(.alpha = c(0, .1, .2, .4, .6, .8, 1),
                            .lambda = seq(.01, .2, length = 40))
set.seed(476)
glmnTuned <- train(training[,fullSet],
                     y = training$Class,
                     method = "glmnet",
                     tuneGrid = glmnGrid,
                     preProc = c("center", "scale"),
                     metric = "ROC",
                     trControl = ctrl)


sparseLdaModel <- sda(x = as.matrix(training[,fullSet]),
                        y = training$Class,
                        lambda = 0.01,
                        stop = -6)

## Nearest Shrunken Centroids

## Switch dimensions using the t() function to transpose the data.
## This also implicitly converts the training data frame to a matrix.
inputData <- list(x = t(training[, fullSet]), y = training$Class)

## The basic syntax to create the model is:

nscModel <- pamr.train(data = inputData)

exampleData <- t(training[1:5, fullSet])
pamr.predict(nscModel, newx = exampleData, threshold = 5)

## Which predictors were used at this threshold? The predict
## function shows the column numbers for the retained predictors.
thresh17Vars <- pamr.predict(nscModel, newx = exampleData,
                                 threshold = 17, type = "nonzero")
fullSet[thresh17Vars]

## We chose the specific range of tuning parameters here:
nscGrid <- data.frame(.threshold = 0:25)
set.seed(476)
nscTuned <- train(x = training[,fullSet],
                    y = training$Class,
                    method = "pam",
                    preProc = c("center", "scale"),
                    tuneGrid = nscGrid,
                    metric = "ROC",
                    trControl = ctrl)

predictors(nscTuned)
varImp(nscTuned, scale = FALSE)

# Exercise 
data(hepatic)

table(injury)

# Lump all compounds that cause injury into a "Yes" category:
#
any_damage = as.character( injury )
any_damage[ any_damage=="Mild" ] = "Yes"
any_damage[ any_damage=="Severe" ] = "Yes"
any_damage[ any_damage=="None" ] = "No"
table( any_damage )

# Here we just verify that using the function "createDataPartition" does not
# change the proportion of Yes and No's from the population proportions.
# This is especially important when one's problem has non equal class proportions and we
# don't use the "t" variable in what follows below.  The function we do use (carets "train" function)
# calls createDataPartition as a subprocess.
#
t = createDataPartition( any_damage, p=0.8, list=FALSE, times=1 )
table( any_damage ) / sum( table( any_damage ) ) # the population proportions 
table( any_damage[t] ) / sum( table( any_damage[t] ) ) # the proprtions from one resampling 

t = createDataPartition( any_damage, p=0.8, list=FALSE, times=10 ) # check again with times=10 
table( any_damage[t[,1]] ) / sum( table( any_damage[t[,1]] ) )

# Convert our response to a factor (make the first factor correspond to the event of interest):
#
any_damage = factor( any_damage, levels=c("Yes","No") )

# Part c:
#

#------------------------------------------------------------------------
# Use the biological predictors:
#------------------------------------------------------------------------
zv_cols = nearZeroVar(bio)
print( sprintf("Dropping %d zero variance columns from %d (fraction=%10.6f)", length(zv_cols), dim(bio)[2], length(zv_cols)/dim(bio)[2]) );
X = bio[,-zv_cols]

# There are no linearly dependent columns remaining (or to start with)
print( findLinearCombos(X) )

# Build linear models with this data:
#
bio_linear_models = build_AUC_linear_models( X, any_damage )

# Present the sampled ROC estimate for each model:
#
df = rbind( data.frame(name="LR", auc=bio_linear_models$glm$auc), data.frame(name="LDA", auc=bio_linear_models$lda$auc),
            data.frame(name="PLSDA", auc=bio_linear_models$plsda$auc), data.frame(name="GLMNET", auc=bio_linear_models$glmnet$auc),
            data.frame(name="NSC", auc=bio_linear_models$nsc$auc) )

# Order our dataframe by performance:
#
df = df[ with( df, order(auc) ), ]
print( "AUC Performance using biological predictors" )
print( df )

# For the best model (logistic regression) what are the most important predictors:
#
varImp(bio_linear_models$glm$classifier)


#------------------------------------------------------------------------
# Use the chemical predictors:
#------------------------------------------------------------------------
#
zv_cols = nearZeroVar(chem)

print( sprintf("Dropping %d zero variance columns from %d (fraction=%10.6f)", length(zv_cols), dim(chem)[2], length(zv_cols)/dim(chem)[2]) );
X = chem[,-zv_cols]

# Remove the linearly dependent columns
fLC = findLinearCombos(X)
X = X[,-fLC$remove]

# Build linear models with this data:
#
chem_linear_models = build_AUC_linear_models( X, any_damage )

# Present the sampled ROC estimate for each model:
#
df = rbind( data.frame(name="LR", auc=chem_linear_models$glm$auc), data.frame(name="LDA", auc=chem_linear_models$lda$auc),
            data.frame(name="PLSDA", auc=chem_linear_models$plsda$auc), data.frame(name="GLMNET", auc=chem_linear_models$glmnet$auc),
            data.frame(name="NSC", auc=chem_linear_models$nsc$auc) )

# Order our dataframe by performance:
#
df = df[ with( df, order(auc) ), ]
print( "AUC Performance using chemical predictors" )
print( df )

# For the best model (logistic regression again) what are the most important predictors:
#
varImp(chem_linear_models$glm$classifier)

# Plot the best two logistic regression rocCurves:
#
plot( bio_linear_models$glm$roc, legacy.axes=T, add=F, col="gray" )
plot( chem_linear_models$glm$roc, legacy.axes=T, add=T )
legend( 0.6, 0.2, c("LR (biological)","LR (chemical)"), col=c("gray","black"), lty=c(1,1) )

#------------------------------------------------------------------------
# Use ALL predictors into one set of predictors:
#------------------------------------------------------------------------
#
all = cbind( bio, chem )
zv_cols = nearZeroVar(all)
print( sprintf("Dropping %d zero variance columns from %d (fraction=%10.6f)", length(zv_cols), dim(all)[2], length(zv_cols)/dim(all)[2]) );
X = all[,-zv_cols]

# There are no linearly dependent columns remaining (or to start with)
fLC = findLinearCombos(X)
X = X[,-fLC$remove]
print( sprintf("Dropping %d columns due to linear combinations %d (fraction=%10.6f)", length(fLC$remove), dim(X)[2], length(fLC$remove)/dim(X)[2]) );

# Build linear models with this data:
#
all_linear_models = build_AUC_linear_models( X, any_damage )

# Present the sampled ROC estimate for each model:
#
df = rbind( data.frame(name="LR", auc=all_linear_models$glm$auc), data.frame(name="LDA", auc=all_linear_models$lda$auc),
            data.frame(name="PLSDA", auc=all_linear_models$plsda$auc), data.frame(name="GLMNET", auc=all_linear_models$glmnet$auc),
            data.frame(name="NSC", auc=all_linear_models$nsc$auc) )

# Order our dataframe by performance:
#
df = df[ with( df, order(auc) ), ]
print( "AUC Performance using all predictors" )
print( df )

# Report the top five predictors (for the LDA model):
#
varImp(all_linear_models$lda$classifier)

# Plot the logistic regression rocCurves using the bio and chem predictors and the best roc curve using both bio and chem predictors:
#
plot( bio_linear_models$glm$roc, legacy.axes=T, add=F, col="gray", lty=2, ylim=c(0,1.05) )
plot( chem_linear_models$glm$roc, legacy.axes=T, add=T, col="darkgray" )
plot( all_linear_models$lda$roc, legacy.axes=T, add=T )
legend( 0.6, 0.2, c("LR (biological)","LR (chemical)", "LDA (all)"), col=c("gray","darkgray","black"), lty=c(2,1,1) )

# Exercise 12.2 

library(caret) # needed for the oil dataset
library(AppliedPredictiveModeling)
library(pROC)

source('build_PCC_linear_models.R')

data(oil)

table(oilType)

table(oilType) / sum(table(oilType))

# Part (c):
#
zv_cols = nearZeroVar(fattyAcids)
print( sprintf("Dropping %d zero variance columns from %d (fraction=%10.6f)", length(zv_cols), dim(fattyAcids)[2], length(zv_cols)/dim(fattyAcids)[2]) );
X = fattyAcids

# There are no linearly dependent columns remaining (or to start with)
print( findLinearCombos(X) )

# Build linear models with this data:
#
linear_models = build_PCC_linear_models( X, oilType )

# Present the sampled accuracy estimates for each model:
#
df = rbind( data.frame(name="LDA", Accuracy=linear_models$lda$confusionMatrix$overall[1]),
            data.frame(name="GLMNET", Accuracy=linear_models$glmnet$confusionMatrix$overall[1]),
            data.frame(name="NSC", Accuracy=linear_models$nsc$confusionMatrix$overall[1]) )
rownames(df) = NULL

# Order our dataframe by performance:
#
df = df[ with( df, order(Accuracy) ), ]
print( "ACCURACY Performance on the oil dataset" )
print( df )

# For the NSC model ... where is it making its errors:
#
print( linear_models$nsc$confusionMatrix )

# Exercise 12.3

library(caret)
library(AppliedPredictiveModeling)
library(pROC)

library(C50) # needed for the churn dataset

source('build_AUC_linear_models.R')

data(churn) # loads churnTrain & churnTest

str(churnTrain)

table(churnTrain$churn)

# Drop all factor predictors:
#
churnTrain = churnTrain[,-c(1,3,4,5)]
churnTest = churnTest[,c(1,3,4,5)]

# Build various linear models:
#
X = churnTrain[,-16] # drop the churn response
y = churnTrain[,16]

# Look for (and drop) zero variance columns:
zv_cols = nearZeroVar(X)
X = X[,-zv_cols]

# There are no linearly dependent columns remaining:
print( findLinearCombos(X) )

# Get a high level View of which predictors might be most predictive:
# 
y_numeric = rep( +1, length(y) ) # let +1 represent a churn and a negative outcome
y_numeric[y=="no"] = 0 # let 0 be a non churn
cor_with_response = cor( cbind( X, y_numeric ) )
n = names( cor_with_response[,15] )
c = as.double( cor_with_response[,15] )
dfv = data.frame(c)
rownames(dfv) = n
colnames(dfv) = c("correlation")
print( dfv[ order(abs(dfv$correlation)), , drop=FALSE ] )

# Part b (build some linear models ... running PLS takes too much time and is not run):
#
linear_models = build_AUC_linear_models( X, y, build_pls_model=FALSE )

# Present the sampled ROC AUC estimate for each model:
#
df = rbind( data.frame(name="LR", auc=linear_models$glm$auc), data.frame(name="LDA",auc=linear_models$lda$auc),
            data.frame(name="GLMNET", auc=linear_models$glmnet$auc), data.frame(name="NSC", auc=linear_models$nsc$auc) )

# Order our dataframe by performance:
#
df = df[ with( df, order(auc) ), ]
print( "AUC Performance" )
print( df )

# For the best model (LDA) what are the most important predictors:
#
varImp(linear_models$lda$classifier)

# Plot the best rocCurve:
#
plot( linear_models$lda$roc, legacy.axes=T, add=F, col="black" )


# Plot the lift curve for this data:
#
lp = lift( y ~ yes, data=linear_models$lda$predictions, class="yes" )
plot(lp)







