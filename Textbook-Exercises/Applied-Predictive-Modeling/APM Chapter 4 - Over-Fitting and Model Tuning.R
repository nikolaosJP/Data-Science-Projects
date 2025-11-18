#Chapter 4 -  Over-Fitting and Model Tuning
#Chapter 4 - Computing

library(AppliedPredictiveModeling)
library(caret)
data(twoClassData)

str(predictors)
str(classes)

# Set the random number seed so we can reproduce the results
set.seed(1)
# By default, the numbers are returned as a list. Using
# list = FALSE, a matrix of row numbers is generated.
# These samples are allocated to the training set.
trainingRows <- createDataPartition(classes,
                                        p = .80,
                                        list= FALSE)
head(trainingRows)

# Subset the data into objects for training using
# integer sub-setting.
trainPredictors <- predictors[trainingRows, ]
trainClasses <- classes[trainingRows]
# Do the same for the test set using negative integers.
testPredictors <- predictors[-trainingRows, ]
testClasses <- classes[-trainingRows]

str(trainPredictors)
str(testPredictors)

#Chapter 4 - Data Splitting

set.seed(1)
# For illustration, generate the information needed for three
# resampled versions of the training set.
repeatedSplits <- createDataPartition(trainClasses, p = .80,
                                          times = 3)
str(repeatedSplits)

set.seed(1)
cvSplits <- createFolds(trainClasses, k = 10,
                          returnTrain = TRUE)
str(cvSplits)

fold1 <- cvSplits[[1]]

cvPredictors1 <- trainPredictors[fold1,]
cvClasses1 <- trainClasses[fold1]
nrow(trainPredictors)
nrow(cvPredictors1)

#Chapter 4 - Model Building
trainPredictors <- as.matrix(trainPredictors)
knnFit <- knn3(x = trainPredictors, y = trainClasses, k = 5)
knnFit

testPredictions <- predict(knnFit, newdata = testPredictors,
                           type = "class")
head(testPredictions)
str(testPredictions)

#Chapter 4 - Determination of Tuning Parameters

data(GermanCredit)

GermanCredit <- GermanCredit[, -nearZeroVar(GermanCredit)]
GermanCredit$CheckingAccountStatus.lt.0 <- NULL
GermanCredit$SavingsAccountBonds.lt.100 <- NULL
GermanCredit$EmploymentDuration.lt.1 <- NULL
GermanCredit$EmploymentDuration.Unemployed <- NULL
GermanCredit$Personal.Male.Married.Widowed <- NULL
GermanCredit$Property.Unknown <- NULL
GermanCredit$Housing.ForFree <- NULL

set.seed(100)
inTrain <- createDataPartition(GermanCredit$Class, p = .8)[[1]]
GermanCreditTrain <- GermanCredit[ inTrain, ]
GermanCreditTest  <- GermanCredit[-inTrain, ]

set.seed(1056)
svmFit <- train(Class ~ .,
                  data = GermanCreditTrain,
                  # The "method" argument indicates the model type.
                    # See ?train for a list of available models.
                    method = "svmRadial")

#Performing pre-processing in the dataset
set.seed(1056)
svmFit <- train(Class ~ .,
                  data = GermanCreditTrain,
                  method = "svmRadial",
                  preProc = c("center", "scale"))

set.seed(1056)
svmFit <- train(Class ~ .,
                  data = GermanCreditTrain,
                  method = "svmRadial",
                  preProc = c("center", "scale"),
                  tuneLength = 10)

#Through trainControl we can manually change the cross validation method
set.seed(1056)
svmFit <- train(Class ~ .,
                  data = GermanCreditTrain,
                  method = "svmRadial",
                  preProc = c("center", "scale"),
                  tuneLength = 10,
                  trControl = trainControl(method = "repeatedcv",
                                             repeats = 5,
                                            classProbs = TRUE))

plot(svmFit, scales = list(x = list(log = 2)))

predictedClasses <- predict(svmFit, GermanCreditTest)
str(predictedClasses)

# Use the "type" option to get class probabilities
predictedProbs <- predict(svmFit, newdata = GermanCreditTest,
                            type = "prob")
head(predictedProbs)

#Chapter 4 - Between-Model Comparisons

set.seed(1056)
logisticReg <- train(Class ~ .,
                       data = GermanCreditTrain,
                       method = "glm",
                       trControl = trainControl(method = "repeatedcv",
                                                  repeats = 5))
logisticReg

resamp <- resamples(list(SVM = svmFit, Logistic = logisticReg))
summary(resamp)

modelDifferences <- diff(resamp)
summary(modelDifferences)

#Chapter 4 - Exercises

#Chapter 4 - Exercise 4.1 (A)
set.seed(32)
tenFoldCV <- createDataPartition(trainClasses, k = 10, returnTrain = TRUE)

#Chapter 4 - Exercise 4.2 (B)
data(permeability)

set.seed(72)
repeatedCV <- createMultiFolds(permeability, k = 10, times = 25)

#Chapter 4 - Exercise 4.2 (C)

library(AppliedPredictiveModeling)
data(ChemicalManufacturingProcess)

set.seed(2)
plsProfileChemMod <- train(Yield ~ .,
                           data = ChemicalManufacturingProcess,
                           method = "pls",
                           preProc = c("center", "scale"),
                           tuneLength = 10,
                           trControl = trainControl(method = "repeatedcv", repeats = 5))
