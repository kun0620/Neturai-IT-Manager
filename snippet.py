from pathlib import Path
lines=Path('scripts/seedProfiles.ts').read_text(encoding='utf-8').splitlines()
for i in range(100, 140):
    if i < len(lines):
        print(f'{i+1:04d}: {lines[i]}')
