# main.py
from flask import Flask, request, jsonify, send_file
import io
import base64
from PIL import Image
from receipt_scanner import ReceiptScanner
from expense_tracker import ExpenseTracker
from visualizer import ExpenseVisualizer

app = Flask(__name__)

# Initialize components
scanner = ReceiptScanner()
tracker = ExpenseTracker()
visualizer = ExpenseVisualizer(tracker)

@app.route('/api/scan-receipt', methods=['POST'])
def scan_receipt():
    """API endpoint to scan receipt image"""
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    image_file = request.files['image']
    image = Image.open(image_file)
    
    # Extract text and parse receipt
    text = scanner.extract_text(image)
    receipt_data = scanner.parse_receipt(text)
    
    # Add to expense tracker
    expense = tracker.add_expense(receipt_data)
    
    return jsonify({
        'status': 'success',
        'receipt_data': receipt_data,
        'expense_recorded': expense
    })

@app.route('/api/monthly-summary/<int:year>/<int:month>', methods=['GET'])
def monthly_summary(year, month):
    """Get monthly expense summary"""
    summary = tracker.get_monthly_summary(year, month)
    return jsonify(summary)

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Get spending alerts"""
    budget_limits = request.json.get('budget_limits', {})
    alerts = tracker.generate_alerts(budget_limits)
    return jsonify({'alerts': alerts})

@app.route('/api/visual-report/<int:year>/<int:month>', methods=['GET'])
def visual_report(year, month):
    """Generate visual report"""
    fig = visualizer.create_monthly_chart(year, month)
    
    # Convert plot to image
    img_bytes = fig.to_image(format="png")
    return send_file(
        io.BytesIO(img_bytes),
        mimetype='image/png',
        as_attachment=True,
        download_name=f'report_{year}_{month}.png'
    )

@app.route('/api/trends', methods=['GET'])
def spending_trends():
    """Get spending trends"""
    fig = visualizer.create_trend_analysis()
    img_bytes = fig.to_image(format="png")
    return send_file(
        io.BytesIO(img_bytes),
        mimetype='image/png',
        as_attachment=True,
        download_name='spending_trends.png'
    )

if __name__ == '__main__':
    app.run(debug=True, port=5000)