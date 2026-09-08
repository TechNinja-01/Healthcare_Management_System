from datetime import date, time
from typing import Optional

from pydantic import (
    BaseModel,
    Field,
    field_validator,
    model_validator,
)


# =========================================================
# CREATE AVAILABILITY
# =========================================================

class AvailabilityCreate(BaseModel):

    date: date

    start_time: time

    end_time: time

    slot_duration: int = Field(
        default=30,
        ge=5,
        le=240,
    )

    is_active: bool = True

    # -----------------------------------------------------
    # Validate date
    # -----------------------------------------------------

    @field_validator("date")
    @classmethod
    def validate_date(
        cls,
        value: date,
    ) -> date:

        if value < date.today():
            raise ValueError(
                "Availability date cannot be in the past"
            )

        return value

    # -----------------------------------------------------
    # Validate time
    # -----------------------------------------------------

    @model_validator(mode="after")
    def validate_times(self):

        if self.start_time >= self.end_time:

            raise ValueError(
                "Start time must be before end time"
            )

        return self


# =========================================================
# UPDATE AVAILABILITY
# =========================================================

class AvailabilityUpdate(BaseModel):

    date: Optional[date] = None

    start_time: Optional[time] = None

    end_time: Optional[time] = None

    slot_duration: Optional[int] = Field(
        default=None,
        ge=5,
        le=240,
    )

    is_active: Optional[bool] = None

    # -----------------------------------------------------
    # Validate date
    # -----------------------------------------------------

    @field_validator("date")
    @classmethod
    def validate_date(
        cls,
        value: Optional[date],
    ) -> Optional[date]:

        if value is not None and value < date.today():

            raise ValueError(
                "Availability date cannot be in the past"
            )

        return value

    # -----------------------------------------------------
    # Validate start/end time
    #
    # Because both fields are optional during update,
    # the final validation is also done in the route.
    # -----------------------------------------------------

    @model_validator(mode="after")
    def validate_times(self):

        if (
            self.start_time is not None
            and self.end_time is not None
        ):

            if self.start_time >= self.end_time:

                raise ValueError(
                    "Start time must be before end time"
                )

        return self


# =========================================================
# AVAILABILITY RESPONSE
# =========================================================

class AvailabilityResponse(BaseModel):

    id: int

    doctor_id: str

    date: date

    day_of_week: int

    start_time: time

    end_time: time

    slot_duration: int

    is_active: bool

    model_config = {
        "from_attributes": True
    }


# =========================================================
# CREATE LEAVE
# =========================================================

class LeaveCreate(BaseModel):

    leave_date: date

    reason: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    # -----------------------------------------------------
    # Validate leave date
    # -----------------------------------------------------

    @field_validator("leave_date")
    @classmethod
    def validate_leave_date(
        cls,
        value: date,
    ) -> date:

        if value < date.today():

            raise ValueError(
                "Leave date cannot be in the past"
            )

        return value


# =========================================================
# LEAVE RESPONSE
# =========================================================

class LeaveResponse(BaseModel):

    id: int

    doctor_id: str

    leave_date: date

    reason: Optional[str] = None

    model_config = {
        "from_attributes": True
    }