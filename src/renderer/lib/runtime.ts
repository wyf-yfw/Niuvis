export function isElectronRuntime(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.__NIUVIS_ELECTRON__ === true || typeof window.niuvisApps !== 'undefined')
  )
}

export function getNonElectronHint(): string {
  if (typeof window === 'undefined') {
    return '当前环境无法访问桌面接口'
  }

  if (window.__NIUVIS_ELECTRON__ !== true) {
    return '请关闭浏览器标签页，使用 npm run dev 启动后弹出的 Electron 桌面窗口（不要直接打开 localhost:5173）'
  }

  return 'Electron 预加载脚本未正确注入，请完全退出应用后重新执行 npm run dev'
}
