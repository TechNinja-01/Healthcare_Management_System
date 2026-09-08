from enum import Enum


DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100

SUCCESS = "Success"
CREATED = "Created successfully"
UPDATED = "Updated successfully"
DELETED = "Deleted successfully"

NOT_FOUND = "Resource not found"
BAD_REQUEST = "Invalid request"
UNAUTHORIZED = "Unauthorized"
FORBIDDEN = "Permission denied"
SERVER_ERROR = "Internal Server Error"

# Default consultation fee in INR (Razorpay uses paise on the wire).
APPOINTMENT_FEE_INR = 500


class Gender(str, Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Others"


class Role(str, Enum):
    ADMIN = "admin"
    DOCTOR = "doctor"
    PATIENT = "patient"


class AppointmentStatus(str, Enum):
    PENDING_PAYMENT = "pending_payment"
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class PaymentStatus(str, Enum):
    CREATED = "created"
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"


ROLE_PERMISSIONS: dict[Role, list[str]] = {
    Role.ADMIN: [
        "admin.create",
        "admin.read",
        "admin.update",
        "admin.delete",
        "doctor.create",
        "doctor.read",
        "doctor.update",
        "doctor.delete",
        "patient.create",
        "patient.read",
        "patient.update",
        "patient.delete",
        "appointment.create",
        "appointment.read",
        "appointment.update",
        "appointment.delete",
        "availability.read",
        "availability.create",
        "availability.update",
        "availability.delete",
        "payment.read",
        "payment.create",
    ],
    Role.DOCTOR: [
        "doctor.read",
        "doctor.update",
        "patient.create",
        "patient.read",
        "patient.update",
        "appointment.read",
        "appointment.update",
        "availability.read",
        "availability.create",
        "availability.update",
        "availability.delete",
    ],
    Role.PATIENT: [
        "patient.read",
        "patient.update",
        "doctor.read",
        "appointment.create",
        "appointment.read",
        "appointment.update",
        "availability.read",
        "payment.create",
        "payment.read",
    ],
}
