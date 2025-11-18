#Chapter 8 - Regression Trees and Rule-Based Models
#Chapter 8 - Computing

#The R packages used in this section are caret, Cubist, gbm, ipred, party, partykit, randomForest, rpart, RWeka

#Single Trees

library(rpart)
rpartTree <- rpart(y ~ ., data = trainData)
# or,
ctreeTree <- ctree(y ~ ., data = trainData)
  
set.seed(100)
rpartTune <- train(solTrainXtrans, solTrainY,
                       method = "rpart2",
                       tuneLength = 10,
                       trControl = trainControl(method = "cv"))
  
plot(treeObject)
library(partykit)
rpartTree2 <- as.party(rpartTree)
plot(rpartTree2)

#Model Trees
#

library(RWeka)
m5tree <- M5P(y ~ ., data = trainData)
# or, for rules:
m5rules <- M5Rules(y ~ ., data = trainData)

m5tree <- M5P(y ~ ., data = trainData,
                + control = Weka_control(M = 10))

set.seed(100)
m5Tune <- train(solTrainXtrans, solTrainY,
                  method = "M5",
                  trControl = trainControl(method = "cv"),
                  ## Use an option for M5() to specify the minimum
                    ## number of samples needed to further splits the
                    ## data to be 10
                    control = Weka_control(M = 10))

#Bagged Trees
#

library(ipred)
baggedTree <- ipredbagg(solTrainY, solTrainXtrans)
## or
baggedTree <- bagging(y ~ ., data = trainData)

library(party)
## The mtry parameter should be the number of predictors (the
## number of columns minus 1 for the outcome).
bagCtrl <- cforest_control(mtry = ncol(trainData) - 1)
baggedTree <- cforest(y ~ ., data = trainData, controls = bagCtrl)

#Random Forest
#

library(randomForest)
rfModel <- randomForest(solTrainXtrans, solTrainY)
## or
rfModel <- randomForest(y ~ ., data = trainData)

library(randomForest)
rfModel <- randomForest(solTrainXtrans, solTrainY,
                          importance = TRUE,
                          ntrees = 1000)

#Boosted Trees
#

library(gbm)
gbmModel <- gbm.fit(solTrainXtrans, solTrainY, distribution = "gaussian")
## or
gbmModel <- gbm(y ~ ., data = trainData, distribution = "gaussian")

gbmGrid <- expand.grid(.interaction.depth = seq(1, 7, by = 2),
                         + .n.trees = seq(100, 1000, by = 50),
                         + .shrinkage = c(0.01, 0.1))
set.seed(100)
gbmTune <- train(solTrainXtrans, solTrainY,
                   method = "gbm",
                   tuneGrid = gbmGrid,
                   ## The gbm() function produces copious amounts
                     ## of output, so pass in the verbose option
                     ## to avoid printing a lot to the screen.
                     verbose = FALSE)

# Exercises
# Exercise 8.1 

library(caret) 
library(mlbench)
library(gbm)

set.seed(200)
simulated = mlbench.friedman1(200,sd=1)
simulated = cbind(simulated$x, simulated$y)
simulated = as.data.frame(simulated)
colnames(simulated)[ncol(simulated)] = "y" 

library(randomForest)

model1 = randomForest( y ~ ., data=simulated, importance=TRUE, ntree=1000 )
rfImp1 = varImp(model1, scale=FALSE)
rfImp1 = rfImp1[ order(-rfImp1), , drop=FALSE ]
print("randomForest (no correlated predictor)")
print(rfImp1)

# Part (b): Add a correlated variable
#
simulated$duplicate1 = simulated$V1 + rnorm(200) * 0.1
cor(simulated$duplicate1,simulated$V1)

model2 = randomForest( y ~ ., data=simulated, importance=TRUE, ntree=1000 )
rfImp2 = varImp(model2, scale=FALSE)
rfImp2 = rfImp2[ order(-rfImp2), , drop=FALSE ] 
print("randomForest (one correlated predictor)")
print(rfImp2)

simulated$duplicate2 = simulated$V1 + rnorm(200) * 0.1
cor(simulated$duplicate2,simulated$V1)

