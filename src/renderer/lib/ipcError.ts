import type { IpcErrorCode } from '../../shared/types/ipc'

export class NiuvisIpcError extends Error {
  code: IpcErrorCode

  constructor(code: IpcErrorCode, message: string) {
    super(message)
    this.name = 'NiuvisIpcError'
    this.code = code
  }
}

export function formatIpcError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as Error & { code?: IpcErrorCode }).code

    if (code) {
      return `[${code}] ${error.message}`
    }

    return error.message
  }

  return '操作失败'
}

export function isNiuvisIpcError(error: unknown): error is Error & { code: IpcErrorCode } {
  return (
    error instanceof Error &&
    error.name === 'NiuvisIpcError' &&
    typeof (error as Error & { code?: string }).code === 'string'
  )
}
