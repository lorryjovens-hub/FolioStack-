class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details = null) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }

  static conflict(message, details = null) {
    return new ApiError(409, message, details);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message);
  }
}

function successResponse(res, data = null, message = 'Success', meta = null) {
  const response = {
    success: true,
    message,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(200).json(response);
}

function createdResponse(res, data = null, message = 'Created successfully') {
  const response = {
    success: true,
    message,
    data,
  };

  return res.status(201).json(response);
}

function noContentResponse(res) {
  return res.status(204).send();
}

function errorResponse(res, error) {
  if (error instanceof ApiError) {
    const response = {
      success: false,
      error: {
        message: error.message,
        code: error.statusCode,
      },
    };

    if (error.details) {
      response.error.details = error.details;
    }

    return res.status(error.statusCode).json(response);
  }

  console.error('Unexpected error:', error);

  return res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 500,
    },
  });
}

function paginatedResponse(res, data, page, limit, total, message = 'Success') {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: parseInt(total, 10),
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    },
  });
}

function validationErrorResponse(res, errors) {
  return res.status(400).json({
    success: false,
    error: {
      message: 'Validation failed',
      code: 400,
      details: errors,
    },
  });
}

module.exports = {
  ApiError,
  successResponse,
  createdResponse,
  noContentResponse,
  errorResponse,
  paginatedResponse,
  validationErrorResponse,
};