model3 = randomForest( y ~ ., data=simulated, importance=TRUE, ntree=1000 )
rfImp3 = varImp(model3, scale=FALSE)
rfImp3 = rfImp3[ order(-rfImp3), , drop=FALSE ] 
print("randomForest (two correlated predictors)")
print(rfImp3)

# Part (c): Study this when fitting conditional inference trees:
# 
library(party)

simulated$duplicate1 = NULL
simulated$duplicate2 = NULL

model1 = cforest( y ~ ., data=simulated )
cfImp1 = as.data.frame(varimp(model1),conditional=use_conditional_true)
cfImp1 = cfImp1[ order(-cfImp1), , drop=FALSE ] 
print(sprintf("cforest (no correlated predictor); varimp(*,conditional=%s)",use_conditional_true))
print(cfImp1)

# Now we add correlated predictors one at a time 
simulated$duplicate1 = simulated$V1 + rnorm(200) * 0.1

model2 = cforest( y ~ ., data=simulated )
cfImp2 = as.data.frame(varimp(model2),conditional=use_conditional_true)
cfImp2 = cfImp2[ order(-cfImp2), , drop=FALSE ]  
print(sprintf("cforest (one correlated predictor); varimp(*,conditional=%s)",use_conditional_true))
print(cfImp2)

simulated$duplicate2 = simulated$V1 + rnorm(200) * 0.1

model3 = cforest( y ~ ., data=simulated )
cfImp3 = as.data.frame(varimp(model3),conditional=use_conditional_true)
cfImp3 = cfImp3[ order(-cfImp3), , drop=FALSE ] 
print(sprintf("cforest (two correlated predictor); varimp(*,conditional=%s)",use_conditional_true))
print(cfImp3)

# Lets try the same experiment but using boosted trees:
#

simulated$duplicate1 = NULL
simulated$duplicate2 = NULL

model1 = gbm( y ~ ., data=simulated, distribution="gaussian", n.trees=1000 ) 
print(sprintf("gbm (no correlated predictor)"))
print(summary(model1,plotit=F)) # the summary method gives variable importance ... 

# Now we add correlated predictors one at a time 
simulated$duplicate1 = simulated$V1 + rnorm(200) * 0.1

model2 = gbm( y ~ ., data=simulated, distribution="gaussian", n.trees=1000 ) 
print(sprintf("gbm (one correlated predictor)"))
print(summary(model2,plotit=F))

simulated$duplicate2 = simulated$V1 + rnorm(200) * 0.1

model3 = gbm( y ~ ., data=simulated, distribution="gaussian", n.trees=1000 ) 
print(sprintf("gbm (two correlated predictor)"))
print(summary(model3,plotit=F))

# Exercise 8.4

library(caret)
library(AppliedPredictiveModeling)
library(rpart)
library(randomForest)
library(Cubist)

set.seed(0)

data(solubility)

# We have the following variables in this dataset:
# 
## solTrainX: training set predictors in their natural units.
#
## solTrainXtrans: training set predictors after transformations for
##           skewness and centering/scaling.
#
## solTrainY: a vector of log10 solubility values for the training set.
#
## solTestX: test set predictors in their natural units.
#
## solTestXtrans: test set predictors after the same transformations used
##           on the training set are applied.
#
## solTestY: a vector of log10 solubility values for the training set.
#
# Make sure we don't access the unscaled variables by accident (we want to use the scaled variables): 
rm(solTrainX)
rm(solTestX)

# Use solTrainXtrans$MolWeight as our scalar predictor:
trainData = data.frame( x=solTrainXtrans$MolWeight, y=solTrainY )

# Plot the predictor data vs. the solubility:

# For a sanity check fit a linear model and look at the predictions it gives: 
#
lmModel = lm( y ~ ., data=trainData ) 
lm_yhat = predict( lmModel, newdata=data.frame(x=solTestXtrans$MolWeight) )
plot( solTestY, lm_yhat ) 


# Part (a): (fit a simple regression tree):
#
# defaults: for rpart.control are cp=0.01, maxdepth=30
rPartModel = rpart( y ~ ., data=trainData, method="anova", control=rpart.control(cp=0.01,maxdepth=30) ) # decreasing cp makes deeper trees; increasing maxdepth
###plotcp(rPartModel)

# Plot the regression tree:
# 
###plot(rPartModel); text(rPartModel)

