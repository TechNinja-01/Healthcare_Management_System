from sqlalchemy import Column, ForeignKey, String, Integer
from sqlalchemy.orm import relationship

from app.config.database import Base


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True)
    phone = Column(String)
    designation = Column(String)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=False,
    )

    user = relationship("User", back_populates="admin")
