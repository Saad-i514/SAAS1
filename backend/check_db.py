import sys
import os
from sqlalchemy.orm import Session

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app import models

def check_db():
    db: Session = SessionLocal()
    try:
        companies = db.query(models.Company).all()
        print("COMPANIES:")
        for c in companies:
            print(f"- {c.id}: {c.name}")
            
        suppliers = db.query(models.Supplier).all()
        print("SUPPLIERS:")
        for s in suppliers:
            print(f"- {s.id}: {s.name} (company_id: {s.company_id})")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
