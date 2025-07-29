import * as Joi from 'joi';

export const registerDtoSchema = Joi.object({
  firstName: Joi.string().min(3).max(191).required(),
  username: Joi.string().min(3).max(191).required(),
  lastName: Joi.string().optional().allow(''),
  password: Joi.string().min(8).max(191).required(),
  confirmPassword: Joi.string().min(8).max(191).required(),
  token: Joi.string().required(),
})
  .custom((value, helpers) => {
    if (value.password !== value.confirmPassword) {
      return helpers.error('any.custom');
    }
    return value;
  })
  .messages({ 'any.custom': 'Password and confirm password must be the same' });

export const registerSendOtpDtoSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const registerVerifyOtpDtoSchema = Joi.object({
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/, 'OTP must be a numeric string')
    .required(),
  token: Joi.string().required(),
});

export const loginDtoSchema = Joi.object({
  identifierLogin: Joi.string().required(),
  password: Joi.string().min(8).max(191).required(),
});

export const loginGoogleDtoSchema = Joi.object({
  redirectPath: Joi.string().required(),
});

export const VerifyTokenForgotPasswordDtoSchema = Joi.object({
  token: Joi.string().required(),
});

export const resetPasswordDtoSchema = Joi.object({
  newPassword: Joi.string().min(8).max(191).required(),
  confirmPassword: Joi.string().min(8).max(191).required(),
  token: Joi.string().required(),
})
  .custom((value, helpers) => {
    if (value.newPassword !== value.confirmPassword) {
      return helpers.error('any.custom');
    }
    return value;
  })
  .messages({
    'any.custom': 'newPassword and confirm password must be the same',
  });

export type RegisterDto = {
  firstName: string;
  username: string;
  lastName?: string;
  password: string;
  confirmPassword: string;
  token: string;
};

export type RegisterSendOtpDto = {
  email: string;
};

export type RegisterVerifyOtpDto = {
  otp: string;
  token: string;
};

export type LoginDto = {
  identifierLogin: string;
  password: string;
};

export type LoginGoggleDto = {
  redirectPath: string;
};

export type VerifyTokenForgotPasswordDto = {
  token: string;
};

export type ResetPasswordDto = {
  token: string;
  newPassword: string;
  confirmPassword: string;
};

export type CallbackOauthDto = {
  code: string;
};
