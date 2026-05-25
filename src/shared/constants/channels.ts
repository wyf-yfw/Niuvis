import channelsJson from './channels.json' with { type: 'json' }

/** IPC channel 名称（主进程与 preload 共用，勿手写字符串） */
export const IPC_CHANNELS = channelsJson

export type IpcChannel =
  | (typeof IPC_CHANNELS.apps)[keyof typeof IPC_CHANNELS.apps]
  | (typeof IPC_CHANNELS.library)[keyof typeof IPC_CHANNELS.library]
  | (typeof IPC_CHANNELS.computer)[keyof typeof IPC_CHANNELS.computer]
  | (typeof IPC_CHANNELS.chat)[keyof typeof IPC_CHANNELS.chat]
  | (typeof IPC_CHANNELS.settings)[keyof typeof IPC_CHANNELS.settings]
  | (typeof IPC_CHANNELS.system)[keyof typeof IPC_CHANNELS.system]
  | (typeof IPC_CHANNELS.index)[keyof typeof IPC_CHANNELS.index]
