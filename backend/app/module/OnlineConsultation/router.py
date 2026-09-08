import json
import uuid
from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.config.constants import (
    AppointmentStatus,
    AppointmentType,
    ConsultationStatus,
    Role,
)
from app.config.database import SessionLocal, get_db
from app.config.dependencies import has_permission
from app.config.response import ApiResponse
from app.config.security import decode_token
from app.config.settings import settings
from app.module.appointment.model import Appointment
from app.module.auth.model import User
from app.module.OnlineConsultation.connection import room_manager
from app.module.OnlineConsultation.model import ChatMessage, ConsultationRoom


router = APIRouter(
    prefix="/consultations",
    tags=["Online Consultation"],
)


# ============================================================
# HELPERS
# ============================================================

def _load_appointment(db: Session, appointment_id: int) -> Appointment | None:
    return (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor),
            joinedload(Appointment.consultation),
        )
        .filter(Appointment.id == appointment_id)
        .first()
    )


def _load_room(db: Session, room_code: str) -> ConsultationRoom | None:
    return (
        db.query(ConsultationRoom)
        .options(
            joinedload(ConsultationRoom.appointment)
            .joinedload(Appointment.patient),
            joinedload(ConsultationRoom.appointment)
            .joinedload(Appointment.doctor),
        )
        .filter(ConsultationRoom.room_code == room_code)
        .first()
    )


def _participant_user_ids(appointment: Appointment) -> dict:
    """Map the two allowed user ids for an appointment's room."""

    patient_user_id = (
        appointment.patient.user_id if appointment.patient else None
    )
    doctor_user_id = (
        appointment.doctor.user_id if appointment.doctor else None
    )

    return {
        "patient": patient_user_id,
        "doctor": doctor_user_id,
    }


def _verify_participant(
    appointment: Appointment,
    current_user: dict,
) -> None:
    """Only the appointment's own patient/doctor (or admin) may enter."""

    role = current_user.get("role")

    if role == Role.ADMIN.value:
        return

    user_id = current_user.get("id")
    participants = _participant_user_ids(appointment)

    if role == Role.DOCTOR.value and user_id == participants["doctor"]:
        return

    if role == Role.PATIENT.value and user_id == participants["patient"]:
        return

    raise HTTPException(
        status_code=403,
        detail="You are not a participant of this consultation",
    )


def _serialize_room(
    room: ConsultationRoom,
    current_user: dict,
) -> dict:
    appointment = room.appointment

    status_value = (
        room.status.value
        if hasattr(room.status, "value")
        else room.status
    )

    patient = appointment.patient if appointment else None
    doctor = appointment.doctor if appointment else None

    patient_info = None
    if patient:
        patient_info = {
            "user_id": patient.user_id,
            "name": f"{patient.first_name} {patient.last_name}".strip(),
            "role": Role.PATIENT.value,
        }

    doctor_info = None
    if doctor:
        doctor_info = {
            "user_id": doctor.user_id,
            "name": doctor.name,
            "role": Role.DOCTOR.value,
        }

    # Decide which side is "me" vs the "peer" from the caller's role.
    role = current_user.get("role")
    if role == Role.DOCTOR.value:
        me, peer = doctor_info, patient_info
    elif role == Role.PATIENT.value:
        me, peer = patient_info, doctor_info
    else:
        # Admin/observer: no personal side.
        me, peer = None, None

    return {
        "id": room.id,
        "room_code": room.room_code,
        "appointment_id": room.appointment_id,
        "status": status_value,
        "appointment_date": (
            appointment.appointment_date.isoformat()
            if appointment and appointment.appointment_date
            else None
        ),
        "appointment_time": (
            appointment.appointment_time.isoformat()
            if appointment and appointment.appointment_time
            else None
        ),
        "started_at": (
            room.started_at.isoformat() if room.started_at else None
        ),
        "ended_at": (
            room.ended_at.isoformat() if room.ended_at else None
        ),
        "created_at": (
            room.created_at.isoformat() if room.created_at else None
        ),
        "me": me,
        "peer": peer,
    }


# ============================================================
# CREATE / GET ROOM FOR AN APPOINTMENT
# ============================================================

