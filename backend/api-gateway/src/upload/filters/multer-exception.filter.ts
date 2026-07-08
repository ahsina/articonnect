import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

/**
 * Traduit les erreurs internes de multer en messages métier propres, évitant de
 * fuiter le wording interne (ex "Unexpected field") au client.
 *
 * On NE dépend PAS du package `multer` (bundlé par @nestjs/platform-express) :
 * on détecte l'erreur par sa forme (name === 'MulterError' + un `code`).
 */
@Catch()
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const isMulterError =
      exception &&
      (exception.name === 'MulterError' || typeof exception.code === 'string') &&
      typeof exception.field !== 'undefined';

    if (!isMulterError && exception?.name !== 'MulterError') {
      // Pas une erreur multer : on laisse passer le comportement standard.
      if (exception instanceof HttpException) {
        const status = exception.getStatus();
        response.status(status).json(exception.getResponse());
        return;
      }
      const status = HttpStatus.INTERNAL_SERVER_ERROR;
      response
        .status(status)
        .json({ statusCode: status, message: 'Erreur interne', error: 'Internal Server Error' });
      return;
    }

    let message: string;
    switch (exception.code) {
      case 'LIMIT_UNEXPECTED_FILE':
        message = "Champ de fichier inattendu. Utilisez le champ 'file' pour l'upload.";
        break;
      case 'LIMIT_FILE_SIZE':
        message = 'Fichier trop volumineux.';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Trop de fichiers envoyés.';
        break;
      default:
        message = 'Fichier invalide ou requête multipart malformée.';
    }

    const status = HttpStatus.BAD_REQUEST;
    const httpEx = new BadRequestException(message);
    response.status(status).json(httpEx.getResponse());
  }
}
