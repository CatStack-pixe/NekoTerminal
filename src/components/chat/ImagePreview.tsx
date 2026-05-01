'use client'

interface ImagePreviewProps {
  src: string
  alt?: string
}

export function ImagePreview({ src, alt }: ImagePreviewProps) {
  return (
    <div className="relative inline-block border border-terminal-border overflow-hidden max-w-xs">
      {/* 低带宽预览扫描线覆盖 */}
      <div
        className="pointer-events-none"
        style={{
          position: 'relative',
          background: '#1e1e1e',
        }}
      >
        <img
          src={src}
          alt={alt || 'Image'}
          className="max-w-full h-auto block opacity-90"
          style={{
            imageRendering: 'pixelated',
            filter: 'contrast(1.05) brightness(0.95)',
          }}
        />
        {/* 终端风格扫描遮罩 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
          }}
        />
      </div>
      <div className="font-mono text-[10px] text-terminal-dim/50 px-1.5 py-0.5 border-t border-terminal-border bg-terminal-elevated">
        {'['} IMAGE ATTACHMENT {']'}
      </div>
    </div>
  )
}