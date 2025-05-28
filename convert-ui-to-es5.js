#!/usr/bin/env node

/**
 * Convert UI HTML JavaScript to ES5
 *
 * This script automatically converts ES6+ syntax to ES5 in the ui.html file
 */

const fs = require("fs");

function convertToES5(content) {
  let converted = content;

  // Convert const/let to var
  converted = converted.replace(/\bconst\s+/g, "var ");
  converted = converted.replace(/\blet\s+/g, "var ");

  // Convert arrow functions to regular functions
  converted = converted.replace(/(\w+)\s*=>\s*{/g, "function($1) {");
  converted = converted.replace(/\(([^)]*)\)\s*=>\s*{/g, "function($1) {");
  converted = converted.replace(
    /\(([^)]*)\)\s*=>\s*([^{][^;]*);?/g,
    "function($1) { return $2; }"
  );

  // Convert template literals to string concatenation
  converted = converted.replace(
    /`([^`]*)\$\{([^}]*)\}([^`]*)`/g,
    function (match, before, variable, after) {
      var result = '"' + before + '" + ' + variable + ' + "' + after + '"';
      return result;
    }
  );

  // Convert object destructuring
  converted = converted.replace(
    /const\s*\{\s*([^}]+)\}\s*=\s*([^;]+);/g,
    function (match, props, source) {
      var assignments = props
        .split(",")
        .map(function (prop) {
          var trimmed = prop.trim();
          return "var " + trimmed + " = " + source + "." + trimmed + ";";
        })
        .join("\n        ");
      return assignments;
    }
  );

  // Convert optional chaining
  converted = converted.replace(/(\w+)\?\./g, "$1 && $1.");

  // Convert forEach to traditional for loops where possible
  converted = converted.replace(
    /(\w+)\.forEach\(\((\w+)\)\s*=>\s*{/g,
    function (match, array, item) {
      return (
        "for (var i = 0; i < " +
        array +
        ".length; i++) {\n        var " +
        item +
        " = " +
        array +
        "[i];"
      );
    }
  );

  return converted;
}

function main() {
  console.log("🔄 Converting UI HTML to ES5...");

  if (!fs.existsSync("ui.html")) {
    console.error("❌ ui.html not found");
    process.exit(1);
  }

  var content = fs.readFileSync("ui.html", "utf8");
  var converted = convertToES5(content);

  // Backup original
  fs.writeFileSync("ui-original.html", content);

  // Write converted version
  fs.writeFileSync("ui.html", converted);

  console.log("✅ Conversion complete!");
  console.log("   - Original saved as ui-original.html");
  console.log("   - Converted version saved as ui.html");
  console.log("   - Please review and test the converted code");
}

if (require.main === module) {
  main();
}
