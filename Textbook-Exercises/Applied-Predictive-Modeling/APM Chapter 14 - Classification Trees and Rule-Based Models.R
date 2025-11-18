# 14 - Classification Trees and Rule-Based Models

# Libraries
# Package names
packages <- c("C50", "caret", "gbm", "ipred",
              "partykit", "pROC", "randomForest", "RWeka", "rpart")

# Install packages not yet installed
installed_packages <- packages %in% rownames(installed.packages())
if (any(installed_packages == FALSE)) {
  install.packages(packages[!installed_packages])
}

# Packages loading
invisible(lapply(packages, library, character.only = TRUE))

## Classification Trees
## NOTE: This section also uses the same R objects created in the last chapter that contain the data (such as the data frame training).

cartModel <- rpart(factorForm, data = training[pre2008,])

#To show this we generate a smaller model with two predictors:
rpart(Class ~ NumCI + Weekday, data = training[pre2008,])

#The R implementation of C4.5 is in the RWeka package in a function called J48. The function also takes a model formula:
  

J48(Class ~ NumCI + Weekday, data = training[pre2008,])

#A single C5.0 tree can be created from the C50 package:


C5tree <- C5.0(Class ~ NumCI + Weekday, data = training[pre2008,])
C5tree
summary(C5tree)

#There are wrappers for these models using the caret function train. For example, to fit the grouped category model for CART, we used:

set.seed(476)
rpartGrouped <- train(x = training[,factorPredictors],
                        y = training$Class,
                        method = "rpart",
                        tuneLength = 30,
                        metric = "ROC",
                        trControl = ctrl)

## Rules

PART(Class ~ NumCI + Weekday, data = training[pre2008,])

## C5.0 rules are created using the C5.0 function in the same manner as trees, but with the rules = TRUE option:
C5rules <- C5.0(Class ~ NumCI + Weekday, data = training[pre2008,],
                    rules = TRUE)
C5rules
summary(C5rules)

## Bagged Trees

bagging(Class ~ Weekday + NumCI, data = training[pre2008,])

## Random Forest

randomForest(Class ~ NumCI + Weekday, data = training[pre2008,])
  
## Boosted Trees


forGBM <- training
forGBM$Class <- ifelse(forGBM$Class == "successful", 1, 0)
gbmModel <- gbm(Class ~ NumCI + Weekday,
                  data = forGBM[pre2008,],
                  distribution = "bernoulli",
                  interaction.depth = 9,
                  n.trees = 1400,
                  shrinkage = 0.01,
                  ## The function produces copious amounts
                  ## of output by default.
                  verbose = FALSE)

gbmPred <- predict(gbmModel,
                     newdata = head(training[-pre2008,]),
                     type = "response",
                     ## The number of trees must be
                     ## explicitly set
                     n.trees = 1400)
gbmPred
gbmClass <- ifelse(gbmPred > .5, "successful", "unsuccessful")
gbmClass <- factor(gbmClass, levels = levels(training$Class))
gbmClass

#To train boosted versions of C5.0, the trials argument is used (with values between 1 and 100).
C5Boost <- C5.0(Class ~ NumCI + Weekday, data = training[pre2008,],
                  trials = 10)
C5Boost
  
## Exercise 14.2

library(caret)
library(AppliedPredictiveModeling)
library(pROC)
library(C50) # needed for the churn dataset

data(churn) # loads churnTrain & churnTest

X_grouped_categories = churnTrain[,-20] # drop the churn response
y = churnTrain[,20]

# Look for (and drop) zero variance columns (only column 6 is dropped):
zv_cols = nearZeroVar(X_grouped_categories)
X_grouped_categories = X_grouped_categories[,-zv_cols]

# Convert the grouped predictors into binary (one vs. all) predictors using the caret function "dummyVars":
#
grouped_predictors_formula = paste( "~", paste( colnames(X_grouped_categories), collapse=" + " ), sep="" )
grouped_to_one_vs_all = dummyVars( grouped_predictors_formula, data=X_grouped_categories )
X_OVA_categories = predict( grouped_to_one_vs_all, newdata=X_grouped_categories ) # OVA=one vs all

# Set up the train control arguments so that we can compute the area-under-the-curve:
#
ctrl = trainControl( summaryFunction=twoClassSummary, classProbs=TRUE )

# Part (a): Build some basic trees on the churn data:
#

