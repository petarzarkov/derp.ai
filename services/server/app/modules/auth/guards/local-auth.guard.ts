import { BadRequestException, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClassConstructor, plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { Request } from 'express';

@Injectable()
export class LocalAuthGuard<T extends object> extends AuthGuard('local') {
  #requestBodyDto?: ClassConstructor<T>;

  constructor(requestBodyDto?: ClassConstructor<T>) {
    super();
    this.#requestBodyDto = requestBodyDto;
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const result = (await super.canActivate(context)) as boolean;
    if (this.#requestBodyDto) {
      const body = plainToClass(this.#requestBodyDto, request.body);
      const errors = await validate(body);
      const errorMessages = errors.flatMap(({ constraints }) => constraints && Object.values(constraints));
      if (errorMessages.length > 0) {
        throw new BadRequestException(errorMessages);
      }
    }

    await super.logIn(request);
    return result;
  }
}
