/**
 * Simple test file to verify that Jest setup is working correctly.
 */

describe('Jest Setup Verification', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });

  it('should support mocks', () => {
    const mockFn = jest.fn().mockReturnValue('mocked value');
    expect(mockFn()).toBe('mocked value');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
