import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.models import User

def list_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        
        print(f"\n{'='*80}")
        print(f"TOTAL USERS IN DATABASE: {len(users)}")
        print(f"{'='*80}\n")
        
        for user in users:
            print(f"📧 Email: {user.email}")
            print(f"   Role: {user.role}")
            print(f"   Active: {user.is_active}")
            print(f"   Company ID: {user.company_id}")
            print(f"   Created: {user.created_at}")
            print(f"   Hashed Password: {user.hashed_password[:50]}...")
            print(f"{'-'*80}\n")
            
    finally:
        db.close()

if __name__ == "__main__":
    list_users()
