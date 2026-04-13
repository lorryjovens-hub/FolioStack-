const { body, param, query, validationResult } = require('express-validator');
const { ApiError, validationErrorResponse } = require('../utils/response');

function validate(validations) {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    return validationErrorResponse(res, extractedErrors);
  };
}

const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores and hyphens'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

const loginValidation = [
  body('login')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const emailLoginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('code')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be 6 digits'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

const resetPasswordValidation = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

const workValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('url')
    .optional()
    .isURL()
    .withMessage('Please provide a valid URL'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
];

const importUrlValidation = [
  body('url')
    .trim()
    .isURL()
    .withMessage('Please provide a valid URL'),
];

const importGithubValidation = [
  body('url')
    .trim()
    .isURL()
    .withMessage('Please provide a valid GitHub URL'),
];

const deployValidation = [
  body('projectName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9-_]+$/)
    .withMessage('Project name can only contain letters, numbers, hyphens and underscores'),
  body('customDomain')
    .optional()
    .trim()
    .matches(/^(?!-)[a-zA-Z0-9-]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/)
    .withMessage('Please provide a valid domain'),
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

const idValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid ID format'),
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  emailLoginValidation,
  changePasswordValidation,
  resetPasswordValidation,
  workValidation,
  importUrlValidation,
  importGithubValidation,
  deployValidation,
  paginationValidation,
  idValidation,
};
