# visualizer.py
import matplotlib.pyplot as plt
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd

class ExpenseVisualizer:
    def __init__(self, expense_tracker):
        self.tracker = expense_tracker
    
    def create_monthly_chart(self, year, month):
        """Create monthly expense visualization"""
        df = self.tracker.df.copy()
        
        if len(df) == 0:
            fig = go.Figure()
            fig.add_annotation(text="No expense data available", 
                             xref="paper", yref="paper",
                             x=0.5, y=0.5, showarrow=False)
            fig.update_layout(title=f'Expense Report - {month}/{year}')
            return fig
        
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        
        mask = (df['date'].dt.year == year) & (df['date'].dt.month == month)
        monthly_data = df[mask]
        
        if len(monthly_data) == 0:
            fig = go.Figure()
            fig.add_annotation(text="No data for selected month", 
                             xref="paper", yref="paper",
                             x=0.5, y=0.5, showarrow=False)
            fig.update_layout(title=f'Expense Report - {month}/{year}')
            return fig
        
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=('Daily Spending', 'Category Breakdown', 
                          'Payment Methods', 'Top Merchants'),
            specs=[[{'type': 'bar'}, {'type': 'pie'}],
                   [{'type': 'bar'}, {'type': 'table'}]]
        )
        
        # Daily spending
        daily_totals = monthly_data.groupby(monthly_data['date'].dt.day)['amount'].sum()
        fig.add_trace(
            go.Bar(x=daily_totals.index.tolist(), y=daily_totals.values.tolist(), name='Daily'),
            row=1, col=1
        )
        
        # Category breakdown
        category_totals = monthly_data.groupby('category')['amount'].sum()
        if len(category_totals) > 0:
            fig.add_trace(
                go.Pie(labels=category_totals.index.tolist(), values=category_totals.values.tolist()),
                row=1, col=2
            )
        
        # Payment methods
        if 'payment_method' in monthly_data.columns:
            payment_totals = monthly_data.groupby('payment_method')['amount'].sum()
            fig.add_trace(
                go.Bar(x=payment_totals.index.tolist(), y=payment_totals.values.tolist()),
                row=2, col=1
            )
        
        # Top merchants table
        top_merchants = monthly_data.groupby('merchant')['amount'].sum().nlargest(5)
        fig.add_trace(
            go.Table(
                header=dict(values=['Merchant', 'Amount']),
                cells=dict(values=[top_merchants.index.tolist(), 
                                 [f'${x:.2f}' for x in top_merchants.values]])
            ),
            row=2, col=2
        )
        
        fig.update_layout(height=800, showlegend=False, 
                         title_text=f'Expense Report - {month}/{year}')
        return fig
    
    def create_trend_analysis(self):
        """Create spending trend visualization"""
        df = self.tracker.df.copy()
        
        if len(df) == 0:
            fig = go.Figure()
            fig.add_annotation(text="No expense data available", 
                             xref="paper", yref="paper",
                             x=0.5, y=0.5, showarrow=False)
            fig.update_layout(title='Spending Trends Over Time')
            return fig
        
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df = df.dropna(subset=['date'])
        df['month_year'] = df['date'].dt.to_period('M')
        
        monthly_trends = df.groupby('month_year')['amount'].sum()
        
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=[str(x) for x in monthly_trends.index],
            y=monthly_trends.values.tolist(),
            mode='lines+markers',
            name='Monthly Spending'
        ))
        
        # Add 3-month moving average if enough data
        if len(monthly_trends) >= 3:
            moving_avg = monthly_trends.rolling(window=3).mean()
            fig.add_trace(go.Scatter(
                x=[str(x) for x in moving_avg.index],
                y=moving_avg.values.tolist(),
                mode='lines',
                name='3-Month Average',
                line=dict(dash='dash')
            ))
        
        fig.update_layout(
            title='Spending Trends Over Time',
            xaxis_title='Month',
            yaxis_title='Amount ($)',
            hovermode='x unified'
        )
        
        return fig
    
    def create_category_chart(self):
        """Create category breakdown chart"""
        df = self.tracker.df.copy()
        
        if len(df) == 0:
            fig = go.Figure()
            fig.add_annotation(text="No expense data available",
                             xref="paper", yref="paper",
                             x=0.5, y=0.5, showarrow=False)
            return fig
        
        category_totals = df.groupby('category')['amount'].sum()
        
        fig = go.Figure(data=[go.Pie(
            labels=category_totals.index.tolist(),
            values=category_totals.values.tolist(),
            hole=.3,
            textinfo='label+percent'
        )])
        
        fig.update_layout(title='Spending by Category')
        return fig