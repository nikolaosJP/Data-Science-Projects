#7.8 Lab: Non-linear Modeling
library(ISLR2)
attach(Wage)

#4 ways of fitting a non-linear bivariate model 
fit <- lm(wage ∼ poly(age , 4), data = Wage)
coef(summary(fit))

fit2 <- lm(wage ∼ poly(age , 4, raw = T), data = Wage)
coef(summary(fit2))

fit2a <- lm(wage ∼ age + I(age^2) + I(age^3) + I(age^4),
            data = Wage)
coef(fit2a)

fit2b <- lm(wage ∼ cbind(age , age^2, age^3, age^4),
            data = Wage)
coef(fit2b)


agelims <- range(age)
age.grid <- seq(from = agelims[1], to = agelims [2])
preds <- predict(fit , newdata = list(age = age.grid),
                   se = TRUE)
se.bands <- cbind(preds$fit + 2 * preds$se.fit ,
                    preds$fit - 2 * preds$se.fit)

#Plotting the data
par(mfrow = c(1, 2), mar = c(4.5 , 4.5, 1, 1),
      oma = c(0, 0, 4, 0))
plot(age , wage , xlim = agelims , cex = .5, col = "darkgrey")
title("Degree -4 Polynomial", outer = T)
lines(age.grid, preds$fit , lwd = 2, col = "blue")
matlines(age.grid , se.bands, lwd = 1, col = "blue", lty = 3)

preds2 <- predict(fit2 , newdata = list(age = age.grid),
                    se = TRUE)
max(abs(preds$fit - preds2$fit))

#Using Hypothesis testing (ANOVA) to examine which polynomial model is appropriate (to minimize model complexity)

fit.1 <- lm(wage ∼ age , data = Wage)
fit.2 <- lm(wage ∼ poly(age , 2), data = Wage)
fit.3 <- lm(wage ∼ poly(age , 3), data = Wage)
fit.4 <- lm(wage ∼ poly(age , 4), data = Wage)
fit.5 <- lm(wage ∼ poly(age , 5), data = Wage)
anova(fit.1, fit.2, fit.3, fit.4, fit.5)

#alternatively, we could have used this:
coef(summary(fit.5))

#ANOVA can also be used with multiple non-linear regression
fit.1 <- lm(wage ∼ education + age , data = Wage)
fit.2 <- lm(wage ∼ education + poly(age , 2), data = Wage)
fit.3 <- lm(wage ∼ education + poly(age , 3), data = Wage)
anova(fit.1, fit.2, fit.3)

#trying to predict whether someone earns > 250,000 USD (logistic regression)
# I(wage > 250) creates two dummy variables - 1 = TRUE and 0 = FALSE

fit <- glm(I(wage > 250) ∼ poly(age , 4), data = Wage ,
           family = binomial)

preds <- predict(fit , newdata = list(age = age.grid), se = T)

#Calculating the confidence intervals

pfit <- exp(preds$fit) / (1 + exp(preds$fit))
se.bands.logit <- cbind(preds$fit + 2 * preds$se.fit ,
                          preds$fit - 2 * preds$se.fit)
se.bands <- exp(se.bands.logit) / (1 + exp(se.bands.logit))

#alternatively we could have used
preds <- predict(fit , newdata = list(age = age.grid),
                 type = "response", se = T)

#Plotting the logistic regression
plot(age , I(wage > 250), xlim = agelims , type = "n",
       ylim = c(0, .2))
points(jitter(age), I(( wage > 250) / 5), cex = .5, pch = "|",
         col = "darkgrey")
lines(age.grid, pfit , lwd = 2, col = "blue")
matlines(age.grid , se.bands , lwd = 1, col = "blue", lty = 3)

#Fitting a step function
#The function cut() returns an ordered categorical variable;
#the lm() function then creates a set of dummy variables for use in the regression.
table(cut(age , 4))
fit <- lm(wage ∼ cut(age , 4), data = Wage)
coef(summary(fit))

#7.8.2 Splines

#The bs() function generates the entire matrix of basis functions for splines with the specified set of knots.

library(splines)
fit <- lm(wage ∼ bs(age , knots = c(25, 40, 60)), data = Wage)
pred <- predict(fit , newdata = list(age = age.grid), se = T)
plot(age , wage , col = "gray")
lines(age.grid, pred$fit , lwd = 2)
lines(age.grid , pred$fit + 2 * pred$se, lty = "dashed")
lines(age.grid , pred$fit - 2 * pred$se, lty = "dashed")

