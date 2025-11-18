#13 Nonlinear Classification Models

# Libraries
# Package names
packages <- c("caret", "earth", "kernlab",
              "klaR", "MASS", "mda", "nnet", "rrcov")

# Install packages not yet installed
installed_packages <- packages %in% rownames(installed.packages())
if (any(installed_packages == FALSE)) {
  install.packages(packages[!installed_packages])
}

# Packages loading
invisible(lapply(packages, library, character.only = TRUE))

## Nonlinear Discriminant Analysis
## NOTE: This section also uses the same R objects created in the last chapter that contain the data (such as the data frame training).

mdaModel <- mda(Class ~ .,
                  ## Reduce the data to the relevant predictors and the
                    ## class variable to use the formula shortcut above
                    data = training[pre2008, c("Class", reducedSet)],
                  subclasses = 3)
mdaModel

predict(mdaModel,
        newdata = head(training[-pre2008, reducedSet]))

#The trControl option for the grants data is set as described in Sect. 12.7 and will be used here:
set.seed(476)
mdaFit <- train(training[,reducedSet], training$Class,
                  method = "mda",
                  metric = "ROC",
                  tuneGrid = expand.grid(.subclasses = 1:8),
                  trControl = ctrl)

## Neural Networks
## Using the formula interface to fit a simple model:

head(class.ind(training$Class))
set.seed(800)
nnetMod <- nnet(Class ~ NumCI + CI.1960,
                  data = training[pre2008,],
                  size = 3, decay = .1)
nnetMod
predict(nnetMod, newdata = head(testing))
predict(nnetMod, newdata = head(testing), type = "class")

## The final model for the grant data has the following syntax:

nnetGrid <- expand.grid(.size = 1:10,
                          .decay = c(0, .1, 1, 2))
maxSize <- max(nnetGrid$.size)
numWts <- 1*(maxSize * (length(reducedSet) + 1) + maxSize + 1)
set.seed(476)
nnetFit <- train(x = training[,reducedSet],
                   y = training$Class,
                   method = "nnet",
                   metric = "ROC",
                   preProc = c("center", "scale", "spatialSign"),
                   tuneGrid = nnetGrid,
                   trace = FALSE,
                   maxit = 2000,
                   MaxNWts = numWts,
                   ## ctrl was defined in the previous chapter
                     trControl = ctrl)

## Flexible Discriminant Analysis

fdaModel <- fda(Class ~ Day + NumCI, data = training[pre2008,],
                  method = earth)
## The MARS model is contained in a sub-object called fit:
summary(fdaModel$fit)

## The final model coefficients can be found with coef(fdaModel). To predict:

predict(fdaModel, head(training[-pre2008,]))

## Support Vector Machines

## The following code fits a radial basis function to the reduced set of predictors in the grant data:

set.seed(202)
sigmaRangeReduced <- sigest(as.matrix(training[,reducedSet]))
svmRGridReduced <- expand.grid(.sigma = sigmaRangeReduced[1],
                                 + .C = 2^(seq(-4, 4)))
set.seed(476)
svmRModel <- train(training[,reducedSet], training$Class,
                     method = "svmRadial",
                     metric = "ROC",
                     preProc = c("center", "scale"),
                     tuneGrid = svmRGridReduced,
                     fit = FALSE,
                     trControl = ctrl)
svmRModel

## Prediction of new samples follows the same pattern as other functions:

predict(svmRModel, newdata = head(training[-pre2008, reducedSet]))
predict(svmRModel, newdata = head(training[-pre2008, reducedSet]),
          type = "prob")


## K-Nearest Neighbors

## The syntax used to produce the top of Fig. 13.14 is:

set.seed(476)
knnFit <- train(training[,reducedSet], training$Class,
                  method = "knn",
                  metric = "ROC",
                  preProc = c("center", "scale"),
                  tuneGrid = data.frame(.k = c(4*(0:5)+1,
                                                 + 20*(1:5)+1,
                                                 + 50*(2:9)+1)),
                  trControl = ctrl)

