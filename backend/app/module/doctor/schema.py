from typing import Optional

from pydantic import BaseModel, Field


class DoctorCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    specialization: str = Field(..., min_length=1, max_length=100)
    user_id: int
    hospital_name: str = Field(..., min_length=1, max_length=100)
    address: str = Field(..., min_length=1, max_length=300)
    latitude: float | None = None
    longitude: float | None = None


class DoctorUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    specialization: Optional[str] = Field(default=None, min_length=1, max_length=100)
    hospital_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    address: Optional[str] = Field(default=None, min_length=1, max_length=300)
    latitude: float | None = None
    longitude: float | None = None


class DoctorResponse(BaseModel):
    id: str
    name: str
    specialization: Optional[str] = None
    user_id: int
    hospital_name: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    distance_km: float | None = None

    model_config = {"from_attributes": True}
