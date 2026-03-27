import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const skillsDir = path.join(rootDir, 'skills');

// Regex to find: <!-- EMBED_SCRIPT_START: path/to/script.js -->...<!-- EMBED_SCRIPT_END -->
const embedRegex = /<!--\s*EMBED_SCRIPT_START:\s*([^>]+)\s*-->[\s\S]*?<!--\s*EMBED_SCRIPT_END\s*-->/g;

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function processDirectory(currentDir, targetBaseDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relativePath = path.relative(skillsDir, fullPath);
    const destPath = path.join(targetBaseDir, relativePath);

    if (entry.isDirectory()) {
      ensureDirSync(destPath);
      processDirectory(fullPath, targetBaseDir);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      content = content.replace(embedRegex, (match, scriptPath) => {
        const scriptFullPath = path.join(__dirname, scriptPath.trim());
        if (!fs.existsSync(scriptFullPath)) {
          console.error(`❌ Error: Script not found at ${scriptFullPath} (referenced in ${relativePath})`);
          throw new Error(`Script not found: ${scriptFullPath}`);
        }

        const scriptContent = fs.readFileSync(scriptFullPath, 'utf8');
        const ext = path.extname(scriptFullPath).replace('.', '');
        modified = true;
        
        console.log(`  ↪ Embedding ${scriptPath.trim()} into ${relativePath}`);
        
        return `<!-- EMBED_SCRIPT_START: ${scriptPath.trim()} -->\n\`\`\`${ext}\n${scriptContent}\n\`\`\`\n<!-- EMBED_SCRIPT_END -->`;
      });

      fs.writeFileSync(destPath, content, 'utf8');
      if (modified) {
        console.log(`✅ Processed and wrote ${relativePath}`);
      } else {
        console.log(`ℹ️  Copied ${relativePath} (no embeds)`);
      }
    } else if (entry.isFile()) {
      // Just copy non-md files directly
      fs.copyFileSync(fullPath, destPath);
      console.log(`ℹ️  Copied ${relativePath}`);
    }
  }
}

export function build(targetDir) {
  console.log('🚀 Building and installing Cursor Skills...');
  ensureDirSync(targetDir);
  processDirectory(skillsDir, targetDir);
  console.log('🎉 Installation complete! Skills deployed to', targetDir);
}

// Run if called directly
/* v8 ignore start */
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  // Use target directory from arguments, or fallback to global cursor skills folder
  const targetDir = process.argv[2] 
    ? path.resolve(process.cwd(), process.argv[2]) 
    : path.join(os.homedir(), '.cursor', 'skills-cursor');
  
  try {
    build(targetDir);
  } catch (err) {
    process.exit(1);
  }
}
/* v8 ignore stop */
