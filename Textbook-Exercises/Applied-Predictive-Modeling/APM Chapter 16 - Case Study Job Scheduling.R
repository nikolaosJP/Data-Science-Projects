#16 Case Study: Job Scheduling

library(AppliedPredictiveModeling)
data(schedulingData)
set.seed(1104)
inTrain <- createDataPartition(schedulingData$Class,
                                 + p = .8,
                                 + list = FALSE)
schedulingData$NumPending <- schedulingData$NumPending + 1
trainData <- schedulingData[ inTrain,]
testData <- schedulingData[-inTrain,]

cost <- function(pred, obs)
  {
    isNA <- is.na(pred)
    if(!all(isNA))
      {
        pred <- pred[!isNA]
        obs <- obs[!isNA]
        cost <- ifelse(pred == obs, 0, 1)
        if(any(pred == "VF" & obs == "L"))
          cost[pred == "L" & obs == "VF"] <- 10
          if(any(pred == "F" & obs == "L"))
            cost[pred == "F" & obs == "L"] <- 5
            if(any(pred == "F" & obs == "M"))
              cost[pred == "F" & obs == "M"] <- 5
              +if(any(pred == "VF" & obs == "M"))
                cost[pred == "VF" & obs == "M"] <- 5
                out <- mean(cost)
                } else out <- NA
                out
                }
costSummary <- function (data, lev = NULL, model = NULL)
  {
    if (is.character(data$obs)) data$obs <- factor(data$obs,
                                                     levels = lev)
    c(postResample(data[, "pred"], data[, "obs"]),
        Cost = cost(data[, "pred"], data[, "obs"]))
    }
#The latter function is used in the control object for future computations:
ctrl <- trainControl(method = "repeatedcv", repeats = 5,
                         summaryFunction = costSummary)

#For the cost-sensitive tree models, a matrix representation of the costs was also created:
costMatrix <- ifelse(diag(4) == 1, 0, 1)
costMatrix[1,4] <- 10
costMatrix[1,3] <- 5
costMatrix[2,4] <- 5
costMatrix[2,3] <- 5
rownames(costMatrix) <- levels(trainData$Class)
colnames(costMatrix) <- levels(trainData$Class)
costMatrix

# A model formula was created that log transforms several of the predictors (given the skewness demonstrated in Table 17.1):
modForm <- as.formula(Class ~ Protocol + log10(Compounds) +
                            log10(InputFields)+ log10(Iterations) +
                            log10(NumPending) + Hour + Day)

## Cost-Sensitive CART
set.seed(857)
rpFitCost <- train(x = trainData[, predictors],
                     y = trainData$Class,
                     method = "rpart",
                     metric = "Cost",
                     maximize = FALSE,
                     tuneLength = 20,
                     ## rpart structures the cost matrix so that
                       ## the true classes are in rows, so we
                       ## transpose the cost matrix
                       parms =list(loss = t(costMatrix)),
                     trControl = ctrl)
## Cost- Sensitive C5.0
set.seed(857)
c50Cost <- train(x = trainData[, predictors],
                   y = trainData$Class,
                   method = "C5.0",
                   metric = "Cost",
                   maximize = FALSE,
                   costs = costMatrix,
                   tuneGrid = expand.grid(.trials = c(1, (1:10)*10),
                                            .model = "tree",
                                            .winnow = c(TRUE, FALSE)),
                   trControl = ctrl)

## Cost-Sensitive bagged trees
rpCost <- function(x, y)
    {
      costMatrix <- ifelse(diag(4) == 1, 0, 1)
      costMatrix[4, 1] <- 10
      costMatrix[3, 1] <- 5
      costMatrix[4, 2] <- 5
      costMatrix[3, 2] <- 5
library(rpart)
      tmp <- x
      tmp$y <- y
      rpart(y~.,
              data = tmp,
              control = rpart.control(cp = 0),
              parms = list(loss = costMatrix))
      }
rpPredict <- function(object, x) predict(object, x)
rpAgg <- function (x, type = "class")
  {
    pooled <- x[[1]] * NA
    n <- nrow(pooled)
    classes <- colnames(pooled)
    for (i in 1:ncol(pooled))
      {
        tmp <- lapply(x, function(y, col) y[, col], col = i)
        tmp <- do.call("rbind", tmp)
        pooled[, i] <- apply(tmp, 2, median)
        }
    pooled <- apply(pooled, 1, function(x) x/sum(x))
    if (n != nrow(pooled)) pooled <- t(pooled)
    out <- factor(classes[apply(pooled, 1, which.max)],
                    levels = classes)
    out
    }

set.seed(857)
rpCostBag <- train(trainData[, predictors],
                     trainData$Class,
                     "bag",
                     B = 50,
                     bagControl = bagControl(fit = rpCost,
                                               predict = rpPredict,
                                               aggregate = rpAgg,
                                               downSample = FALSE),
                     trControl = ctrl)

## Weighted SVM
set.seed(857)
svmRFitCost <- train(modForm, data = trainData,
                       method = "svmRadial",
                       metric = "Cost",
                       maximize = FALSE,
                       preProc = c("center", "scale"),
                       class.weights = c(VF = 1, F = 1,
                                           M = 5, L = 10),
                       tuneLength = 15,
                       trControl = ctrl)
#The resampled versions of the confusion matrices were computed using the confusionMatrix function on the objects produced by the train function, such as 

confusionMatrix(rpFitCost, norm = "none")


