import { firefox } from 'playwright';
import path from 'path';
import os from 'os';

export async function setupPageListeners(p, customLogger = console.log) {
  p.on('load', async () => {
    try {
      customLogger(`\n=== PAGE LOADED ===`);
      customLogger(`[URL] ${p.url()}`);
      customLogger(`[TITLE] ${await p.title()}`);
      
      // Extract visible text and links
      /* v8 ignore start */
      const data = await p.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => a.text && a.href && a.href.startsWith('http'))
          .slice(0, 15); // limit to top 15 links
          
        const text = document.body.innerText.substring(0, 5000); // limit text to 5000 chars
        return { text, links };
      });
      /* v8 ignore stop */
      
      customLogger(`[TEXT_PREVIEW]\n${data.text}\n[END_TEXT]`);
      customLogger(`[LINKS] ${JSON.stringify(data.links)}`);
      customLogger(`===================\n`);
      customLogger(`Agent: Please analyze the above content and suggest next steps to the user.`);
    } catch (e) {
      customLogger(`Error reading page: ${e.message}`);
    }
  });
}

export async function launch(targetUrl = 'about:blank', customLogger = console.log, profilePathOverride = null) {
  const profilePath = profilePathOverride || path.join(os.homedir(), '.cursor/browser-profiles/Default');
  
  customLogger('Launching Firefox...');
  const context = await firefox.launchPersistentContext(profilePath, {
    headless: process.env.CI ? true : false
  });
  
  // Listen to new pages
  context.on('page', (p) => setupPageListeners(p, customLogger));
  
  // Setup listener for the initial page
  const pages = context.pages();
  const initialPage = pages.length > 0 ? pages[0] : await context.newPage();
  await setupPageListeners(initialPage, customLogger);

  await initialPage.goto(targetUrl);
  customLogger(`Browser launched and monitoring tabs. Please interact with the window.`);
  
  // Keep open until the user closes it manually
  context.on('close', () => {
    customLogger('Browser closed by user.');
    process.exit(0);
  });
  
  // Handle process termination gracefully
  const cleanup = async () => {
    customLogger('Received termination signal. Closing browser...');
    try {
      await context.close();
    } catch (e) {
      // Ignore close errors during shutdown
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  return context;
}

// Run if called directly
/* v8 ignore start */
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const targetUrl = process.argv[2] || 'about:blank';
  launch(targetUrl).catch(console.error);
}
/* v8 ignore stop */
