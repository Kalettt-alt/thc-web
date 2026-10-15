from pathlib import Path
import colorsys
import re

root = Path(r'C:\THC\src\pages\THCFantasy')
hex_pattern = re.compile(r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{4}\b|#[0-9a-fA-F]{3}\b')

def rgb(token):
    value = token[1:]
    if len(value) in (3, 4):
        value = ''.join(char * 2 for char in value)
    return tuple(int(value[index:index+2],16) for index in (0,2,4)), value[6:]

def orange(token):
    values, _ = rgb(token)
    hue, light, saturation = colorsys.rgb_to_hls(*(number/255 for number in values))
    return 12 <= hue*360 <= 45 and saturation >= .40 and light < .78

def neutral(token, prop, bright_surface=False):
    values, alpha = rgb(token)
    if orange(token): return token
    level = round(sum(values)/3)
    if prop in ('background','background-color') and level > 72:
        level = 26 if level > 175 else 35 if level > 115 else 43
    elif prop == 'color' and not bright_surface and level < 135:
        level = 190 if level < 80 else 166
    if bright_surface and prop == 'color' and level < 100:
        level = 17
    return '#' + f'{level:02x}'*3 + alpha

def rule(match):
    selector, body = match.groups()
    backgrounds = re.findall(r'background(?:-color)?\s*:\s*([^;{}]+)', body)
    bright = any('var(--df-orange)' in value or any(orange(token) and sum(rgb(token)[0])/3 > 90 for token in hex_pattern.findall(value)) for value in backgrounds)
    def declaration(item):
        prop, value = item.groups()
        if prop in ('--result-ink','--coach-ink','--df-cream'): return prop+':#d6d6d6'
        value = hex_pattern.sub(lambda color: neutral(color.group(), prop, bright), value)
        if prop in ('color','background','background-color'):
            value = re.sub(r'\bwhite\b', '#d6d6d6' if prop == 'color' else '#242424', value)
        return prop+':'+value
    return selector+'{'+re.sub(r'([\w-]+)\s*:\s*([^;{}]+)', declaration, body)+'}'

for filename in ['FantasyEntry.css','PartidoDF.css','MatchCoachPanel.css','MatchResultCard.css']:
    path = root/filename
    content = re.sub(r'([^{}]*)\{([^{}]*)\}',rule,path.read_text(encoding='utf-8'))
    if filename == 'FantasyEntry.css':
        content = content.replace('--df-cream','--df-text').replace('background:var(--df-text)','background:#222222')
        content = re.sub(r'^\.df-film-actions\{[^\n]*\}\n|^\.df-film-footer \.df-motion-toggle\{[^\n]*\}\n|^@media\(max-width:600px\)\{\.df-film-actions[^\n]*\}\n', '', content, flags=re.M)
    path.write_text(content,encoding='utf-8')

svg_map = {
    '#0b1810':'#0b0b0b', '#1b3d2b':'#222222', '#d9e5d8':'#ce773e',
    '#fff4de':'#ff9b54', '#bcbab2':'#686868', '#fff':'#aaaaaa',
    '#e4ede8':'#969696', '#244b37':'#2b2b2b', '#143324':'#181818',
    '#fff4d5':'#f47a20', '#121b18':'#131313', '#343e35':'#3d3d3d',
    '#070f0b':'#0a0a0a', '#ffffff':'#f47a20', '#e2f5df':'#ce773e',
    '#080e0aaa':'#090909aa', '#bac6bf':'#808080', '#d9ded7':'#b6b6b6',
    '#142a20':'#222222', '#a2b5a7':'#c7773d', '#90a499':'#787878', '#d2dfda':'#bababa'
}
for filename in ['CanchaDF.jsx','MatchMinimap.jsx']:
    path = root/filename
    text = hex_pattern.sub(lambda match:svg_map.get(match.group(),match.group()),path.read_text(encoding='utf-8'))
    text = text.replace('stroke="white"','stroke="#ce773e"').replace('fill="white"','fill="#ff9b54"')
    path.write_text(text,encoding='utf-8')
print('Paleta DT actualizada en 4 hojas CSS y 2 componentes SVG.')
