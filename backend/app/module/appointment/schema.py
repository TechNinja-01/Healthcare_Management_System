from datetime import date, time
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.config.constants import AppointmentStatus, AppointmentType


class AppointmentCreate(BaseModel):
    doctor_id: str = Field(
        ...,
        min_length=1,
        max_length=10,
    )
    appointment_date: date
    appointment_time: time
    disease: Optional[str] = Field(
        default=None,
        max_length=255,
    )
    appointment_type: AppointmentType = AppointmentType.IN_PERSON
    status: AppointmentStatus = AppointmentStatus.PENDING

    @field_validator("appointment_date")
    @classmethod
    def validate_date_not_in_past(
        cls,
        value: date,
    ) -> date:
        if value < date.today():
            raise ValueError(
                "Appointment date cannot be in the past"
            )

        return value


class AppointmentUpdate(BaseModel):
    appointment_date: Optional[date] = None
    appointment_time: Optional[time] = None
    status: Optional[AppointmentStatus] = None

    @field_validator("appointment_date")
    @classmethod
    def validate_date_not_in_past(
        cls,
        value: Optional[date],
    ) -> Optional[date]:
        if value is not None and value < date.today():
            raise ValueError(
                "Appointment date cannot be in the past"
            )

        return value


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: str
    appointment_date: date
    appointment_time: time
    status: str
    appointment_type: str = AppointmentType.IN_PERSON.value
    disease: str | None = None
    created_at: str
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None

    model_config = {
        "from_attributes": True
    }

