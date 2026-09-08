from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.config.dependencies import has_permission
from app.config.response import ApiResponse

from app.module.Availability.model import (
    DoctorAvailability,
    DoctorLeave,
)

from app.module.Availability.schema import (
    AvailabilityCreate,
    AvailabilityUpdate,
    AvailabilityResponse,
    LeaveCreate,
    LeaveResponse,
)

from app.module.doctor.model import Doctor
from app.config.constants import Role


router = APIRouter(
    prefix="/availability",
    tags=["Doctor Availability"],
)


def get_doctor(
    doctor_id: str,
    db: Session,
):

    doctor = (
        db.query(Doctor)
        .filter(
            Doctor.id == doctor_id
        )
        .first()
    )

    if not doctor:

        raise HTTPException(
            status_code=404,
            detail="Doctor not found",
        )

    return doctor


def _assert_can_manage_doctor(doctor_id: str, current_user: dict) -> None:
    role = current_user.get("role")
    if role == Role.ADMIN.value:
        return
    profile = current_user.get("profile") or {}
    if role == Role.DOCTOR.value and profile.get("id") == doctor_id:
        return
    raise HTTPException(status_code=403, detail="Permission denied")


# =========================================================
# CREATE AVAILABILITY
# =========================================================

@router.post(
    "/{doctor_id}",
    status_code=201,
)
def create_availability(
    doctor_id: str,
    data: AvailabilityCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        has_permission("availability.create")
    ),
):

    # -----------------------------------------------------
    # Check doctor
    # -----------------------------------------------------

    get_doctor(
        doctor_id,
        db,
    )
    _assert_can_manage_doctor(doctor_id, current_user)

    # -----------------------------------------------------
    # Remove timezone if present
    # -----------------------------------------------------

    start_time = data.start_time.replace(
        tzinfo=None
    )

    end_time = data.end_time.replace(
        tzinfo=None
    )

    # -----------------------------------------------------
    # Validate time
    # -----------------------------------------------------

    if start_time >= end_time:

        raise HTTPException(
            status_code=400,
            detail="Start time must be before end time",
        )

    # -----------------------------------------------------
    # Calculate day
    # -----------------------------------------------------

    day_of_week = data.date.weekday()

    # -----------------------------------------------------
    # Check doctor leave
    # -----------------------------------------------------

    leave = (
        db.query(DoctorLeave)
        .filter(
            DoctorLeave.doctor_id == doctor_id,
            DoctorLeave.leave_date == data.date,
        )
        .first()
    )

    if leave:

        raise HTTPException(
            status_code=400,
            detail="Doctor is on leave on this date",
        )

    # -----------------------------------------------------
    # Validate slot duration
    # -----------------------------------------------------

    duration_seconds = (
        datetime.combine(
            data.date,
            end_time,
        )
        - datetime.combine(
            data.date,
            start_time,
        )
    ).total_seconds()

    slot_seconds = (
        data.slot_duration * 60
    )

    if duration_seconds % slot_seconds != 0:

        raise HTTPException(
            status_code=400,
            detail=(
                "Availability duration must be "
                "divisible by slot duration"
            ),
        )

    # -----------------------------------------------------
    # Check overlapping availability
    # -----------------------------------------------------

    existing = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_id == doctor_id,
            DoctorAvailability.date == data.date,
            DoctorAvailability.is_active == True,
        )
        .all()
    )

    for item in existing:

        if (
            start_time < item.end_time
            and end_time > item.start_time
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "Availability time overlaps "
                    "with existing availability"
                ),
            )

    # -----------------------------------------------------
    # Create
    # -----------------------------------------------------

    availability = DoctorAvailability(
        doctor_id=doctor_id,
        date=data.date,
        day_of_week=day_of_week,
        start_time=start_time,
        end_time=end_time,
        slot_duration=data.slot_duration,
        is_active=data.is_active,
    )

    db.add(availability)

    try:

        db.commit()

        db.refresh(availability)

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Availability already exists "
                "for this time period"
            ),
        )

    # -----------------------------------------------------
    # Response
    # -----------------------------------------------------

    return ApiResponse.success(
        message=(
            "Doctor availability "
            "created successfully"
        ),
        status_code=201,
        data=(
            AvailabilityResponse
            .model_validate(availability)
            .model_dump(mode="json")
        ),
    )


# =========================================================
# GET AVAILABILITY
# =========================================================

