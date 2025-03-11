module.exports = {
    env: {
        node: true,
        browser: true,
        es2021: true,
    },
    globals: {
        window: 'readonly',
        document: 'readonly',
    },
    extends: ['eslint:recommended'],
    parserOptions: {
        ecmaVersion: 2021,
    },
    rules: {
        'no-unused-vars': ['warn', { 
            'argsIgnorePattern': '^_',
            'varsIgnorePattern': '^_'
        }]
    },
};
