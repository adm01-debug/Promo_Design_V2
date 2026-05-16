import re

path = 'src/features/mockup/pages/MockupEditor.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Match the broken block loosely
pattern = r'\{logoPreview && showLogo && \(\s+<div className=\{\} style=\{\{ left: currentPlacement\.x, top: currentPlacement\.y, width:  \}\}.*?</div>\s+\)\}'

replacement = '''{logoPreview && showLogo && (
                  <div className={`absolute cursor-move ${isDragging ? "opacity-80" : ""}`} style={{ left: currentPlacement.x, top: currentPlacement.y, width: `${currentPlacement.scale * 100}%` }} onMouseDown={handleLogoMouseDown} role="button" aria-label="Ajustar posição da logo" tabIndex={0}>
                    {isWarping ? (
                      <Skeleton className="w-full aspect-square rounded-sm bg-primary/10 animate-pulse" />
                    ) : (
                      <img src={warpedLogoUrl && surfaceType !== "flat" ? warpedLogoUrl : logoPreview} alt="Logo aplicada" className="w-full h-full object-contain pointer-events-none" draggable={false} style={{ mixBlendMode: blendMode, opacity: logoOpacity / 100, filter: shadowEnabled ? `drop-shadow(3px 3px ${Math.round(shadowIntensity / 5)}px rgba(0,0,0,${shadowIntensity / 100}))` : undefined, ...(surfaceType === "flat" ? { transform: `rotate(${currentPlacement.rotation}deg) scaleX(${currentPlacement.flipH ? -1 : 1}) scaleY(${currentPlacement.flipV ? -1 : 1})` } : {}) }} />
                    )}
                    <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-primary rounded-sm cursor-se-resize flex items-center justify-center border border-primary-foreground" role="button" aria-label="Redimensionar logo"><GripVertical className="w-2.5 h-2.5 text-primary-foreground rotate-[-45deg]" aria-hidden="true" /></div>
                    <div className="absolute inset-0 border border-primary/60 rounded-sm pointer-events-none" aria-hidden="true" />
                  </div>
                )}'''

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
