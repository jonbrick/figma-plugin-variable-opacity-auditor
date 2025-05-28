# Variable Opacity Auditor

A Figma plugin that helps you audit and clean up unused opacity variables between collections. This plugin identifies opacity variables (using underscore syntax like `color_10`, `background_50`) in a source collection that are not being referenced in a target collection, allowing you to safely remove unused variables.

## Features

- **Cross-Collection Analysis**: Compare opacity variables between two different collections
- **Underscore Syntax Detection**: Automatically identifies variables with opacity naming patterns (`variable_10`, `primary_25`, etc.)
- **Usage Detection**: Checks if source collection variables are referenced in target collection variables
- **Batch Deletion**: Select and delete multiple unused variables at once
- **Safe Auditing**: Shows both used and unused variables for complete transparency

## How It Works

1. **Select Collections**: Choose a source collection (containing opacity variables) and a target collection (to check for references)
2. **Run Audit**: The plugin analyzes all variables with underscore syntax in the source collection
3. **Review Results**: See which variables are used vs unused in the target collection
4. **Clean Up**: Select and delete unused variables to keep your design system clean

## Variable Detection

The plugin identifies opacity variables using the underscore naming pattern:

- `color_10` ✅
- `background_50` ✅
- `primary_25` ✅
- `text_75` ✅
- `regular-variable` ❌ (no underscore + number)

## Usage

1. Open the plugin in Figma
2. Select your **Source Collection** (contains opacity variables to audit)
3. Select your **Target Collection** (where references should be checked)
4. Click **Start Audit**
5. Review the results:
   - **Used Variables**: Referenced in the target collection (keep these)
   - **Unused Variables**: Not referenced in target collection (safe to delete)
6. Select unused variables you want to remove
7. Click **Delete Selected** to clean up

## Safety Features

- **Read-Only Analysis**: The audit process doesn't modify anything
- **Confirmation Dialog**: Deletion requires explicit confirmation
- **Detailed Results**: Shows exactly which variables are used/unused
- **Re-audit Capability**: Run the audit again after deletions to verify cleanup

## Technical Details

- **ES5 Compatible**: Works with Figma's plugin environment
- **Cross-Collection References**: Detects `VARIABLE_ALIAS` references between collections
- **Mode Support**: Analyzes variables across all modes in collections
- **Error Handling**: Graceful handling of missing variables or collections

## Installation

1. Download or clone this repository
2. Open Figma
3. Go to Plugins → Development → Import plugin from manifest
4. Select the `manifest.json` file from this directory
5. The plugin will appear in your Plugins menu

## Development

This plugin is built with:

- **Vanilla JavaScript (ES5)** for Figma compatibility
- **Inline CSS** for styling (required by Figma)
- **Figma Plugin API** for variable management

### File Structure

```
variable-opacity-auditor/
├── manifest.json          # Plugin configuration
├── code.js               # Main plugin logic (ES5)
├── ui.html              # Plugin interface
├── README.md            # This file
└── *.md                 # Documentation files
```

### Key Functions

- `hasOpacityInName()`: Detects underscore syntax in variable names
- `analyzeVariableUsage()`: Cross-references variables between collections
- `isVariableReferencedInVariable()`: Checks for VARIABLE_ALIAS references
- `handleDeleteVariables()`: Safely removes selected variables

## Contributing

1. Fork the repository
2. Make your changes
3. Test thoroughly with different variable setups
4. Submit a pull request

## License

MIT License - feel free to use and modify as needed.

## Support

If you encounter issues:

1. Check that both collections exist and contain variables
2. Ensure source collection has variables with underscore syntax
3. Verify you have permission to delete variables in the source collection
4. Check the browser console for detailed error messages

---

**Note**: This plugin only works with local variable collections in Figma. It cannot analyze or modify variables from external libraries.
