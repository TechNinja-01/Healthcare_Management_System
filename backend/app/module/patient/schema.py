from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.config.constants import Gender


class PatientCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    age: int = Field(..., ge=0, le=130)
    gender: Gender
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=15)
    blood_group: str = Field(..., min_length=1, max_length=5)
    address: str = Field(..., min_length=1, max_length=255)
    disease: str = Field(..., min_length=1, max_length=100)
    user_id: str = Field(..., min_length=1)
    doctor_id: Optional[str] = None


class PatientUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    age: Optional[int] = Field(default=None, ge=0, le=130)
    gender: Optional[Gender] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, min_length=7, max_length=15)
    blood_group: Optional[str] = Field(default=None, min_length=1, max_length=5)
    address: Optional[str] = Field(default=None, min_length=1, max_length=255)
    disease: Optional[str] = Field(default=None, min_length=1, max_length=100)
    doctor_id: Optional[str] = None


class PatientResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    age: int
    gender: str
    email: EmailStr
    phone: str
    blood_group: str
    address: str
    disease: str
    doctor_id: Optional[str] = None
    user_id: Optional[int] = None

    model_config = {"from_attributes": True}
