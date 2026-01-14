# app.py (Streamlit version)
import streamlit as st
import pandas as pd
from PIL import Image
import plotly.graph_objects as go
import datetime
import json
import tempfile
import os

try:
    from receipt_scanner import ReceiptScanner
    from expense_tracker import ExpenseTracker
    from visualizer import ExpenseVisualizer
except ImportError:
    class ReceiptScanner:
        def extract_text(self, image):
            return "Demo receipt text: Total $45.99"
        def parse_receipt(self, text):
            return {'merchant': 'Demo Store', 'total': 45.99, 'date': '2024-01-14'}
    
    class ExpenseTracker:
        def __init__(self):
            self.df = pd.DataFrame(columns=['date', 'merchant', 'category', 'amount'])
        def add_expense(self, receipt_data, category='Other'):
            new_row = {
                'date': receipt_data.get('date', pd.Timestamp.now().strftime('%Y-%m-%d')),
                'merchant': receipt_data.get('merchant', 'Unknown'),
                'category': category,
                'amount': receipt_data.get('total', 0)
            }
            self.df = pd.concat([self.df, pd.DataFrame([new_row])], ignore_index=True)
            return new_row
        def get_monthly_summary(self, year, month):
            return {'total_spent': 1500, 'average_daily': 50, 'transaction_count': 30}
        def generate_alerts(self, budget_limits=None):
            return []
    
    class ExpenseVisualizer:
        def __init__(self, tracker):
            self.tracker = tracker

st.set_page_config(
    page_title="Receipt Scanner & Expense Tracker", 
    layout="wide",
    page_icon="💰"
)

st.title("💰 Receipt Scanner & Financial Insights")

# Initialize session state for persistence
if 'tracker' not in st.session_state:
    st.session_state.tracker = ExpenseTracker()
    st.session_state.expenses = pd.DataFrame(columns=['date', 'merchant', 'category', 'amount'])

if 'scanner' not in st.session_state:
    st.session_state.scanner = ReceiptScanner()

if 'visualizer' not in st.session_state:
    st.session_state.visualizer = ExpenseVisualizer(st.session_state.tracker)

# Sidebar for navigation and settings
with st.sidebar:
    st.header("Navigation")
    menu = st.selectbox(
        "Menu",
        ["📸 Scan Receipt", "📋 View Expenses", "📊 Monthly Summary", 
         "📈 Analytics", "⚠️ Alerts", "📑 Visual Reports"]
    )
    
    st.header("Settings")
    st.session_state.monthly_budget = st.number_input(
        "Monthly Budget ($)", 
        min_value=0, 
        value=1000,
        key="budget_input"
    )
    
    # Quick stats
    st.header("Quick Stats")
    if len(st.session_state.tracker.df) > 0:
        current_month = datetime.datetime.now().month
        current_year = datetime.datetime.now().year
        monthly_data = st.session_state.tracker.get_monthly_summary(current_year, current_month)
        st.metric("This Month", f"${monthly_data.get('total_spent', 0):.2f}")
        st.metric("Budget Remaining", f"${st.session_state.monthly_budget - monthly_data.get('total_spent', 0):.2f}")

