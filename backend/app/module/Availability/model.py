from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Time,
    Date,
    Boolean,
    UniqueConstraint,
)

from sqlalchemy.orm import relationship

from app.config.database import Base


# =========================================================
# DOCTOR AVAILABILITY
# =========================================================

class DoctorAvailability(Base):

    __tablename__ = "doctor_availability"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    doctor_id = Column(
        String(10),
        ForeignKey(
            "doctors.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # Specific date
    date = Column(
        Date,
        nullable=False,
        index=True,
    )

    # Monday = 0
    # Tuesday = 1
    # Wednesday = 2
    # Thursday = 3
    # Friday = 4
    # Saturday = 5
    # Sunday = 6
    day_of_week = Column(
        Integer,
        nullable=False,
    )

    start_time = Column(
        Time,
        nullable=False,
    )

    end_time = Column(
        Time,
        nullable=False,
    )

    # Appointment slot duration
    # Example: 30 minutes
    slot_duration = Column(
        Integer,
        nullable=False,
        default=30,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    # Relationship
    doctor = relationship(
        "Doctor",
        back_populates="availability",
    )

    __table_args__ = (
        UniqueConstraint(
            "doctor_id",
            "date",
            "start_time",
            "end_time",
            name="uq_doctor_availability",
        ),
    )


# =========================================================
# DOCTOR LEAVE
# =========================================================

class DoctorLeave(Base):

    __tablename__ = "doctor_leave"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    doctor_id = Column(
        String(10),
        ForeignKey(
            "doctors.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    leave_date = Column(
        Date,
        nullable=False,
        index=True,
    )

    reason = Column(
        String(255),
        nullable=True,
    )

    # Relationship
    doctor = relationship(
        "Doctor",
        back_populates="leaves",
    )
    

    __table_args__ = (
        UniqueConstraint(
            "doctor_id",
            "leave_date",
            name="uq_doctor_leave",
        ),
    )