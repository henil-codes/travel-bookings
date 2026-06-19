import axios from 'axios';
import { FastifyPluginAsync } from 'fastify';
import { AuthService } from './auth.service';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { loginSchema, registerSchema } from './auth.validation';

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
        console.log('Google OAuth token response:', token);

      const { data: profile } = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        { headers: { Authorization: `Bearer ${token.access_token}` } }
      );
      console.log('Google user profile:', profile);

      const user = await AuthService.googleOAuth({
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
      });
      console.log('User after Google OAuth processing:', user);

      const jwtToken = fastify.jwt.sign({ id: user.id, role: user.role });

      return reply.send({
        success: true,
        data: { user, token: jwtToken },
      });
    } catch (error: any) {
      request.log.error('Google OAuth callback error:', error);
      return reply.code(400).send({
        success: false, 
        message: `Invalid or missing authorization code: ${error.message}`,
      })
    }
  });

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
