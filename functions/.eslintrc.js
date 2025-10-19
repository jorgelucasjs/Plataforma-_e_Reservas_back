module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*", // Ignore generated files.
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    // Regras desabilitadas para evitar warnings
    "quotes": "off", // Desabilita regra de aspas
    "no-trailing-spaces": "off", // Permite espaços no final das linhas
    "no-tabs": "off", // Permite caracteres de tab
    "comma-dangle": "off", // Não exige vírgula no final
    "eol-last": "off", // Não exige nova linha no final do arquivo
    "object-curly-spacing": "off", // Não exige espaçamento específico em objetos
    "require-jsdoc": "off", // Não exige comentários JSDoc
    "semi": "off", // Não exige ponto e vírgula
    "max-len": "off", // Remove limite de comprimento da linha
    "camelcase": "off", // Não exige convenção camelCase
    "@typescript-eslint/no-explicit-any": "off", // Permite uso de any
    "operator-linebreak": "off", // Permite quebra de linha em operadores
    "padded-blocks": "off", // Permite blocos com linhas em branco
    "linebreak-style": "off", // Permite diferentes tipos de quebra de linha (CRLF/LF)
    "no-multiple-empty-lines": "off", // Permite múltiplas linhas em branco
    "valid-jsdoc": "off", // Não exige JSDoc válido
    "@typescript-eslint/no-inferrable-types": "off", // Permite anotações de tipo triviais
    "@typescript-eslint/no-unused-vars": "off", // Permite variáveis não utilizadas
    "arrow-parens": "off", // Não exige parênteses em arrow functions
    "@typescript-eslint/ban-types": "off", // Permite tipos como Function
    "space-before-function-paren": "off", // Não exige espaço antes dos parênteses de função
    "no-useless-escape": "off", // Permite escapes desnecessários

    // Regras mantidas
    "import/no-unresolved": 0,
    "indent": "off", // Desabilita regra de indentação
  },
};
