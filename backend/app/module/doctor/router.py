from math import radians

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.config.dependencies import has_permission
from app.config.id_generator import generate_doctor_id
from app.config.response import ApiResponse
from app.config.security import get_current_user
from app.module.auth.model import User
from app.module.doctor.model import Doctor
from app.module.doctor.schema import (
    DoctorCreate,
    DoctorResponse,
    DoctorUpdate,
)
from app.utills.distance import calculate_distance_km


router = APIRouter(
    prefix="/doctor",
    tags=["Doctor"],
)


# =========================================================
# SERIALIZE DOCTOR
# =========================================================

def _serialize_doctor(
    doctor: Doctor,
    distance_km: float | None = None,
) -> dict:

    payload = (
        DoctorResponse
        .model_validate(doctor)
        .model_dump()
    )

    if distance_km is not None:
        payload["distance_km"] = round(
            float(distance_km),
            2,
        )

    return payload


# =========================================================
# GET ALL DOCTORS
# =========================================================

@router.get("/")
def get_doctors(
    db: Session = Depends(get_db),
    _user=Depends(has_permission("doctor.read")),
):

    doctors = (
        db.query(Doctor)
        .order_by(Doctor.id)
        .all()
    )

    return ApiResponse.success(
        message="Doctors fetched successfully",
        data=[
            _serialize_doctor(doctor)
            for doctor in doctors
        ],
    )


# =========================================================
# SEARCH DOCTORS
# =========================================================

@router.get("/doctors")
def search_doctors(
    search: str = "",
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):

    search = search.strip()

    query = db.query(Doctor)

    if search:

        search_term = f"%{search}%"

        query = query.filter(
            or_(
                Doctor.name.ilike(
                    search_term
                ),

                Doctor.specialization.ilike(
                    search_term
                ),

                Doctor.hospital_name.ilike(
                    search_term
                ),

                Doctor.address.ilike(
                    search_term
                ),
            )
        )

    doctors = (
        query
        .order_by(Doctor.name)
        .all()
    )

    return ApiResponse.success(
        message="Doctors fetched successfully",
        data=[
            _serialize_doctor(doctor)
            for doctor in doctors
        ],
    )


# =========================================================
# NEARBY + SEARCH DOCTORS
# =========================================================

@router.get("/nearby")
def get_nearby_doctors(
    latitude: float,
    longitude: float,

    radius: float = Query(
        5,
        gt=0,
        alias="radius",
    ),

    radius_km: float | None = Query(
        None,
        gt=0,
    ),

    search: str = "",

    db: Session = Depends(get_db),

    _user=Depends(get_current_user),
):

    # -----------------------------------------------------
    # SEARCH RADIUS
    # -----------------------------------------------------

    search_radius = (
        radius_km
        if radius_km is not None
        else radius
    )

    # -----------------------------------------------------
    # SEARCH TEXT
    # -----------------------------------------------------

    search = search.strip()

    # -----------------------------------------------------
    # PATIENT LOCATION
    # -----------------------------------------------------

    user_lat = radians(latitude)
    user_lon = radians(longitude)

    # -----------------------------------------------------
    # DOCTOR LOCATION
    # -----------------------------------------------------

    doctor_lat = func.radians(
        Doctor.latitude
    )

    doctor_lon = func.radians(
        Doctor.longitude
    )

    # -----------------------------------------------------
    # HAVERSINE DISTANCE
    # -----------------------------------------------------

    distance = (
        6371
        * 2
        * func.asin(
            func.sqrt(
                func.pow(
                    func.sin(
                        (
                            doctor_lat
                            - user_lat
                        )
                        / 2
                    ),
                    2,
                )
                +
                func.cos(user_lat)
                *
                func.cos(
                    doctor_lat
                )
                *
                func.pow(
                    func.sin(
                        (
                            doctor_lon
                            - user_lon
                        )
                        / 2
                    ),
                    2,
                )
            )
        )
    )

    # -----------------------------------------------------
    # QUERY
    # -----------------------------------------------------

    query = (
        db.query(
            Doctor,
            distance.label(
                "distance_km"
            ),
        )
        .filter(
            Doctor.latitude.isnot(None)
        )
        .filter(
            Doctor.longitude.isnot(None)
        )
    )

    # -----------------------------------------------------
    # SEARCH FILTER
    # -----------------------------------------------------

    if search:

        search_term = f"%{search}%"

        query = query.filter(
            or_(
                Doctor.name.ilike(
                    search_term
                ),

                Doctor.specialization.ilike(
                    search_term
                ),

                Doctor.hospital_name.ilike(
                    search_term
                ),

                Doctor.address.ilike(
                    search_term
                ),
            )
        )

    # -----------------------------------------------------
    # DISTANCE FILTER
    # -----------------------------------------------------

    query = query.filter(
        distance <= search_radius
    )

    # -----------------------------------------------------
    # ORDER BY DISTANCE
    # -----------------------------------------------------

    doctors = (
        query
        .order_by(distance)
        .all()
    )

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return ApiResponse.success(
        message="Nearby doctors fetched successfully",

        data=[
            _serialize_doctor(
                doctor,
                distance_km,
            )

            for doctor, distance_km
            in doctors
        ],
    )


# =========================================================
# GET DOCTOR BY ID
# =========================================================

