df <- read.csv("C:\your path\Auto.csv", 
               na.strings = "?", stringsAsFactors = T)

#4.7.1 The Stock Market Data

library(ISLR2)
library(dplyr)
library(MASS)

names(Smarket)
dim(Smarket)
summary(Smarket)
pairs(Smarket)

cor(Smarket)
cor(Smarket[, -9])

attach(Smarket)
plot(Volume)


#4.7.2 Logistic Regression
glm.fits <- glm(
  Direction ∼ Lag1 + Lag2 + Lag3 + Lag4 + Lag5 + Volume ,
  data = Smarket , family = binomial)
summary(glm.fits)
coef(glm.fits)
summary(glm.fits)$coef[, 4]
glm.probs <- predict(glm.fits , type = "response")
glm.probs[1:10]
contrasts(Direction)
glm.pred <- rep("Down", 1250)
glm.pred[glm.probs > .5] = "Up"
table(glm.pred , Direction)
mean(glm.pred == Direction)

train <- (Year < 2005)
Smarket.2005 <- Smarket[!train, ]
dim(Smarket.2005)
Direction.2005 <- Direction[!train]

glm.fits <- glm(
  Direction ∼ Lag1 + Lag2 + Lag3 + Lag4 + Lag5 + Volume ,
  data = Smarket , family = binomial , subset = train)

glm.probs <- predict(glm.fits , Smarket.2005,
                     type = "response")
glm.pred <- rep("Down", 252)
glm.pred[glm.probs > .5] <- "Up"
table(glm.pred , Direction.2005)
mean(glm.pred == Direction.2005)
mean(glm.pred != Direction.2005)

glm.fits <- glm(Direction ∼ Lag1 + Lag2 , data = Smarket ,
                family = binomial , subset = train)
glm.probs <- predict(glm.fits , Smarket.2005,
                     type = "response")

glm.pred <- rep("Down", 252)
glm.pred[glm.probs > .5] <- "Up"
table(glm.pred , Direction.2005)
mean(glm.pred == Direction.2005)
106 / (106 + 76)

predict(glm.fits,
        newdata =
          data.frame(Lag1 = c(1.2 , 1.5) , Lag2 = c(1.1 , -0.8)),
        type = "response")

#4.7.3 Linear Discriminant Analysis

lda.fit <- lda(Direction ∼ Lag1 + Lag2 , data = Smarket ,
               subset = train)

lda.fit
plot(lda.fit)
lda.pred <- predict(lda.fit , Smarket.2005)
names(lda.pred)

lda.class <- lda.pred$class
table(lda.class, Direction.2005)
mean(lda.class == Direction.2005)
sum(lda.pred$posterior[, 1] >= .5)
sum(lda.pred$posterior[, 1] < .5)

lda.pred$posterior[1:20, 1]
lda.class[1:20]
sum(lda.pred$posterior[, 1] > .52)

#4.7.4 Quadratic Discriminant Analysis

qda.fit <- qda(Direction ∼ Lag1 + Lag2 , data = Smarket ,
               subset = train)
qda.fit

qda.class <- predict(qda.fit , Smarket.2005)$class
table(qda.class , Direction.2005)
mean(qda.class == Direction.2005)

#4.7.5 Naive Bayes
library(e1071)
nb.fit <- naiveBayes(Direction ∼ Lag1 + Lag2 , data = Smarket ,
                     subset = train)
nb.fit
mean(Lag1[train][Direction[train] == "Down"])
sd(Lag1[train][Direction[train] == "Down"])

nb.class <- predict(nb.fit , Smarket.2005)
table(nb.class , Direction.2005)
mean(nb.class == Direction.2005)
nb.preds <- predict(nb.fit , Smarket.2005, type = "raw")
nb.preds[1:5, ]

#4.7.6 K-Nearest Neighbors
library(class)
train.X <- cbind(Lag1 , Lag2)[train , ]
test.X <- cbind(Lag1 , Lag2)[!train , ]
train.Direction <- Direction[train]

set.seed (1)
knn.pred <- knn(train.X, test.X, train.Direction , k = 1)
table(knn.pred , Direction.2005)

knn.pred <- knn(train.X, test.X, train.Direction , k = 3)
table(knn.pred , Direction.2005)
mean(knn.pred == Direction.2005)

#Caravan dataset
dim(Caravan)
attach(Caravan)
summary(Purchase)

standardized.X <- scale(Caravan[, -86])
var(Caravan[, 1])
var(Caravan[, 2])

var(standardized.X[, 1])
var(standardized.X[, 2])

