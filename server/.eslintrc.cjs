module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: [
    "standard-with-typescript"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: ["./tsconfig.json"],
  },
  plugins: ["@typescript-eslint"],
  rules: {
    // Customize rules as needed
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    "@typescript-eslint/semi": ["error", "always"],
    "@typescript-eslint/quotes": ["error", "single"],
    "@typescript-eslint/indent": ["error", 2],
    "@typescript-eslint/comma-dangle": ["error", "never"],
    "@typescript-eslint/space-before-function-paren": ["error", "never"],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/strict-boolean-expressions": "off",
    "@typescript-eslint/prefer-nullish-coalescing": "off",
  },
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.spec.ts", "**/*.test.js", "**/*.spec.js"],
      env: {
        jest: true,
      },
      rules: {
        "no-unused-expressions": "off",
        "@typescript-eslint/no-unused-expressions": "off",
      },
    },
  ],
};
