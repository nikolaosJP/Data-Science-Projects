#9.6 Lab: Support Vector Machines

#9.6.1 Support Vector Classifier

#8.3.1 Fitting Classification Trees
library(e1071)

set.seed (1)
x <- matrix(rnorm (20 * 2), ncol = 2)
y <- c(rep(-1, 10), rep(1, 10))
x[y == 1, ] <- x[y == 1, ] + 1
plot(x, col = (3 - y))

dat <- data.frame(x = x, y = as.factor(y))

#The argument scale = FALSE tells the svm() function not to scale each
#feature to have mean zero or standard deviation one; depending on the
#application, one might prefer to use scale = TRUE.

svmfit <- svm(y ∼ ., data = dat , kernel = "linear",
                cost = 10, scale = FALSE)

plot(svmfit , dat)
svmfit$index

#Reducing the cost parameter
svmfit <- svm(y ∼ ., data = dat , kernel = "linear",
              cost = 0.1, scale = FALSE)
plot(svmfit , dat)
svmfit$index

#performing cross-validation with tune()
#NOTE that tune() performs 10 cross-validations by default 
set.seed (1)
tune.out <- tune(svm , y ∼ ., data = dat , kernel = "linear",
                   ranges = list(cost = c(0.001 , 0.01, 0.1, 1, 5, 10, 100)))
summary(tune.out)

bestmod <- tune.out$best.model
summary(bestmod)

#creatng a test set 
xtest <- matrix(rnorm (20 * 2), ncol = 2)
ytest <- sample(c(-1, 1), 20, rep = TRUE)
xtest[ytest == 1, ] <- xtest[ytest == 1, ] + 1
testdat <- data.frame(x = xtest , y = as.factor(ytest))

#using the bestmod model to makes predictions
ypred <- predict(bestmod , testdat)
table(predict = ypred , truth = testdat$y)

#testing svm on a dataset that is linearly seperable

x[y == 1, ] <- x[y == 1, ] + 0.5
plot(x, col = (y + 5) / 2, pch = 19)

dat <- data.frame(x = x, y = as.factor(y))
svmfit <- svm(y ∼ ., data = dat , kernel = "linear",
                cost = 1e5)
summary(svmfit)

plot(svmfit , dat)

svmfit <- svm(y ∼ ., data = dat , kernel = "linear", cost = 1)
summary(svmfit)
plot(svmfit , dat)

#9.6.2 Support Vector Machine

#creating data with non-linear boundaries

set.seed (1)
x <- matrix(rnorm (200 * 2), ncol = 2)
x[1:100, ] <- x[1:100, ] + 2
x[101:150, ] <- x[101:150, ] - 2
y <- c(rep(1, 150) , rep(2, 50))
dat <- data.frame(x = x, y = as.factor(y))

plot(x, col = y)

#To fit an SVM with a polynomial kernel we use kernel = "polynomial",
#and to fit an SVM with a radial kernel we use kernel = "radial". In the
#former case we also use the degree argument to specify a degree for the
#polynomial kernel, and in the latter case we use gamma to specify a value of γ for the radial basis kernel

train <- sample (200 , 100)
svmfit <- svm(y ∼ ., data = dat[train , ], kernel = "radial",
                gamma = 1, cost = 1)
plot(svmfit , dat[train , ])

#increasing the cost parameter to improve performance

svmfit <- svm(y ∼ ., data = dat[train , ], kernel = "radial",
                gamma = 1, cost = 1e5)
plot(svmfit , dat[train , ])

#using cross-validation to select the best cost parameter

set.seed (1)
tune.out <- tune(svm , y ∼ ., data = dat[train , ],
                   kernel = "radial",
                   ranges = list(
                     cost = c(0.1 , 1, 10, 100, 1000) ,
                     gamma = c(0.5, 1, 2, 3, 4)))
summary(tune.out)

table(
  true = dat[-train , "y"],
  pred = predict(
    tune.out$best.model , newdata = dat[-train , ]))

#9.6.3 ROC Curves

