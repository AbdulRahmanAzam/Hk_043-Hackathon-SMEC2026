import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from transformers import LayoutLMForTokenClassification
from PIL import Image
import json
import os

class SROIEDataset(Dataset):
    def __init__(self, image_dir, annotation_dir, transform=None):
        self.image_dir = image_dir
        self.annotation_dir = annotation_dir
        self.transform = transform
        self.image_files = os.listdir(image_dir)
        
    def __len__(self):
        return len(self.image_files)
    
    def __getitem__(self, idx):
        img_path = os.path.join(self.image_dir, self.image_files[idx])
        ann_path = os.path.join(self.annotation_dir, 
                               self.image_files[idx].replace('.jpg', '.txt'))
        
        image = Image.open(img_path).convert('RGB')
        
        with open(ann_path, 'r') as f:
            annotations = json.load(f)
        return image, annotations

def train_receipt_model():
    """Train a custom model on SROIE dataset"""
    model = LayoutLMForTokenClassification.from_pretrained(
        "microsoft/layoutlm-base-uncased",
        num_labels=5
    )
    
    dataset = SROIEDataset("data/images", "data/annotations")
    dataloader = DataLoader(dataset, batch_size=8, shuffle=True)
    
    # Training loop
    optimizer = torch.optim.AdamW(model.parameters(), lr=5e-5)
    
    for epoch in range(10):
        for batch in dataloader:
            # Forward pass
            outputs = model(**batch)
            loss = outputs.loss
            
            # Backward pass
            loss.backward()
            optimizer.step()
            optimizer.zero_grad()
            
        print(f"Epoch {epoch+1}, Loss: {loss.item()}")

    torch.save(model.state_dict(), "receipt_model.pth")
