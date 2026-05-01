'use client'

import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import { useAuth } from './AuthProvider'
import { FloatingWindow } from '@/components/ui/FloatingWindow'

// ============================================================
// 虚拟文件系统 (VFS) —— ls / cat / dir 统一数据源
// ============================================================
interface VfsNode {
  name: string
  isDir: boolean
  content?: string  // only for files
  size: string
  date: string
  mode: string     // e.g. "-rw-r--r--"
}

type VfsTree = Record<string, VfsNode[]>

const CWD = '/home/guest'

const VFS: VfsTree = {
  '/': [
    { name: 'home', isDir: true, size: '4.0K', date: 'Apr  1 10:00', mode: 'drwxr-xr-x' },
    { name: 'etc', isDir: true, size: '4.0K', date: 'Apr  1 09:00', mode: 'drwxr-xr-x' },
  ],
  '/home': [
    { name: 'guest', isDir: true, size: '4.0K', date: 'Apr  1 10:00', mode: 'drwxr-xr-x' },
  ],
  '/home/guest': [
    {
      name: '.bashrc', isDir: false, size: '220B', date: 'Apr  1 10:00', mode: '-rw-r--r--',
      content: '# CatStack Terminal config\nexport PS1=\'\\u@\\h:\\w\\$ \'\nexport EDITOR=vim\nalias ll=\'ls -la\'\nalias cls=clear',
    },
    {
      name: 'chat.sh', isDir: false, size: '140B', date: 'Apr  1 10:00', mode: '-rwxr-xr-x',
      content: '#!/bin/bash\n# CatStack AI Chat Launcher\necho "Connecting to CatStack AI..."\nnc localhost 11434 <<< \'{"model":"catstack","stream":true}\'',
    },
    {
      name: 'README.md', isDir: false, size: '180B', date: 'Apr  1 10:00', mode: '-rw-r--r--',
      content: '# CatStack Terminal v1.0.0\n\nWelcome to CatStack Terminal.\n\n## Commands\nType `help` for available commands.\n\n---\nBuilt with Next.js + Supabase.',
    },
    {
      name: 'config.yaml', isDir: false, size: '64B', date: 'Mar 30 14:22', mode: '-rw-r--r--',
      content: 'theme: dark\neditor.fontFamily: \'Cascadia Code\'\neditor.fontSize: 13\n',
    },
    {
      name: 'logs', isDir: true, size: '4.0K', date: 'Apr  1 09:15', mode: 'drwxr-xr-x',
    },
  ],
  '/etc': [
    {
      name: 'hostname', isDir: false, size: '18B', date: 'Apr  1 09:00', mode: '-rw-r--r--',
      content: 'catstack-terminal\n',
    },
    {
      name: 'os-release', isDir: false, size: '72B', date: 'Apr  1 09:00', mode: '-rw-r--r--',
      content: 'NAME="CatStack OS"\nVERSION="1.0.0"\nID=catstack\nPRETTY_NAME="CatStack OS 1.0.0"',
    },
  ],
  '/home/guest/logs': [
    {
      name: 'access.log', isDir: false, size: '1.2K', date: 'Apr  1 09:30', mode: '-rw-r--r--',
      content: '2024-04-01 09:00:01 [INFO] Terminal started\n2024-04-01 09:00:02 [INFO] User guest logged in\n2024-04-01 09:05:00 [INFO] AI model loaded: catstack-v1',
    },
    {
      name: 'error.log', isDir: false, size: '0B', date: 'Apr  1 09:00', mode: '-rw-r--r--',
      content: '',
    },
  ],
}

/** 将用户输入的 path 解析为绝对路径 */
function resolvePath(input: string): string {
  if (!input) return CWD
  if (input.startsWith('/')) return input
  // relative path from CWD
  if (input === '.') return CWD
  if (input === '..') {
    const parts = CWD.split('/')
    parts.pop()
    return parts.join('/') || '/'
  }
  return `${CWD}/${input}`
}

/** 获取目录内容 */
function listDir(abspath: string): VfsNode[] {
  return VFS[abspath] || []
}

/** 获取文件节点 */
function getFile(abspath: string): VfsNode | null {
  const dir = abspath.substring(0, abspath.lastIndexOf('/')) || '/'
  const name = abspath.substring(abspath.lastIndexOf('/') + 1)
  const entries = VFS[dir] || []
  return entries.find((n) => n.name === name && !n.isDir) || null
}
// ============================================================

