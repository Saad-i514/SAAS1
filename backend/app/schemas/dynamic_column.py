from typing import Optional, List
from pydantic import BaseModel

class DynamicColumnBase(BaseModel):
    table_name: str
    column_name: str
    data_type: str

class DynamicColumnCreate(DynamicColumnBase):
    pass

class DynamicColumnInDBBase(DynamicColumnBase):
    id: int
    company_id: int

    class Config:
        from_attributes = True

class DynamicColumn(DynamicColumnInDBBase):
    pass
