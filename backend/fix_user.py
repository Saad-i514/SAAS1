import sys
import os
from sqlalchemy.orm import Session

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app import models

def fix_user():
    db: Session = SessionLocal()
    try:
        # Get the Test Organization company
        company = db.query(models.Company).filter(models.Company.id == 3).first()
        if not company:
            print("No companies found.")
            return

        user = db.query(models.User).filter(models.User.email == "meerab.traders@saas.com").first()
        if user:
            user.company_id = company.id
            db.commit()
            print("Fixed user's company_id!")
            
        admin = db.query(models.User).filter(models.User.email == "msaadbinmazhar@gmail.com").first()
        if admin and not admin.company_id:
            admin.company_id = company.id
            db.commit()
            print("Fixed admin's company_id too!")
            
    finally:
        db.close()

if __name__ == "__main__":
    fix_user()
