import type { IpcError, IpcErrorCode, IpcResult } from '../../shared/types/ipc.js'

export function ipcSuccess<T>(data: T): IpcResult<T> {
  return { ok: true, data }
}

export function ipcFailure(code: IpcErrorCode, message: string): IpcResult<never> {
  return { ok: false, error: { code, message } }
}

function getErrorCode(error: unknown): IpcErrorCode {
  if (error && typeof error === 'object') {
    const code = (error as { code?: string }).code

    if (code === 'ENOENT' || code === 'EACCES' || code === 'EPERM') {
      return 'IO_ERROR'
    }
  }

  const message = error instanceof Error ? error.message : String(error)

  if (/缺少模型|API Key|模型名称|配置/.test(message)) {
    return 'CONFIG_ERROR'
  }

  if (/不存在|not found/i.test(message)) {
    return 'NOT_FOUND'
  }

  return 'INTERNAL_ERROR'
}

export function toIpcError(error: unknown): IpcError {
  const message = error instanceof Error ? error.message : String(error)

  return {
    code: getErrorCode(error),
    message,
  }
}

export async function wrapHandler<T>(handler: () => Promise<T> | T): Promise<IpcResult<T>> {
  try {
    const data = await handler()

    return ipcSuccess(data)
  } catch (error) {
    return ipcFailure(toIpcError(error).code, toIpcError(error).message)
  }
}
