from fastapi import APIRouter, Depends
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config.constants import Role
from app.config.database import get_db
from app.config.dependencies import has_permission
from app.config.response import ApiResponse
from app.module.Admin.model import Admin
from app.module.Admin.schema import AdminCreate, AdminResponse, AdminUpdate
from app.module.auth.model import User

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/")
def create_admin(
    admin: AdminCreate,
    db: Session = Depends(get_db),
    _user=Depends(has_permission("admin.create")),
):
    if db.query(Admin).filter(Admin.id == admin.id).first():
        return ApiResponse.error(message="Admin already exists", status_code=409)

    user = db.query(User).filter(User.id == admin.user_id).first()
    if not user:
        return ApiResponse.error(message="User not found", status_code=404)

    if user.role != Role.ADMIN:
        return ApiResponse.error(
            message="Linked user must have admin role",
            status_code=400,
        )

    if db.query(Admin).filter(Admin.user_id == admin.user_id).first():
        return ApiResponse.error(
            message="Admin profile already exists for this user",
            status_code=409,
        )

    try:
        db_admin = Admin(**admin.model_dump())
        db.add(db_admin)
        db.commit()
        db.refresh(db_admin)
    except IntegrityError:
        db.rollback()
        return ApiResponse.error(
            message="Could not create admin due to a data conflict",
            status_code=409,
        )

    return ApiResponse.success(
        message="Admin created successfully",
        status_code=201,
        data=AdminResponse.model_validate(db_admin).model_dump(),
    )


@router.get("/")
def get_all_admins(
    db: Session = Depends(get_db),
    _user=Depends(has_permission("admin.read")),
):
    admins = db.query(Admin).all()
    return ApiResponse.success(
        message="Admins fetched successfully",
        data=[
            AdminResponse.model_validate(admin).model_dump()
            for admin in admins
        ],
    )


@router.get("/{admin_id}")
def get_admin(
    admin_id: str,
    db: Session = Depends(get_db),
    _user=Depends(has_permission("admin.read")),
):
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        return ApiResponse.error(message="Admin not found", status_code=404)

    return ApiResponse.success(
        message="Admin fetched successfully",
        data=AdminResponse.model_validate(admin).model_dump(),
    )


@router.put("/{admin_id}")
def update_admin(
    admin_id: str,
    admin: AdminUpdate,
    db: Session = Depends(get_db),
    _user=Depends(has_permission("admin.update")),
):
    existing_admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not existing_admin:
        return ApiResponse.error(message="Admin not found", status_code=404)

    update_data = admin.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing_admin, key, value)

    try:
        db.commit()
        db.refresh(existing_admin)
    except IntegrityError:
        db.rollback()
        return ApiResponse.error(
            message="Could not update admin due to a data conflict",
            status_code=409,
        )

    return ApiResponse.success(
        message="Admin updated successfully",
        data=AdminResponse.model_validate(existing_admin).model_dump(),
    )


@router.delete("/{admin_id}")
def delete_admin(
    admin_id: str,
    db: Session = Depends(get_db),
    _user=Depends(has_permission("admin.delete")),
):
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        return ApiResponse.error(message="Admin not found", status_code=404)

    db.delete(admin)
    db.commit()

    return ApiResponse.success(message="Admin deleted successfully")
