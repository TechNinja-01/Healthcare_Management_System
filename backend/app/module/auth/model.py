from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, Identity, Integer, String
from sqlalchemy.orm import relationship

from app.config.constants import Role
from app.config.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, Identity(always=False), primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(
        Enum(
            Role,
            name="role",
            values_callable=lambda enum: [item.value for item in enum],
            native_enum=False,
            length=7,
        ),
        nullable=False,
    )
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    admin = relationship("Admin", back_populates="user", uselist=False)
    doctor = relationship("Doctor", back_populates="user", uselist=False)
    patient = relationship("Patient", back_populates="user", uselist=False)
