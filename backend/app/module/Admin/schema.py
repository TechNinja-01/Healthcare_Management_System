from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class AdminBase(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=15)
    designation: str = Field(..., min_length=1)


class AdminCreate(AdminBase):
    user_id: int


class AdminUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, min_length=7, max_length=15)
    designation: Optional[str] = None


class AdminResponse(BaseModel):
    id: int
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    user_id: int

    model_config = {"from_attributes": True}
