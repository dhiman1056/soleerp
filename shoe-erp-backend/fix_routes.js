const fs = require('fs');
const path = require('path');

const routesDir = '/Users/dheerajdhiman/BOM/shoe-erp-backend/src/routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

files.forEach(f => {
    let p = path.join(routesDir, f);
    let c = fs.readFileSync(p, 'utf-8');

    // Remove any existing auth/role imports safely
    c = c.replace(/const\s+\{?\s*auth.*require\(.*\);\n?/g, '');
    c = c.replace(/const\s+\{?\s*roleMiddleware.*require\(.*\);\n?/g, '');
    c = c.replace(/const\s+\{?\s*requireAdmin.*require\(.*\);\n?/g, '');
    
    // Convert authMiddleware string -> auth
    c = c.replace(/\bauthMiddleware\b/g, 'auth');
    // We dont want the string 'auth' to replace paths. Since they are removed, it's safer.
    
    // Convert role usages
    c = c.replace(/\brequireAdmin\b/g, "roleMiddleware('admin')");
    c = c.replace(/\brequireManagerOrAbove\b/g, "roleMiddleware('admin', 'manager')");

    const imports = "const auth = require('../middleware/authMiddleware');\nconst roleMiddleware = require('../middleware/roleMiddleware');\n";
    
    if (c.includes('const router = Router();')) {
       c = c.replace('const router = Router();', 'const router = Router();\n' + imports);
    } else if (c.includes('const router = express.Router()')) {
       c = c.replace('const router = express.Router()', 'const router = express.Router()\n' + imports);
    } else {
       c = imports + c;
    }

    fs.writeFileSync(p, c);
});
console.log('Routes fixed.');
