import axios from 'axios';
import { FastifyPluginAsync } from 'fastify';
import { AuthService } from './auth.service';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  driverRegisterSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.validation';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  server.post(
    '/register',
    {
      schema: {
        body: registerSchema,
      },
    },
    async (request, reply) => {
      const user = await AuthService.register(request.body);

      const token = fastify.jwt.sign({
        id: user.id,
        role: user.role,
      });

      return reply.code(201).send({
        success: true,
        data: { user, token },
      });
    }
  );

  server.post(
    '/login',
    {
      schema: {
        body: loginSchema,
      },
    },
    async (request, reply) => {
      const user = await AuthService.login(request.body);

      const token = fastify.jwt.sign({
        id: user.id,
        role: user.role,
      });

      return reply.send({
        success: true,
        data: { user, token },
      });
    }
  );

  server.get('/google/callback', async (request, reply) => {
    try {
      const { token } =
        await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
          request
        );

      const { data: profile } = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        { headers: { Authorization: `Bearer ${token.access_token}` } }
      );

      const user = await AuthService.googleOAuth({
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
      });

      const jwtToken = fastify.jwt.sign({ id: user.id, role: user.role });

      reply.cookie('token', jwtToken, {
        domain: `.${process.env.CORS_ORIGIN}`
          ?.replace('https://', '')
          .replace('http://', ''),
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      });

      const dest =
        user.role === 'admin'
          ? '/admin'
          : user.role === 'driver'
            ? '/driver/dashboard'
            : '/';

      return reply.redirect(`${process.env.CORS_ORIGIN}${dest}`);
    } catch (error: any) {
      request.log.error(
        { err: error, cause: error.cause },
        'Google OAuth callback error:'
      );
      return reply.redirect(
        `${process.env.CORS_ORIGIN}/login?error=oauth_failed`
      );
    }
  });

  server.post(
    '/forgot-password',
    {
      schema: {
        body: forgotPasswordSchema,
      },
    },
    async (request, reply) => {
      await AuthService.forgotPassword(request.body.email);
      return reply.send({
        success: true,
        message:
          'If that email is registered, you will receive a password reset link shortly.',
      });
    }
  );

  server.post(
    '/reset-password',
    {
      schema: {
        body: resetPasswordSchema,
      },
    },
    async (request, reply) => {
      await AuthService.resetPassword(
        request.body.token,
        request.body.newPassword
      );

      return reply.send({ success: true });
    }
  );

  server.post(
    '/driver/register',
    {
      schema: {
        body: driverRegisterSchema,
      },
    },
    async (request, reply) => {
      const { ...userData } = request.body;
      const user = await AuthService.driverRegister(userData);
      return reply.code(201).send({ success: true, data: { user } });
    }
  );

  // --- Helper route to verify JWT functionality, can be removed later ---
  server.get(
    '/me',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      return reply.send({
        success: true,
        data: {
          message: 'You are securely authenticated!',
          jwtPayload: request.user,
        },
      });
    }
  );
};
