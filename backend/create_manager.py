import sys; from pathlib import Path; sys.path.append(str(Path(__file__).parent)); from app.core.database import SessionLocal; from app.models import User, Company, RoleEnum; from app.core.security import get_password_hash; db = SessionLocal(); company = db.query(Company).filter_by(name='Meerab Traders').first(); user = db.query(User).filter_by(email='msaadbinmazhar@gmail.com').first(); 
if not user and company:
    user = User(email='msaadbinmazhar@gmail.com', hashed_password=get_password_hash('password123'), role=RoleEnum.ADMIN, company_id=company.id); db.add(user); db.commit(); print('Manager created!')
else:
    print('User already exists or company not found')
