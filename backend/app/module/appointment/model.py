from datetime import datetime

from sqlalchemy import (
    Column,
    Date,
    Enum,
    ForeignKey,
    Integer,
    String,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.config.constants import AppointmentStatus
from app.config.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(
        Integer,
        ForeignKey("patients.id"),
        nullable=False,
    )

    doctor_id = Column(
        String(10),
        ForeignKey("doctors.id"),
        nullable=False,
    )

    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(Time, nullable=False)
    disease = Column(String(255), nullable=True)
    status = Column(
        Enum(
            AppointmentStatus,
            name="appointment_status",
            values_callable=lambda enum: [item.value for item in enum],
            native_enum=False,
            length=20,
        ),
        nullable=False,
        default=AppointmentStatus.PENDING_PAYMENT,
    )

    created_at = Column(
        String(30),
        nullable=False,
        default=lambda: datetime.utcnow().isoformat(),
    )

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    payment = relationship(
        "Payment",
        back_populates="appointment",
        uselist=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "doctor_id",
            "appointment_date",
            "appointment_time",
            name="uq_doctor_appointment_slot",
        ),
    )
