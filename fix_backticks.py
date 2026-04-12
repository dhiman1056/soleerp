import os
ctrl_dir = '/Users/dheerajdhiman/BOM/shoe-erp-backend/src/controllers'
for cfile in os.listdir(ctrl_dir):
    if not cfile.endswith('Controller.js'): continue
    cpath = os.path.join(ctrl_dir, cfile)
    with open(cpath, 'r') as f:
        content = f.read()
    
    # Python reads the string literally from file, so escaped backtick in JS is \` -> length 2.
    # In python string literal, that is '\\`'
    new_content = content.replace('\\`', '`')
    
    if new_content != content:
        with open(cpath, 'w') as f:
            f.write(new_content)
        print(f'Fixed backticks in {cfile}')