@router.post("/{appointment_id}/room")
def create_or_get_room(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(has_permission("consultation.read")),
):
    """
    Lazily create (or return the existing) consultation room for an
    online appointment. Only the paired patient/doctor may do this,
    and only once the appointment is paid and confirmed.
    """

    appointment = _load_appointment(db, appointment_id)

    if not appointment:
        return ApiResponse.error(
            message="Appointment not found",
            status_code=404,
        )

    _verify_participant(appointment, current_user)

    appointment_type = (
        appointment.appointment_type.value
        if hasattr(appointment.appointment_type, "value")
        else appointment.appointment_type
    )

    if appointment_type != AppointmentType.ONLINE.value:
        return ApiResponse.error(
            message="This appointment is not an online consultation",
            status_code=400,
        )

    if appointment.status != AppointmentStatus.CONFIRMED:
        return ApiResponse.error(
            message=(
                "Consultation room is available only after the "
                "appointment is paid and confirmed"
            ),
            status_code=400,
        )

    # Return existing room if present.
    if appointment.consultation:
        return ApiResponse.success(
            message="Consultation room ready",
            data=_serialize_room(appointment.consultation, current_user),
        )

    room = ConsultationRoom(
        room_code=uuid.uuid4().hex,
        appointment_id=appointment.id,
        status=ConsultationStatus.SCHEDULED,
    )

    db.add(room)

    try:
        db.commit()
    except IntegrityError:
        # Concurrent create — fall back to the row that won.
        db.rollback()
        room = (
            db.query(ConsultationRoom)
            .filter(ConsultationRoom.appointment_id == appointment.id)
            .first()
        )
        if room is None:
            return ApiResponse.error(
                message="Unable to create consultation room",
                status_code=409,
            )

    room = _load_room(db, room.room_code)

    return ApiResponse.success(
        message="Consultation room ready",
        status_code=201,
        data=_serialize_room(room, current_user),
    )


# ============================================================
# ICE SERVERS (STUN / TURN CONFIG FOR THE BROWSER)
# ============================================================

@router.get("/ice-servers")
def get_ice_servers(
    current_user=Depends(has_permission("consultation.join")),
):
    """WebRTC ICE server config for the frontend RTCPeerConnection."""

    ice_servers: list[dict] = [{"urls": settings.STUN_URL}]

    if settings.TURN_URL:
        turn_entry: dict = {"urls": settings.TURN_URL}
        if settings.TURN_USERNAME:
            turn_entry["username"] = settings.TURN_USERNAME
        if settings.TURN_CREDENTIAL:
            turn_entry["credential"] = settings.TURN_CREDENTIAL
        ice_servers.append(turn_entry)

    return ApiResponse.success(
        message="ICE servers fetched successfully",
        data={"ice_servers": ice_servers},
    )


# ============================================================
# GET ROOM BY CODE
# ============================================================

@router.get("/{room_code}")
def get_room(
    room_code: str,
    db: Session = Depends(get_db),
    current_user=Depends(has_permission("consultation.read")),
):
    room = _load_room(db, room_code)

    if not room:
        return ApiResponse.error(
            message="Consultation room not found",
            status_code=404,
        )

    _verify_participant(room.appointment, current_user)

    return ApiResponse.success(
        message="Consultation room fetched successfully",
        data=_serialize_room(room, current_user),
    )


# ============================================================
# CHAT HISTORY
# ============================================================

@router.get("/{room_code}/messages")
def get_messages(
    room_code: str,
    db: Session = Depends(get_db),
    current_user=Depends(has_permission("consultation.read")),
):
    room = _load_room(db, room_code)

    if not room:
        return ApiResponse.error(
            message="Consultation room not found",
            status_code=404,
        )

    _verify_participant(room.appointment, current_user)

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.room_id == room.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    data = [
        {
            "id": m.id,
            "room_id": m.room_id,
            "sender_user_id": m.sender_user_id,
            "message": m.message,
            "created_at": (
                m.created_at.isoformat() if m.created_at else None
            ),
        }
        for m in messages
    ]

    return ApiResponse.success(
        message="Chat history fetched successfully",
        data=data,
    )


# ============================================================
# SIGNALING WEBSOCKET
# ============================================================
#
# Path:  /consultations/ws/{room_code}?token=<access_token>
#
# The browser can't send Authorization headers on a WebSocket, so the
# JWT is passed as a query param and validated manually. The server only
# relays JSON (offer/answer/ice-candidate/chat/presence) between the two
# peers; audio/video never flows through here.
# ============================================================

# WebSocket close codes (application range 4000-4999).
_WS_UNAUTHORIZED = 4401
_WS_FORBIDDEN = 4403
_WS_ROOM_NOT_FOUND = 4404
_WS_ROOM_FULL = 4409
_WS_REPLACED = 4000

# Message types relayed verbatim to the other peer.
_RELAY_TYPES = {"offer", "answer", "ice-candidate", "ready", "hangup"}


