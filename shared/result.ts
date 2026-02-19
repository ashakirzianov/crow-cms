export type Result<T = object> =
    | SuccessResult<T>
    | FailureResult

export type SuccessResult<T> = { success: true, message?: string } & T
export type FailureResult = { success: false; message: string }