import { ResponseHandlerConfig } from './types';
import { sendSuccess, sendError } from './rest/response';
import errorHandler from './rest/errorHandler';
import { emitSuccess, emitError } from './socket/emitter';
import socketWrapper from './socket/wrapper';
import {
  setResponseFormatter,
  configureResponseFormat,
  formatApiResponse,
  getFormattedResponse,
} from './responseTemplate';
import {
  ResponseHandler,
  createResponseHandler,
  defaultResponseHandler,
  responseHandler,
} from './middleware/responseHandler';
import { SocketResponseHandler, createSocketHandler } from './socket/enhancedSocket';
import { Logger } from './core/logger';
import { ResponseBuilder } from './core/responseBuilder';

export { ResponseHandler, createResponseHandler, defaultResponseHandler, responseHandler };

export { SocketResponseHandler, createSocketHandler };

export { Logger };
export { ResponseBuilder };

export * from './types';
export * from './errors';

export function quickSetup(config?: ResponseHandlerConfig) {
  const handler = createResponseHandler(config);

  return {
    middleware: handler.middleware(),
    errorHandler: handler.errorHandler(),
    logger: handler.getLogger(),
    updateConfig: handler.updateConfig.bind(handler),
  };
}

export function quickSocketSetup(config?: ResponseHandlerConfig) {
  const handler = createSocketHandler(config);

  return {
    enhance: handler.enhance.bind(handler),
    wrapper: handler.wrapper.bind(handler),
    setupServer: handler.setupServer.bind(handler),
    logger: handler.getLogger(),
  };
}

// Legacy REST exports
export { sendSuccess, sendError, errorHandler };

// Legacy Socket exports
export { emitSuccess, emitError, socketWrapper };

// Response formatter configuration
export {
  setResponseFormatter,
  configureResponseFormat,
  formatApiResponse,
  getFormattedResponse,
};
