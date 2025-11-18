# 10.4 Computing Section

library(AppliedPredictiveModeling)
library(caret)
library(Hmisc)

data(concrete)
str(concrete)
str(mixtures)

featurePlot(x = concrete[, -9],
              y = concrete$CompressiveStrength,
              ## Add some space between the panels
                between = list(x = 1, y = 1),
              ## Add a background grid ('g') and a smoother ('smooth')
                type = c("g", "p", "smooth"))

#The code for averaging the replicated mixtures and splitting the data into training and test sets is:

averaged <- ddply(mixtures,
                    .(Cement, BlastFurnaceSlag, FlyAsh, Water,
                        Superplasticizer, CoarseAggregate,
                        FineAggregate, Age),
                    function(x) c(CompressiveStrength =
                                      mean(x$CompressiveStrength)))
set.seed(975)
forTraining <- createDataPartition(averaged$CompressiveStrength,
                                     p = 3/4)[[1]]
trainingSet <- averaged[ forTraining,]
testSet <- averaged[-forTraining,]

#The quadratic terms are created manually and are encapsulated inside the I() function.

modFormula <- paste("CompressiveStrength ~ (.)^2 + I(Cement^2) + ",
                      "I(BlastFurnaceSlag^2) + I(FlyAsh^2) + I(Water^2) +",
                      " I(Superplasticizer^2) + I(CoarseAggregate^2) + ",
                      "I(FineAggregate^2) + I(Age^2)")
modFormula <- as.formula(modFormula)

#Each model used repeated 10-fold cross-validation and is specified with the trainControl function:

controlObject <- trainControl(method = "repeatedcv",
                                  repeats = 5,
                                  number = 10)
#Fitting a linear regression

set.seed(669)
linearReg <- train(modFormula,
                     data = trainingSet,
                     method = "lm",
                     trControl = controlObject)
linearReg

#The other two linear models were created with:
set.seed(669)
plsModel <- train(modForm, data = trainingSet,
                    method = "pls",
                    preProc = c("center", "scale"),
                    tuneLength = 15,
                    trControl = controlObject)
enetGrid <- expand.grid(.lambda = c(0, .001, .01, .1),
                          + .fraction = seq(0.05, 1, length = 20))
set.seed(669)
enetModel <- train(modForm, data = trainingSet,
                     method = "enet",
                     preProc = c("center", "scale"),
                     tuneGrid = enetGrid,
                     trControl = controlObject)

#MARS, neural networks, and SVMs were created as follows:
set.seed(669)
earthModel <- train(CompressiveStrength ~ ., data = trainingSet,
                      method = "earth",
                      tuneGrid = expand.grid(.degree = 1,
                                               + .nprune = 2:25),
                      trControl = controlObject)
set.seed(669)
svmRModel <- train(CompressiveStrength ~ ., data = trainingSet,
                     method = "svmRadial",
                     tuneLength = 15,
                     preProc = c("center", "scale"),
                     trControl = controlObject)

nnetGrid <- expand.grid(.decay = c(0.001, .01, .1),
                          + .size = seq(1, 27, by = 2),
                          + .bag = FALSE)
set.seed(669)
nnetModel <- train(CompressiveStrength ~ .,
                     data = trainingSet,
                     method = "avNNet",
                     tuneGrid = nnetGrid,
                     preProc = c("center", "scale"),
                     linout = TRUE,
                     trace = FALSE,
                     maxit = 1000,
                     trControl = controlObject)

#The regression and model trees were similarly created:
set.seed(669)
rpartModel <- train(CompressiveStrength ~ .,
                      data = trainingSet,
                      method = "rpart",
                      tuneLength = 30,
                      trControl = controlObject)
set.seed(669)
ctreeModel <- train(CompressiveStrength ~ .,
                      data = trainingSet,
                      method = "ctree",
                      tuneLength = 10,
                      trControl = controlObject)
set.seed(669)
mtModel <- train(CompressiveStrength ~ .,
                   data = trainingSet,
                   method = "M5",
                   trControl = controlObject)

#The following code creates the remaining model objects:
set.seed(669)
treebagModel <- train(CompressiveStrength ~ .,
                        data = trainingSet,
                        method = "treebag",
                        trControl = controlObject)
set.seed(669)
rfModel <- train(CompressiveStrength ~ .,
                   data = trainingSet,
                   method = "rf",
                   tuneLength = 10,
                   ntrees = 1000,
                   importance = TRUE,
                   trControl = controlObject)
gbmGrid <- expand.grid(.interaction.depth = seq(1, 7, by = 2),
                         .n.trees = seq(100, 1000, by = 50),
                         .shrinkage = c(0.01, 0.1))
set.seed(669)
gbmModel <- train(CompressiveStrength ~ .,
                    data = trainingSet,
                    method = "gbm",
                    tuneGrid = gbmGrid,
                    verbose = FALSE,
                    trControl = controlObject)
cubistGrid <- expand.grid(.committees = c(1, 5, 10, 50, 75, 100),
                            .neighbors = c(0, 1, 3, 5, 7, 9))
set.seed(669)
cbModel <- train(CompressiveStrength ~ .,
                   data = trainingSet,
                   method = "cubist",
                   tuneGrid = cubistGrid,
                   trControl = controlObject)

