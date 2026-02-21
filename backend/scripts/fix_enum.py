import os
import sys

# Add the parent directory to sys.path to run as a script module
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text("ALTER TYPE roleenum ADD VALUE 'SUPER_ADMIN'"))
    db.commit()
    print("Added SUPER_ADMIN")
except Exception as e:
    db.rollback()
    print("Error adding SUPER_ADMIN:", str(e))

try:
    db.execute(text("ALTER TYPE roleenum ADD VALUE 'SuperAdmin'"))
    db.commit()
    print("Added SuperAdmin")
except Exception as e:
    db.rollback()
    print("Error adding SuperAdmin:", str(e))
