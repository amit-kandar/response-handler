interface ResponseData {
  success: boolean;
  message: string;
  data: any;
  error: any;
}

type ResponseFormatter = (params: ResponseData) => any;

let responseFormatter: ResponseFormatter = ({ success, message, data, error }: ResponseData) => ({
  success,
  message,
  data,
  error,
});

function configureResponseFormat(templateFn: ResponseFormatter): void {
  if (typeof templateFn === 'function') {
    responseFormatter = templateFn;
  }
}

function getFormattedResponse(
  success: boolean,
  data: any,
  message: string,
  error: any = null,
): any {
  return responseFormatter({ success, message, data, error });
}

export { configureResponseFormat, getFormattedResponse };
