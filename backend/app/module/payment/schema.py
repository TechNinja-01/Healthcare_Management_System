from pydantic import BaseModel, Field

from app.config.constants import APPOINTMENT_FEE_INR


class CreateOrderRequest(BaseModel):
    appointment_id: int = Field(..., gt=0)
    amount_inr: int = Field(
        default=APPOINTMENT_FEE_INR,
        gt=0,
        description="Amount in INR (rupees)",
    )


class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str = Field(..., min_length=1)
    razorpay_payment_id: str = Field(..., min_length=1)
    razorpay_signature: str = Field(..., min_length=1)


class PaymentResponse(BaseModel):
    id: int
    appointment_id: int | None
    user_id: int
    razorpay_order_id: str
    razorpay_payment_id: str | None = None
    amount: int
    currency: str
    status: str

    model_config = {"from_attributes": True}