test <- 1:1000
train.X <- standardized.X[-test, ]
test.X <- standardized.X[test, ]
train.Y <- Purchase[-test]
test.Y <- Purchase[test]
set.seed (1)
knn.pred <- knn(train.X, test.X, train.Y, k = 1)
mean(test.Y != knn.pred)
mean(test.Y != "No")

table(knn.pred , test.Y)
test.Y

knn.pred <- knn(train.X, test.X, train.Y, k = 3)
table(knn.pred , test.Y)
knn.pred <- knn(train.X, test.X, train.Y, k = 5)
table(knn.pred , test.Y)

glm.fits <- glm(Purchase ∼ ., data = Caravan ,
                family = binomial , subset = -test)
glm.probs <- predict(glm.fits, Caravan[test ,],type = "response ")
glm.pred <- rep("No", 1000)
glm.pred[glm.probs > .5] <- "Yes"
table(glm.pred , test.Y)

#4.7.7 Poisson Regression
attach(Bikeshare)
dim(Bikeshare)
names(Bikeshare)
mod.lm <- lm(
  bikers ∼ mnth + hr + workingday + temp + weathersit ,
  data = Bikeshare)
summary(mod.lm)

contrasts(Bikeshare$hr) = contr.sum (24)
contrasts(Bikeshare$mnth) = contr.sum (12)
mod.lm2 <- lm(
  bikers ∼ mnth + hr + workingday + temp + weathersit ,
  data = Bikeshare
)
summary(mod.lm2)

sum(( predict(mod.lm) - predict(mod.lm2))^2)
all.equal(predict(mod.lm), predict(mod.lm2))

coef.months <- c(coef(mod.lm2)[2:12],
                 -sum(coef(mod.lm2)[2:12]))

plot(coef.months , xlab = "Month", ylab = "Coefficient",
     xaxt = "n", col = "blue", pch = 19, type = "o")
axis(side = 1, at = 1:12, labels = c("J", "F", "M", "A",
                                     "M", "J", "J", "A", "S", "O", "N", "D"))

coef.hours <- c(coef(mod.lm2)[13:35] ,
                -sum(coef(mod.lm2)[13:35]))
plot(coef.hours , xlab = "Hour", ylab = "Coefficient",
     col = "blue", pch = 19, type = "o")

mod.pois <- glm(
  bikers ∼ mnth + hr + workingday + temp + weathersit ,
  data = Bikeshare , family = poisson
)
summary(mod.pois)

coef.mnth <- c(coef(mod.pois)[2:12] ,
                 -sum(coef(mod.pois)[2:12]))
plot(coef.mnth , xlab = "Month", ylab = "Coefficient",
       xaxt = "n", col = "blue", pch = 19, type = "o")
axis(side = 1, at = 1:12, labels = c("J", "F", "M", "A", "M",
                                       "J", "J", "A", "S", "O", "N", "D"))
coef.hours <- c(coef(mod.pois)[13:35] ,
                  -sum(coef(mod.pois)[13:35]))
plot(coef.hours , xlab = "Hour", ylab = "Coefficient",
       col = "blue", pch = 19, type = "o")

plot(predict(mod.lm2), predict(mod.pois , type = "response"))
abline (0, 1, col = 2, lwd = 3)

#Applied
attach(Weekly)
names(Weekly)
summary(Weekly)
pairs(Weekly)

Direction <- Weekly$Direction
Weekly$Direction <- NULL
Weekly$NumericDirection <- as.numeric(Direction)  # Maps Down=>1 and Up=>2
Weekly$NumericDirection[Weekly$NumericDirection == 1] <- -1  # Maps Down=>-1 and Up=>2
Weekly$NumericDirection[Weekly$NumericDirection == 2] <- +1  # Maps Down=>-1 and Up=>+1

Weekly.cor <- cor(Weekly)
Weekly$NumericDirection <- NULL
Weekly$Direction <- Direction
five_lag_model <- glm(Direction ~ Lag1 + Lag2 + Lag3 + Lag4 + Lag5 + Volume, data = Weekly, family = binomial)
summary(five_lag_model)

contrasts(Weekly$Direction)

p_hat <- predict(five_lag_model, newdata = Weekly, type = "response")
y_hat <- rep("Down", length(p_hat))
y_hat[p_hat > 0.5] <- "Up"
CM <- table(predicted = y_hat, truth = Weekly$Direction)
CM
sprintf("LR (all features): overall fraction correct= %10.6f", (CM[1, 1] + CM[2, 2])/sum(CM))

# d: logistic regression using only Lag2 as the predictor (since it is the most significant predictor)
Weekly.train <- (Weekly$Year >= 1990) & (Weekly$Year <= 2008)  # our training set 
Weekly.test <- (Weekly$Year >= 2009)  # our testing set 
lag2_model <- glm(Direction ~ Lag2, data = Weekly, family = binomial, subset = Weekly.train)

