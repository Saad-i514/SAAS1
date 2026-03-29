"""
PRODUCTION DATA RESET SCRIPT
⚠️  WARNING: This will DELETE ALL DATA from your database!

This script safely clears all data while preserving the database structure.
Use this to start fresh with a clean production database.

Usage:
    python scripts/clear_production_data.py

Safety features:
    - Requires explicit confirmation
    - Shows data counts before deletion
    - Respects foreign key constraints
    - Preserves database schema
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models import Company, User, Product, Supplier, Transaction, DynamicColumn


def show_current_data(db):
    """Display current data counts."""
    print("\n📊 Current Database Contents:")
    print("=" * 50)
    print(f"Companies:      {db.query(Company).count()}")
    print(f"Users:          {db.query(User).count()}")
    print(f"Products:       {db.query(Product).count()}")
    print(f"Suppliers:      {db.query(Supplier).count()}")
    print(f"Transactions:   {db.query(Transaction).count()}")
    print(f"Dynamic Columns: {db.query(DynamicColumn).count()}")
    print("=" * 50)


def clear_all_data():
    """Clear all data from the database."""
    db = SessionLocal()
    
    try:
        # Show current data
        show_current_data(db)
        
        total_records = (
            db.query(Company).count() +
            db.query(User).count() +
            db.query(Product).count() +
            db.query(Supplier).count() +
            db.query(Transaction).count() +
            db.query(DynamicColumn).count()
        )
        
        if total_records == 0:
            print("\n✅ Database is already empty. Nothing to clear.")
            return
        
        print(f"\n⚠️  TOTAL RECORDS TO DELETE: {total_records}")
        print("\n🚨 WARNING: This action CANNOT be undone!")
        print("All companies, users, products, suppliers, and transactions will be permanently deleted.")
        
        # First confirmation
        confirm1 = input("\nType 'DELETE ALL DATA' to continue: ")
        if confirm1 != "DELETE ALL DATA":
            print("❌ Aborted. No data was deleted.")
            return
        
        # Second confirmation
        confirm2 = input("\nAre you absolutely sure? Type 'YES' to confirm: ")
        if confirm2 != "YES":
            print("❌ Aborted. No data was deleted.")
            return
        
        print("\n🗑️  Deleting all data...")
        print("=" * 50)
        
        # Delete in correct order (respects foreign key constraints)
        # 1. Transactions (references suppliers and companies)
        tx_count = db.query(Transaction).count()
        if tx_count > 0:
            db.query(Transaction).delete()
            print(f"✅ Deleted {tx_count} transactions")
        
        # 2. Products (references companies)
        prod_count = db.query(Product).count()
        if prod_count > 0:
            db.query(Product).delete()
            print(f"✅ Deleted {prod_count} products")
        
        # 3. Suppliers (references companies)
        supp_count = db.query(Supplier).count()
        if supp_count > 0:
            db.query(Supplier).delete()
            print(f"✅ Deleted {supp_count} suppliers")
        
        # 4. Dynamic Columns (references companies)
        dc_count = db.query(DynamicColumn).count()
        if dc_count > 0:
            db.query(DynamicColumn).delete()
            print(f"✅ Deleted {dc_count} dynamic columns")
        
        # 5. Users (references companies)
        user_count = db.query(User).count()
        if user_count > 0:
            db.query(User).delete()
            print(f"✅ Deleted {user_count} users")
        
        # 6. Companies (no dependencies)
        comp_count = db.query(Company).count()
        if comp_count > 0:
            db.query(Company).delete()
            print(f"✅ Deleted {comp_count} companies")
        
        # Commit all deletions
        db.commit()
        
        print("=" * 50)
        print("\n✅ ALL DATA DELETED SUCCESSFULLY!")
        
        # Verify database is empty
        show_current_data(db)
        
        print("\n🎯 Next Steps:")
        print("1. Run: python scripts/create_super_admin.py")
        print("2. Create your first company and admin user")
        print("3. Start using the application with clean data")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        print("Database rolled back. No changes were made.")
    finally:
        db.close()


if __name__ == "__main__":
    print("\n" + "=" * 50)
    print("🗑️  PRODUCTION DATA RESET")
    print("=" * 50)
    print("\n⚠️  This script will DELETE ALL DATA from your database!")
    print("The database structure (tables, columns) will remain intact.")
    print("\nThis is useful for:")
    print("  • Removing test data before going live")
    print("  • Starting fresh with a clean database")
    print("  • Resetting to initial state")
    
    proceed = input("\nDo you want to continue? (yes/no): ")
    if proceed.lower() not in ['yes', 'y']:
        print("❌ Aborted. No data was deleted.")
        sys.exit(0)
    
    clear_all_data()
