# HDL Helper <img src="images/icon.png" height="40" align="top"/>

**The Ultimate All-in-One Tool for FPGA & IC Engineers.**

**HDL Helper V2.3.5 is here!** 🚀

Stop treating VS Code like a text editor—turn it into a lightweight IDE. **HDL Helper** combines powerful project management, hierarchy visualization, and smart code generation into one seamless extension.

### 🌟 What's New in V2.3.5? (Architecture Overhaul)

We have completely redesigned the interaction between components to eliminate conflicts and provide a rock-solid experience:

* **🛡️ The "Firewall" Architecture**: We successfully separated the roles of **Linter**, **Formatter**, and **Language Server (LSP)**.
* **LSP**: Dedicated solely to Navigation (Go-to-Definition, Hover) and Auto-completion. No more annoying "ghost errors" or duplicate reporting.
* **Custom Linter**: The single source of truth for diagnostics. Fully respects your configuration (e.g., `line-length: 150`).
* **Custom Formatter**: Independent, quiet, and robust formatting engine.


* **🔓 Open Configuration**: You are no longer limited to a fixed set of rules. You can now add **ANY** Verible rule in the settings.
* **✅ Standardized Flags**: Formatter flags now use the standard VS Code array format for better usability.

---

## ✨ Key Features

### 🌳 Project Intelligence & Hierarchy

Visualize your design structure like never before!

* **Live Tree View**: See the complete instantiation hierarchy in the Side Bar.
* **Smart Navigation**: Click any module or instance in the tree to jump instantly to its definition.
* **Top Module Management**: Right-click any module to **"Set as Top"**, automatically filtering the view.

### ⚡ One-Click Code Generation

Right-click any module in the Hierarchy View (or use shortcuts) to access powerful tools:

* **📝 Copy Instantiation Template**: Automatically generates a perfectly formatted instantiation block with **Parameters** and **Ports**, ready to paste.
* **🧪 Generate Testbench**: Instantly creates a `tb_filename.sv` template with clock generation, reset logic, and DUT instantiation.
* **🔌 Auto-Declare Signals**: Select an instantiation block, press `Ctrl+Alt+W`, and watch the wires declare themselves!

### 🎨 Advanced Formatting

Powered by a hardened **Verible Formatter** integration.

* **Conflict-Free**: Formatting logic is isolated from the syntax checker to prevent blocking.
* **Fully Customizable**: Control indentation, alignment, and wrapping via VS Code Settings.
* **Array-Based Config**: Easily manage arguments like `["--indentation_spaces=4", "--column_limit=150"]`.

### 🔍 Precision Linting

Support for dual engines with a robust configuration system:

1. **Verible Lint**: Checks for style guide compliance and syntax.
* *New:* Supports adding custom rules dynamically in settings.


2. **Vivado xvlog**: (Optional) Checks for synthesis errors using the Xilinx compiler.

---

## ⚙️ Configuration Guide

To unlock the full potential, configure the external tools in **Settings** (`Ctrl + ,` -> Search `HDL Helper`).

### 1. Tool Paths (Essential)

| Setting ID | Description | Example (Windows) |
| --- | --- | --- |
| `hdl-helper.formatter.executablePath` | Path to `verible-verilog-format` | `D:\tools\verible\verible-verilog-format.exe` |
| `hdl-helper.languageServer.path` | Path to `verible-verilog-ls` | `D:\tools\verible\verible-verilog-ls.exe` |
| `hdl-helper.linter.veriblePath` | Path to `verible-verilog-lint` | `D:\tools\verible\verible-verilog-lint.exe` |

> **⚠️ Note:** Please use **Absolute Paths** for all executables. On Windows, `.exe` extension is automatically handled but recommended.

### 2. Custom Linter Rules (New in V2.3.5)

You can now enable, disable, or configure **any** Verible rule.

* **Enable**: Set value to `true`.
* **Disable**: Set value to `false`.
* **Configure**: Set value to a string (e.g., `"length:150"`).

**Example `settings.json`:**

```json
"hdl-helper.linter.rules": {
    "line-length": "length:150",         // Custom length
    "no-tabs": true,                     // Enforce no tabs
    "parameter-name-style": false,       // Disable naming check
    "always-comb": true                  // Enable specific check
}

```

### 3. Formatter Flags

Pass arguments directly to the formatter using a string array.

**Example `settings.json`:**

```json
"hdl-helper.formatter.flags": [
    "--indentation_spaces=4",
    "--column_limit=150",
    "--assignment_statement_alignment=preserve" 
]

```

---

## ⌨️ Shortcuts Cheat Sheet

| Shortcut | Action | Description |
| --- | --- | --- |
| **`Ctrl + Alt + T`** | Generate TB | Generate Testbench for the current file. |
| **`Ctrl + Alt + I`** | Instantatiate | Copy Instantiation template for the current module. |
| **`Ctrl + Alt + W`** | Auto Wire | Auto-declare signals for selected instance. |
| **`Shift + Alt + F`** | Format | Format document using configured rules. |

---

## ❓ FAQ

**Q: I set `line-length` to 150, but I still see errors for 100 characters?**
A: This was a known issue in older versions where the Language Server (LSP) conflicted with the Linter. **In V2.3.5, this is fixed.** We physically disable the LSP's internal checks so only your configured Linter rules apply. Please restart VS Code to ensure old processes are terminated.

**Q: How do I find the list of available Linter rules?**
A: Open the Command Palette (`Ctrl+Shift+P`) and run **`HDL Helper: List All Linter Rules`**. This will extract the help documentation from your installed Verible tool and show it in a new editor.

**Q: My Hierarchy View is empty?**
A: Make sure your files end with `.v` or `.sv`. The project scanner runs automatically. You can force a refresh by running `HDL Helper: Refresh Project Index`.

---

**Enjoy coding with HDL Helper!**
If you find bugs or have feature requests, feel free to open an issue on GitHub. Happy FPGA coding! 🎉