# Grouped categories for all factors:
#
set.seed(345)
rpart.grouped.classifier = train( X_grouped_categories, y, method="rpart", tuneLength=30, metric="ROC", trControl=ctrl )
rpart.grouped.predictions = predict( rpart.grouped.classifier, X_grouped_categories, type="prob" )
rpart.grouped.rocCurve = pROC::roc( response=y, predictor=rpart.grouped.predictions[,1] )
rpart.grouped.auc = rpart.grouped.rocCurve$auc[1]

# One vs. all categories for all factors:
#
set.seed(345)
rpart.OVA.classifier = train( X_OVA_categories, y, method="rpart", tuneLength=30, metric="ROC", trControl=ctrl )
rpart.OVA.predictions = predict( rpart.OVA.classifier, X_OVA_categories, type="prob" )
rpart.OVA.rocCurve = pROC::roc( response=y, predictor=rpart.OVA.predictions[,1] )
rpart.OVA.auc = rpart.OVA.rocCurve$auc[1]

# How do these two techniques compare:
print( c( rpart.grouped.auc, rpart.OVA.auc ) )

# Part (b): Try bagging:
#
n_predictors = dim(X_grouped_categories)[2]
set.seed(345)
bagging.grouped.classifier = train( X_grouped_categories, y, method="rf", tuneGrid=data.frame(.mtry=n_predictors), metric="ROC", trControl=ctrl )
bagging.grouped.predictions = predict( bagging.grouped.classifier, X_grouped_categories, type="prob" )
bagging.grouped.rocCurve = pROC::roc( response=y, predictor=bagging.grouped.predictions[,1] )
bagging.grouped.auc = bagging.grouped.rocCurve$auc[1]

n_predictors = dim(X_OVA_categories)[2]
set.seed(345)
bagging.OVA.classifier = train( X_OVA_categories, y, method="rf",tuneGrid=data.frame(.mtry=n_predictors), metric="ROC", trControl=ctrl )
bagging.OVA.predictions = predict( bagging.OVA.classifier, X_OVA_categories, type="prob" )
bagging.OVA.rocCurve = pROC::roc( response=y, predictor=bagging.OVA.predictions[,1] )
bagging.OVA.auc = bagging.OVA.rocCurve$auc[1]

# How do the bagging techniques compare:
print( c( bagging.grouped.auc, bagging.OVA.auc ) )

# Part (b): Try boosting:
#

# GBM:
gbmGrid = expand.grid( .interaction.depth = seq( 1, 7, by=2 ), .n.trees = seq( 100, 1000, by=100 ), .shrinkage = c(0.01, 0.05, 0.1) )
set.seed(345)
gbm.grouped.classifier = train( X_grouped_categories, y, method="gbm", tuneGrid=gbmGrid, metric="ROC", trControl=ctrl, verbose=FALSE )
gbm.grouped.predictions = predict( gbm.grouped.classifier, X_grouped_categories, type="prob" )
gbm.grouped.rocCurve = pROC::roc( response=y, predictor=gbm.grouped.predictions[,1] )
gbm.grouped.auc = gbm.grouped.rocCurve$auc[1]

set.seed(345)
gbm.OVA.classifier = train( X_OVA_categories, y, method="gbm", tuneGrid=gbmGrid, metric="ROC", trControl=ctrl, verbose=FALSE )
gbm.OVA.predictions = predict( gbm.OVA.classifier, X_OVA_categories, type="prob" )
gbm.OVA.rocCurve = pROC::roc( response=y, predictor=gbm.OVA.predictions[,1] )
gbm.OVA.auc = gbm.OVA.rocCurve$auc[1]

# ADA:
set.seed(345)
ada.grouped.classifier = train( X_grouped_categories, y, method="ada", metric="ROC", trControl=ctrl, verbose=FALSE )
ada.grouped.predictions = predict( ada.grouped.classifier, X_grouped_categories, type="prob" )
ada.grouped.rocCurve = pROC::roc( response=y, predictor=ada.grouped.predictions[,1] )
ada.grouped.auc = ada.grouped.rocCurve$auc[1]

set.seed(345)
ada.OVA.classifier = train( X_OVA_categories, y, method="ada", metric="ROC", trControl=ctrl, verbose=FALSE )
ada.OVA.predictions = predict( ada.OVA.classifier, X_OVA_categories, type="prob" ) 
ada.OVA.rocCurve = pROC::roc( response=y, predictor=ada.OVA.predictions[,1] )
ada.OVA.auc = ada.OVA.rocCurve$auc[1]

# C5.0:
set.seed(345)
cfive.grouped.classifier = train( X_grouped_categories, y, method="C5.0", metric="ROC", trControl=ctrl )
cfive.grouped.predictions = predict( cfive.grouped.classifier, X_grouped_categories, type="prob" )
cfive.grouped.rocCurve = pROC::roc( response=y, predictor=cfive.grouped.predictions[,1] )
cfive.grouped.auc = cfive.grouped.rocCurve$auc[1]