interface LogLine {
  text: string
  type?: 'info' | 'success' | 'error' | 'system' | 'warn' | 'neon' | 'highlight'
}

interface WinInstance {
  id: string
  title: string
  type: 'login' | 'info' | 'settings' | 'files' | 'processes'
}

const COMMANDS = [
  'help', 'login', 'window', 'clear', 'whoami',
  'date', 'echo', 'ls', 'dir', 'uname', 'cat', 'fastfetch',
  'pwd', 'uptime', 'matrix', 'eject',
]
const WINDOW_TYPES = ['login', 'info', 'settings', 'files', 'processes']

const BOOT_SEQUENCE: LogLine[] = [
  { text: '[  OK  ] Initializing kernel modules...', type: 'success' },
  { text: '[  OK  ] Mounting filesystems (ext4 + overlay)...', type: 'success' },
  { text: '[  OK  ] Starting CatStack daemon v1.0.0', type: 'success' },
  { text: '[  OK  ] System clock synchronized (NTP)', type: 'success' },
  { text: '[  OK  ] Enabling swap (2.0 GB)', type: 'success' },
  { text: '', type: 'info' },
  { text: '[ PERF ] Booting on 4 vCores @ 2.80GHz', type: 'info' },
  { text: '[ PERF ] Memory: 1.2GB / 4.0GB available', type: 'info' },
  { text: '[ DB   ] Connecting to Supabase postgres...', type: 'info' },
  { text: '[ DB   ] Pool health: 20/20 connections ready', type: 'success' },
  { text: '[ DB   ] Row-Level Security enabled', type: 'info' },
  { text: '[ DB   ] Realtime subscription channel open', type: 'success' },
  { text: '', type: 'info' },
  { text: '[ NET  ] Network interface eth0: 192.168.1.100/24', type: 'success' },
  { text: '[ NET  ] DNS resolver: 8.8.8.8, 1.1.1.1', type: 'info' },
  { text: '[ NET  ] TLS 1.3 enabled for all outbound', type: 'success' },
  { text: '[ WARN ] Firewall rule #42 (debug port 9229) inactive', type: 'info' },
  { text: '', type: 'info' },
  { text: '[  OK  ] Loading terminal subsystem...', type: 'success' },
  { text: '[  OK  ] Terminal subsystem ready', type: 'success' },
  { text: '', type: 'info' },
  { text: 'CatStack Terminal v1.0.0 — Transmission Ready', type: 'neon' },
  { text: 'Type "help" for available commands.', type: 'system' },
  { text: 'Type "login" or "window" to sign in.', type: 'system' },
  { text: '', type: 'info' },
  { text: '─── BOOT FASTFETCH ───', type: 'highlight' },
  { text: '', type: 'info' },
  ...FASTFETCH_LINES(),
  { text: '', type: 'info' },
]

// Fastfetch 输出数据，在启动和 fastfetch 命令中复用
function FASTFETCH_LINES(): LogLine[] {
  return [
    { text: '╭─────────────────────────────────────────────────────╮', type: 'info' },
    { text: '│          ▟█▙                  guest@catstack        │', type: 'info' },
    { text: '│         ▛▜▜▜█▛                ------------------- │', type: 'info' },
    { text: '│        ▐████▌  ▟███▙            OS: CatStack OS v1.0.0', type: 'info' },
    { text: '│        ▝█████▛▜██▚▜█▛          Kernel: Linux 6.8.0-catstack', type: 'info' },
    { text: '│  ███▙   ▝█████▐█▝██▅ █▙        Uptime: 0d 0h 12m', type: 'info' },
    { text: '│ █▚▜███▛ ▟█████▌▝████  █▌       Shell: bash 5.2.15', type: 'info' },
    { text: '│ █▄▝████████████████▛  ▐█▌      Terminal: CatStack v1.0.0', type: 'info' },
    { text: '│  ▀█▄▝█████████████▛  ▗█▀       CPU: AMD Ryzen 7 (4) @ 2.80GHz', type: 'info' },
    { text: '│    ▀█▄▝█████████▛  ▗█▌         GPU: VirtIO-GPU 128MB', type: 'info' },
    { text: '│      ▀█▄▝█████▛  ▗█▀           Memory: 1.2GB / 4.0GB', type: 'info' },
    { text: '│ ▟█▙      ██▌   ▟█▙             Disk: 6.5GB / 20.0GB', type: 'info' },
    { text: '│▐▘▝▘▜█▙   ██▌  ▟█▛▀▘▀▜▙         Locale: zh_CN.UTF-8', type: 'info' },
    { text: '│▐▌  ▝██▙ ▐█▌ ▟█▛   ▐▌         Theme: Dark+ [CatStack]', type: 'info' },
    { text: '│ ▜▄  ██▘▗█▛▝█▛  ▄▐▘           Resolution: 1920x1080 @ 60Hz', type: 'info' },
    { text: '╰─────────────────────────────────────────────────────╯', type: 'info' },
  ]
}

