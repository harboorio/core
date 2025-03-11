import { test, expect } from "vitest";
import { fileFinder } from "./index";

test("file finder", async () => {
    const result = await fileFinder(["tsconfig.json"], ["./"]);
    expect(result).toBeTypeOf("string");
});
