export type IpcErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'IO_ERROR'
  | 'CONFIG_ERROR'
  | 'INTERNAL_ERROR'

export interface IpcError {
  code: IpcErrorCode
  message: string
}

export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: IpcError }

export interface DatabaseStatus {
  path: string
  userVersion: number
  ready: boolean
}
