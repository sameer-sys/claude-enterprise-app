export class ApiError extends Error {
    status;
    code;
    details;
    constructor(status, code, message, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}
export function formatError(err) {
    return {
        code: err.code,
        message: err.message,
        details: err.details,
    };
}
