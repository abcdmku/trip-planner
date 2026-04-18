import { getPortFromUrl, resolveBackendPort, resolveFrontendPort } from '../../server/runtime-ports';

describe('runtime port resolution', () => {
  it('uses the app url port for the frontend dev server', () => {
    expect(resolveFrontendPort({ appUrl: 'http://localhost:5173/' })).toBe('5173');
    expect(getPortFromUrl('https://example.com')).toBe('443');
  });

  it('moves the backend off the frontend port during development when they collide', () => {
    expect(
      resolveBackendPort({
        nodeEnv: 'development',
        configuredPort: '5173',
        appUrl: 'http://localhost:5173/',
      }),
    ).toBe('3000');
  });

  it('keeps the configured backend port outside the development collision case', () => {
    expect(
      resolveBackendPort({
        nodeEnv: 'production',
        configuredPort: '5173',
        appUrl: 'http://localhost:5173/',
      }),
    ).toBe('5173');

    expect(
      resolveBackendPort({
        nodeEnv: 'development',
        configuredPort: '4000',
        appUrl: 'http://localhost:5173/',
      }),
    ).toBe('4000');
  });
});
