import re

from sqlalchemy.orm import Session

from app.module.doctor.model import Doctor

DOCTOR_ID_PATTERN = re.compile(r"^D(\d+)$")


def generate_doctor_id(db: Session) -> str:
    
    rows = (
        db.query(Doctor.id)
        .filter(Doctor.id.like("D%"))
        .with_for_update()
        .all()
    )

    max_number = 0
    for (doctor_id,) in rows:
        match = DOCTOR_ID_PATTERN.match(doctor_id)
        if match:
            max_number = max(max_number, int(match.group(1)))

    return f"D{max_number + 1:03d}"
