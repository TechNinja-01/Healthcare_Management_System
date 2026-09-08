from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.config.dependencies import has_permission
from app.config.response import ApiResponse
from app.module.auth.model import User

router = APIRouter(prefix="/users", tags=["users"])


def _serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role.value,
        "is_active": user.is_active,
    }


@router.get("")
def get_all_users(
    db: Session = Depends(get_db),
    _user=Depends(has_permission("admin.read")),
):
    users = db.query(User).order_by(User.id).all()
    return ApiResponse.success(
        message="Users fetched successfully",
        data=[_serialize_user(user) for user in users],
    )


@router.get("/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _user=Depends(has_permission("admin.read")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return ApiResponse.error(message="User not found", status_code=404)

    return ApiResponse.success(
        message="User fetched successfully",
        data=_serialize_user(user),
    )
