import sys
import os
from datetime import datetime

# Add the backend directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app import models

def update_transaction_dates():
    db = SessionLocal()
    try:
        transactions = db.query(models.Transaction).all()
        now = datetime.utcnow()
        for t in transactions:
            # We preserve the time but update to today's date so it appears in Daily reports
            t.date = t.date.replace(year=now.year, month=now.month, day=now.day)
        
        db.commit()
        print(f"Successfully updated {len(transactions)} transactions to today's date.")
    except Exception as e:
        db.rollback()
        print(f"Error updating transaction dates: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_transaction_dates()
