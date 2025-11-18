#6.5.1 Subset Selection Methods

library(ISLR2)
View(Hitters)
names(Hitters)
dim(Hitters)
sum(is.na(Hitters$Salary))

#omit na values
Hitters <- na.omit(Hitters)
dim(Hitters)

library(leaps)

#subset only includes 8 variables
regfit.full <- regsubsets(Salary ∼ ., Hitters)
summary(regfit.full)

#subset - nvmax includes n variables
regfit.full <- regsubsets(Salary ∼ ., data = Hitters ,
                          nvmax = 19)
reg.summary <- summary(regfit.full)
reg.summary
names(reg.summary)
reg.summary$rsq

#plotting the results of R^2, Cp, BIC
par(mfrow = c(2, 2))
plot(reg.summary$rss , xlab = "Number of Variables",
       ylab = "RSS", type = "l")
plot(reg.summary$adjr2 , xlab = "Number of Variables",
     ylab = "Adjusted RSq", type = "l")
which.max(reg.summary$adjr2)

#plotting the which.max adjr2
points (11, reg.summary$adjr2 [11] , col = "red", cex = 2,
        pch = 20)

#similarly we plot Cp and BIC
plot(reg.summary$cp, xlab = "Number of Variables",
     ylab = "Cp", type = "l")
which.min(reg.summary$cp)

points (10, reg.summary$cp[10] , col = "red", cex = 2,
          pch = 20)
which.min(reg.summary$bic)

plot(reg.summary$bic , xlab = "Number of Variables",
       ylab = "BIC", type = "l")
points (6, reg.summary$bic[6] , col = "red", cex = 2,
        pch = 20)

#build-in fuction for that
plot(regfit.full , scale = "r2")
plot(regfit.full , scale = "adjr2")
plot(regfit.full , scale = "Cp")
plot(regfit.full , scale = "bic")

coef(regfit.full , 6)

#using the forward / backwards method
regfit.fwd <- regsubsets(Salary ∼ ., data = Hitters ,
                         nvmax = 19, method = "forward")
summary(regfit.fwd)
regfit.bwd <- regsubsets(Salary ∼ ., data = Hitters ,
                           nvmax = 19, method = "backward")
summary(regfit.bwd)

coef(regfit.full , 7)
coef(regfit.fwd , 7)
coef(regfit.bwd , 7)

#using validation and cross-validation
set.seed (1)
train <- sample(c(TRUE , FALSE), nrow(Hitters),
                  replace = TRUE)
test <- (!train)
regfit.best <- regsubsets(Salary ∼ .,
                          data = Hitters[train , ], nvmax = 19)
test.mat <- model.matrix(Salary ∼ ., data = Hitters[test , ])

val.errors <- rep(NA, 19)
for (i in 1:19) {
         coefi <- coef(regfit.best , id = i)
         pred <- test.mat[, names(coefi)] %*% coefi
         val.errors[i] <- mean (( Hitters$Salary[test] - pred)^2)
}

val.errors

predict.regsubsets <- function(object , newdata , id, ...) {
        form <- as.formula(object$call [[2]])
        mat <- model.matrix(form , newdata)
        coefi <- coef(object , id = id)
        xvars <- names(coefi)
        mat[, xvars] %*% coefi
        }

regfit.best <- regsubsets(Salary ∼ ., data = Hitters ,
                          nvmax = 19)
coef(regfit.best , 7)

k <- 10
n <- nrow(Hitters)
set.seed (1)
folds <- sample(rep (1:k, length = n))
cv.errors <- matrix(NA, k, 19,
                      dimnames = list(NULL , paste (1:19)))

for (j in 1:k) {
        best.fit <- regsubsets(Salary ∼ .,
                                 data = Hitters[folds != j, ],
                                 nvmax = 19)
        for (i in 1:19) {
                pred <- predict(best.fit , Hitters[folds == j, ], id = i)
                cv.errors [j, i] <-
                        mean (( Hitters$Salary[folds == j] - pred)^2)
                }
}
mean.cv.errors <- apply(cv.errors , 2, mean)
mean.cv.errors

#ridge regression and lasso
View(Hitters)
names(Hitters)
dim(Hitters)
sum(is.na(Hitters$Salary))

