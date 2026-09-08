from sqlalchemy import Column, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.config.database import Base


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(String(10), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    specialization = Column(String(100))
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=False,
    )
    hospital_name = Column(String(100), nullable=False)
    address = Column(String(300), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    user = relationship("User", back_populates="doctor")
    patients = relationship("Patient", back_populates="doctor")
    appointments = relationship(
        "Appointment",
        back_populates="doctor",
        cascade="all, delete-orphan",
    )
    availability = relationship(
        "DoctorAvailability",
        back_populates="doctor",
        cascade="all, delete-orphan",
    )
    leaves = relationship(
        "DoctorLeave",
        back_populates="doctor",
        cascade="all, delete-orphan",
    )
