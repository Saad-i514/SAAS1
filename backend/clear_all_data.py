import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.models import Transaction, Product, Supplier

def clear_all_data():
    db = SessionLocal()
    
    try:
        print("🗑️  Clearing all business data...")
        
        # Delete all transactions
        tx_count = db.query(Transaction).delete()
        print(f"   ✅ Deleted {tx_count} transactions")
        
        # Delete all products
        prod_count = db.query(Product).delete()
        print(f"   ✅ Deleted {prod_count} products")
        
        # Delete all suppliers
        supp_count = db.query(Supplier).delete()
        print(f"   ✅ Deleted {supp_count} suppliers")
        
        db.commit()
        print("\n✅ All data cleared successfully!")
        print("   Users and companies are preserved.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clear_all_data()
