#8.3 Lab: Decision Trees

#8.3.1 Fitting Classification Trees
library(tree)
library(ISLR2)
attach(Carseats)

# Transforming Sales into a binary variable
High <- factor(ifelse(Sales <= 8, "No", "Yes"))

# Updating the tables
Carseats <- data.frame(Carseats , High)

# Predicting High with all variables but Sales using tree
tree.carseats <- tree(High ∼ . - Sales, Carseats)
summary(tree.carseats)

#Plotting the tree
plot(tree.carseats)
text(tree.carseats , pretty = 0)

tree.carseats

#Splitting data into training and test sets
set.seed (2)
train <- sample (1: nrow(Carseats), 200)
Carseats.test <- Carseats[-train, ]
High.test <- High[-train]
tree.carseats <- tree(High ∼ . - Sales, Carseats,
                        subset = train)
tree.pred <- predict(tree.carseats , Carseats.test ,
                       type = "class")
table(tree.pred , High.test)

(104 + 50) / 200

#Pruning the tree to improve performance
set.seed (7)
cv.carseats <- cv.tree(tree.carseats , FUN = prune.misclass)

names(cv.carseats)
cv.carseats

#Plotting the tree
par(mfrow = c(1, 2))
plot(cv.carseats$size , cv.carseats$dev, type = "b")
plot(cv.carseats$k, cv.carseats$dev, type = "b")

prune.carseats <- prune.misclass(tree.carseats , best = 9)
plot(prune.carseats)
text(prune.carseats , pretty = 0)

#Examining its performance on the test set
tree.pred <- predict(prune.carseats , Carseats.test ,
                     type = "class")
table(tree.pred , High.test)
(97+58)/200

#8.3.2 Fitting Regression Trees

set.seed (1)
train <- sample (1: nrow(Boston), nrow(Boston) / 2)
tree.boston <- tree(medv ∼ ., Boston , subset = train)
summary(tree.boston)

par(mfrow = c(1, 1))
plot(tree.boston)
text(tree.boston , pretty = 0)

cv.boston <- cv.tree(tree.boston)
plot(cv.boston$size , cv.boston$dev, type = "b")

prune.boston <- prune.tree(tree.boston , best = 5)
plot(prune.boston)
text(prune.boston , pretty = 0)

#Examining performance
yhat <- predict(tree.boston , newdata = Boston[-train , ])
boston.test <- Boston[-train, "medv"]
plot(yhat , boston.test)
abline (0, 1)
mean (( yhat - boston.test)^2)

#8.3.3 Bagging and Random Forests

library(randomForest)
set.seed (1)

#BAGGING
bag.boston <- randomForest(medv ∼ ., data = Boston, subset = train , mtry = 12, importance = TRUE)

yhat.bag <- predict(bag.boston , newdata = Boston[-train , ])
plot(yhat.bag , boston.test)
abline (0, 1)
mean (( yhat.bag - boston.test)^2)   #23.41 MSE

bag.boston <- randomForest(medv ∼ ., data = Boston ,
                           subset = train , mtry = 12, ntree = 25)
yhat.bag <- predict(bag.boston , newdata = Boston[-train , ])
mean (( yhat.bag - boston.test)^2) #25.75 raising the number of trees increased the MSE a bit

#RANDOM FOREST
set.seed (1)
rf.boston <- randomForest(medv ∼ ., data = Boston ,
                            subset = train , mtry = 6, importance = TRUE)
yhat.rf <- predict(rf.boston, newdata = Boston[-train , ])
mean (( yhat.rf - boston.test)^2) #20.06 MSE

#Checking the importance of each variable
importance(rf.boston)
varImpPlot(rf.boston)

#8.3.4 Boosting
library(gbm)
set.seed (1)
boost.boston <- gbm(medv ∼ ., data = Boston[train , ],
                    distribution = "gaussian", n.trees = 5000,
                    interaction.depth = 4)

#examining the influence of rm and lstat on Y
plot(boost.boston , i = "rm")
plot(boost.boston , i = "lstat")                    

#Examining the performance of boosting 
yhat.boost <- predict(boost.boston ,
                      newdata = Boston[-train , ], n.trees = 5000)
mean (( yhat.boost - boston.test)^2) #18.39 MSE

