import { BadRequestException, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClassConstructor, plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class LocalAuthGuard<T extends object> extends AuthGuard('local') {
  #requestBodyDto?: ClassConstructor<T>;

  constructor(requestBodyDto?: ClassConstructor<T>) {
    super();
    this.#requestBodyDto = requestBodyDto;
  }

  async canActivate(context: ExecutionContext) {
    if (this.#requestBodyDto) {
      const request = context.switchToHttp().getRequest<Request>();

      const body = plainToClass(this.#requestBodyDto, request.body);
      const errors = await validate(body);
      const errorMessages = errors.flatMap(({ constraints }) => constraints && Object.values(constraints));
      if (errorMessages.length > 0) {
        throw new BadRequestException(errorMessages);
      }
    }

    return super.canActivate(context) as boolean | Promise<boolean>;
  }
}
