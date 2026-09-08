from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.config.constants import Gender


class RefreshToken(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str


class RegisterAdmin(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=7, max_length=15)
    designation: str = Field(..., min_length=1, max_length=100)


class RegisterDoctor(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    name: str = Field(..., min_length=1, max_length=100)
    specialization: str = Field(..., min_length=1, max_length=100)
    hospital_name: str = Field(..., min_length=1, max_length=100)
    address: str = Field(..., min_length=1, max_length=300)
    latitude: float
    longitude: float


class RegisterPatient(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    age: int = Field(..., ge=0, le=130)
    gender: Gender
    phone: str = Field(..., min_length=7, max_length=15)
    blood_group: str = Field(..., min_length=1, max_length=5)
    address: str = Field(..., min_length=1, max_length=255)
    disease: str = Field(..., min_length=1, max_length=100)
    assigned_doctor_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
