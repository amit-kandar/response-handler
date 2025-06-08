import { sendSuccess, sendError } from './rest/response';
import errorHandler from './rest/errorHandler';
import { emitSuccess, emitError } from './socket/emitter';
import socketWrapper from './socket/wrapper';
import { configureResponseFormat } from './responseTemplate';
// import * as Errors from './errors';

export {
  // REST
  sendSuccess,
  sendError,
  errorHandler,

  // Socket.IO
  emitSuccess,
  emitError,
  socketWrapper,

  // Errors
  // Errors,

  // Configuration
  configureResponseFormat,
};