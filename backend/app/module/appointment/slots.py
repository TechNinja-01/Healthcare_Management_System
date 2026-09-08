"""Generate bookable appointment slots from doctor availability."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.config.constants import AppointmentStatus
from app.module.Availability.model import DoctorAvailability, DoctorLeave
from app.module.appointment.model import Appointment


BOOKED_STATUSES = (
    AppointmentStatus.PENDING_PAYMENT,
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.COMPLETED,
)


def generate_slots_for_window(
    start_time: time,
    end_time: time,
    slot_duration_minutes: int,
) -> list[time]:
    if slot_duration_minutes <= 0 or start_time >= end_time:
        return []

    slots: list[time] = []
    cursor = datetime.combine(date.today(), start_time)
    end_dt = datetime.combine(date.today(), end_time)
    delta = timedelta(minutes=slot_duration_minutes)

    # Do not include the end boundary as a bookable start.
    while cursor + delta <= end_dt:
        slots.append(cursor.time().replace(microsecond=0))
        cursor += delta

    return slots


def get_doctor_available_slots(
    db: Session,
    *,
    doctor_id: str,
    appointment_date: date,
) -> list[dict[str, Any]]:
    leave = (
        db.query(DoctorLeave)
        .filter(
            DoctorLeave.doctor_id == doctor_id,
            DoctorLeave.leave_date == appointment_date,
        )
        .first()
    )
    if leave:
        return [{"time": None, "available": False, "reason": "Doctor is on leave"}]

    windows = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_id == doctor_id,
            DoctorAvailability.date == appointment_date,
            DoctorAvailability.is_active.is_(True),
        )
        .order_by(DoctorAvailability.start_time)
        .all()
    )
    if not windows:
        return []

    booked = {
        (
            row.appointment_time.replace(microsecond=0)
            if hasattr(row.appointment_time, "replace")
            else row.appointment_time
        )
        for row in db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date == appointment_date,
            Appointment.status.in_(BOOKED_STATUSES),
        )
        .all()
    }

    now = datetime.now()
    results: list[dict[str, Any]] = []
    seen: set[str] = set()

    for window in windows:
        for slot in generate_slots_for_window(
            window.start_time,
            window.end_time,
            window.slot_duration,
        ):
            key = slot.strftime("%H:%M:%S")
            if key in seen:
                continue
            seen.add(key)

            available = True
            reason = None

            if appointment_date == date.today():
                if datetime.combine(appointment_date, slot) <= now:
                    available = False
                    reason = "Slot is in the past"

            if available and slot in booked:
                available = False
                reason = "Already booked"

            results.append(
                {"time": slot, "available": available, "reason": reason}
            )

    results.sort(key=lambda item: item["time"] or time.min)
    return results


def is_valid_available_slot(
    db: Session,
    *,
    doctor_id: str,
    appointment_date: date,
    appointment_time: time,
) -> tuple[bool, bool, str | None]:
    requested = appointment_time.replace(microsecond=0)
    for slot in get_doctor_available_slots(
        db,
        doctor_id=doctor_id,
        appointment_date=appointment_date,
    ):
        slot_time = slot["time"]
        if slot_time is None:
            continue
        if slot_time.replace(microsecond=0) == requested:
            return True, bool(slot["available"]), slot.get("reason")
    return False, False, None
