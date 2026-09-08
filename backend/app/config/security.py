from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config.constants import ROLE_PERMISSIONS, Role
from app.config.database import get_db
from app.config.settings import settings
from app.module.auth.model import User
from app.module.Permission.model import Permission
from app.module.role.model import Role as RoleModel
from app.module.rolePermission.model import RolePermission
from app.module.user_permission.model import UserPermission

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload.update({"exp": expire, "type": "access"})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload.update({"exp": expire, "type": "refresh"})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict[str, Any]]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def _unauthorized(detail: str = "Could not validate credentials") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


def _role_permissions_from_db(user: User, db: Session) -> set[str]:
    role = (
        db.query(RoleModel)
        .filter(RoleModel.name == user.role.value)
        .first()
    )
    if not role:
        return set(ROLE_PERMISSIONS.get(user.role, []))

    rows = (
        db.query(Permission.name)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .filter(RolePermission.role_id == role.id)
        .all()
    )
    if rows:
        return {name for (name,) in rows}

    return set(ROLE_PERMISSIONS.get(user.role, []))


def get_effective_permissions(user: User, db: Session) -> list[str]:
    effective_permissions = _role_permissions_from_db(user, db)

    overrides = (
        db.query(
            UserPermission.permission_id,
            UserPermission.allowed,
            Permission.name,
        )
        .join(Permission, Permission.id == UserPermission.permission_id)
        .filter(UserPermission.user_id == user.id)
        .all()
    )

    for _permission_id, allowed, permission_name in overrides:
        if allowed:
            effective_permissions.add(permission_name)
        else:
            effective_permissions.discard(permission_name)

    return sorted(effective_permissions)


def build_current_user_payload(user: User, db: Session) -> dict[str, Any]:
    profile: Optional[dict[str, Any]] = None

    if user.role == Role.ADMIN:
        admin = user.admin
        if admin:
            profile = {
                "id": admin.id,
                "name": admin.name,
                "email": admin.email,
                "phone": admin.phone,
                "designation": admin.designation,
            }
    elif user.role == Role.DOCTOR:
        doctor = user.doctor
        if doctor:
            profile = {
                "id": doctor.id,
                "name": doctor.name,
                "specialization": doctor.specialization,
                "hospital_name": doctor.hospital_name,
                "address": doctor.address,
                "latitude": doctor.latitude,
                "longitude": doctor.longitude,
            }
    elif user.role == Role.PATIENT:
        patient = user.patient
        if patient:
            profile = {
                "id": patient.id,
                "first_name": patient.first_name,
                "last_name": patient.last_name,
                "age": patient.age,
                "gender": patient.gender,
                "email": patient.email,
                "phone": patient.phone,
                "blood_group": patient.blood_group,
                "address": patient.address,
                "disease": patient.disease,
                "doctor_id": patient.doctor_id,
                "latitude": patient.latitude,
                "longitude": patient.longitude,
            }

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{user.role.value} profile not found",
        )

    permissions = get_effective_permissions(user, db)

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role.value,
        "is_active": user.is_active,
        "permissions": permissions,
        "profile": profile,
    }


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    payload = decode_token(token)
    if payload is None:
        raise _unauthorized("Invalid or expired token")

    if payload.get("type") != "access":
        raise _unauthorized("Invalid access token")

    username = payload.get("sub")
    if not username:
        raise _unauthorized("Invalid token")

    user = get_user_by_username(db, username)
    if not user:
        raise _unauthorized("User not found")

    if not user.is_active:
        raise _unauthorized("Inactive user")

    return build_current_user_payload(user, db)
