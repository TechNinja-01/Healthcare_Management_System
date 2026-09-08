from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config.database import get_db

from app.module.auth.model import User
from app.module.Permission.model import Permission
from app.module.user_permission.model import UserPermission
from app.module.role.model import Role
from app.module.rolePermission.model import RolePermission

from app.module.user_permission.schema import UserPermissionUpdate


router = APIRouter(
    prefix="/users",
    tags=["User Permissions"],
)


@router.get("/{user_id}/permissions")
def get_user_permissions(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    role = (
        db.query(Role)
        .filter(Role.name == user.role)
        .first()
    )

    if not role:
        raise HTTPException(
            status_code=404,
            detail=f"Role '{user.role}' not found",
        )

    role_permission_rows = (
        db.query(RolePermission)
        .filter(
            RolePermission.role_id == role.id
        )
        .all()
    )

    role_permission_ids = {
        row.permission_id
        for row in role_permission_rows
    }

    user_permission_rows = (
        db.query(UserPermission)
        .filter(
            UserPermission.user_id == user_id
        )
        .all()
    )

    user_overrides = {
        row.permission_id: row.allowed
        for row in user_permission_rows
    }

    all_permissions = (
        db.query(Permission)
        .order_by(Permission.id)
        .all()
    )

    permission_data = []

    for permission in all_permissions:

        role_allowed = (
            permission.id
            in role_permission_ids
        )

        user_override = user_overrides.get(
            permission.id
        )

        if user_override is not None:
            effective = user_override
        else:
            effective = role_allowed

        permission_data.append({
            "id": permission.id,
            "name": permission.name,
            "role_allowed": role_allowed,
            "user_override": user_override,
            "effective": effective,
        })

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
        },
        "permissions": permission_data,
    }


@router.put("/{user_id}/permissions")
def update_user_permissions(
    user_id: int,
    data: UserPermissionUpdate,
    db: Session = Depends(get_db),
):

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    permission_ids = [
        item.permission_id
        for item in data.permissions
    ]

    permissions = (
        db.query(Permission)
        .filter(
            Permission.id.in_(permission_ids)
        )
        .all()
    )

    existing_permission_ids = {
        permission.id
        for permission in permissions
    }

    invalid_permission_ids = (
        set(permission_ids)
        - existing_permission_ids
    )

    if invalid_permission_ids:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "One or more permissions do not exist",
                "permission_ids": list(
                    invalid_permission_ids
                ),
            },
        )

    (
        db.query(UserPermission)
        .filter(
            UserPermission.user_id == user_id
        )
        .delete(
            synchronize_session=False
        )
    )

    for item in data.permissions:

        db.add(
            UserPermission(
                user_id=user_id,
                permission_id=item.permission_id,
                allowed=item.allowed,
            )
        )

    db.commit()

    return {
        "message": "User permissions updated successfully",
        "user_id": user_id,
        "permissions": [
            {
                "permission_id": item.permission_id,
                "allowed": item.allowed,
            }
            for item in data.permissions
        ],
    }