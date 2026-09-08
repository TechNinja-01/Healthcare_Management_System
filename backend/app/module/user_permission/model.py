from sqlalchemy import Boolean, Column, ForeignKey, Integer, UniqueConstraint

from app.config.database import Base


class UserPermission(Base):
    __tablename__ = "user_permissions"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    permission_id = Column(
        Integer,
        ForeignKey("permissions.id"),
        nullable=False,
    )

    allowed = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "permission_id",
            name="uq_user_permission",
        ),
    )
