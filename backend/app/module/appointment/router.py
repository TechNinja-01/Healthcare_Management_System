from datetime import date, datetime, time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.config.constants import AppointmentStatus, Role
from app.config.database import get_db
from app.config.dependencies import has_permission
from app.config.response import ApiResponse
from app.module.appointment.model import Appointment
from app.module.appointment.schema import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
)
from app.module.appointment.slots import (
    get_doctor_available_slots,
    is_valid_available_slot,
)
from app.module.auth.model import User
from app.module.doctor.model import Doctor
from app.module.patient.model import Patient
from app.module.payment.model import Payment


router = APIRouter(
    prefix="/appointments",
    tags=["Appointments"],
)


# ============================================================
# SERIALIZE APPOINTMENT
# ============================================================

def _serialize_appointment(appointment: Appointment) -> dict:
    patient_name = None
    doctor_name = None

    if appointment.patient:
        patient_name = (
            f"{appointment.patient.first_name} "
            f"{appointment.patient.last_name}"
        ).strip()

    if appointment.doctor:
        doctor_name = appointment.doctor.name

    # Appointment status
    status = appointment.status
    status_value = (
        status.value
        if hasattr(status, "value")
        else status
    )

    # Created at
    created_at = appointment.created_at

    if isinstance(created_at, datetime):
        created_at = created_at.isoformat()

    # Payment status
    payment_status = None

    if appointment.payment is not None:
        payment_status = appointment.payment.status

        if hasattr(payment_status, "value"):
            payment_status = payment_status.value

    # Disease
    disease = appointment.disease

    # Convert empty string to None
    if disease is not None:
        disease = disease.strip()

        if disease == "":
            disease = None

    payload = AppointmentResponse(
        id=appointment.id,
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        appointment_date=appointment.appointment_date,
        appointment_time=appointment.appointment_time,
        disease=disease,
        status=status_value,
        created_at=str(created_at),
        patient_name=patient_name,
        doctor_name=doctor_name,
    ).model_dump(mode="json")

    payload["payment_status"] = payment_status

    return payload


# ============================================================
# RELOAD APPOINTMENT
# ============================================================

def _reload(
    db: Session,
    appointment_id: int,
) -> Appointment | None:

    return (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor),
            joinedload(Appointment.payment),
        )
        .filter(Appointment.id == appointment_id)
        .first()
    )


# ============================================================
# APPOINTMENTS QUERY BASED ON ROLE
# ============================================================

def _appointments_query(
    db: Session,
    current_user: dict,
):

    role = current_user.get("role")
    profile = current_user.get("profile") or {}

    query = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor),
            joinedload(Appointment.payment),
        )
    )

    # ADMIN
    if role == Role.ADMIN.value:
        return query

    # DOCTOR
    if role == Role.DOCTOR.value:
        return query.filter(
            Appointment.doctor_id == profile.get("id")
        )

    # PATIENT
    if role == Role.PATIENT.value:
        return query.filter(
            Appointment.patient_id == profile.get("id")
        )

    # Unknown role
    return query.filter(
        Appointment.id.is_(None)
    )


# ============================================================
# VERIFY APPOINTMENT ACCESS
# ============================================================

def _verify_access(
    appointment: Appointment,
    current_user: dict,
) -> None:

    role = current_user.get("role")
    profile = current_user.get("profile") or {}

    # ADMIN
    if role == Role.ADMIN.value:
        return

    # DOCTOR
    if (
        role == Role.DOCTOR.value
        and appointment.doctor_id == profile.get("id")
    ):
        return

    # PATIENT
    if (
        role == Role.PATIENT.value
        and appointment.patient_id == profile.get("id")
    ):
        return

    raise HTTPException(
        status_code=403,
        detail="Permission denied",
    )


# ============================================================
# CREATE APPOINTMENT
# ============================================================

