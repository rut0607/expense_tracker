export class AppError extends Error {
  constructor(message, status = 500, code = null) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, 'VALIDATION_ERROR')
    this.details = details
  }
}

export class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

export class AuthError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR')
  }
}