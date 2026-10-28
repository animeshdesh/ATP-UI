/** The server answered with an error. `code` is the contract's `error.code` (see backend docs/AUTH.md). */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'error',
  ) {
    super(message);
  }
}

/** The request never reached the server (offline, DNS, timeout). Safe to retry. */
export class NetworkError extends Error {
  constructor(message = 'You are offline') {
    super(message);
  }
}
