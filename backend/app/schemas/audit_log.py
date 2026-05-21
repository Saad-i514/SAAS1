from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class AuditLogEntry(BaseModel):
    id: int
    company_id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    description: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
