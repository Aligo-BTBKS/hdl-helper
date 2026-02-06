import { HdlModule, HdlPort } from '../project/hdlSymbol';

/**
 * 统一的代码生成工具
 */
export class CodeGenerator {
    /**
     * 生成模块例化代码模板
     * @param module 模块对象
     * @param withComments 是否在行尾添加 // input wire [31:0] 这样的注释 (V1.0 风格)
     */
    public static generateInstantiation(module: HdlModule, withComments: boolean = false): string {
        const name = module.name;
        const instanceName = `u_${name}`;
        
        // 1. 参数部分 (Parameters)
        let paramBlock = '';
        if (module.params && module.params.length > 0) {
            const maxLen = Math.max(...module.params.map(p => p.name.length), 0);
            const lines = module.params.map((p, i) => {
                const padding = ' '.repeat(maxLen - p.name.length);
                const end = i === module.params.length - 1 ? '' : ',';
                // 格式: .WIDTH ( 32 )
                return `    .${p.name}${padding} ( ${p.defaultValue} )${end}`;
            });
            paramBlock = ` #(\n${lines.join('\n')}\n)`;
        }

        // 2. 端口部分 (Ports)
        let portBlock = '';
        if (module.ports && module.ports.length > 0) {
            const maxLen = Math.max(...module.ports.map(p => p.name.length), 0);
            
            const lines = module.ports.map((p, i) => {
                const padding = ' '.repeat(maxLen - p.name.length);
                const end = i === module.ports.length - 1 ? '' : ',';
                
                let line = `    .${p.name}${padding} ( ${p.name}${padding} )${end}`;
                
                // V1.0 风格：添加注释 // input wire [7:0]
                if (withComments) {
                    // 对齐注释稍微美观一点
                    const commentPad = ' '.repeat(Math.max(0, 30 - line.length)); 
                    line += `${commentPad} // ${p.dir} ${p.type}`;
                }
                return line;
            });
            portBlock = ` (\n${lines.join('\n')}\n);`;
        } else {
            portBlock = ` ();`;
        }

        return `${name}${paramBlock} ${instanceName}${portBlock}`;
    }


/**
     * 🔥 新增：解析选中的例化代码，提取信号用于自动声明
     * 用于命令: Ctrl+Alt+W (Auto Signal Declaration)
     */
    public static parseSelectedInstantiation(text: string): HdlPort[] {
        const lines = text.split(/\r?\n/);
        const signals: HdlPort[] = [];
        const signalNames = new Set<string>();

        // 正则策略：
        // 1. 捕获括号里的信号名: \(\s*(\w+)\s*\)
        // 2. 捕获注释里的位宽: \/\/.*?(input|output|inout)\s*(?:wire|reg|logic)?\s*(.*)
        // 该正则专门匹配 CodeGenerator 生成的带注释的代码
        const lineRegex = /\(\s*(\w+)\s*\).*?\/\/.*?(input|output|inout)\s*(?:wire|reg|logic)?\s*(.*)/;

        lines.forEach(line => {
            const match = line.match(lineRegex);
            if (match) {
                const name = match[1]; 
                const dir = match[2]; // 提取方向，虽然自动声明通常用 logic/wire，但保留信息也好
                const width = match[3].trim(); // 位宽 [7:0]

                // 过滤掉常量连接 (如 .rst(1'b0)) 或空连接
                if (!name || /^\d/.test(name) || /^'/.test(name)) return;

                if (!signalNames.has(name)) {
                    signalNames.add(name);
                    // 构造 HdlPort 对象返回
                    // 注意：这里的 dir 和 type 是为了兼容 HdlPort 接口
                    signals.push({
                        name: name,
                        dir: 'wire', 
                        type: width ? `logic ${width}` : 'logic' // 默认生成 logic 类型
                    } as HdlPort);
                }
            }
        });

        return signals;
    }
}