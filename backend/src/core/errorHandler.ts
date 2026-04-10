import { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { AppError } from "./errors";
import { success } from "zod";

export const globalErrorHandler = (
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
) => {
    // Handle custom application errors
    if (error instanceof AppError) {
        request.log.error(`[AppError] ${error.message}`);
        return reply.status(error.statusCode).send({
            success: false,
            error: error.message,
        })
    }

    // Handle Zod validation errors
    if (error.code === 'FST_ERR_VALIDATION') {
        request.log.error(`[validationError] ${error.message}`);
        return reply.status(400).send({
            success: false,
            error: 'Invalid Request Data',
            details: error.validation,
        })
    }

    // Unhandled errors
    request.log.error(`[UnhandledError] ${error.message}\n${error.stack}`);
    return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    })
}