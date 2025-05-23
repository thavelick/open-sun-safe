#!/usr/bin/env python3
import re

def main():
    path = 'main.html'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    # Replace first inline <script>…</script> block with external script tag
    new_tag = '<script src="js/main.js"></script>'
    updated = re.sub(r'<script>.*?</script>', new_tag, content, count=1, flags=re.DOTALL)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(updated)
    print(f'Replaced inline script tag in {path}')

if __name__ == '__main__':
    main()
