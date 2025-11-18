#12.5 Lab: Unsupervised Learning

#12.5.1 Principal Components Analysis

#Descriptive analysis
states <- row.names(USArrests)
states

apply(USArrests , 2, mean)
apply(USArrests , 2, var)

#Performing Principal Component Analysis

#By default, the prcomp() function centers the variables to have mean zero. By using the option scale = TRUE, 
#we scale the variables to have standard deviation one

pr.out <- prcomp(USArrests , scale = TRUE)

#The center and scale components correspond to the means and standard deviations of the variables that were used 
#for scaling prior to implementing PCA

names(pr.out)

pr.out$center
pr.out$scale

#pr.out$rotation contains the corresponding principal component loading vector
pr.out$rotation

#Plotting the first two PC
#The scale = 0 argument to biplot() ensures that the arrows are scaled to biplot() represent the loadings;
biplot(pr.out , scale = 0)

#Rotating the plot
pr.out$rotation = -pr.out$rotation
pr.out$x = -pr.out$x
biplot(pr.out , scale = 0)

#SD of each PC
pr.out$sdev

#Var of each pC
pr.var <- pr.out$sdev^2
pr.var

#Explaining the total amount of Var explained by each PC (proportionally)
pve <- pr.var / sum(pr.var)
pve # 62%, 24%, 8%, 4%

#Plotting the Var of each pC
par(mfrow = c(1, 2))
plot(pve , xlab = "Principal Component",
       ylab = "Proportion of Variance Explained", ylim = c(0, 1),
       type = "b")
plot(cumsum(pve), xlab = "Principal Component",
       ylab = "Cumulative Proportion of Variance Explained",
       ylim = c(0, 1), type = "b")

#12.5.2 Matrix Completion

#We turn the data frame into a matrix, after centering and scaling each column to have mean zero and variance one.
X <- data.matrix(scale(USArrests))
pcob <- prcomp(X)
summary(pcob)

#The svd() function returns three components, u, d, and v.

sX <- svd(X)
names(sX)
round(sX$v, 3)

pcob$rotation

#The matrix u is equivalent to the matrix of standardized scores, and the standard deviations are in the vector d.
t(sX$d * t(sX$u))
pcob$x
#We now omit 20 entries in the 50 × 2 data matrix at random.

#Here, ina contains 20 integers from 1 to 50; this represents the states that
#are selected to contain missing values. And inb contains 20 integers from
#1 to 4, representing the features that contain the missing values for each of the selected states

nomit <- 20
set.seed (15)
ina <- sample(seq (50) , nomit)
inb <- sample (1:4, nomit , replace = TRUE)
Xna <- X
index.na <- cbind(ina , inb)
Xna[index.na] <- NA

#We first write a function that takes in a matrix, and returns an approximation to the matrix using the svd() function.

fit.svd <- function(X, M = 1) {
  svdob <-svd(X)
  with(svdob ,
         u[, 1:M, drop = FALSE] %*%
           (d[1:M] * t(v[, 1:M, drop = FALSE ])))}

#To conduct Step 1 of the algorithm, we initialize Xhat by replacing the missing values with the column means of the non-missing entries.
Xhat <- Xna
xbar <- colMeans(Xna , na.rm = TRUE)
Xhat[index.na] <- xbar[inb]

#Before we begin Step 2, we set ourselves up to measure the progress of our iterations:
thresh <- 1e-7
rel_err <- 1
iter <- 0
ismiss <- is.na(Xna)
mssold <- mean (( scale(Xna , xbar , FALSE)[!ismiss])^2)
mss0 <- mean(Xna[!ismiss ]^2)

#In Step 2(a) of the Algorithm we approximate Xhat using fit.svd() and compute the relative error

while(rel_err > thresh) {
  iter <- iter + 1
  # Step 2(a)
    Xapp <- fit.svd(Xhat , M = 1)
    # Step 2(b)
      Xhat [ ismiss ] <- Xapp [ ismiss ]
      # Step 2(c)
        mss <- mean ((( Xna - Xapp)[! ismiss ])^2)
        rel_err <- ( mssold - mss ) / mss0
        mssold <- mss
        cat("Iter:", iter, "MSS:", mss,
              "Rel. Err:", rel_err, "\n")
        }
#Finally, we compute the correlation between the 20 imputed values and the actual values:
cor(Xapp[ismiss], X[ismiss])

#12.5.3 Clustering

#K-means Clustering

#Simulating data
set.seed (2)
x <- matrix(rnorm (50 * 2), ncol = 2)
x[1:25, 1] <- x[1:25, 1] + 3
x[1:25, 2] <- x[1:25, 2] - 4

#Perfoming K-means clustering
km.out <- kmeans(x, 2, nstart = 20)

#The performance of the model provided excellent findings
km.out$cluster

par(mfrow = c(1, 2))
plot(x, col = (km.out$cluster + 1),
       main = "K-Means Clustering Results with K = 2",
       xlab = "", ylab = "", pch = 20, cex = 2)

#We could have instead chosen k = 3
set.seed (4)
km.out <- kmeans(x, 3, nstart = 20)
km.out

