import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

interface ZodIssue {
  code: string;
  path: string[];
  message: string;
}

interface ZodValidationError {
  validation: Array<{
    params: {
      zodError?: {
        issues: ZodIssue[];
      };
    };
  }>;
}

async function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error({ err: error, url: request.url, method: request.method }, 'Request error');

    const zodError = error as unknown as ZodValidationError;
    
    if (zodError.validation) {
      const allIssues: { field: string; message: string }[] = [];
      
      for (const val of zodError.validation) {
        if (val.params?.zodError?.issues) {
          for (const issue of val.params.zodError.issues) {
            const field = issue.path.join('.') || 'body';
            allIssues.push({ field, message: issue.message });
          }
        }
      }

      if (allIssues.length > 0) {
        const uniqueIssues = allIssues.filter((v, i, a) => a.findIndex(t => t.field === v.field) === i);
        const message = uniqueIssues.map(i => `${i.field}: ${i.message}`).join(', ');
        
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message,
        });
      }
    }

    if (error.statusCode) {
      return reply.code(error.statusCode).send({
        error: error.code || 'ERROR',
        message: error.message,
      });
    }

    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  });
}

export const errorHandlerPlugin = fp(registerErrorHandler, {
  name: 'error-handler-plugin',
});