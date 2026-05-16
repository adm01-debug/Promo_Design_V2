import os

path = 'src/features/mockup/pages/MockupEditor.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    # Fix the missing state
    if i == 46: # Line 47 (0-indexed)
        new_lines.append(line)
        new_lines.append('  const [isWarping, setIsWarping] = useState(false);\n')
    # Fix the UI
    elif i == 302: # Line 303 (0-indexed)
        new_lines.append('                  <div className={`absolute cursor-move ${isDragging ? "opacity-80" : ""}`} style={{ left: currentPlacement.x, top: currentPlacement.y, width: `${currentPlacement.scale * 100}%` }} onMouseDown={handleLogoMouseDown} role="button" aria-label="Ajustar logo" tabIndex={0}>\n')
        new_lines.append('                    {isWarping ? (\n')
        new_lines.append('                      <Skeleton className="w-full aspect-square rounded-sm bg-primary/10 animate-pulse" />\n')
        new_lines.append('                    ) : (\n')
    elif i == 303: # Line 304 (0-indexed)
        new_lines.append(line)
        new_lines.append('                    )}\n')
    else:
        new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