library(ROCR)
rocplot <- function(pred , truth , ...) {
  predob <- prediction(pred , truth)
  perf <- performance(predob , "tpr", "fpr")
  plot(perf , ...)}

#other. In order to obtain the fitted values for a given SVM model fit, we use
#decision.values = TRUE when fitting svm().

svmfit.opt <- svm(y ∼ ., data = dat[train , ],
                    kernel = "radial", gamma = 2, cost = 1,
                    decision.values = T)
fitted <- attributes(
  predict(svmfit.opt , dat[train , ], decision.values = TRUE))$decision.values

par(mfrow = c(1, 2))
rocplot(-fitted, dat[train , "y"], main = "Training Data")

#Improving performance by increase γ
svmfit.flex <- svm(y ∼ ., data = dat[train , ],
                     kernel = "radial", gamma = 50, cost = 1,
                     decision.values = T)
fitted <- attributes(
  predict(svmfit.flex , dat[train , ], decision.values = T)
)$decision.values

rocplot(-fitted , dat[train , "y"], add = T, col = "red")

#examining performance on the test data

fitted <- attributes(
  predict(svmfit.opt , dat[-train , ], decision.values = T)
)$decision.values

rocplot(-fitted , dat[-train , "y"], main = "Test Data")

fitted <- attributes(
  predict(svmfit.flex , dat[-train , ], decision.values = T)
)$decision.values

rocplot(-fitted , dat[-train , "y"], add = T, col = "red")

#9.6.4 SVM with Multiple Classes

#Generating an additional category
set.seed (1)
x <- rbind(x, matrix(rnorm (50 * 2), ncol = 2))
y <- c(y, rep(0, 50))
x[y == 0, 2] <- x[y == 0, 2] + 2
dat <- data.frame(x = x, y = as.factor(y))
par(mfrow = c(1, 1))
plot(x, col = (y + 1))

#performing SVM on 3 classes
svmfit <- svm(y ∼ ., data = dat , kernel = "radial",
                cost = 10, gamma = 1)
plot(svmfit , dat)

#9.6.5 Application to Gene Expression Data

library(ISLR2)
names(Khan)
dim(Khan$xtrain)
dim(Khan$xtest)
length(Khan$ytrain)
length(Khan$ytest)
table(Khan$ytrain)
table(Khan$ytest)


dat <- data.frame(
  x = Khan$xtrain,
  y = as.factor(Khan$ytrain))

out <- svm(y ∼ ., data = dat , kernel = "linear",
             cost = 10)
summary(out)
table(out$fitted, dat$y)

#examining the relationship of this model on the test set
dat.te <- data.frame(
  x = Khan$xtest,
  y = as.factor(Khan$ytest))

pred.te <- predict(out , newdata = dat.te)
table(pred.te, dat.te$y)

#Applied

#Exercise 4 (A)

set.seed(131)
x = rnorm(100)
y = 3 * x^2 + 4 + rnorm(100)
train = sample(100, 50)
y[train] = y[train] + 3
y[-train] = y[-train] - 3
# Plot using different colors
plot(x[train], y[train], pch="+", lwd=4, col="red", ylim=c(-4, 20), xlab="X", ylab="Y")
points(x[-train], y[-train], pch="o", lwd=4, col="blue")

set.seed(315)
z = rep(0, 100)
z[train] = 1
# Take 25 observations each from train and -train
final.train = c(sample(train, 25), sample(setdiff(1:100, train), 25))
data.train = data.frame(x=x[final.train], y=y[final.train], z=as.factor(z[final.train]))
data.test = data.frame(x=x[-final.train], y=y[-final.train], z=as.factor(z[-final.train]))
library(e1071)

svm.linear = svm(z~., data=data.train, kernel="linear", cost=10)
plot(svm.linear, data.train)

table(z[final.train], predict(svm.linear, data.train))

set.seed(32545)
svm.poly = svm(z~., data=data.train, kernel="polynomial", cost=10)
plot(svm.poly, data.train)

table(z[final.train], predict(svm.poly, data.train))

