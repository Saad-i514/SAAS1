import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.models import User
from app.core.security import get_password_hash

db = SessionLocal()
users = db.query(User).all()
new_pass = get_password_hash("password123")
for u in users:
    u.hashed_password = new_pass
db.commit()
print("All passwords reset to password123")
