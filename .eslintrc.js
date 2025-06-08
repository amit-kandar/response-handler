module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    plugins: ['@typescript-eslint'],
    extends: [
      'airbnb-base',
      'plugin:@typescript-eslint/recommended',
      'prettier',
    ],
    rules: {
      'no-console': 'off',
      'import/extensions': 'off',
      'import/no-unresolved': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    },
    settings: {
      "node": {
        "extensions": [".js", ".jsx", ".ts", ".tsx"]
      }
    },
  };
  