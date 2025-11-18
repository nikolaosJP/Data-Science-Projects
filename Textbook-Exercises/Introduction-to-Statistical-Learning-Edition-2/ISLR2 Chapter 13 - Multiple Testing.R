#13.6 Lab: Multiple Testing
#13.6.1 Review of Hypothesis Tests

#Creation of a data set
set.seed (6)
x <- matrix(rnorm (10 * 100) , 10, 100)
x[, 1:50] <- x[, 1:50] + 0.5

#The t.test() function can perform a one-sample or a two-sample t-test. By default, a one-sample test is performed.

t.test(x[, 1], mu = 0)

#We now test H0j : μj = 0 for j = 1, . . . , 100.

p.values <- rep(0, 100)

for (i in 1:100) {
  p.values[i] <- t.test(x[, i], mu = 0)$p.value}

decision <- rep("Do not reject H0", 100)
decision[p.values <= .05] <- "Reject H0"

table(decision ,
      c(rep("H0 is False", 50), rep("H0 is True", 50)))

#W = 40, U = 47, S = 10, and V = 3

#Changing the structure of our data

x <- matrix(rnorm (10 * 100) , 10, 100)
x[, 1:50] <- x[, 1:50] + 1
for (i in 1:100){
  p.values[i] <- t.test(x[, i], mu = 0)$p.value}

decision <- rep("Do not reject H0", 100)
decision[p.values <= .05] <- "Reject H0"
table(decision ,
        c(rep("H0 is False", 50), rep("H0 is True", 50)))

#W = 9, U = 49, S = 41, and V = 1

#13.6.2 The Family-Wise Error Rate

#Computing the FWER
m <- 1:500
fwe1 <- 1 - (1 - 0.05)^m
fwe2 <- 1 - (1 - 0.01)^m
fwe3 <- 1 - (1 - 0.001)^m

par(mfrow = c(1, 1))
plot(m, fwe1 , type = "l", log = "x", ylim = c(0, 1), col = 2,
       ylab = "Family - Wise Error Rate",
       xlab = "Number of Hypotheses")
lines(m, fwe2 , col = 4)
lines(m, fwe3 , col = 3)
abline(h = 0.05, lty = 2)

#As discussed previously, even for moderate values of m such as 50, the FWER exceeds 0.05 unless α is set to a very low value, such as 0.001

#We now conduct a one-sample t-test for each of the first five managers in the Fund dataset

library(ISLR2)
fund.mini <- Fund[, 1:5]
t.test(fund.mini[, 1], mu = 0)

fund.pvalue <- rep(0, 5)
for (i in 1:5) {
  fund.pvalue[i] <- t.test(fund.mini[, i], mu = 0)$p.value}
fund.pvalue

#Applying the Bonferroni method

p.adjust(fund.pvalue , method = "bonferroni")
pmin(fund.pvalue * 5, 1)

#Applying the Holm's method

p.adjust(fund.pvalue , method = "holm")

apply(fund.mini , 2, mean)

#Is there a difference between Manager 1 and 3?

t.test(fund.mini[, 1], fund.mini[, 2], paired = T)

#a p-value of 0.038 suggests that there is a statistically significant difference.

#Performing a Tukey test

returns <- as.vector(as.matrix(fund.mini))
manager <- rep(c("1", "2", "3", "4", "5"), rep(50, 5))
a1 <- aov(returns ∼ manager)
TukeyHSD(x = a1)
plot(TukeyHSD(x = a1))

#13.6.3 The False Discovery Rate

#performing a t-test for all fund managers
#There are too many managers to control the FWER, so we try to control the FDR instead

fund.pvalues <- rep(0, 2000)
for (i in 1:2000) {
  fund.pvalues[i] <- t.test(Fund[, i], mu = 0)$p.value}

q.values.BH <- p.adjust(fund.pvalues , method = "BH")
q.values.BH[1:10]

#If we control the FDR at 10%, then for how many of the fund managers can we reject H0j : μj = 0?
sum(q.values.BH <= .1)

#Bonferroni method would present terrible results
sum(fund.pvalues <= (0.1 / 2000))

#Performing Benjamini-Hochberg procedure manually.

ps <- sort(fund.pvalues)
m <- length(fund.pvalues)
q <- 0.1
wh.ps <- which(ps < q * (1:m) / m)

if (length(wh.ps) >0) {
  wh <- 1:max(wh.ps)
  } else {
    wh <- numeric (0)
    }


plot(ps , log = "xy", ylim = c(4e-6, 1), ylab = "P-Value",
       xlab = "Index", main = "")
points(wh, ps[wh], col = 4)
abline(a = 0, b = (q / m), col = 2, untf = TRUE)
abline(h = 0.1 / 2000, col = 3)

#13.6.4 A Re-Sampling Approach

attach(Khan)
x <- rbind(xtrain , xtest)
y <- c(as.numeric(ytrain), as.numeric(ytest))
dim(x)
table(y)

x <- as.matrix(x)
x1 <- x[which(y == 2), ]
x2 <- x[which(y == 4), ]
n1 <- nrow(x1)
n2 <- nrow(x2)
t.out <- t.test(x1[, 11], x2[, 11], var.equal = TRUE)
TT <- t.out$statistic
TT
t.out$p.value

#Approximating the distribution of the t-statistic
set.seed (1)
B <- 10000
Tbs <- rep(NA, B)
for (b in 1:B) {
  dat<-sample(c(x1[, 11], x2[, 11]))
  Tbs[b]<-t.test(dat[1:n1], dat[(n1 + 1):(n1 + n2)],
                   var.equal = TRUE)$statistic}

mean ((abs(Tbs) >= abs(TT)))

hist(Tbs , breaks = 100, xlim = c(-4.2, 4.2), main = "",
       xlab = "Null Distribution of Test Statistic", col = 7)
lines(seq(-4.2, 4.2, len = 1000),
        dt(seq(-4.2, 4.2, len = 1000),
           df = (n1 + n2 - 2)
        ) * 1000, col = 2, lwd = 3)
abline(v = TT, col = 4, lwd = 2)
text(TT + 0.5, 350, paste("T = ", round(TT, 4), sep = ""),
       col = 4)

m <- 100
set.seed (1)
index <- sample(ncol(x1), m)
Ts <- rep(NA, m)
Ts.star <- matrix(NA, ncol = m, nrow = B)

 for (j in 1:m) {
   k <- index[j]
   Ts[j] <- t.test(x1[, k], x2[, k],
                    var.equal = TRUE
  )$statistic
   for (b in 1:B) {
     dat <- sample(c(x1[, k], x2[, k]))
     Ts. star [b, j] <- t.test(dat[1:n1],
                                dat[(n1 + 1):(n1 + n2)], var.equal = TRUE
    )$statistic
     }
   }

cs <- sort(abs(Ts))
FDRs <- Rs <- Vs <- rep(NA, m)
for (j in 1:m) {
   R <- sum(abs(Ts) >= cs[j])
   V <- sum(abs(Ts.star) >= cs[j]) / B
   Rs[j] <- R
   Vs[j] <- V
   FDRs[j] <- V / R}

max(Rs[FDRs <= .1])
sort(index[abs(Ts) >= min(cs[FDRs < .1])])
max(Rs[FDRs <= .2])
sort(index[abs(Ts) >= min(cs[FDRs < .2])])

plot(Rs , FDRs , xlab = "Number of Rejections", type = "l",
     ylab = "False Discovery Rate", col = 4, lwd = 3)