# predict solubility with this regression tree: 
rPart_yHat = predict(rPartModel,newdata=data.frame(x=solTestXtrans$MolWeight))

# Part (b): (fit a randomforest):
#
rfModel = randomForest( y ~ ., data=trainData, ntree=500 ) # ntree=500, mtry=does not matter when we have a scalar feature 

# predict solubility:
rf_yHat = predict(rfModel,newdata=data.frame(x=solTestXtrans$MolWeight))


# Part (c): (fit different Cubist models):
#
cubistModel = cubist( data.frame( x=solTrainXtrans$MolWeight ), solTrainY, committees=1 ) # committees=1

# predict solubility:
cubist_yHat = predict(cubistModel,newdata=data.frame(x=solTestXtrans$MolWeight))

plot( solTestXtrans$MolWeight, cubist_yHat, col='red', xlab='MolWeight', ylab='log10(solubility)', main='cubist test set predictions' )
lines( solTestXtrans$MolWeight, solTestY, type='p' )

# Exercise 8.5

library(caret)
library(AppliedPredictiveModeling)
library(rpart)

set.seed(0)

data(tecator) 

fat = endpoints[,2] # try to predict fat content 
absorp = data.frame(absorp)

# For various models build and then compare performance:
#
set.seed(0)
rpart_model = train( absorp, fat, method="rpart", preProcess=c("center","scale"), trControl=trainControl(method="repeatedcv",repeats=5) )

set.seed(0)
rf_model = train( absorp, fat, method="rf", preProcess=c("center","scale"), trControl=trainControl(method="repeatedcv",repeats=5) )

set.seed(0)
cforest_model = train( absorp, fat, method="cforest", preProcess=c("center","scale"), trControl=trainControl(method="repeatedcv",repeats=5) )

gbmGrid = expand.grid( interaction.depth = seq( 1, 7, by=2 ),
                       n.trees = seq( 100, 1000, by=100 ),
                       shrinkage = c(0.01, 0.1),
                       n.minobsinnode = 10 )
set.seed(0)
gbm_model = train( absorp, fat, method="gbm", preProcess=c("center","scale"),
                   tuneGrid = gbmGrid, 
                   trControl=trainControl(method="repeatedcv",repeats=5),
                   verbose=FALSE )

# EPage 82 
resamp = resamples( list(rpart=rpart_model,cforest=cforest_model,rf=rf_model,gbm=gbm_model) )
print( summary(resamp) )
print( summary(diff(resamp)) )

# Exercise 8.6

library(caret)
library(AppliedPredictiveModeling)
library(rpart)

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


# Build various tree based models and then compare performance:
# 
# Note we use the default "trainControl" bootstrap evaluations for each of the models below: 
#
preProc_Arguments = c("center","scale")
#preProc_Arguments = c("pca")

# A rpart model:
# 
set.seed(0)
rpartModel = train(x=fingerprints_training, y=permeability_training, method="rpart", preProc=preProc_Arguments, tuneLength=10)

# predict on training/testing sets
rpartPred = predict(rpartModel, newdata=fingerprints_training)
rpartPR = postResample(pred=rpartPred, obs=permeability_training)
rmses_training = c(rpartPR[1])
r2s_training = c(rpartPR[2])
methods = c("RPART")

rpartPred = predict(rpartModel, newdata=fingerprints_testing)
rpartPR = postResample(pred=rpartPred, obs=permeability_testing)
rmses_testing = c(rpartPR[1])
r2s_testing = c(rpartPR[2])


# A random forest model:
#
set.seed(0)
rfModel = train(x=fingerprints_training, y=permeability_training, method="rf", preProc=preProc_Arguments)

rfPred = predict(rfModel, newdata=fingerprints_training)
rfPR = postResample(pred=rfPred, obs=permeability_training)
rmses_training = c(rmses_training,rfPR[1])
r2s_training = c(r2s_training,rfPR[2])
methods = c(methods,"RF")

rfPred = predict(rfModel, newdata=fingerprints_testing)
rfPR = postResample(pred=rfPred, obs=permeability_testing)
rmses_testing = c(rmses_testing,rfPR[1])
r2s_testing = c(r2s_testing,rfPR[2])


