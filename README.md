# HDL Helper <img src="images/icon.png" height="40" align="top"/>

**The Ultimate All-in-One Tool for FPGA & IC Engineers.**

**HDL Helper V2.0 is here!** 🚀

Stop treating VS Code like a text editor—turn it into a lightweight IDE. **HDL Helper** combines powerful project management, hierarchy visualization, and smart code generation into one seamless extension. It integrates **Vivado** and **Verible** to provide industrial-strength linting, formatting, and navigation.

---

## ✨ New in V2.0: Project Intelligence

### 🌳 Module Hierarchy Explorer

Visualize your design structure like never before!

* **Live Tree View**: See the complete instantiation hierarchy in the Side Bar.
* **Smart Navigation**: Click any module or instance in the tree to jump instantly to its definition.
* **Top Module Management**: Right-click any module to **"Set as Top"**, filtering the view to show only relevant logic.
* **Infinite Recursion**: Drill down from the top level all the way to leaf cells.

### ⚡ One-Click Code Generation (Context Menu)

Right-click any module in the Hierarchy View to access powerful tools:

* **📝 Copy Instantiation Template**: Automatically generates a perfectly formatted instantiation block, complete with **Parameters** (`#()`) and **Ports**, ready to paste.
* **🧪 Generate Testbench**: Instantly creates a `tb_filename.sv` with clock generation, reset logic, and DUT instantiation.

### 🔍 Enhanced Navigation & Hover

* **Global Go-to-Definition**: `Ctrl + Click` on any module name (even across different files) to jump to its source.
* **Rich Hover Info**: Mouse over any module instantiation to see a popup with its **Parameters** (and default values) and **Port List** (categorized by Input/Output).

---

## 🚀 Key Features

### 🛠️ Automation Shortcuts

* **`Ctrl + Alt + T`**: Generate Testbench for the current file.
* **`Ctrl + Alt + I`**: Copy Instantiation template for the current file.
* **`Ctrl + Alt + W`**: Auto-declare signals (Select an instantiation block -> Press shortcut -> Signals appear!).

### 🎨 Advanced Formatting

* Powered by **Verible Formatter**.
* **Fully Customizable**: Control indentation, alignment, and wrapping via VS Code Settings.
* **Argument Support**: Pass any custom flag (e.g., `--assignment_statement_alignment=preserve`) directly to the formatter.

### 🛡️ Dual-Engine Linting

1. **Vivado xvlog**: Checks for synthesis errors using the Xilinx compiler.
2. **Verible Lint**: Enforces Google's SystemVerilog style guide and checks syntax.

---

## ⚙️ Requirements & Setup

To unlock the full potential, you need to configure the external tools.

### 1. Download Tools

* **Verible (Required)**: Download from [GitHub Releases](https://github.com/chipsalliance/verible/releases). Extract to a permanent path (e.g., `D:\tools\verible`).
* **Vivado (Optional)**: Required only if you want synthesis-check linting.

### 2. Extension Configuration

Go to **Settings** (`Ctrl + ,`) -> Search for **HDL Helper**.

| Setting ID | Description | Example (Windows) |
| --- | --- | --- |
| `hdl-helper.formatter.executablePath` | Path to `verible-verilog-format` | `D:\tools\verible\bin\verible-verilog-format.exe` |
| `hdl-helper.languageServer.path` | Path to `verible-verilog-ls` | `D:\tools\verible\bin\verible-verilog-ls.exe` |
| `hdl-helper.linter.executablePath` | Path to Vivado `xvlog` | `D:\Xilinx\Vivado\2023.2\bin\xvlog.bat` |
| `hdl-helper.formatter.flags` | Custom formatting rules | `["--indentation_spaces=4", "--assignment_statement_alignment=preserve"]` |

> **⚠️ Note:** Please use **Absolute Paths** for all executables.

---

## 📖 Quick Start Workflow

1. **Open Folder**: Open your FPGA project folder in VS Code.
2. **Scan**: The extension automatically scans all `.v/.sv` files in the background.
3. **Explore**: Open the **"HDL Explorer"** in the Side Bar.
4. **Set Top**: Right-click your top-level module -> **"Set as Top Module"**.
5. **Code**:
* Need to instantiate a sub-module? Find it in the tree -> Right Click -> **"Copy Instantiation"**.
* Need a TB? Right Click -> **"Generate Testbench"**.


6. **Format**: Press `Shift + Alt + F` to beautify your code.

---

## ❓ FAQ

**Q: My Hierarchy View is empty?**
A: Make sure your files end with `.v` or `.sv`. The project scanner runs automatically on startup. You can also run the command `HDL Helper: Refresh Project Index`.

**Q: How do I change the formatter style (e.g., indent size)?**
A: Go to Settings -> `HDL Helper > Formatter: Flags`. You can add items like `--indentation_spaces=4`. Hover over the setting title to see a cheat sheet of available flags.

---

**Enjoy coding with HDL Helper!** If you find bugs, feel free to open an issue.