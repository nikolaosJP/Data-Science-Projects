# Unsupervised Anomaly Detection on a Real-World Dataset

![MVTEC Image](https://www.mvtec.com/fileadmin/_processed_/1/e/csm_dataset_overview_large_6f330dede4.png)
>Image Source: https://www.mvtec.com/

MVTec AD is an open access dataset (see [MVTec dataset](https://www.mvtec.com/company/research/datasets/mvtec-ad)) used for training anomaly detection ML algorithms. It contains over 5.000 high-res images divided into 15 different objects, some of which are characterised by a morphological anomaly. These anomalies are manifested in a myriad of forms such as scratches, dents, or other structural irregularities.

In this IPython notebook we will use Transfer Learning, a popular approach in deep learning, to firstly distinguish objects in pristine condition from those with anomalies and secondly to detect the exact location of any potential physical defects. Transfer Learning, in case you are unfamiliar with the concept, is a technique used to expedite the training period of deep convolutional neural networks. This is achieved by utilizing weights from pre-trained models that were developed for visual object recognition software research. Top performing models can be downloaded and used directly, or integrated into a new model to solve new tasks.

# Model Architecture

The custom-made model developed for this project is based on the VGG-16 architecture which had been pre-trained on ImageNet. The intermediary fully-connected neural network layers are replaced by an average global pooling layer and the last dense layer outputs a two-dimensional vector which is normalized and transformed into a probability distribution consisting of K probabilities ('Anomaly' for objects with structural irregularities or 'Good' otherwise). The loss-function for this model is based on cross-entropy and the optimizer is Adam with a learning rate of 0.0001. 

![Model Architrecture](https://user-images.githubusercontent.com/71797206/169629507-91206559-c316-40da-a129-d21b44931154.png)

# Project findings

The model was trained on two subsets of the MVTec Anomaly Detection Dataset, namely on the 'carpet' and 'capsule' sets. As depicted in the table below, the balanced accuracy of the model on an unseen dataset was close to 90% for both the carpet and capsule subsets, which is considered acceptable for the explorative nature of this project.

Table 1: Summary of the findings 
| Subset Title  | Test Accuracy | Balanced Test Accuracy | Confusion Matrix Labels          |
| ------------- | ------------- | -------------          | -------------                    |
| Carpet        | 91.0%          | 88.0%                   | TP = 57, TN = 15, FP = 3, FN = 4 |
| Capsule       | 93.0%          | 91.0%                   | TP = 46, TN = 19, FP = 3, FN = 2 |

A simple illustration of the anomalies detected.

![Findings](https://user-images.githubusercontent.com/71797206/169630481-6b613330-e16c-48b5-bb64-0db4e0dbee20.png)

# References

Zhou, Bolei, Aditya Khosla, Agata Lapedriza, Aude Oliva, and Antonio Torralba: Learning deep features for discriminative localization; in: Proceedings of the IEEE conference on computer vision and pattern recognition, 2016. pdf

Paul Bergmann, Michael Fauser, David Sattlegger, Carsten Steger: MVTec AD – A Comprehensive Real-World Dataset for Unsupervised Anomaly Detection; in: IEEE Conference on Computer Vision and Pattern Recognition (CVPR), June 2019. pdf

Paul Bergmann, Kilian Batzner, Michael Fauser, David Sattlegger, Carsten Steger: The MVTec Anomaly Detection Dataset: A Comprehensive Real-World Dataset for Unsupervised Anomaly Detection; in: International Journal of Computer Vision, January 2021. pdf

Olga Chernytska, Visual Inspection, GitHub repository, https://github.com/OlgaChernytska/Visual-Inspection, 2022

# License

This project is licensed under the terms of the [MIT license](https://choosealicense.com/licenses/mit/).