# CM on test data :
p_hat <- predict(lag2_model, newdata = Weekly[Weekly.test, ], type = "response")
y_hat <- rep("Down", length(p_hat))
y_hat[p_hat > 0.5] <- "Up"
CM <- table(predicted = y_hat, truth = Weekly[Weekly.test, ]$Direction)
CM
sprintf("LR (all features): overall fraction correct= %10.6f", (CM[1, 1] + CM[2, 2])/sum(CM))

# e: Use LDA
lda.fit <- lda(Direction ~ Lag2, data = Weekly, subset = Weekly.train)

lda.predict <- predict(lda.fit, newdata = Weekly[Weekly.test, ])
CM <- table(predicted = lda.predict$class, truth = Weekly[Weekly.test, ]$Direction)
CM
sprintf("LDA (only Lag2): overall fraction correct= %10.6f", (CM[1, 1] + CM[2, 2])/sum(CM))

# f: Use QDA
qda.fit <- qda(Direction ~ Lag2, data = Weekly, subset = Weekly.train)

qda.predict <- predict(qda.fit, newdata = Weekly[Weekly.test, ])
CM <- table(predicted = qda.predict$class, truth = Weekly[Weekly.test, ]$Direction)
CM
sprintf("QDA (only Lag2): overall fraction correct= %10.6f", (CM[1, 1] + CM[2, 2])/sum(CM))

# g: KNN
X.train <- data.frame(Lag2 = Weekly[Weekly.train, ]$Lag2)
Y.train <- Weekly[Weekly.train, ]$Direction

X.test <- data.frame(Lag2 = Weekly[Weekly.test, ]$Lag2)

y_hat_k_1 <- knn(X.train, X.test, Y.train, k = 1)

CM <- table(predicted = y_hat_k_1, truth = Weekly[Weekly.test, ]$Direction)
CM
sprintf("KNN (k=1): overall fraction correct= %10.6f", (CM[1, 1] + CM[2, 2])/sum(CM))

y_hat_k_3 <- knn(X.train, X.test, Y.train, k = 3)
CM <- table(predicted = y_hat_k_3, truth = Weekly[Weekly.test, ]$Direction)
CM
sprintf("KNN (k=1): overall fraction correct= %10.6f", (CM[1, 1] + CM[2, 2])/sum(CM))

#Exercise 11

attach(Auto)
summary(Auto)

set.seed(0)

# Part (a):
mpg01 <- rep(0, dim(Auto)[1])  # 0 => less than the median of mpg 
mpg01[Auto$mpg > median(Auto$mpg)] <- 1  # 1 => greater than the median of mpg 

Auto$mpg01 <- mpg01
Auto$mpg <- NULL

# Part (b):
pairs(Auto)
cor(Auto[,-9])
boxplot(cylinders ~ mpg01, data = Auto, main = "Cylinders vs mpg01")
boxplot(displacement ~ mpg01, data = Auto, main = "Displacement vs mpg01")
boxplot(horsepower ~ mpg01, data = Auto, main = "Horsepower vs mpg01")
boxplot(weight ~ mpg01, data = Auto, main = "Weight vs mpg01")
boxplot(acceleration ~ mpg01, data = Auto, main = "Acceleration vs mpg01")
boxplot(year ~ mpg01, data = Auto, main = "Year vs mpg01")

# Part (c):
train <- (year %% 2 == 0)
Auto.train <- Auto[train, ]
Auto.test <- Auto[!train, ]
mpg01.test <- mpg01[!train]

# Part (d):
fit.lda <- lda(mpg01 ~ cylinders + weight + displacement + horsepower, data = Auto, subset = train)
fit.lda

pred.lda <- predict(fit.lda, Auto.test)
CM <- table(predicted = pred.lda$class, truth = Auto.test$mpg01)
CM
sprintf("LDA: overall fraction correct= %10.6f", (CM[1, 1] + CM[2, 2])/sum(CM))
mean(pred.lda$class != mpg01.test)

#Part (e):
fit.qda <- qda(mpg01 ~ cylinders + weight + displacement + horsepower, data = Auto, subset = train)
fit.qda
pred.qda <- predict(fit.qda, Auto.test)
CM <- table(predicted = pred.qda$class, truth = Auto.test$mpg01)
sprintf("LDA: overall fraction correct= %10.6f", (CM[1, 1] + CM[2, 2])/sum(CM))

#Part (f):
fit.glm <- glm(mpg01 ~ cylinders + weight + displacement + horsepower, data = Auto, family = binomial, subset = train)
summary(fit.glm)

