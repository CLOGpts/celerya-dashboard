module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:react/recommended', 'prettier'],
  plugins: ['react', '@typescript-eslint'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {},
};
