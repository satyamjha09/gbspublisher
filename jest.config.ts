import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  moduleNameMapper: {
    "^@gbs/common$": "<rootDir>/libs/common/src",
    "^@gbs/database$": "<rootDir>/libs/database/src",
    "^@gbs/auth$": "<rootDir>/libs/auth/src",
    "^@gbs/storage$": "<rootDir>/libs/storage/src",
    "^@gbs/queue$": "<rootDir>/libs/queue/src"
  },
  collectCoverageFrom: ["**/*.(t|j)s"],
  coverageDirectory: "./coverage",
  testEnvironment: "node"
};

export default config;