#omit na values
Hitters <- na.omit(Hitters)
dim(Hitters)

x <- model.matrix(Salary ∼ ., Hitters)[, -1]
y <- Hitters$Salary

#ridge
library(glmnet)
grid <- 10^seq(10, -2, length = 100)
ridge.mod <- glmnet(x, y, alpha = 0, lambda = grid)
dim(coef(ridge.mod))

coef(ridge.mod)[, 50]
sqrt(sum(coef(ridge.mod)[-1, 50]^2))

coef(ridge.mod)[, 60]
sqrt(sum(coef(ridge.mod)[-1, 60]^2))

predict(ridge.mod , s = 50, type = "coefficients")[1:20, ]

#splitting dataset into training and test sets
set.seed (1)
train <- sample (1: nrow(x), nrow(x) / 2)
test <- (-train)
y.test <- y[test]

#Fit a ridge regression model on the training set, and evaluate its MSE on the test set
ridge.mod <- glmnet(x[train , ], y[train], alpha = 0,
                      lambda = grid , thresh = 1e-12)
ridge.pred <- predict(ridge.mod , s = 4, newx = x[test , ])
mean (( ridge.pred - y.test)^2)
#a model with just an intercept would show us this MSE
mean (( mean(y[train ]) - y.test)^2)

#Similar results if λ is a big number
ridge.pred <- predict(ridge.mod , s = 1e10 , newx = x[test , ])
mean (( ridge.pred - y.test)^2)

#Checking the difference between ridge and OLS
ridge.pred <- predict(ridge.mod , s = 0, newx = x[test , ],
                        exact = T, x = x[train , ], y = y[train ])
mean (( ridge.pred - y.test)^2)

lm(y ∼ x, subset = train)
predict(ridge.mod , s = 0, exact = T, type = "coefficients",
          x = x[train, ], y = y[train])[1:20, ]

#Finding the ideal λ based on cross-validation
set.seed (1)
cv.out <- cv.glmnet(x[train , ], y[train], alpha = 0)
plot(cv.out)
bestlam <- cv.out$lambda.min
bestlam #326.08 is the ideal λ size

#MSE with λ = 326.08
ridge.pred <- predict(ridge.mod , s = bestlam ,
                      newx = x[test , ])
mean (( ridge.pred - y.test)^2)        

#Fitting the model over the whole dataset
out <- glmnet(x, y, alpha = 0)
#note that none of the coefficients are 0 as ridge regression does not perform variable selection
predict(out , type = "coefficients", s = bestlam)[1:20, ]

#LASSO
lasso.mod <- glmnet(x[train , ], y[train], alpha = 1,
                    lambda = grid)
plot(lasso.mod)

#finding the test error
set.seed (1)
cv.out <- cv.glmnet(x[train , ], y[train], alpha = 1)
plot(cv.out)
bestlam <- cv.out$lambda.min
lasso.pred <- predict(lasso.mod , s = bestlam ,
                        newx = x[test , ])
mean (( lasso.pred - y.test)^2)

out <- glmnet(x, y, alpha = 1, lambda = grid)
lasso.coef <- predict(out , type = "coefficients",
                      s = bestlam)[1:20, ]
#As we can see, although the test MSE for ridge and lasso is similar, lasso should be preferred as it is more interpretable
#This means that by minimizing the coefficients, we understand our model better.
lasso.coef
lasso.coef[lasso.coef != 0]


#PCR and PLS regression
library(pls)
set.seed (2)

#Setting scale = TRUE has the effect of standardizing each predictor
#Setting validation = "CV" causes pcr() to compute the ten-fold cross-validation error for each possible value of M
pcr.fit <- pcr(Salary ∼ ., data = Hitters , scale = TRUE ,
                 validation = "CV")
summary(pcr.fit)

validationplot(pcr.fit , val.type = "MSEP")

#PCR on training data
set.seed (1)
pcr.fit <- pcr(Salary ∼ ., data = Hitters , subset = train ,
               scale = TRUE , validation = "CV")
validationplot(pcr.fit , val.type = "MSEP")
#testing it on the test data
pcr.pred <- predict(pcr.fit , x[test , ], ncomp = 5)
mean (( pcr.pred - y.test)^2)
#performing the same test on the whole dataset
pcr.fit <- pcr(y ∼ x, scale = TRUE , ncomp = 5)
summary(pcr.fit)

