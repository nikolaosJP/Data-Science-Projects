#Chapter 3 -  Data Pre-Processing
#Chapter 3 - Exercises

library(AppliedPredictiveModeling)
library(mlbench)

data(Glass)
str(Glass)

#Exercise 3.1 (A)

# Look at all pairwise scatter plots:
pairs(Glass)

# Look at all the correlation between all predictors:
cor( Glass[,-10] ) # drop the factor variable (the last 10th one)

# Look at the correlation of each predictor with the class label:
cor( Glass[,-10], as.numeric( Glass[,10] ) )

# Visually display how Mg and Al depend on the glass type:
par(mfrow=c(1,2)) 
boxplot( Glass$Mg ~ Glass$Type )
boxplot( Glass$Al ~ Glass$Type )
par(mfrow=c(1,1))

# Use the "corrplot" command:
library(corrplot)
corrplot( cor( Glass[,-10] ), order="hclust" )

#Exercise 3.1 (B)

# Look for the features with the most number of outliers:
# Compute the skewness of each feature:
library(e1071)
apply( Glass[,-10], 2, skewness )

# Look at histograms of some of the skewed predictors:
par(mfrow=c(1,3))
hist( Glass$K ) # Looks like a data error in that we have only two  samples with a very large K value 
hist( Glass$Ba ) # Looks like a skewed distribution
hist( Glass$Mg ) # Looks multimodal
par(mfrow=c(1,1))

#Exercise 3.1 (C)
# Transform our predictors using the Box-Cox tranformation:
library(caret) # to get BoxCoxTrans
Glass$Mg = Glass$Mg + 1.e-6 # add a small value so that BoxCoxTransfs will converge 
Glass$K = Glass$K + 1.e-6
Glass$Ba = Glass$Ba + 1.e-6
Glass$Fe = Glass$Fe + 1.e-6

boxcox_skewness = function(x){
   BCT = BoxCoxTrans(x)
   x_bc = predict( BCT, x )
   skewness(x_bc) 
}

apply( Glass[,-10], 2, boxcox_skewness )

#Exercise 3.2 (A)

data(Soybean)

zero_cols = nearZeroVar( Soybean )
colnames( Soybean )[ zero_cols ]
Soybean = Soybean[,-zero_cols] 

#Exercise 3.2 (B)

# Count how many NA's we have in each feature:
apply( Soybean, 2, function(x){ sum(is.na(x)) } )

# See if a class has more NA's than others:
#
Soybean$has_nans_in_sample = apply( Soybean[,-1], 1, function(x){ sum(is.na(x)) > 0 } )
table( Soybean[, c(1,34) ] )

#Exercise 3.2 (C)

# For imputation of data for the NA's

preProcess( Soybean[,-1], method=c("knnImpute"), na.remove=FALSE ) 

#Exercise 3.3 (A)
data(BloodBrain)

# Look for degenerate columns: 
zero_cols = nearZeroVar( bbbDescr )
colnames( bbbDescr )[ zero_cols ]

#Exercise 3.3 (B)

# Look for strong correlations among the predictors: 
corrplot( cor( bbbDescr ), order="hclust" )

# Find which predictors we can elliminate since they have correlations that are "too large":
#
highCorr = findCorrelation( cor( bbbDescr ), cutoff=0.75 )

bbbDescr_independent = bbbDescr[,-highCorr]

corrplot( cor(bbbDescr_independent) ) # notice that this matrix has no values > cutoff=0.75 above