type Phase = 'boot' | 'ready' | 'login-email'

export function TerminalLogin() {
  const { signInWithEmail, verifyOtp } = useAuth()
  const [phase, setPhase] = useState<Phase>('boot')
  const [logs, setLogs] = useState<LogLine[]>([])
  const [bootIndex, setBootIndex] = useState(0)
  const [input, setInput] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [infoMsg, setInfoMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Ref to always have latest input for Tab handler (avoids stale closure)
  const inputRef_val = useRef('')
  inputRef_val.current = input

  // Command history
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)

  // Tab completion state
  const tabState = useRef({
    tabIndex: -1,
    tabMatches: [] as string[],
  })

  // Window stack — use ref for counter to avoid stale closure
  const [windows, setWindows] = useState<WinInstance[]>([])
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null)
  const winCounter = useRef(0)

  // 启动动画
  useEffect(() => {
    if (bootIndex >= BOOT_SEQUENCE.length) {
      setPhase('ready')
      return
    }
    const timer = setTimeout(() => {
      const line = BOOT_SEQUENCE[bootIndex]
      addLog(line.text, line.type)
      setBootIndex((i) => i + 1)
    }, 120)
    return () => clearTimeout(timer)
  }, [bootIndex])

  // 自动滚动
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [logs])

  // 聚焦输入
  useEffect(() => {
    if (phase !== 'boot') {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [phase])

  const addLog = (text: string, type?: LogLine['type']) => {
    setLogs((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].text === text) return prev
      return [...prev, { text, type }]
    })
  }

  // ====== Tab 补全 ======
  const handleTab = () => {
    if (phase === 'login-email') return

    const cur = inputRef_val.current
    if (!cur.trim()) return

    const state = tabState.current

    if (cur.startsWith('window ')) {
      const partial = cur.slice(7).trim()
      if (state.tabIndex === -1) {
        const matches = WINDOW_TYPES.filter((w) => w.startsWith(partial))
        if (matches.length === 1) {
          setInput(`window ${matches[0]} `)
          return
        }
        if (matches.length > 1) {
          state.tabMatches = matches
          state.tabIndex = 0
          addLog(matches.join('    '), 'info')
          return
        }
        return
      }
      state.tabIndex = (state.tabIndex + 1) % state.tabMatches.length
      setInput(`window ${state.tabMatches[state.tabIndex]} `)
      return
    }

    const tokens = cur.split(/\s+/)
    if (tokens.length > 1) return
    const partial = tokens[0]

    if (state.tabIndex === -1) {
      const matches = COMMANDS.filter((c) => c.startsWith(partial))
      if (matches.length === 1) {
        setInput(`${matches[0]} `)
        return
      }
      if (matches.length > 1) {
        state.tabMatches = matches
        state.tabIndex = 0
        addLog(matches.join('    '), 'info')
        return
      }
      return
    }
    state.tabIndex = (state.tabIndex + 1) % state.tabMatches.length
    setInput(`${state.tabMatches[state.tabIndex]} `)
  }

  useEffect(() => {
    tabState.current.tabIndex = -1
    tabState.current.tabMatches = []
  }, [input])

  // ====== 窗口管理 ======
  const openWindow = (typeId: string) => {
    winCounter.current += 1
    const id = `win-${winCounter.current}`
    const titles: Record<string, string> = {
      login: 'LOGIN // AUTHENTICATION',
      info: 'SYSTEM // INFORMATION',
      settings: 'SETTINGS // CONFIGURATION',
      files: 'FILES // EXPLORER',
      processes: 'PROCESSES // TASK MANAGER',
    }
    const win: WinInstance = {
      id,
      title: titles[typeId] || typeId.toUpperCase(),
      type: typeId as WinInstance['type'],
    }
    setWindows((prev) => [...prev, win])
    setActiveWindowId(id)
    addLog(`[OK] Opened window: ${win.title}`, 'success')
  }

  const closeWindow = (id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id))
    setActiveWindowId((prev) => (prev === id ? null : prev))
  }

  const focusWindow = (id: string) => {
    setWindows((prev) => {
      const idx = prev.findIndex((w) => w.id === id)
      if (idx === -1) return prev
      const item = prev[idx]
      return [...prev.slice(0, idx), ...prev.slice(idx + 1), item]
    })
    setActiveWindowId(id)
  }

  // ====== 命令处理 ======
  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim()
    const lower = trimmed.toLowerCase()
    setInput('')
    setError('')
    setInfoMsg('')
    setHistory((prev) => [...prev, trimmed])
    setHistoryIdx(-1)

    addLog(`$ ${trimmed}`, 'system')

    if (!trimmed) return

    if (lower === 'help') {
      addLog('Available commands:', 'info')
      addLog('  help                           Show this help', 'info')
      addLog('  login                          Login with email', 'info')
      addLog('  window [type]                  Open GUI window', 'info')
      addLog('    types: login, info, settings, files, processes', 'info')
      addLog('  clear                          Clear screen', 'info')
      addLog('  whoami                         Show current user', 'info')
      addLog('  date                           Show date/time', 'info')
      addLog('  echo [msg]                     Echo a message', 'info')
      addLog('  ls [-la]                       List files', 'info')
      addLog('  dir                            List files (alias of ls)', 'info')
      addLog('  uname [-a]                     System info', 'info')
      addLog('  cat [file]                     Read a file', 'info')
      addLog('  fastfetch                      System overview (hardware info)', 'info')
      addLog('  pwd                            Print work dir', 'info')
      addLog('  uptime                         System uptime', 'info')
      addLog('  mkdir [dir]                    Create directory', 'info')
      addLog('  Tab key                        Auto-complete', 'info')
      addLog('  ↑/↓ arrows                    Command history', 'info')
    } else if (lower === 'login') {
      setPhase('login-email')
      addLog('Enter your email address to receive a Magic Link:', 'system')
    } else if (lower === 'window') {
      openWindow('login')
    } else if (lower.startsWith('window ')) {
      const sub = lower.slice(7).trim()
      if (['login', 'info', 'settings', 'files', 'processes'].includes(sub)) {
        openWindow(sub)
      } else {
        addLog(`window: unknown type "${sub}"`, 'error')
        addLog('Try: window login, info, settings, files, processes', 'info')
      }
    } else if (lower === 'clear') {
      setLogs([])
      setPhase('ready')
    } else if (lower === 'whoami') {
      addLog('guest', 'info')
    } else if (lower === 'date') {
      addLog(new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }), 'info')
    } else if (lower === 'pwd') {
      addLog(CWD, 'info')
    } else if (lower === 'uptime') {
      const now = Math.floor((Date.now() - performance.now()) / 1000)
      const m = Math.floor(now / 60)
      const s = now % 60
      addLog(`up ${m}m ${s}s, 1 user, load average: 0.08, 0.12, 0.15`, 'info')
    } else if (lower === 'uname' || lower === 'uname -a') {
      addLog('Linux catstack 6.8.0-catstack #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux', 'info')
    } else if (lower === 'fastfetch') {
      FASTFETCH_LINES().forEach((l) => addLog(l.text, l.type))
    } else if (lower === 'matrix') {
      addLog('Wake up, Neo...', 'system')
      addLog('The Matrix has you...', 'system')
      addLog('Follow the white rabbit.', 'info')
      const chars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃ0123456789ABCDEF░▒▓█'
      const cols = 40
      for (let row = 0; row < 8; row++) {
        let line = ''
        for (let c = 0; c < cols; c++) {
          line += chars[Math.floor(Math.random() * chars.length)]
        }
        addLog(line, 'info')
      }
    } else if (lower === 'eject') {
      addLog('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓', 'info')
      addLog('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▛▜▓▓▓▓▓▓▓▓▓▓▓▓', 'info')
      addLog('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▐▌▐▌▓▓▓▓▓▓▓▓▓▓▓▓', 'info')
      addLog('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▛▜▛▜▛▜▛▜▛▜▛▜▐▌▐▌▛▜▓▓▓▓▓▓', 'info')
      addLog('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▐▌            ▐▌▐▌▓▓▓▓', 'info')
      addLog('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▐▌            ▐▌▐▌▓▓▓▓', 'info')
      addLog('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▓▜▖          ▗▛▐▌▐▌▓▓▓▓', 'info')
      addLog('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▌▐████████▌▐▌▐████▓▓▓', 'info')
      addLog('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓', 'info')
      addLog('[ INFO ] CD-ROM tray ejected. (not really, but you get the idea)', 'success')
    } else if (lower.startsWith('echo ')) {
      addLog(trimmed.slice(5), 'info')
    } else if (lower.startsWith('cat ')) {
      // ===== cat: read from VFS =====
      const fileArg = trimmed.slice(4).trim()
      if (!fileArg) {
        addLog('cat: missing operand', 'error')
      } else {
        const abspath = resolvePath(fileArg)
        const node = getFile(abspath)
        if (node) {
          const lines = (node.content || '').split('\n')
          // omit trailing empty string from split
          const display = lines.length > 0 && lines[lines.length - 1] === ''
            ? lines.slice(0, -1)
            : lines
          display.forEach((l) => addLog(l, 'info'))
        } else {
          addLog(`cat: ${fileArg}: No such file or directory`, 'error')
        }
      }
    } else if (lower === 'ls' || lower === 'ls -la' || lower === 'dir') {
      // ===== ls / dir: read from VFS =====
      const entries = listDir(CWD)
      if (entries.length === 0) {
        addLog('(empty)', 'info')
      } else {
        const paddedMode = entries.map((e) => e.mode)
        const paddedSize = entries.map((e) => e.size)
        // simple total blocks calc
        const total = entries.reduce((sum, e) => {
          const num = parseInt(e.size) || 0
          return sum + Math.ceil(num / 1024)
        }, 0)
        addLog(`total ${total}`, 'info')
        entries.forEach((e) => {
          const line = `${e.mode}  1 guest guest  ${e.size.padStart(5)}  ${e.date}  ${e.name}`
          addLog(line, e.isDir ? 'system' : 'info')
        })
      }
    } else if (lower.startsWith('mkdir ')) {
      const dirName = trimmed.slice(6).trim()
      if (!dirName) {
        addLog('mkdir: missing operand', 'error')
      } else {
        // resolve to absolute
        const abspath = resolvePath(dirName)
        if (VFS[abspath]) {
          addLog(`mkdir: cannot create directory '${dirName}': File exists`, 'error')
        } else {
          // add dir to VFS and its parent entry
          addLog(`[VFS] Created directory ${abspath}`, 'success')
        }
      }
    } else {
      addLog(`bash: ${trimmed.split(/\s+/)[0]}: command not found`, 'error')
      addLog('Type "help" for available commands.', 'info')
    }
  }

  // ====== Magic Link 登录 ======
  const handleEmailSubmit = async () => {
    if (!email.trim()) return
    setError('')
    setInfoMsg('')
    addLog(`$ ${email}`, 'system')

    setInfoMsg('Sending Magic Link...')
    const result = await signInWithEmail(email.trim())
    if (result.error) {
      setError(result.error)
      addLog(`Error: ${result.error}`, 'error')
      setInfoMsg('')
      return
    }
    setInfoMsg('')
    addLog('[  OK  ] Magic Link sent!', 'success')
    addLog('Check your email and click the link to sign in.', 'system')
    addLog('This terminal will auto-refresh upon successful login.', 'info')
    setPhase('ready')
    setEmail('')
  }

  const handleWindowLogin = async (val: string) => {
    setEmail(val)
    setInfoMsg('Sending Magic Link...')
    const result = await signInWithEmail(val.trim())
    if (result.error) {
      setError(result.error)
      addLog(`Error: ${result.error}`, 'error')
      setInfoMsg('')
      return
    }
    setInfoMsg('')
    addLog(`[  OK  ] Magic Link sent to ${val}`, 'success')
    addLog('Check your email and click the link to sign in.', 'system')
    setEmail('')
    setPhase('ready')
  }

  // ====== 键盘事件 ======
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (phase === 'login-email') {
        handleEmailSubmit()
      } else {
        handleCommand(input)
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      handleTab()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length === 0) return
      const newIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1)
      setHistoryIdx(newIdx)
      setInput(history[newIdx])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIdx === -1) return
      const newIdx = historyIdx + 1
      if (newIdx >= history.length) {
        setHistoryIdx(-1)
        setInput('')
      } else {
        setHistoryIdx(newIdx)
        setInput(history[newIdx])
      }
    }
  }

  const showInput = phase !== 'boot'

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden relative">
      {/* 终端输出区域 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-sm leading-relaxed"
      >
        {logs.map((line, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap ${
              line.type === 'success'
                ? 'text-[#98c379]'
                : line.type === 'error'
                  ? 'text-[#f44747]'
                  : line.type === 'system'
                    ? 'text-[#569cd6]'
                    : line.type === 'info'
                      ? 'text-[#dcdcaa]'
                      : line.type === 'warn'
                        ? 'text-[#e5c07b]'
                        : line.type === 'neon'
                          ? 'text-[#56b6c2]'
                          : line.type === 'highlight'
                            ? 'text-[#c678dd]'
                            : 'text-[#cccccc]'
            }`}
          >
            {line.text || '\u00A0'}
          </div>
        ))}

        {error && (
          <div className="text-[#f44747]">Error: {error}</div>
        )}

        {infoMsg && (
          <div className="text-[#dcdcaa]">
            {infoMsg}
            <span className="inline-block w-2 h-4 bg-[#569cd6] ml-1 animate-blink" />
          </div>
        )}
      </div>

      {/* 命令行输入 */}
      {showInput && (
        <div className="border-t border-[#3c3c3c] p-2 bg-[#1e1e1e] shrink-0 relative z-[60]">
          <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-[#569cd6] shrink-0">
              {phase === 'login-email' ? 'email>' : '$'}
            </span>
            {phase === 'login-email' ? (
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="user@example.com"
                className="flex-1 bg-transparent border-none outline-none text-sm text-[#cccccc] font-mono placeholder:text-[#808080]/50"
              />
            ) : (
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or 'help'..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-[#cccccc] font-mono placeholder:text-[#808080]/50"
              />
            )}
          </div>
        </div>
      )}

      {/* ===== 浮动窗口 ===== */}
      {windows.map((win, idx) => (
        <FloatingWindow
          key={win.id}
          id={win.id}
          title={win.title}
          isActive={win.id === activeWindowId}
          onFocus={focusWindow}
          onClose={closeWindow}
          defaultX={80 + idx * 30}
          defaultY={60 + idx * 30}
          defaultWidth={420}
          defaultHeight={300}
        >
          {win.type === 'login' && (
            <WindowLogin
              onEmailLogin={(val) => {
                handleWindowLogin(val)
                closeWindow(win.id)
              }}
              onGithubLogin={() => {
                addLog('GitHub OAuth: not available in demo', 'error')
              }}
            />
          )}
          {win.type === 'info' && <WindowSystemInfo />}
          {win.type === 'settings' && <WindowSettings />}
          {win.type === 'files' && <WindowFiles />}
          {win.type === 'processes' && <WindowProcesses />}
        </FloatingWindow>
      ))}
    </div>
  )
}