# gradient boosting machine: 
#
gbmGrid = expand.grid( .interaction.depth = seq( 1, 7, by=2 ),
                       .n.trees = seq( 100, 1000, by=100 ),
                       .shrinkage = c(0.01, 0.1) )
set.seed(0)
gbmModel = train(x=fingerprints_training, y=permeability_training, method="gbm", preProc=preProc_Arguments, tuneGrid=gbmGrid, verbose=FALSE)

gbmPred = predict(gbmModel, newdata=fingerprints_training)
gbmPR = postResample(pred=gbmPred, obs=permeability_training)
rmses_training = c(rmses_training,gbmPR[1])
r2s_training = c(r2s_training,gbmPR[2])
methods = c(methods,"GBM")

gbmPred = predict(gbmModel, newdata=fingerprints_testing)
gbmPR = postResample(pred=gbmPred, obs=permeability_testing)
rmses_testing = c(rmses_testing,gbmPR[1])
r2s_testing = c(r2s_testing,gbmPR[2])

# Lets see what variables are most important in the GBM model: 
varImp(gbmModel)

# Cubist
#
set.seed(0)
cubistModel = train(x=fingerprints_training, y=permeability_training, method="cubist", preProc=preProc_Arguments, tuneLength=20)

cubistPred = predict(cubistModel, newdata=fingerprints_training)
cubistPR = postResample(pred=cubistPred, obs=permeability_training) 
rmses_training = c(rmses_training,cubistPR[1])
r2s_training = c(r2s_training,cubistPR[2])
methods = c(methods,"CUBIST")

cubistPred = predict(cubistModel, newdata=fingerprints_testing)
cubistPR = postResample(pred=cubistPred, obs=permeability_testing)
rmses_testing = c(rmses_testing,cubistPR[1])
r2s_testing = c(r2s_testing,cubistPR[2])

# Package the results up:
# 
res_training = data.frame( rmse=rmses_training, r2=r2s_training )
rownames(res_training) = methods

training_order = order( -res_training$rmse )

res_training = res_training[ training_order, ] # Order the dataframe so that the best results are at the bottom:
print( "Final Training Results" ) 
print( res_training )

res_testing = data.frame( rmse=rmses_testing, r2=r2s_testing )
rownames(res_testing) = methods

res_testing = res_testing[ training_order, ] # Order the dataframe so that the best results for the training set are at the bottom:
print( "Final Testing Results" ) 
print( res_testing )

# EPage 82 
resamp = resamples( list(rpart=rpartModel,cubist=cubistModel,gbm=gbmModel,rf=rfModel) )
print( summary(resamp) )
print( summary(diff(resamp)) )

# Exercise 8.7

library(caret)
library(AppliedPredictiveModeling)
library(rpart)

set.seed(0)

data(ChemicalManufacturingProcess)

processPredictors = ChemicalManufacturingProcess[,2:58]
yield = ChemicalManufacturingProcess[,1]

n_samples = dim(processPredictors)[1]
n_features = dim(processPredictors)[2]

# Fill in missing values where we have NAs with the median over the non-NA values: 
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

# Split this data into training and testing sets:
#
training = createDataPartition( yield, p=0.8 )

processPredictors_training = processPredictors[training$Resample1,]
yield_training = yield[training$Resample1]

processPredictors_testing = processPredictors[-training$Resample1,]
yield_testing = yield[-training$Resample1]

# Build various tree based models and then compare performance:
# 
# Note we use the default "trainControl" of bootstrap evaluations for each of the models below: 
#
preProc_Arguments = c("center","scale")

# A rpart model:
# 
set.seed(0)
rpartModel = train(x=processPredictors_training, y=yield_training, method="rpart", preProc=preProc_Arguments, tuneLength=10)

# predict on training/testing sets
rpartPred = predict(rpartModel, newdata=processPredictors_training)
rpartPR = postResample(pred=rpartPred, obs=yield_training)
rmses_training = c(rpartPR[1])
r2s_training = c(rpartPR[2])
methods = c("RPART")

rpartPred = predict(rpartModel, newdata=processPredictors_testing)
rpartPR = postResample(pred=rpartPred, obs=yield_testing)
rmses_testing = c(rpartPR[1])
r2s_testing = c(rpartPR[2])


