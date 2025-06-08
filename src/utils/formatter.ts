import { getFormattedResponse } from '../responseTemplate';

function formatResponse(success: boolean, data: any = null, message: string = '', error: any = null) {
  return getFormattedResponse(success, data, message, error);
}

export default formatResponse;
