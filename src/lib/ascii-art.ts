/**
 * ASCII 艺术生成工具 — CatStack 终端视觉系统
 */

// ========== 旋转动画帧 ==========
export const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

// ========== ANSI 颜色码 (终端中渲染) ==========
export const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    brightRed: '\x1b[91m',
    brightGreen: '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue: '\x1b[94m',
    brightMagenta: '\x1b[95m',
    brightCyan: '\x1b[96m',
  },
} as const

// ========== CatStack ASCII Banner ==========
export const CATSTACK_BANNER = `
   ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
   █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█
   █░      ▄▀▀▀▀▀▀▄  ▄▀▀▀▀▀▀▄  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▄  ░█
   █░     ▐▓▓▌  ▐▓▓▌▐▓▓▌  ▐▓▓▌    ▐▓▓▌   ▐▓▓▌   ▐▓▓▌ ░█
   █░     ▐▓▓▌  ▐▓▓▌▐▓▓▌  ▐▓▓▌    ▐▓▓▌   ▐▓▓▌   ▐▓▓▌ ░█
   █░     ▐▓▓▌      ▐▓▓▌  ▐▓▓▌    ▐▓▓▌   ▐▓▓▌   ▐▓▓▌ ░█
   █░     ▐▓▓▌  ▀▀▀▀▐▓▓▌  ▐▓▓▌    ▐▓▓▌   ▐▓▓▌   ▐▓▓▌ ░█
   █░     ▐▓▓▌  ▄▄▄▄▐▓▓▌  ▐▓▓▌    ▐▓▓▌   ▐▓▓▌   ▐▓▓▌ ░█
   █░          ▐▓▓▌▐▓▓▌  ▐▓▓▌    ▐▓▓▌   ▐▓▓▌   ▐▓▓▌ ░█
   █░          ▐▓▓▌▐▓▓▌  ▐▓▓▌    ▐▓▓▌   ▐▓▓▌   ▐▓▓▌ ░█
   █░      ▀▀▀▀▀▀▀▀ ▀▀▀▀▀▀▀▀      ▀▀▀▀   ▀▀▀▀   ▀▀▀▀  ░█
   █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█
   ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
`

// ========== 分隔线 ==========
export function divider(char: string = '═', width: number = 64): string {
  return char.repeat(Math.min(width, 80))
}

export function doubleDivider(width: number = 64): string {
  return divider('═', width)
}

export function singleDivider(width: number = 64): string {
  return divider('─', width)
}

export function sessionHeader(convId: string, title: string): string {
  const w = 64
  return [
    `╔${'═'.repeat(w - 2)}╗`,
    `║ ${padRight(`SESSION: ${title}`, w - 4)} ║`,
    `║ ${padRight(`ID: ${convId}`, w - 4)} ║`,
    `╚${'═'.repeat(w - 2)}╝`,
  ].join('\n')
}

// ========== ASCII 进度条 ==========
export function progressBar(current: number, total: number, width: number = 30): string {
  if (total <= 0) return '[░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]   0%'
  const pct = Math.min(current / total, 1)
  const filled = Math.round(pct * width)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return `[${bar}] ${Math.round(pct * 100).toString().padStart(3)}%`
}

// ========== ASCII 表格 ==========
export function asciiTable(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) => {
    const maxRow = rows.reduce((max, row) => Math.max(max, (row[i] ?? '').length), 0)
    return Math.max(h.length, maxRow)
  })

  const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - s.length))

  const top = '┌' + colWidths.map((w) => '─'.repeat(w + 2)).join('┬') + '┐'
  const sep = '├' + colWidths.map((w) => '─'.repeat(w + 2)).join('┼') + '┤'
  const bot = '└' + colWidths.map((w) => '─'.repeat(w + 2)).join('┴') + '┘'
  const headerRow = '│ ' + headers.map((h, i) => pad(h, colWidths[i])).join(' │ ') + ' │'
  const dataRows = rows.map(
    (row) => '│ ' + row.map((c, i) => pad(c ?? '', colWidths[i])).join(' │ ') + ' │'
  )

  return [top, headerRow, sep, ...dataRows, bot].join('\n')
}

// ========== 状态标签 ==========
export function statusLabel(
  label: string,
  value: string,
  width: number = 64
): string {
  return `${padRight(label + ':', 20)} ${value}`.padEnd(width)
}

// ========== 工具函数 ==========
export function padRight(s: string, len: number): string {
  return s + ' '.repeat(Math.max(0, len - s.length))
}

export function padLeft(s: string, len: number): string {
  return ' '.repeat(Math.max(0, len - s.length)) + s
}

// ========== 带时间戳的日志行 ==========
export function logLine(
  timestamp: string,
  type: string,
  content: string,
  convId?: string
): string {
  const ts = `[${timestamp}]`
  const tag = `[${type.toUpperCase()}]`.padEnd(10)
  const cid = convId ? ` #${convId.slice(0, 6)}` : ''
  return `${ts} ${tag} ${content}${cid}`
}