#In order to instead fit a natural spline, we use the ns() function.
fit2 <- lm(wage ∼ ns(age , df = 4), data = Wage)
pred2 <- predict(fit2 , newdata = list(age = age.grid),
                   se = T)
lines(age.grid , pred2$fit , col = "red", lwd = 2)

#plotting the spline
plot(age , wage , xlim = agelims , cex = .5, col = "darkgrey")
title("Smoothing Spline")
fit <- smooth.spline(age , wage , df = 16)
fit2 <- smooth.spline(age , wage , cv = TRUE)
lines(fit , col = "red", lwd = 2)
lines(fit2 , col = "blue", lwd = 2)
legend("topright", legend = c("16 DF", "6.8 DF"),
         col = c("red", "blue"), lty = 1, lwd = 2, cex = .8)

#In order to perform local regression, we use the loess() function.
plot(age , wage , xlim = agelims , cex = .5, col = "darkgrey")
title("Local Regression")
fit <- loess(wage ∼ age , span = .2, data = Wage)
fit2 <- loess(wage ∼ age , span = .5, data = Wage)
lines(age.grid, predict(fit , data.frame(age = age.grid)),
        col = "red", lwd = 2)
lines(age.grid, predict(fit2 , data.frame(age = age.grid)),
        col = "blue", lwd = 2)
legend("topright", legend = c("Span = 0.2", "Span = 0.5"),
         col = c("red", "blue"), lty = 1, lwd = 2, cex = .8)

#Here we have performed local linear regression using spans of 0.2 and 0.5:
#that is, each neighborhood consists of 20% or 50% of the observations.

#7.8.3 GAMs

gam1 <- lm(wage ∼ ns(year , 4) + ns(age , 5) + education ,
           data = Wage)

library(gam)

#The s() function, which is part of the gam library, is used to indicate that we would like to use a smoothing spline.

gam.m3 <- gam(wage ∼ s(year , 4) + s(age , 5) + education ,
                data = Wage)

#plotting the gams
par(mfrow = c(1, 3))
plot(gam.m3, se = TRUE , col = "blue")
plot.Gam(gam1 , se = TRUE , col = "red")

#Using ANOVA to check the performance of each model
gam.m1 <- gam(wage ∼ s(age , 5) + education , data = Wage)
gam.m2 <- gam(wage ∼ year + s(age , 5) + education ,
                data = Wage)
anova(gam.m1, gam.m2, gam.m3, test = "F")

#Using the predict() method for the training set
preds <- predict(gam.m2, newdata = Wage)

#alternatively we can use local regression in GAM
gam.lo <- gam(
  wage ∼ s(year , df = 4) + lo(age , span = 0.7) + education ,
  data = Wage)
plot.Gam(gam.lo, se = TRUE , col = "green")

gam.lo.i <- gam(wage ∼ lo(year , age , span = 0.5) + education ,
                data = Wage)

library(akima)
plot(gam.lo.i)

#Using a logistic regression in GAM
gam.lr <- gam(
  I(wage > 250) ∼ year + s(age , df = 5) + education ,
  family = binomial , data = Wage)
par(mfrow = c(1, 3))
plot(gam.lr, se = T, col = "green")

#As we can see, there are no high earners in the < HS Grad category
table(education , I(wage > 250))

#So we create another model, excluding this category
gam.lr.s <- gam(
  I(wage > 250) ∼ year + s(age , df = 5) + education ,
  family = binomial , data = Wage ,
  subset = (education != "1. < HS Grad"))

plot(gam.lr.s, se = T, col = "green")

#Applied, Chapter 7

#Exercise 6 (A)

set.seed(1)
library(ISLR2)
library(boot)

all.deltas = rep(NA, 10)

for (i in 1:10) {
  glm.fit = glm(wage~poly(age, i), data=Wage)
  all.deltas[i] = cv.glm(Wage, glm.fit, K=10)$delta[2]
}

plot(1:10, all.deltas, xlab="Degree", ylab="CV error", type="l", pch=20, lwd=2, ylim=c(1590, 1700))
min.point = min(all.deltas)
sd.points = sd(all.deltas)
abline(h=min.point + 0.2 * sd.points, col="red", lty="dashed")
abline(h=min.point - 0.2 * sd.points, col="red", lty="dashed")
legend("topright", "0.2-standard deviation lines", lty="dashed", col="red")

