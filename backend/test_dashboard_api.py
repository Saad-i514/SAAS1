import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.models import User, Transaction, Product, Supplier
from app.api.endpoints.dashboard import get_dashboard_summary, get_dashboard_charts
from datetime import datetime

def test_dashboard():
    db = SessionLocal()
    
    try:
        # Get a user
        user = db.query(User).filter(User.email == "admin@meerab.com").first()
        if not user:
            print("❌ User not found")
            return
        
        print(f"✅ Testing with user: {user.email}")
        print(f"   Company ID: {user.company_id}")
        print(f"   Role: {user.role}")
        
        # Check data exists
        tx_count = db.query(Transaction).filter(Transaction.company_id == 1).count()
        prod_count = db.query(Product).filter(Product.company_id == 1).count()
        supp_count = db.query(Supplier).filter(Supplier.company_id == 1).count()
        
        print(f"\n📊 Database Stats:")
        print(f"   Transactions: {tx_count}")
        print(f"   Products: {prod_count}")
        print(f"   Suppliers: {supp_count}")
        
        if tx_count == 0:
            print("\n❌ No transactions found! Run seed_pkr_data.py first")
            return
        
        # Test dashboard summary
        print(f"\n🔍 Testing dashboard summary...")
        try:
            # Create a mock current_user object
            class MockUser:
                def __init__(self, user):
                    self.id = user.id
                    self.email = user.email
                    self.company_id = user.company_id
                    self.role = user.role
                    self.is_active = user.is_active
            
            mock_user = MockUser(user)
            summary = get_dashboard_summary(timeframe="monthly", db=db, current_user=mock_user)
            
            print(f"✅ Dashboard Summary Response:")
            for key, value in summary.items():
                print(f"   {key}: {value}")
            
        except Exception as e:
            print(f"❌ Dashboard summary failed: {e}")
            import traceback
            traceback.print_exc()
        
        # Test charts
        print(f"\n🔍 Testing dashboard charts...")
        try:
            charts = get_dashboard_charts(db=db, current_user=mock_user)
            print(f"✅ Dashboard Charts Response:")
            print(f"   Monthly sales data points: {len(charts.get('monthly_sales', []))}")
            print(f"   Sales distribution: {len(charts.get('sales_distribution', []))}")
            print(f"   Top products: {len(charts.get('top_products', []))}")
            
        except Exception as e:
            print(f"❌ Dashboard charts failed: {e}")
            import traceback
            traceback.print_exc()
            
    finally:
        db.close()

if __name__ == "__main__":
    test_dashboard()
