from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.module.role.model import Role
from app.module.Permission.model import Permission
from app.module.rolePermission.model import RolePermission
from app.module.rolePermission.schema import (RolePermissionUpdate)

router = APIRouter(
    prefix="/roles",
    tags=["Roles & Permissions"],
)

@router.get("/permissions")
def get_roles_and_permissions(
    db: Session = Depends(get_db),
):
    roles = db.query(Role).all()

    permissions = db.query(Permission).all()

    role_permissions = (
        db.query(RolePermission)
        .all()
    )

    return {
        "roles": [
            {
                "id": role.id,
                "name": role.name,
            }
            for role in roles
        ],

        "permissions": [
            {
                "id": permission.id,
                "name": permission.name,
            }
            for permission in permissions
        ],

        "role_permissions": [
            {
                "role_id": item.role_id,
                "permission_id": item.permission_id,
            }
            for item in role_permissions
        ],
    }