#using anova to find the best d degree
fit.1 = lm(wage~poly(age, 1), data=Wage)
fit.2 = lm(wage~poly(age, 2), data=Wage)
fit.3 = lm(wage~poly(age, 3), data=Wage)
fit.4 = lm(wage~poly(age, 4), data=Wage)
fit.5 = lm(wage~poly(age, 5), data=Wage)
fit.6 = lm(wage~poly(age, 6), data=Wage)
fit.7 = lm(wage~poly(age, 7), data=Wage)
fit.8 = lm(wage~poly(age, 8), data=Wage)
fit.9 = lm(wage~poly(age, 9), data=Wage)
fit.10 = lm(wage~poly(age, 10), data=Wage)
anova(fit.1, fit.2, fit.3, fit.4, fit.5, fit.6, fit.7, fit.8, fit.9, fit.10)

#plotting the polynomial prediction to our data
plot(wage~age, data=Wage, col="darkgrey")
agelims = range(Wage$age)
age.grid = seq(from=agelims[1], to=agelims[2])
lm.fit = lm(wage~poly(age, 3), data=Wage)
lm.pred = predict(lm.fit, data.frame(age=age.grid))
lines(age.grid, lm.pred, col="blue", lwd=2)

##Exercise 6 (B) - Predicting Wage based on Age using a step function

all.cvs = rep(NA, 10)

for (i in 2:10) {
  Wage$age.cut = cut(Wage$age, i)
  lm.fit = glm(wage~age.cut, data=Wage)
  all.cvs[i] = cv.glm(Wage, lm.fit, K=10)$delta[2]}

plot(2:10, all.cvs[-1], xlab="Number of cuts", ylab="CV error", type="l", pch=20, lwd=2)

#8 cuts provide the least CV error, so we begin training the data using this model

lm.fit = glm(wage~cut(age, 8), data=Wage)
agelims = range(Wage$age)
age.grid = seq(from=agelims[1], to=agelims[2])
lm.pred = predict(lm.fit, data.frame(age=age.grid))
plot(wage~age, data=Wage, col="darkgrey")
lines(age.grid, lm.pred, col="red", lwd=2)

##Exercise 7 - Exploring the relationship between Wage and other variables

set.seed(1)
summary(Wage$maritl)
summary(Wage$jobclass)

par(mfrow = c(1, 2))
plot(Wage$maritl, Wage$wage)
plot(Wage$jobclass, Wage$wage)

#Polynomial
fit = lm(wage ~ maritl, data = Wage)
deviance(fit)

fit = lm(wage ~ jobclass, data = Wage)
deviance(fit)

fit = lm(wage ~ maritl + jobclass, data = Wage)
deviance(fit)

#Splines
#Unable to fit splines on categorical variables.

#GAMS
library(gam)

fit = gam(wage ~ maritl + jobclass + s(age, 4), data = Wage)
deviance(fit)

#Exercise 8 - Performing non-linear analysis on AUTO data

library(ISLR2)
set.seed(1)
pairs(Auto)

#Polynomial

rss = rep(NA, 10)
fits = list()
for (d in 1:10) {
  fits[[d]] = lm(mpg ~ poly(displacement, d), data = Auto)
  rss[d] = deviance(fits[[d]])
}
rss

anova(fits[[1]], fits[[2]], fits[[3]], fits[[4]])

library(glmnet)
library(boot)

cv.errs = rep(NA, 15)
for (d in 1:15) {
  fit = glm(mpg ~ poly(displacement, d), data = Auto)
  cv.errs[d] = cv.glm(Auto, fit, K = 10)$delta[2]
}
which.min(cv.errs)

#Step-function
cv.errs = rep(NA, 10)
for (c in 2:10) {
  Auto$dis.cut = cut(Auto$displacement, c)
  fit = glm(mpg ~ dis.cut, data = Auto)
  cv.errs[c] = cv.glm(Auto, fit, K = 10)$delta[2]
}
which.min(cv.errs)

#Splines
library(splines)

cv.errs = rep(NA, 10)
for (df in 3:10) {
  fit = glm(mpg ~ ns(displacement, df = df), data = Auto)
  cv.errs[df] = cv.glm(Auto, fit, K = 10)$delta[2]
}
which.min(cv.errs)