@router.post("/")
def create_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        has_permission("appointment.create")
    ),
):
    """
    Create appointment.

    Appointment initially stays in PENDING_PAYMENT
    until Razorpay payment is successfully verified.
    """

    # Only patients can create appointments
    if current_user.get("role") != Role.PATIENT.value:
        return ApiResponse.error(
            message="Only patients can create appointments",
            status_code=403,
        )

    profile = current_user.get("profile") or {}

    patient_id = profile.get("id")

    if not patient_id:
        return ApiResponse.error(
            message="Patient profile not found",
            status_code=404,
        )

    # --------------------------------------------------------
    # Find patient
    # --------------------------------------------------------

    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id)
        .first()
    )

    if not patient:
        return ApiResponse.error(
            message="Patient not found",
            status_code=404,
        )

    # --------------------------------------------------------
    # Validate appointment date
    # --------------------------------------------------------

    if payload.appointment_date < date.today():
        return ApiResponse.error(
            message="Appointment date cannot be in the past",
            status_code=400,
        )

    # --------------------------------------------------------
    # Find doctor
    # --------------------------------------------------------

    doctor = (
        db.query(Doctor)
        .filter(Doctor.id == payload.doctor_id)
        .first()
    )

    if not doctor:
        return ApiResponse.error(
            message="Doctor not found",
            status_code=404,
        )

    # --------------------------------------------------------
    # Check doctor user is active
    # --------------------------------------------------------

    doctor_user = (
        db.query(User)
        .filter(User.id == doctor.user_id)
        .first()
    )

    if not doctor_user or not doctor_user.is_active:
        return ApiResponse.error(
            message="Doctor is not available for appointments",
            status_code=400,
        )

    # --------------------------------------------------------
    # Validate appointment time
    # --------------------------------------------------------

    requested_time = payload.appointment_time.replace(
        microsecond=0
    )

    if payload.appointment_date == date.today():

        appointment_datetime = datetime.combine(
            payload.appointment_date,
            requested_time,
        )

        if appointment_datetime <= datetime.now():

            return ApiResponse.error(
                message="Appointment time cannot be in the past",
                status_code=400,
            )

    # --------------------------------------------------------
    # Validate doctor availability
    # --------------------------------------------------------

    valid_slot, slot_available, slot_reason = (
        is_valid_available_slot(
            db,
            doctor_id=doctor.id,
            appointment_date=payload.appointment_date,
            appointment_time=requested_time,
        )
    )

    if not valid_slot:
        return ApiResponse.error(
            message=(
                "Selected time is not a valid "
                "appointment slot for this doctor"
            ),
            status_code=400,
        )

    if not slot_available:
        return ApiResponse.error(
            message=(
                slot_reason
                or "Selected slot is unavailable"
            ),
            status_code=409,
        )

    # --------------------------------------------------------
    # Disease
    # --------------------------------------------------------

    disease = payload.disease

    if disease is not None:
        disease = disease.strip()

        if disease == "":
            disease = None

    # --------------------------------------------------------
    # Create appointment
    # --------------------------------------------------------

    try:

        appointment = Appointment(
            patient_id=patient.id,
            doctor_id=doctor.id,
            appointment_date=payload.appointment_date,
            appointment_time=requested_time,

            # IMPORTANT
            disease=disease,

            status=AppointmentStatus.PENDING_PAYMENT,

            created_at=datetime.utcnow().isoformat(),
        )

        db.add(appointment)

        db.commit()

        db.refresh(appointment)

    except IntegrityError:

        db.rollback()

        return ApiResponse.error(
            message=(
                "Doctor is already booked "
                "for this date and time"
            ),
            status_code=409,
        )

    # --------------------------------------------------------
    # Reload appointment with relationships
    # --------------------------------------------------------

    appointment = _reload(
        db,
        appointment.id,
    )

    return ApiResponse.success(
        message=(
            "Appointment created. "
            "Complete payment to confirm."
        ),
        status_code=201,
        data=_serialize_appointment(
            appointment
        ),
    )


# ============================================================
# LIST APPOINTMENTS
# ============================================================

@router.get("/")
def list_appointments(
    db: Session = Depends(get_db),
    current_user=Depends(
        has_permission("appointment.read")
    ),
):

    appointments = (
        _appointments_query(
            db,
            current_user,
        )
        .order_by(
            Appointment.appointment_date.desc(),
            Appointment.appointment_time.desc(),
        )
        .all()
    )

    return ApiResponse.success(
        message="Appointments fetched successfully",
        data=[
            _serialize_appointment(item)
            for item in appointments
        ],
    )


# ============================================================
# GET AVAILABLE SLOTS
# ============================================================

