from fastapi import APIRouter

from app.module.Admin.router import router as admin_router
from app.module.auth.router import router as auth_router
from app.module.doctor.router import router as doctor_router
from app.module.patient.router import router as patient_router
from app.module.rolePermission.router import router as RolePermission_router
from app.module.Permission.router import router as Permission_router
from app.module.user_permission.router import router as user_permission_router
from app.module.user.router import router as user_router
from app.module.payment.router import router as payment_router
from app.module.appointment.router import router as appointment_router
from app.module.Availability.router import router as availability_router


router = APIRouter()

router.include_router(auth_router)
router.include_router(admin_router)
router.include_router(doctor_router)
router.include_router(patient_router)
router.include_router(RolePermission_router)
router.include_router(Permission_router)
router.include_router(user_permission_router)
router.include_router(user_router)
router.include_router(payment_router)
router.include_router(appointment_router)
router.include_router(availability_router)