#GAMs
library(gam)

fit = gam(mpg ~ s(displacement, 4) + s(horsepower, 4), data = Auto)
summary(fit)

#Exercise 9 - Predicting NOX from DIS using Boston data
set.seed(1)
library(MASS)
attach(Boston)

# Exercise 9 (A) - fitting a cubic polynomial regression

lm.fit = lm(nox ~ poly(dis, 3), data = Boston)
summary(lm.fit)

dislim = range(dis)
dis.grid = seq(from = dislim[1], to = dislim[2], by = 0.1)
lm.pred = predict(lm.fit, list(dis = dis.grid))
plot(nox ~ dis, data = Boston, col = "darkgrey")
lines(dis.grid, lm.pred, col = "red", lwd = 2)

# Exercise 9 (B) - Report the associated residual sum of squares of 10 degree polynomial

all.rss = rep(NA, 10)
for (i in 1:10) {
  lm.fit = lm(nox ~ poly(dis, i), data = Boston)
  all.rss[i] = sum(lm.fit$residuals^2)
}

all.rss
which.min(all.rss)

# Exercise 9 (C) - Performing cross-validation on a difference approach
library(boot)

all.deltas = rep(NA, 10)
for (i in 1:10) {
  glm.fit = glm(nox ~ poly(dis, i), data = Boston)
  all.deltas[i] = cv.glm(Boston, glm.fit, K = 10)$delta[2]
}
plot(1:10, all.deltas, xlab = "Degree", ylab = "CV error", type = "l", pch = 20, 
     lwd = 2)

# Exercise 9 (D) - Using bs() function to perform a spline regression

library(splines)
sp.fit = lm(nox ~ bs(dis, df = 4, knots = c(4, 7, 11)), data = Boston)
summary(sp.fit)

sp.pred = predict(sp.fit, list(dis = dis.grid))
plot(nox ~ dis, data = Boston, col = "darkgrey")
lines(dis.grid, sp.pred, col = "red", lwd = 2)

# Exercise 9 (E) - Using bs() function to perform a spline regression but on a range of DF

all.cv = rep(NA, 16)
for (i in 3:16) {
  lm.fit = lm(nox ~ bs(dis, df = i), data = Boston)
  all.cv[i] = sum(lm.fit$residuals^2)
}
all.cv[-c(1, 2)]

# Exercise 9 (F) - Using cross validation to select the best DF for a spline regression

all.cv = rep(NA, 16)
for (i in 3:16) {
  lm.fit = glm(nox ~ bs(dis, df = i), data = Boston)
  all.cv[i] = cv.glm(Boston, lm.fit, K = 10)$delta[2]
}

plot(3:16, all.cv[-c(1, 2)], lwd = 2, type = "l", xlab = "df", ylab = "CV error")

# Exercise 10 (A) - Forward StepWise selection for predicting out-of-state tuition

set.seed(1)
library(ISLR2)
library(leaps)
attach(College)

train = sample(length(Outstate), length(Outstate)/2)
test = -train
College.train = College[train, ]
College.test = College[test, ]

reg.fit = regsubsets(Outstate ~ ., data = College.train, nvmax = 17, method = "forward")
reg.summary = summary(reg.fit)

par(mfrow = c(1, 3))
plot(reg.summary$cp, xlab = "Number of Variables", ylab = "Cp", type = "l")
min.cp = min(reg.summary$cp)
std.cp = sd(reg.summary$cp)
abline(h = min.cp + 0.2 * std.cp, col = "red", lty = 2)
abline(h = min.cp - 0.2 * std.cp, col = "red", lty = 2)

plot(reg.summary$bic, xlab = "Number of Variables", ylab = "BIC", type = "l")
min.bic = min(reg.summary$bic)
std.bic = sd(reg.summary$bic)
abline(h = min.bic + 0.2 * std.bic, col = "red", lty = 2)
abline(h = min.bic - 0.2 * std.bic, col = "red", lty = 2)

plot(reg.summary$adjr2, xlab = "Number of Variables", ylab = "Adjusted R2", 
     type = "l", ylim = c(0.4, 0.84))
max.adjr2 = max(reg.summary$adjr2)
std.adjr2 = sd(reg.summary$adjr2)
abline(h = max.adjr2 + 0.2 * std.adjr2, col = "red", lty = 2)
abline(h = max.adjr2 - 0.2 * std.adjr2, col = "red", lty = 2)

