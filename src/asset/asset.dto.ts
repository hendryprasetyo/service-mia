import * as Joi from 'joi';

export const updateTranslationDtoSchema = Joi.object({
  items: Joi.array()
    .items({
      langCode: Joi.string().valid('id', 'en').required(),
      key: Joi.string().required(),
      value: Joi.string().required(),
    })
    .required(),
});

type TItems = {
  langCode: string;
  key: string;
  value: string;
};
export type updateTranslationDto = {
  items: TItems[];
};

export type TPolicyConfig = {
  default: { id: string; en: string };
};
