# ES5 Compatibility Guide for Figma Plugins

## ⚠️ CRITICAL: Figma Plugin JavaScript Limitations

Figma plugins run in a **restricted JavaScript environment** that does NOT support modern ES6+ features. All code must be ES5-compatible.

## 🚫 FORBIDDEN FEATURES (Will Break Plugin)

### Template Literals

```javascript
// ❌ FORBIDDEN - Will cause errors
const message = `Hello ${name}!`;
const html = `<div class="${className}">Content</div>`;

// ✅ REQUIRED - Use string concatenation
const message = "Hello " + name + "!";
const html = '<div class="' + className + '">Content</div>';
```

### Arrow Functions

```javascript
// ❌ FORBIDDEN - Will cause errors
const handler = (event) => {
  /* code */
};
array.map((item) => item.value);

// ✅ REQUIRED - Use function expressions
const handler = function (event) {
  /* code */
};
array.map(function (item) {
  return item.value;
});
```

### Destructuring Assignment

```javascript
// ❌ FORBIDDEN - Will cause errors
const { name, age } = person;
const [first, second] = array;

// ✅ REQUIRED - Use explicit property access
const name = person.name;
const age = person.age;
const first = array[0];
const second = array[1];
```

### Spread Operator

```javascript
// ❌ FORBIDDEN - Will cause errors
const newObj = { ...oldObj, newProp: value };
const newArray = [...oldArray, newItem];

// ✅ REQUIRED - Use Object.assign() and concat()
const newObj = Object.assign({}, oldObj, { newProp: value });
const newArray = oldArray.concat([newItem]);
```

### Let/Const in Some Contexts

```javascript
// ❌ POTENTIALLY PROBLEMATIC - Use with caution
let variable = value;
const CONSTANT = value;

// ✅ SAFER - Use var for broader compatibility
var variable = value;
var CONSTANT = value;
```

### Default Parameters

```javascript
// ❌ FORBIDDEN - Will cause errors
function greet(name = "World") {
  /* code */
}

// ✅ REQUIRED - Manual default handling
function greet(name) {
  name = name || "World";
  /* code */
}
```

### Object Method Shorthand

```javascript
// ❌ FORBIDDEN - Will cause errors
const obj = {
  method() {
    /* code */
  },
};

// ✅ REQUIRED - Traditional method syntax
const obj = {
  method: function () {
    /* code */
  },
};
```

### For...of Loops

```javascript
// ❌ FORBIDDEN - Will cause errors
for (const item of array) {
  /* code */
}

// ✅ REQUIRED - Traditional for loops
for (var i = 0; i < array.length; i++) {
  var item = array[i];
  /* code */
}
```

## ✅ SAFE FEATURES (ES5 Compatible)

### String Operations

```javascript
// ✅ String concatenation
var message = "Hello " + name + "!";

// ✅ String methods
var upper = text.toUpperCase();
var index = text.indexOf("search");
var substring = text.substring(0, 5);
```

### Object Operations

```javascript
// ✅ Object creation and access
var obj = { prop: "value" };
var value = obj.prop;
obj.newProp = "new value";

// ✅ Object.assign for merging
var merged = Object.assign({}, obj1, obj2);
```

### Array Operations

```javascript
// ✅ Array methods
var mapped = array.map(function (item) {
  return item.value;
});
var filtered = array.filter(function (item) {
  return item.active;
});
var found = array.find(function (item) {
  return item.id === targetId;
});

// ✅ Array manipulation
var newArray = array.concat([newItem]);
array.push(item);
array.splice(index, 1);
```

### Function Declarations

```javascript
// ✅ Function declarations
function namedFunction() {
  /* code */
}

// ✅ Function expressions
var functionVar = function () {
  /* code */
};

// ✅ Anonymous functions
element.addEventListener("click", function (event) {
  /* code */
});
```

## 🔍 PRE-COMMIT CHECKLIST

Before committing any code changes, verify:

- [ ] **No template literals** (`` ` ``) - Use string concatenation instead
- [ ] **No arrow functions** (`=>`) - Use `function()` syntax
- [ ] **No destructuring** (`{ }` or `[ ]` assignment) - Use explicit access
- [ ] **No spread operator** (`...`) - Use `Object.assign()` or `concat()`
- [ ] **No `let`/`const` in loops** - Use `var` for safety
- [ ] **No default parameters** - Handle defaults manually
- [ ] **No object method shorthand** - Use `method: function()` syntax
- [ ] **No `for...of` loops** - Use traditional `for` loops

## 🛠️ TESTING STRATEGY

### Local Testing

1. **Syntax Check**: Ensure no ES6+ syntax is used
2. **Manual Review**: Check each function for compatibility
3. **Console Verification**: Test in Figma's actual plugin environment

### Common Error Patterns

```javascript
// These will cause "Unexpected token" errors in Figma:
const items = data.map((item) => ({ ...item, processed: true }));
const { results } = await fetch(`/api/${id}`);
```

## 📝 CODE REVIEW GUIDELINES

When reviewing code changes:

1. **Search for ES6+ syntax** using these patterns:

   - `` ` `` (template literals)
   - `=>` (arrow functions)
   - `const ` or `let ` (modern declarations)
   - `...` (spread operator)
   - `{ }` in assignments (destructuring)

2. **Verify function syntax**:

   - All functions use `function` keyword
   - No shorthand object methods

3. **Check string operations**:
   - All string building uses `+` concatenation
   - No template literal interpolation

## 🚨 EMERGENCY FIXES

If the plugin breaks due to ES6+ syntax:

1. **Identify the error** in Figma's developer console
2. **Locate the problematic code** (usually shows line number)
3. **Convert to ES5 equivalent** using this guide
4. **Test immediately** in Figma environment

## 📚 REFERENCE EXAMPLES

### Message Handling (ES5)

```javascript
// ✅ Correct ES5 message handling
figma.ui.onmessage = function (msg) {
  switch (msg.type) {
    case "create-variables":
      handleVariableCreation(msg.variablesToCreate, msg.selectedCollectionId);
      break;
    default:
      console.error("Unknown message type:", msg.type);
  }
};
```

### UI Event Handling (ES5)

```javascript
// ✅ Correct ES5 event handling
elements.applyBtn.addEventListener("click", function () {
  if (currentResults && currentResults.found) {
    var selectedCollectionId =
      document.getElementById("collection-select").value;
    createVariables(currentResults.found, selectedCollectionId);
  }
});
```

### Object Creation (ES5)

```javascript
// ✅ Correct ES5 object creation
var resultItem = {
  baseVariable: item.baseVariable,
  newVariable: item.newVariable,
  opacity: item.opacity,
  cssFunction: item.cssFunction,
  finalColor: rgbToHex(newColor.r, newColor.g, newColor.b),
  duplicateCount: item.duplicateCount || 1,
};
```

---

**Remember**: When in doubt, test in Figma's actual plugin environment. The browser's console may accept ES6+ syntax that Figma's plugin environment will reject.
