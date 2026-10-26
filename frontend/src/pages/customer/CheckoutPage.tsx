import { StepIndicator } from '../../components/ui/StepIndicator';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PassengerForm,
  type PassengerFormData,
} from '../../components/booking/PassengerForm';
import { SeatLockTimer } from '../../components/booking/SeatLockTimer';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { api, getApiError } from '../../core/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookingStore } from '../../store/useBookingStore';
import type { ApiResponse } from '../../types/api';
import type { Booking, Passenger } from '../../types/booking';
import type { RazorpayOrderResponse } from '../../types/payment';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    selectedTrip,
    selectedSeats,
    setBookingIds,
    setRazorpayOrderId,
    clearBooking,
  } = useBookingStore();

  const [passengers, setPassengers] = useState<(PassengerFormData | null)[]>(
    () => selectedSeats.map(() => null)
  );
  const [createdBookingIds, setCreatedBookingIds] = useState<string[]>([]);
  const [apiError, setApiError] = useState('');
  const [paying, setPaying] = useState(false);

  const allPassengersValid = passengers.length > 0 && passengers.every(Boolean);
  const totalPaise = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

  const earliestLock = selectedSeats.reduce<string | null>((earliest, seat) => {
    if (!seat.lockedUntil) return earliest;
    if (!earliest) return seat.lockedUntil;
    return new Date(seat.lockedUntil) < new Date(earliest)
      ? seat.lockedUntil
      : earliest;
  }, null);

  const handlePassengerChange = useCallback(
    (index: number, data: PassengerFormData | null) => {
      setPassengers((prev) => {
        const next = [...prev];
        next[index] = data;
        return next;
      });
    },
    []
  );

  const handleExpire = useCallback(() => {
    if (paying) return;

    clearBooking();
    navigate(`/trips/${selectedTrip?.id}`, {
      state: { message: 'Seat hold expired. Please select again.' },
    });
  }, [clearBooking, navigate, selectedTrip?.id, paying]);

  if (!selectedTrip || !selectedSeats.length) {
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
    if (!allPassengersValid) return;
    setApiError('');
    setPaying(true);

    try {
      let allIds = [...createdBookingIds];

      for (let i = allIds.length; i < selectedSeats.length; i++) {
        const response = await api.post<
          ApiResponse<{ booking: Booking; passenger: Passenger }>
        >('/bookings', {
          seatId: selectedSeats[i]!.id,
          tripId: selectedTrip!.id,
          passenger: passengers[i]!,
        });
        allIds = [...allIds, response.data.data.booking.id];
        setCreatedBookingIds([...allIds]);
      }

      setBookingIds(allIds);

      const orderRes = await api.post<ApiResponse<RazorpayOrderResponse>>(
        `/payments/order`,
        { bookingIds: allIds }
      );
      const { razorpayOrderId, amount, currency, keyId } = orderRes.data.data;
      setRazorpayOrderId(razorpayOrderId);

      const razorpay = new Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: razorpayOrderId,
        name: 'BusBook',
        description: `${selectedTrip!.startLocation} → ${selectedTrip!.endLocation} · ${selectedSeats.length} seat${selectedSeats.length > 1 ? 's' : ''} `,
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: { color: '#2563eb' },
        handler: async (response) => {
          try {
            await api.post('/payments/verify', {
              bookingIds: allIds,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            clearBooking();
            navigate(`/booking/confirm/${allIds[0]}`);
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
            bookingIds: allIds,
            gatewayOrderId: response.error.metadata.order_id,
            gatewayResponse: JSON.stringify(response.error),
          });
        } catch { }
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24 lg:pb-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">
        Complete your booking
      </h1>

      <div className="mb-6 flex justify-center">
        <StepIndicator steps={[{ label: 'Select Seats' }, { label: 'Checkout' }, { label: 'Confirmed' }]} current={1} />
      </div>

      {earliestLock && (
        <div className="mb-6">
          <SeatLockTimer lockedUntil={earliestLock} onExpire={handleExpire} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Passenger form*/}
        <div className="order-2 lg:order-1 lg:col-span-2 space-y-6">
          {selectedSeats.map((seat, index) => (
            <div
              key={seat.id}
              className="bg-white rounded-xl border border-slate-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800">
                  Passenger {index + 1}
                </h2>
                <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  Seat {seat.seatNumber}
                </span>
              </div>
              <PassengerForm
                onValidChange={(data) => handlePassengerChange(index, data)}
              />
            </div>
          ))}

          {apiError && (
            <div className="mt-4">
              <Alert variant="error">{apiError}</Alert>
            </div>
          )}

          <div className="hidden lg:block mt-6 pt-4 border-t border-slate-100">
            <Button
              onClick={handlePay}
              disabled={!allPassengersValid}
              loading={paying}
              size="lg"
              className="w-full"
            >
              Pay ₹{(totalPaise / 100).toLocaleString('en-IN')}
            </Button>
            <p className="text-center text-xs text-slate-400 mt-2">
              Secured by Razorpay · UPI, Cards, Net Banking accepted
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="order-1 lg:order-2 bg-white rounded-xl border border-slate-200 p-6 h-fit space-y-4">
          <h2 className="font-semibold text-slate-900">Booking Summary</h2>

          <div className="space-y-1 text-sm">
            <p className="font-medium text-slate-800">{selectedTrip.name}</p>
            <p className="text-slate-600">
              {selectedTrip.startLocation} → {selectedTrip.endLocation}
            </p>
            <p className="text-xs text-slate-400">
              {new Date(selectedTrip.departureTime).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2">
            {selectedSeats.map((seat, i) => (
              <div key={seat.id} className="flex justify-between text-sm">
                <span className="text-slate-600">
                  Seat {seat.seatNumber}{' '}
                  <span className="text-xs text-slate-400">(P{i + 1})</span>
                </span>
                <span className="font-medium text-slate-800">
                  ₹{(seat.price / 100).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
            <span className="font-semibold text-slate-900">Total</span>
            <span className="font-bold text-lg text-brand-600">
              ₹{(totalPaise / 100).toLocaleString('en-IN')}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            {selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''} ·{' '}
            {selectedTrip.capacity} total capacity
          </p>

          <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-700">Cancellation Policy</p>
            <p>Free cancellation up to 2 hours before departure.</p>
            <p>
              Refunds are initiated immediately to your original payment method - it may take a few business days to reflect, depending on your bank.
            </p>
          </div>

        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden bg-white border-t border-slate-200 shadow-lg px-4 py-3">
        <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto">
          <div>
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-lg font-bold text-slate-900">
              ₹{(totalPaise / 100).toLocaleString('en-IN')}
            </p>
          </div>
          <Button
            onClick={handlePay}
            disabled={!allPassengersValid}
            loading={paying}
            size="lg"
          >
            Pay →
          </Button>
        </div>
      </div>
    </div>
  );
}
