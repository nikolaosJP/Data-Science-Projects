#10.9 Lab: Deep Learning

#10.9.1 A Single Layer Network on the Hitters Data

library(ISLR2)
Gitters <- na.omit(Hitters)
n <- nrow(Gitters)
set.seed (13)
ntest <- trunc(n / 3)
testid <- sample (1:n, ntest)

#Linear Regression
lfit <- lm(Salary â¼ ., data = Gitters[-testid , ])
lpred <- predict(lfit , Gitters[testid , ])


#Notice the use of the with() command: the first argument is a dataframe,
#and the second an expression that can refer to elements of the dataframe by name.

with(Gitters[testid , ], mean(abs(lpred - Salary)))#254.6687

#Regularization with Lasso
#The first line makes a call to model.matrix(), which produces the same matrix that was used by lm() (the -1 omits the intercept). 
#This function automatically converts factors to dummy variables. The scale() function standardizes the matrix so each column 
#has mean zero and variance one.

x <- scale(model.matrix(Salary â¼ . - 1, data = Gitters))
y <- Gitters$Salary

library(glmnet)
cvfit <- cv.glmnet(x[-testid , ], y[-testid],
                     type.measure = "mae")
cpred <- predict(cvfit , x[testid , ], s = "lambda.min")
mean(abs(y[testid] - cpred))#252.299

#Fitting a Neural Network

#Installing Keras and tensorflow in Rstudio 
#Code from: Balasubramanian Narasimhan

.libPaths()

tryCatch(
  remove.packages(c("keras", "tensorflow", "reticulate")),
  error = function(e) "Some or all packages not previously installed, that's ok!"
)

install.packages("keras", repos = 'https://cloud.r-project.org')

write('RETICULATE_AUTOCONFIGURE=FALSE', file = "~/.Renviron", append = TRUE)
write(sprintf('RETICULATE_MINICONDA_PATH=%s',
              normalizePath("C:/ProgramFiles/R/R-4.0.2/library/islr-miniconda", winslash = "/", mustWork = FALSE)),
      file = "~/.Renviron", append = TRUE)

Sys.setenv(RETICULATE_AUTOCONFIGURE='FALSE',
           RETICULATE_MINICONDA_PATH=normalizePath("C:/ProgramFiles/R/R-4.0.2/library/islr-miniconda", winslash = "/", mustWork = FALSE))

source(system.file("helpers", "install.R", package = "ISLR2"))

install_miniconda()
install_tensorflow()
#Installing Keras and tensorflow in Rstudio

#Creating a NN with 50 hidden units and a ReLU activation function.
#40% of the activation units will be set to 0 each iteration and the model will provide a single quantitative output

library(keras)
tf_config()

modnn <- keras_model_sequential () %>%
  layer_dense(units = 50, activation = "relu",
  input_shape = ncol(x)) %>%
  layer_dropout(rate = 0.4) %>%
  layer_dense(units = 1)

modnn %>% compile(loss = "mse",
                  optimizer = optimizer_rmsprop (),
                  metrics = list("mean_absolute_error"))

#We supply the training data and two fitting parameters, epochs and batch size. Using 32 for the latter means that at each
#step of SGD, the algorithm randomly selects 32 training observations for the computation of the gradient.
#Since the training set has n = 176, an epoch is 176/32 = 5.5 SGD steps.

history <- modnn %>% fit(
  x[-testid , ], y[-testid], epochs = 1500, batch_size = 32,
  validation_data = list(x[testid , ], y[testid ])
)

plot(history)

npred <- predict(modnn , x[testid , ])
mean(abs(y[testid] - npred))

#10.9.2 A Multilayer Network on the MNIST Digit Data

mnist <- dataset_mnist ()
x_train <- mnist$train$x
g_train <- mnist$train$y
x_test <- mnist$test$x
g_test <- mnist$test$y
dim(x_train)
dim(x_test)

#Here, we need to "one-hot" encode our classes.
x_train <- array_reshape(x_train , c(nrow(x_train), 784))
x_test <- array_reshape(x_test , c(nrow(x_test), 784))
y_train <- to_categorical(g_train , 10)
y_test <- to_categorical(g_test , 10)

