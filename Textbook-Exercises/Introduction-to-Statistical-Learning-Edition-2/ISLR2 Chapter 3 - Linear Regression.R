library(ISLR2)
library(dplyr)
library(MASS)

df <- read.csv("C:\\your path\\Auto.csv", 
               na.strings = "?", stringsAsFactors = T)

dim(Auto)


plot(Auto$cylinders , Auto$mpg)
Auto$cylinders <- as.factor(Auto$cylinders)

attach(Auto)

plot(cylinders , mpg , col = "red", varwidth = T)
plot(cylinders , mpg , col = "red", varwidth = T,
     xlab = "cylinders", ylab = "MPG")

hist(mpg , col = 2, breaks = 15)

pairs(Auto)

plot(horsepower , mpg)
identify(horsepower , mpg , name)

########################################################################

college <- read.csv("C:\\your path\\college.csv", 
               na.strings = "?", stringsAsFactors = T)

rownames(college) <- college[, 1]
college <- college[, -1]

summary(college)
pairs(college[,1:10])
plot(college$Private, college$Outstate)

Elite <- rep("No", nrow(college))
Elite[college$Top10perc > 50] <- "Yes"
Elite <- as.factor(Elite)
college <- data.frame(college , Elite)
plot(college$Elite, college$Outstate)

par(mfrow = c(2, 2))
college[which.max(college$Top10perc), ]
acceptance_rate <- college$Accept/college$Apps
college[which.min(acceptance_rate), ]
college[which.max(acceptance_rate), ]  # what university has the most liberal acceptance rate


########################################################################

Boston <- ISLR2::Boston
?Boston
pairs(Boston)
plot(Boston$age, Boston$crim)
plot(Boston$dis, Boston$crim)
plot(Boston$rad, Boston$crim)
plot(Boston$tax, Boston$crim)

par(mfrow=c(1,3))
hist(Boston$crim[Boston$crim>1], breaks=25)
hist(Boston$tax, breaks=25)
hist(Boston$ptratio, breaks=25)
dim(subset(Boston, chas == 1))
median(Boston$ptratio)
t(subset(Boston, medv == min(Boston$medv)))
dim(subset(Boston, rm > 7))
dim(subset(Boston, rm > 8))
summary(subset(Boston, rm > 8))

########################################################################

# 3.6 Lab: Linear Regression

########################################################################

library(ISLR2)
library(MASS)
library(car)

?Boston
attach(Boston)

#Predicting medv based on lstat in Boston
# Simple Linear Regression OLS
lm.fit <- lm(medv ~ lstat)
lm.fit
summary(lm.fit)
names(lm.fit)
coef(lm.fit)

#confidence and prediction intervals
confint(lm.fit) #confidence interval
predict(lm.fit , data.frame(lstat = (c(5, 10, 15))),interval = "confidence")
predict(lm.fit , data.frame(lstat = (c(5, 10, 15))),interval = "prediction")

#plotting
plot(lstat , medv)
abline(lm.fit)
abline(lm.fit , lwd = 3)
abline(lm.fit , lwd = 3, col = "red")
plot(lstat , medv , col = "red")
plot(lstat , medv , pch = 20)
plot(lstat , medv , pch = "+")
plot (1:20 , 1:20, pch = 1:20)

par(mfrow = c(2, 2))
plot(lm.fit)

plot(predict(lm.fit), residuals(lm.fit))  #residuals plot
plot(predict(lm.fit), rstudent(lm.fit))   #stunderized residuals plot
plot(hatvalues(lm.fit))
which.max(hatvalues(lm.fit))

# Multiple Linear Regression OLS
lm.fit <- lm(medv ∼ lstat + age , data = Boston)
summary(lm.fit)

lm.fit <- lm(medv ∼ ., data = Boston)
summary(lm.fit)$sigma
vif(lm.fit)

lm.fit1 <- lm(medv ∼ . - age, data = Boston) #running this for all variables but 1
summary(lm.fit1)
lm.fit1 <- update(lm.fit , ∼ . - age)

summary(lm(medv ∼ lstat * age , data = Boston)) #including interaction terms

