import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import React from 'react';
import { Brain } from 'lucide-react';
import { renderToString } from 'react-dom/server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Generate SVG content
const svgContent = renderToString(React.createElement(Brain, { size: 32, color: '#000000' }));

// Create favicon.svg
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);

console.log('Favicon generated successfully!');
