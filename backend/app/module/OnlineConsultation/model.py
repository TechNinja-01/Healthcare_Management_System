from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.config.constants import ConsultationStatus
from app.config.database import Base


class ConsultationRoom(Base):
    """
    A one-on-one video/audio/chat room bound to a single appointment.

    The room only brokers signaling + chat; media flows peer-to-peer
    between the patient and doctor browsers via WebRTC.
    """

    __tablename__ = "consultation_rooms"

    id = Column(Integer, primary_key=True, index=True)

    # Unguessable public identifier used in URLs and the WebSocket path.
    room_code = Column(
        String(36),
        unique=True,
        nullable=False,
        index=True,
    )

    appointment_id = Column(
        Integer,
        ForeignKey("appointments.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    status = Column(
        Enum(
            ConsultationStatus,
            name="consultation_status",
            values_callable=lambda enum: [item.value for item in enum],
            native_enum=False,
            length=20,
        ),
        nullable=False,
        default=ConsultationStatus.SCHEDULED,
        server_default=ConsultationStatus.SCHEDULED.value,
    )

    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    appointment = relationship(
        "Appointment",
        back_populates="consultation",
    )
    messages = relationship(
        "ChatMessage",
        back_populates="room",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )


class ChatMessage(Base):
    """A single chat line exchanged inside a consultation room."""

    __tablename__ = "consultation_messages"

    id = Column(Integer, primary_key=True, index=True)

    room_id = Column(
        Integer,
        ForeignKey("consultation_rooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    sender_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    message = Column(Text, nullable=False)

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    room = relationship(
        "ConsultationRoom",
        back_populates="messages",
    )
