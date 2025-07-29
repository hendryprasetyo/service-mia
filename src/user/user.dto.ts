import * as Joi from 'joi';

export const UploadIdentityDtoSchema = Joi.object({
  image: Joi.string().required(),
  identityType: Joi.string().valid('ktp', 'sim').required(),
  nik: Joi.string().min(16).max(16).required(),
});

export const UpdateToSellerDtoSchema = Joi.object({
  name: Joi.string().max(191).required(),
  bio: Joi.string().required(),
});

export type UploadIdentityDto = {
  image: string;
  identityType: 'ktp' | 'sim';
  nik: string;
};

export type UpdateToSellerDto = {
  name: string;
  bio: string;
};

export type TResponseQueryUserProfile = {
  first_name: string;
  username: string;
  verified: number;
  last_name: string;
  customer_name: string | null;
  other_person_name: string | null;
  salutation: string;
  email: string;
  avatar_text: string;
  avatar: string;
  nationality: string | null;
  gender: string | null;
  country: string | null;
  city: string | null;
  province: string | null;
  district: string | null;
  main_phone_number: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  secondary_email: string | null;
  other_person_phone_number: string | null;
  emergency_phone_number: string | null;
  emergency_email: string | null;
};