#performing PLS
set.seed (1)
pls.fit <- plsr(Salary ∼ ., data = Hitters , subset = train ,
                  scale = TRUE , validation = "CV")
summary(pls.fit)
validationplot(pls.fit , val.type = "MSEP")

pls.pred <- predict(pls.fit , x[test , ], ncomp = 1)
mean (( pls.pred - y.test)^2)

pls.fit <- plsr(Salary ∼ ., data = Hitters , scale = TRUE ,
                ncomp = 1)
summary(pls.fit)

#Exercise 8
set.seed(1)
X = rnorm(100)
eps = rnorm(100)

beta0 = 3
beta1 = 2
beta2 = -3
beta3 = 0.3
Y = beta0 + beta1 * X + beta2 * X^2 + beta3 * X^3 + eps

library(leaps)
data.full = data.frame(y = Y, x = X)
mod.full = regsubsets(y ~ poly(x, 10, raw = T), data = data.full, nvmax = 10)
mod.summary = summary(mod.full)
mod.summary

# Find the model size for best cp, BIC and adjr2
which.min(mod.summary$cp)
which.min(mod.summary$bic)
which.max(mod.summary$adjr2)

# Plot cp, BIC and adjr2
par(mfrow = c(1, 1))
plot(mod.summary$cp, xlab = "Subset Size", ylab = "Cp", pch = 20, type = "l")
points(3, mod.summary$cp[3], pch = 4, col = "red", lwd = 7)

plot(mod.summary$bic, xlab = "Subset Size", ylab = "BIC", pch = 20, type = "l")
points(3, mod.summary$bic[3], pch = 4, col = "red", lwd = 7)

plot(mod.summary$adjr2, xlab = "Subset Size", ylab = "Adjusted R2", pch = 20, 
     type = "l")
points(3, mod.summary$adjr2[3], pch = 4, col = "red", lwd = 7)

coefficients(mod.full, id = 3)

# (D)
mod.fwd = regsubsets(y ~ poly(x, 10, raw = T), data = data.full, nvmax = 10, 
                     method = "forward")
mod.bwd = regsubsets(y ~ poly(x, 10, raw = T), data = data.full, nvmax = 10, 
                     method = "backward")
fwd.summary = summary(mod.fwd)
bwd.summary = summary(mod.bwd)
which.min(fwd.summary$cp)
which.min(bwd.summary$cp)

which.min(fwd.summary$bic)
which.min(bwd.summary$bic)

which.min(fwd.summary$adjr2)
which.min(bwd.summary$adjr2)

# Plot the statistics
par(mfrow = c(3, 2))
plot(fwd.summary$cp, xlab = "Subset Size", ylab = "Forward Cp", pch = 20, type = "l")
points(3, fwd.summary$cp[3], pch = 4, col = "red", lwd = 7)
plot(bwd.summary$cp, xlab = "Subset Size", ylab = "Backward Cp", pch = 20, type = "l")
points(3, bwd.summary$cp[3], pch = 4, col = "red", lwd = 7)
plot(fwd.summary$bic, xlab = "Subset Size", ylab = "Forward BIC", pch = 20, 
     type = "l")
points(3, fwd.summary$bic[3], pch = 4, col = "red", lwd = 7)
plot(bwd.summary$bic, xlab = "Subset Size", ylab = "Backward BIC", pch = 20, 
     type = "l")
points(3, bwd.summary$bic[3], pch = 4, col = "red", lwd = 7)
plot(fwd.summary$adjr2, xlab = "Subset Size", ylab = "Forward Adjusted R2", 
     pch = 20, type = "l")
points(3, fwd.summary$adjr2[3], pch = 4, col = "red", lwd = 7)
plot(bwd.summary$adjr2, xlab = "Subset Size", ylab = "Backward Adjusted R2", 
     pch = 20, type = "l")
points(4, bwd.summary$adjr2[4], pch = 4, col = "red", lwd = 7)

coefficients(mod.fwd, id = 3)
coefficients(mod.bwd, id = 3)
coefficients(mod.fwd, id = 4)

# (E)

library(glmnet)