@router.get(
    "/{doctor_id}",
)
def get_availability(
    doctor_id: str,
    db: Session = Depends(get_db),
    _user=Depends(
        has_permission("availability.read")
    ),
):

    # -----------------------------------------------------
    # Check doctor
    # -----------------------------------------------------

    get_doctor(
        doctor_id,
        db,
    )

    # -----------------------------------------------------
    # Fetch
    # -----------------------------------------------------

    availability = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_id
            == doctor_id
        )
        .order_by(
            DoctorAvailability.date,
            DoctorAvailability.start_time,
        )
        .all()
    )

    # -----------------------------------------------------
    # Response
    # -----------------------------------------------------

    return ApiResponse.success(
        message=(
            "Doctor availability "
            "fetched successfully"
        ),
        data=[
            (
                AvailabilityResponse
                .model_validate(item)
                .model_dump(mode="json")
            )
            for item in availability
        ],
    )


# =========================================================
# UPDATE AVAILABILITY
# =========================================================

@router.put(
    "/{availability_id}",
)
def update_availability(
    availability_id: int,
    data: AvailabilityUpdate,
    db: Session = Depends(get_db),
    _user=Depends(
        has_permission("availability.update")
    ),
):

    # -----------------------------------------------------
    # Find availability
    # -----------------------------------------------------

    availability = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.id
            == availability_id
        )
        .first()
    )

    if not availability:

        raise HTTPException(
            status_code=404,
            detail="Availability not found",
        )

    # -----------------------------------------------------
    # Update data
    # -----------------------------------------------------

    update_data = data.model_dump(
        exclude_unset=True
    )

    # -----------------------------------------------------
    # Final values
    # -----------------------------------------------------

    final_date = update_data.get(
        "date",
        availability.date,
    )

    final_start = update_data.get(
        "start_time",
        availability.start_time,
    )

    final_end = update_data.get(
        "end_time",
        availability.end_time,
    )

    final_slot_duration = update_data.get(
        "slot_duration",
        availability.slot_duration,
    )

    # -----------------------------------------------------
    # Remove timezone
    # -----------------------------------------------------

    if hasattr(final_start, "tzinfo"):

        final_start = final_start.replace(
            tzinfo=None
        )

    if hasattr(final_end, "tzinfo"):

        final_end = final_end.replace(
            tzinfo=None
        )

    # -----------------------------------------------------
    # Validate date
    # -----------------------------------------------------

    from datetime import date

    if final_date < date.today():

        raise HTTPException(
            status_code=400,
            detail=(
                "Availability date "
                "cannot be in the past"
            ),
        )

    # -----------------------------------------------------
    # Validate time
    # -----------------------------------------------------

    if final_start >= final_end:

        raise HTTPException(
            status_code=400,
            detail=(
                "Start time must be "
                "before end time"
            ),
        )

    # -----------------------------------------------------
    # Check leave
    # -----------------------------------------------------

    leave = (
        db.query(DoctorLeave)
        .filter(
            DoctorLeave.doctor_id
            == availability.doctor_id,

            DoctorLeave.leave_date
            == final_date,
        )
        .first()
    )

    if leave:

        raise HTTPException(
            status_code=400,
            detail=(
                "Doctor is on leave "
                "on this date"
            ),
        )

    # -----------------------------------------------------
    # Validate slot duration
    # -----------------------------------------------------

    duration_seconds = (
        datetime.combine(
            final_date,
            final_end,
        )
        - datetime.combine(
            final_date,
            final_start,
        )
    ).total_seconds()

    slot_seconds = (
        final_slot_duration * 60
    )

    if duration_seconds % slot_seconds != 0:

        raise HTTPException(
            status_code=400,
            detail=(
                "Availability duration must be "
                "divisible by slot duration"
            ),
        )

    # -----------------------------------------------------
    # Check overlap
    # -----------------------------------------------------

    existing = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_id
            == availability.doctor_id,

            DoctorAvailability.date
            == final_date,

            DoctorAvailability.is_active == True,

            DoctorAvailability.id
            != availability.id,
        )
        .all()
    )

    for item in existing:

        if (
            final_start < item.end_time
            and final_end > item.start_time
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "Availability time overlaps "
                    "with existing availability"
                ),
            )

    # -----------------------------------------------------
    # Automatically calculate day
    # -----------------------------------------------------

    update_data["date"] = final_date

    update_data["day_of_week"] = (
        final_date.weekday()
    )

    update_data["start_time"] = final_start

    update_data["end_time"] = final_end

    # -----------------------------------------------------
    # Update
    # -----------------------------------------------------

    for field, value in update_data.items():

        setattr(
            availability,
            field,
            value,
        )

    # -----------------------------------------------------
    # Save
    # -----------------------------------------------------

    try:

        db.commit()

        db.refresh(availability)

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Availability already exists "
                "for this time period"
            ),
        )

    # -----------------------------------------------------
    # Response
    # -----------------------------------------------------

    return ApiResponse.success(
        message=(
            "Availability updated successfully"
        ),
        data=(
            AvailabilityResponse
            .model_validate(availability)
            .model_dump(mode="json")
        ),
    )