def _authenticate_ws(token: str | None, room_code: str) -> dict | None:
    """
    Validate the token and room membership for a WebSocket connection.

    Returns:
      - None                     -> bad/expired token (unauthorized)
      - {"error": "..."}         -> room missing or user not a participant
      - {"user_id","role",...}   -> authenticated participant
    """

    if not token:
        return None

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None

    username = payload.get("sub")
    if not username:
        return None

    db = SessionLocal()
    try:
        user = (
            db.query(User)
            .filter(User.username == username)
            .first()
        )
        if not user or not user.is_active:
            return None

        room = _load_room(db, room_code)
        if not room:
            return {"error": "room_not_found"}

        participants = _participant_user_ids(room.appointment)
        role = user.role.value

        allowed = (
            role == Role.ADMIN.value
            or (
                role == Role.DOCTOR.value
                and user.id == participants["doctor"]
            )
            or (
                role == Role.PATIENT.value
                and user.id == participants["patient"]
            )
        )
        if not allowed:
            return {"error": "forbidden"}

        return {
            "user_id": user.id,
            "role": role,
            "room_id": room.id,
        }
    finally:
        db.close()


def _mark_room_active(room_id: int) -> None:
    db = SessionLocal()
    try:
        room = (
            db.query(ConsultationRoom)
            .filter(ConsultationRoom.id == room_id)
            .first()
        )
        if room and room.status != ConsultationStatus.ACTIVE:
            room.status = ConsultationStatus.ACTIVE
            if room.started_at is None:
                room.started_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


def _mark_room_ended(room_id: int) -> None:
    db = SessionLocal()
    try:
        room = (
            db.query(ConsultationRoom)
            .filter(ConsultationRoom.id == room_id)
            .first()
        )
        if room and room.status != ConsultationStatus.ENDED:
            room.status = ConsultationStatus.ENDED
            room.ended_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


def _persist_chat(room_id: int, sender_user_id: int, text: str) -> str:
    db = SessionLocal()
    try:
        message = ChatMessage(
            room_id=room_id,
            sender_user_id=sender_user_id,
            message=text,
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        return (
            message.created_at.isoformat()
            if message.created_at
            else datetime.utcnow().isoformat()
        )
    finally:
        db.close()


@router.websocket("/ws/{room_code}")
async def consultation_ws(websocket: WebSocket, room_code: str):
    token = websocket.query_params.get("token")
    auth = _authenticate_ws(token, room_code)

    if auth is None:
        await websocket.close(code=_WS_UNAUTHORIZED)
        return
    if auth.get("error") == "room_not_found":
        await websocket.close(code=_WS_ROOM_NOT_FOUND)
        return
    if auth.get("error") == "forbidden":
        await websocket.close(code=_WS_FORBIDDEN)
        return

    user_id = auth["user_id"]
    room_id = auth["room_id"]

    if not await room_manager.can_join(room_code, user_id):
        await websocket.close(code=_WS_ROOM_FULL)
        return

    await websocket.accept()

    # Replace any stale socket for the same user (e.g. a duplicate tab).
    previous = await room_manager.connect(room_code, user_id, websocket)
    if previous is not None:
        try:
            await previous.close(code=_WS_REPLACED)
        except Exception:
            pass

    _mark_room_active(room_id)

    # Tell the newcomer who is already present. The side that finds an
    # existing peer becomes the WebRTC offer initiator.
    existing_peers = [
        pid for pid in room_manager.peer_ids(room_code) if pid != user_id
    ]
    await websocket.send_json(
        {
            "type": "joined",
            "self_id": user_id,
            "peers": existing_peers,
            "initiator": len(existing_peers) > 0,
        }
    )

    # Notify the other side that someone joined.
    await room_manager.send_to_peers(
        room_code,
        user_id,
        {"type": "peer-joined", "user_id": user_id},
    )

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
            except (ValueError, TypeError):
                continue

            if not isinstance(data, dict):
                continue

            msg_type = data.get("type")

            if msg_type in _RELAY_TYPES:
                await room_manager.send_to_peers(
                    room_code,
                    user_id,
                    {**data, "from": user_id},
                )

            elif msg_type == "chat":
                text = (data.get("message") or "").strip()
                if not text:
                    continue
                created_at = _persist_chat(room_id, user_id, text)
                await room_manager.send_to_peers(
                    room_code,
                    user_id,
                    {
                        "type": "chat",
                        "sender_user_id": user_id,
                        "message": text,
                        "created_at": created_at,
                    },
                )
            # Unknown message types are ignored.

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await room_manager.disconnect(room_code, user_id)
        await room_manager.send_to_peers(
            room_code,
            user_id,
            {"type": "peer-left", "user_id": user_id},
        )
        if room_manager.is_empty(room_code):
            _mark_room_ended(room_id)
