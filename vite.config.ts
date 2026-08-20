
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react-swc';
  import path from 'path';

  // Plugin to forward browser console logs to terminal
  const consoleLogPlugin = () => {
    return {
      name: 'console-log-forwarder',
      configureServer(server) {
        server.middlewares.use('/__console', (req, res, next) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                const { level, args } = data;
                
                // Format the message
                const formattedArgs = args.map((arg: any) => {
                  if (typeof arg === 'string') return arg;
                  try {
                    return JSON.stringify(arg, null, 2);
                  } catch {
                    return String(arg);
                  }
                });
                
                const timestamp = new Date().toLocaleTimeString();
                const prefix = `[${timestamp}] [Browser]`;
                
                // Output to terminal
                switch(level) {
                  case 'error':
                    console.error(prefix, ...formattedArgs);
                    break;
                  case 'warn':
                    console.warn(prefix, ...formattedArgs);
                    break;
                  default:
                    console.log(prefix, ...formattedArgs);
                }
              } catch (e) {
                // Ignore parse errors
              }
              res.writeHead(200, { 'Content-Type': 'text/plain' });
              res.end('OK');
            });
          } else {
            next();
          }
        });
      },
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          // Inject script to intercept console logs
          const script = `
            <script>
              (function() {
                const originalLog = console.log;
                const originalError = console.error;
                const originalWarn = console.warn;
                const originalInfo = console.info;
                const originalDebug = console.debug;
                
                function sendToTerminal(level, ...args) {
                  // Send to terminal via fetch
                  try {
                    fetch('/__console', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        level, 
                        args: args.map(arg => {
                          if (arg === null) return 'null';
                          if (arg === undefined) return 'undefined';
                          if (typeof arg === 'object') {
                            try {
                              return JSON.stringify(arg);
                            } catch {
                              return '[Object]';
                            }
                          }
                          return String(arg);
                        })
                      })
                    }).catch(() => {});
                  } catch (e) {}
                  
                  // Also call original console method
                  switch(level) {
                    case 'error': originalError.apply(console, args); break;
                    case 'warn': originalWarn.apply(console, args); break;
                    case 'info': originalInfo.apply(console, args); break;
                    case 'debug': originalDebug.apply(console, args); break;
                    default: originalLog.apply(console, args);
                  }
                }
                
                console.log = (...args) => sendToTerminal('log', ...args);
                console.error = (...args) => sendToTerminal('error', ...args);
                console.warn = (...args) => sendToTerminal('warn', ...args);
                console.info = (...args) => sendToTerminal('info', ...args);
                console.debug = (...args) => sendToTerminal('debug', ...args);
              })();
            </script>
          `;
          return html.replace('<head>', `<head>${script}`);
        }
      }
    };
  };

  export default defineConfig(({ mode }) => ({
    plugins: [react(), ...(mode === 'development' ? [consoleLogPlugin()] : [])],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        'vaul@1.1.2': 'vaul',
        'sonner@2.0.3': 'sonner',
        'recharts@2.15.2': 'recharts',
        'react-resizable-panels@2.1.7': 'react-resizable-panels',
        'react-hook-form@7.55.0': 'react-hook-form',
        'react-day-picker@8.10.1': 'react-day-picker',
        'lucide-react@0.487.0': 'lucide-react',
        'input-otp@1.4.2': 'input-otp',
        'figma:asset/f1971ba654cdd5f64a8a1c117d59b8bac1719bb4.png': path.resolve(__dirname, './src/assets/f1971ba654cdd5f64a8a1c117d59b8bac1719bb4.png'),
        'figma:asset/af8ff57797d14df91ef70730582bc16d71c05087.png': path.resolve(__dirname, './src/assets/af8ff57797d14df91ef70730582bc16d71c05087.png'),
        'figma:asset/88b68ee504f343bdee6862cbaaa850243d8833f6.png': path.resolve(__dirname, './src/assets/88b68ee504f343bdee6862cbaaa850243d8833f6.png'),
        'figma:asset/311205dacd5d3ef883094fca0b59cfebf281e1d1.png': path.resolve(__dirname, './src/assets/311205dacd5d3ef883094fca0b59cfebf281e1d1.png'),
        'embla-carousel-react@8.6.0': 'embla-carousel-react',
        'cmdk@1.1.1': 'cmdk',
        'class-variance-authority@0.7.1': 'class-variance-authority',
        '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
        '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
        '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
        '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
        '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
        '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
        '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
        '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
        '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
        '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
        '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
        '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
        '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
        '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
        '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
        '@': path.resolve(__dirname, './src'),
      },
    },
    // esbuild optimization options
    esbuild: {
      // Strip debugger in production. Keep console.error / console.warn.
      // console.log / debug / info are marked pure so leftover debug calls drop when unused.
      drop: process.env.NODE_ENV === 'production' ? ['debugger'] : [],
      pure: process.env.NODE_ENV === 'production' ? ['console.log', 'console.debug', 'console.info'] : [],
      // Legal comments (license headers) - remove in production for smaller bundles
      legalComments: 'none',
      // Minify identifiers for smaller bundle size
      minifyIdentifiers: true,
      // Minify syntax
      minifySyntax: true,
      // Minify whitespace
      minifyWhitespace: true,
      // Tree shaking - remove unused code
      treeShaking: true,
      // Target modern browsers for better optimization
      target: 'esnext',
    },
    build: {
      target: 'esnext',
      outDir: 'build',
      // Enable source maps for debugging (disable in production for smaller builds)
      sourcemap: process.env.NODE_ENV === 'development',
      // Minification options
      minify: 'esbuild', // Use esbuild for faster minification
      // Chunk size warning limit
      chunkSizeWarningLimit: 1000,
      // Rollup options for better code splitting
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-popover',
              '@radix-ui/react-tabs',
              '@radix-ui/react-accordion',
            ],
            'form-vendor': ['react-hook-form'],
            'chart-vendor': ['recharts'],
          },
          // Optimize chunk file names
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
    server: {
      port: 3000,
      open: true,
      // Backend CORS only allows https://casazero.site — proxy so localhost can call the API.
      proxy: {
        '/api': {
          target: 'https://backend.casazero.site',
          changeOrigin: true,
          secure: true,
        },
      },
    },
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'react-hook-form',
        '@radix-ui/react-dialog',
        '@radix-ui/react-popover',
        '@radix-ui/react-tabs',
      ],
    },
  }));