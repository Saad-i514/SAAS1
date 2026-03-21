import sys
import os
from sqlalchemy.orm import Session

# Add the backend directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app import models
from app.core.security import get_password_hash

def seed_user():
    db: Session = SessionLocal()
    try:
        # Get company ID
        admin_user = db.query(models.User).filter(models.User.email == "msaadbinmazhar@gmail.com").first()
        if not admin_user:
            print("Super Admin not found.")
            return

        company_id = admin_user.company_id

        # Check if user already exists
        existing = db.query(models.User).filter(models.User.email == "meerab.traders@saas.com").first()
        if not existing:
            # Create user
            user = models.User(
                email="meerab.traders@saas.com",
                hashed_password=get_password_hash("password123"),
                role=models.RoleEnum.ADMIN,
                company_id=company_id
            )
            db.add(user)
            db.commit()
            print("Successfully created meerab.traders@saas.com!")
        else:
            existing.hashed_password = get_password_hash("password123")
            db.commit()
            print("Updated existing meerab.traders@saas.com password.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_user()