#Scaling our sets
x_train <- x_train / 255
x_test <- x_test / 255

#Fitting our NR

modelnn <- keras_model_sequential ()
modelnn %>%
  layer_dense(units = 256, activation = "relu",
                input_shape = c(784)) %>%
  layer_dropout(rate = 0.4) %>%
  layer_dense(units = 128, activation = "relu") %>%
  layer_dropout(rate = 0.3) %>%
  layer_dense(units = 10, activation = "softmax")

summary(modelnn)

#Minimizing cross-entropy

modelnn %>% compile(loss = "categorical_crossentropy",
                    optimizer = optimizer_rmsprop (), metrics = c("accuracy"))

#Fitting the model with training data
system.time(
  history <- modelnn %>%
    fit(x_train , y_train , epochs = 30, batch_size = 128,
          validation_split = 0.2))

plot(history , smooth = FALSE)

#Obtaining the test error
accuracy <- function(pred , truth) {mean(drop(pred) == drop(truth))}

modelnn %>% predict_classes(x_test) %>% accuracy(g_test)

modellr <- keras_model_sequential () %>%
  layer_dense(input_shape = 784, units = 10,
                activation = "softmax")

summary(modellr)

modellr %>% compile(loss = "categorical_crossentropy",
                    optimizer = optimizer_rmsprop (), metrics = c("accuracy"))
modellr %>% fit(x_train , y_train , epochs = 30,
                  batch_size = 128, validation_split = 0.2)
modellr %>% predict_classes(x_test) %>% accuracy(g_test)

#10.9.3 Convolutional Neural Networks
cifar100 <- dataset_cifar100 ()
names(cifar100)

x_train <- cifar100$train$x
g_train <- cifar100$train$y
x_test <- cifar100$test$x
g_test <- cifar100$test$y
dim(x_train)

range(x_train[1,,, 1])

#One-hot encoding the data
x_train <- x_train / 255
x_test <- x_test / 255
y_train <- to_categorical(g_train , 100)
dim(y_train)

#Looking at the training images 
library(jpeg)

#The as.raster() function converts the feature map so that it can be plotted as.raster() as a color image
par(mar = c(0, 0, 0, 0), mfrow = c(5, 5))
index <- sample(seq (50000) , 25)
for (i in index) plot(as.raster(x_train[i,,, ]))

#Design a CNN
#padding = "same" argument to layer conv2D() ensures that the output channels have the same dimension as the input channels.

model <- keras_model_sequential () %>%
  layer_conv_2d(filters = 32, kernel_size = c(3, 3),
                   padding = "same", activation = "relu",
                   input_shape = c(32, 32, 3)) %>%
  layer_max_pooling_2d(pool_size = c(2, 2)) %>%
  layer_conv_2d(filters = 64, kernel_size = c(3, 3),
                   padding = "same", activation = "relu") %>%
  layer_max_pooling_2d(pool_size = c(2, 2)) %>%
  layer_conv_2d(filters = 128, kernel_size = c(3, 3),
                   padding = "same", activation = "relu") %>%
  layer_max_pooling_2d(pool_size = c(2, 2)) %>%
  layer_conv_2d(filters = 256, kernel_size = c(3, 3),
                   padding = "same", activation = "relu") %>%
  layer_max_pooling_2d(pool_size = c(2, 2)) %>%
  layer_flatten () %>%
  layer_dropout(rate = 0.5) %>%
  layer_dense(units = 512, activation = "relu") %>%
  layer_dense(units = 100, activation = "softmax")

summary(model)

#Fit the model
model %>% compile(loss = "categorical_crossentropy",
                  optimizer = optimizer_rmsprop (), metrics = c("accuracy"))
history <- model %>% fit(x_train , y_train , epochs = 30,
                           batch_size = 128, validation_split = 0.2)
model %>% predict_classes(x_test) %>% accuracy(g_test)

#10.9.4 Using Pre-trained CNN Models
#Download book images.zip from www.statlearning.com;
directory.
img_dir <- "book_images"
image_names <- list.files(img_dir)
num_images <- length(image_names)
x <- array(dim = c(num_images , 224, 224, 3))
for (i in 1:num_images) {
  img_path <- paste(img_dir , image_names[i], sep = "/")
  img <- image_load(img_path, target_size = c(224 , 224))
  x[i,,, ] <- image_to_array(img)}