plot(x, col = (km.out$cluster + 1),
     main = "K-Means Clustering Results with K = 3",
     xlab = "", ylab = "", pch = 20, cex = 2)

#To run the kmeans() function in R with multiple initial cluster assignments, we use the nstart argument.

#Note that km.out$tot.withinss is the total within-cluster sum of squares, which we seek to minimize by performing K-means clustering.
#We strongly recommend always running K-means clustering with a large value of nstart (20, 50, etc.)
set.seed (4)
km.out <- kmeans(x, 3, nstart = 1)
km.out$tot.withinss

km.out <- kmeans(x, 3, nstart = 20)
km.out$tot.withinss

#Hierarchical Clustering

hc.complete <- hclust(dist(x), method = "complete")
hc.average <- hclust(dist(x), method = "average")
hc.single <- hclust(dist(x), method = "single")

#Plotting the results
par(mfrow = c(1, 3))
plot(hc.complete , main = "Complete Linkage",
       xlab = "", sub = "", cex = .9)
plot(hc.average , main = "Average Linkage",
       xlab = "", sub = "", cex = .9)
plot(hc.single, main = "Single Linkage",
       xlab = "", sub = "", cex = .9)

#To determine the cluster labels for each observation associated with a given cut of the dendrogram, we can use the cutree() function:
#The second argument to cutree() is the number of clusters we wish to obtain.
cutree(hc.complete , 2)
cutree(hc.average , 2)
cutree(hc.single, 2)

#We could have a cutree value of 4
cutree(hc.single, 4)

#Use scale() to scale the variables prior to performing HC
par(mfrow = c(1, 1))
xsc <- scale(x)
plot(hclust(dist(xsc), method = "complete"),
       main = "Hierarchical Clustering with Scaled Features")

#Correlation-based distance can be computed using the as.dist() function, which converts an arbitrary square symmetric matrix 
#into a form that the hclust() function recognizes as a distance matrix (only makes sense for +3 features).

x <- matrix(rnorm (30 * 3), ncol = 3)
dd <- as.dist (1 - cor(t(x)))
plot(hclust(dd, method = "complete"),
       main = "Complete Linkage with Correlation -Based Distance",
       xlab = "", sub = "")

#12.5.4 NCI60 Data Example

library(ISLR2)
nci.labs <- NCI60$labs
nci.data <- NCI60$data

dim(nci.data)
nci.labs[1:4]
table(nci.labs)

#PCA on the NCI60 Data

pr.out <- prcomp(nci.data , scale = TRUE)

#Note that the rainbow() function takes as its argument a positive integer, and returns a vector containing that number of distinct colors.
Cols <- function(vec) {
  cols <-rainbow(length(unique(vec)))
  return(cols[as.numeric(as.factor(vec))])}

par(mfrow = c(1, 2))
plot(pr.out$x[, 1:2], col = Cols(nci.labs), pch = 19,
       xlab = "Z1", ylab = "Z2")
plot(pr.out$x[, c(1, 3)], col = Cols(nci.labs), pch = 19,
       xlab = "Z1", ylab = "Z3")

summary(pr.out)

plot(pr.out)
pve <- 100 * pr.out$sdev^2 / sum(pr.out$sdev ^2)
par(mfrow = c(1, 2))
plot(pve , type = "o", ylab = "PVE",
       xlab = "Principal Component", col = "blue")
plot(cumsum(pve), type = "o", ylab = "Cumulative PVE",
       xlab = "Principal Component", col = "brown3")

#The plots indicate that perhaps PCA 7 is an ideal stopping point, as indicated by the elbow method.

#Clustering the Observations of the NCI60 Data

sd.data <- scale(nci.data)

par(mfrow = c(1, 3))
data.dist <- dist(sd.data)
plot(hclust(data.dist), xlab = "", sub = "", ylab = "",
       labels = nci.labs , main = "Complete Linkage")
plot(hclust(data.dist , method = "average"),
       labels = nci.labs , main = "Average Linkage",
       xlab = "", sub = "", ylab = "")
plot(hclust(data.dist , method = "single"),
       labels = nci.labs , main = "Single Linkage",
       xlab = "", sub = "", ylab = "")

#Cutting the -complete- dendogram at 4

hc.out <- hclust(dist(sd.data))
hc.clusters <- cutree(hc.out , 4)
table(hc.clusters , nci.labs)

par(mfrow = c(1, 1))
plot(hc.out , labels = nci.labs)
abline(h = 139, col = "red")

#summary
hc.out

#Comparing the results of K-means vs Hierarchical clustering
set.seed (2)
km.out <- kmeans(sd.data, 4, nstart = 20)
km.clusters <- km.out$cluster
table(km.clusters , hc.clusters)

#Sometimes performing clustering on the first few principal component score vectors
#can give better results than performing clustering on the full data.

hc.out <- hclust(dist(pr.out$x[, 1:5]))
plot(hc.out , labels = nci.labs ,
       main = "Hier. Clust. on First Five Score Vectors")
table(cutree(hc.out , 4), nci.labs)
