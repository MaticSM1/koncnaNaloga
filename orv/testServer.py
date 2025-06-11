import torch
from torchvision import models, transforms
from PIL import Image
import sys
import os

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

if len(sys.argv) < 2:
    print("Uporaba: python script.py <model_suffix> <image_path>")
    sys.exit(1)

model_suffix = sys.argv[1]
model_path = f"orv/model/model_{model_suffix}.pt"

image_path = "orv/inputLogin/test.jpg"

input_size = 224
transform = transforms.Compose([
    transforms.Resize((input_size, input_size)),
    transforms.ToTensor(),
    transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
])

model = models.resnet18(weights=None)
model.fc = torch.nn.Linear(model.fc.in_features, 2)
model.load_state_dict(torch.load(model_path, map_location=device))
model = model.to(device)
model.eval()

def predict_image(path):
    image = Image.open(path).convert("RGB")
    image = transform(image).unsqueeze(0).to(device)
    with torch.no_grad():
        outputs = model(image)
        probs = torch.softmax(outputs, dim=1)
        confidence, predicted = torch.max(probs, 1)
        return predicted.item() == 1

result = predict_image(image_path)
print(result)
