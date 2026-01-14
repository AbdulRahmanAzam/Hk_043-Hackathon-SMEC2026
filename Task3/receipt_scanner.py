# receipt_scanner_enhanced.py
"""
Enhanced receipt scanner with better total amount detection
"""
import cv2
import numpy as np
from PIL import Image
import pytesseract
import re
from datetime import datetime
import os

class ReceiptScanner:
    def __init__(self):
        self.set_tesseract_path()
        self.tesseract_config = r'--oem 3 --psm 6'
        
    def set_tesseract_path(self):
        """Set Tesseract path"""
        possible_paths = [
            r'C:\Tesseract-OCR\tesseract.exe',
            r'C:\Program Files\Tesseract-OCR\tesseract.exe',
            r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
            r'/usr/bin/tesseract',
            r'/usr/local/bin/tesseract'
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                print(f"✓ Tesseract found at: {path}")
                return
        
        print("⚠️ Tesseract not found. Using demo mode.")

    def preprocess_image(self, image):
        """Enhanced image preprocessing for better OCR results"""
        try:
            if isinstance(image, Image.Image):
                img_array = np.array(image)
                if len(img_array.shape) == 3:
                    img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            else:
                img_array = image
            
            # Convert to grayscale
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
            else:
                gray = img_array
            
            # Apply adaptive thresholding for better text contrast
            thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                          cv2.THRESH_BINARY, 11, 2)
            
            # Denoise
            denoised = cv2.medianBlur(thresh, 3)
            
            # Apply dilation to make text more visible
            kernel = np.ones((1, 1), np.uint8)
            dilated = cv2.dilate(denoised, kernel, iterations=1)
            
            return Image.fromarray(dilated)
            
        except Exception as e:
            print(f"Preprocessing error: {e}")
            return image

    def extract_text(self, image):
        """Extract text with multiple OCR configurations"""
        try:
            processed_img = self.preprocess_image(image)
            
            # Try different PSM modes for better results
            configs = [
                r'--oem 3 --psm 6',  # Assume uniform block of text
                r'--oem 3 --psm 4',  # Assume single column of text of variable sizes
                r'--oem 3 --psm 3',  # Fully automatic page segmentation
                r'--oem 3 --psm 11'  # Sparse text
            ]
            
            all_text = ""
            for config in configs:
                try:
                    text = pytesseract.image_to_string(processed_img, config=config)
                    if text and len(text) > len(all_text):
                        all_text = text
                except Exception:
                    continue
            
            return all_text if all_text else "No text extracted"
            
        except Exception as e:
            print(f"OCR Error: {e}")
            return self.get_demo_receipt_text()
    
    def get_demo_receipt_text(self):
        """Return demo receipt text when OCR fails"""
        return """SUPERMARKET
Receipt #12345
Date: 2024-01-14
Time: 14:30:00
------------------------
Apples: $5.99
Bread: $3.50
Milk: $4.25
------------------------
Subtotal: $13.74
Tax: $1.10
TOTAL: $14.84
Thank you!"""
    
    def find_total_amount(self, text):
        """Find total amount robustly using multiple strategies for OCR text.

        Handles common OCR issues:
        - Spaces in numbers (1 00.50 -> 100.50)
        - Various currency symbols (including RM for Malaysian Ringgit)
        - Different total keyword variations and OCR errors
        - Fragmented/noisy OCR output
        """

        def clean_number_string(s):
            """Clean a number string from OCR artifacts."""
            if not s:
                return ""
            # Remove spaces within numbers
            s = re.sub(r'(\d)\s+(\d)', r'\1\2', s)
            s = re.sub(r'(\d)\s+(\d)', r'\1\2', s)  # Apply twice for multiple spaces
            # Remove currency symbols for parsing
            s = re.sub(r'[\$£€₹¥]', '', s)
            s = re.sub(r'\bRM\b', '', s, flags=re.IGNORECASE)
            # Replace comma as thousands separator
            s = s.replace(',', '')
            # Remove any remaining non-numeric except decimal point
            s = re.sub(r'[^\d.]', '', s)
            return s.strip()

        def parse_amt(s: str):
            """Parse amount string to float."""
            try:
                cleaned = clean_number_string(s)
                if not cleaned or cleaned == '.':
                    return None
                # Handle multiple decimal points (take first valid number)
                parts = cleaned.split('.')
                if len(parts) > 2:
                    cleaned = parts[0] + '.' + parts[1]
                val = float(cleaned)
                # Sanity check - receipts rarely have totals > 100000
                if val > 100000:
                    return None
                return val
            except Exception:
                return None

        # Join all lines for pattern matching, but also keep line-by-line
        full_text = text
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        if not lines:
            return None

        # === STRATEGY 1: Direct regex patterns on full text ===
        # These patterns look for "Total" followed by an amount
        direct_patterns = [
            # Total (RM) : 436.20 or Total {RM) : 436.20
            r'[Tt]otal\s*[\(\{]?\s*RM\s*[\)\}]?\s*[:\s]+(\d+[,.\s]*\d*)',
            # Total: 436.20 or TOTAL: 436.20
            r'[Tt][Oo][Tt][Aa][Ll]\s*[:\s]+[\$£€]?\s*(\d+[,.\s]*\d*)',
            # TotalAmtPayable: 6.35 (no space)
            r'[Tt]otal\s*[Aa]mt\s*[Pp]ayable\s*[:\s]+(\d+[,.\s]*\d*)',
            # Grand Total / Final Total
            r'[Gg]rand\s*[Tt]otal\s*[:\s]+[\$£€RM]*\s*(\d+[,.\s]*\d*)',
            r'[Ff]inal\s*[Tt]otal\s*[:\s]+[\$£€RM]*\s*(\d+[,.\s]*\d*)',
            # "incl GST" pattern (common in Malaysian receipts)
            r'incl\.?\s*GST\)?\.?\s*(\d+[,.\s]*\d*)',
            # TOTAL. or TOTAL followed by amount
            r'TOTAL\.?\s+(\d+\.\d{2})',
            # Amount with RM prefix: RM 45.00 or RM45.00
            r'\bRM\s*(\d+[,.\s]*\d*)',
        ]

        for pattern in direct_patterns:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            if matches:
                # Take the last match (usually the final total)
                for match in reversed(matches):
                    amt = parse_amt(match)
                    if amt is not None and 0.01 <= amt <= 50000:
                        return amt

        # === STRATEGY 2: Line-by-line analysis ===
        total_keywords = [
            'grand total', 'final total', 'total amount', 'amount payable',
            'amount due', 'balance due', 'net total', 'total due',
            'total payable', 'totalamtpayable', 'total amt',
            'total rounded', 'total incl', 'total (rm', 'total {rm',
            'jotal', 't0tal', 'tota1', 'totai',  # OCR errors
            'total:', 'total.',
            'total'  # Generic last
        ]
        
        skip_keywords = [
            'subtotal', 'sub total', 'sub-total', 'item total',
            'before tax', 'pretax', 'qty total'
        ]
        
        exclude_line_keywords = [
            'change', 'cash tendered', 'credit', 'debit', 'visa', 'master',
            'card', 'tender', 'gst summary', 'tax summary'
        ]

        def extract_amount_from_line(line):
            """Extract the most likely amount from a line."""
            # Patterns to find amounts
            patterns = [
                r'[\$£€]\s*([\d,.\s]+)',           # Currency symbol + amount
                r'\bRM\s*([\d,.\s]+)',              # Malaysian Ringgit
                r'[:\s]\s*([\d,]+\.\d{2})\b',       # Decimal format after : or space
                r'\b(\d{1,3}(?:,\d{3})*\.\d{2})\b', # Standard currency format
                r'\b(\d+\.\d{2})\b',                # Simple decimal
            ]
            
            amounts = []
            for pattern in patterns:
                matches = re.findall(pattern, line)
                for m in matches:
                    amt = parse_amt(m)
                    if amt is not None and 0.01 <= amt <= 50000:
                        amounts.append(amt)
            
            if amounts:
                # Return the largest amount on the line (usually the total)
                return max(amounts)
            return None

        # Scan from bottom to top looking for total lines
        for idx in range(len(lines) - 1, -1, -1):
            line = lines[idx]
            low = line.lower()
            
            # Skip lines that are clearly not totals
            if any(k in low for k in skip_keywords):
                continue
            if any(k in low for k in exclude_line_keywords):
                continue
            
            # Check for total keywords
            for keyword in total_keywords:
                if keyword in low:
                    # Double check not a subtotal
                    if 'sub' in low:
                        continue
                    
                    amt = extract_amount_from_line(line)
                    if amt is not None:
                        return amt
                    
                    # Try next line
                    if idx + 1 < len(lines):
                        amt = extract_amount_from_line(lines[idx + 1])
                        if amt is not None:
                            return amt
                    break

        # === STRATEGY 3: Find largest decimal amount in bottom portion ===
        # Look at the last 20 lines
        bottom_amounts = []
        for idx in range(len(lines) - 1, max(-1, len(lines) - 25), -1):
            line = lines[idx]
            low = line.lower()
            
            # Skip certain lines
            if any(k in low for k in skip_keywords + ['change', 'cash', 'gst summary']):
                continue
            
            amt = extract_amount_from_line(line)
            if amt is not None and 1.0 <= amt <= 50000:
                bottom_amounts.append((amt, idx))

        if bottom_amounts:
            # Sort by amount descending
            bottom_amounts.sort(key=lambda x: x[0], reverse=True)
            return bottom_amounts[0][0]

        # === STRATEGY 4: Any decimal number in text ===
        all_decimals = re.findall(r'\b(\d+\.\d{2})\b', full_text)
        valid = []
        for d in all_decimals:
            try:
                v = float(d)
                if 1.0 <= v <= 10000:
                    valid.append(v)
            except:
                continue
        
        if valid:
            return max(valid)

        return None
    
    def find_date(self, text):
        """Find date in text"""
        date_patterns = [
            r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',
            r'\d{4}-\d{2}-\d{2}',
            r'\d{1,2}\s+[A-Za-z]{3}\s+\d{4}',
            r'Date\s*[:]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'DATE\s*[:]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
        ]
        
        for pattern in date_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return matches[0]
        
        return datetime.now().strftime('%Y-%m-%d')
    
    def find_merchant(self, text):
        """Find merchant name in text"""
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if line and len(line) > 2:
                # Skip common headers
                lower_line = line.lower()
                skip_words = ['receipt', 'invoice', 'thank', 'date', 'time', 'total', 
                             'subtotal', 'tax', 'cash', 'change', 'card', 'visa']
                if not any(word in lower_line for word in skip_words):
                    # Check if line looks like a merchant name (not all numbers/symbols)
                    if re.search(r'[A-Za-z]', line):
                        return line[:50]  # Limit length
        
        return "Unknown Merchant"
    
    def parse_receipt(self, text):
        """Parse receipt text with enhanced extraction"""
        print("\n=== OCR EXTRACTION DEBUG ===")
        print(f"Raw text:\n{text[:500]}...")
        
        data = {
            'date': self.find_date(text),
            'total': self.find_total_amount(text),
            'merchant': self.find_merchant(text),
            'items': [],
            'tax': None,
            'subtotal': None,
            'raw_text': text[:1000]  # Store first 1000 chars for debugging
        }
        
        # Try to find subtotal and tax
        subtotal_patterns = [
            r'Subtotal\s*[\$£€]?\s*([\d,]+\.?\d{0,2})',
            r'SUB TOTAL\s*[\$£€]?\s*([\d,]+\.?\d{0,2})'
        ]
        
        tax_patterns = [
            r'Tax\s*[\$£€]?\s*([\d,]+\.?\d{0,2})',
            r'TAX\s*[\$£€]?\s*([\d,]+\.?\d{0,2})',
            r'GST\s*[\$£€]?\s*([\d,]+\.?\d{0,2})'
        ]
        
        for pattern in subtotal_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    data['subtotal'] = float(match.group(1).replace(',', ''))
                    break
                except:
                    continue
        
        for pattern in tax_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    data['tax'] = float(match.group(1).replace(',', ''))
                    break
                except:
                    continue

        # If total looks missing or implausible but we have subtotal and tax,
        # compute total from them.
        if (data['total'] is None or (isinstance(data['total'], (int, float)) and data['total'] > 5000)) \
            and isinstance(data['subtotal'], (int, float)) and isinstance(data['tax'], (int, float)):
            data['total'] = round(data['subtotal'] + data['tax'], 2)
        
        print(f"Extracted data: {data}")
        print("=== END DEBUG ===\n")
        
        return data
    
    def scan_and_parse(self, image_path):
        """Complete scan and parse pipeline"""
        try:
            image = Image.open(image_path)
            text = self.extract_text(image)
            data = self.parse_receipt(text)
            return data
        except Exception as e:
            print(f"Error scanning {image_path}: {e}")
            return self.get_sample_data()

    def get_sample_data(self):
        """Return parsed data for demo text when scanning fails."""
        demo_text = self.get_demo_receipt_text()
        return self.parse_receipt(demo_text)

# Test function
def test_enhanced_scanner():
    """Test the enhanced scanner"""
    scanner = ReceiptScanner()
    
    # Test with sample text
    test_cases = [
        """WALMART
Receipt #123
Date: 01/14/2024
Items: $45.99
Tax: $3.68
TOTAL: $49.67""",
        
        """CAFE
Coffee: $4.50
Total Amount: $4.50""",
        
        """STORE
Item1: $10
Item2: $20
Total: $30""",
        
        """No total mentioned here
Just some text
Date: 2024-01-14""",
        
        """Receipt
Subtotal: $100.50
Tax: $8.04
Final Total: $108.54"""
    ]
    
    print("Testing Enhanced Receipt Scanner")
    print("="*60)
    
    for i, text in enumerate(test_cases, 1):
        print(f"\nTest {i}:")
        print(f"Input: {text[:50]}...")
        data = scanner.parse_receipt(text)
        print(f"Total found: {data.get('total')}")
        print(f"Merchant: {data.get('merchant')}")
        print(f"Date: {data.get('date')}")

if __name__ == "__main__":
    test_enhanced_scanner()