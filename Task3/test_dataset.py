# test_dataset.py
"""
Quick test script to verify dataset loading
"""
from dataset_loader import SROIEDatasetLoader

def quick_test():
    """Quick test of dataset loading"""
    
    print("Testing SROIE dataset loader...")
    
    # Initialize loader
    loader = SROIEDatasetLoader("Hackathon data/SROIE2019")
    
    # Show dataset structure
    loader.load_dataset_info()
    
    # Load a few samples
    print("\nLoading 5 training samples...")
    dataset = loader.load_sroie_dataset(split="train", max_samples=5)
    
    if dataset:
        print(f"\nSuccessfully loaded {len(dataset)} samples")
        
        # Show first sample details
        first_sample = dataset[0]
        print(f"\nFirst sample:")
        print(f"  Image path: {first_sample['image_path']}")
        print(f"  Image size: {first_sample['image_size']}")
        print(f"  Number of annotations: {len(first_sample['annotations'])}")
        
        # Show first 3 annotations
        print(f"\nFirst 3 annotations:")
        for i, ann in enumerate(first_sample['annotations'][:3]):
            print(f"  {i+1}. Text: '{ann['text']}'")
            if ann['bbox']:
                print(f"     BBox: {ann['bbox']}")
        
        # Show full text
        print(f"\nFull text (first 200 chars):")
        print(f"  {first_sample['full_text'][:200]}...")
    else:
        print("Failed to load dataset. Check the path and structure.")

if __name__ == "__main__":
    quick_test()