xmat = model.matrix(y ~ poly(x, 10, raw = T), data = data.full)[, -1]
mod.lasso = cv.glmnet(xmat, Y, alpha = 1)
best.lambda = mod.lasso$lambda.min
best.lambda
par(mfrow = c(1, 1))
plot(mod.lasso)

# Next fit the model on entire data using best lambda
best.model = glmnet(xmat, Y, alpha = 1)
predict(best.model, s = best.lambda, type = "coefficients")

# (F)

beta7 = 7
Y = beta0 + beta7 * X^7 + eps
# Predict using regsubsets
data.full = data.frame(y = Y, x = X)
mod.full = regsubsets(y ~ poly(x, 10, raw = T), data = data.full, nvmax = 10)
mod.summary = summary(mod.full)

# Find the model size for best cp, BIC and adjr2
which.min(mod.summary$cp)
which.min(mod.summary$bic)
which.min(mod.summary$adjr2)
coefficients(mod.full, id = 1)
coefficients(mod.full, id = 2)
coefficients(mod.full, id = 4)

xmat = model.matrix(y ~ poly(x, 10, raw = T), data = data.full)[, -1]
mod.lasso = cv.glmnet(xmat, Y, alpha = 1)
best.lambda = mod.lasso$lambda.min
best.lambda

best.model = glmnet(xmat, Y, alpha = 1)
predict(best.model, s = best.lambda, type = "coefficients")

#Exercise 9
# (A)
set.seed(11)
sum(is.na(College))

train.size = dim(College)[1] / 2
train = sample(1:dim(College)[1], train.size)
test = -train
College.train = College[train, ]
College.test = College[test, ]

# (B)

lm.fit = lm(Apps~., data=College.train)
lm.pred = predict(lm.fit, College.test)
mean((College.test[, "Apps"] - lm.pred)^2)

# (C)

train.mat = model.matrix(Apps~., data=College.train)
test.mat = model.matrix(Apps~., data=College.test)
grid = 10 ^ seq(4, -2, length=100)
mod.ridge = cv.glmnet(train.mat, College.train[, "Apps"], alpha=0, lambda=grid, thresh=1e-12)
lambda.best = mod.ridge$lambda.min
lambda.best

ridge.pred = predict(mod.ridge, newx=test.mat, s=lambda.best)
mean((College.test[, "Apps"] - ridge.pred)^2)

# (D)

mod.lasso = cv.glmnet(train.mat, College.train[, "Apps"], alpha=1, lambda=grid, thresh=1e-12)
lambda.best = mod.lasso$lambda.min
lambda.best

lasso.pred = predict(mod.lasso, newx=test.mat, s=lambda.best)
mean((College.test[, "Apps"] - lasso.pred)^2)

mod.lasso = glmnet(model.matrix(Apps~., data=College), College[, "Apps"], alpha=1)
predict(mod.lasso, s=lambda.best, type="coefficients")

# (E)

pcr.fit = pcr(Apps~., data=College.train, scale=T, validation="CV")
validationplot(pcr.fit, val.type="MSEP")

pcr.pred = predict(pcr.fit, College.test, ncomp=10)
mean((College.test[,"Apps"] - data.frame(pcr.pred))^2)

# (F)

pls.fit = plsr(Apps~., data=College.train, scale=T, validation="CV")
validationplot(pls.fit, val.type="MSEP")

pls.pred = predict(pls.fit, College.test, ncomp=10)
mean((College.test[, "Apps"] - data.frame(pls.pred))^2)

# (G)

test.avg = mean(College.test[, "Apps"])
lm.test.r2 = 1 - mean((College.test[, "Apps"] - lm.pred)^2) /mean((College.test[, "Apps"] - test.avg)^2)
ridge.test.r2 = 1 - mean((College.test[, "Apps"] - ridge.pred)^2) /mean((College.test[, "Apps"] - test.avg)^2)
lasso.test.r2 = 1 - mean((College.test[, "Apps"] - lasso.pred)^2) /mean((College.test[, "Apps"] - test.avg)^2)
pcr.test.r2 = 1 - mean((College.test[, "Apps"] - data.frame(pcr.pred))^2) /mean((College.test[, "Apps"] - test.avg)^2)
pls.test.r2 = 1 - mean((College.test[, "Apps"] - data.frame(pls.pred))^2) /mean((College.test[, "Apps"] - test.avg)^2)
barplot(c(lm.test.r2, ridge.test.r2, lasso.test.r2, pcr.test.r2, pls.test.r2), col="red", names.arg=c("OLS", "Ridge", "Lasso", "PCR", "PLS"), main="Test R-squared")

