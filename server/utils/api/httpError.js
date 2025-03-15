export class HttpError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'HttpError';
  }
}

export const httpErrors = {
  badRequest: (message = 'Bad Request', details = null) =>
    new HttpError(400, message, details),
  unauthorized: (message = 'Unauthorized', details = null) =>
    new HttpError(401, message, details),
  forbidden: (message = 'Forbidden', details = null) =>
    new HttpError(403, message, details),
  notFound: (message = 'Not Found', details = null) =>
    new HttpError(404, message, details),
  tooManyRequests: (message = 'Too Many Requests', details = null) =>
    new HttpError(429, message, details),
  serverError: (message = 'Internal Server Error', details = null) =>
    new HttpError(500, message, details),
};
