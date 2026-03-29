"""
Production script to create the first Super Admin user.
Run this ONCE after initial deployment to create your admin account.

Usage:
    python scripts/create_super_admin.py

You will be prompted for:
    - Company name
    - Admin email
    - Admin password
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models import Company, User, RoleEnum
from app.core.security import get_password_hash
import getpass


def create_super_admin():
    """Create the first super admin user for production."""
    db = SessionLocal()
    
    try:
        # Check if any users exist
        existing_users = db.query(User).count()
        if existing_users > 0:
            print("⚠️  Users already exist in the database.")
            response = input("Do you want to create another super admin? (yes/no): ")
            if response.lower() not in ['yes', 'y']:
                print("Aborted.")
                return
        
        print("\n🚀 Create Super Admin User\n")
        print("=" * 50)
        
        # Get company name
        company_name = input("Company Name: ").strip()
        if not company_name:
            print("❌ Company name is required.")
            return
        
        # Get email
        email = input("Admin Email: ").strip().lower()
        if not email or '@' not in email:
            print("❌ Valid email is required.")
            return
        
        # Check if email exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"❌ User with email '{email}' already exists.")
            return
        
        # Get password
        password = getpass.getpass("Admin Password: ")
        password_confirm = getpass.getpass("Confirm Password: ")
        
        if password != password_confirm:
            print("❌ Passwords do not match.")
            return
        
        if len(password) < 8:
            print("❌ Password must be at least 8 characters long.")
            return
        
        print("\n" + "=" * 50)
        print(f"Company: {company_name}")
        print(f"Email: {email}")
        print(f"Role: SuperAdmin")
        print("=" * 50)
        
        confirm = input("\nCreate this super admin? (yes/no): ")
        if confirm.lower() not in ['yes', 'y']:
            print("Aborted.")
            return
        
        # Create company
        company = db.query(Company).filter(Company.name == company_name).first()
        if not company:
            company = Company(name=company_name)
            db.add(company)
            db.commit()
            db.refresh(company)
            print(f"✅ Created company: {company_name}")
        else:
            print(f"ℹ️  Using existing company: {company_name}")
        
        # Create super admin user
        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            role=RoleEnum.SUPER_ADMIN,
            company_id=company.id,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"\n✅ Super Admin created successfully!")
        print(f"\nLogin credentials:")
        print(f"  Email: {email}")
        print(f"  Role: SuperAdmin")
        print(f"  Company: {company_name}")
        print(f"\n⚠️  Keep these credentials secure!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_super_admin()
