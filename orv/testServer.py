import torch
from torchvision import models, transforms
from PIL import Image
import sys

# Uporabi CUDA, če je na voljo
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

if len(sys.argv) > 1:
    for arg in sys.argv[1:]:
        #print(arg)
        pass

input_size = 224

transform = transforms.Compose([
    transforms.Resize((input_size, input_size)),
    transforms.ToTensor(),
    transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
])

model = models.resnet18(weights=None)
model.fc = torch.nn.Linear(model.fc.in_features, 2)

model.load_state_dict(torch.load("orv/model/model_basic.pt"))
model = model.to(device)
model.eval()

def predict_image(image_path):
    image = Image.open(image_path).convert("RGB")
    image = transform(image).unsqueeze(0).to(device)
    with torch.no_grad():
        outputs = model(image)
        probs = torch.softmax(outputs, dim=1)
        confidence, predicted = torch.max(probs, 1)
        return predicted.item() == 1

if __name__ == "__main__":
    path = "orv/inputLogin/test.jpg"
    result = predict_image(path)
    print(result)
