from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AuditLogOut(BaseModel):
    id: str
    action: str
    actor: str
    target_type: str
    target_id: str
    details: Optional[str] = None
    outcome: str
    timestamp: datetime

    class Config:
        from_attributes = True