#Altering the hyper-parameters
boost.boston <- gbm(medv ∼ ., data = Boston[train , ],
                    distribution = "gaussian", n.trees = 5000,
                    interaction.depth = 4, shrinkage = 0.2, verbose = F)
yhat.boost <- predict(boost.boston ,
                        newdata = Boston[-train , ], n.trees = 5000)
mean (( yhat.boost - boston.test)^2) #changing the hyperparameters decreases the MSE

#8.3.5 Bayesian Additive Regression Trees

#The gbart() function is designed for quantitative outcome variables.
#For binary outcomes, lbart() and pbart() are available.

library(Rcpp)
library(BART)

x <- Boston[, 1:12]
y <- Boston[, "medv"]
xtrain <- x[train, ]
ytrain <- y[train]
xtest <- x[-train, ]
ytest <- y[-train]
set.seed (1)
bartfit <- gbart(xtrain , ytrain , x.test = xtest)

yhat.bart <- bartfit$yhat.test.mean
mean (( ytest - yhat.bart)^2) #15.94 MSE, better than boosting and random forest

ord <- order(bartfit$varcount.mean , decreasing = T)
bartfit$varcount.mean[ord]

#Exercise 7
library(MASS)
library(randomForest)

set.seed(1101)

# Construct the train and test matrices
train = sample(dim(Boston)[1], dim(Boston)[1]/2)
X.train = Boston[train, -14]
X.test = Boston[-train, -14]
Y.train = Boston[train, 14]
Y.test = Boston[-train, 14]

p = dim(Boston)[2] - 1
p.2 = p/2
p.sq = sqrt(p)

rf.boston.p = randomForest(X.train, Y.train, xtest = X.test, ytest = Y.test, 
                           mtry = p, ntree = 500)
rf.boston.p.2 = randomForest(X.train, Y.train, xtest = X.test, ytest = Y.test, 
                             mtry = p.2, ntree = 500)
rf.boston.p.sq = randomForest(X.train, Y.train, xtest = X.test, ytest = Y.test, 
                              mtry = p.sq, ntree = 500)

plot(1:500, rf.boston.p$test$mse, col = "green", type = "l", xlab = "Number of Trees", 
     ylab = "Test MSE", ylim = c(10, 19))
lines(1:500, rf.boston.p.2$test$mse, col = "red", type = "l")
lines(1:500, rf.boston.p.sq$test$mse, col = "blue", type = "l")
legend("topright", c("m=p", "m=p/2", "m=sqrt(p)"), col = c("green", "red", "blue"), 
       cex = 1, lty = 1)

#Exercise 8 (A)
library(ISLR2)
attach(Carseats)
set.seed(1)

train = sample(dim(Carseats)[1], dim(Carseats)[1]/2)
Carseats.train = Carseats[train, ]
Carseats.test = Carseats[-train, ]

#Exercise 8 (B)

library(tree)
tree.carseats = tree(Sales ~ ., data = Carseats.train)
summary(tree.carseats)

plot(tree.carseats)
text(tree.carseats, pretty = 0)

pred.carseats = predict(tree.carseats, Carseats.test)
mean((Carseats.test$Sales - pred.carseats)^2)

#Exercise 8 (C)

cv.carseats = cv.tree(tree.carseats, FUN = prune.tree)
par(mfrow = c(1, 2))
plot(cv.carseats$size, cv.carseats$dev, type = "b")
plot(cv.carseats$k, cv.carseats$dev, type = "b")

# Best size = 9
pruned.carseats = prune.tree(tree.carseats, best = 9)
par(mfrow = c(1, 1))
plot(pruned.carseats)
text(pruned.carseats, pretty = 0)

pred.pruned = predict(pruned.carseats, Carseats.test)
mean((Carseats.test$Sales - pred.pruned)^2)
#Pruning the tree in this case increases the test MSE to 4.99.

#Exercise 8 (D)

library(randomForest)

bag.carseats = randomForest(Sales ~ ., data = Carseats.train, mtry = 10, ntree = 500, 
                            importance = T)
bag.pred = predict(bag.carseats, Carseats.test)
mean((Carseats.test$Sales - bag.pred)^2)

importance(bag.carseats)

#RESULTS
#Bagging improves the test MSE to 2.58. We also see that Price, ShelveLoc and Age are three most important predictors of Sale.


