export function formatResponse(statusCode, message, data) {
  const formattedError = {
    statusCode: statusCode || 500,
    message: message || 'Internal Server Error',
    data
  }
  return formattedError
}