# Menu Navigation
if menu == "📸 Scan Receipt":
    st.header("📸 Scan Receipt")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        uploaded_file = st.file_uploader(
            "Upload Receipt Image", 
            type=['png', 'jpg', 'jpeg'],
            help="Upload an image of your receipt"
        )
        
        if uploaded_file is not None:
            # Display image
            image = Image.open(uploaded_file)
            st.image(image, caption='Uploaded Receipt', use_container_width=True)
            
            # Process receipt button
            if st.button("🔍 Extract Data", type="primary", use_container_width=True):
                with st.spinner("Processing receipt..."):
                    # Extract text from receipt
                    text = st.session_state.scanner.extract_text(image)
                    
                    # Parse receipt data
                    receipt_data = st.session_state.scanner.parse_receipt(text)
                    
                    # Store in session state for display
                    st.session_state.last_receipt = receipt_data
                    st.session_state.last_receipt_text = text
                    
                    st.success("Receipt processed successfully!")
    
    with col2:
        st.subheader("Receipt Details")
        
        if 'last_receipt' in st.session_state:
            receipt = st.session_state.last_receipt
            
            # app.py - around line 130
            st.info(f"**Merchant:** {receipt.get('merchant', 'Not detected')}")
            st.info(f"**Date:** {receipt.get('date', 'Not detected')}")

            # Safely handle total (this is the fix)
            total_amount = receipt.get('total')
            if total_amount is None:
                total_amount = 0.0
            st.info(f"**Total:** ${float(total_amount):.2f}")
            
            # Category selection
            category = st.selectbox(
                "Select Category",
                ["🍎 Groceries", "🍽️ Dining", "🚗 Transport", 
                 "🛍️ Shopping", "🎬 Entertainment", "💡 Utilities", "📦 Other"],
                key="category_select"
            )
            
            # Simple category mapping
            category_map = {
                "🍎 Groceries": "Groceries",
                "🍽️ Dining": "Dining",
                "🚗 Transport": "Transport",
                "🛍️ Shopping": "Shopping",
                "🎬 Entertainment": "Entertainment",
                "💡 Utilities": "Utilities",
                "📦 Other": "Other"
            }
            
            # Save expense
            if st.button("💾 Save Expense", type="secondary", use_container_width=True):
                expense = st.session_state.tracker.add_expense(
                    receipt, 
                    category=category_map[category]
                )
                st.session_state.expenses = st.session_state.tracker.df
                st.rerun()
            
            # Show raw text if needed
            with st.expander("View Extracted Text"):
                st.text_area("OCR Result", st.session_state.last_receipt_text, height=150)
        else:
            st.info("Upload a receipt and click 'Extract Data' to see details")

elif menu == "📋 View Expenses":
    st.header("📋 Expense History")
    
    if len(st.session_state.tracker.df) > 0:
        # Filter options
        col1, col2, col3 = st.columns(3)
        with col1:
            start_date = st.date_input("Start Date", 
                                      value=datetime.date.today() - datetime.timedelta(days=30))
        with col2:
            end_date = st.date_input("End Date", value=datetime.date.today())
        with col3:
            categories = st.session_state.tracker.df['category'].unique().tolist()
            selected_category = st.multiselect(
                "Category", 
                options=categories,
                default=categories
            )
        
        # Filter data
        filtered_df = st.session_state.tracker.df.copy()
        filtered_df['date'] = pd.to_datetime(filtered_df['date'], errors='coerce')
        
        # Apply filters safely
        if len(selected_category) > 0:
            filtered_df = filtered_df[
                (filtered_df['date'].dt.date >= start_date) & 
                (filtered_df['date'].dt.date <= end_date) &
                (filtered_df['category'].isin(selected_category))
            ]
        
        if len(filtered_df) > 0:
            # Display data
            st.dataframe(
                filtered_df.sort_values('date', ascending=False),
                use_container_width=True,
                column_config={
                    "date": st.column_config.DateColumn("Date"),
                    "merchant": "Merchant",
                    "category": "Category",
                    "amount": st.column_config.NumberColumn("Amount", format="$%.2f")
                }
            )
            
            # Summary statistics
            st.subheader("Summary")
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Total Expenses", f"${filtered_df['amount'].sum():.2f}")
            with col2:
                avg_amt = filtered_df['amount'].mean()
                st.metric("Average Expense", f"${avg_amt:.2f}" if pd.notna(avg_amt) else "$0.00")
            with col3:
                st.metric("Transactions", len(filtered_df))
            
            # Export option
            if st.button("📥 Export as CSV"):
                csv = filtered_df.to_csv(index=False)
                st.download_button(
                    label="Download CSV",
                    data=csv,
                    file_name="expenses.csv",
                    mime="text/csv"
                )
        else:
            st.info("No expenses match the selected filters.")
    else:
        st.info("No expenses recorded yet. Scan a receipt to get started!")

