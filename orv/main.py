import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import models
from dataset import get_data_loaders
import time

def train_model(model, dataloaders, criterion, optimizer, device, num_epochs=10):
    train_loader, test_loader = dataloaders

    for epoch in range(num_epochs):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()
            _, preds = torch.max(outputs, 1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

        accuracy = correct / total * 100
        print(f"Epoch {epoch+1}/{num_epochs}, Loss: {running_loss:.4f}, Accuracy: {accuracy:.2f}%")

    print("Training complete")

def main():
    data_dir = "data"
    batch_size = 32
    input_size = 224
    num_epochs = 10
    learning_rate = 0.001

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    train_loader, test_loader, classes = get_data_loaders(data_dir, batch_size, input_size)

    model = models.resnet18(pretrained=True)
    model.fc = nn.Linear(model.fc.in_features, len(classes))
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)

    train_model(model, (train_loader, test_loader), criterion, optimizer, device, num_epochs)

    torch.save(model.state_dict(), "model/model_basic.pt")
    print("Model saved to model/model_basic.pt")

if __name__ == "__main__":
    main()
