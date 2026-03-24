import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.models import User
from app.core.security import verify_password

# Known passwords from seed scripts
KNOWN_PASSWORDS = [
    "password123",
    "mazhar@41900",
    "admin123",
    "test123",
    "12345678",
]

def test_all_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        
        print(f"\n{'='*80}")
        print(f"TESTING ALL USERS WITH KNOWN PASSWORDS")
        print(f"{'='*80}\n")
        
        for user in users:
            print(f"📧 {user.email}")
            print(f"   Role: {user.role}")
            
            found_password = False
            for pwd in KNOWN_PASSWORDS:
                if verify_password(pwd, user.hashed_password):
                    print(f"   ✅ PASSWORD FOUND: '{pwd}'")
                    found_password = True
                    break
            
            if not found_password:
                print(f"   ❌ Password NOT in known list")
            
            print(f"{'-'*80}\n")
            
    finally:
        db.close()

if __name__ == "__main__":
    test_all_users()
