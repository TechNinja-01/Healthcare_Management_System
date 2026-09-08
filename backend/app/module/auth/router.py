from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config.constants import Role
from app.config.database import get_db
from app.config.id_generator import generate_doctor_id
from app.config.response import ApiResponse
from app.config.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    get_user_by_username,
    hash_password,
    verify_password,
)
from app.module.Admin.model import Admin
from app.module.auth.model import User
from app.module.auth.schema import (
    AccessTokenResponse,
    RefreshToken,
    RegisterAdmin,
    RegisterDoctor,
    RegisterPatient,
    TokenResponse,
    UserResponse,
)
from app.module.doctor.model import Doctor
from app.module.patient.model import Patient

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _username_or_email_taken(db: Session, username: str, email: str) -> str | None:
    if db.query(User).filter(User.username == username).first():
        return "Username already exists"
    if db.query(User).filter(User.email == email).first():
        return "Email already exists"
    return None


def _create_user(
    db: Session,
    *,
    username: str,
    email: str,
    password: str,
    role: Role,
) -> User:
    conflict = _username_or_email_taken(db, username, email)
    if conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=conflict,
        )

    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(password),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


@router.post("/register/admin")
def register_admin(payload: RegisterAdmin, db: Session = Depends(get_db)):
    try:
        user = _create_user(
            db,
            username=payload.username,
            email=payload.email,
            password=payload.password,
            role=Role.ADMIN,
        )

        admin = Admin(
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            designation=payload.designation,
            user_id=user.id,
        )
        db.add(admin)
        db.commit()
        db.refresh(user)

        return ApiResponse.success(
            message="Admin registered successfully",
            status_code=201,
            data=UserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                role=user.role.value,
            ).model_dump(),
        )
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not register admin due to a data conflict",
        )
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed",
        )


@router.post("/register/doctor")
def register_doctor(
    payload: RegisterDoctor,
    db: Session = Depends(get_db)
):
    try:
        print("================================")
        print("REGISTER DOCTOR REQUEST")
        print(payload.model_dump())
        print("================================")

        # -----------------------------
        # CREATE USER
        # -----------------------------
        user = _create_user(
            db,
            username=payload.username,
            email=payload.email,
            password=payload.password,
            role=Role.DOCTOR,
        )

        print("USER CREATED:", user.id)

        # -----------------------------
        # GENERATE DOCTOR ID
        # -----------------------------
        doctor_id = generate_doctor_id(db)

        print("GENERATED DOCTOR ID:", doctor_id)

        # -----------------------------
        # CREATE DOCTOR
        # -----------------------------
        doctor = Doctor(
            id=doctor_id,
            name=payload.name,
            specialization=payload.specialization,
            user_id=user.id,
            hospital_name=payload.hospital_name,
            address=payload.address,
            latitude=payload.latitude,
            longitude=payload.longitude,
        )

        db.add(doctor)

        print("DOCTOR OBJECT ADDED")

        # -----------------------------
        # COMMIT
        # -----------------------------
        db.commit()

        db.refresh(user)
        db.refresh(doctor)

        return ApiResponse.success(
            message="Doctor registered successfully",
            status_code=201,
            data={
                **UserResponse(
                    id=user.id,
                    username=user.username,
                    email=user.email,
                    role=user.role.value,
                ).model_dump(),
                "doctor_id": doctor.id,
            },
        )

    except HTTPException:
        db.rollback()
        raise

    except IntegrityError as exc:
        db.rollback()

        print("================================")
        print("INTEGRITY ERROR")
        print(exc)
        print(exc.orig)
        print("================================")

        raise HTTPException(
            status_code=409,
            detail=str(exc.orig),
        )

    except Exception as exc:
        db.rollback()

        print("================================")
        print("GENERAL ERROR")
        print(exc)
        print("================================")

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )

@router.post("/register/patient")
def register_patient(payload: RegisterPatient, db: Session = Depends(get_db)):
    try:
        if db.query(Patient).filter(Patient.email == payload.email).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Patient email already exists",
            )

        if payload.assigned_doctor_id:
            doctor = (
                db.query(Doctor)
                .filter(Doctor.id == payload.assigned_doctor_id)
                .first()
            )
            if not doctor:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Assigned doctor not found",
                )

        user = _create_user(
            db,
            username=payload.username,
            email=payload.email,
            password=payload.password,
            role=Role.PATIENT,
        )

        patient = Patient(
            first_name=payload.first_name,
            last_name=payload.last_name,
            age=payload.age,
            gender=payload.gender.value,
            email=payload.email,
            phone=payload.phone,
            blood_group=payload.blood_group,
            address=payload.address,
            disease=payload.disease,
            doctor_id=payload.assigned_doctor_id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            user_id=user.id,
        )
        db.add(patient)
        db.commit()
        db.refresh(user)

        return ApiResponse.success(
            message="Patient registered successfully",
            status_code=201,
            data=UserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                role=user.role.value,
            ).model_dump(),
        )
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not register patient due to a data conflict",
        )
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed",
        )


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = get_user_by_username(db, form_data.username)

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        {"sub": user.username, "role": user.role.value}
    )
    refresh_token = create_refresh_token({"sub": user.username})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh_token(request: RefreshToken, db: Session = Depends(get_db)):
    payload = decode_token(request.refresh_token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_user_by_username(db, username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        {"sub": user.username, "role": user.role.value}
    )
    return AccessTokenResponse(access_token=access_token, token_type="bearer")


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return ApiResponse.success(message="Current user", data=current_user)