#The resampling results for these models were collected into a single object using caret’s resamples function
allResamples <- resamples(list("Linear Reg" = lmModel,
                                 "PLS" = plsModel,
                                 "Elastic Net" = enetModel,
                                 MARS = earthModel,
                                 SVM = svmRModel,
                                 "Neural Networks" = nnetModel,
                                 CART = rpartModel,
                                 "Cond Inf Tree" = ctreeModel,
                                 "Bagged Tree" = treebagModel,
                                 "Boosted Tree" = gbmModel,
                                 "Random Forest" = rfModel,
                                 Cubist = cbModel))

## Plot the RMSE values
parallelPlot(allResamples)
## Using R-squared:
parallelplot(allResamples, metric = "Rsquared")

#The test set predictions are achieved using a simple application of the predict function:
nnetPredictions <- predict(nnetModel, testData)
gbmPredictions <- predict(gbmModel, testData)
cbPredictions <- predict(cbModel, testData)
                       
#To predict optimal mixtures, we first use the 28-day data to generate a set of random starting points from the training set.
age28Data <- subset(trainingData, Age == 28)
## Remove the age and compressive strength columns and
## then center and scale the predictor columns
pp1 <- preProcess(age28Data[, -(8:9)], c("center", "scale"))
scaledTrain <- predict(pp1, age28Data[, 1:7])
set.seed(91)
startMixture <- sample(1:nrow(age28Data), 1)
starters <- scaledTrain[startMixture, 1:7]

#14 more mixtures are selected
pool <- scaledTrain
index <- maxDissim(starters, pool, 14)
startPoints <- c(startMixture, index)
starters <- age28Data[startPoints,1:7]

## The inputs to the function are a vector of six mixture proportions
## (in argument 'x') and the model used for prediction ('mod')
modelPrediction <- function(x, mod)
    {
      ## Check to make sure the mixture proportions are
        ## in the correct range
        if(x[1] < 0 | x[1] > 1) return(10^38)
      if(x[2] < 0 | x[2] > 1) return(10^38)
      if(x[3] < 0 | x[3] > 1) return(10^38)
      if(x[4] < 0 | x[4] > 1) return(10^38)
      if(x[5] < 0 | x[5] > 1) return(10^38)
      if(x[6] < 0 | x[6] > 1) return(10^38)
      
        ## Determine the water proportion
  x <- c(x, 1 - sum(x))
  
    ## Check the water range
    if(x[7] < 0.05) return(10^38)
  
    ## Convert the vector to a data frame, assign names
    ## and fix age at 28 days
    tmp <- as.data.frame(t(x))
    names(tmp) <- c('Cement','BlastFurnaceSlag','FlyAsh',
                      'Superplasticizer','CoarseAggregate',
                      'FineAggregate', 'Water')
    tmp$Age <- 28
    ## Get the model prediction, square them to get back to the
      ## original units, then return the negative of the result
      -predict(mod, tmp)
}

#First, the Cubist model is used:
cbResults <- startingValues
cbResults$Water <- NA
cbResults$Prediction <- NA
## Loop over each starting point and conduct the search
  for(i in 1:nrow(cbResults))
    {
      results <- optim(unlist(cbResults[i,1:6]),
                         modelPrediction,
                         method = "Nelder-Mead",
                         ## Use method = 'SANN' for simulated annealing
                           control=list(maxit=5000),
                         ## The next option is passed to the
                           ## modelPrediction() function
                           mod = cbModel)
      ## Save the predicted compressive strength
        cbResults$Prediction[i] <- -results$value
        ## Also save the final mixture values
          cbResults[i,1:6] <- results$par
          }
## Calculate the water proportion
  cbResults$Water <- 1 - apply(cbResults[,1:6], 1, sum)
## Keep the top three mixtures
  cbResults <- cbResults[order(-cbResults$Prediction),][1:3,]
cbResults$Model <- "Cubist"

#We then employ the same process for the neural network model:
  nnetResults <- startingValues
nnetResults$Water <- NA
nnetResults$Prediction <- NA
for(i in 1:nrow(nnetResults))
  {
    results <- optim(unlist(nnetResults[i, 1:6,]),
                       modelPrediction,
                       method = "Nelder-Mead",
                       control=list(maxit=5000),
                       mod = nnetModel)
    nnetResults$Prediction[i] <- -results$value
    nnetResults[i,1:6] <- results$par
    }
nnetResults$Water <- 1 - apply(nnetResults[,1:6], 1, sum)
nnetResults <- nnetResults[order(-nnetResults$Prediction),][1:3,]
nnetResults$Model <- "NNet"

## Run PCA on the data at 28\,days
  pp2 <- preProcess(age28Data[, 1:7], "pca")
## Get the components for these mixtures
  pca1 <- predict(pp2, age28Data[, 1:7])
pca1$Data <- "Training Set"
## Label which data points were used to start the searches
  pca1$Data[startPoints] <- "Starting Values"
## Project the new mixtures in the same way (making sure to
  ## re-order the columns to match the order of the age28Data object).
  pca3 <- predict(pp2, cbResults[, names(age28Data[, 1:7])])
pca3$Data <- "Cubist"
pca4 <- predict(pp2, nnetResults[, names(age28Data[, 1:7])])
pca4$Data <- "Neural Network"
## Combine the data, determine the axis ranges and plot
  pcaData <- rbind(pca1, pca3, pca4)
pcaData$Data <- factor(pcaData$Data,
                         + levels = c("Training Set","Starting Values",
                                      + "Cubist","Neural Network"))
lim <- extendrange(pcaData[, 1:2])
xyplot(PC2 ~ PC1, data = pcaData, groups = Data,
         auto.key = list(columns = 2),
         xlim = lim, ylim = lim,
         type = c("g", "p"))

