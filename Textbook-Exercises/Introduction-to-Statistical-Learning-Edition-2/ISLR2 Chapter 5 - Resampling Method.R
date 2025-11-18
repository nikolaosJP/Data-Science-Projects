#5.3.1 The Validation Set Approach
library(ISLR2)
set.seed (1)
train <- sample (392 , 196)

#fitting an OLS regression using the train set
lm.fit <- lm(mpg ~ horsepower , data = Auto , subset = train)
attach(Auto)
mean (( mpg - predict(lm.fit , Auto))[-train ]^2) #23.27

#calculating the MSE for the polynomials
lm.fit2 <- lm(mpg ~ poly(horsepower , 2), data = Auto ,
              subset = train)
mean (( mpg - predict(lm.fit2 , Auto))[-train ]^2) #18.72

lm.fit3 <- lm(mpg ~ poly(horsepower , 3), data = Auto ,
              subset = train)
mean (( mpg - predict(lm.fit3 , Auto))[-train ]^2) #18.79

#Calculating the MSE using a different training set
set.seed (2)
train <- sample (392 , 196)
lm.fit <- lm(mpg ~ horsepower , subset = train)
mean (( mpg - predict(lm.fit , Auto))[-train ]^2) #25.72

lm.fit2 <- lm(mpg ~ poly(horsepower , 2), data = Auto ,
                subset = train)
mean (( mpg - predict(lm.fit2 , Auto))[-train ]^2) #20.43

lm.fit3 <- lm(mpg ~ poly(horsepower , 3), data = Auto ,
                subset = train)
mean (( mpg - predict(lm.fit3 , Auto))[-train ]^2) #20.38

#Results: Consistent findings in that quadratic provide better than simple OLS 
#but different data cuts provide different results

#5.3.2 Leave-One-Out Cross-Validation
library(boot)
glm.fit <- glm(mpg ~ horsepower , data = Auto)
cv.err <- cv.glm(Auto , glm.fit)
cv.err$delta

cv.error <- rep(0, 10)
for (i in 1:10) {
glm.fit <- glm(mpg ~ poly(horsepower , i), data = Auto) 
cv.error[i] <- cv.glm(Auto , glm.fit)$delta [1] }
cv.error

#5.3.3 k-Fold Cross-Validation
set.seed (17)
cv.error.10 <- rep(0, 10)
for (i in 1:10) {
glm.fit <- glm(mpg ~ poly(horsepower , i), data = Auto)
cv.error.10[i] <- cv.glm(Auto , glm.fit , K = 10)$delta [1]}
cv.error.10

#5.3.4 The Bootstrap
alpha.fn <- function(data , index) {
X <- data$X[index]
Y <- data$Y[index]
(var(Y) - cov(X, Y)) / (var(X) + var(Y) - 2 * cov(X, Y))
}

alpha.fn(Portfolio , 1:100)

set.seed (7)
alpha.fn(Portfolio , sample (100 , 100, replace = T))

boot(Portfolio , alpha.fn, R = 1000)

boot.fn <- function(data , index){coef(lm(mpg ~ horsepower , data = data , subset = index))}

boot.fn(Auto , 1:392)

set.seed (1)
boot.fn(Auto , sample (392 , 392, replace = T))

boot(Auto , boot.fn, 1000)

summary(lm(mpg ~ horsepower , data = Auto))$coef

boot.fn <- function(data , index){
  coef(
    lm(mpg ~ horsepower + I(horsepower ^2),
       data = data , subset = index)
  )}

set.seed (1)
boot(Auto , boot.fn, 1000)

summary(
  lm(mpg ~ horsepower + I(horsepower ^2), data = Auto)
)$coef


#Applied Exercises
library(ISLR)
library(boot)

#Exercise 5 (a):
set.seed(0)
glm.fit <- glm(default ~ income + balance, data = Default, family = binomial)
#Exercise 5 (b):
FiveB = function() {
  # i.
  train = sample(dim(Default)[1], dim(Default)[1]/2)
  # ii.
  glm.fit = glm(default ~ income + balance, data = Default, family = binomial, 
                subset = train)
  # iii.
  glm.pred = rep("No", dim(Default)[1]/2)
  glm.probs = predict(glm.fit, Default[-train, ], type = "response")
  glm.pred[glm.probs > 0.5] = "Yes"
  # iv.
  return(mean(glm.pred != Default[-train, ]$default))
}
FiveB()

