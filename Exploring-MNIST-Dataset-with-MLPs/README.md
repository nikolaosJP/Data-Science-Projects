# Multilayer Perceptron Training for MNIST Classification

![Imgur Image](https://royalsocietypublishing.org/cms/asset/7a534127-2f26-4dd5-9f55-dd72a512f42f/rsta20190163f02.png)
>Image Source: https://royalsociety.org/journals/

The MNIST database (Modified National Institute of Standards and Technology database) is a large collection of handwritten digits. It has a training set of 60,000 examples, and a test set of 10,000 examples. It is a subset of a larger NIST Special Database 3 (digits written by employees of the United States Census Bureau) and Special Database 1 (digits written by high school students) which contain monochrome images of handwritten digits. The digits have been size-normalized and centered in a fixed-size image. The original black and white (bilevel) images from NIST were size normalized to fit in a 20x20 pixel box while preserving their aspect ratio. The resulting images contain grey levels as a result of the anti-aliasing technique used by the normalization algorithm. the images were centered in a 28x28 image by computing the center of mass of the pixels, and translating the image so as to position this point at the center of the 28x28 field.
>Source: http://yann.lecun.com/exdb/mnist/

In this IPython notebook we will use PyTorch, a deep learning library to build a multilayer perceptron (MLP) which will allow us to accurately classify the hand written digits contained within the MNIST dataset. For those unfamiliar with MLPs, in brief, they are considered as a class of feedforward artificial neural networks and generally consist of at least three layers of nodes: an input layer, a hidden layer and an output layer. Except for the input nodes, each node is a neuron that uses a nonlinear activation function (e.g., ReLU, tanh, sigmoid etc.) which helps it distinguish data that is not linearly separable. In addition to that, MLPs utilize a supervised learning technique called backpropagation to compute the gradient of the loss function with respect to the weights of the network.

Unlike CNNs which take tensors as inputs, an MLP only recognizes vectors as inputs and thus it is not capable of understanding the spatial relations between the pixels of a given image. Nevertheless, an MLP classifier can perform exceptionally well on images that have undergone a thorough pre-processing. As we will see later, the model presented here can achieve an accuracy of 98% on an unseen test set, which is satisfactory.

# License

This project is licensed under the terms of the [MIT license](https://choosealicense.com/licenses/mit/).