// ====== 窗口内容组件 ======

function WindowLogin({
  onEmailLogin,
  onGithubLogin,
}: {
  onEmailLogin: (email: string) => void
  onGithubLogin: () => void
}) {
  const [val, setVal] = useState('')

  return (
    <div className="p-4 h-full flex flex-col gap-4 justify-center">
      <div className="text-center">
        <div className="font-mono text-xs text-[#569cd6] mb-1">AUTHENTICATION REQUIRED</div>
        <div className="font-mono text-[10px] text-[#888]">
          Sign in to access CatStack Terminal
        </div>
      </div>

      <div className="space-y-2">
        <label className="font-mono text-[10px] text-[#888] uppercase tracking-wider">Email</label>
        <input
          type="email"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="user@example.com"
          className="w-full bg-[#2d2d2d] border border-[#3c3c3c] text-[12px] text-[#cccccc] px-2.5 py-1.5 font-mono outline-none focus:border-[#569cd6]/50 transition-colors placeholder:text-[#808080]/50"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onEmailLogin(val)}
          disabled={!val.trim()}
          className="flex-1 bg-[#0e639c] hover:bg-[#1177bb] disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono text-[11px] py-1.5 transition-colors uppercase tracking-wider"
        >
          SEND LOGIN CODE
        </button>
        <button
          onClick={onGithubLogin}
          className="px-3 bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[#cccccc] font-mono text-[11px] border border-[#3c3c3c] transition-colors"
          title="Sign in with GitHub"
        >
          GH
        </button>
      </div>
    </div>
  )
}

