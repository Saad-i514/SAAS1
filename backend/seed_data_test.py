import sys
from pathlib import Path
import random
from datetime import datetime, timedelta
import uuid

# Add the backend directory to python path
sys.path.append(str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.models import Company, User, RoleEnum, Supplier, Product, Transaction, TransactionTypeEnum
from app.core.security import get_password_hash

def seed_db():
    db = SessionLocal()
    
    # Get or create company
    company = db.query(Company).first()
    if not company:
        company = Company(name="Meerab Traders")
        db.add(company)
        db.commit()
        db.refresh(company)

    # Create Suppliers
    suppliers_data = [
        {"supplier_no": "SUP-OIL-1", "name": "Global Oils Inc.", "email": "contact@globaloils.com", "phone": "555-0101"},
        {"supplier_no": "SUP-FOD-1", "name": "Fresh Foods Co.", "email": "sales@freshfoods.com", "phone": "555-0202"},
        {"supplier_no": "SUP-PRF-1", "name": "Paris Scents", "email": "paris@scents.com", "phone": "555-0303"}
    ]
    
    suppliers = []
    for s_data in suppliers_data:
        supplier = db.query(Supplier).filter(Supplier.supplier_no == s_data["supplier_no"], Supplier.company_id == company.id).first()
        if not supplier:
            supplier = Supplier(**s_data, company_id=company.id)
            db.add(supplier)
            db.commit()
            db.refresh(supplier)
        suppliers.append(supplier)

    # Create Products
    products_data = [
        # Oils
        {"article_no": "OIL-001", "name": "Olive Oil Extra Virgin 1L", "category": "Oil", "product_price": 12.0, "sale_price": 18.5, "in_hand_qty": 0},
        {"article_no": "OIL-002", "name": "Avocado Oil Premium 500ml", "category": "Oil", "product_price": 9.0, "sale_price": 14.0, "in_hand_qty": 0},
        {"article_no": "OIL-003", "name": "Coconut Oil Organic 1L", "category": "Oil", "product_price": 15.0, "sale_price": 22.0, "in_hand_qty": 0},
        
        # Food
        {"article_no": "FOD-001", "name": "Organic Quinoa 1kg", "category": "Food", "product_price": 5.0, "sale_price": 8.99, "in_hand_qty": 0},
        {"article_no": "FOD-002", "name": "Almond Flour 500g", "category": "Food", "product_price": 6.5, "sale_price": 11.5, "in_hand_qty": 0},
        {"article_no": "FOD-003", "name": "Raw Honey 1kg", "category": "Food", "product_price": 8.0, "sale_price": 15.0, "in_hand_qty": 0},
        {"article_no": "FOD-004", "name": "Brown Rice 5kg", "category": "Food", "product_price": 10.0, "sale_price": 16.0, "in_hand_qty": 0},

        # Perfumes
        {"article_no": "PRF-001", "name": "Essence de Rose 50ml", "category": "Perfumes", "product_price": 45.0, "sale_price": 85.0, "in_hand_qty": 0},
        {"article_no": "PRF-002", "name": "Ocean Breeze 100ml", "category": "Perfumes", "product_price": 30.0, "sale_price": 65.0, "in_hand_qty": 0},
        {"article_no": "PRF-003", "name": "Midnight Musk 50ml", "category": "Perfumes", "product_price": 55.0, "sale_price": 110.0, "in_hand_qty": 0},
    ]

    products = []
    for p_data in products_data:
        product = db.query(Product).filter(Product.article_no == p_data["article_no"], Product.company_id == company.id).first()
        if not product:
            product = Product(**p_data, company_id=company.id)
            db.add(product)
            db.commit()
            db.refresh(product)
        products.append(product)

    # Clear existing transactions to avoid bloating
    db.query(Transaction).filter(Transaction.company_id == company.id).delete()
    db.commit()

    # Generate realistic transactions over the last 90 days
    print("Generating mock transactions...")
    now = datetime.utcnow()
    transactions_to_add = []

    # 1. Purchase stock first (all 90 days ago)
    for product in products:
        supplier = next((s for s in suppliers if s.supplier_no.startswith("SUP-" + product.article_no[:3])), suppliers[0])
        purchased_qty = random.randint(100, 300)
        
        tx = Transaction(
            company_id=company.id,
            supplier_id=supplier.id,
            transaction_id=str(uuid.uuid4())[:8].upper(),
            type="purchase",
            date=now - timedelta(days=90),
            debit=float(purchased_qty * product.product_price),
            product_name=product.name,
            quantity=purchased_qty,
            unit_price=product.product_price,
            payment_term="Cash"
        )
        product.in_hand_qty = purchased_qty
        transactions_to_add.append(tx)

    # 2. Daily Sales
    for day_offset in range(89, -1, -1):
        date_of_sale = now - timedelta(days=day_offset)
        
        # Make 3-8 sales per day
        num_sales = random.randint(3, 8)
        for _ in range(num_sales):
            product = random.choice(products)
            sell_qty = random.randint(1, 5)
            
            # Check stock
            if product.in_hand_qty >= sell_qty:
                tx = Transaction(
                    company_id=company.id,
                    transaction_id=str(uuid.uuid4())[:8].upper(),
                    type="sale",
                    date=date_of_sale + timedelta(hours=random.randint(9, 17), minutes=random.randint(0, 59)),
                    debit=float(sell_qty * product.sale_price),
                    product_name=product.name,
                    quantity=sell_qty,
                    unit_price=product.sale_price,
                    payment_term=random.choice(["Cash", "Credit", "Card"])
                )
                product.in_hand_qty -= sell_qty
                transactions_to_add.append(tx)

            # Occasional Returns (5% chance)
            if random.random() < 0.05 and day_offset < 80:
                return_qty = 1
                tx = Transaction(
                    company_id=company.id,
                    transaction_id=str(uuid.uuid4())[:8].upper(),
                    type="reverse",
                    date=date_of_sale + timedelta(hours=random.randint(10, 16)),
                    debit=float(return_qty * product.sale_price),
                    product_name=product.name,
                    quantity=return_qty,
                    unit_price=product.sale_price,
                    payment_term="Cash"
                )
                product.in_hand_qty += return_qty
                transactions_to_add.append(tx)

    db.add_all(transactions_to_add)
    db.commit()
    
    print("Successfully seeded random data for Oil, Food, and Perfumes!")


if __name__ == "__main__":
    seed_db()
