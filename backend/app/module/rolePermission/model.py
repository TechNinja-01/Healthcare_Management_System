from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    UniqueConstraint,
)

from app.config.database import Base


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    role_id = Column(
        Integer,
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
    )

    permission_id = Column(
        Integer,
        ForeignKey("permissions.id", ondelete="CASCADE"),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "role_id",
            "permission_id",
            name="unique_role_permission",
        ),
    )