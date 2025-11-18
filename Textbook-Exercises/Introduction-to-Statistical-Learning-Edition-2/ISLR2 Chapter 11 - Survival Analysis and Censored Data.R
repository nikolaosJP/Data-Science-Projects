#11.8 Lab: Survival Analysis

#11.8.1 Brain Cancer Data

#Data Exploration
library(ISLR2)

names(BrainCancer)

attach(BrainCancer)

table(sex)
table(diagnosis)
table(status)

#Creating a Kaplan-Meier survival curve
library(survival)

fit.surv <- survfit(Surv(time, status) ∼ 1)
plot(fit.surv , xlab = "Months",
       ylab = "Estimated Probability of Survival")

#Kaplan-Meier SC; this time stratified by sex
fit.sex <- survfit(Surv(time, status) ∼ sex)
plot(fit.sex , xlab = "Months",
       ylab = "Estimated Probability of Survival", col = c(2 ,4))
legend("bottomleft", levels(sex), col = c(2,4), lty = 1)

#Performing a log-rank test to compare the survival of males to females

logrank.test <- survdiff(Surv(time, status) ∼ sex)
logrank.test

#The resulting p-value is 0.23, indicating no evidence of a difference in survival between the two sexes.

#Next, we fit a Cox proportional hazards model

fit.cox <- coxph(Surv(time, status) ∼ sex)
summary(fit.cox)

#Making use of additional variables
fit.all <- coxph(
  Surv(time, status) ∼ sex + diagnosis + loc + ki + gtv +
    stereo)

fit.all

#We plot survival curves for each diagnosis category, adjusting for the other predictors

modaldata <- data.frame(
  diagnosis = levels(diagnosis),
  sex = rep("Female", 4),
  loc = rep("Supratentorial", 4),
  ki = rep(mean(ki), 4),
  gtv = rep(mean(gtv), 4),
  stereo = rep("SRT", 4)
)

survplots <- survfit(fit.all, newdata = modaldata)
plot(survplots , xlab = "Months",
       ylab = "Survival Probability", col = 2:5)
legend("bottomleft", levels(diagnosis), col = 2:5, lty = 1)

#11.8.2 Publication Data
#Plotting the Kaplan-Meier curves stratified on the posres variable, which records whether the study had a positive or negative result.

fit.posres <- survfit(
  Surv(time, status) ∼ posres , data = Publication
)
plot(fit.posres , xlab = "Months",
       ylab = "Probability of Not Being Published", col = 3:4)
legend("topright", c("Negative Result", "Positive Result"),
         col = 3:4, lty = 1)

#Fitting Cox’s proportional hazards model
fit.pub <- coxph(Surv(time, status) ∼ posres ,
                 data = Publication)
fit.pub

#Fitting a log-rank test
logrank.test <- survdiff(Surv(time, status) ∼ posres ,
                         data = Publication)

logrank.test

#Including additional variables in the model (Cox's)
fit.pub2 <- coxph(Surv(time, status) ∼ . - mech,
                  data = Publication)

fit.pub2

#11.8.3 Call Center Data

set.seed (4)
N <- 2000
Operators <- sample (5:15 , N, replace = T)
Center <- sample(c("A", "B", "C"), N, replace = T)
Time <- sample(c("Morn.", "After.", "Even."), N, replace = T)
X <- model.matrix( ∼ Operators + Center + Time)[, -1]
X[1:5, ]

#Specifying the coefficients and the hazard function
true.beta <- c(0.04 , -0.3, 0, 0.2, -0.2)
h.fn <- function(x) return (0.00001 * x)

#Fitting a Cov's proportional hazard model with a maximum waiting time of 1000 seconds
library(coxed)
queuing <- sim.survdata(N = N, T = 1000, X = X,
                          beta = true.beta , hazard.fun = h.fn)
names(queuing)

head(queuing$data)
mean(queuing$data$failed)

#Fitting a Kaplan-Meier survival curve; stratified by Center
par(mfrow = c(1, 2))
fit.Center <- survfit(Surv(y, failed) ∼ Center ,
                        data = queuing$data)

plot(fit.Center , xlab = "Seconds",
       ylab = "Probability of Still Being on Hold",
       col = c(2, 4, 5))
legend("topright",
         c("Call Center A", "Call Center B", "Call Center C"),
         col = c(2, 4, 5), lty = 1)

#Fitting a Kaplan-Meier survival curve; stratified by Time
fit.Time <- survfit(Surv(y, failed) ∼ Time ,
                    data = queuing$data)
plot(fit.Time , xlab = "Seconds",
       ylab = "Probability of Still Being on Hold",
       col = c(2, 4, 5))
legend("topright", c("Morning", "Afternoon", "Evening"),
         col = c(5, 2, 4), lty = 1)

#Examining whether the differences are statistically significant with log-rank test
survdiff(Surv(y, failed) ∼ Center , data = queuing$data)
survdiff(Surv(y, failed) ∼ Time , data = queuing$data)

#Fitting a Cox’s proportional hazard model
fit.queuing <- coxph(Surv(y, failed) ∼ .,
                     data = queuing$data)
fit.queuing
