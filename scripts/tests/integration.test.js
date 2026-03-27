import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { launch } from '../src/browser-navigator.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('Integration: browser-navigator', () => {
  const testHtmlPath = path.join(os.tmpdir(), 'cursor-skills-test.html');
  const profilePath = path.join(os.tmpdir(), 'cursor-skills-profile-' + Date.now());

  beforeAll(() => {
    // Create a mock HTML file
    fs.writeFileSync(testHtmlPath, `
      <!DOCTYPE html>
      <html>
      <head><title>Integration Test Title</title></head>
      <body>
        <h1>Hello World</h1>
        <p>This is a test paragraph.</p>
        <a href="https://example.com/test1">Test Link 1</a>
      </body>
      </html>
    `);
  });

  afterAll(() => {
    if (fs.existsSync(testHtmlPath)) {
      fs.unlinkSync(testHtmlPath);
    }
    // Note: profilePath might not easily be deleted if locked, but we can try
    try { fs.rmSync(profilePath, { recursive: true, force: true }); } catch (e) {}
  });

  it('should physically launch and capture events from a real page', async () => {
    // Use CI headless flag or force true in this test env just to be safe
    const originalCI = process.env.CI;
    process.env.CI = '1';
    
    // We mock process.exit so the script doesn't actually kill vitest when closing
    const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => {});

    let logs = [];
    const customLogger = (msg) => {
      logs.push(msg);
      // We can also console.log to see it in test output
      // console.log(msg);
    };

    const targetUrl = `file://${testHtmlPath}`;
    
    // Launch using our real implementation (no playwright mocks in this file)
    const context = await launch(targetUrl, customLogger, profilePath);
    
    // Wait for the page load event to trigger our customLogger
    // We can just poll the logs until the expected line appears
    await vi.waitFor(() => {
      if (!logs.find(l => l && l.includes('Agent: Please analyze'))) {
        throw new Error('Waiting for full page extraction');
      }
    }, { timeout: 10000, interval: 500 });
    
    console.log('RECEIVED LOGS:', logs);
    
    expect(logs).toContain('\n=== PAGE LOADED ===');
    expect(logs.some(l => l && l.includes('Integration Test Title'))).toBe(true);
    expect(logs.some(l => l && l.includes('Hello World'))).toBe(true);
    expect(logs.some(l => l && l.includes('https://example.com/test1'))).toBe(true);

    // Close the browser to clean up gracefully
    try {
      await context.close();
      // Give Playwright a moment to fully clean up zombie processes
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.log('Warning: error closing context gracefully:', err.message);
    }
    
    // Restore environment
    process.env.CI = originalCI;
    exitMock.mockRestore();
  }, 15000); // 15s timeout for integration test
});