set.seed(996)
svm.radial = svm(z~., data=data.train, kernel="radial", gamma=1, cost=10)
plot(svm.radial, data.train)

table(z[final.train], predict(svm.radial, data.train))

#RESULTS
#plots
plot(svm.linear, data.test)
plot(svm.poly, data.test)
plot(svm.radial, data.test)
#performance
table(z[-final.train], predict(svm.linear, data.test))
table(z[-final.train], predict(svm.poly, data.test))
table(z[-final.train], predict(svm.radial, data.test))

#Misclassifications 7, 17, 2, respectively.

#Exercise 5 (A)

set.seed(421)
x1 = runif(500) - 0.5
x2 = runif(500) - 0.5
y = 1 * (x1^2 - x2^2 > 0)

#Exercise 5 (B)
plot(x1[y == 0], x2[y == 0], col = "red", xlab = "X1", ylab = "X2", pch = "+")
points(x1[y == 1], x2[y == 1], col = "blue", pch = 4)

#Exercise 5 (C)

lm.fit = glm(y ~ x1 + x2, family = binomial)
summary(lm.fit)

#Exercise 5 (D)

data = data.frame(x1 = x1, x2 = x2, y = y)
lm.prob = predict(lm.fit, data, type = "response")
lm.pred = ifelse(lm.prob > 0.52, 1, 0)
data.pos = data[lm.pred == 1, ]
data.neg = data[lm.pred == 0, ]
plot(data.pos$x1, data.pos$x2, col = "blue", xlab = "X1", ylab = "X2", pch = "+")
points(data.neg$x1, data.neg$x2, col = "red", pch = 4)

#Exercise 5 (E)

lm.fit = glm(y ~ poly(x1, 2) + poly(x2, 2) + I(x1 * x2), data = data, family = binomial)

#Exercise 5 (F)

lm.prob = predict(lm.fit, data, type = "response")
lm.pred = ifelse(lm.prob > 0.5, 1, 0)
data.pos = data[lm.pred == 1, ]
data.neg = data[lm.pred == 0, ]
plot(data.pos$x1, data.pos$x2, col = "blue", xlab = "X1", ylab = "X2", pch = "+")
points(data.neg$x1, data.neg$x2, col = "red", pch = 4)

#Exercise 5 (G)
library(e1071)

svm.fit = svm(as.factor(y) ~ x1 + x2, data, kernel = "linear", cost = 0.1)
svm.pred = predict(svm.fit, data)
data.pos = data[svm.pred == 1, ]
data.neg = data[svm.pred == 0, ]
plot(data.pos$x1, data.pos$x2, col = "blue", xlab = "X1", ylab = "X2", pch = "+")
points(data.neg$x1, data.neg$x2, col = "red", pch = 4)

#Exercise 5 (H)

svm.fit = svm(as.factor(y) ~ x1 + x2, data, gamma = 1)
svm.pred = predict(svm.fit, data)
data.pos = data[svm.pred == 1, ]
data.neg = data[svm.pred == 0, ]
plot(data.pos$x1, data.pos$x2, col = "blue", xlab = "X1", ylab = "X2", pch = "+")
points(data.neg$x1, data.neg$x2, col = "red", pch = 4)

#Exercise 6 (A)

set.seed(3154)
# Class one
x.one = runif(500, 0, 90)
y.one = runif(500, x.one + 10, 100)
x.one.noise = runif(50, 20, 80)
y.one.noise = 5/4 * (x.one.noise - 10) + 0.1

# Class zero
x.zero = runif(500, 10, 100)
y.zero = runif(500, 0, x.zero - 10)
x.zero.noise = runif(50, 20, 80)
y.zero.noise = 5/4 * (x.zero.noise - 10) - 0.1

# Combine all
class.one = seq(1, 550)
x = c(x.one, x.one.noise, x.zero, x.zero.noise)
y = c(y.one, y.one.noise, y.zero, y.zero.noise)

plot(x[class.one], y[class.one], col = "blue", pch = "+", ylim = c(0, 100))
points(x[-class.one], y[-class.one], col = "red", pch = 4)

