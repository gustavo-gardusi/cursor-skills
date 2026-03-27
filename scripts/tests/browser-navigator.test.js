import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupPageListeners, launch } from '../src/browser-navigator.js';
import { firefox } from 'playwright';

vi.mock('playwright', () => {
  return {
    firefox: {
      launchPersistentContext: vi.fn()
    }
  };
});

describe('browser-navigator', () => {
  let mockPage;
  let mockContext;
  let logs;

  beforeEach(() => {
    vi.clearAllMocks();
    logs = [];
    
    mockPage = {
      url: vi.fn().mockReturnValue('https://example.com'),
      title: vi.fn().mockResolvedValue('Example Title'),
      evaluate: vi.fn().mockResolvedValue({
        text: 'Example body text',
        links: [{ text: 'Link 1', href: 'https://example.com/link1' }]
      }),
      on: vi.fn(),
      goto: vi.fn().mockResolvedValue()
    };
    
    mockContext = {
      on: vi.fn(),
      pages: vi.fn().mockReturnValue([mockPage]),
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn()
    };
    
    firefox.launchPersistentContext.mockResolvedValue(mockContext);
  });

  const customLogger = (msg) => logs.push(msg);

  describe('setupPageListeners', () => {
    it('should log page content correctly on load event', async () => {
      await setupPageListeners(mockPage, customLogger);
      
      expect(mockPage.on).toHaveBeenCalledWith('load', expect.any(Function));
      
      const loadCallback = mockPage.on.mock.calls.find(call => call[0] === 'load')[1];
      await loadCallback();
      
      expect(logs).toContain('\n=== PAGE LOADED ===');
      expect(logs).toContain('[URL] https://example.com');
      expect(logs).toContain('[TITLE] Example Title');
      expect(logs.find(l => l.includes('[TEXT_PREVIEW]'))).toContain('Example body text');
      expect(logs.find(l => l.includes('[LINKS]'))).toContain('https://example.com/link1');
    });

    it('should log errors if evaluation fails', async () => {
      mockPage.title.mockRejectedValueOnce(new Error('Title extraction failed'));
      
      await setupPageListeners(mockPage, customLogger);
      const loadCallback = mockPage.on.mock.calls.find(call => call[0] === 'load')[1];
      await loadCallback();
      
      expect(logs).toContain('Error reading page: Title extraction failed');
    });
  });

  describe('launch', () => {
    it('should launch context with override path and target URL', async () => {
      const originalCI = process.env.CI;
      delete process.env.CI;
      
      // Mock process.exit
      const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => {});
      
      await launch('https://test.com', customLogger, '/tmp/mock-profile');
      
      expect(firefox.launchPersistentContext).toHaveBeenCalledWith('/tmp/mock-profile', {
        headless: false
      });
      expect(mockPage.goto).toHaveBeenCalledWith('https://test.com');
      expect(logs).toContain('Browser launched and monitoring tabs. Please interact with the window.');
      
      // Simulate close
      const closeCallback = mockContext.on.mock.calls.find(call => call[0] === 'close')[1];
      closeCallback();
      expect(logs).toContain('Browser closed by user.');
      expect(exitMock).toHaveBeenCalledWith(0);
      
      exitMock.mockRestore();
      process.env.CI = originalCI;
    });

    it('should setup initial page listener correctly when pages is empty', async () => {
      mockContext.pages.mockReturnValue([]);
      
      await launch('about:blank', customLogger, '/tmp/mock-profile');
      
      expect(mockContext.newPage).toHaveBeenCalled();
      expect(mockPage.on).toHaveBeenCalledWith('load', expect.any(Function));
    });
    it('should handle SIGINT gracefully', async () => {
      const processOnSpy = vi.spyOn(process, 'on');
      const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => {});
      
      await launch('https://test.com', customLogger, '/tmp/mock-profile');
      
      // Find the SIGINT handler
      const sigintCall = processOnSpy.mock.calls.find(call => call[0] === 'SIGINT');
      expect(sigintCall).toBeDefined();
      
      const sigintHandler = sigintCall[1];
      await sigintHandler();
      
      expect(logs).toContain('Received termination signal. Closing browser...');
      expect(mockContext.close).toHaveBeenCalled();
      expect(exitMock).toHaveBeenCalledWith(0);
      
      processOnSpy.mockRestore();
      exitMock.mockRestore();
    });

    it('should handle SIGTERM gracefully and ignore close errors', async () => {
      const processOnSpy = vi.spyOn(process, 'on');
      const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => {});
      
      mockContext.close.mockRejectedValueOnce(new Error('Close failed'));
      
      await launch('https://test.com', customLogger, '/tmp/mock-profile');
      
      const sigtermCall = processOnSpy.mock.calls.find(call => call[0] === 'SIGTERM');
      expect(sigtermCall).toBeDefined();
      
      const sigtermHandler = sigtermCall[1];
      await sigtermHandler();
      
      expect(logs).toContain('Received termination signal. Closing browser...');
      expect(mockContext.close).toHaveBeenCalled();
      expect(exitMock).toHaveBeenCalledWith(0);
      
      processOnSpy.mockRestore();
      exitMock.mockRestore();
    });
  });
});
