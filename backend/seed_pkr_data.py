import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.models import Company, User, RoleEnum, Supplier, Product, Transaction, TransactionTypeEnum
from datetime import datetime, timedelta
import random

def seed_pkr_data():
    db = SessionLocal()
    
    try:
        print("🚀 Starting PKR data seeding...")
        
        # 1. Ensure Company exists
        company = db.query(Company).filter(Company.id == 1).first()
        if not company:
            company = Company(id=1, name="Meerab Traders")
            db.add(company)
            db.commit()
            db.refresh(company)
        print(f"✅ Company: {company.name}")
        
        # 2. Create Suppliers (Pakistani businesses)
        suppliers_data = [
            {"supplier_no": "SUP-001", "name": "Karachi Wholesale", "email": "sales@karachiwholesale.pk", "phone": "+92-300-1234567", "status": "Active"},
            {"supplier_no": "SUP-002", "name": "Lahore Traders", "email": "info@lahoretraders.pk", "phone": "+92-321-7654321", "status": "Active"},
            {"supplier_no": "SUP-003", "name": "Islamabad Suppliers", "email": "contact@isbsuppliers.pk", "phone": "+92-333-9876543", "status": "Active"},
            {"supplier_no": "SUP-004", "name": "Faisalabad Mart", "email": "orders@faisalabadmart.pk", "phone": "+92-345-1122334", "status": "Active"},
            {"supplier_no": "SUP-005", "name": "Multan Distributors", "email": "sales@multandist.pk", "phone": "+92-301-5566778", "status": "Active"},
        ]
        
        suppliers = []
        for s_data in suppliers_data:
            supplier = Supplier(**s_data, company_id=1)
            db.add(supplier)
            suppliers.append(supplier)
        db.commit()
        print(f"✅ Created {len(suppliers)} suppliers")
        
        # 3. Create Products with PKR pricing
        products_data = [
            # Electronics (PKR)
            {"article_no": "ELEC-001", "name": "Wireless Mouse", "category": "Electronics", "product_price": 1500, "sale_price": 2500, "in_hand_qty": 150},
            {"article_no": "ELEC-002", "name": "USB-C Cable 2m", "category": "Electronics", "product_price": 500, "sale_price": 1200, "in_hand_qty": 200},
            {"article_no": "ELEC-003", "name": "Bluetooth Speaker", "category": "Electronics", "product_price": 3000, "sale_price": 5500, "in_hand_qty": 80},
            {"article_no": "ELEC-004", "name": "Phone Case", "category": "Electronics", "product_price": 300, "sale_price": 800, "in_hand_qty": 300},
            {"article_no": "ELEC-005", "name": "Power Bank 10000mAh", "category": "Electronics", "product_price": 2000, "sale_price": 3800, "in_hand_qty": 120},
            {"article_no": "ELEC-006", "name": "Earphones", "category": "Electronics", "product_price": 800, "sale_price": 1500, "in_hand_qty": 180},
            {"article_no": "ELEC-007", "name": "Phone Charger", "category": "Electronics", "product_price": 600, "sale_price": 1200, "in_hand_qty": 250},
            
            # Food & Grocery (PKR)
            {"article_no": "FOOD-001", "name": "Basmati Rice 5kg", "category": "Food", "product_price": 800, "sale_price": 1400, "in_hand_qty": 100},
            {"article_no": "FOOD-002", "name": "Cooking Oil 5L", "category": "Food", "product_price": 1200, "sale_price": 2000, "in_hand_qty": 80},
            {"article_no": "FOOD-003", "name": "Sugar 1kg", "category": "Food", "product_price": 100, "sale_price": 180, "in_hand_qty": 200},
            {"article_no": "FOOD-004", "name": "Tea 500g", "category": "Food", "product_price": 400, "sale_price": 750, "in_hand_qty": 150},
            {"article_no": "FOOD-005", "name": "Flour 10kg", "category": "Food", "product_price": 600, "sale_price": 1100, "in_hand_qty": 120},
            {"article_no": "FOOD-006", "name": "Milk Powder 400g", "category": "Food", "product_price": 500, "sale_price": 900, "in_hand_qty": 90},
            
            # Clothing (PKR)
            {"article_no": "CLTH-001", "name": "Cotton Shirt", "category": "Clothing", "product_price": 800, "sale_price": 1800, "in_hand_qty": 100},
            {"article_no": "CLTH-002", "name": "Jeans Pant", "category": "Clothing", "product_price": 1500, "sale_price": 3200, "in_hand_qty": 70},
            {"article_no": "CLTH-003", "name": "Shalwar Kameez", "category": "Clothing", "product_price": 2000, "sale_price": 4500, "in_hand_qty": 60},
            {"article_no": "CLTH-004", "name": "Dupatta", "category": "Clothing", "product_price": 500, "sale_price": 1200, "in_hand_qty": 120},
            {"article_no": "CLTH-005", "name": "Sports Shoes", "category": "Clothing", "product_price": 2500, "sale_price": 5000, "in_hand_qty": 50},
            
            # Home & Kitchen (PKR)
            {"article_no": "HOME-001", "name": "Dinner Set 24pcs", "category": "Home", "product_price": 3000, "sale_price": 6000, "in_hand_qty": 40},
            {"article_no": "HOME-002", "name": "Bed Sheet Set", "category": "Home", "product_price": 1500, "sale_price": 3200, "in_hand_qty": 60},
            {"article_no": "HOME-003", "name": "Towel Set", "category": "Home", "product_price": 1000, "sale_price": 2200, "in_hand_qty": 80},
            {"article_no": "HOME-004", "name": "Pressure Cooker", "category": "Home", "product_price": 2000, "sale_price": 4200, "in_hand_qty": 45},
            {"article_no": "HOME-005", "name": "Water Bottle Set", "category": "Home", "product_price": 600, "sale_price": 1300, "in_hand_qty": 100},
        ]
        
        products = []
        for p_data in products_data:
            product = Product(**p_data, company_id=1, status="Active")
            db.add(product)
            products.append(product)
        db.commit()
        print(f"✅ Created {len(products)} products with PKR pricing")
        
        # 4. Generate realistic transactions over last 90 days
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
            "Al-Hamd Store", "Bismillah Mart", "City Center", "Metro Cash & Carry",
            "Imtiaz Super Market", "Chase Up", "Naheed Super Market", "Hyperstar",
            "Carrefour", "Utility Stores", "Makro", "Al-Fatah", "Green Valley"
        ]
        
        for day_offset in range(89, -1, -1):
            date_of_sale = now - timedelta(days=day_offset)
            
            # 8-20 sales per day
            num_sales = random.randint(8, 20)
            for _ in range(num_sales):
                product = random.choice(products)
                if product.in_hand_qty > 0:
                    sell_qty = random.randint(1, min(8, product.in_hand_qty))
                    customer = random.choice(customer_names)
                    
                    # Random discount (0-10%)
                    discount = random.choice([0, 0, 0, 50, 100, 200, 300])
                    total_amount = (sell_qty * product.sale_price) - discount
                    
                    tx = Transaction(
                        company_id=1,
                        type=TransactionTypeEnum.SALE,
                        date=date_of_sale + timedelta(hours=random.randint(9, 20), minutes=random.randint(0, 59)),
                        debit=total_amount,
                        product_name=product.name,
                        quantity=sell_qty,
                        unit_price=product.sale_price,
                        payment_term=random.choice(["Cash", "Credit", "Card", "Bank Transfer", "JazzCash", "Easypaisa"]),
                        customer_name=customer,
                        order_no=f"SO-{random.randint(1000, 9999)}"
                    )
                    transactions.append(tx)
                    product.in_hand_qty -= sell_qty
            
            # Occasional returns (3% chance per day)
            if random.random() < 0.03 and day_offset < 80:
                product = random.choice(products)
                return_qty = random.randint(1, 3)
                customer = random.choice(customer_names)
                
                tx = Transaction(
                    company_id=1,
                    type=TransactionTypeEnum.REVERSE,
                    date=date_of_sale + timedelta(hours=random.randint(10, 18)),
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
        
        # Calculate totals for summary
        total_sales = sum(t.debit for t in transactions if t.type == TransactionTypeEnum.SALE)
        total_purchases = sum(t.debit for t in transactions if t.type == TransactionTypeEnum.PURCHASE)
        
        # 5. Summary
        print("\n" + "="*60)
        print("🎉 PKR DATA SEEDING COMPLETE!")
        print("="*60)
        print(f"📊 Summary:")
        print(f"   - Company: {company.name}")
        print(f"   - Suppliers: {len(suppliers)}")
        print(f"   - Products: {len(products)}")
        print(f"   - Transactions: {len(transactions)}")
        print(f"   - Total Sales: PKR {total_sales:,.0f}")
        print(f"   - Total Purchases: PKR {total_purchases:,.0f}")
        print(f"   - Date Range: Last 90 days")
        print("\n✅ Dashboard should now show PKR data!")
        print("="*60)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_pkr_data()