#Exercise 5 (c):
FiveB()
FiveB()
FiveB()

#Exercise 5 (d):
train = sample(dim(Default)[1], dim(Default)[1]/2)
glm.fit = glm(default ~ income + balance + student, data = Default, family = binomial, 
              subset = train)
glm.pred = rep("No", dim(Default)[1]/2)
glm.probs = predict(glm.fit, Default[-train, ], type = "response")
glm.pred[glm.probs > 0.5] = "Yes"
mean(glm.pred != Default[-train, ]$default)

#Exercise 6 (a): 
library(ISLR)
summary(Default)
attach(Default)

set.seed(1)
glm.fit = glm(default ~ income + balance, data = Default, family = binomial)
summary(glm.fit)

#Exercise 6 (b): 
boot.fn = function(data, index) return(coef(glm(default ~ income + balance, 
                                                data = data, family = binomial, subset = index)))
#Exercise 6 (c): 
library(boot)
boot(Default, boot.fn, 50)


#Exercise 7 (a):
library(ISLR)
summary(Weekly)
set.seed(1)
attach(Weekly)

glm.fit = glm(Direction ~ Lag1 + Lag2, data = Weekly, family = binomial)
summary(glm.fit)

#Exercise 7 (b):
glm.fit = glm(Direction ~ Lag1 + Lag2, data = Weekly[-1, ], family = binomial)
summary(glm.fit)

#Exercise 7 (c):
predict.glm(glm.fit, Weekly[1, ], type = "response") > 0.5

#Exercise 7 (d):
count = rep(0, dim(Weekly)[1])
for (i in 1:(dim(Weekly)[1])) {
  glm.fit = glm(Direction ~ Lag1 + Lag2, data = Weekly[-i, ], family = binomial)
  is_up = predict.glm(glm.fit, Weekly[i, ], type = "response") > 0.5
  is_true_up = Weekly[i, ]$Direction == "Up"
  if (is_up != is_true_up) 
    count[i] = 1
}
sum(count)

#Exercise 7 (e):
mean(count)

#Exercise 8 (a):
set.seed(1)
y = rnorm(100)
x = rnorm(100)
y = x - 2 * x^2 + rnorm(100)

#Exercise 8 (b):
plot(x,y)

#Exercise 8 (c):
library(boot)
Data = data.frame(x, y)
set.seed(1)
# i.
glm.fit = glm(y ~ x)
cv.glm(Data, glm.fit)$delta
# ii.
glm.fit = glm(y ~ poly(x, 2))
cv.glm(Data, glm.fit)$delta
# iii.
glm.fit = glm(y ~ poly(x, 3))
cv.glm(Data, glm.fit)$delta
# iv.
glm.fit = glm(y ~ poly(x, 4))
cv.glm(Data, glm.fit)$delta

#Exercise 8 (d):
set.seed(2)
# i.
glm.fit = glm(y ~ x)
cv.glm(Data, glm.fit)$delta
# ii.
glm.fit = glm(y ~ poly(x, 2))
cv.glm(Data, glm.fit)$delta
# iii.
glm.fit = glm(y ~ poly(x, 3))
cv.glm(Data, glm.fit)$delta
# iv.
glm.fit = glm(y ~ poly(x, 4))
cv.glm(Data, glm.fit)$delta

#Exercise 8 (e):
#The quadratic polynomial had the lowest LOOCV test error

#Exercise 8 (f):
summary(glm.fit)


#Exercise 9 (a):
library(MASS)
summary(Boston)
set.seed(1)
attach(Boston)

medv.mean = mean(medv)
medv.mean

#Exercise 9 (b):
medv.err = sd(medv)/sqrt(length(medv))
medv.err

#Exercise 9 (c):
boot.fn = function(data, index) return(mean(data[index]))
library(boot)
bstrap = boot(medv, boot.fn, 1000)
bstrap

#Exercise 9 (d):
t.test(medv)
c(bstrap$t0 - 2 * 0.4119, bstrap$t0 + 2 * 0.4119)

#Exercise 9 (e):
medv.med = median(medv)
medv.med

#Exercise 9 (f):
boot.fn = function(data, index) return(median(data[index]))
boot(medv, boot.fn, 1000)

#Exercise 9 (g):
medv.tenth = quantile(medv, c(0.1))
medv.tenth

#Exercise 9 (h):
boot.fn = function(data, index) return(quantile(data[index], c(0.1)))
boot(medv, boot.fn, 1000)
