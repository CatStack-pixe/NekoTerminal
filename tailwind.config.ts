import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#1e1e1e',
          elevated: '#252526',
          sidebar: '#252526',
          primary: '#569cd6',
          glow: '#569cd6',
          hover: '#75b8f5',
          text: '#cccccc',
          bright: '#e0e0e0',
          dim: '#808080',
          muted: '#6a6a6a',
          border: '#3c3c3c',
          'border-bright': '#5a5a5a',
          green: '#98c379',
          amber: '#dcdcaa',
          red: '#f44747',
          'user-bg': '#1a1a1a',
          'user-border': '#3c3c3c',
          'user-text': '#cccccc',
          'bot-bg': '#1e1e1e',
          'bot-border': '#3c3c3c',
          'bot-text': '#cccccc',
          'input-bg': '#2d2d2d',
        },
      },
      fontFamily: {
        mono: [
          '"Cascadia Code"',
          '"Fira Code"',
          '"JetBrains Mono"',
          '"Source Code Pro"',
          'Consolas',
          '"Courier New"',
          'monospace',
        ],
      },
      borderRadius: {
        terminal: '0px',
      },
      boxShadow: {
        'terminal': 'none',
        'terminal-glow': 'none',
        'terminal-button': 'none',
        'terminal-strong': 'none',
        'terminal-message': 'none',
        'terminal-sidebar': 'none',
        'terminal-drawer': 'none',
        'terminal-modal': '0 4px 12px rgba(0,0,0,0.5)',
        'terminal-green': 'none',
        'terminal-red': 'none',
      },
      animation: {
        'pulse-glow': 'pulse-glow 1.5s infinite ease-in-out',
        'fade-in': 'fadeIn 0.3s ease',
        'slide-up': 'slideUp 0.3s ease',
        'blink-cursor': 'blinkCursor 1s step-end infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%': { transform: 'scale(0.8)', opacity: '0.4' },
          '50%': { transform: 'scale(1.3)', opacity: '1' },
          '100%': { transform: 'scale(0.8)', opacity: '0.4' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        blinkCursor: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}

export default config