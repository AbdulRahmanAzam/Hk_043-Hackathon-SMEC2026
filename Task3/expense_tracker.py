import pandas as pd
from datetime import datetime
import json
import os

class ExpenseTracker:
    def __init__(self, db_path='expenses.csv'):
        self.db_path = db_path
        self.load_expenses()
    
    def load_expenses(self):
        """Load expenses from database or file"""
        try:
            if os.path.exists(self.db_path):
                self.df = pd.read_csv(self.db_path)
                if 'date' in self.df.columns:
                    self.df['date'] = pd.to_datetime(self.df['date'], errors='coerce')
                if 'amount' in self.df.columns:
                    self.df['amount'] = pd.to_numeric(self.df['amount'], errors='coerce').fillna(0)
            else:
                self.df = pd.DataFrame(columns=[
                    'date', 'merchant', 'category', 'amount', 
                    'description', 'payment_method'
                ])
        except Exception as e:
            print(f"Error loading expenses: {e}")
            self.df = pd.DataFrame(columns=[
                'date', 'merchant', 'category', 'amount', 
                'description', 'payment_method'
            ])
    
    def add_expense(self, receipt_data, category=None, payment_method='Cash'):
        """Add new expense from receipt"""
        items = receipt_data.get('items', [])
        if items:
            description = ', '.join([item.get('name', '') for item in items[:3]])
            if len(items) > 3:
                description += f' (+{len(items) - 3} more)'
        else:
            merchant = receipt_data.get('merchant', 'Unknown')
            description = f'Purchase at {merchant}'
        
        expense = {
            'date': receipt_data.get('date', datetime.now().strftime('%Y-%m-%d')),
            'merchant': receipt_data.get('merchant', 'Unknown'),
            'category': category or self.categorize_expense(receipt_data.get('merchant', '')),
            'amount': float(receipt_data.get('total', 0) or 0),
            'description': description,
            'payment_method': payment_method
        }
        new_row = pd.DataFrame([expense])
        self.df = pd.concat([self.df, new_row], ignore_index=True)
        self.save_expenses()
        return expense
    
    def categorize_expense(self, merchant):
        """Categorize expense based on merchant"""
        if not merchant:
            return 'Other'
            
        categories = {
            'Groceries': ['supermarket', 'grocery', 'market', 'mart', 'fresh'],
            'Dining': ['restaurant', 'cafe', 'food', 'coffee', 'mcdonald', 'kfc', 'pizza'],
            'Transport': ['fuel', 'gas', 'taxi', 'uber', 'grab', 'train', 'petrol', 'shell', 'petronas'],
            'Shopping': ['mall', 'store', 'shop', 'retail', 'outlet'],
            'Entertainment': ['cinema', 'movie', 'theater', 'concert', 'game']
        }
        
        merchant_lower = merchant.lower()
        for category, keywords in categories.items():
            if any(keyword in merchant_lower for keyword in keywords):
                return category
        return 'Other'
    
    def get_monthly_summary(self, year=None, month=None):
        """Generate monthly expense summary"""
        if len(self.df) == 0:
            return {
                'total_spent': 0,
                'average_daily': 0,
                'category_breakdown': {},
                'top_merchants': {},
                'transaction_count': 0
            }
        
        df = self.df.copy()
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0)
        
        if year and month:
            mask = (df['date'].dt.year == year) & (df['date'].dt.month == month)
            df = df[mask]
        elif year:
            df = df[df['date'].dt.year == year]
        
        if len(df) == 0:
            return {
                'total_spent': 0,
                'average_daily': 0,
                'category_breakdown': {},
                'top_merchants': {},
                'transaction_count': 0
            }
        
        daily_sums = df.groupby(df['date'].dt.date)['amount'].sum()
        avg_daily = daily_sums.mean() if len(daily_sums) > 0 else 0
        
        try:
            merchant_sums = df.groupby('merchant')['amount'].sum()
            top_merchants = merchant_sums.nlargest(5).to_dict() if len(merchant_sums) > 0 else {}
        except Exception:
            top_merchants = {}
        
        summary = {
            'total_spent': float(df['amount'].sum()),
            'average_daily': float(avg_daily) if pd.notna(avg_daily) else 0,
            'category_breakdown': df.groupby('category')['amount'].sum().to_dict(),
            'top_merchants': top_merchants,
            'transaction_count': len(df)
        }
        
        return summary
    
    def generate_alerts(self, budget_limits=None):
        """Generate spending alerts"""
        alerts = []
        
        if len(self.df) == 0:
            return alerts
        
        try:
            monthly_summary = self.get_monthly_summary(
                datetime.now().year, 
                datetime.now().month
            )
            monthly_total = monthly_summary['total_spent']
            
            if budget_limits and 'monthly' in budget_limits:
                budget = budget_limits['monthly']
                if monthly_total > budget:
                    alerts.append({
                        'type': 'budget_exceeded',
                        'message': f'Monthly budget exceeded! Spent ${monthly_total:.2f} of ${budget:.2f}',
                        'severity': 'high'
                    })
                elif monthly_total > budget * 0.8:
                    alerts.append({
                        'type': 'budget_warning',
                        'message': f'Approaching budget limit! Spent ${monthly_total:.2f} of ${budget:.2f} (80%+)',
                        'severity': 'medium'
                    })
            
            df = self.df.copy()
            df['date'] = pd.to_datetime(df['date'], errors='coerce')
            df = df.dropna(subset=['date'])
            
            if len(df) >= 5:
                daily_avg = df.groupby(df['date'].dt.date)['amount'].sum().mean()
                recent_spending = df.tail(3)['amount'].sum()
                
                if daily_avg > 0 and recent_spending > daily_avg * 3:
                    alerts.append({
                        'type': 'unusual_spending',
                        'message': f'Unusually high spending detected recently (${recent_spending:.2f})',
                        'severity': 'medium'
                    })
            
            if len(df) > 0:
                category_totals = df.groupby('category')['amount'].sum()
                avg_category = category_totals.mean()
                for cat, amount in category_totals.items():
                    if amount > avg_category * 2:
                        alerts.append({
                            'type': 'category_overspend',
                            'message': f'High spending in {cat}: ${amount:.2f}',
                            'severity': 'low'
                        })
                        
        except Exception as e:
            print(f"Error generating alerts: {e}")
        
        return alerts
    
    def save_expenses(self):
        """Save expenses to database"""
        try:
            self.df.to_csv(self.db_path, index=False)
        except Exception as e:

            print(f"Error saving expenses: {e}")
