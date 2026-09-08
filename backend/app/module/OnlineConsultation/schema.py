from datetime import date, datetime, time
from typing import List, Optional

from pydantic import BaseModel


class ParticipantInfo(BaseModel):
    user_id: int
    name: Optional[str] = None
    role: str


class ConsultationRoomResponse(BaseModel):
    id: int
    room_code: str
    appointment_id: int
    status: str
    appointment_date: Optional[date] = None
    appointment_time: Optional[time] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    # Identity of the current caller and the person they are meeting.
    me: Optional[ParticipantInfo] = None
    peer: Optional[ParticipantInfo] = None

    model_config = {"from_attributes": True}


class ChatMessageResponse(BaseModel):
    id: int
    room_id: int
    sender_user_id: int
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}


class IceServersResponse(BaseModel):
    ice_servers: List[dict]


# ------------------------------------------------------------
# Recording
# ------------------------------------------------------------

class RecordingPart(BaseModel):
    part_number: int
    etag: str


class CompleteRecordingRequest(BaseModel):
    parts: List[RecordingPart]
    duration_seconds: Optional[int] = None
    size_bytes: Optional[int] = None


class RecordingResponse(BaseModel):
    id: int
    room_id: int
    status: str
    size_bytes: Optional[int] = None
    duration_seconds: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