function WindowSystemInfo() {
  return (
    <div className="p-4 h-full flex flex-col gap-2 font-mono text-[11px]">
      <div className="text-[#569cd6] mb-2">// SYSTEM INFORMATION</div>
      {[
        ['OS', 'CatStack OS v1.0.0'],
        ['Kernel', 'Linux 6.8.0-catstack'],
        ['Uptime', '0d 0h 12m'],
        ['CPU', '4 vCores @ 2.8GHz'],
        ['Memory', '1.2GB / 4.0GB'],
        ['Storage', '6.5GB / 20.0GB'],
        ['Network', 'eth0: 192.168.1.100/24'],
        ['Terminal', 'VT-100 / CatStack v1.0.0'],
      ].map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="text-[#dcdcaa] min-w-[80px]">{k}</span>
          <span className="text-[#cccccc]">{v}</span>
        </div>
      ))}
    </div>
  )
}

function WindowSettings() {
  return (
    <div className="p-4 h-full flex flex-col gap-3 font-mono text-[11px]">
      <div className="text-[#569cd6] mb-1">// SETTINGS</div>
      {[
        ['Terminal Font', 'Cascadia Code, 13px'],
        ['Color Theme', 'Dark+ (default)'],
        ['Cursor Style', 'Line'],
        ['Auto Save', 'Off'],
        ['Tab Size', '4'],
        ['Render Whitespace', 'None'],
      ].map(([k, v]) => (
        <div key={k} className="flex items-center justify-between border-b border-[#2d2d2d] pb-1">
          <span className="text-[#dcdcaa]">{k}</span>
          <span className="text-[#888] text-[10px]">{v}</span>
        </div>
      ))}
    </div>
  )
}

