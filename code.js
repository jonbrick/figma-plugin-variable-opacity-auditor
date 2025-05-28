// Variable Opacity Auditor - ES5 Compatible Version
//
// ⚠️ ES5 COMPATIBILITY REQUIRED ⚠️
// This file must maintain ES5 compatibility for Figma plugins
// See ES5_COMPATIBILITY_GUIDE.md for detailed requirements
//
// FORBIDDEN: Template literals, arrow functions, destructuring, spread operator
// REQUIRED: function() syntax, string concatenation, explicit property access

console.log("🚀 PLUGIN STARTED - Variable Opacity Auditor");

figma.showUI(__html__, {
  width: 450,
  height: 700,
  title: "Variable Opacity Auditor",
  themeColors: true,
});

console.log("✅ UI SHOWN - Plugin window should be visible");

figma.ui.onmessage = async function (msg) {
  switch (msg.type) {
    case "get-collections":
      await handleGetCollections();
      break;
    case "audit-variables":
      await handleAuditVariables(
        msg.sourceCollectionId,
        msg.targetCollectionId
      );
      break;
    case "delete-variables":
      await handleDeleteVariables(msg.variableIds);
      break;
    case "close-plugin":
      figma.closePlugin();
      break;
    default:
      console.error("Unknown message type:", msg.type);
  }
};

async function handleGetCollections() {
  try {
    var collections = figma.variables.getLocalVariableCollections();
    var collectionsData = collections.map(function (collection) {
      return {
        id: collection.id,
        name: collection.name,
        variableCount: collection.variableIds.length,
      };
    });

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
      message: "Error getting collections: " + error.message,
    });
  }
}

async function handleAuditVariables(sourceCollectionId, targetCollectionId) {
  try {
    console.log("Starting variable audit process...");
    console.log("Source collection ID:", sourceCollectionId);
    console.log("Target collection ID:", targetCollectionId);

    // Get collections
    var collections = figma.variables.getLocalVariableCollections();
    var sourceCollection = collections.find(function (c) {
      return c.id === sourceCollectionId;
    });
    var targetCollection = collections.find(function (c) {
      return c.id === targetCollectionId;
    });

    if (!sourceCollection) {
      throw new Error("Source collection not found");
    }
    if (!targetCollection) {
      throw new Error("Target collection not found");
    }

    console.log("Source collection:", sourceCollection.name);
    console.log("Target collection:", targetCollection.name);

    // Get all variables from both collections
    var allVariables = figma.variables.getLocalVariables();

    // Filter source collection variables with opacity (underscore syntax)
    var sourceOpacityVariables = allVariables.filter(function (variable) {
      return (
        variable.variableCollectionId === sourceCollectionId &&
        hasOpacityInName(variable.name)
      );
    });

    console.log(
      "Found " +
        sourceOpacityVariables.length +
        " opacity variables in source collection"
    );

    // Get all variables from target collection
    var targetVariables = allVariables.filter(function (variable) {
      return variable.variableCollectionId === targetCollectionId;
    });

    console.log(
      "Found " + targetVariables.length + " variables in target collection"
    );

    // Check which source opacity variables are referenced in target collection
    var auditResults = analyzeVariableUsage(
      sourceOpacityVariables,
      targetVariables
    );

    figma.ui.postMessage({
      type: "audit-complete",
      success: true,
      results: {
        sourceCollection: {
          id: sourceCollection.id,
          name: sourceCollection.name,
        },
        targetCollection: {
          id: targetCollection.id,
          name: targetCollection.name,
        },
        totalOpacityVariables: sourceOpacityVariables.length,
        unusedVariables: auditResults.unused,
        usedVariables: auditResults.used,
        summary: {
          unused: auditResults.unused.length,
          used: auditResults.used.length,
          total: sourceOpacityVariables.length,
        },
      },
    });
  } catch (error) {
    console.error("Error auditing variables:", error);
    figma.ui.postMessage({
      type: "audit-complete",
      success: false,
      message: "Error auditing variables: " + error.message,
    });
  }
}

