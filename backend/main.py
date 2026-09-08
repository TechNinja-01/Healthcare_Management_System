from fastapi import FastAPI

from app.config.database import Base, engine
from app.config.middelware import register_middleware
from app.module.router import router

# Ensure models are registered with Base.metadata before create_all.
from app.module.Admin.model import Admin  # noqa: F401
from app.module.auth.model import User  # noqa: F401
from app.module.doctor.model import Doctor  # noqa: F401
from app.module.patient.model import Patient  # noqa: F401
from app.module.appointment.model import Appointment  # noqa: F401
from app.module.Availability.model import DoctorAvailability, DoctorLeave  # noqa: F401
from app.module.payment.model import Payment  # noqa: F401
from app.module.OnlineConsultation.model import (  # noqa: F401
    ChatMessage,
    ConsultationRoom,
)

app = FastAPI(
    title="Healthcare Management API",
    description="FastAPI backend with JWT auth and RBAC permissions",
    version="1.0.0",
)

Base.metadata.create_all(bind=engine)
register_middleware(app)
app.include_router(router)


@app.get("/")
def home():
    return {"message": "Welcome"}