x <- imagenet_preprocess_input(x)

model <- application_resnet50(weights = "imagenet")
summary(model)

pred6 <- model %>% predict(x) %>%
  imagenet_decode_predictions(top = 3)
names(pred6) <- image_names
print(pred6)

#IMDb Document Classification

max_features <- 10000
imdb <- dataset_imdb(num_words = max_features)
c(c(x_train , y_train), c(x_test , y_test)) %<-% imdb

#To see the words, we create a function, decode review(), that provides a simple interface to the dictionary.

word_index <- dataset_imdb_word_index ()

decode_review <- function(text , word_index) {
  word <- names(word_index)
  idx <- unlist(word_index , use.names = FALSE)
  word <- c("<PAD >", "<START >", "<UNK >", "<UNUSED >", word)
  idx <- c(0:3 , idx + 3)
  words <- word[match(text, idx , 2)]
  paste(words , collapse = " ")}

decode_review(x_train [[1]][1:12] , word_index)

#Next, we “one-hot” encode each document in a list of documents, and return a binary matrix in sparse-matrix format.
library(Matrix)

one_hot <- function(sequences , dimension) {
  seqlen <- sapply(sequences , length)
  n <- length(seqlen)
  rowind <- rep (1:n, seqlen)
  colind <- unlist(sequences)
  sparseMatrix(i = rowind , j = colind ,
                 dims = c(n, dimension))}

x_train_1h <- one_hot(x_train , 10000)
x_test_1h <- one_hot(x_test , 10000)
dim(x_train_1h)

nnzero(x_train_1h) / (25000 * 10000)

set.seed (3)
ival <- sample(seq(along = y_train), 2000)

#fitting a lasso logistic regression
library(glmnet)
fitlm <- glmnet(x_train_1h[-ival , ], y_train[-ival],
                  family = "binomial", standardize = FALSE)
classlmv <- predict(fitlm , x_train_1h[ival , ]) > 0
acclmv <- apply(classlmv , 2, accuracy, y_train[ival] > 0)

par(mar = c(4, 4, 4, 4), mfrow = c(1, 1))
plot(-log(fitlm$lambda), acclmv)

#Next we fit a CNN
model <- keras_model_sequential () %>%
  layer_dense(units = 16, activation = "relu",
                input_shape = c(10000)) %>%
  layer_dense(units = 16, activation = "relu") %>%
  layer_dense(units = 1, activation = "sigmoid")

model %>% compile(optimizer = "rmsprop",
                    loss = "binary_crossentropy", metrics = c("accuracy"))

history <- model %>% fit(x_train_1h[-ival , ], y_train[-ival],
                           epochs = 20, batch_size = 512,
                           validation_data = list(x_train_1h[ival , ], y_train[ival]))

#Computing the test accuracy
history <- model %>% fit(
  x_train_1h[-ival , ], y_train[-ival], epochs = 20,
  batch_size = 512, validation_data = list(x_test_1h, y_test)
)

#10.9.6 Recurrent Neural Networks
wc <- sapply(x_train , length)
median(wc)
sum(wc <= 500) / length(wc)

#restrict the document lengths to the last L = 500 words, and pad the beginning of the shorter ones with blanks.
maxlen <- 500
x_train <- pad_sequences(x_train , maxlen = maxlen)
x_test <- pad_sequences(x_test , maxlen = maxlen)
dim(x_train)

dim(x_test)

x_train[1, 490:500]

#This layer one-hot encodes each document as a
#matrix of dimension 500×10, 000, and then maps these 10, 000 dimensions down to 32.

model <- keras_model_sequential () %>%
  layer_embedding(input_dim = 10000, output_dim = 32) %>%
  layer_lstm(units = 32) %>%
  layer_dense(units = 1, activation = "sigmoid")

#Tracking the test performance
model %>% compile(optimizer = "rmsprop",
                    loss = "binary_crossentropy", metrics = c("acc"))
