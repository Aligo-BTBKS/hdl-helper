import * as fs from 'fs';
import * as path from 'path';

export class FilelistParser {
    /**
     * 解析 .f 文件，返回绝对路径列表
     * @param fFilePath .f 文件的绝对路径
     */
    public static parse(fFilePath: string): string[] {
        const fileList: string[] = [];
        
        // 检查文件是否存在
        if (!fs.existsSync(fFilePath)) return [];

        const content = fs.readFileSync(fFilePath, 'utf-8');
        const lines = content.split(/\r?\n/);
        const rootDir = path.dirname(fFilePath); // 用于解析相对路径

        for (let line of lines) {
            line = line.trim();

            // 1. 过滤空行
            if (!line) continue;

            // 2. 过滤注释 (// 或 # 或 *)
            // 注意：有些 .f 用 // 注释，有些工具支持 #
            if (line.startsWith('//') || line.startsWith('#') || line.startsWith('*')) continue;

            // 3. 过滤参数 (以 + 或 - 开头)
            // 例如: +incdir+..., -v lib.v, -y dir
            // 我们目前只关注源文件，暂时忽略 include 目录和库定义
            if (line.startsWith('+') || line.startsWith('-')) {
                // TODO: 未来可以解析 +incdir+ 传递给 Verible
                continue;
            }

            // 4. 处理行内注释 (例如: "file.v // comment")
            const commentIndex = line.indexOf('//');
            if (commentIndex !== -1) {
                line = line.substring(0, commentIndex).trim();
            }

            // 5. 路径处理
            // 此时 line 应该是一个文件路径
            // 简单处理环境变量：如果包含 $ 符号，暂时跳过（V2.1 不支持复杂环境变量解析）
            if (line.includes('$')) {
                console.warn(`[Filelist] Skipped path with env var: ${line}`);
                continue;
            }

            let absPath = line;
            if (!path.isAbsolute(line)) {
                // 拼接相对路径: .f 所在目录 + 文件路径
                absPath = path.join(rootDir, line);
            }

            // 6. 验证并添加
            // 只收录存在的 .v/.sv/.vh 文件
            if (fs.existsSync(absPath)) {
                if (/\.(v|sv|vh|svh)$/i.test(absPath)) {
                    fileList.push(absPath);
                }
            }
        }

        return fileList;
    }
}