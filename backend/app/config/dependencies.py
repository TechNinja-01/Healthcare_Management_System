from fastapi import Depends, HTTPException, status

from app.config.security import get_current_user


def has_permission(permission: str):
    def checker(current_user=Depends(get_current_user)):
        if permission not in current_user["permissions"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied",
            )
        return current_user

    return checker
