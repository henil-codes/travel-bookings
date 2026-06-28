export type PaymentMethod = 'upi' | 'card' | 'net_banking' | 'wallet';
export type PaymentEvent = 
    | 'order_created'
    | 'payment_captured'
    | 'payment_failed'
    | 'refund_initiated'
    | 'refund_processed'
    | 'refund_failed'
    | 'payment_cancelled'

export interface Payment {
    id: string;
    bookingId: string;
    gatewayOrderId: string;
    gatewayPaymentId: string | null;
    gatewayPaymentSignature: string | null;
    gatewayRefundId: string | null;
    event: PaymentEvent;
    method: PaymentMethod | null;
    amount: number; // paise
    refundAmount: number | null;
    currency: string;
    gatewayResponse: string | null;
    createdAt: string;
}

export interface RazorpayOrderResponse {
    razorpayOrderId: string;
    amount: number; // paise
    currency: string;
    keyId: string;
}