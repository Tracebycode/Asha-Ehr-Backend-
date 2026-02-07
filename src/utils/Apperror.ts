export default class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number,
        public errors?: Record<string, string[]>,
    ) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
    }
}