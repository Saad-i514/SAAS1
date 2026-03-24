import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.models import User
from app.core.security import verify_password

def test_login():
    db = SessionLocal()
    try:
        # Test super admin
        email = "msaadbinmazhar@gmail.com"
        password = "mazhar@41900"
        
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"❌ User {email} NOT FOUND in database")
            return
        
        print(f"✅ User found: {email}")
        print(f"   - ID: {user.id}")
        print(f"   - Role: {user.role}")
        print(f"   - Active: {user.is_active}")
        print(f"   - Company ID: {user.company_id}")
        
        # Test password
        is_valid = verify_password(password, user.hashed_password)
        print(f"   - Password valid: {is_valid}")
        
        if is_valid:
            print(f"\n✅ Login should work for {email}")
        else:
            print(f"\n❌ Password verification FAILED for {email}")
            
    finally:
        db.close()

if __name__ == "__main__":
    test_login()