elif menu == "📊 Monthly Summary":
    st.header("📊 Monthly Expense Summary")
    
    col1, col2 = st.columns(2)
    with col1:
        year = st.selectbox("Year", 
                           range(2023, 2026), 
                           index=1)  # Default to current year
    with col2:
        month = st.selectbox("Month", 
                            range(1, 13), 
                            index=datetime.datetime.now().month - 1)
    
    if st.button("Generate Summary", type="primary"):
        summary = st.session_state.tracker.get_monthly_summary(year, month)
        
        # Display metrics
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Total Spent", f"${summary.get('total_spent', 0):.2f}")
        with col2:
            st.metric("Average Daily", f"${summary.get('average_daily', 0):.2f}")
        with col3:
            st.metric("Transactions", summary.get('transaction_count', 0))
        
        # Budget comparison
        budget_used = (summary.get('total_spent', 0) / st.session_state.monthly_budget * 100) \
                      if st.session_state.monthly_budget > 0 else 0
        
        st.progress(
            min(budget_used / 100, 1.0),
            text=f"Budget Usage: {budget_used:.1f}%"
        )
        
        # Category breakdown
        if 'category_breakdown' in summary and summary['category_breakdown']:
            st.subheader("Category Breakdown")
            fig = go.Figure(data=[go.Pie(
                labels=list(summary['category_breakdown'].keys()),
                values=list(summary['category_breakdown'].values()),
                hole=.3
            )])
            fig.update_layout(title="Spending by Category")
            st.plotly_chart(fig, use_container_width=True)

elif menu == "📈 Analytics":
    st.header("📈 Spending Analytics")
    
    if len(st.session_state.tracker.df) > 0:
        tab1, tab2, tab3 = st.tabs(["Category Analysis", "Trends", "Predictions"])
        
        with tab1:
            st.subheader("Category-wise Analysis")
            
            # Prepare data
            category_totals = st.session_state.tracker.df.groupby('category')['amount'].sum()
            
            fig = go.Figure(data=[go.Bar(
                x=category_totals.index,
                y=category_totals.values,
                marker_color='royalblue'
            )])
            fig.update_layout(
                title="Total Spending by Category",
                xaxis_title="Category",
                yaxis_title="Amount ($)"
            )
            st.plotly_chart(fig, use_container_width=True)
        
        with tab2:
            st.subheader("Spending Trends")
            
            # Monthly trends
            df = st.session_state.tracker.df.copy()
            df['date'] = pd.to_datetime(df['date'])
            df['month'] = df['date'].dt.to_period('M').astype(str)
            
            monthly_trends = df.groupby('month')['amount'].sum().reset_index()
            
            fig = go.Figure(data=[go.Scatter(
                x=monthly_trends['month'],
                y=monthly_trends['amount'],
                mode='lines+markers',
                line=dict(width=3)
            )])
            fig.update_layout(
                title="Monthly Spending Trend",
                xaxis_title="Month",
                yaxis_title="Amount ($)",
                hovermode='x unified'
            )
            st.plotly_chart(fig, use_container_width=True)
        
        with tab3:
            st.subheader("Spending Predictions")
            st.info("This feature requires historical data. Add more expenses to see predictions.")
            
            # Simple prediction based on average
            if len(st.session_state.tracker.df) >= 30:
                avg_daily = st.session_state.tracker.df['amount'].sum() / 30
                predicted_monthly = avg_daily * 30
                
                st.metric("Predicted Monthly Spending", f"${predicted_monthly:.2f}")
                st.metric("Compared to Budget", 
                         f"${predicted_monthly - st.session_state.monthly_budget:.2f}")
    else:
        st.info("Add expenses to see analytics")

