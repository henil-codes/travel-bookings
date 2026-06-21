import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendPasswordResetEmail(to: string, resetLink: string) {
    await resend.emails.send({
        from: 'noreply@yourdomain.com',
        to,
        subject: 'Reset Your Password',
        html: `
            <p>You requested to reset your password.</p>
            <p>Click below to reset your password:</p>
            <p><a href="${resetLink}">Reset Password</a></p>
            <p>If you didn't request this, please ignore this email.</p>
            `
    })
}