set.seed(345)
cfive.OVA.classifier = train( X_OVA_categories, y, method="C5.0", metric="ROC", trControl=ctrl )
cfive.OVA.predictions = predict( cfive.OVA.classifier, X_OVA_categories, type="prob" )
cfive.OVA.rocCurve = pROC::roc( response=y, predictor=cfive.OVA.predictions[,1] )
cfive.OVA.auc = cfive.OVA.rocCurve$auc[1]

# How do the boosting techniques compare:
df = rbind( data.frame(name="GBM_grouped" , auc=gbm.grouped.auc ),
            data.frame(name="GBM_ova" , auc=gbm.OVA.auc ),
            data.frame(name="ADA_grouped" , auc=ada.grouped.auc ),
            data.frame(name="ADA_ova" , auc=ada.OVA.auc ),
            data.frame(name="C5.0_grouped", auc=cfive.grouped.auc),
            data.frame(name="C5.0_ova", auc=cfive.OVA.auc) )

# Order our dataframe by performance:
#
df = df[ with( df, order(auc) ), ]
print( "AUC Performance" )
print( df )

# Part (c): Try some rule-based methods:
#

# C5.0Rules:
set.seed(345)
cfiveRules.grouped.classifier = train( X_grouped_categories, y, method="C5.0Rules", metric="ROC", trControl=ctrl )
cfiveRules.grouped.predictions = predict( cfiveRules.grouped.classifier, X_grouped_categories, type="prob" )
cfiveRules.grouped.rocCurve = pROC::roc( response=y, predictor=cfiveRules.grouped.predictions[,1] )
cfiveRules.grouped.auc = cfiveRules.grouped.rocCurve$auc[1]

set.seed(345)
cfiveRules.OVA.classifier = train( X_OVA_categories, y, method="C5.0Rules", metric="ROC", trControl=ctrl )
cfiveRules.OVA.predictions = predict( cfiveRules.OVA.classifier, X_OVA_categories, type="prob" )
cfiveRules.OVA.rocCurve = pROC::roc( response=y, predictor=cfiveRules.OVA.predictions[,1] )
cfiveRules.OVA.auc = cfiveRules.OVA.rocCurve$auc[1]

# How do the rule-based methods compare:
print( c( cfiveRules.grouped.auc, cfiveRules.OVA.auc ) )

summary(cfiveRules.grouped.classifier)

# Part (d): Compare the methods:
#

# For the best model bagging.OVA.classifier / cfiveRules.grouped.classifier what are the most important predictors:
#
varImp(bagging.OVA.classifier)
varImp(cfiveRules.grouped.classifier)

# Plot the best rocCurve:
#
plot( rpart.OVA.rocCurve, legacy.axes=T, add=F, col="gray" )
plot( bagging.grouped.rocCurve, legacy.axes=T, add=T, col="gray" )
plot( cfive.grouped.rocCurve, legacy.axes=T, add=T, col="black" )

# Plot the lift curve for this data:
#
lp = lift( y ~ yes, data=cfive.grouped.predictions, class="yes" )
plot(lp, main="The lift plot for the C5.0 (grouped) classifier")

## Exercise 14.3

library(caret)
library(AppliedPredictiveModeling) # needed for the hepatic dataset
data(hepatic)

set.seed(714)

indx = createFolds(injury, returnTrain=TRUE)
ctr = trainControl(method="cv", index=indx)
mtryValues = c(5, 10, 25, 50, 75, 100)

# The rfCART model:
#
set.seed(1234)
rfCART = train( chem, injury, method="rf", metric="Kappa", ntree=1000, tuneGrid=data.frame(.mtry=mtryValues) )
y_hat = predict( rfCART, chem )
rfCART.cm = confusionMatrix( data=y_hat, reference=injury )

# The cforest model:
#
set.seed(1234)
rfcForest = train( chem, injury, method="cforest", metric="Kappa", tuneGrid=data.frame(.mtry=mtryValues) )
y_hat = predict( rfcForest, chem )
rfcForest.cm = confusionMatrix( data=y_hat, reference=injury )

# How to the two methods compare:
print( c( rfCART.cm$overall[2], rfcForest.cm$overall[2] ) )

# What is the timing comparison between the two models:
print( rfCART$times$everything )
print( rfcForest$times$everything )

# What are the selected important variables
varImp(rfCART)
varImp(rfcForest)


