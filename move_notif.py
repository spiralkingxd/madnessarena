import re

with open('components/admin/notifications-center.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Match the entire article containing BellRing
match = re.search(r'<article[^>]*>[\s\S]*?<BellRing[\s\S]*?</article>', text)
if match:
    article_text = match.group(0)
    text = text.replace(article_text, '')
    
    # insert point
    insert_point = text.find('<div className="grid ')
    if insert_point != -1:
        text = text[:insert_point] + article_text + '\n\n      ' + text[insert_point:]
        with open('components/admin/notifications-center.tsx', 'w', encoding='utf-8') as f:
            f.write(text)
        print('Moved Notification to the top')
    else:
        print('Did not find insert point')
else:
    print('Match not found')
