from pathlib import Path
lines=Path('src/hooks/useTickets.ts').read_text(encoding='utf-8').splitlines()
for i in range(170, 215):
    if i < len(lines):
        print(f'{i+1:04d}: {lines[i]}')
