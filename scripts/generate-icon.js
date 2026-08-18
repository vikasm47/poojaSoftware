import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pngToIco from 'png-to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pngPath = path.join(__dirname, '..', 'electron', 'icon.png');
const icoPath = path.join(__dirname, '..', 'electron', 'icon.ico');

const buf = await pngToIco(pngPath);
fs.writeFileSync(icoPath, buf);
console.log(`Created ${icoPath}`);
