import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build, processDirectory } from '../build.js';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('build.js', () => {
  let targetDir;
  let mockSkillsDir;

  beforeAll(() => {
    targetDir = path.join(os.tmpdir(), `cursor-skills-test-${Date.now()}`);
    mockSkillsDir = path.join(os.tmpdir(), `cursor-skills-mock-${Date.now()}`);
    
    // Run build.js with the temporary target directory directly
    build(targetDir);
  });

  afterAll(() => {
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    if (fs.existsSync(mockSkillsDir)) {
      fs.rmSync(mockSkillsDir, { recursive: true, force: true });
    }
  });

  it('should install skills and embed scripts correctly', () => {
    // Check if the expected output directory was created
    expect(fs.existsSync(targetDir)).toBe(true);

    // Check a specific file that we know has embedded scripts
    const browserNavigatorPath = path.join(targetDir, 'internal/context/browser-navigator/SKILL.md');
    expect(fs.existsSync(browserNavigatorPath)).toBe(true);

    const content = fs.readFileSync(browserNavigatorPath, 'utf8');

    // Make sure the script was embedded
    expect(content).toContain('```js');
    expect(content).toContain('export async function launch');
    
    // Check that there is no unresolved EMBED_SCRIPT_START directive with empty content
    // We expect the script tags to be present around the actual code
    expect(content).toMatch(/<!-- EMBED_SCRIPT_START: .*? -->\n```js\n.*?\n```\n<!-- EMBED_SCRIPT_END -->/s);
  });

  it('should throw an error when embedding a non-existent script', () => {
    fs.mkdirSync(mockSkillsDir, { recursive: true });
    const mockMdPath = path.join(mockSkillsDir, 'SKILL.md');
    fs.writeFileSync(mockMdPath, '<!-- EMBED_SCRIPT_START: non-existent.js --><!-- EMBED_SCRIPT_END -->');

    const tempTarget = path.join(os.tmpdir(), `cursor-skills-target-${Date.now()}`);
    fs.mkdirSync(tempTarget, { recursive: true });

    expect(() => {
      processDirectory(mockSkillsDir, tempTarget);
    }).toThrow(/Script not found:/);

    fs.rmSync(tempTarget, { recursive: true, force: true });
  });
});