#Exercise 6 (B)
library(e1071)

set.seed(555)
z = rep(0, 1100)
z[class.one] = 1
data = data.frame(x = x, y = y, z = z)
tune.out = tune(svm, as.factor(z) ~ ., data = data, kernel = "linear", ranges = list(cost = c(0.01, 
                                                                                              0.1, 1, 5, 10, 100, 1000, 10000)))
summary(tune.out)

data.frame(cost = tune.out$performances$cost, misclass = tune.out$performances$error * 
             1100)
#Exercise 6 (C)

set.seed(1111)
x.test = runif(1000, 0, 100)
class.one = sample(1000, 500)
y.test = rep(NA, 1000)
# Set y > x for class.one
for (i in class.one) {
  y.test[i] = runif(1, x.test[i], 100)
}
# set y < x for class.zero
for (i in setdiff(1:1000, class.one)) {
  y.test[i] = runif(1, 0, x.test[i])
}
plot(x.test[class.one], y.test[class.one], col = "blue", pch = "+")
points(x.test[-class.one], y.test[-class.one], col = "red", pch = 4)

#looking at the linear SVM 

set.seed(30012)
z.test = rep(0, 1000)
z.test[class.one] = 1
all.costs = c(0.01, 0.1, 1, 5, 10, 100, 1000, 10000)
test.errors = rep(NA, 8)
data.test = data.frame(x = x.test, y = y.test, z = z.test)
for (i in 1:length(all.costs)) {
  svm.fit = svm(as.factor(z) ~ ., data = data, kernel = "linear", cost = all.costs[i])
  svm.predict = predict(svm.fit, data.test)
  test.errors[i] = sum(svm.predict != data.test$z)
}

data.frame(cost = all.costs, `test misclass` = test.errors)

#Exercise 7 (A)
library(ISLR2)
gas.med = median(Auto$mpg)
new.var = ifelse(Auto$mpg > gas.med, 1, 0)
Auto$mpglevel = as.factor(new.var)

#Exercise 7 (B)

library(e1071)

set.seed(3255)
tune.out = tune(svm, mpglevel ~ ., data = Auto, kernel = "linear", ranges = list(cost = c(0.01, 
                                                                                          0.1, 1, 5, 10, 100)))
summary(tune.out)
# Best Parameter - cost = 1
#Exercise 7 (C)

set.seed(21)
tune.out = tune(svm, mpglevel ~ ., data = Auto, kernel = "polynomial", ranges = list(cost = c(0.1, 
                                                                                              1, 5, 10), degree = c(2, 3, 4)))
summary(tune.out)
# Best Parameter - cost = 10, degree = 2
set.seed(463)
tune.out = tune(svm, mpglevel ~ ., data = Auto, kernel = "radial", ranges = list(cost = c(0.1, 
                                                                                          1, 5, 10), gamma = c(0.01, 0.1, 1, 5, 10, 100)))
summary(tune.out)
# Best Parameter - cost = 10, gamma = 0.01

#Exercise 7 (D)

svm.linear = svm(mpglevel ~ ., data = Auto, kernel = "linear", cost = 1)
svm.poly = svm(mpglevel ~ ., data = Auto, kernel = "polynomial", cost = 10, 
               degree = 2)
svm.radial = svm(mpglevel ~ ., data = Auto, kernel = "radial", cost = 10, gamma = 0.01)

plotpairs = function(fit) {
  for (name in names(Auto)[!(names(Auto) %in% c("mpg", "mpglevel", "name"))]) {
    plot(fit, Auto, as.formula(paste("mpg~", name, sep = "")))}}

plotpairs(svm.linear)
plotpairs(svm.poly)
plotpairs(svm.radial)

#Exercise 8 (A)

library(ISLR2)
set.seed(9004)
train = sample(dim(OJ)[1], 800)
OJ.train = OJ[train, ]
OJ.test = OJ[-train, ]

#Exercise 8 (B)
library(e1071)

