import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.models import Company, User, RoleEnum, Supplier, Product, Transaction, TransactionTypeEnum
from app.core.security import get_password_hash
from datetime import datetime, timedelta
import random

def seed_complete_data():
    db = SessionLocal()
    
    try:
        print("🚀 Starting complete data seeding...")
        
        # 1. Ensure Company exists
        company = db.query(Company).filter(Company.id == 1).first()
        if not company:
            company = Company(id=1, name="Meerab Traders")
            db.add(company)
            db.commit()
            db.refresh(company)
            print(f"✅ Created company: {company.name}")
        else:
            print(f"✅ Company exists: {company.name}")
        
        # 2. Update all users to have company_id = 1
        users = db.query(User).all()
        for user in users:
            if user.company_id is None and user.role != RoleEnum.SUPER_ADMIN:
                user.company_id = 1
        db.commit()
        print(f"✅ Updated {len(users)} users with company_id")
        
        # 3. Clear existing data for fresh start
        db.query(Transaction).filter(Transaction.company_id == 1).delete()
        db.query(Product).filter(Product.company_id == 1).delete()
        db.query(Supplier).filter(Supplier.company_id == 1).delete()
        db.commit()
        print("✅ Cleared existing data")
        
        # 4. Create Suppliers
        suppliers_data = [
            {"supplier_no": "SUP-001", "name": "Global Electronics Ltd", "email": "sales@globalelec.com", "phone": "+1-555-0101", "status": "Active"},
            {"supplier_no": "SUP-002", "name": "Fresh Foods Wholesale", "email": "orders@freshfoods.com", "phone": "+1-555-0202", "status": "Active"},
            {"supplier_no": "SUP-003", "name": "Fashion Hub Inc", "email": "contact@fashionhub.com", "phone": "+1-555-0303", "status": "Active"},
            {"supplier_no": "SUP-004", "name": "Tech Supplies Co", "email": "info@techsupplies.com", "phone": "+1-555-0404", "status": "Active"},
            {"supplier_no": "SUP-005", "name": "Home Essentials", "email": "sales@homeessentials.com", "phone": "+1-555-0505", "status": "Active"},
        ]
        
        suppliers = []
        for s_data in suppliers_data:
            supplier = Supplier(**s_data, company_id=1)
            db.add(supplier)
            suppliers.append(supplier)
        db.commit()
        print(f"✅ Created {len(suppliers)} suppliers")
        
        # 5. Create Products with realistic data
        products_data = [
            # Electronics
            {"article_no": "ELEC-001", "name": "Wireless Mouse", "category": "Electronics", "product_price": 15.00, "sale_price": 29.99, "in_hand_qty": 150},
            {"article_no": "ELEC-002", "name": "USB-C Cable 2m", "category": "Electronics", "product_price": 5.00, "sale_price": 12.99, "in_hand_qty": 200},
            {"article_no": "ELEC-003", "name": "Bluetooth Speaker", "category": "Electronics", "product_price": 25.00, "sale_price": 49.99, "in_hand_qty": 80},
            {"article_no": "ELEC-004", "name": "Phone Case", "category": "Electronics", "product_price": 3.00, "sale_price": 9.99, "in_hand_qty": 300},
            {"article_no": "ELEC-005", "name": "Power Bank 10000mAh", "category": "Electronics", "product_price": 18.00, "sale_price": 34.99, "in_hand_qty": 120},
            
            # Food
            {"article_no": "FOOD-001", "name": "Organic Honey 500g", "category": "Food", "product_price": 8.00, "sale_price": 15.99, "in_hand_qty": 90},
            {"article_no": "FOOD-002", "name": "Olive Oil 1L", "category": "Food", "product_price": 12.00, "sale_price": 22.99, "in_hand_qty": 60},
            {"article_no": "FOOD-003", "name": "Almond Butter 350g", "category": "Food", "product_price": 10.00, "sale_price": 18.99, "in_hand_qty": 45},
            {"article_no": "FOOD-004", "name": "Green Tea 100 bags", "category": "Food", "product_price": 6.00, "sale_price": 11.99, "in_hand_qty": 110},
            {"article_no": "FOOD-005", "name": "Dark Chocolate Bar", "category": "Food", "product_price": 2.50, "sale_price": 5.99, "in_hand_qty": 200},
            
            # Fashion
            {"article_no": "FASH-001", "name": "Cotton T-Shirt", "category": "Fashion", "product_price": 8.00, "sale_price": 19.99, "in_hand_qty": 150},
            {"article_no": "FASH-002", "name": "Denim Jeans", "category": "Fashion", "product_price": 25.00, "sale_price": 59.99, "in_hand_qty": 80},
            {"article_no": "FASH-003", "name": "Sports Shoes", "category": "Fashion", "product_price": 35.00, "sale_price": 79.99, "in_hand_qty": 60},
            {"article_no": "FASH-004", "name": "Leather Belt", "category": "Fashion", "product_price": 12.00, "sale_price": 24.99, "in_hand_qty": 100},
            {"article_no": "FASH-005", "name": "Sunglasses", "category": "Fashion", "product_price": 10.00, "sale_price": 29.99, "in_hand_qty": 90},
            
            # Home
            {"article_no": "HOME-001", "name": "Coffee Mug Set", "category": "Home", "product_price": 15.00, "sale_price": 29.99, "in_hand_qty": 70},
            {"article_no": "HOME-002", "name": "Bed Sheet Set", "category": "Home", "product_price": 20.00, "sale_price": 44.99, "in_hand_qty": 50},
            {"article_no": "HOME-003", "name": "Kitchen Knife Set", "category": "Home", "product_price": 30.00, "sale_price": 69.99, "in_hand_qty": 40},
            {"article_no": "HOME-004", "name": "Towel Set", "category": "Home", "product_price": 18.00, "sale_price": 39.99, "in_hand_qty": 65},
            {"article_no": "HOME-005", "name": "Wall Clock", "category": "Home", "product_price": 12.00, "sale_price": 24.99, "in_hand_qty": 85},
        ]
        
        products = []
        for p_data in products_data:
            product = Product(**p_data, company_id=1, status="Active")
            db.add(product)
            products.append(product)
        db.commit()
        print(f"✅ Created {len(products)} products")
        
        # 6. Generate realistic transactions over last 90 days
        now = datetime.utcnow()
        transactions = []
        
        # Initial purchases (90 days ago)
        print("📦 Generating purchase transactions...")
        for product in products:
            supplier = random.choice(suppliers)
            purchase_qty = random.randint(100, 300)
            
            tx = Transaction(
                company_id=1,
                supplier_id=supplier.id,
                type=TransactionTypeEnum.PURCHASE,
                date=now - timedelta(days=90),
                debit=purchase_qty * product.product_price,
                product_name=product.name,
                quantity=purchase_qty,
                unit_price=product.product_price,
                payment_term="Bank Transfer",
                order_no=f"PO-{random.randint(1000, 9999)}"
            )
            transactions.append(tx)
            product.in_hand_qty = purchase_qty
        
        # Daily sales over 90 days
        print("💰 Generating sales transactions...")
        customer_names = [
            "ABC Store", "XYZ Mart", "Quick Shop", "Super Market", "Corner Store",
            "City Mall", "Downtown Shop", "Retail Hub", "Express Store", "Prime Outlet"
        ]
        
        for day_offset in range(89, -1, -1):
            date_of_sale = now - timedelta(days=day_offset)
            
            # 5-15 sales per day
            num_sales = random.randint(5, 15)
            for _ in range(num_sales):
                product = random.choice(products)
                if product.in_hand_qty > 0:
                    sell_qty = random.randint(1, min(5, product.in_hand_qty))
                    customer = random.choice(customer_names)
                    
                    tx = Transaction(
                        company_id=1,
                        type=TransactionTypeEnum.SALE,
                        date=date_of_sale + timedelta(hours=random.randint(9, 18), minutes=random.randint(0, 59)),
                        debit=sell_qty * product.sale_price,
                        product_name=product.name,
                        quantity=sell_qty,
                        unit_price=product.sale_price,
                        payment_term=random.choice(["Cash", "Credit", "Card", "Bank Transfer"]),
                        customer_name=customer,
                        order_no=f"SO-{random.randint(1000, 9999)}"
                    )
                    transactions.append(tx)
                    product.in_hand_qty -= sell_qty
            
            # Occasional returns (2% chance per day)
            if random.random() < 0.02 and day_offset < 80:
                product = random.choice(products)
                return_qty = random.randint(1, 3)
                customer = random.choice(customer_names)
                
                tx = Transaction(
                    company_id=1,
                    type=TransactionTypeEnum.REVERSE,
                    date=date_of_sale + timedelta(hours=random.randint(10, 16)),
                    debit=return_qty * product.sale_price,
                    product_name=product.name,
                    quantity=return_qty,
                    unit_price=product.sale_price,
                    payment_term="Cash",
                    customer_name=customer,
                    order_no=f"RET-{random.randint(1000, 9999)}"
                )
                transactions.append(tx)
                product.in_hand_qty += return_qty
        
        # Bulk insert transactions
        db.bulk_save_objects(transactions)
        db.commit()
        print(f"✅ Created {len(transactions)} transactions")
        
        # 7. Summary
        print("\n" + "="*60)
        print("🎉 DATA SEEDING COMPLETE!")
        print("="*60)
        print(f"📊 Summary:")
        print(f"   - Company: {company.name}")
        print(f"   - Suppliers: {len(suppliers)}")
        print(f"   - Products: {len(products)}")
        print(f"   - Transactions: {len(transactions)}")
        print(f"   - Date Range: Last 90 days")
        print("\n✅ Dashboard should now show data!")
        print("="*60)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_complete_data()
