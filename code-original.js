// Optimized code.js - Removed non-essential console logs
//
// ⚠️ ES5 COMPATIBILITY REQUIRED ⚠️
// This file must maintain ES5 compatibility for Figma plugins
// See ES5_COMPATIBILITY_GUIDE.md for detailed requirements
//
// FORBIDDEN: Template literals, arrow functions, destructuring, spread operator
// REQUIRED: function() syntax, string concatenation, explicit property access

console.log("🚀 PLUGIN STARTED - Figma Variable Opacity Creator");

figma.showUI(__html__, {
  width: 400,
  height: 700,
  title: "Variables with Opacity Generator",
  themeColors: true, // Removed resizable - not supported
});

console.log("✅ UI SHOWN - Plugin window should be visible");

figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case "parse-css":
      await handleCSSParsing(msg.cssContent);
      break;
    case "create-variables":
      await handleVariableCreation(
        msg.variablesToCreate,
        msg.selectedCollectionId
      );
      break;
    case "get-collections":
      await handleGetCollections();
      break;
    case "close-plugin":
      figma.closePlugin();
      break;
    default:
      console.error("Unknown message type:", msg.type);
  }
};

async function handleCSSParsing(cssContent) {
  try {
    const alphaFunctions = extractAlphaFunctions(cssContent);

    if (alphaFunctions.length === 0) {
      figma.ui.postMessage({
        type: "parsing-complete",
        success: false,
        message: "No --alpha() functions found in the CSS file.",
      });
      return;
    }

    const validationResults = await validateVariables(alphaFunctions);

    figma.ui.postMessage({
      type: "parsing-complete",
      success: true,
      results: {
        totalFound: alphaFunctions.length,
        missing: validationResults.missing,
        found: validationResults.found,
        details: validationResults.details,
      },
    });
  } catch (error) {
    console.error("Error parsing CSS:", error);
    figma.ui.postMessage({
      type: "parsing-complete",
      success: false,
      message: `Error parsing CSS: ${error.message}`,
    });
  }
}

async function handleGetCollections() {
  try {
    const collections = figma.variables.getLocalVariableCollections();
    const collectionsData = collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      variableCount: collection.variableIds.length,
    }));

    figma.ui.postMessage({
      type: "collections-loaded",
      success: true,
      collections: collectionsData,
    });
  } catch (error) {
    console.error("Error getting collections:", error);
    figma.ui.postMessage({
      type: "collections-loaded",
      success: false,
      message: `Error getting collections: ${error.message}`,
    });
  }
}

