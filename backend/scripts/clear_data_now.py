"""
Quick data clear script - No confirmations (USE WITH CAUTION!)
This immediately clears all data from the database.
"""
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models import Company, User, Product, Supplier, Transaction, DynamicColumn


def clear_now():
    db = SessionLocal()
    
    try:
        print("Counting records...")
        tx_count = db.query(Transaction).count()
        prod_count = db.query(Product).count()
        supp_count = db.query(Supplier).count()
        dc_count = db.query(DynamicColumn).count()
        user_count = db.query(User).count()
        comp_count = db.query(Company).count()
        
        total = tx_count + prod_count + supp_count + dc_count + user_count + comp_count
        
        print(f"\nDeleting {total} total records...")
        print(f"  Transactions: {tx_count}")
        print(f"  Products: {prod_count}")
        print(f"  Suppliers: {supp_count}")
        print(f"  Users: {user_count}")
        print(f"  Companies: {comp_count}")
        print(f"  Dynamic Columns: {dc_count}")
        
        # Delete in order
        db.query(Transaction).delete()
        db.query(Product).delete()
        db.query(Supplier).delete()
        db.query(DynamicColumn).delete()
        db.query(User).delete()
        db.query(Company).delete()
        
        db.commit()
        
        print("\n✅ All data deleted successfully!")
        print("\nVerifying...")
        print(f"  Companies: {db.query(Company).count()}")
        print(f"  Users: {db.query(User).count()}")
        print(f"  Products: {db.query(Product).count()}")
        print(f"  Suppliers: {db.query(Supplier).count()}")
        print(f"  Transactions: {db.query(Transaction).count()}")
        
        print("\n🎯 Database is now empty and ready for production!")
        print("Run: python scripts/create_super_admin.py")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    clear_now()
