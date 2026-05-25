/** 设置弹窗统一深色主题（Popover 需挂到弹窗内或自带 dark，否则会沿用 body 浅色 token） */
export const SETTINGS_DARK_CLASS = 'dark'
export const SETTINGS_DARK_THEME = { 'data-theme': 'dark' } as const

export const SETTINGS_MODAL_CLASS = `niuvis-settings-modal ${SETTINGS_DARK_CLASS}`

export const settingsPopoverClassName = `${SETTINGS_DARK_CLASS} niuvis-settings-popover text-foreground`

/** 与 Input 一致的深色字段底/字色（避免继承 body 黑色字） */
export const settingsFieldClassName = 'bg-field text-field-foreground'

export const settingsListItemClassName = 'text-foreground'