#Exercise 8 (E)

rf.carseats = randomForest(Sales ~ ., data = Carseats.train, mtry = 5, ntree = 500, 
                           importance = T)
rf.pred = predict(rf.carseats, Carseats.test)
mean((Carseats.test$Sales - rf.pred)^2)

importance(rf.carseats)

#RESULTS
#In this case, random forest worsens the MSE on test set to 2.87. Changing m varies test MSE between 2.6 to 3. 
#We again see that Price, ShelveLoc and Age are three most important predictors of Sale.

#Exercise 8 (F)

library(Rcpp)
library(BART)

View(Carseats)

x <- Carseats[, 2:10]
y <- Carseats[, "Sales"]
xtrain <- x[train, ]
ytrain <- y[train]
xtest <- x[-train, ]
ytest <- y[-train]
set.seed (5)
bartfit <- gbart(xtrain , ytrain , x.test = xtest)

yhat.bart <- bartfit$yhat.test.mean
mean (( ytest - yhat.bart)^2) #1.46 MSE, better than boosting and random forest

ord <- order(bartfit$varcount.mean , decreasing = T)
bartfit$varcount.mean[ord]

#Exercise 9 (A)

View(OJ)
dim(OJ)

set.seed(1)
train <- sample(1:nrow(OJ), 800)
OJ.train <- OJ[train, ]
OJ.test <- OJ[-train, ]

#Exercise 9 (B)
library(tree)

tree.oj <- tree(Purchase ~ ., data = OJ.train)
summary(tree.oj)

#Exercise 9 (C)

tree.oj

#Exercise 9 (D)

plot(tree.oj)
text(tree.oj, pretty = 0)

#Exercise 9 (E)

tree.pred <- predict(tree.oj, OJ.test, type = "class")
table(tree.pred, OJ.test$Purchase)
1 - (160+64)/270

#test error 17%

#Exercise 9 (F)

cv.oj <- cv.tree(tree.oj, FUN = prune.misclass)
cv.oj

#Exercise 9 (G)

plot(cv.oj$size, cv.oj$dev, type = "b", xlab = "Tree size", ylab = "Deviance")

#Tree 2 is the tree with the smallest deviance

#Exercise 9 (i)

prune.oj <- prune.misclass(tree.oj, best = 2)
plot(prune.oj)
text(prune.oj, pretty = 0)

#Exercise 9 (j)

summary(tree.oj)
summary(prune.oj)

#Exercise 9 (K)

prune.pred <- predict(prune.oj, OJ.test, type = "class")
table(prune.pred, OJ.test$Purchase)

1 - (142 + 78) / 270

#Exercise 10 (A)
View(Hitters)

Hitters <- na.omit(Hitters)
Hitters$Salary <- log(Hitters$Salary)

#Exercise 10 (B)

train <- 1:200
Hitters.train <- Hitters[train, ]
Hitters.test <- Hitters[-train, ]

#Exercise 10 (C)

library(gbm)
set.seed(1)
pows <- seq(-10, -0.2, by = 0.1)
lambdas <- 10^pows

train.err <- rep(NA, length(lambdas))

for (i in 1:length(lambdas)) {
  boost.hitters <- gbm(Salary ~ ., data = Hitters.train, distribution = "gaussian", n.trees = 1000, shrinkage = lambdas[i])
  pred.train <- predict(boost.hitters, Hitters.train, n.trees = 1000)
  train.err[i] <- mean((pred.train - Hitters.train$Salary)^2)
}

plot(lambdas, train.err, type = "b", xlab = "Shrinkage values", ylab = "Training MSE")

#Exercise 10 (D)

set.seed(1)
test.err <- rep(NA, length(lambdas))
for (i in 1:length(lambdas)) {
  boost.hitters <- gbm(Salary ~ ., data = Hitters.train, distribution = "gaussian", n.trees = 1000, shrinkage = lambdas[i])
  yhat <- predict(boost.hitters, Hitters.test, n.trees = 1000)
  test.err[i] <- mean((yhat - Hitters.test$Salary)^2)
}

plot(lambdas, test.err, type = "b", xlab = "Shrinkage values", ylab = "Test MSE")

min(test.err)
lambdas[which.min(test.err)]