reg.fit = regsubsets(Outstate ~ ., data = College, method = "forward")
coefi = coef(reg.fit, id = 6)
names(coefi)

# Exercise 10 (B) - Fitting GAM for predicting out-of-state tuition

library(gam)

gam.fit = gam(Outstate ~ Private + s(Room.Board, df = 2) + s(PhD, df = 2) + 
                s(perc.alumni, df = 2) + s(Expend, df = 5) + s(Grad.Rate, df = 2), data = College.train)
par(mfrow = c(2, 3))
plot(gam.fit, se = T, col = "blue")

# Exercise 10 (C) - Evaluating the model on the test set

gam.pred = predict(gam.fit, College.test)
gam.err = mean((College.test$Outstate - gam.pred)^2)
gam.err

gam.tss = mean((College.test$Outstate - mean(College.test$Outstate))^2)
test.rss = 1 - gam.err/gam.tss
test.rss

# Exercise 10 (D) - Which variables have a non-linear relationship with NOX?

summary(gam.fit)

# Exercise 11 (A) - Generating a response Y and predictors X1 and X2

set.seed(1)
X1 = rnorm(100)
X2 = rnorm(100)
eps = rnorm(100, sd = 0.1)
Y = -2.1 + 1.3 * X1 + 0.54 * X2 + eps

# Exercise 11 (B) - B1 takes a value of our choice

beta0 = rep(NA, 1000)
beta1 = rep(NA, 1000)
beta2 = rep(NA, 1000)
beta1[1] = 10

# Exercise 11 (B-E) - Fitting the model

for (i in 1:1000) {
  a = Y - beta1[i] * X1
  beta2[i] = lm(a ~ X2)$coef[2]
  a = Y - beta2[i] * X2
  lm.fit = lm(a ~ X1)
  if (i < 1000) {
    beta1[i + 1] = lm.fit$coef[2]
  }
  beta0[i] = lm.fit$coef[1]
}
plot(1:1000, beta0, type = "l", xlab = "iteration", ylab = "betas", ylim = c(-2.2, 
                                                                             1.6), col = "green")
lines(1:1000, beta1, col = "red")
lines(1:1000, beta2, col = "blue")
legend("center", c("beta0", "beta1", "beta2"), lty = 1, col = c("green", "red", 
                                                                "blue"))

# Exercise 11 (F) - Comparing the results with simply performing a multiple linear regression

lm.fit = lm(Y ~ X1 + X2)
plot(1:1000, beta0, type = "l", xlab = "iteration", ylab = "betas", ylim = c(-2.2, 
                                                                             1.6), col = "green")
lines(1:1000, beta1, col = "red")
lines(1:1000, beta2, col = "blue")
abline(h = lm.fit$coef[1], lty = "dashed", lwd = 3, col = rgb(0, 0, 0, alpha = 0.4))
abline(h = lm.fit$coef[2], lty = "dashed", lwd = 3, col = rgb(0, 0, 0, alpha = 0.4))
abline(h = lm.fit$coef[3], lty = "dashed", lwd = 3, col = rgb(0, 0, 0, alpha = 0.4))
legend("center", c("beta0", "beta1", "beta2", "multiple regression"), lty = c(1, 
                                                                              1, 1, 2), col = c("green", "red", "blue", "black"))

#Exercise 12 - How many simple OLS iterations does it take to approximate multiple OLS

set.seed(1)
p = 100
n = 1000
x = matrix(ncol = p, nrow = n)
coefi = rep(NA, p)
for (i in 1:p) {
  x[, i] = rnorm(n)
  coefi[i] = rnorm(1) * 100
}
y = x %*% coefi + rnorm(n)

beta = rep(0, p)
max_iterations = 1000
errors = rep(NA, max_iterations + 1)
iter = 2
errors[1] = Inf
errors[2] = sum((y - x %*% beta)^2)
threshold = 1e-04
while (iter < max_iterations && errors[iter - 1] - errors[iter] > threshold) {
  for (i in 1:p) {
    a = y - x %*% beta + beta[i] * x[, i]
    beta[i] = lm(a ~ x[, i])$coef[2]
  }
  iter = iter + 1
  errors[iter] = sum((y - x %*% beta)^2)
  print(c(iter - 2, errors[iter - 1], errors[iter]))
}

plot(1:11, errors[3:13])
