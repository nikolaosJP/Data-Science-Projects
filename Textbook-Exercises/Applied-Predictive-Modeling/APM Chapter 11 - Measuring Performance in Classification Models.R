#11.4 Computing - Measuring Performance in Classification Models

# Load multiple packages
required_packages <- c("AppliedPredictiveModeling","caret","klaR","MASS","pROC","randomForest")
lapply(required_packages, require, character.only = TRUE) 

#Simulating the required dataset
set.seed(975)
simulatedTrain <- quadBoundaryFunc(500)
simulatedTest <- quadBoundaryFunc(1000)
head(simulatedTrain)

#The random forest and quadratic discriminant models will be fit to the data:

rfModel <- randomForest(class ~ X1 + X2,
                          data = simulatedTrain,
                          ntree = 2000)

#QDA Model
qdaModel <- qda(class ~ X1 + X2, data = simulatedTrain)

qdaTrainPred <- predict(qdaModel, simulatedTrain)
names(qdaTrainPred)
head(qdaTrainPred$class)
head(qdaTrainPred$posterior)
qdaTestPred <- predict(qdaModel, simulatedTest)
simulatedTrain$QDAprob <- qdaTrainPred$posterior[,"Class1"]
simulatedTest$QDAprob <- qdaTestPred$posterior[,"Class1"]

#Random Forest Model
rfTestPred <- predict(rfModel, simulatedTest, type = "prob")
head(rfTestPred)
simulatedTest$RFprob <- rfTestPred[,"Class1"]
simulatedTest$RFclass <- predict(rfModel, simulatedTest)

#Sensitivity and Specificity
# Class 1 will be used as the event of interest
sensitivity(data = simulatedTest$RFclass,
                reference = simulatedTest$class,
                positive = "Class1")

specificity(data = simulatedTest$RFclass,
              reference = simulatedTest$class,
              negative = "Class2")

#Predictive values can also be computed either by using the prevalence found in the data set (46%) or by using prior judgement:
  posPredValue(data = simulatedTest$RFclass,
                 reference = simulatedTest$class,
                 positive = "Class1")

negPredValue(data = simulatedTest$RFclass,
               reference = simulatedTest$class,
               positive = "Class2")

# Change the prevalence manually
  posPredValue(data = simulatedTest$RFclass,
                 reference = simulatedTest$class,
                 positive = "Class1",
                 prevalence = .9)

#Confusion Matrix
  
confusionMatrix(data = simulatedTest$RFclass,
                  reference = simulatedTest$class,
                  positive = "Class1")

#Receiver Operating Characteristic (ROC) Curves

rocCurve <- roc(response = simulatedTest$class,
                predictor = simulatedTest$RFprob,
                  ## This function assumes that the second
                  ## class is the event of interest, so we
                  ## reverse the labels.
                levels = rev(levels(simulatedTest$class)))

auc(rocCurve)
ci.roc(rocCurve)

#We can also use the plot function to produce the ROC curve itself:
plot(rocCurve, legacy.axes = TRUE)
## By default, the x-axis goes backwards, used
## the option legacy.axes = TRUE to get 1-spec
## on the x-axis moving from 0 to 1
## Also, another curve can be added using
## add = TRUE the next time plot.auc is used.

#Lift Charts

labs <- c(RFprob = "Random Forest",
            QDAprob = "Quadratic Discriminant Analysis")
liftCurve <- lift(class ~ RFprob + QDAprob, data = simulatedTest,
                    labels = labs)
liftCurve

#To plot two lift curves, the xyplot function is used to create a lattice plot:
## Add lattice options to produce a legend on top
xyplot(liftCurve,
           auto.key = list(columns = 2,
                             lines = TRUE,
                             points = FALSE))

#Calibrating Probabilities

calCurve <- calibration(class ~ RFprob + QDAprob, data = simulatedTest)
calCurve
xyplot(calCurve, auto.key = list(columns = 2))

sigmoidalCal <- glm(relevel(class, ref = "Class2") ~ QDAprob,
                      data = simulatedTrain,
                      family = binomial)
coef(summary(sigmoidalCal))

sigmoidProbs <- predict(sigmoidalCal,
                          newdata = simulatedTest[,"QDAprob", drop = FALSE],
                          type = "response")
simulatedTest$QDAsigmoid <- sigmoidProbs

BayesCal <- NaiveBayes(class ~ QDAprob, data = simulatedTrain,
                         usekernel = TRUE)
## Like qda(), the predict function for this model creates
  ## both the classes and the probabilities
BayesProbs <- predict(BayesCal,
                          newdata = simulatedTest[, "QDAprob", drop = FALSE])

simulatedTest$QDABayes <- BayesProbs$posterior[, "Class1"]
## The probability values before and after calibration
head(simulatedTest[, c(5:6, 8, 9)])

calCurve2 <- calibration(class ~ QDAprob + QDABayes + QDAsigmoid,
                           data = simulatedTest)
xyplot(calCurve2)