async function handleVariableCreation(variablesToCreate, selectedCollectionId) {
  try {
    console.log("Starting variable creation process...");

    // Deduplicate variables by newVariable name
    let uniqueVariables = deduplicateVariables(variablesToCreate);

    // Sort variables alphabetically to try to influence Figma's ordering
    uniqueVariables.sort((a, b) => a.newVariable.localeCompare(b.newVariable));
    console.log("Variables sorted alphabetically");

    console.log(
      `Creating ${uniqueVariables.length} unique variables (deduplicated from ${variablesToCreate.length})`
    );

    const created = [];
    const updated = [];
    const failed = [];

    const localVariables = figma.variables.getLocalVariables();
    const variableMap = new Map();
    for (const variable of localVariables) {
      variableMap.set(variable.name, variable);
    }

    let collection;
    if (selectedCollectionId && selectedCollectionId !== "new") {
      // Find the selected collection
      const collections = figma.variables.getLocalVariableCollections();
      collection = collections.find((c) => c.id === selectedCollectionId);
      if (!collection) {
        throw new Error("Selected collection not found");
      }
      console.log(`Using selected collection: ${collection.name}`);
    } else {
      // Create new collection or use first available
      if (selectedCollectionId === "new" || !selectedCollectionId) {
        console.log("Creating new variable collection...");
        collection = figma.variables.createVariableCollection("Design System");
      } else {
        // Fallback to first collection
        collection = figma.variables.getLocalVariableCollections()[0];
        if (!collection) {
          console.log("Creating new variable collection...");
          collection =
            figma.variables.createVariableCollection("Design System");
        }
      }
    }

    // Group variables by base to try better ordering
    console.log("Grouping variables by base...");
    const groupedByBase = new Map();
    for (const item of uniqueVariables) {
      const baseName = item.baseVariable;
      if (!groupedByBase.has(baseName)) {
        groupedByBase.set(baseName, []);
      }
      groupedByBase.get(baseName).push(item);
    }
    console.log(`Created ${groupedByBase.size} groups`);

    // Process each group, trying to create variables in logical order
    for (const [baseName, items] of groupedByBase) {
      console.log(`Processing group: ${baseName} (${items.length} variables)`);

      // Sort items by opacity for consistent creation order
      items.sort((a, b) => a.opacity - b.opacity);

      for (const item of items) {
        try {
          const baseVariable = variableMap.get(item.baseVariable);
          if (!baseVariable) {
            console.log(`Base variable not found: ${item.baseVariable}`);
            failed.push({
              baseVariable: item.baseVariable,
              newVariable: item.newVariable,
              opacity: item.opacity,
              cssFunction: item.cssFunction,
              error: "Base variable not found",
            });
            continue;
          }

          const baseColor = getVariableColorValue(baseVariable);
          if (!baseColor) {
            console.log(`Could not get color value for: ${item.baseVariable}`);
            failed.push({
              baseVariable: item.baseVariable,
              newVariable: item.newVariable,
              opacity: item.opacity,
              cssFunction: item.cssFunction,
              error: "Could not get base color value",
            });
            continue;
          }

          const newColor = applyOpacityToColor(baseColor, item.opacity);

          let newVariable = variableMap.get(item.newVariable);
          let wasUpdated = false;

          if (newVariable) {
            console.log(`Updating existing variable: ${item.newVariable}`);
            wasUpdated = true;
          } else {
            console.log(`Creating new variable: ${item.newVariable}`);
            // Try to create variable with better positioning
            newVariable = figma.variables.createVariable(
              item.newVariable,
              collection,
              "COLOR"
            );

            // Update our map immediately for subsequent checks
            variableMap.set(item.newVariable, newVariable);
          }

          newVariable.setValueForMode(collection.defaultModeId, newColor);

          const resultItem = {
            baseVariable: item.baseVariable,
            newVariable: item.newVariable,
            opacity: item.opacity,
            cssFunction: item.cssFunction,
            finalColor: rgbToHex(newColor.r, newColor.g, newColor.b),
            duplicateCount: item.duplicateCount || 1,
          };

          if (wasUpdated) {
            updated.push(resultItem);
          } else {
            created.push(resultItem);
          }
        } catch (error) {
          console.error(`Error creating variable ${item.newVariable}:`, error);
          failed.push({
            baseVariable: item.baseVariable,
            newVariable: item.newVariable,
            opacity: item.opacity,
            cssFunction: item.cssFunction,
            error: error.message,
          });
        }
      }
    }

    // Sort results alphabetically too
    console.log("Sorting results alphabetically...");
    created.sort((a, b) => a.newVariable.localeCompare(b.newVariable));
    updated.sort((a, b) => a.newVariable.localeCompare(b.newVariable));

    console.log(
      `Summary: Created: ${created.length}, Updated: ${updated.length}, Failed: ${failed.length}`
    );

    figma.ui.postMessage({
      type: "creation-complete",
      success: true,
      results: {
        created,
        updated,
        failed,
        summary: {
          created: created.length,
          updated: updated.length,
          failed: failed.length,
          total: uniqueVariables.length,
          originalTotal: variablesToCreate.length,
        },
      },
    });
  } catch (error) {
    console.error("Error in variable creation:", error);
    figma.ui.postMessage({
      type: "creation-complete",
      success: false,
      message: `Error creating variables: ${error.message}`,
    });
  }
}

function deduplicateVariables(variables) {
  const uniqueMap = new Map();

  for (const variable of variables) {
    const key = variable.newVariable;

    if (uniqueMap.has(key)) {
      // If duplicate found, increment count but keep first instance
      const existing = uniqueMap.get(key);
      existing.duplicateCount = (existing.duplicateCount || 1) + 1;
    } else {
      // First occurrence of this variable - manually copy properties
      uniqueMap.set(key, {
        baseVariable: variable.baseVariable,
        newVariable: variable.newVariable,
        opacity: variable.opacity,
        baseColor: variable.baseColor,
        cssFunction: variable.cssFunction,
        targetExists: variable.targetExists,
        duplicateCount: 1,
      });
    }
  }

  return Array.from(uniqueMap.values());
}

