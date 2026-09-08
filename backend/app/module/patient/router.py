from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Query, Session

from app.config.constants import Role
from app.config.database import get_db
from app.config.dependencies import has_permission
from app.config.response import ApiResponse
from app.module.auth.model import User
from app.module.doctor.model import Doctor
from app.module.patient.model import Patient
from app.module.patient.schema import PatientCreate, PatientResponse, PatientUpdate

router = APIRouter(prefix="/patient", tags=["Patient"])


def _patients_query(db: Session, current_user: dict) -> Query:
    role = current_user.get("role")
    profile = current_user.get("profile") or {}

    if role == Role.ADMIN.value:
        return db.query(Patient)

    if role == Role.DOCTOR.value:
        doctor_id = profile.get("id")
        if not doctor_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found",
            )
        return db.query(Patient).filter(Patient.doctor_id == doctor_id)

    if role == Role.PATIENT.value:
        patient_id = profile.get("id")
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient profile not found",
            )
        return db.query(Patient).filter(Patient.id == patient_id)

    return db.query(Patient).filter(Patient.id.is_(None))


def _verify_patient_access(patient: Patient, current_user: dict) -> None:
    role = current_user.get("role")
    profile = current_user.get("profile") or {}

    if role == Role.ADMIN.value:
        return

    if role == Role.DOCTOR.value:
        if patient.doctor_id != profile.get("id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied",
            )
        return

    if role == Role.PATIENT.value:
        if patient.id != profile.get("id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied",
            )
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Permission denied",
    )


@router.post("/")
def create_patient(
    patient: PatientCreate,
    db: Session = Depends(get_db),
    _user=Depends(has_permission("patient.create")),
):
    if db.query(Patient).filter(Patient.id == patient.id).first():
        return ApiResponse.error(message="Patient already exists", status_code=409)

    if db.query(Patient).filter(Patient.email == patient.email).first():
        return ApiResponse.error(
            message="Patient email already exists",
            status_code=409,
        )

    user = db.query(User).filter(User.id == patient.user_id).first()
    if not user:
        return ApiResponse.error(message="User not found", status_code=404)

    if user.role != Role.PATIENT:
        return ApiResponse.error(
            message="Linked user must have patient role",
            status_code=400,
        )

    if db.query(Patient).filter(Patient.user_id == patient.user_id).first():
        return ApiResponse.error(
            message="Patient profile already exists for this user",
            status_code=409,
        )

    if patient.doctor_id:
        doctor = db.query(Doctor).filter(Doctor.id == patient.doctor_id).first()
        if not doctor:
            return ApiResponse.error(message="Doctor not found", status_code=404)

    try:
        data = patient.model_dump()
        data["gender"] = patient.gender.value
        db_patient = Patient(**data)
        db.add(db_patient)
        db.commit()
        db.refresh(db_patient)
    except IntegrityError:
        db.rollback()
        return ApiResponse.error(
            message="Could not create patient due to a data conflict",
            status_code=409,
        )

    return ApiResponse.success(
        message="Patient created successfully",
        status_code=201,
        data=PatientResponse.model_validate(db_patient).model_dump(),
    )


@router.get("/")
def get_all_patients(
    db: Session = Depends(get_db),
    current_user=Depends(has_permission("patient.read")),
):
    patients = _patients_query(db, current_user).all()
    return ApiResponse.success(
        message="Patients fetched successfully",
        data=[
            PatientResponse.model_validate(patient).model_dump()
            for patient in patients
        ],
    )


@router.get("/{patient_id}")
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(has_permission("patient.read")),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return ApiResponse.error(message="Patient not found", status_code=404)

    _verify_patient_access(patient, current_user)

    return ApiResponse.success(
        message="Patient fetched successfully",
        data=PatientResponse.model_validate(patient).model_dump(),
    )


@router.put("/{patient_id}")
def update_patient(
    patient_id: str,
    patient_update: PatientUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(has_permission("patient.update")),
):
    db_patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not db_patient:
        return ApiResponse.error(message="Patient not found", status_code=404)

    _verify_patient_access(db_patient, current_user)

    update_data = patient_update.model_dump(exclude_unset=True)

    if current_user.get("role") == Role.DOCTOR.value:
        update_data.pop("doctor_id", None)

    if "gender" in update_data and update_data["gender"] is not None:
        update_data["gender"] = (
            update_data["gender"].value
            if hasattr(update_data["gender"], "value")
            else update_data["gender"]
        )

    if "doctor_id" in update_data and update_data["doctor_id"]:
        doctor = db.query(Doctor).filter(
            Doctor.id == update_data["doctor_id"]
        ).first()
        if not doctor:
            return ApiResponse.error(message="Doctor not found", status_code=404)

    for key, value in update_data.items():
        setattr(db_patient, key, value)

    try:
        db.commit()
        db.refresh(db_patient)
    except IntegrityError:
        db.rollback()
        return ApiResponse.error(
            message="Could not update patient due to a data conflict",
            status_code=409,
        )

    return ApiResponse.success(
        message="Patient updated successfully",
        data=PatientResponse.model_validate(db_patient).model_dump(),
    )


@router.delete("/{patient_id}")
def delete_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    _user=Depends(has_permission("patient.delete")),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return ApiResponse.error(message="Patient not found", status_code=404)

    db.delete(patient)
    db.commit()

    return ApiResponse.success(message="Patient deleted successfully")