svm.linear = svm(Purchase ~ ., kernel = "linear", data = OJ.train, cost = 0.01)
summary(svm.linear)
#Support vector classifier creates 442 support vectors out of 800 training points. 
#Out of these, 222 belong to level CH and remaining 220 belong to level MM.

#Exercise 8 (C)

train.pred = predict(svm.linear, OJ.train)
table(OJ.train$Purchase, train.pred)
(80 + 51)/(432 + 51 + 80 + 237)

test.pred = predict(svm.linear, OJ.test)
table(OJ.test$Purchase, test.pred)
(22+24)/(146+24+22+78)

#The training error rate is 16.3% and test error rate is about 17%.

#Exercise 8 (D)

set.seed(1554)
tune.out = tune(svm, Purchase ~ ., data = OJ.train, kernel = "linear", ranges = list(cost = 10^seq(-2, 
                                                                                                   1, by = 0.25)))
summary(tune.out)
#Best parameter, cost = 3.16

#Exercise 8 (E)

svm.linear = svm(Purchase ~ ., kernel = "linear", data = OJ.train, cost = tune.out$best.parameters$cost)
train.pred = predict(svm.linear, OJ.train)
table(OJ.train$Purchase, train.pred)
(74+55)/(428+55+74+243)

test.pred = predict(svm.linear, OJ.test)
table(OJ.test$Purchase, test.pred)
(20+24)/(146+24+20+80)
#Both the training error and the test error decrease to 16.1% and 16.2, respectively.

#Exercise 8 (F)

set.seed(410)
svm.radial = svm(Purchase ~ ., data = OJ.train, kernel = "radial")
summary(svm.radial)

train.pred = predict(svm.radial, OJ.train)
table(OJ.train$Purchase, train.pred)
(74+42)/(441+42+74+243)
test.pred = predict(svm.radial, OJ.test)
table(OJ.test$Purchase, test.pred)
(27+22)/(148+22+27+73)

#The training error decreases to 14.5% but the test error increases to 18.1%

#Tuning the hyperparameters

set.seed(755)
tune.out = tune(svm, Purchase ~ ., data = OJ.train, kernel = "radial", ranges = list(cost = 10^seq(-2, 
                                                                                                   1, by = 0.25)))
summary(tune.out)

svm.radial = svm(Purchase ~ ., data = OJ.train, kernel = "radial", cost = tune.out$best.parameters$cost)

train.pred = predict(svm.radial, OJ.train)
table(OJ.train$Purchase, train.pred)
(81+43)/(440+43+81+236)
test.pred = predict(svm.radial, OJ.test)
table(OJ.test$Purchase, test.pred)
(28+25)/(145+25+28+72)

#Both the training and test error increase to 15.5% and 19.6%, respectively.

#Exercise 8 (G)

set.seed(8112)
svm.poly = svm(Purchase ~ ., data = OJ.train, kernel = "poly", degree = 2)
summary(svm.poly)

train.pred = predict(svm.poly, OJ.train)
table(OJ.train$Purchase, train.pred)
(111+33)/(450+33+111+206)
test.pred = predict(svm.poly, OJ.test)
table(OJ.test$Purchase, test.pred)
(34+21)/(149+21+34+66)

#The training error is 18% and the test error is 20.3%
#Tuning the hyperparameter

set.seed(322)
tune.out = tune(svm, Purchase ~ ., data = OJ.train, kernel = "poly", degree = 2, 
                ranges = list(cost = 10^seq(-2, 1, by = 0.25)))
summary(tune.out)

svm.poly = svm(Purchase ~ ., data = OJ.train, kernel = "poly", degree = 2, cost = tune.out$best.parameters$cost)

train.pred = predict(svm.poly, OJ.train)
table(OJ.train$Purchase, train.pred)
(85+36)/(447+36+85+232)
test.pred = predict(svm.poly, OJ.test)
table(OJ.test$Purchase, test.pred)
(28+22)/(148+22+28+72)

#Tuning the hyperparameter decreased the training error to 15.1% and the test error to 18.5%