#The minimum test MSE is 0.25, and is obtained for λ=0.079.

#Exercise 10 (E)

library(glmnet)

fit1 <- lm(Salary ~ ., data = Hitters.train)
pred1 <- predict(fit1, Hitters.test)
mean((pred1 - Hitters.test$Salary)^2)

x <- model.matrix(Salary ~ ., data = Hitters.train)
x.test <- model.matrix(Salary ~ ., data = Hitters.test)
y <- Hitters.train$Salary
fit2 <- glmnet(x, y, alpha = 0)
pred2 <- predict(fit2, s = 0.01, newx = x.test)
mean((pred2 - Hitters.test$Salary)^2)

#The test MSE for boosting (25%) is lower than for linear regression (49%) and ridge regression (45%).

#Exercise 10 (F)

library(gbm)

boost.hitters <- gbm(Salary ~ ., data = Hitters.train, distribution = "gaussian", n.trees = 1000, shrinkage = lambdas[which.min(test.err)])
summary(boost.hitters)

#Exercise 10 (G)
library(randomForest)

set.seed(1)
bag.hitters <- randomForest(Salary ~ ., data = Hitters.train, mtry = 19, ntree = 500)
yhat.bag <- predict(bag.hitters, newdata = Hitters.test)
mean((yhat.bag - Hitters.test$Salary)^2)

#MSE - 22%

#Exercise 11 (A)

set.seed(1)
train <- 1:1000
Caravan$Purchase <- ifelse(Caravan$Purchase == "Yes", 1, 0)
Caravan.train <- Caravan[train, ]
Caravan.test <- Caravan[-train, ]

#Exercise 11 (B)

set.seed(1)
boost.caravan <- gbm(Purchase ~ ., data = Caravan.train, distribution = "gaussian", n.trees = 1000, shrinkage = 0.01)

summary(boost.caravan)

#Exercise 11 (C)

probs.test <- predict(boost.caravan, Caravan.test, n.trees = 1000, type = "response")
pred.test <- ifelse(probs.test > 0.2, 1, 0)
table(Caravan.test$Purchase, pred.test)
summary(table(Caravan.test$Purchase, pred.test))

logit.caravan <- glm(Purchase ~ ., data = Caravan.train, family = "binomial")
probs.test2 <- predict(logit.caravan, Caravan.test, type = "response")

pred.test2 <- ifelse(probs.test > 0.2, 1, 0)
table(Caravan.test$Purchase, pred.test2)

#Exercise 12 ()
#We will use the “Weekly” data set from the “ISLR” package to predict the “Direction” variable.
library(ISLR)

set.seed(1)
train <- sample(nrow(Weekly), nrow(Weekly) / 2)
Weekly$Direction <- ifelse(Weekly$Direction == "Up", 1, 0)
Weekly.train <- Weekly[train, ]
Weekly.test <- Weekly[-train, ]

#We begin with logistic regression.

logit.fit <- glm(Direction ~ . - Year - Today, data = Weekly.train, family = "binomial")
logit.probs <- predict(logit.fit, newdata = Weekly.test, type = "response")
logit.pred <- ifelse(logit.probs > 0.5, 1, 0)
table(Weekly.test$Direction, logit.pred)
1 - (82 + 219) / 545
#classification error 44%

boost.fit <- gbm(Direction ~ . - Year - Today, data = Weekly.train, distribution = "bernoulli", n.trees = 5000)
boost.probs <- predict(boost.fit, newdata = Weekly.test, n.trees = 5000)
boost.pred <- ifelse(boost.probs > 0.5, 1, 0)
table(Weekly.test$Direction, boost.pred)
1 - (126 + 139) / 545
#classification error 51%

bag.fit <- randomForest(Direction ~ . - Year - Today, data = Weekly.train, mtry = 6)

bag.probs <- predict(bag.fit, newdata = Weekly.test)
bag.pred <- ifelse(bag.probs > 0.5, 1, 0)
table(Weekly.test$Direction, bag.pred)

rf.fit <- randomForest(Direction ~ . - Year - Today, data = Weekly.train, mtry = 2)

rf.probs <- predict(rf.fit, newdata = Weekly.test)
rf.pred <- ifelse(rf.probs > 0.5, 1, 0)
table(Weekly.test$Direction, rf.pred)