# Exercise 10 

set.seed(1)
p = 20
n = 1000
x = matrix(rnorm(n * p), n, p)
B = rnorm(p)
B[3] = 0
B[4] = 0
B[9] = 0
B[19] = 0
B[10] = 0
eps = rnorm(p)
y = x %*% B + eps

# (B)

train = sample(seq(1000), 100, replace = FALSE)
y.train = y[train, ]
y.test = y[-train, ]
x.train = x[train, ]
x.test = x[-train, ]

# (C)

library(leaps)
regfit.full = regsubsets(y ~ ., data = data.frame(x = x.train, y = y.train), 
                         nvmax = p)
val.errors = rep(NA, p)
x_cols = colnames(x, do.NULL = FALSE, prefix = "x.")
for (i in 1:p) {
        coefi = coef(regfit.full, id = i)
        pred = as.matrix(x.train[, x_cols %in% names(coefi)]) %*% coefi[names(coefi) %in% 
                                                                                x_cols]
        val.errors[i] = mean((y.train - pred)^2)
}
plot(val.errors, ylab = "Training MSE", pch = 19, type = "b")

# (D)

val.errors = rep(NA, p)
for (i in 1:p) {
        coefi = coef(regfit.full, id = i)
        pred = as.matrix(x.test[, x_cols %in% names(coefi)]) %*% coefi[names(coefi) %in% 
                                                                               x_cols]
        val.errors[i] = mean((y.test - pred)^2)
}
plot(val.errors, ylab = "Test MSE", pch = 19, type = "b")

# (E)

which.min(val.errors)

# (F)

coef(regfit.full, id = 16)

# (G)

val.errors = rep(NA, p)
a = rep(NA, p)
b = rep(NA, p)
for (i in 1:p) {
        coefi = coef(regfit.full, id = i)
        a[i] = length(coefi) - 1
        b[i] = sqrt(sum((B[x_cols %in% names(coefi)] - coefi[names(coefi) %in% x_cols])^2) + 
                            sum(B[!(x_cols %in% names(coefi))])^2)
}
plot(x = a, y = b, xlab = "number of coefficients", ylab = "error between estimated and true coefficients")
which.min(b)

# Exercise 11

set.seed(1)

#subset selection

predict.regsubsets = function(object, newdata, id, ...) {
        form = as.formula(object$call[[2]])
        mat = model.matrix(form, newdata)
        coefi = coef(object, id = id)
        mat[, names(coefi)] %*% coefi
}

k = 10
p = ncol(Boston) - 1
folds = sample(rep(1:k, length = nrow(Boston)))
cv.errors = matrix(NA, k, p)
for (i in 1:k) {
        best.fit = regsubsets(crim ~ ., data = Boston[folds != i, ], nvmax = p)
        for (j in 1:p) {
                pred = predict(best.fit, Boston[folds == i, ], id = j)
                cv.errors[i, j] = mean((Boston$crim[folds == i] - pred)^2)
        }
}
rmse.cv = sqrt(apply(cv.errors, 2, mean))
plot(rmse.cv, pch = 19, type = "b")

which.min(rmse.cv)
rmse.cv[which.min(rmse.cv)]

#Lasso regression
x = model.matrix(crim ~ . - 1, data = Boston)
y = Boston$crim
cv.lasso = cv.glmnet(x, y, type.measure = "mse")
plot(cv.lasso)

coef(cv.lasso)
sqrt(cv.lasso$cvm[cv.lasso$lambda == cv.lasso$lambda.1se])


#Ridge regression
x = model.matrix(crim ~ . - 1, data = Boston)
y = Boston$crim
cv.ridge = cv.glmnet(x, y, type.measure = "mse", alpha = 0)

#PCR
pcr.fit = pcr(crim ~ ., data = Boston, scale = TRUE, validation = "CV")
summary(pcr.fit)

plot(cv.ridge)

coef(cv.ridge)
sqrt(cv.ridge$cvm[cv.ridge$lambda == cv.ridge$lambda.1se])
