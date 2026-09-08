from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db

from app.module.role.model import Role
from app.module.Permission.model import Permission
from app.module.rolePermission.model import RolePermission

from app.module.rolePermission.schema import RolePermissionUpdate


router = APIRouter(
    prefix="/roles",
    tags=["Roles & Permissions"]
)


@router.put("/{role_id}/permissions")
def update_role_permissions(
    role_id: str,
    data: RolePermissionUpdate,
    db: Session = Depends(get_db),
):

    
    role = (
        db.query(Role)
        .filter(Role.id == role_id)
        .first()
    )

    if not role:
        raise HTTPException(
            status_code=404,
            detail="Role not found",
        )

    
    permissions = (
        db.query(Permission)
        .filter(
            Permission.id.in_(data.permission_ids)
        )
        .all()
    )

   
    if len(permissions) != len(
        set(data.permission_ids)
    ):
        raise HTTPException(
            status_code=400,
            detail="One or more permissions do not exist",
        )

    (
        db.query(RolePermission)
        .filter(
            RolePermission.role_id == role_id
        )
        .delete(
            synchronize_session=False
        )
    )


    for permission_id in set(data.permission_ids):

        role_permission = RolePermission(
            role_id=role_id,
            permission_id=permission_id,
        )

        db.add(role_permission)

  
    db.commit()

    return {
        "message": "Permissions updated successfully",
        "role_id": role_id,
        "permission_ids": list(
            set(data.permission_ids)
        ),
    }

@router.get("/all")
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
