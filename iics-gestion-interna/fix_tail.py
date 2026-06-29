import os

path = r'd:\Sistema oficial de Gestion ACS\components\resources\MediaManagement.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# find the table closure
table_end = text.rfind('</table>')
if table_end == -1:
    print('table not found')
    exit(1)

# search for the first </div> after table
div1_end = text.find('</div>', table_end)
# search for the first ); after that
layout_end = text.find(');', div1_end)

if div1_end == -1 or layout_end == -1:
    print('boundaries not found')
    exit(1)

# Correct end structure:
#         </div>
#       )
#     )}
#   </div>
# );

new_end = """        </div>
      )
    )}
    </div>
  );"""

head = text[:div1_end]
tail = text[layout_end + 2:] # everything after );

with open(path, 'w', encoding='utf-8') as f:
    f.write(head + new_end + tail)

print('Successfully fixed the tail of DESKTOP_LAYOUT')