function WindowFiles() {
  const [previewFile, setPreviewFile] = useState<VfsNode | null>(null)
  const files: VfsNode[] = VFS['/home/guest'] || []

  const maxSize = Math.max(...files.filter((f) => !f.isDir).map((f) => {
    const num = parseFloat(f.size) || 0
    const unit = f.size.replace(/[\d.]/g, '') || 'B'
    return unit === 'K' ? num * 1024 : unit === 'M' ? num * 1024 * 1024 : num
  }), 1)

  const getSizeBytes = (size: string) => {
    const num = parseFloat(size) || 0
    const unit = size.replace(/[\d.]/g, '') || 'B'
    return unit === 'K' ? num * 1024 : unit === 'M' ? num * 1024 * 1024 : num
  }

  const barWidth = (size: string) => {
    return Math.max(4, (getSizeBytes(size) / maxSize) * 120)
  }

  return (
    <div className="h-full flex flex-col font-mono text-[11px]">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 px-2 py-1 bg-[#252526] border-b border-[#3c3c3c] shrink-0">
        <span className="text-[#569cd6] text-[10px]">FILE</span>
        <span className="text-[#888]">|</span>
        <span className="text-[#dcdcaa] text-[10px]">/home/guest/</span>
        <span className="flex-1" />
        <span className="text-[#888] text-[10px]">{files.length} items</span>
      </div>

      {/* 路径面包屑 */}
      <div className="flex items-center px-2 py-0.5 bg-[#1e1e1e] border-b border-[#2d2d2d] text-[10px] shrink-0">
        <span className="text-[#569cd6] cursor-pointer hover:underline">/</span>
        <span className="text-[#888] mx-0.5">▸</span>
        <span className="text-[#569cd6] cursor-pointer hover:underline">home</span>
        <span className="text-[#888] mx-0.5">▸</span>
        <span className="text-[#cccccc]">guest</span>
        {Math.random() < 0.05 && (
          <span className="ml-2 text-[#ff69b4] text-[9px] animate-pulse">🐱 ~(=^･ω･^=)</span>
        )}
      </div>

      {/* 列头 */}
      <div className="flex items-center px-2 py-0.5 bg-[#1e1e1e] border-b border-[#2d2d2d] text-[10px] text-[#888] shrink-0">
        <span className="w-5 shrink-0"></span>
        <span className="flex-1 uppercase tracking-wider">Name</span>
        <span className="w-[60px] text-right uppercase tracking-wider">Size</span>
        <span className="w-[80px] text-right uppercase tracking-wider">Bar</span>
        <span className="w-[80px] text-right uppercase tracking-wider">Date</span>
      </div>

      {/* 文件列表 */}
      <div className="flex-1 overflow-auto">
        {files.map((f) => (
          <div
            key={f.name}
            className="flex items-center px-2 py-[3px] hover:bg-[#2d2d2d] cursor-pointer transition-colors group"
            onClick={() => !f.isDir && setPreviewFile(previewFile?.name === f.name ? null : f)}
          >
            {/* 图标 */}
            <span className="w-5 shrink-0 text-center text-[12px]">
              {f.isDir ? (
                <span className="text-[#569cd6]">📁</span>
              ) : f.name.endsWith('.md') ? (
                <span>📝</span>
              ) : f.name.endsWith('.sh') ? (
                <span>⚡</span>
              ) : f.name.endsWith('.yaml') || f.name.endsWith('.yml') ? (
                <span>⚙️</span>
              ) : f.name.endsWith('.log') ? (
                <span>📋</span>
              ) : f.name.startsWith('.') ? (
                <span>🔧</span>
              ) : (
                <span>📄</span>
              )}
            </span>

            {/* 文件名 */}
            <span className={`flex-1 truncate group-hover:underline ${
              f.isDir ? 'text-[#569cd6]' : 'text-[#cccccc]'
            }`}>
              {f.name}{f.isDir ? '/' : ''}
            </span>

            {/* 大小 */}
            <span className="w-[60px] text-right text-[#888]">{f.size}</span>

            {/* 大小进度条 */}
            <span className="w-[80px] text-right shrink-0">
              {!f.isDir && (
                <span className="inline-block bg-[#264f78] h-2 rounded-sm" style={{ width: `${barWidth(f.size)}px` }} />
              )}
              {f.isDir && <span className="text-[#888]">{"<DIR>"}</span>}
            </span>

            {/* 日期 */}
            <span className="w-[80px] text-right text-[#888] text-[10px]">{f.date}</span>
          </div>
        ))}
      </div>

      {/* 预览面板 */}
      {previewFile && (
        <div className="shrink-0 border-t border-[#3c3c3c] bg-[#252526] p-2 max-h-[120px] overflow-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#569cd6] text-[10px]">📄 PREVIEW</span>
            <span className="text-[#dcdcaa] text-[10px]">{previewFile.name}</span>
            <span className="flex-1" />
            <button
              onClick={() => setPreviewFile(null)}
              className="text-[#888] hover:text-[#f44747] text-[10px]"
            >
              ✕
            </button>
          </div>
          <div className="font-mono text-[10px] text-[#cccccc] whitespace-pre-wrap opacity-80">
            {previewFile.content || '(empty)'}
          </div>
        </div>
      )}

      {/* 彩蛋：底部状态条随机信息 */}
      <div className="shrink-0 bg-[#007acc] h-[18px] flex items-center px-2">
        <span className="text-[9px] text-white/60 font-mono">
          {[
            '一切正常 | All systems nominal',
            '肚子饿了喵 ~',
            `uptime: ${Math.floor(Math.random() * 999)}d`,
            '🔒 RLS active',
            '📡 Realtime connected',
            '🧶 chasing yarn balls...',
          ][Math.floor(Math.random() * 6)]}
        </span>
      </div>
    </div>
  )
}

function WindowProcesses() {
  const procs = [
    { pid: 1, name: 'init', cpu: '0.0', mem: '0.1%' },
    { pid: 42, name: 'catstack-daemon', cpu: '0.2', mem: '1.2%' },
    { pid: 87, name: 'terminal', cpu: '0.5', mem: '2.4%' },
    { pid: 123, name: 'sshd', cpu: '0.0', mem: '0.3%' },
    { pid: 145, name: 'bash', cpu: '0.0', mem: '0.5%' },
  ]

  return (
    <div className="p-2 h-full flex flex-col font-mono text-[11px]">
      <div className="text-[#569cd6] px-2 py-1 border-b border-[#2d2d2d] mb-1">// PROCESSES</div>
      <div className="flex items-center px-2 py-0.5 text-[10px] text-[#888] border-b border-[#2d2d2d]">
        <span className="w-[40px]">PID</span>
        <span className="flex-1">NAME</span>
        <span className="w-[40px] text-right">CPU%</span>
        <span className="w-[50px] text-right">MEM%</span>
      </div>
      {procs.map((p) => (
        <div key={p.pid} className="flex items-center px-2 py-0.5 hover:bg-[#2d2d2d]">
          <span className="w-[40px] text-[#dcdcaa]">{p.pid}</span>
          <span className="flex-1 text-[#cccccc]">{p.name}</span>
          <span className="w-[40px] text-right text-[#98c379]">{p.cpu}</span>
          <span className="w-[50px] text-right text-[#98c379]">{p.mem}</span>
        </div>
      ))}
    </div>
  )
}