async function handleDeleteVariables(variableIds) {
  try {
    console.log("Starting variable deletion process...");
    console.log("Variables to delete:", variableIds.length);

    var deleted = [];
    var failed = [];

    for (var i = 0; i < variableIds.length; i++) {
      var variableId = variableIds[i];
      try {
        var variable = figma.variables.getVariableById(variableId);
        if (variable) {
          var variableName = variable.name;
          variable.remove();
          deleted.push({
            id: variableId,
            name: variableName,
          });
          console.log("Deleted variable:", variableName);
        } else {
          failed.push({
            id: variableId,
            error: "Variable not found",
          });
        }
      } catch (error) {
        console.error("Error deleting variable " + variableId + ":", error);
        failed.push({
          id: variableId,
          error: error.message,
        });
      }
    }

    figma.ui.postMessage({
      type: "deletion-complete",
      success: true,
      results: {
        deleted: deleted,
        failed: failed,
        summary: {
          deleted: deleted.length,
          failed: failed.length,
          total: variableIds.length,
        },
      },
    });
  } catch (error) {
    console.error("Error deleting variables:", error);
    figma.ui.postMessage({
      type: "deletion-complete",
      success: false,
      message: "Error deleting variables: " + error.message,
    });
  }
}

function hasOpacityInName(variableName) {
  // Check if variable name contains underscore syntax indicating opacity
  // Examples: color_10, background_50, primary_25, etc.
  var underscorePattern = /_\d+$/;
  return underscorePattern.test(variableName);
}

function analyzeVariableUsage(sourceOpacityVariables, targetVariables) {
  var used = [];
  var unused = [];

  console.log("Analyzing variable usage...");

  for (var i = 0; i < sourceOpacityVariables.length; i++) {
    var sourceVariable = sourceOpacityVariables[i];
    var isUsed = false;

    // Check if this source variable is referenced by any target variable
    for (var j = 0; j < targetVariables.length; j++) {
      var targetVariable = targetVariables[j];

      if (isVariableReferencedInVariable(sourceVariable, targetVariable)) {
        isUsed = true;
        break;
      }
    }

    var variableInfo = {
      id: sourceVariable.id,
      name: sourceVariable.name,
      description: sourceVariable.description || "",
      resolvedType: sourceVariable.resolvedType,
      valuesByMode: getVariableValuesByMode(sourceVariable),
    };

    if (isUsed) {
      used.push(variableInfo);
    } else {
      unused.push(variableInfo);
    }
  }

  console.log(
    "Analysis complete - Used:",
    used.length,
    "Unused:",
    unused.length
  );

  return {
    used: used,
    unused: unused,
  };
}

function isVariableReferencedInVariable(sourceVariable, targetVariable) {
  try {
    // Get all modes for the target variable
    var collection = figma.variables.getVariableCollectionById(
      targetVariable.variableCollectionId
    );
    if (!collection) return false;

    for (var i = 0; i < collection.modes.length; i++) {
      var mode = collection.modes[i];
      var value = targetVariable.valuesByMode[mode.modeId];

      if (
        value &&
        typeof value === "object" &&
        value.type === "VARIABLE_ALIAS"
      ) {
        if (value.id === sourceVariable.id) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking variable reference:", error);
    return false;
  }
}

function getVariableValuesByMode(variable) {
  var valuesByMode = {};

  try {
    var collection = figma.variables.getVariableCollectionById(
      variable.variableCollectionId
    );
    if (!collection) return valuesByMode;

    for (var i = 0; i < collection.modes.length; i++) {
      var mode = collection.modes[i];
      var value = variable.valuesByMode[mode.modeId];

      valuesByMode[mode.name] = {
        modeId: mode.modeId,
        value: formatVariableValue(value),
      };
    }
  } catch (error) {
    console.error("Error getting variable values:", error);
  }

  return valuesByMode;
}

function formatVariableValue(value) {
  if (!value) return "undefined";

  if (typeof value === "object") {
    if (value.type === "VARIABLE_ALIAS") {
      try {
        var referencedVariable = figma.variables.getVariableById(value.id);
        return (
          "→ " +
          (referencedVariable ? referencedVariable.name : "Unknown variable")
        );
      } catch (error) {
        return "→ Unknown variable";
      }
    } else if (
      value.r !== undefined &&
      value.g !== undefined &&
      value.b !== undefined
    ) {
      // Color value
      var r = Math.round(value.r * 255);
      var g = Math.round(value.g * 255);
      var b = Math.round(value.b * 255);
      var a = value.a !== undefined ? value.a : 1;

      if (a < 1) {
        return "rgba(" + r + ", " + g + ", " + b + ", " + a.toFixed(2) + ")";
      } else {
        return "rgb(" + r + ", " + g + ", " + b + ")";
      }
    }
  }

  return String(value);
}

console.log("✅ PLUGIN LOADED - Variable Opacity Auditor ready");
