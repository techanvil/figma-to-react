module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ["standard"],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
  },
  rules: {
    // Customize rules as needed
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    semi: ["error", "always"],
    quotes: ["error", "single"],
    indent: ["error", 2],
    "comma-dangle": ["error", "never"],
    "space-before-function-paren": ["error", "never"],
    "no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
  },
  overrides: [
    {
      files: ["**/*.test.js", "**/*.spec.js"],
      env: {
        jest: true,
      },
      rules: {
        "no-unused-expressions": "off",
      },
    },
  ],
};
