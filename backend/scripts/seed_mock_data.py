import sys
import os
from datetime import date
from sqlalchemy.orm import Session

# Add the backend directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app import models
from app.core.security import get_password_hash

def seed_data():
    db: Session = SessionLocal()
    try:
        # 1. Get the admin user's company (from msaadbinmazhar@gmail.com)
        admin_user = db.query(models.User).filter(models.User.email == "msaadbinmazhar@gmail.com").first()
        if not admin_user:
            print("Super Admin not found. Please run seed_super_admin.py first.")
            return

        company_id = admin_user.company_id
        if not company_id:
            # Create a default company if Super Admin isn't tied to one for testing
            company = models.Company(name="Test Organization")
            db.add(company)
            db.flush()
            company_id = company.id
            admin_user.company_id = company_id
            db.commit()

        # 2. Add Suppliers (Customers based on the image: New Uncle Store, Maher Din, Sadiq Mart)
        suppliers = [
            models.Supplier(name="New Uncle Store", supplier_no="CUST-1001", company_id=company_id),
            models.Supplier(name="Maher Din", supplier_no="CUST-1002", company_id=company_id),
            models.Supplier(name="Sadiq Mart", supplier_no="CUST-1003", company_id=company_id)
        ]
        for s in suppliers:
            db.add(s)
        db.flush()

        supplier_map = {s.name: s.id for s in suppliers}

        # 3. Add Products (from the image)
        raw_products = [
            ("Broken Pine Apple 567g", 150.0, 200.0, 100),
            ("Pine Apple Slice", 160.0, 210.0, 100),
            ("Polac Milk Small", 50.0, 75.0, 200),
            ("Mundial Tin 100ml", 120.0, 150.0, 50),
            ("Mundial Tin Pomace 400ml", 300.0, 400.0, 50),
            ("Mix Fruit Fruitamins 567G", 180.0, 250.0, 150),
            ("Close up paste Red 65g", 40.0, 60.0, 300),
            ("Close up paste Green 65g", 40.0, 60.0, 300),
            ("Mec Face wash", 150.0, 200.0, 100),
            ("Ponds F/w Pink", 180.0, 240.0, 80),
            ("Maclay 360ml", 250.0, 320.0, 60),
            ("Tresemme Shampoo 400ml", 400.0, 550.0, 90),
            ("Coffee 2g", 10.0, 15.0, 500),
            ("Coffee 100g Company", 200.0, 280.0, 100),
            ("Mundial Tin 175ml", 160.0, 220.0, 70),
            ("Olives Black cut 235g", 220.0, 300.0, 120),
            ("Mix Fruit Fruitamins 234g (Philippines)", 140.0, 190.0, 200),
            ("Peanut Butter Blue large", 350.0, 480.0, 90),
            ("Nutella 350g", 600.0, 850.0, 150)
        ]

        product_objects = []
        for i, (name, p_price, s_price, qty) in enumerate(raw_products):
            p = models.Product(
                article_no=f"ART-{1000+i}",
                name=name,
                product_price=p_price,
                sale_price=s_price,
                in_hand_qty=qty,
                company_id=company_id
            )
            db.add(p)
            product_objects.append(p)
        db.flush()

        product_map = {p.name: p for p in product_objects}

        # 4. Create Transactions (Sales based on the image)
        
        # Transaction 1: New Uncle Store (T-Amount: 11570)
        t1_items = [
            ("Broken Pine Apple 567g", 6), ("Pine Apple Slice", 6), 
            ("Polac Milk Small", 6), ("Mundial Tin 100ml", 3), 
            ("Mundial Tin Pomace 400ml", 2)
        ]
        for p_name, qty in t1_items:
            db.add(models.Transaction(
                type=models.TransactionTypeEnum.SALE,
                supplier_id=supplier_map["New Uncle Store"],
                date=date(2026, 2, 21),
                debit=qty * product_map[p_name].sale_price,
                product_name=p_name,
                quantity=qty,
                unit_price=product_map[p_name].sale_price,
                customer_name="New Uncle Store",
                company_id=company_id
            ))
            # decrease stock
            product_map[p_name].in_hand_qty -= qty

        # Transaction 2: Maher Din (T-Amount: 10320)
        db.add(models.Transaction(
            type=models.TransactionTypeEnum.SALE,
            supplier_id=supplier_map["Maher Din"],
            date=date(2026, 2, 21),
            debit=24 * product_map["Mix Fruit Fruitamins 567G"].sale_price,
            product_name="Mix Fruit Fruitamins 567G",
            quantity=24,
            unit_price=product_map["Mix Fruit Fruitamins 567G"].sale_price,
            customer_name="Maher Din",
            company_id=company_id
        ))
        product_map["Mix Fruit Fruitamins 567G"].in_hand_qty -= 24

        # Transaction 3: Sadiq Mart (T-Amount: 49160)
        t3_items = [
            ("Close up paste Red 65g", 6), ("Close up paste Green 65g", 6),
            ("Mec Face wash", 6), ("Ponds F/w Pink", 6), ("Maclay 360ml", 6),
            ("Tresemme Shampoo 400ml", 6), ("Coffee 2g", 1), ("Coffee 100g Company", 3),
            ("Mundial Tin 175ml", 4), ("Olives Black cut 235g", 3), ("Mundial Tin Pomace 400ml", 3),
            ("Mix Fruit Fruitamins 567G", 6), ("Mix Fruit Fruitamins 234g (Philippines)", 12),
            ("Peanut Butter Blue large", 3), ("Nutella 350g", 6)
        ]
        for p_name, qty in t3_items:
            db.add(models.Transaction(
                type=models.TransactionTypeEnum.SALE,
                supplier_id=supplier_map["Sadiq Mart"],
                date=date(2026, 2, 21),
                debit=qty * product_map[p_name].sale_price,
                product_name=p_name,
                quantity=qty,
                unit_price=product_map[p_name].sale_price,
                customer_name="Sadiq Mart",
                company_id=company_id
            ))
            product_map[p_name].in_hand_qty -= qty

        db.commit()
        print("Successfully seeded all mock products, customers, and transactions!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