## The following code predicts the test set data and the corresponding ROC curve:

knnFit$pred <- merge(knnFit$pred, knnFit$bestTune)
knnRoc <- roc(response = knnFit$pred$obs,
                predictor = knnFit$pred$successful,
                levels = rev(levels(knnFit$pred$obs)))
plot(knnRoc, legacy.axes = TRUE)                

## Naıve Bayes

## we create alternate versions of the training and test sets:

## Some predictors are already stored as factors
factors <- c("SponsorCode", "ContractValueBand", "Month", "Weekday")
## Get the other predictors from the reduced set
nbPredictors <- factorPredictors[factorPredictors %in% reducedSet]
nbPredictors <- c(nbPredictors, factors)
## Leek only those that are needed
nbTraining <- training[, c("Class", nbPredictors)]
nbTesting <- testing[, c("Class", nbPredictors)]
## Loop through the predictors and convert some to factors
for(i in nbPredictors){
      varLevels <- sort(unique(training[,i]))
      if(length(varLevels) <= 15)
        {
          nbTraining[, i] <- factor(nbTraining[,i],
                                      levels = paste(varLevels))
          nbTesting[, i] <- factor(nbTesting[,i],
                                      levels = paste(varLevels))
          }
}

## Now, we can use the NaiveBayes function’s formula interface to create a model:

nBayesFit <- NaiveBayes(Class ~ .,
                          data = nbTraining[pre2008,],
                          ## Should the non-parametric estimate
                            ## be used?
                            usekernel = TRUE,
                          ## Laplace correction value
                            fL = 2)
predict(nBayesFit, newdata = head(nbTesting))

## Exercise 13.1

data(hepatic)

# Use the same pre-processing that we did for Chapter 12 Problem 1:
#
# Lump all compounds that cause injury into a "Yes" category:
#
any_damage = as.character( injury )
any_damage[ any_damage=="Mild" ] = "Yes"
any_damage[ any_damage=="Severe" ] = "Yes"
any_damage[ any_damage=="None" ] = "No"

# Convert our response to a factor (make the first factor correspond to the event of interest):
#
any_damage = factor( any_damage, levels=c("Yes","No") )

# Part a:
#

#------------------------------------------------------------------------
# Use the biological predictors:
#------------------------------------------------------------------------
#
zv_cols = nearZeroVar(bio)
print( sprintf("Dropping %d zero variance columns from %d (fraction=%10.6f)", length(zv_cols), dim(bio)[2], length(zv_cols)/dim(bio)[2]) );
X = bio[,-zv_cols]

# There are no linearly dependent columns remaining (or to start with)
print( findLinearCombos(X) )

# Build linear models with this data:
#
bio_nonlinear_models = build_AUC_nonlinear_models( X, any_damage )

# Present the sampled ROC estimate for each model:
#
df = rbind( data.frame(name="MDA", auc=bio_nonlinear_models$mda$auc),
            data.frame(name="NNET", auc=bio_nonlinear_models$nnet$auc),
            data.frame(name="SVM", auc=bio_nonlinear_models$svm$auc),
            data.frame(name="KNN", auc=bio_nonlinear_models$knn$auc),
            data.frame(name="NB", auc=bio_nonlinear_models$nb$auc) )

# Order our dataframe by performance:
#
df = df[ with( df, order(auc) ), ]
print( "AUC Performance using biological predictors" )
print( df )

# For the best model (Mixture Discriminant Analysis) what are the most important predictors:
#
varImp(bio_nonlinear_models$mda$classifier)

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

# Build nonlinear models with this data:
#
chem_nonlinear_models = build_AUC_nonlinear_models( X, any_damage )

# Present the sampled ROC estimate for each model:
#
df = rbind( data.frame(name="MDA", auc=chem_nonlinear_models$mda$auc),
            data.frame(name="NNET", auc=chem_nonlinear_models$nnet$auc),
            data.frame(name="SVM", auc=chem_nonlinear_models$svm$auc),
            data.frame(name="KNN", auc=chem_nonlinear_models$knn$auc),
            data.frame(name="NB", auc=chem_nonlinear_models$nb$auc) )