@router.get(
    "/doctor/{doctor_id}/available-slots"
)
def get_available_slots(
    doctor_id: str,
    appointment_date: date,
    db: Session = Depends(get_db),
    current_user=Depends(
        has_permission("appointment.create")
    ),
):

    if appointment_date < date.today():

        return ApiResponse.error(
            message="Appointment date cannot be in the past",
            status_code=400,
        )

    doctor = (
        db.query(Doctor)
        .filter(Doctor.id == doctor_id)
        .first()
    )

    if not doctor:

        return ApiResponse.error(
            message="Doctor not found",
            status_code=404,
        )

    rows = get_doctor_available_slots(
        db,
        doctor_id=doctor_id,
        appointment_date=appointment_date,
    )

    slots = []

    for row in rows:

        slot_time = row["time"]

        if isinstance(slot_time, time):
            slot_time = slot_time.isoformat()

        slots.append(
            {
                "time": slot_time,
                "available": row["available"],
                "reason": row["reason"],
            }
        )

    return ApiResponse.success(
        message="Doctor availability fetched successfully",
        data={
            "doctor_id": doctor.id,
            "doctor_name": doctor.name,
            "date": appointment_date.isoformat(),

            "available": any(
                slot["available"]
                for slot in slots
                if slot["time"]
            ),

            "slots": slots,
        },
    )


# ============================================================
# GET SINGLE APPOINTMENT
# ============================================================

@router.get("/{appointment_id}")
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        has_permission("appointment.read")
    ),
):

    appointment = _reload(
        db,
        appointment_id,
    )

    if not appointment:

        return ApiResponse.error(
            message="Appointment not found",
            status_code=404,
        )

    _verify_access(
        appointment,
        current_user,
    )

    return ApiResponse.success(
        message="Appointment fetched successfully",
        data=_serialize_appointment(
            appointment
        ),
    )


# ============================================================
# UPDATE APPOINTMENT
# ============================================================

@router.put("/{appointment_id}")
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        has_permission("appointment.update")
    ),
):

    appointment = (
        db.query(Appointment)
        .filter(
            Appointment.id == appointment_id
        )
        .first()
    )

    if not appointment:

        return ApiResponse.error(
            message="Appointment not found",
            status_code=404,
        )

    _verify_access(
        appointment,
        current_user,
    )

    role = current_user.get("role")

    update_data = payload.model_dump(
        exclude_unset=True
    )

    # --------------------------------------------------------
    # PATIENT
    # --------------------------------------------------------

    if role == Role.PATIENT.value:

        update_data = {
            key: value
            for key, value in update_data.items()
            if key == "status"
        }

        next_status = update_data.get("status")

        next_value = (
            next_status.value
            if hasattr(next_status, "value")
            else next_status
        )

        if next_value != AppointmentStatus.CANCELLED.value:

            return ApiResponse.error(
                message=(
                    "Patients can only "
                    "cancel appointments"
                ),
                status_code=403,
            )

    # --------------------------------------------------------
    # DOCTOR
    # --------------------------------------------------------

    if role == Role.DOCTOR.value:

        next_status = update_data.get("status")

        if next_status is not None:

            next_value = (
                next_status.value
                if hasattr(next_status, "value")
                else next_status
            )

            allowed_statuses = (
                AppointmentStatus.COMPLETED.value,
                AppointmentStatus.CANCELLED.value,
                AppointmentStatus.NO_SHOW.value,
                AppointmentStatus.CONFIRMED.value,
            )

            if next_value not in allowed_statuses:

                return ApiResponse.error(
                    message="Invalid appointment status transition",
                    status_code=400,
                )

    # --------------------------------------------------------
    # Clean disease
    # --------------------------------------------------------

    if "disease" in update_data:

        disease = update_data["disease"]

        if disease is not None:

            disease = disease.strip()

            if disease == "":
                disease = None

        update_data["disease"] = disease

    # --------------------------------------------------------
    # Apply updates
    # --------------------------------------------------------

    for field, value in update_data.items():

        setattr(
            appointment,
            field,
            value,
        )

    try:

        db.commit()

    except IntegrityError:

        db.rollback()

        return ApiResponse.error(
            message="Unable to update appointment",
            status_code=409,
        )

    appointment = _reload(
        db,
        appointment_id,
    )

    return ApiResponse.success(
        message="Appointment updated successfully",
        data=_serialize_appointment(
            appointment
        ),
    )


# ============================================================
# DELETE APPOINTMENT
# ============================================================

@router.delete("/{appointment_id}")
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        has_permission("appointment.delete")
    ),
):

    appointment = (
        db.query(Appointment)
        .filter(
            Appointment.id == appointment_id
        )
        .first()
    )

    if not appointment:

        return ApiResponse.error(
            message="Appointment not found",
            status_code=404,
        )

    _verify_access(
        appointment,
        current_user,
    )

    db.delete(appointment)

    db.commit()

    return ApiResponse.success(
        message="Appointment deleted successfully"
    )