import { PipeTransform, Injectable } from '@nestjs/common';
import Joi from 'joi';

@Injectable()
export class JoiValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: Joi.ObjectSchema) {}

  transform(value: T): T {
    const { error } = this.schema.validate(value, { abortEarly: false });

    if (error) {
      throw {
        isHelperFail: true,
        message: error.message,
        data: {
          status: 400,
          status_code: '00400',
          status_desc: error.message,
        },
      };
    }

    return value;
  }
}
