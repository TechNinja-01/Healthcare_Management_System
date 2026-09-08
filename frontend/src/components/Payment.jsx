import { createOrder, verifyPayment } from "../api/paymentApi";

export default function Payment() {

    const handlePayment = async () => {

        try {

            const response = await createOrder(500);

            const order = response.data;

            const options = {
                key: order.key_id,

                amount: order.amount,

                currency: order.currency,

                name: "HealthCare Management System",

                description: "Doctor Consultation",

                order_id: order.order_id,

                handler: async function (paymentResponse) {

                    await verifyPayment({
                        razorpay_order_id:
                            paymentResponse.razorpay_order_id,

                        razorpay_payment_id:
                            paymentResponse.razorpay_payment_id,

                        razorpay_signature:
                            paymentResponse.razorpay_signature,
                    });

                    alert("Payment successful");
                },

                prefill: {
                    name: "",
                    email: "",
                    contact: "",
                },

                theme: {
                    color: "#3399cc",
                },
            };

            const razorpay = new window.Razorpay(options);

            razorpay.open();

        } catch (error) {

            console.error(error);

            alert("Unable to start payment");

        }
    };

    return (
        <button onClick={handlePayment}>
            Pay ₹500
        </button>
    );
}