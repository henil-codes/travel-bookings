import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PassengerForm,
  type PassengerFormData,
} from '../../components/booking/PassengerForm';
import { BookingSummary } from '../../components/booking/BookingSummary';
import { SeatLockTimer } from '../../components/booking/SeatLockTimer';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { api, getApiError } from '../../core/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookingStore } from '../../store/useBookingStore';
import type { ApiResponse } from '../../types/api';
import type { Booking } from '../../types/booking';
import type { RazorpayOrderResponse } from '../../types/payment';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    selectedTrip,
    selectedSeat,
    bookingId,
    setBookingId,
    setRazorpayOrderId,
    clearBooking,
  } = useBookingStore();

  const [passenger, setPassenger] = useState<PassengerFormData | null>(null);
  const [apiError, setApiError] = useState('');
  const [paying, setPaying] = useState(false);

  const handleExpire = useCallback(() => {
    if (paying) return;

    clearBooking();
    navigate(`/trips/${selectedTrip?.id}`, {
      state: { message: 'Seat hold expired. Please select again.' },
    });
  }, [clearBooking, navigate, selectedTrip?.id]);

  if (!selectedTrip || !selectedSeat) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-slate-500">No seat selected.</p>
        <Button className="mt-4" onClick={() => navigate('/')}>
          Find trips
        </Button>
      </div>
    );
  }

  async function handlePay() {
    if (!passenger) return;
    setApiError('');
    setPaying(true);

    try {
      let currentBookingId = bookingId;

      if (!currentBookingId) {
        const bookingRes = await api.post<ApiResponse<Booking>>('/bookings', {
          seatId: selectedSeat!.id,
          tripId: selectedTrip!.id,
          passenger,
        });
        currentBookingId = bookingRes.data.data.id;
        setBookingId(currentBookingId);
      }

      const orderRes = await api.post<ApiResponse<RazorpayOrderResponse>>(
        `/payments/${bookingId}/order`
      );
      const { razorpayOrderId, amount, currency, keyId } = orderRes.data.data;
      setRazorpayOrderId(razorpayOrderId);

      const razorpay = new Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: razorpayOrderId,
        name: 'BusBook',
        description: `${selectedTrip!.startLocation} ${selectedTrip!.endLocation}`,
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: { color: '#2563eb' },
        handler: async (response) => {
          try {
            await api.post('/payments/verify', {
              bookingId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            clearBooking();
            navigate(`/booking/confirm/${bookingId}`);
          } catch (error) {
            setApiError(getApiError(error));
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      });

      razorpay.on('payment.failed', async (response) => {
        try {
          await api.post('/payments/failure', {
            bookingId,
            gatewayOrderId: response.error.metadata.order_id,
            gatewayResponse: JSON.stringify(response.error),
          });
        } catch {}
        setApiError(`Payment failed: ${response.error.description}`);
        setPaying(false);
      });

      razorpay.open();
    } catch (error) {
      setApiError(getApiError(error));
      setPaying(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">
        Complete your booking
      </h1>

      {selectedSeat.lockedUntil && (
        <div className="mb-6">
          <SeatLockTimer
            lockedUntil={selectedSeat.lockedUntil}
            onExpire={handleExpire}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Passenger form*/}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <PassengerForm onValidChange={setPassenger} />

          {apiError && (
            <div className="mt-4">
              <Alert variant="error">{apiError}</Alert>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Button
              onClick={handlePay}
              disabled={!passenger}
              loading={paying}
              size="lg"
              className="w-full"
            >
              Pay ₹{(selectedSeat.price / 100).toLocaleString('en-IN')}
            </Button>
            <p className="text-center text-xs text-slate-400 mt-2">
              Secured by Razorpay · UPI, Cards, Net Banking accepted
            </p>
          </div>
        </div>

        {/* Summary */}
        <div>
          <BookingSummary trip={selectedTrip} seat={selectedSeat} />
        </div>
      </div>
    </div>
  );
}
