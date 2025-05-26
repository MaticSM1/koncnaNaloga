import albumentations as A
from albumentations.pytorch import ToTensorV2
import random
import cv2

def get_train_transforms():
    return A.Compose([
        A.RandomRotate90(),
        A.HorizontalFlip(),
        A.ShiftScaleRotate(shift_limit=0.05, scale_limit=0.1, rotate_limit=15, p=0.7),
        A.RandomBrightnessContrast(p=0.5),
        A.HueSaturationValue(p=0.3),
        A.GaussianBlur(p=0.2),
        A.Normalize(mean=(0.5, 0.5, 0.5), std=(0.5, 0.5, 0.5)),
        ToTensorV2(),
    ])

def custom_augmentation(img):
    # Naključni robni efekt
    if random.random() < 0.5:
        img = cv2.Canny(img, 100, 200)
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    return img