lm.fit2 <- lm(medv ∼ lstat + I(lstat^2)) #non-linear regression
summary(lm.fit2)

lm.fit <- lm(medv ∼ lstat)
anova(lm.fit , lm.fit2)

par(mfrow = c(2, 2))
plot(lm.fit)

lm.fit5 <- lm(medv ∼ poly(lstat , 5)) #running a 5th degree polynomial using a short-hand 
summary(lm.fit5)
summary(lm(medv ∼ log(rm), data = Boston))

head(Carseats)
attach(Carseats)

lm.fit <- lm(Sales ~ . + Income:Advertising + Price:Age, data = Carseats)
summary(lm.fit)
contrasts(ShelveLoc)

#Loading Libraries automatically
LoadLibraries <- function () {
library(ISLR2)
library(MASS)
print("The libraries have been loaded.")
}

LoadLibraries
LoadLibraries()
#Loading Libraries automatically

#APPLIED EXERCISE
#Exercise 8
df <- read.csv("C:\\Users\\nikos\\OneDrive\\Documents\\DOCUMENTS\\Lab documents\\Personal\\Study\\Books\\math\\Statistics\\Introduction to statistical learning\\datasets\\Auto.csv", 
               na.strings = "?", stringsAsFactors = T)
summary(df)
lm.fit <- lm(mpg ~ horsepower, data = df)
plot(df$horsepower, df$mpg)
abline(lm.fit)

summary(lm.fit)

mean(df$mpg)

predict(lm.fit, data.frame(horsepower=c(98)), interval="confidence")
predict(lm.fit, data.frame(horsepower=c(98)), interval="prediction")

par(mfrow=c(2,2))
plot(lm.fit)

#Exercise 9
pairs(Auto)
cor(subset(Auto, select=-name))
lm.fit <- lm(mpg ~ . -name, data = Auto)
summary(lm.fit)
par(mfrow=c(2,2))
plot(lm.fit)
par(mfrow=c(1,1))
plot(predict(lm.fit), rstudent(lm.fit))

lm.fit1 = lm(mpg~cylinders*displacement+displacement*weight, data = Auto)
summary(lm.fit1)

lm.fit2 = lm(mpg~log(weight)+sqrt(horsepower)+acceleration+I(acceleration^2), data = Auto)
summary(lm.fit2)
par(mfrow=c(2,2))
plot(lm.fit2)
par(mfrow=c(1,1))
plot(predict(lm.fit2), rstudent(lm.fit2))
lm.fit2<-lm(log(mpg)~cylinders+displacement+horsepower+weight+acceleration+year+origin,data=Auto)
summary(lm.fit2)
par(mfrow=c(2,2)) 
plot(lm.fit2)
par(mfrow=c(1,1))
plot(predict(lm.fit2),rstudent(lm.fit2))


#Exercise 10

lm.fit <- lm(Sales~ Price+Urban+US, data = Carseats)
summary(lm.fit)

#Y = 13.04 + -0.05*X1 + -0.02*X2 + 1.20*X3

lm.fit <- lm(Sales~ Price+US, data = Carseats)
summary(lm.fit)

confint(lm.fit)
plot(predict(lm.fit), rstudent(lm.fit))
par(mfrow=c(2,2))
plot(lm.fit2)

#Exercise 11
set.seed (1)
x <- rnorm (100)
y <- 2 * x + rnorm (100)
lm.fit <- lm(y∼x+0)
summary(lm.fit)

#Exercise 12
set.seed(1)
x = rnorm(100)
y = 2*x
lm.fit = lm(y~x+0)
lm.fit2 = lm(x~y+0)
summary(lm.fit)
summary(lm.fit2)

set.seed(1)
x <- rnorm(100)
y <- -sample(x, 100)
sum(x^2)
sum(y^2)
lm.fit <- lm(y~x+0)
lm.fit2 <- lm(x~y+0)
summary(lm.fit)
summary(lm.fit2)

#Exercise 13
set.seed(1)
x = rnorm(100)
eps = rnorm(100, 0, sqrt(0.25))
y = -1 + 0.5*x + eps
par(mfrow=c(1,1))
plot(x, y)
lm.fit <- lm(y~x)
plot(x,y)
abline(lm.fit)
abline(-1, 0.5, lwd=3, col=3)
legend(-1, legend = c("model fit", "pop. regression"), col=2:3, lwd=3)

