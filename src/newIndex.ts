// New Modern Response Handler Export
export {
  ResponseHandler,
  createResponseHandler,
  responseHandler,
} from './middleware/responseHandler';

export {
  SocketResponseHandler,
  createSocketHandler,
} from './socket/enhancedSocket';

export { Logger } from './core/logger';
export { ResponseBuilder } from './core/responseBuilder';

// Types
export * from './types';

// Quick setup functions
export function quickSetup(config?: any) {
  const { createResponseHandler } = require('./middleware/responseHandler');
  const handler = createResponseHandler(config);
  
  return {
    middleware: handler.middleware(),
    errorHandler: handler.errorHandler(),
    logger: handler.getLogger(),
    updateConfig: handler.updateConfig.bind(handler),
  };
}

export function quickSocketSetup(config?: any) {
  const { createSocketHandler } = require('./socket/enhancedSocket');
  const handler = createSocketHandler(config);
  
  return {
    enhance: handler.enhance.bind(handler),
    wrapper: handler.wrapper.bind(handler),
    setupServer: handler.setupServer.bind(handler),
    logger: handler.getLogger(),
  };
}

// Backward compatibility exports (legacy)
export { sendSuccess, sendError } from './rest/response';
export { default as errorHandler } from './rest/errorHandler';
export { emitSuccess, emitError } from './socket/emitter';
export { default as socketWrapper } from './socket/wrapper';
export { configureResponseFormat } from './responseTemplate';