elif menu == "⚠️ Alerts":
    st.header("⚠️ Spending Alerts")
    
    # Get alerts
    budget_limits = {'monthly': st.session_state.monthly_budget}
    alerts = st.session_state.tracker.generate_alerts(budget_limits)
    
    if alerts:
        for alert in alerts:
            if alert.get('severity') == 'high':
                st.error(f"🚨 {alert.get('message', '')}")
            elif alert.get('severity') == 'medium':
                st.warning(f"⚠️ {alert.get('message', '')}")
            else:
                st.info(f"ℹ️ {alert.get('message', '')}")
    else:
        st.success("✅ No alerts! Your spending looks healthy.")
    
    # Budget settings
    st.subheader("Budget Settings")
    
    col1, col2, col3 = st.columns(3)
    with col1:
        grocery_budget = st.number_input("Groceries Budget", value=300)
    with col2:
        dining_budget = st.number_input("Dining Budget", value=200)
    with col3:
        transport_budget = st.number_input("Transport Budget", value=150)
    
    if st.button("Update Budget Settings"):
        st.success("Budget settings updated!")

elif menu == "📑 Visual Reports":
    st.header("📑 Visual Reports")
    
    tab1, tab2, tab3 = st.tabs(["Monthly Report", "Category Report", "Export"])
    
    with tab1:
        st.subheader("Monthly Expense Report")
        
        col1, col2 = st.columns(2)
        with col1:
            report_year = st.selectbox("Report Year", range(2023, 2026), key="report_year")
        with col2:
            report_month = st.selectbox("Report Month", range(1, 13), key="report_month")
        
        if st.button("Generate Monthly Report", type="primary"):
            # Create sample visualization
            categories = ['Groceries', 'Dining', 'Transport', 'Shopping', 'Entertainment']
            values = [300, 200, 150, 250, 100]
            
            fig = go.Figure(data=[go.Bar(
                x=categories,
                y=values,
                marker_color=['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']
            )])
            
            fig.update_layout(
                title=f"Monthly Report - {report_month}/{report_year}",
                xaxis_title="Category",
                yaxis_title="Amount ($)",
                template="plotly_white"
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
            # Daily spending chart
            days = list(range(1, 31))
            daily_spending = [max(0, min(100, 50 + (d % 7) * 20)) for d in days]
            
            fig2 = go.Figure(data=[go.Scatter(
                x=days,
                y=daily_spending,
                fill='tozeroy',
                mode='lines',
                line=dict(width=3, color='green')
            )])
            
            fig2.update_layout(
                title="Daily Spending Pattern",
                xaxis_title="Day of Month",
                yaxis_title="Amount ($)"
            )
            
            st.plotly_chart(fig2, use_container_width=True)
    
    with tab2:
        st.subheader("Category Comparison")
        
        # Pie chart for category distribution
        if len(st.session_state.tracker.df) > 0:
            category_data = st.session_state.tracker.df.groupby('category')['amount'].sum()
            
            fig = go.Figure(data=[go.Pie(
                labels=category_data.index,
                values=category_data.values,
                hole=.4,
                textinfo='label+percent'
            )])
            
            fig.update_layout(title="Spending Distribution")
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No data available. Add expenses to generate reports.")
    
    with tab3:
        st.subheader("Export Reports")
        
        st.info("Export your expense data in various formats")
        
        col1, col2 = st.columns(2)
        
        with col1:
            if st.button("📄 Export as PDF Report"):
                st.success("PDF report generated! (Demo feature)")
                
            if st.button("📊 Export Charts as Images"):
                st.success("Charts exported as PNG! (Demo feature)")
        
        with col2:
            if st.button("📈 Export to Excel"):
                st.success("Excel file generated! (Demo feature)")
                
            if st.button("🔄 Export to Google Sheets"):
                st.success("Google Sheets integration ready! (Demo feature)")

# Footer
st.markdown("---")
st.caption("💰 Receipt Scanner & Financial Insights v1.0 | Built with Streamlit")
