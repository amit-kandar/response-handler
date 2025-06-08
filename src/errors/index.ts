// export class AppError extends Error {
//     public type: string;

//     public details: any;

//     constructor(message: string = 'Something went wrong', details: any = {}) {
//       super(message);
//       this.name = 'AppError';
//       this.type = 'AppError';
//       this.details = details;

//       // Maintains proper stack trace for where our error was thrown (only available on V8)
//       if (Error.captureStackTrace) {
//         Error.captureStackTrace(this, AppError);
//       }
//     }
//   }

// //   export class ValidationError extends AppError {
// //     constructor(details: any = {}) {
// //       super('Validation Error', details);
// //       this.name = 'ValidationError';
// //       this.type = 'ValidationError';
// //     }
// //   }

// //   export class NotFoundError extends AppError {
// //     constructor(details: any = {}) {
// //       super('Not Found', details);
// //       this.name = 'NotFoundError';
// //       this.type = 'NotFoundError';
// //     }
// //   }

// //   // Type definitions for better TypeScript support
// //   export interface ErrorDetails {
// //     [key: string]: any;
// //   }

//   export type AppErrorType = 'AppError' | 'ValidationError' | 'NotFoundError';
