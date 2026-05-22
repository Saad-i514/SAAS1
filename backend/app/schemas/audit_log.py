from typing import Optional
from pydantic import BaseModel, field_serializer
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

    @field_serializer('created_at')
    def serialize_created_at(self, v: datetime, _info) -> str:
        """Return as YYYY-MM-DD to prevent browser timezone shift."""
        if v is None:
            return None
        return v.strftime('%Y-%m-%d')

    class Config:
        from_attributes = True