# A random forest model:
#
set.seed(0)
rfModel = train(x=processPredictors_training, y=yield_training, method="rf", preProc=preProc_Arguments, tuneLength=10)

rfPred = predict(rfModel, newdata=processPredictors_training)
rfPR = postResample(pred=rfPred, obs=yield_training)
rmses_training = c(rmses_training,rfPR[1])
r2s_training = c(r2s_training,rfPR[2])
methods = c(methods,"RF")

rfPred = predict(rfModel, newdata=processPredictors_testing)
rfPR = postResample(pred=rfPred, obs=yield_testing)
rmses_testing = c(rmses_testing,rfPR[1])
r2s_testing = c(r2s_testing,rfPR[2])


# gradient boosting machine: 
#
gbmGrid = expand.grid( .interaction.depth = seq( 1, 7, by=2 ),
                       .n.trees = seq( 100, 1000, by=100 ),
                       .shrinkage = c(0.01, 0.1) )

set.seed(0)
gbmModel = train(x=processPredictors_training, y=yield_training, method="gbm",
                 preProc=preProc_Arguments,
                 tuneGrid=gbmGrid,
                 verbose=FALSE)

gbmPred = predict(gbmModel, newdata=processPredictors_training)
gbmPR = postResample(pred=gbmPred, obs=yield_training)
rmses_training = c(rmses_training,gbmPR[1])
r2s_training = c(r2s_training,gbmPR[2])
methods = c(methods,"GBM")

gbmPred = predict(gbmModel, newdata=processPredictors_testing)
gbmPR = postResample(pred=gbmPred, obs=yield_testing)
rmses_testing = c(rmses_testing,gbmPR[1])
r2s_testing = c(r2s_testing,gbmPR[2])

# Cubist: 
#
set.seed(0)
cubistModel = train(x=processPredictors_training, y=yield_training, method="cubist", preProc=preProc_Arguments, tuneLength=20)

cubistPred = predict(cubistModel, newdata=processPredictors_training)
cubistPR = postResample(pred=cubistPred, obs=yield_training) 
rmses_training = c(rmses_training,cubistPR[1])
r2s_training = c(r2s_training,cubistPR[2])
methods = c(methods,"CUBIST")

cubistPred = predict(cubistModel, newdata=processPredictors_testing)
cubistPR = postResample(pred=cubistPred, obs=yield_testing)
rmses_testing = c(rmses_testing,cubistPR[1])
r2s_testing = c(r2s_testing,cubistPR[2])

# Package the results up:
# 
res_training = data.frame( rmse=rmses_training, r2=r2s_training )
rownames(res_training) = methods

training_order = order( -res_training$rmse )

res_training = res_training[ training_order, ] # Order the dataframe so that the best results are at the bottom:
print( "Final Training Results" ) 
print( res_training )

res_testing = data.frame( rmse=rmses_testing, r2=r2s_testing )
rownames(res_testing) = methods

res_testing = res_testing[ training_order, ] # Order the dataframe so that the best results for the training set are at the bottom:
print( "Final Testing Results" ) 
print( res_testing )

# EPage 82 
resamp = resamples( list(rpart=rpartModel,rf=rfModel,cubist=cubistModel,gbm=gbmModel) )
print( summary(resamp) )

dotplot( resamp, metric="RMSE" )

print( summary(diff(resamp)) )

# Part (b): the variable importance
#
# Lets see what variables are most important in the GBM model: 
varImp(gbmModel)
#varImp(cubistModel)

# Explore yield output as we vary the most important predictors of the GBM model:
#
# We pick a predictor and plot how the responce varies as a function of this value
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
y_hat = predict( gbmModel, newdata=as.matrix(newdata) )

plot( xs, y_hat, xlab='variation in ManufacturingProcess32', ylab='predicted yield' )
grid()

# Part (c): Plot the optimal single tree using the fitted rPartModel above:
#
# Use the optimal settings found using the train function: 
#
# RMSE was used to select the optimal model using  the smallest value.
# The final value used for the model was cp = 0.07533616.
#

trainData = processPredictors_training
trainData$y = yield_training
rPartModel = rpart( y ~ ., data=trainData, method="anova", control=rpart.control(cp = 0.07533616) )

# Plot the optimal single regression tree:
# 
plot(rPartModel); text(rPartModel)


