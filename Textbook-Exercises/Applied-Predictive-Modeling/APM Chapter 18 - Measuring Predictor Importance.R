#18 Measuring Predictor Importance

# Libraries
# Package names
packages <- c("AppliedPredictiveModeling", 
              "caret", "CORElearn", "minerva", "pROC", "randomForest")

# Install packages not yet installed
installed_packages <- packages %in% rownames(installed.packages())
if (any(installed_packages == FALSE)) {
  install.packages(packages[!installed_packages])
}

# Packages loading
invisible(lapply(packages, library, character.only = TRUE))

## Computing

## Numeric Outcomes
#To estimate the correlations between the predictors and the outcome, the corfunction is used. For example,
library(AppliedPredictiveModeling)
data(solubility)
cor(solTrainXtrans$NumCarbon, solTrainY)

#To get results for all of the numeric predictors, the apply function can be used to make the same calculations across many columns
## Determine which columns have the string "FP" in the name and
## exclude these to get the numeric predictors
fpCols<- grepl("FP", names(solTrainXtrans))
## Exclude these to get the numeric predictor names
numericPreds <- names(solTrainXtrans)[!fpCols]
corrValues <- apply(solTrainXtrans[, numericPreds],
                      MARGIN = 2,
                      FUN = function(x, y) cor(x, y),
                      y = solTrainY)
head(corrValues)

#The obtain the rank correlation, the corr function has an option method = "spearman".

#The LOESS smoother can be accessed with the loess function in the stats library. The formula method is used to specify the model:
smoother <- loess(solTrainY ~ solTrainXtrans$NumCarbon)
smoother

#The lattice function xyplot is convenient for displaying the LOESS fit:
xyplot(solTrainY ~ solTrainXtrans$NumCarbon,
         type = c("p", "smooth"),
         xlab = "# Carbons",
         ylab = "Solubility")

loessResults <- filterVarImp(x = solTrainXtrans[, numericPreds],
                               y = solTrainY,
                               nonpara = TRUE)
head(loessResults)

#The mine function computes several quantities including the MIC value:
library(minerva)
micValues <- mine(solTrainXtrans[, numericPreds], solTrainY)
## Several statistics are calculated
names(micValues)
head(micValues$MIC)

#For categorical predictors, the simple t.test function computes the difference in means and the p-value. For one predictor:
  
t.test(solTrainY ~ solTrainXtrans$FP044)

#This approach can be extended to all predictors using apply in a manner similar to the one shown above for correlations.
getTstats <- function(x, y)
  {
    tTest <- t.test(y~x)
    out <- c(tStat = tTest$statistic, p = tTest$p.value)
    out
    }
tVals <- apply(solTrainXtrans[, fpCols],
                 MARGIN = 2,
                 FUN = getTstats,
                 y = solTrainY)
## switch the dimensions
tVals <- t(tVals)
head(tVals)

## Categorical Outcomes
#The filterVarImp function also calculates the area under the ROC curve when the outcome variable is an R factor variable:
library(caret)
data(segmentationData)
cellData <- subset(segmentationData, Case == "Train")
cellData$Case <- cellData$Cell <- NULL
## The class is in the first column
head(names(cellData))

rocValues <- filterVarImp(x = cellData[,-1],
                            + y = cellData$Class)
## Column is created for each class
head(rocValues)

#The function attrEval will calculate several versions of Relief (using the estimator option):
library(CORElearn)
reliefValues <- attrEval(Class ~ ., data = cellData,
                           ## There are many Relief methods
                             ## available. See ?attrEval
                             estimator = "ReliefFequalK",
                           ## The number of instances tested:
                             ReliefIterations = 50)
head(reliefValues)

perm <- permuteRelief(x = cellData[,-1],
                        y = cellData$Class,
                        nperm = 500,
                        estimator = "ReliefFequalK",
                        ReliefIterations = 50)
#The permuted ReliefF scores are contained in a sub-object called permutations:
head(perm$permutations)

histogram(~ value|Predictor,
            data = perm$permutations)

head(perm$standardized)
#The MIC statistic can be computed as before but with a binary dummy variable encoding of the classes:
micValues <- mine(x = cellData[,-1],
                      y = ifelse(cellData$Class == "PS", 1, 0))

head(micValues$MIC)

Sp62BTable <- table(training[pre2008, "Sponsor62B"],
                      + training[pre2008, "Class"])
Sp62BTable

fisher.test(Sp62BTable)

ciTable <- table(training[pre2008, "CI.1950"],
                   training[pre2008, "Class"])
ciTable

fisher.test(ciTable)

DayTable <- table(training[pre2008, "Weekday"],
                    training[pre2008, "Class"])
DayTable

chisq.test(DayTable)

## Model-Based Importance Scores

library(randomForest)
set.seed(791)
rfImp <- randomForest(Class ~ ., data = segTrain,
                        ntree = 2000,
                        importance = TRUE)

head(varImp(rfImp))