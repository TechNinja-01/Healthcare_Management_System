from sqlalchemy import Column, String ,Integer
from sqlalchemy.orm import relationship

from app.config.database import Base

class Location(Base):
    __tablename__ = "location"

    id = Column(Integer, primary_key=True, index=True)
    lat = relationship("lat", back_populates="doctor")
    lon = relationship("lon", back_populates="doctor")
     
    