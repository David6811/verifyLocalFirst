import { Data } from 'effect';

// Sealed auth error types using Effect's Data
export class AuthError extends Data.TaggedError("AuthError")<{
  readonly type: AuthErrorType;
  readonly message: string;
  readonly originalError?: Error;
}> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string;
  readonly originalError?: Error;
}> {}

export class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly message: string;
  readonly originalError?: Error;
}> {}

export class UnknownError extends Data.TaggedError("UnknownError")<{
  readonly message: string;
  readonly originalError?: Error;
}> {}

export type AuthErrorType = 
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'USER_NOT_FOUND'
  | 'EMAIL_NOT_VERIFIED'
  | 'WEAK_PASSWORD'
  | 'EMAIL_ALREADY_EXISTS';

export type AppError = AuthError | DatabaseError | NetworkError | UnknownError;

// Legacy support - keep for backward compatibility
export enum SupabaseErrorType {
  AUTH_ERROR = 'AUTH_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class SupabaseError extends Error {
  public readonly type: SupabaseErrorType;
  public readonly originalError?: Error;

  constructor(message: string, type: SupabaseErrorType = SupabaseErrorType.UNKNOWN_ERROR, originalError?: Error) {
    super(message);
    this.name = 'SupabaseError';
    this.type = type;
    this.originalError = originalError;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SupabaseError);
    }
  }
}