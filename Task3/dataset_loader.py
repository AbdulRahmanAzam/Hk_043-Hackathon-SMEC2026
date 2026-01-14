# dataset_loader.py
"""
Script to load and preprocess SROIE dataset for receipt scanning system.
Dataset structure: Hackathon data/SROIE2019/
"""
import os
import json
import pandas as pd
from PIL import Image
import cv2
import numpy as np
from pathlib import Path
import shutil

class SROIEDatasetLoader:
    def __init__(self, base_path="Hackathon data/SROIE2019"):
        self.base_path = Path(base_path)
        self.train_path = self.base_path / "train"
        self.test_path = self.base_path / "test"
        
    def load_dataset_info(self):
        """Print dataset structure information"""
        print("=== SROIE Dataset Structure ===")
        print(f"Base path: {self.base_path}")
        
        if self.train_path.exists():
            print(f"\nTrain directory exists: {self.train_path}")
            train_files = list(self.train_path.rglob("*"))
            print(f"Number of train files: {len(train_files)}")
            
            # Count images
            img_files = list(self.train_path.rglob("*.jpg")) + list(self.train_path.rglob("*.png"))
            print(f"Number of train images: {len(img_files)}")
            
            # List directories
            for item in self.train_path.iterdir():
                if item.is_dir():
                    files_in_dir = list(item.glob("*"))
                    print(f"  {item.name}/: {len(files_in_dir)} files")
        
        if self.test_path.exists():
            print(f"\nTest directory exists: {self.test_path}")
            test_files = list(self.test_path.rglob("*"))
            print(f"Number of test files: {len(test_files)}")
    
    def load_image_annotation_pairs(self, split="train"):
        """
        Load image paths and their corresponding annotations
        
        Args:
            split: 'train' or 'test'
        
        Returns:
            List of tuples (image_path, annotation_path)
        """
        if split == "train":
            split_path = self.train_path
        else:
            split_path = self.test_path
        
        image_annotation_pairs = []
        
        # Look for images in the split directory
        for ext in ["*.jpg", "*.png", "*.jpeg"]:
            for img_path in split_path.rglob(ext):
                # Try to find corresponding annotation file
                base_name = img_path.stem
                
                # Check for annotation in various possible locations
                possible_annotation_locations = [
                    img_path.parent / f"{base_name}.txt",  # Same directory
                    split_path / "box" / f"{base_name}.txt",  # box directory
                    split_path / "entities" / f"{base_name}.txt",  # entities directory
                ]
                
                annotation_path = None
                for loc in possible_annotation_locations:
                    if loc.exists():
                        annotation_path = loc
                        break
                
                if annotation_path:
                    image_annotation_pairs.append((str(img_path), str(annotation_path)))
                else:
                    print(f"Warning: No annotation found for {img_path.name}")
        
        print(f"Found {len(image_annotation_pairs)} image-annotation pairs for {split} split")
        return image_annotation_pairs
    
    def parse_sroie_annotation(self, annotation_path):
        """
        Parse SROIE annotation file format
        
        SROIE format: Each line contains comma-separated values
        Usually: x1,y1,x2,y2,x3,y3,x4,y4,text
        Or sometimes just text with entity labels
        """
        with open(annotation_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        annotations = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            parts = line.split(',')
            
            if len(parts) >= 9:
                # Format with coordinates: x1,y1,x2,y2,x3,y3,x4,y4,text
                try:
                    coords = list(map(int, parts[:8]))
                    text = ','.join(parts[8:])  # Join remaining parts as text (might contain commas)
                    
                    # Convert quadrilateral to bounding box (min/max of coordinates)
                    x_coords = coords[0::2]  # x1, x2, x3, x4
                    y_coords = coords[1::2]  # y1, y2, y3, y4
                    
                    bbox = [
                        min(x_coords),  # x_min
                        min(y_coords),  # y_min
                        max(x_coords),  # x_max
                        max(y_coords)   # y_max
                    ]
                    
                    annotations.append({
                        'text': text,
                        'bbox': bbox,
                        'quadrilateral': coords
                    })
                except ValueError:
                    # If parsing coordinates fails, treat as text only
                    annotations.append({'text': line, 'bbox': None, 'quadrilateral': None})
            else:
                # Text-only format
                annotations.append({'text': line, 'bbox': None, 'quadrilateral': None})
        
        return annotations
    
    def load_sroie_dataset(self, split="train", max_samples=None):
        """
        Load SROIE dataset for training
        
        Args:
            split: 'train' or 'test'
            max_samples: Maximum number of samples to load (None for all)
        
        Returns:
            List of dictionaries with image and annotation data
        """
        print(f"Loading {split} dataset...")
        
        image_annotation_pairs = self.load_image_annotation_pairs(split)
        
        if max_samples:
            image_annotation_pairs = image_annotation_pairs[:max_samples]
        
        dataset = []
        
        for img_path, ann_path in image_annotation_pairs:
            try:
                # Load image
                image = Image.open(img_path)
                image = image.convert('RGB')  # Ensure RGB format
                
                # Load annotations
                annotations = self.parse_sroie_annotation(ann_path)
                
                # Extract all text from annotations
                all_text = ' '.join([ann['text'] for ann in annotations if ann['text']])
                
                dataset.append({
                    'image_path': img_path,
                    'annotation_path': ann_path,
                    'image': image,
                    'annotations': annotations,
                    'full_text': all_text,
                    'image_size': image.size  # (width, height)
                })
                
            except Exception as e:
                print(f"Error loading {img_path}: {e}")
                continue
        
        print(f"Successfully loaded {len(dataset)} samples from {split} split")
        return dataset
    
    def create_dataframe(self, dataset):
        """Convert dataset to pandas DataFrame for analysis"""
        records = []
        
        for item in dataset:
            for ann in item['annotations']:
                records.append({
                    'image_path': item['image_path'],
                    'text': ann.get('text', ''),
                    'bbox': ann.get('bbox'),
                    'has_bbox': ann.get('bbox') is not None,
                    'image_width': item['image_size'][0],
                    'image_height': item['image_size'][1]
                })
        
        df = pd.DataFrame(records)
        
        # Add text statistics
        if not df.empty:
            df['text_length'] = df['text'].apply(len)
            df['word_count'] = df['text'].apply(lambda x: len(str(x).split()))
        
        return df
    
    def analyze_dataset(self, dataset):
        """Analyze dataset statistics"""
        print("\n=== Dataset Analysis ===")
        print(f"Total samples: {len(dataset)}")
        
        if len(dataset) == 0:
            return
        
        # Count annotations
        total_annotations = sum(len(item['annotations']) for item in dataset)
        print(f"Total annotations: {total_annotations}")
        print(f"Average annotations per image: {total_annotations / len(dataset):.2f}")
        
        # Text statistics
        all_texts = []
        for item in dataset:
            for ann in item['annotations']:
                if ann['text']:
                    all_texts.append(ann['text'])
        
        if all_texts:
            avg_text_length = np.mean([len(text) for text in all_texts])
            print(f"Average text length: {avg_text_length:.2f} characters")
            
            # Show sample texts
            print("\nSample texts from dataset:")
            for i, text in enumerate(all_texts[:5]):
                print(f"  {i+1}. {text[:100]}{'...' if len(text) > 100 else ''}")
        
        # Image statistics
        widths = [item['image_size'][0] for item in dataset]
        heights = [item['image_size'][1] for item in dataset]
        
        print(f"\nImage dimensions:")
        print(f"  Width: min={min(widths)}, max={max(widths)}, avg={np.mean(widths):.1f}")
        print(f"  Height: min={min(heights)}, max={max(heights)}, avg={np.mean(heights):.1f}")
    
    def preprocess_images(self, dataset, output_dir="preprocessed_images"):
        """
        Preprocess images for better OCR performance
        
        Args:
            dataset: Loaded dataset
            output_dir: Directory to save preprocessed images
        """
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        print(f"\nPreprocessing images to {output_dir}...")
        
        for i, item in enumerate(dataset):
            try:
                # Convert PIL Image to OpenCV format
                img_cv = cv2.cvtColor(np.array(item['image']), cv2.COLOR_RGB2BGR)
                
                # Convert to grayscale
                gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
                
                # Apply adaptive thresholding
                thresh = cv2.adaptiveThreshold(gray, 255, 
                                              cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                              cv2.THRESH_BINARY, 11, 2)
                
                # Denoise
                denoised = cv2.medianBlur(thresh, 3)
                
                # Save preprocessed image
                output_path_img = output_path / f"preprocessed_{i:04d}.png"
                cv2.imwrite(str(output_path_img), denoised)
                
                # Update dataset with preprocessed image path
                item['preprocessed_path'] = str(output_path_img)
                
            except Exception as e:
                print(f"Error preprocessing image {item['image_path']}: {e}")
        
        print(f"Preprocessed {len(dataset)} images")
    
    def save_to_csv(self, dataset, output_file="sroie_dataset.csv"):
        """Save dataset information to CSV file"""
        df = self.create_dataframe(dataset)
        
        if not df.empty:
            df.to_csv(output_file, index=False, encoding='utf-8')
            print(f"\nDataset saved to {output_file}")
            print(f"DataFrame shape: {df.shape}")
            
            # Show summary
            print("\nDataFrame columns:", df.columns.tolist())
            print("\nFirst few rows:")
            print(df.head())
        else:
            print("No data to save")
        
        return df
    
    def prepare_for_training(self, dataset, output_dir="training_data"):
        """
        Prepare dataset for model training
        
        Args:
            dataset: Loaded dataset
            output_dir: Directory to save training data
        """
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        images_dir = output_path / "images"
        annotations_dir = output_path / "annotations"
        
        images_dir.mkdir(exist_ok=True)
        annotations_dir.mkdir(exist_ok=True)
        
        print(f"\nPreparing training data in {output_dir}...")
        
        for i, item in enumerate(dataset):
            try:
                # Save image
                img_filename = f"receipt_{i:04d}.jpg"
                img_save_path = images_dir / img_filename
                item['image'].save(img_save_path)
                
                # Save annotation
                ann_filename = f"receipt_{i:04d}.txt"
                ann_save_path = annotations_dir / ann_filename
                
                with open(ann_save_path, 'w', encoding='utf-8') as f:
                    # Write all text from annotations
                    for ann in item['annotations']:
                        if ann['text']:
                            f.write(ann['text'] + '\n')
                
                # Create simplified annotation (for OCR training)
                simple_ann_path = annotations_dir / f"receipt_{i:04d}_simple.txt"
                with open(simple_ann_path, 'w', encoding='utf-8') as f:
                    f.write(item['full_text'])
                
            except Exception as e:
                print(f"Error saving item {i}: {e}")
        
        print(f"Prepared {len(dataset)} samples for training")
        print(f"Images saved to: {images_dir}")
        print(f"Annotations saved to: {annotations_dir}")

# Main execution function
def main():
    """Main function to load and process SROIE dataset"""
    
    # Initialize dataset loader
    loader = SROIEDatasetLoader("Hackathon data/SROIE2019")
    
    # Show dataset info
    loader.load_dataset_info()
    
    # Load training dataset
    print("\n" + "="*50)
    train_dataset = loader.load_sroie_dataset(split="train", max_samples=50)  # Load first 50 for testing
    loader.analyze_dataset(train_dataset)
    
    # Create DataFrame and save to CSV
    df = loader.save_to_csv(train_dataset, "sroie_train_data.csv")
    
    # Prepare for training
    loader.prepare_for_training(train_dataset, "training_data")
    
    # Preprocess images (optional)
    if input("\nPreprocess images? (y/n): ").lower() == 'y':
        loader.preprocess_images(train_dataset, "preprocessed_images")
    
    # Load test dataset
    print("\n" + "="*50)
    test_dataset = loader.load_sroie_dataset(split="test", max_samples=10)  # Load first 10 for testing
    loader.analyze_dataset(test_dataset)
    
    if test_dataset:
        loader.save_to_csv(test_dataset, "sroie_test_data.csv")
    
    print("\n" + "="*50)
    print("Dataset loading completed!")
    
    # Return datasets for further use
    return train_dataset, test_dataset

if __name__ == "__main__":
    train_data, test_data = main()
    
    # Example of how to use the loaded data
    if train_data:
        print(f"\nLoaded {len(train_data)} training samples")
        print(f"First sample keys: {train_data[0].keys()}")
        print(f"First sample has {len(train_data[0]['annotations'])} annotations")