import os, re

def fix_routes_and_controllers():
    base_dir = '/Users/dheerajdhiman/BOM/shoe-erp-backend/src'
    routes_dir = os.path.join(base_dir, 'routes')
    ctrl_dir = os.path.join(base_dir, 'controllers')

    for rfile in os.listdir(routes_dir):
        if not rfile.endswith('Routes.js'): continue
        rpath = os.path.join(routes_dir, rfile)
        with open(rpath, 'r') as f:
            content = f.read()

        # Clean old auth imports
        content = re.sub(r'const\s*\{?\s*auth\w*\s*\}?\s*=\s*require\([\'"]\.\./middleware/.*?[\'"]\);?', '', content)
        content = re.sub(r'const\s*\{?\s*roleMiddleware\w*\s*\}?\s*=\s*require\([\'"]\.\./middleware/.*?[\'"]\);?', '', content)
        content = re.sub(r'const\s*\{?\s*requireAdmin.*?\s*\}?\s*=\s*require\([\'"]\.\./middleware/.*?[\'"]\);?', '', content)

        # Inject standard auth and roleMiddleware imports
        imports_to_add = "const auth = require('../middleware/authMiddleware');\nconst roleMiddleware = require('../middleware/roleMiddleware');\n"
        
        if 'Router' in content and 'const router = Router();' in content:
            content = content.replace('const router = Router();', 'const router = Router();\n' + imports_to_add)
        elif 'express.Router()' in content:
            content = content.replace('const router = express.Router();', 'const router = express.Router();\n' + imports_to_add)
        else:
            content = imports_to_add + content

        # Replace authMiddleware usages with auth
        content = re.sub(r'\bauthMiddleware\b', 'auth', content)

        # Replace role middleware aliases
        content = re.sub(r'\brequireAdmin\b', "roleMiddleware('admin')", content)
        content = re.sub(r'\brequireManagerOrAbove\b', "roleMiddleware('admin', 'manager')", content)

        # Deduplicate empty lines
        content = re.sub(r'\n{3,}', '\n\n', content)

        with open(rpath, 'w') as f:
            f.write(content)

        # Ensure methods used are attached to controller
        ctrl_name = rfile.replace('Routes.js', 'Controller.js')
        ctrl_path = os.path.join(ctrl_dir, ctrl_name)
        if os.path.exists(ctrl_path):
            with open(ctrl_path, 'r') as f:
                ccontent = f.read()

            # Find all ctrl.XXX usages
            usages = re.findall(r'ctrl\.(\w+)', content)
            
            # Also find destructured usages
            destructured = re.search(r'const\s*\{([^}]+)\}\s*=\s*require\([\'"]\.\./controllers/' + rfile.replace('Routes.js', 'Controller') + r'[\'"]\)', content)
            if destructured:
                d_usages = [u.strip() for u in destructured.group(1).split(',')]
                usages.extend(d_usages)
            
            usages = list(set([u for u in usages if u]))

            if usages:
                export_match = re.search(r'module\.exports\s*=\s*\{([^}]+)\}', ccontent)
                if export_match:
                    existing_exports = [e.strip().split(':')[0] for e in export_match.group(1).split(',')]
                    new_exports = []
                    for u in usages:
                        if u not in existing_exports:
                            new_exports.append(u)
                    
                    if new_exports:
                        print(f'Adding to {ctrl_name}: {new_exports}')
                        stubs = ""
                        for n in new_exports:
                            stubs += f"\nconst {n} = async (req, res, next) => {{ res.status(501).json({{ message: 'Not Implemented' }}); }};\n"
                        
                        modified_exports = export_match.group(1).rstrip() + ',\n  ' + ',\n  '.join(new_exports)
                        ccontent = ccontent.replace(export_match.group(1), modified_exports)
                        ccontent = ccontent.replace('module.exports = {', stubs + '\nmodule.exports = {')
                
            with open(ctrl_path, 'w') as f:
                f.write(ccontent)

fix_routes_and_controllers()
print('Fix complete')
for cfile in os.listdir(ctrl_dir):
    if not cfile.endswith('Controller.js'): continue
    cpath = os.path.join(ctrl_dir, cfile)
    with open(cpath, 'r') as f:
        content = f.read()
    
    # Fix the incorrectly escaped backticks \`
    content = content.replace('\\`', '`')
    
    with open(cpath, 'w') as f:
        f.write(content)
print('Backticks fixed')
