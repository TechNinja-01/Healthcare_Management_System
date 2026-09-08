import razorpay
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.config.constants import (
    APPOINTMENT_FEE_INR,
    AppointmentStatus,
    PaymentStatus,
    Role,
)
from app.config.database import get_db
from app.config.dependencies import has_permission
from app.config.response import ApiResponse
from app.config.security import get_current_user
from app.config.settings import settings
from app.module.appointment.model import Appointment
from app.module.payment.model import Payment
from app.module.payment.schema import CreateOrderRequest, PaymentVerifyRequest


router = APIRouter(prefix="/payments", tags=["Payments"])

client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)


def _patient_owns_appointment(appointment: Appointment, current_user: dict) -> bool:
    profile = current_user.get("profile") or {}
    return (
        current_user.get("role") == Role.PATIENT.value
        and appointment.patient_id == profile.get("id")
    )


@router.post("/create-order")
def create_order(
    payload: CreateOrderRequest,
    db: Session = Depends(get_db),
    current_user=Depends(has_permission("payment.create")),
):
    if current_user.get("role") != Role.PATIENT.value:
        raise HTTPException(status_code=403, detail="Only patients can pay")

    appointment = (
        db.query(Appointment)
        .options(joinedload(Appointment.payment))
        .filter(Appointment.id == payload.appointment_id)
        .first()
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if not _patient_owns_appointment(appointment, current_user):
        raise HTTPException(status_code=403, detail="Permission denied")

    if appointment.status == AppointmentStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="Appointment is already confirmed")

    if appointment.status == AppointmentStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Appointment is cancelled")

    if (
        appointment.payment
        and appointment.payment.status == PaymentStatus.SUCCESS.value
    ):
        raise HTTPException(status_code=400, detail="Appointment is already paid")

    amount_inr = payload.amount_inr or APPOINTMENT_FEE_INR
    if amount_inr != APPOINTMENT_FEE_INR:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid amount. Expected {APPOINTMENT_FEE_INR} INR",
        )

    amount_paise = int(amount_inr * 100)

    try:
        razorpay_order = client.order.create(
            {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"appt_{appointment.id}",
                "notes": {
                    "user_id": str(current_user["id"]),
                    "appointment_id": str(appointment.id),
                },
            }
        )
    except Exception:
        raise HTTPException(status_code=502, detail="Unable to create payment order")

    # Reuse existing unpaid payment row when present.
    payment = appointment.payment
    if payment and payment.status != PaymentStatus.SUCCESS.value:
        payment.razorpay_order_id = razorpay_order["id"]
        payment.amount = amount_paise
        payment.currency = "INR"
        payment.status = PaymentStatus.CREATED.value
        payment.razorpay_payment_id = None
        payment.razorpay_signature = None
    else:
        payment = Payment(
            appointment_id=appointment.id,
            user_id=current_user["id"],
            razorpay_order_id=razorpay_order["id"],
            amount=amount_paise,
            currency="INR",
            status=PaymentStatus.CREATED.value,
        )
        db.add(payment)

    if appointment.status not in (
        AppointmentStatus.PENDING_PAYMENT,
        AppointmentStatus.PENDING,
    ):
        appointment.status = AppointmentStatus.PENDING_PAYMENT

    try:
        db.commit()
        db.refresh(payment)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Unable to create payment record")

    return {
        "success": True,
        "order_id": razorpay_order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key_id": settings.RAZORPAY_KEY_ID,
        "appointment_id": appointment.id,
        "payment_id": payment.id,
    }


@router.post("/verify")
def verify_payment(
    data: PaymentVerifyRequest,
    db: Session = Depends(get_db),
    current_user=Depends(has_permission("payment.create")),
):
    payment = (
        db.query(Payment)
        .options(joinedload(Payment.appointment))
        .filter(Payment.razorpay_order_id == data.razorpay_order_id)
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    if payment.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    # Idempotent success path.
    if payment.status == PaymentStatus.SUCCESS.value:
        appointment = payment.appointment
        if appointment and appointment.status != AppointmentStatus.CONFIRMED:
            appointment.status = AppointmentStatus.CONFIRMED
            db.commit()
        return ApiResponse.success(
            message="Payment already verified",
            data={
                "payment_id": payment.id,
                "appointment_id": payment.appointment_id,
                "status": payment.status,
                "appointment_status": (
                    appointment.status.value
                    if appointment and hasattr(appointment.status, "value")
                    else (appointment.status if appointment else None)
                ),
            },
        )

    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": data.razorpay_order_id,
                "razorpay_payment_id": data.razorpay_payment_id,
                "razorpay_signature": data.razorpay_signature,
            }
        )
    except Exception:
        payment.status = PaymentStatus.FAILED.value
        db.commit()
        raise HTTPException(status_code=400, detail="Payment verification failed")

    appointment = payment.appointment
    if not appointment:
        raise HTTPException(
            status_code=400,
            detail="Payment is not linked to an appointment",
        )

    if not _patient_owns_appointment(appointment, current_user):
        raise HTTPException(status_code=403, detail="Permission denied")

    payment.razorpay_payment_id = data.razorpay_payment_id
    payment.razorpay_signature = data.razorpay_signature
    payment.status = PaymentStatus.SUCCESS.value
    appointment.status = AppointmentStatus.CONFIRMED

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Unable to finalize payment (possible duplicate payment id)",
        )

    return ApiResponse.success(
        message="Payment verified and appointment confirmed",
        data={
            "payment_id": payment.id,
            "appointment_id": appointment.id,
            "status": payment.status,
            "appointment_status": AppointmentStatus.CONFIRMED.value,
        },
    )


@router.get("/appointment/{appointment_id}")
def get_payment_for_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(has_permission("payment.read")),
):
    appointment = (
        db.query(Appointment)
        .options(joinedload(Appointment.payment))
        .filter(Appointment.id == appointment_id)
        .first()
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    role = current_user.get("role")
    profile = current_user.get("profile") or {}
    if role == Role.PATIENT.value and appointment.patient_id != profile.get("id"):
        raise HTTPException(status_code=403, detail="Permission denied")
    if role == Role.DOCTOR.value and appointment.doctor_id != profile.get("id"):
        raise HTTPException(status_code=403, detail="Permission denied")

    payment = appointment.payment
    if not payment:
        return ApiResponse.success(
            message="No payment found for appointment",
            data=None,
        )

    return ApiResponse.success(
        message="Payment fetched successfully",
        data={
            "id": payment.id,
            "appointment_id": payment.appointment_id,
            "user_id": payment.user_id,
            "razorpay_order_id": payment.razorpay_order_id,
            "razorpay_payment_id": payment.razorpay_payment_id,
            "amount": payment.amount,
            "currency": payment.currency,
            "status": payment.status,
        },
    )


@router.get("/{payment_id}")
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(has_permission("payment.read")),
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    role = current_user.get("role")
    if role == Role.PATIENT.value and payment.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    return ApiResponse.success(
        message="Payment fetched successfully",
        data={
            "id": payment.id,
            "appointment_id": payment.appointment_id,
            "user_id": payment.user_id,
            "razorpay_order_id": payment.razorpay_order_id,
            "razorpay_payment_id": payment.razorpay_payment_id,
            "amount": payment.amount,
            "currency": payment.currency,
            "status": payment.status,
        },
    )
