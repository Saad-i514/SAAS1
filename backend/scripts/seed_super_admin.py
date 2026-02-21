import os
import sys
from loguru import logger

# Add the parent directory to sys.path to run as a script module
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models import User, RoleEnum

def seed_super_admin():
    db = SessionLocal()
    try:
        super_email = "msaadbinmazhar@gmail.com"
        super_password = "mazhar@41900"
        
        # Check if exists
        user = db.query(User).filter(User.email == super_email).first()
        if user:
            logger.info("Super Admin already exists. Updating role and password.")
            user.role = RoleEnum.SUPER_ADMIN
            user.hashed_password = get_password_hash(super_password)
            user.company_id = None
        else:
            logger.info("Creating Super Admin user.")
            user = User(
                email=super_email,
                hashed_password=get_password_hash(super_password),
                role=RoleEnum.SUPER_ADMIN,
                company_id=None
            )
            db.add(user)
        
        db.commit()
        logger.info("Super Admin seeding complete.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_super_admin()