probs <- predict(fit.glm, Auto.test, type = "response")
pred.glm <- rep(0, length(probs))
pred.glm[probs > 0.5] <- 1
table(pred.glm, mpg01.test)
mean(pred.glm != mpg01.test)

# Part (g):
train.X <- cbind(cylinders, weight, displacement, horsepower)[train, ]
test.X <- cbind(cylinders, weight, displacement, horsepower)[!train, ]
train.mpg01 <- mpg01[train]
set.seed(1)
pred.knn <- knn(train.X, test.X, train.mpg01, k = 1)
table(pred.knn, mpg01.test)
mean(pred.knn != mpg01.test)

pred.knn <- knn(train.X, test.X, train.mpg01, k = 10)
table(pred.knn, mpg01.test)
mean(pred.knn != mpg01.test)

pred.knn <- knn(train.X, test.X, train.mpg01, k = 100)
table(pred.knn, mpg01.test)
mean(pred.knn != mpg01.test)

#Exercise 15
Power <- function(){
  print(2^3)
}

Power2 <- function(x,a){
  print(x^a)
}
Power2(10,3)
Power2(8,17)
Power2(131,3)

Power3 <- function(x , a) {
  result <- x^a
  return(result)
}

Power3(10,3)

x <- 1:10
plot(x, Power3(x, 2), log = "xy", xlab = "Log of x", ylab = "Log of x^2", main = "Log of x^2 vs Log of x")

PlotPower <- function(x, a){
  plot(x, Power3(x,a))
}

PlotPower(1:10,2)

#Exercise 16

library(MASS)
library(class)
attach(Boston)
summary(Boston)

crim01 <- rep(0, length(crim))
crim01[crim > median(crim)] <- 1
Boston <- data.frame(Boston, crim01)

train <- 1:(length(crim) / 2)
test <- (length(crim) / 2 + 1):length(crim)
Boston.train <- Boston[train, ]
Boston.test <- Boston[test, ]
crim01.test <- crim01[test]

fit.glm <- glm(crim01 ~ . - crim01 - crim, data = Boston, family = binomial, subset = train)
summary(fit.glm)
probs <- predict(fit.glm, Boston.test, type = "response")
pred.glm <- rep(0, length(probs))
pred.glm[probs > 0.5] <- 1
CMlg<-(table(predicted = pred.glm, actual = crim01.test))
sprintf("LR: overall fraction correct= %10.6f", (CMlg[1, 1] + CMlg[2, 2])/sum(CMlg))
mean(pred.glm != crim01.test)

fit.glm <- glm(crim01 ~ . - crim01 - crim - chas - nox, data = Boston, family = binomial, subset = train)
probs <- predict(fit.glm, Boston.test, type = "response")
pred.glm <- rep(0, length(probs))
pred.glm[probs > 0.5] <- 1
table(pred.glm, crim01.test)
mean(pred.glm != crim01.test)

fit.lda <- lda(crim01 ~ . - crim01 - crim, data = Boston, subset = train)
pred.lda <- predict(fit.lda, Boston.test)
table(pred.lda$class, crim01.test)
mean(pred.lda$class != crim01.test)

fit.lda <- lda(crim01 ~ . - crim01 - crim - chas - nox, data = Boston, subset = train)
pred.lda <- predict(fit.lda, Boston.test)
table(pred.lda$class, crim01.test)
mean(pred.lda$class != crim01.test)

train.X <- cbind(zn, indus, chas, nox, rm, age, dis, rad, tax, ptratio, black, lstat, medv)[train, ]
test.X <- cbind(zn, indus, chas, nox, rm, age, dis, rad, tax, ptratio, black, lstat, medv)[test, ]
train.crim01 <- crim01[train]
set.seed(1)
pred.knn <- knn(train.X, test.X, train.crim01, k = 1)
table(pred.knn, crim01.test)
mean(pred.knn != crim01.test)

pred.knn <- knn(train.X, test.X, train.crim01, k = 10)
table(pred.knn, crim01.test)
mean(pred.knn != crim01.test)

pred.knn <- knn(train.X, test.X, train.crim01, k = 100)
table(pred.knn, crim01.test)
mean(pred.knn != crim01.test)

library(e1071)
nb.fit <- naiveBayes(crim01 ~ . - crim01 - crim, data = Boston , subset = train)
nb.fit
mean(Lag1[train][Direction[train] == "Down"])
sd(Lag1[train][Direction[train] == "Down"])

nb.class <- predict(nb.fit , Smarket.2005)
table(nb.class , Direction.2005)
mean(nb.class == Direction.2005)
nb.preds <- predict(nb.fit , Smarket.2005, type = "raw")
nb.preds[1:5, ]