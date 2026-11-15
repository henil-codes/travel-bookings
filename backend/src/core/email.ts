import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendPasswordResetEmail(to: string, resetLink: string) {
    const { error } = await resend.emails.send({
        from: 'noreply@mannattravel.com',
        to,
        subject: 'Reset Your Password',
        html: `
            <p>You requested to reset your password.</p>
            <p>Click below to reset your password:</p>
            <p><a href="${resetLink}">Reset Password</a></p>
            <p>If you didn't request this, please ignore this email.</p>
            `
    })

    if (error) {
        console.error('Failed to send password reset email:', error);
    }
}

interface BookingConfirmationInput {
    to: string;
    userName: string;
    trip: { startLocation: string; endLocation: string; departureTime: Date | string };
    seats: { seatNumber: number; passengerName: string; totalAmount: number }[];
}

export async function sendBookingConfirmationEmail(input: BookingConfirmationInput) {
    const totalPaise = input.seats.reduce((sum, seat) => sum + seat.totalAmount, 0);
    const departureLabel = new Date(input.trip.departureTime).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });

    const { error } = await resend.emails.send({
        from: 'noreply@mannattravel.com',
        to: input.to,
        subject: `Booking confirmed: ${input.trip.startLocation} → ${input.trip.endLocation}`,
        html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
    
    <!-- Header -->
    <div style="background-color: #0056b3; padding: 20px; text-align: center; color: #fff;">
        <h2 style="margin: 0;">Booking Confirmed! 🎉</h2>
    </div>
    
    <!-- Body Content -->
    <div style="padding: 30px;">
        <p>Hi <strong>${input.userName}</strong>,</p>
        <p>Thank you for choosing Travel Bookings. Your booking is confirmed and your trip details are below:</p>

        <!-- Trip Summary Card -->
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #0056b3; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">Trip Summary</h3>
            <p style="margin: 5px 0;"><strong>From:</strong> ${input.trip.startLocation}</p>
            <p style="margin: 5px 0;"><strong>To:</strong> ${input.trip.endLocation}</p>
            <p style="margin: 5px 0;"><strong>Departure:</strong> ${departureLabel}</p>
            <p style="margin: 5px 0;"><strong>Total Paid:</strong> ₹${(totalPaise / 100).toFixed(2)}</p>
        </div>

        <!-- Seats & Passenger Table -->
        <h3 style="color: #0056b3; margin-bottom: 10px;">Passenger & Seat Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background-color: #f1f1f1; text-align: left;">
                    <th style="padding: 10px; border-bottom: 2px solid #ccc;">Seat</th>
                    <th style="padding: 10px; border-bottom: 2px solid #ccc;">Passenger Name</th>
                    <th style="padding: 10px; border-bottom: 2px solid #ccc;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${input.seats.map(seat => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${seat.seatNumber}</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${seat.passengerName}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">₹${(seat.totalAmount / 100).toFixed(2)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <p>We look forward to having you on board. Wishing you a safe and pleasant journey!</p>
        
        <p>Best regards,<br><strong>Travel Bookings Team</strong></p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #777;">
        <p style="margin: 0 0 10px 0;">Need help? Contact us at <a href="mailto:support@mannattravel.com" style="color: #0056b3;">support@mannattravel.com</a></p>
        <p style="margin: 0;"><a href="https://mannattravel.com" style="color: #0056b3; text-decoration: none;">Visit our website</a></p>
    </div>
    
</div>`
    });

    if (error) {
        console.error('Failed to send booking confirmation email:', error);
    }
}