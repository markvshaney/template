import { useState } from "react";

// Intentional ESLint errors:
// - Unused variable
// - Missing type annotation
// - Incorrect spacing
// - Missing semicolon
const testFunction = (param: number) => {
    const unusedVar = "test";
    return param + 1;
};

// Intentional Prettier formatting issues:
const badlyFormattedObject = {
    prop1: "value1",
    prop2:    "value2",
    prop3:     "value3"
};

// Intentional TypeScript errors:
const untypedFunction = (param: string) => {
    return param.length;
};

// Intentional React Hook errors:
const TestComponent = () => {
    const [state, setState] = useState("test");
    if (state === "test") {
        setState("new value");
    }
    return <div>{state}</div>;
}; 