@router.get("/{doctor_id}")
def get_doctor(
    doctor_id: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):

    doctor = (
        db.query(Doctor)
        .filter(
            Doctor.id == doctor_id
        )
        .first()
    )

    if not doctor:

        raise HTTPException(
            status_code=404,
            detail="Doctor not found",
        )

    return ApiResponse.success(
        message="Doctor fetched successfully",

        data=_serialize_doctor(
            doctor
        ),
    )


# =========================================================
# CREATE DOCTOR
# =========================================================

@router.post("/")
def create_doctor(
    data: DoctorCreate,
    db: Session = Depends(get_db),

    _user=Depends(
        has_permission(
            "doctor.create"
        )
    ),
):

    user = (
        db.query(User)
        .filter(
            User.id == data.user_id
        )
        .first()
    )

    if not user:

        return ApiResponse.error(
            message="User not found",
            status_code=404,
        )

    existing_doctor = (
        db.query(Doctor)
        .filter(
            Doctor.user_id
            == data.user_id
        )
        .first()
    )

    if existing_doctor:

        return ApiResponse.error(
            message=(
                "Doctor profile already "
                "exists for this user"
            ),
            status_code=409,
        )

    try:

        doctor = Doctor(
            id=generate_doctor_id(db),
            **data.model_dump(),
        )

        db.add(doctor)

        db.commit()

        db.refresh(doctor)

    except IntegrityError:

        db.rollback()

        return ApiResponse.error(
            message=(
                "Doctor already exists "
                "or invalid data"
            ),
            status_code=400,
        )

    return ApiResponse.success(
        message="Doctor created successfully",
        status_code=201,
        data=_serialize_doctor(
            doctor
        ),
    )


# =========================================================
# UPDATE DOCTOR
# =========================================================

@router.put("/{doctor_id}")
def update_doctor(
    doctor_id: str,
    data: DoctorUpdate,
    db: Session = Depends(get_db),

    _user=Depends(
        has_permission(
            "doctor.update"
        )
    ),
):

    doctor = (
        db.query(Doctor)
        .filter(
            Doctor.id == doctor_id
        )
        .first()
    )

    if not doctor:

        raise HTTPException(
            status_code=404,
            detail="Doctor not found",
        )

    update_data = data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():

        setattr(
            doctor,
            field,
            value,
        )

    try:

        db.commit()

        db.refresh(doctor)

    except IntegrityError:

        db.rollback()

        return ApiResponse.error(
            message="Unable to update doctor",
            status_code=400,
        )

    return ApiResponse.success(
        message="Doctor updated successfully",
        data=_serialize_doctor(
            doctor
        ),
    )


# =========================================================
# DELETE DOCTOR
# =========================================================

@router.delete("/{doctor_id}")
def delete_doctor(
    doctor_id: str,
    db: Session = Depends(get_db),

    _user=Depends(
        has_permission(
            "doctor.delete"
        )
    ),
):

    doctor = (
        db.query(Doctor)
        .filter(
            Doctor.id == doctor_id
        )
        .first()
    )

    if not doctor:

        raise HTTPException(
            status_code=404,
            detail="Doctor not found",
        )

    db.delete(doctor)

    db.commit()

    return ApiResponse.success(
        message="Doctor deleted successfully"
    )


# =========================================================
# SINGLE DOCTOR DISTANCE
# =========================================================

@router.get(
    "/{doctor_id}/distance"
)
def get_doctor_distance(
    doctor_id: str,

    patient_latitude: float,

    patient_longitude: float,

    db: Session = Depends(get_db),
):

    doctor = (
        db.query(Doctor)
        .filter(
            Doctor.id == doctor_id
        )
        .first()
    )

    if not doctor:

        raise HTTPException(
            status_code=404,
            detail="Doctor not found",
        )

    if (
        doctor.latitude is None
        or doctor.longitude is None
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Doctor location "
                "is not available"
            ),
        )

    distance = calculate_distance_km(
        patient_latitude=patient_latitude,

        patient_longitude=patient_longitude,

        doctor_latitude=doctor.latitude,

        doctor_longitude=doctor.longitude,
    )

    return {
        "success": True,

        "message": (
            "Doctor distance "
            "calculated successfully"
        ),

        "data": {
            "doctor_id": doctor.id,

            "doctor_name": doctor.name,

            "patient_latitude":
                patient_latitude,

            "patient_longitude":
                patient_longitude,

            "doctor_latitude":
                doctor.latitude,

            "doctor_longitude":
                doctor.longitude,

            "distance_km":
                round(
                    float(distance),
                    2,
                ),
        },
    }@router.get("/public")
def get_public_doctors(
    db: Session = Depends(get_db),
):
    doctors = (
        db.query(Doctor)
        .filter(
            Doctor.latitude.isnot(None),
            Doctor.longitude.isnot(None),
        )
        .all()
    )

    return {
        "success": True,
        "data": [
            {
                "id": doctor.id,
                "doctor_id": doctor.doctor_id,
                "name": doctor.name,
                "specialization": doctor.specialization,
                "hospital_name": doctor.hospital_name,
                "address": doctor.address,
                "latitude": float(doctor.latitude),
                "longitude": float(doctor.longitude),
            }
            for doctor in doctors
        ],
    }
