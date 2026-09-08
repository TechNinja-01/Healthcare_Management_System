from pydantic import BaseModel


class UserPermissionItem(BaseModel):
    permission_id: int
    allowed: bool


class UserPermissionUpdate(BaseModel):
    permissions: list[UserPermissionItem]