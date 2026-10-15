// Copies the web app (../tutoring-hub) into www/ for Capacitor.
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', '..', 'tutoring-hub'), dst = path.join(__dirname, '..', 'www');
fs.rmSync(dst, { recursive: true, force: true });
fs.cpSync(src, dst, { recursive: true, filter: p => !/README\.md$|splash-2732\.png$|icon-1024\.png$/.test(p) });
console.log('Copied web app to', dst);
