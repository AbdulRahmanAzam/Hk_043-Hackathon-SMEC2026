from receipt_scanner import ReceiptScanner
from PIL import Image, ImageDraw, ImageFont
import os
import re

def create_sample_receipts():
    print("Creating sample receipts for debugging...")
    
    # Sample 1: Clear receipt with proper formatting
    img1 = Image.new('RGB', (600, 400), color='white')
    d1 = ImageDraw.Draw(img1)
    text1 = [
        "SUPERMARKET",
        "Receipt #12345",
        "Date: 2024-01-14",
        "Time: 14:30:00",
        "------------------------",
        "Apples: $5.99",
        "Bread: $3.50",
        "Milk: $4.25",
        "------------------------",
        "Subtotal: $13.74",
        "Tax: $1.10",
        "TOTAL: $14.84",
        "Thank you!"
    ]
    
    y = 50
    for line in text1:
        d1.text((50, y), line, fill='black')
        y += 25
    
    img1.save('test_receipt_1.jpg')
    print("Created test_receipt_1.jpg")
    
    img2 = Image.new('RGB', (600, 300), color='white')
    d2 = ImageDraw.Draw(img2)
    text2 = [
        "CAFE COFFEE",
        "Order #678",
        "02/14/2024",
        "Coffee: $4.50",
        "Sandwich: $8.99",
        "------------------------",
        "Amount: $13.49",
        "Tax: $1.08",
        "Total Amount: $14.57"
    ]
    
    y = 50
    for line in text2:
        d2.text((50, y), line, fill='black')
        y += 25
    
    img2.save('test_receipt_2.jpg')
    print("Created test_receipt_2.jpg")
    
    img3 = Image.new('RGB', (400, 200), color='white')
    d3 = ImageDraw.Draw(img3)
    text3 = [
        "STORE",
        "Item1: $10",
        "Item2: $20",
        "Total: $30"
    ]
    
    y = 50
    for line in text3:
        d3.text((50, y), line, fill='black')
        y += 30
    
    img3.save('test_receipt_3.jpg')
    print("Created test_receipt_3.jpg")
    
    return ['test_receipt_1.jpg', 'test_receipt_2.jpg', 'test_receipt_3.jpg']

def debug_ocr_extraction():
    """Debug what OCR is extracting and why totals aren't found"""
    scanner = ReceiptScanner()
    
    test_files = create_sample_receipts()
    
    print("\n" + "="*60)
    print("DEBUGGING OCR EXTRACTION")
    print("="*60)
    
    for i, file in enumerate(test_files, 1):
        print(f"\n\nTesting file {i}: {file}")
        print("-"*40)
        
        img = Image.open(file)
        
        text = scanner.extract_text(img)
        print(f"Extracted Text:\n{text}")
        
        data = scanner.parse_receipt(text)
        print(f"\nParsed Data:")
        print(f"  Merchant: {data.get('merchant')}")
        print(f"  Date: {data.get('date')}")
        print(f"  Total: {data.get('total')}")
        print(f"  Type of total: {type(data.get('total'))}")
        
        print("\nPattern Matching Debug:")
        
        total_patterns = [
            r'TOTAL\s*[\$£€]?\s*([\d,]+\.?\d{0,2})',
            r'Total\s*[\$£€]?\s*([\d,]+\.?\d{0,2})',
            r'Amount Due\s*[\$£€]?\s*([\d,]+\.?\d{0,2})',
            r'Amount\s*[\$£€]?\s*([\d,]+\.?\d{0,2})',
            r'Grand Total\s*[\$£€]?\s*([\d,]+\.?\d{0,2})',
            r'[\$£€]\s*([\d,]+\.?\d{0,2})\s*$',
            r'Total\s*Amount\s*[\$£€]?\s*([\d,]+\.?\d{0,2})',
            r'Final\s*[\$£€]?\s*([\d,]+\.?\d{0,2})',
            r'Balance\s*[\$£€]?\s*([\d,]+\.?\d{0,2})',
            r'Pay\s*[\$£€]?\s*([\d,]+\.?\d{0,2})'
        ]
        
        for pattern in total_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                print(f"  ✓ Matched pattern: {pattern}")
                print(f"    Captured group: {match.group(1)}")
                try:
                    amount = match.group(1).replace(',', '').strip()
                    float_amount = float(amount)
                    print(f"    Converted to float: {float_amount}")
                except Exception as e:
                    print(f"    Conversion failed: {e}")
    
    # Clean up
    print("\n\nCleaning up test files...")
    for file in test_files:
        if os.path.exists(file):
            os.remove(file)
            print(f"Deleted {file}")

if __name__ == "__main__":

    debug_ocr_extraction()
