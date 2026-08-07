import { describe, expect, it } from "vitest";
import { isReusableOnly, parseTriggers } from "@/lib/detect";

describe("parseTriggers", () => {
  it("reads the string form", () => {
    const yaml = "on: workflow_call\njobs:\n  build: {}\n";
    expect(parseTriggers(yaml)).toEqual(["workflow_call"]);
  });

  it("reads the array form in source order", () => {
    const yaml = "on: [push, workflow_call]\njobs:\n  build: {}\n";
    expect(parseTriggers(yaml)).toEqual(["push", "workflow_call"]);
  });

  it("reads the map form keys in source order", () => {
    const yaml = "on:\n  workflow_call:\n  push:\njobs:\n  build: {}\n";
    expect(parseTriggers(yaml)).toEqual(["workflow_call", "push"]);
  });

  it("handles a bare `on:` even when a parser yields the boolean-true key", () => {
    const yaml = "true: workflow_call\njobs:\n  build: {}\n";
    expect(parseTriggers(yaml)).toEqual(["workflow_call"]);
  });

  it("returns null for malformed YAML", () => {
    const yaml = "on: [push\n  : broken";
    expect(parseTriggers(yaml)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseTriggers("")).toBeNull();
  });

  it("returns null when there is no `on` key", () => {
    const yaml = "name: CI\njobs:\n  build: {}\n";
    expect(parseTriggers(yaml)).toBeNull();
  });

  it("returns null when `on` is null", () => {
    const yaml = "on:\njobs:\n  build: {}\n";
    expect(parseTriggers(yaml)).toBeNull();
  });

  it("returns null when `on` is an empty array", () => {
    const yaml = "on: []\njobs:\n  build: {}\n";
    expect(parseTriggers(yaml)).toBeNull();
  });
});

describe("isReusableOnly", () => {
  it("is true for a string-form workflow_call only", () => {
    const yaml = "on: workflow_call\njobs:\n  build: {}\n";
    expect(isReusableOnly(yaml)).toBe(true);
  });

  it("is true for a map-form workflow_call only", () => {
    const yaml = "on:\n  workflow_call:\njobs:\n  build: {}\n";
    expect(isReusableOnly(yaml)).toBe(true);
  });

  it("is true for a real bare `on: workflow_call` GitHub file", () => {
    const yaml =
      "name: Reusable\non: workflow_call\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n";
    expect(isReusableOnly(yaml)).toBe(true);
  });

  it("is false when workflow_call is combined with push (map form)", () => {
    const yaml = "on:\n  workflow_call:\n  push:\njobs:\n  build: {}\n";
    expect(isReusableOnly(yaml)).toBe(false);
  });

  it("is false when workflow_call is combined with push (array form)", () => {
    const yaml = "on: [push, workflow_call]\njobs:\n  build: {}\n";
    expect(isReusableOnly(yaml)).toBe(false);
  });

  it("is false for push only", () => {
    const yaml = "on: push\njobs:\n  build: {}\n";
    expect(isReusableOnly(yaml)).toBe(false);
  });

  it("is false for malformed YAML", () => {
    expect(isReusableOnly("on: [push\n  : broken")).toBe(false);
  });

  it("is false for an empty string", () => {
    expect(isReusableOnly("")).toBe(false);
  });

  it("is false when there is no `on` key", () => {
    expect(isReusableOnly("name: CI\njobs:\n  build: {}\n")).toBe(false);
  });
});
