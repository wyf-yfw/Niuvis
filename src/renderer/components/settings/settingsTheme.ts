/** 设置弹窗统一深色主题（Popover 需挂到弹窗内或自带 dark，否则会沿用 body 浅色 token） */
export const SETTINGS_DARK_CLASS = 'dark'
export const SETTINGS_DARK_THEME = { 'data-theme': 'dark' } as const

export const settingsPopoverClassName = `${SETTINGS_DARK_CLASS} niuvis-settings-popover`
