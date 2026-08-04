import assert from "node:assert/strict";
import { test } from "node:test";
import { commonJavaRoots, javaCandidates } from "../dist/main/java-resolver.js";

test("orders saved Java before PATH and common-install candidates", () => {
  const candidates = javaCandidates(
    "C:\\Chosen\\java.exe",
    "C:\\PathOne;C:\\PathTwo",
    ["C:\\Java\\jdk-21\\bin\\java.exe"],
    ";",
  );

  assert.deepEqual(candidates, [
    "C:\\Chosen\\java.exe",
    "C:\\PathOne\\java.exe",
    "C:\\PathTwo\\java.exe",
    "C:\\Java\\jdk-21\\bin\\java.exe",
  ]);
});

test("removes duplicate Java candidates without changing precedence", () => {
  const candidates = javaCandidates(
    "C:\\Java\\bin\\java.exe",
    "C:\\Java\\bin;C:\\Other",
    ["C:\\JAVA\\BIN\\java.exe"],
    ";",
  );

  assert.deepEqual(candidates, [
    "C:\\Java\\bin\\java.exe",
    "C:\\Other\\java.exe",
  ]);
});

test("builds bounded common Windows Java search roots", () => {
  assert.deepEqual(
    commonJavaRoots({ ProgramFiles: "C:\\Program Files", LOCALAPPDATA: "C:\\Users\\Me\\AppData\\Local" }),
    [
      "C:\\Program Files\\Java",
      "C:\\Program Files\\Eclipse Adoptium",
      "C:\\Program Files\\Microsoft",
      "C:\\Users\\Me\\AppData\\Local\\Programs\\Eclipse Adoptium",
    ],
  );
});
