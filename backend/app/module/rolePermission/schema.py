from pydantic import BaseModel


class PermissionResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class RoleResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class RolePermissionUpdate(BaseModel):
    permission_ids: list[int]
    