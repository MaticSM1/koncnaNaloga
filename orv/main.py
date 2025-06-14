import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import models
from dataset import get_data_loaders
import sys
import os

def train_model(model, dataloaders, criterion, optimizer, device, num_epochs=10):
    train_loader, test_loader = dataloaders

    for epoch in range(num_epochs):
        model.train()
        correct = 0
        total = 0

        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            preds = outputs.argmax(1)
            correct += (preds == labels).sum()
            total += len(labels)


        # for inputs, labels in test_loader:
        #     inputs, labels = inputs.to(device), labels.to(device)
        #     outputs = model(inputs)
        #     preds = outputs.argmax(1)
        #     correct += (preds == labels).sum()
        #     total += len(labels)
        accuracy = correct / total * 100
        print(f"Epoch {epoch+1}/{num_epochs}, Accuracy: {accuracy:.2f}%")

    print("Training complete")


if __name__ == "__main__":
    model_suffix = sys.argv[1]
    model_path = f"model/model_{model_suffix}.pt"

    # Parametri
    data_dir = "data"
    batch_size = 32
    input_size = 224
    num_epochs = 10
    learning_rate = 0.001

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    train_loader, test_loader, classes = get_data_loaders(data_dir, batch_size, input_size)

    model = models.resnet18(weights=None)
    model.fc = nn.Linear(model.fc.in_features, 2)
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)

    train_model(model, (train_loader, test_loader), criterion, optimizer, device, num_epochs)

    os.makedirs("model", exist_ok=True)
    torch.save(model.state_dict(), model_path)
    print(f"Model saved to {model_path}")