function extractAlphaFunctions(cssContent) {
  const alphaFunctions = [];
  const alphaRegex = /--alpha\(\s*var\(\s*(--[\w-]+)\s*\)\s*\/\s*(\d+)%\s*\)/g;

  let match;
  while ((match = alphaRegex.exec(cssContent)) !== null) {
    const [fullMatch, variableName, opacity] = match;
    alphaFunctions.push({
      original: fullMatch,
      variable: variableName,
      opacity: parseInt(opacity),
      cssVariable: variableName,
      figmaVariable: convertToFigmaVariableName(variableName),
    });
  }

  return alphaFunctions;
}

function convertToFigmaVariableName(cssVariableName) {
  return cssVariableName.substring(2).replace(/-/g, "/");
}

async function validateVariables(alphaFunctions) {
  const missing = [];
  const found = [];
  const details = [];

  const localVariables = figma.variables.getLocalVariables();
  const variableMap = new Map();
  for (const variable of localVariables) {
    variableMap.set(variable.name, variable);
  }

  // Track duplicates during validation
  const processedVariables = new Map();

  for (let i = 0; i < alphaFunctions.length; i++) {
    const alphaFunc = alphaFunctions[i];
    const baseVariableName = alphaFunc.figmaVariable;
    const newVariableName = `${baseVariableName}_${alphaFunc.opacity}`;

    // Check if we've already processed this exact variable
    if (processedVariables.has(newVariableName)) {
      // Skip duplicate, but we could track count here if needed
      continue;
    }
    processedVariables.set(newVariableName, true);

    if (variableMap.has(baseVariableName)) {
      const baseVariable = variableMap.get(baseVariableName);
      const colorValue = getVariableValue(baseVariable);
      const targetExists = variableMap.has(newVariableName);

      found.push({
        baseVariable: baseVariableName,
        newVariable: newVariableName,
        opacity: alphaFunc.opacity,
        baseColor: colorValue,
        cssFunction: alphaFunc.original,
        targetExists: targetExists,
      });

      details.push({
        status: "found",
        baseVariable: baseVariableName,
        newVariable: newVariableName,
        opacity: alphaFunc.opacity,
        message: `Base variable exists with color ${colorValue}`,
      });
    } else {
      missing.push({
        baseVariable: baseVariableName,
        newVariable: newVariableName,
        opacity: alphaFunc.opacity,
        cssFunction: alphaFunc.original,
      });

      details.push({
        status: "missing",
        baseVariable: baseVariableName,
        newVariable: newVariableName,
        opacity: alphaFunc.opacity,
        message: `Base variable "${baseVariableName}" not found in Figma`,
      });
    }
  }

  // Sort arrays alphabetically by newVariable name
  found.sort((a, b) => a.newVariable.localeCompare(b.newVariable));
  missing.sort((a, b) => a.newVariable.localeCompare(b.newVariable));
  details.sort((a, b) => a.newVariable.localeCompare(b.newVariable));

  return { missing, found, details };
}

function getVariableValue(variable) {
  try {
    const defaultCollection = figma.variables.getVariableCollectionById(
      variable.variableCollectionId
    );
    const defaultModeId = defaultCollection && defaultCollection.defaultModeId;

    if (defaultModeId && variable.valuesByMode[defaultModeId]) {
      const value = variable.valuesByMode[defaultModeId];

      if (
        variable.resolvedType === "COLOR" &&
        typeof value === "object" &&
        value.r !== undefined
      ) {
        return rgbToHex(value.r, value.g, value.b);
      }

      return value;
    }

    return "Unknown";
  } catch (error) {
    console.error(`Error getting variable value for ${variable.name}:`, error);
    return "Error";
  }
}

function getVariableColorValue(variable) {
  try {
    const defaultCollection = figma.variables.getVariableCollectionById(
      variable.variableCollectionId
    );
    const defaultModeId = defaultCollection && defaultCollection.defaultModeId;

    if (defaultModeId && variable.valuesByMode[defaultModeId]) {
      const value = variable.valuesByMode[defaultModeId];

      if (
        variable.resolvedType === "COLOR" &&
        typeof value === "object" &&
        value.r !== undefined
      ) {
        return value;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error getting color value for ${variable.name}:`, error);
    return null;
  }
}

function applyOpacityToColor(color, opacityPercent) {
  return {
    r: color.r,
    g: color.g,
    b: color.b,
    a: opacityPercent / 100,
  };
}

function rgbToHex(r, g, b) {
  const toHex = (component) => {
    const hex = Math.round(component * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}