# =========================================================
# DELETE AVAILABILITY
# =========================================================

@router.delete(
    "/{availability_id}",
)
def delete_availability(
    availability_id: int,
    db: Session = Depends(get_db),
    _user=Depends(
        has_permission("availability.delete")
    ),
):

    availability = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.id
            == availability_id
        )
        .first()
    )

    if not availability:

        raise HTTPException(
            status_code=404,
            detail="Availability not found",
        )

    db.delete(availability)

    db.commit()

    return ApiResponse.success(
        message=(
            "Availability deleted successfully"
        )
    )


# =========================================================
# CREATE DOCTOR LEAVE
# =========================================================

@router.post(
    "/{doctor_id}/leave",
    status_code=201,
)
def create_leave(
    doctor_id: str,
    data: LeaveCreate,
    db: Session = Depends(get_db),
    _user=Depends(
        has_permission("availability.update")
    ),
):

    # -----------------------------------------------------
    # Check doctor
    # -----------------------------------------------------

    get_doctor(
        doctor_id,
        db,
    )

    # -----------------------------------------------------
    # Check existing leave
    # -----------------------------------------------------

    existing_leave = (
        db.query(DoctorLeave)
        .filter(
            DoctorLeave.doctor_id == doctor_id,
            DoctorLeave.leave_date
            == data.leave_date,
        )
        .first()
    )

    if existing_leave:

        raise HTTPException(
            status_code=409,
            detail=(
                "Doctor already has leave "
                "on this date"
            ),
        )

    # -----------------------------------------------------
    # Disable availability on leave date
    # -----------------------------------------------------

    existing_availability = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_id
            == doctor_id,

            DoctorAvailability.date
            == data.leave_date,

            DoctorAvailability.is_active == True,
        )
        .all()
    )

    for item in existing_availability:

        item.is_active = False

    # -----------------------------------------------------
    # Create leave
    # -----------------------------------------------------

    leave = DoctorLeave(
        doctor_id=doctor_id,
        leave_date=data.leave_date,
        reason=data.reason,
    )

    db.add(leave)

    try:

        db.commit()

        db.refresh(leave)

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Unable to create doctor leave"
            ),
        )

    # -----------------------------------------------------
    # Response
    # -----------------------------------------------------

    return ApiResponse.success(
        message=(
            "Doctor leave created successfully"
        ),
        status_code=201,
        data=(
            LeaveResponse
            .model_validate(leave)
            .model_dump(mode="json")
        ),
    )


# =========================================================
# GET DOCTOR LEAVES
# =========================================================

@router.get(
    "/{doctor_id}/leave",
)
def get_leaves(
    doctor_id: str,
    db: Session = Depends(get_db),
    _user=Depends(
        has_permission("availability.read")
    ),
):

    # -----------------------------------------------------
    # Check doctor
    # -----------------------------------------------------

    get_doctor(
        doctor_id,
        db,
    )

    # -----------------------------------------------------
    # Fetch leaves
    # -----------------------------------------------------

    leaves = (
        db.query(DoctorLeave)
        .filter(
            DoctorLeave.doctor_id
            == doctor_id
        )
        .order_by(
            DoctorLeave.leave_date
        )
        .all()
    )

    # -----------------------------------------------------
    # Response
    # -----------------------------------------------------

    return ApiResponse.success(
        message=(
            "Doctor leaves "
            "fetched successfully"
        ),
        data=[
            (
                LeaveResponse
                .model_validate(item)
                .model_dump(mode="json")
            )
            for item in leaves
        ],
    )


# =========================================================
# DELETE DOCTOR LEAVE
# =========================================================

# IMPORTANT:
# This route is BEFORE /{availability_id}
# conceptually and should be registered before it
# if you experience route conflicts.

@router.delete(
    "/leave/{leave_id}",
)
def delete_leave(
    leave_id: int,
    db: Session = Depends(get_db),
    _user=Depends(
        has_permission("availability.delete")
    ),
):

    leave = (
        db.query(DoctorLeave)
        .filter(
            DoctorLeave.id
            == leave_id
        )
        .first()
    )

    if not leave:

        raise HTTPException(
            status_code=404,
            detail="Doctor leave not found",
        )

    db.delete(leave)

    db.commit()

    return ApiResponse.success(
        message=(
            "Doctor leave deleted successfully"
        )
    )