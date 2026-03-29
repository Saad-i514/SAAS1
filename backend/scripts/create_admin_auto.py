"""
Automated super admin creation for production
Creates a super admin without interactive prompts
"""
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models import Company, User, RoleEnum
from app.core.security import get_password_hash


def create_admin():
    db = SessionLocal()
    
    try:
        # Check current state
        user_count = db.query(User).count()
        comp_count = db.query(Company).count()
        
        print(f"Current database state:")
        print(f"  Companies: {comp_count}")
        print(f"  Users: {user_count}")
        
        if user_count > 0:
            print("\n⚠️  Users already exist. Listing them:")
            users = db.query(User).all()
            for u in users:
                print(f"  - {u.email} ({u.role.value})")
            print("\nTo create a new admin, use: python scripts/create_super_admin.py")
            return
        
        # Create default company and admin
        company_name = "AL-Fursan"
        admin_email = "admin@alfursan.com"
        admin_password = "Admin@123456"  # Change this after first login!
        
        print(f"\n✨ Creating production super admin...")
        print(f"  Company: {company_name}")
        print(f"  Email: {admin_email}")
        print(f"  Password: {admin_password}")
        print(f"  ⚠️  CHANGE PASSWORD AFTER FIRST LOGIN!")
        
        # Create company
        company = Company(name=company_name)
        db.add(company)
        db.commit()
        db.refresh(company)
        
        # Create super admin
        user = User(
            email=admin_email,
            hashed_password=get_password_hash(admin_password),
            role=RoleEnum.SUPER_ADMIN,
            company_id=company.id,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"\n✅ Super Admin created successfully!")
        print(f"\n📋 Login Credentials:")
        print(f"  Email: {admin_email}")
        print(f"  Password: {admin_password}")
        print(f"  Company: {company_name}")
        print(f"\n🔐 IMPORTANT: Change this password immediately after first login!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