lm.fit <- lm(y~x+I(x^2))
summary(lm.fit)

set.seed(1)
eps1 = rnorm(100, 0, 0.125)
x1 = rnorm(100)
y1 = -1 + 0.5*x1 + eps1
plot(x1, y1)
lm.fit1 = lm(y1~x1)
summary(lm.fit1)
abline(lm.fit1, lwd=3, col=2)
abline(-1, 0.5, lwd=3, col=3)
legend(-1, legend = c("model fit", "pop. regression"), col=2:3, lwd=3)

set.seed(1)
eps2 = rnorm(100, 0, 0.5)
x2 = rnorm(100)
y2 = -1 + 0.5*x2 + eps2
plot(x2, y2)
lm.fit2 = lm(y2~x2)
summary(lm.fit2)
abline(lm.fit2, lwd=3, col=2)
abline(-1, 0.5, lwd=3, col=3)
legend(-1, legend = c("model fit", "pop. regression"), col=2:3, lwd=3)
confint(lm.fit)

#Exercise 14
set.seed(1)
x1 = runif(100)
x2 = 0.5 * x1 + rnorm(100)/10
y = 2 + 2*x1 + 0.3*x2 + rnorm(100)

cor(x1,x2)
plot(x1,x2)
lm.fit = lm(y~x1+x2)
summary(lm.fit)
lm.fit = lm(y~x1)
summary(lm.fit)
lm.fit = lm(y~x2)
summary(lm.fit)

x1 = c(x1, 0.1)
x2 = c(x2, 0.8)
y = c(y, 6)
lm.fit1 = lm(y~x1+x2)
summary(lm.fit1)
lm.fit2 = lm(y~x1)
summary(lm.fit2)
lm.fit3 = lm(y~x2)
summary(lm.fit3)

par(mfrow=c(2,2))
plot(lm.fit1)
plot(lm.fit2)
plot(lm.fit3)
par(mfrow=c(1,1))
plot(predict(lm.fit1), rstudent(lm.fit1))
plot(predict(lm.fit1), rstudent(lm.fit2))
plot(predict(lm.fit1), rstudent(lm.fit3))

#Exercise 15
library(MASS)
library(ISLR2)
Boston$chas <- factor(Boston$chas, labels = c("N","Y"))
attach(Boston)
lm.zn = lm(crim~zn)
summary(lm.zn) # yes
lm.indus = lm(crim~indus)
summary(lm.indus) # yes
lm.chas = lm(crim~chas) 
summary(lm.chas) # no
lm.nox = lm(crim~nox)
summary(lm.nox) # yes
lm.rm = lm(crim~rm)
summary(lm.rm) # yes
lm.age = lm(crim~age)
summary(lm.age) # yes
lm.dis = lm(crim~dis)
summary(lm.dis) # yes
lm.rad = lm(crim~rad)
summary(lm.rad) # yes
lm.tax = lm(crim~tax)
summary(lm.tax) # yes
lm.ptratio = lm(crim~ptratio)
summary(lm.ptratio) # yes
lm.black = lm(crim~black)
summary(lm.black) # yes
lm.lstat = lm(crim~lstat)
summary(lm.lstat) # yes
lm.medv = lm(crim~medv)
summary(lm.medv) # yes

lm.all = lm(crim~., data=Boston)
summary(lm.all)


x = c(coefficients(lm.zn)[2],
      coefficients(lm.indus)[2],
      coefficients(lm.chas)[2],
      coefficients(lm.nox)[2],
      coefficients(lm.rm)[2],
      coefficients(lm.age)[2],
      coefficients(lm.dis)[2],
      coefficients(lm.rad)[2],
      coefficients(lm.tax)[2],
      coefficients(lm.ptratio)[2],
      coefficients(lm.black)[2],
      coefficients(lm.lstat)[2],
      coefficients(lm.medv)[2])
y = coefficients(lm.all)[2:14]
plot(x, y)

lm.zn = lm(crim~poly(zn,3))
summary(lm.zn) # 1, 2
