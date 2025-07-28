export default {
  title: 'Response Handler',
  description: 'Unified response and error handler for REST APIs and Socket.IO',
  ignoreDeadLinks: true,
  cleanUrls: true,

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Guide Overview', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'Migration Guide', link: '/guide/migration' },
          ],
        },
        {
          text: 'Configuration',
          items: [
            { text: 'Basic Configuration', link: '/config/basic' },
            { text: 'Advanced Options', link: '/config/advanced' },
            { text: 'Environment Setup', link: '/config/environment' },
          ],
        },
        {
          text: 'Advanced Topics',
          items: [
            { text: 'Performance Optimization', link: '/guide/performance' },
            { text: 'Security Best Practices', link: '/guide/security' },
            { text: 'Testing Strategies', link: '/guide/testing' },
            { text: 'Troubleshooting', link: '/guide/troubleshooting' },
          ],
        },
      ],

      '/api/': [
        {
          text: 'Core API',
          items: [
            { text: 'API Overview', link: '/api/' },
            { text: 'Response Builder', link: '/api/response-builder' },
            { text: 'Logger', link: '/api/logger' },
          ],
        },
        {
          text: 'Express Integration',
          items: [
            { text: 'Express Middleware', link: '/api/express' },
            { text: 'Request Enhancement', link: '/api/express-request' },
            { text: 'Response Methods', link: '/api/express-response' },
            { text: 'Error Handling', link: '/api/express-errors' },
          ],
        },
        {
          text: 'Socket.IO Integration',
          items: [
            { text: 'Socket.IO Handler', link: '/api/socket' },
            { text: 'Event Management', link: '/api/socket-events' },
            { text: 'Room Targeting', link: '/api/socket-rooms' },
            { text: 'Middleware', link: '/api/socket-middleware' },
          ],
        },
        {
          text: 'Types & Interfaces',
          items: [
            { text: 'TypeScript Types', link: '/api/types' },
            { text: 'Configuration Interface', link: '/api/config-types' },
            { text: 'Response Interfaces', link: '/api/response-types' },
          ],
        },
      ],

      '/examples/': [
        {
          text: 'Basic Examples',
          items: [
            { text: 'Examples Overview', link: '/examples/' },
            { text: 'Express Setup', link: '/examples/express' },
            { text: 'Socket.IO Setup', link: '/examples/socket' },
          ],
        },
        {
          text: 'Use Cases',
          items: [
            { text: 'REST API Server', link: '/examples/rest-api' },
            { text: 'Real-time Chat', link: '/examples/chat-app' },
            { text: 'Microservices', link: '/examples/microservices' },
            { text: 'Authentication System', link: '/examples/auth-system' },
          ],
        },
        {
          text: 'Error Handling',
          items: [
            { text: 'Error Patterns', link: '/examples/errors' },
            { text: 'Custom Error Types', link: '/examples/custom-errors' },
            { text: 'Error Recovery', link: '/examples/error-recovery' },
          ],
        },
        {
          text: 'Configuration',
          items: [
            { text: 'Configuration Examples', link: '/examples/config' },
            { text: 'Environment-specific', link: '/examples/env-config' },
            { text: 'Production Setup', link: '/examples/production' },
          ],
        },
      ],

      '/config/': [
        {
          text: 'Configuration',
          items: [
            { text: 'Basic Configuration', link: '/config/basic' },
            { text: 'Advanced Options', link: '/config/advanced' },
            { text: 'Environment Setup', link: '/config/environment' },
          ],
        },
      ],

      '/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'Migration Guide', link: '/guide/migration' },
          ],
        },
        {
          text: 'API Reference',
          items: [
            { text: 'Express Middleware', link: '/api/express' },
            { text: 'Socket.IO Handler', link: '/api/socket' },
            { text: 'Response Builder', link: '/api/response-builder' },
            { text: 'Logger', link: '/api/logger' },
          ],
        },
        {
          text: 'Examples',
          items: [
            { text: 'Express Examples', link: '/examples/express' },
            { text: 'Socket.IO Examples', link: '/examples/socket' },
            { text: 'Error Handling', link: '/examples/errors' },
            { text: 'Configuration', link: '/examples/config' },
          ],
        },
        {
          text: 'Configuration',
          items: [
            { text: 'Basic Setup', link: '/config/basic' },
            { text: 'Advanced Options', link: '/config/advanced' },
            { text: 'Environment Config', link: '/config/environment' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/amit-kandar/response-handler' }],

    footer: {
      message: 'Released under the ISC License.',
      copyright: 'Copyright © 2025 Amit Kandar',
    },

    search: {
      provider: 'local',
    },
  },

  markdown: {
    theme: 'github-dark',
    lineNumbers: true,
  },
};