history <- model %>% fit(x_train , y_train , epochs = 10,
                           batch_size = 128, validation_data = list(x_test , y_test))
plot(history)
predy <- predict(model, x_test) > 0.5
mean(abs(y_test == as.numeric(predy)))

#Time Series Prediction

library(ISLR2)
xdata <- data.matrix(
  NYSE[, c("DJ_return", "log_volume","log_volatility")])
istrain <- NYSE[, "train"]
xdata <- scale(xdata)

#We start with a function that takes as input a data matrix and a lag L, and returns a lagged version of the matrix

lagm <- function(x, k = 1) {
  n <- nrow(x)
  pad <- matrix(NA , k, ncol(x))
  rbind(pad , x[1:(n - k), ])}

arframe <- data.frame(log_volume = xdata[, "log_volume"],
                      L1 = lagm(xdata , 1), L2 = lagm(xdata , 2),
                      L3 = lagm(xdata , 3), L4 = lagm(xdata , 4),
                      L5 = lagm(xdata , 5))
arframe <- arframe[-(1:5), ]
istrain <- istrain[-(1:5)]

#Fitting an AR
arfit <- lm(log_volume ∼ ., data = arframe[istrain , ])
arpred <- predict(arfit , arframe[!istrain , ])

#The last two lines compute the R2 on the test data
V0 <- var(arframe[!istrain , "log_volume"])
1 - mean (( arpred - arframe [! istrain , "log_volume"])^2) / V0

#We refit this model, including the factor variable day of week.
arframed <-
  data.frame(day = NYSE [-(1:5), "day_of_week"], arframe)
arfitd <- lm(log_volume ∼ ., data = arframed[istrain , ])
arpredd <- predict(arfitd , arframed[!istrain , ])
1 - mean (( arpredd - arframe [! istrain , "log_volume"])^2) / V0

#Reshaping the data to fit RNN
n <- nrow(arframe)
#The first simply extracts the n×15 matrix of lagged versions of the three predictor variables from arframe
xrnn <- data.matrix(arframe[, -1])
#The second converts this matrix to an n×3×5 array
xrnn <- array(xrnn , c(n, 3, 5))
#The third step reverses the order of lagged variables, so that index 1 is furthest back in time, and index 5 closest
xrnn <- xrnn[,, 5:1]
#The final step rearranges the coordinates of the array (like a partial transpose) into the format that the RNN module in keras expects.
xrnn <- aperm(xrnn , c(1, 3, 2))

dim(xrnn)

#Fitting the RNN
model <- keras_model_sequential () %>%
  layer_simple_rnn(units = 12,
                     input_shape = list(5, 3),
                     dropout = 0.1, recurrent_dropout = 0.1) %>%
  layer_dense(units = 1)

model %>% compile(optimizer = optimizer_rmsprop (),
                    loss = "mse")
history <- model %>% fit(
  xrnn[istrain ,, ], arframe[istrain , "log_volume"],
  batch_size = 64, epochs = 200,
  validation_data =
    list(xrnn[!istrain ,, ], arframe[!istrain , "log_volume"]))

kpred <- predict(model, xrnn[!istrain ,, ])
1 - mean (( kpred - arframe [! istrain , "log_volume"]) ^2) / V0

#We could also do
model <- keras_model_sequential () %>%
  layer_flatten(input_shape = c(5, 3)) %>%
  layer_dense(units = 1)

x <- model.matrix(log_volume ∼ . - 1, data = arframed)
colnames(x)

arnnd <- keras_model_sequential () %>%
  layer_dense(units = 32, activation = "relu",
                input_shape = ncol(x)) %>%
  layer_dropout(rate = 0.5) %>%
  layer_dense(units = 1)

arnnd %>% compile(loss = "mse",
                    optimizer = optimizer_rmsprop ())
history <- arnnd %>% fit(
  x[istrain , ], arframe[istrain , "log_volume"], epochs = 100,
  batch_size = 32, validation_data =
    list(x[!istrain , ], arframe [!istrain , "log_volume"]))

plot(history)
npred <- predict(arnnd , x[!istrain , ])
1 - mean (( arframe [! istrain , "log_volume"] - npred)^2) / V0

#Applied
