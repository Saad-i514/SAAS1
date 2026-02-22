import sys
import os
from datetime import date
from sqlalchemy.orm import Session

# Add the backend directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app import models

def seed_meerab():
    db: Session = SessionLocal()
    try:
        # Get company ID
        admin_user = db.query(models.User).filter(models.User.email == "msaadbinmazhar@gmail.com").first()
        if not admin_user:
            print("Super Admin not found.")
            return

        company_id = admin_user.company_id

        # Check if Meerab Traders already exists
        existing = db.query(models.Supplier).filter(models.Supplier.name == "MEERAB TRADERS", models.Supplier.company_id == company_id).first()
        if existing:
            print("MEERAB TRADERS already exists!")
            return

        # Add Meerab Traders
        meerab = models.Supplier(
            name="MEERAB TRADERS", 
            supplier_no="CUST-1004", 
            company_id=company_id
        )
        db.add(meerab)
        db.flush()

        # Let's add a sample transaction for them picking some random products
        product = db.query(models.Product).filter(models.Product.name == "Nutella 350g").first()
        if product:
            db.add(models.Transaction(
                type=models.TransactionTypeEnum.SALE,
                supplier_id=meerab.id,
                date=date.today(),
                debit=5 * product.sale_price,
                product_name=product.name,
                quantity=5,
                unit_price=product.sale_price,
                customer_name="MEERAB TRADERS",
                company_id=company_id
            ))
            product.in_hand_qty -= 5

        db.commit()
        print("Successfully added MEERAB TRADERS!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_meerab()
