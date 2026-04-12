const fs = require('fs');
const path = require('path');

const routesDir = '/Users/dheerajdhiman/BOM/shoe-erp-backend/src/routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

files.forEach(f => {
    let p = path.join(routesDir, f);
    let c = fs.readFileSync(p, 'utf-8');

    // Nuke everything that requires anything from '../middleware'
    c = c.replace(/^.*require\(['"]\.\.\/middleware\/.*['"]\).*$/gm, '');

    // Now, let's fix usages
    c = c.replace(/\bauthMiddleware\b/g, 'auth');
    c = c.replace(/\brequireAdmin\b/g, "roleMiddleware('admin')");
    c = c.replace(/\brequireManagerOrAbove\b/g, "roleMiddleware('admin', 'manager')");

    const imports = "\nconst auth = require('../middleware/authMiddleware');\nconst roleMiddleware = require('../middleware/roleMiddleware');\n";
    
    // insert right below Router definition
    if (c.includes('const router = Router();')) {
       c = c.replace('const router = Router();', 'const router = Router();' + imports);
    } else if (c.includes('const router = express.Router()')) {
       c = c.replace('const router = express.Router()', 'const router = express.Router()' + imports);
    } else {
       // if we can't find it, just prepend
       c = imports + c;
    }

    // Clean up excessive empty lines
    c = c.replace(/\n{3,}/g, '\n\n');

    fs.writeFileSync(p, c);
});
console.log('Routes strictly fixed.');
