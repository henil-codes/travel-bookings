export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code: string;

    constructor(code: string, message: string, statusCode: number, isOperational = true) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super('NOT_FOUND', `${resource} not found`, 404);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Conflict') {
        super('CONFLICT', message, 409);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super('UNAUTHORIZED', message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super('FORBIDDEN', message, 403);
    }
}