# Order our dataframe by performance:
#
df = df[ with( df, order(auc) ), ]
print( "AUC Performance using chemical predictors" )
print( df )

# For the best model (neural networks) what are the most important predictors:
#
varImp(chem_nonlinear_models$nnet$classifier)

# Plot the best two logistic regression rocCurves:
#
plot( bio_nonlinear_models$mda$roc, legacy.axes=T, add=F, col="gray" )
plot( chem_nonlinear_models$nnet$roc, legacy.axes=T, add=T )
legend( 0.6, 0.2, c("MDA (biological)","NNET (chemical)"), col=c("gray","black"), lty=c(1,1) )

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
print( sprintf("Dropping %d columns due to linear combinations %d (fraction=%10.6f)",length(fLC$remove), dim(X)[2], length(fLC$remove)/dim(X)[2]) );

# Build nonlinear models with this data:
#
all_nonlinear_models = build_AUC_nonlinear_models( X, any_damage, build_mda_model=FALSE )

# Present the sampled ROC estimate for each model:
#
df = rbind( data.frame(name="NNET", auc=all_nonlinear_models$nnet$auc),
            data.frame(name="SVM", auc=all_nonlinear_models$svm$auc),
            data.frame(name="KNN", auc=all_nonlinear_models$knn$auc),
            data.frame(name="NB", auc=all_nonlinear_models$nb$auc) )

# Order our dataframe by performance:
#
df = df[ with( df, order(auc) ), ]
print( "AUC Performance using all predictors" )
print( df )

# Report the top five predictors:
#
varImp(all_nonlinear_models$knn$classifier)

# Plot the logistic regression rocCurves using the bio and chem predictors and the best roc curve using both bio and chem predictors:
#
plot( bio_nonlinear_models$mda$roc, legacy.axes=T, add=F, col="gray", lty=2, ylim=c(0,1.05) )
plot( chem_nonlinear_models$nnet$roc, legacy.axes=T, add=T, col="black" )
plot( all_nonlinear_models$svm$roc, legacy.axes=T, add=T, col="darkgray" )
legend( 0.6, 0.2, c("MDA (biological)","NNET (chemical)", "SVM (all)"), col=c("gray","black","darkgray"), lty=c(2,1,1) )

## Exercise 13.2

library(caret) # needed for the oil dataset
library(AppliedPredictiveModeling)

source('build_PCC_nonlinear_models.R')
data(oil)

# Part (a):
#
zv_cols = nearZeroVar(fattyAcids)
print( sprintf("Dropping %d zero variance columns from %d (fraction=%10.6f)", length(zv_cols), dim(fattyAcids)[2], length(zv_cols)/dim(fattyAcids)[2]) );
X = fattyAcids

# There are no linearly dependent columns remaining (or to start with)
print( findLinearCombos(X) )

# Build linear models with this data:
#
nonlinear_models = build_PCC_nonlinear_models( X, oilType )

# Present the sampled accuracy estimates for each model:
#
df = rbind( data.frame(name="MDA", Accuracy=nonlinear_models$mda$confusionMatrix$overall[1]),
            data.frame(name="NNET", Accuracy=nonlinear_models$nnet$confusionMatrix$overall[1]),
            data.frame(name="SVM", Accuracy=nonlinear_models$svm$confusionMatrix$overall[1]),
            data.frame(name="KNN", Accuracy=nonlinear_models$knn$confusionMatrix$overall[1]),
            data.frame(name="NB", Accuracy=nonlinear_models$nb$confusionMatrix$overall[1]) )
rownames(df) = NULL

# Order our dataframe by performance:
#
df = df[ with( df, order(Accuracy) ), ]
print( "ACCURACY Performance on the oil dataset" )
print( df )

# For the SVM model ... where is it making its errors:
#
print( nonlinear_models$svm$confusionMatrix )
      