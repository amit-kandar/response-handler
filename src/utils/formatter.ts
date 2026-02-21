import { formatApiResponse } from '../responseTemplate';

function formatResponse(
  success: boolean,
  data: any = null,
  message: string = '',
  error: any = null,
) {
  return formatApiResponse(success, data, message, error);
}

export default formatResponse;
