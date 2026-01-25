/**
 * src/parser.ts v1.1
 * 新增：支持 Parameter 解析
 */

export interface HdlPort {
    name: string;
    dir: string;
    type: string;
    width: string;
}

// 新增参数接口
export interface HdlParam {
    name: string;
    value: string;
}

export interface HdlModule {
    name: string;
    ports: HdlPort[];
    params: HdlParam[]; // 新增字段
}

export function parseModule(text: string): HdlModule | null {
    // 1. 清洗注释
    const cleanText = text
        .replace(/\/\*[\s\S]*?\*\//g, '') 
        .replace(/\/\/.*$/gm, '');

    // 2. 提取模块名
    const moduleNameRegex = /module\s+(\w+)/;
    const nameMatch = cleanText.match(moduleNameRegex);
    if (!nameMatch) return null;
    const moduleName = nameMatch[1];

    // 3. 提取 Parameters (新增逻辑)
    // 策略：先提取 #( ... ) 内部的文本，再在里面找 parameter
    const params: HdlParam[] = [];
    // 匹配 module name #( ... ) 结构
    // 这里的正则比较暴力：匹配 #( 开头，到第一个 ) 结束。
    // 注意：如果 parameter 默认值里有括号（如计算公式），这个正则会失效（那是 V2.0 AST 的事了）
    const paramBlockRegex = /#\s*\(([\s\S]*?)\)\s*\(/; 
    const paramBlockMatch = cleanText.match(paramBlockRegex);

    if (paramBlockMatch) {
        const paramText = paramBlockMatch[1];
        // 匹配：parameter type? name = value
        // 或者简单的：parameter name = value
        // 甚至 ANSI 风格里可能省略 parameter 关键字，直接写 name = value
        const paramRegex = /parameter\s+(?:\w+\s+)?(\w+)\s*=\s*([^,)]+)/g;
        
        let pMatch;
        while ((pMatch = paramRegex.exec(paramText)) !== null) {
            params.push({
                name: pMatch[1],       // 参数名
                value: pMatch[2].trim() // 默认值
            });
        }
    }

    // 4. 提取端口 (逻辑不变)
    const ports: HdlPort[] = [];
    const portRegex = /(input|output|inout)\s+(wire|reg|logic)?\s*(\[.*?\])?\s*(\w+)/g;
    let match;
    while ((match = portRegex.exec(cleanText)) !== null) {
        ports.push({
            dir: match[1],
            type: match[2] || 'wire',
            width: match[3] || '',
            name: match[4]
        });
    }

    return { name: moduleName, ports: ports, params: params };
}

// --- src/parser.ts 新增内容 ---

/**
 * 解析例化代码块，提取信号名和位宽
 * 依赖格式: .port( signal ) // dir type width
 */
export function parseInstance(text: string): HdlPort[] {
    const lines = text.split(/\r?\n/);
    const signals: HdlPort[] = [];
    const signalNames = new Set<string>(); // 用于去重

    // 正则策略：
    // 1. 捕获括号里的信号名: \(\s*(\w+)\s*\)
    // 2. 捕获注释里的位宽: \/\/.*?(input|output|inout)\s*(?:wire|reg|logic)?\s*(.*)
    const lineRegex = /\(\s*(\w+)\s*\).*?\/\/.*?(input|output|inout)\s*(?:wire|reg|logic)?\s*(.*)/;

    lines.forEach(line => {
        const match = line.match(lineRegex);
        if (match) {
            const name = match[1]; // 信号名
            // const dir = match[2]; // 方向 (暂时不用，默认都生 wire，或者是 logic)
            const width = match[3].trim(); // 位宽 (比如 [7:0] 或 [DATA_WIDTH-1:0])

            // 过滤掉常量连接 (比如 .rst(1'b0)) 或空连接
            if (!name || /^\d/.test(name)) return;

            if (!signalNames.has(name)) {
                signalNames.add(name);
                signals.push({
                    name: name,
                    dir: 'wire', // 默认声明为 wire，SystemVerilog 用户可能喜欢 logic
                    type: 'wire', 
                    width: width
                });
            }
        }
    });

    return signals;
}