# HDL Helper <img src="images/icon.png" height="40" align="top"/>

**The Ultimate Efficiency Tool for FPGA & IC Engineers.**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://marketplace.visualstudio.com/)
[![Installs](https://img.shields.io/badge/installs-0-green.svg)](https://marketplace.visualstudio.com/)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

**HDL Helper** supercharges your VS Code for Verilog and SystemVerilog development. It combines the power of **Vivado** and **Verible** to provide industrial-strength linting, while offering a suite of automation tools to eliminate repetitive coding tasks.

---

## ✨ Key Features

### 🚀 Automation Tools (The "Magic" Shortcuts)

Stop writing boilerplate code manually!

* **⚡ Auto Testbench Generation (`Ctrl + Alt + T`)**
    * Instantly parses the current module.
    * Generates a professional SystemVerilog Testbench template.
    * **Includes**: Clock generation, Reset logic, Signal declarations, Instantiation, and a safety Watchdog.

* **🧩 Smart Instantiation (`Ctrl + Alt + I`)**
    * Parses the opened module and copies a **perfectly aligned** instantiation code block to your clipboard.
    * Automatically adds `// input [width]` comments for the next step.

* **🔗 Auto Signal Declaration (`Ctrl + Alt + W`)**
    * Paste your instantiation into the top-level module.
    * Select the code block and press the shortcut.
    * The extension reads the comments and **automatically declares all necessary `logic/wire` signals** above.

### 🛡️ Dual-Engine Linting

Catch bugs before simulation.

1.  **Vivado xvlog**: Uses the Xilinx compiler to check for synthesis errors (supports `-sv` automatically).
2.  **Verible Lint**: Checks for Google's SystemVerilog style guide compliance and syntax errors.

### 🧠 Intelligent Code Analysis (LSP)

Powered by the **Verible Language Server**:

* **Go to Definition**: `Ctrl + Click` on any module or signal to jump to its source.
* **Hover Information**: View signal types and comments by hovering.
* **Document Outline**: Clear tree view of Modules, Ports, Tasks, and Functions.
* **Cross-file Navigation**: Works seamlessly across your entire project.

### 🎨 Code Formatting
* One-click formatting using standard Verilog style guidelines (via Verible Formatter).

---

## ⚙️ Requirements & Setup

To unlock the full potential, you need to configure the external tools.

### 1. Download Tools
* **Verible (Required for LSP & Format)**: Download the latest release from [GitHub](https://github.com/chipsalliance/verible/releases). Extract it to a permanent folder (e.g., `D:\tools\verible`).
* **Vivado (Optional)**: If you have Xilinx Vivado installed, locate your `xvlog` executable.

### 2. Extension Configuration
Go to **Settings** (`Ctrl + ,`) -> Search for **HDL Helper**.

| Setting ID | Description | Example (Windows) |
| :--- | :--- | :--- |
| `hdl-helper.linter.executablePath` | **Absolute path** to Vivado `xvlog` | `D:\Xilinx\Vivado\2023.2\bin\xvlog.bat` |
| `hdl-helper.linter.veriblePath` | Path to `verible-verilog-lint` | `D:\tools\verible\bin\verible-verilog-lint.exe` |
| `hdl-helper.languageServer.path` | Path to `verible-verilog-ls` | `D:\tools\verible\bin\verible-verilog-ls.exe` |

> **⚠️ Important for Windows Users:**
> Please use **Absolute Paths** (e.g., `E:\...`) for all executables to avoid environment variable issues.

---

## 📖 Quick Start Workflow

1.  Open a `.sv` file (e.g., `my_module.sv`).
2.  **Write Code**: Syntax errors will be highlighted in real-time.
3.  **Generate TB**: Press `Ctrl+Alt+T` to create `tb_my_module.sv` and start verification.
4.  **Integrate**:
    * Press `Ctrl+Alt+I` to copy the module instantiation.
    * Go to `top.sv` and Paste (`Ctrl+V`).
    * Select the pasted block and press `Ctrl+Alt+W` to declare signals automatically.

---

## ❓ FAQ

**Q: The Language Server (Intellisense) isn't working?**
A: Make sure you have configured the `hdl-helper.languageServer.path` correctly and **restarted VS Code**. The path must point to the `verible-verilog-ls` executable.

**Q: Why does Vivado linting fail?**
A: Ensure you are pointing to `xvlog.bat` (on Windows) and using the full absolute path. Relative paths or just `xvlog` might cause context issues.

---

## 📝 Release Notes

### 1.0.0
* 🎉 Initial public release.
* Added full LSP support (Jump to definition, Outline).
* Added Smart Instantiation and Auto-Wire features.

---

**Enjoy coding with HDL Helper!** If you find bugs, feel free to open an issue.