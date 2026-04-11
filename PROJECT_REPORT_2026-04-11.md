# HDL Helper 项目阶段报告（2026-04-11）

## 1. 项目定位

HDL Helper 当前定位为 VS Code 生态中的 HDL 专业开发扩展，覆盖从代码编写、静态检查、结构导航、代码生成，到仿真与波形查看的完整闭环。

## 2. 当前阶段结论

当前项目已进入“结构稳定 + 可发布”的阶段，适合进入持续迭代式演进。

关键判断依据：

- snippets 体系迁移已完成并启用新命名空间（sv/rtl/sva/sdc/xdc/sta/uvm + tpl.rtl）。
- legacy snippets 路径已脱离 active 贡献映射。
- 仿真入口已统一至 Module Hierarchy，核心链路可用。
- 封版健康检查通过（路径、前缀、JSON、双映射一致性）。

## 3. 已落地能力清单

### 3.1 语言与工程能力

- AST/工程扫描、模块层级、Top 管理。
- Definition/Reference/Rename/Hover/Completion 基础语言服务。
- 多工作区解析与同名模块场景下的稳定性增强。

### 3.2 质量与规范能力

- 多引擎 Lint（Verible/Verilator/Vivado xvlog）。
- 基础 Quick Fix。
- snippets 前缀规范化、冲突去重、批量结构化迁移。

### 3.3 生成与仿真能力

- AXI/Memory/Register/Testbench 生成链。
- hdl_tasks sources/filelist 双模式。
- 波形发现回退策略（同名优先 + 最新文件回退）。
- Windows 解码兼容（GBK 回退）。

## 4. 封版质量指标（2026-04-11）

- SEAL_CHK1_PACKAGE_LEGACY_REF_COUNT=0
- SEAL_CHK2_MISSING_CONTRIB_PATHS=0
- SEAL_CHK3_ACTIVE_PREFIX_TOTAL=270
- SEAL_CHK3_ACTIVE_PREFIX_DUP_GROUPS=0
- SEAL_CHK4_EMPTY_ACTIVE_JSON_FILES=0
- SEAL_CHK5_JSON_PARSE_ERRORS=0
- SEAL_CHK6_34_MAPPING_COUNT=2（sdc + xdc）

## 5. 发展空间（建议优先级）

### P1（近期）

- 扩展 tpl.uvm.* 模板族，与现有 tpl.rtl.* 对齐。
- 建立 snippets 自动化守门：prefix 唯一性、JSON 结构校验、抽样插入可编译性。
- 增加模板/片段手工回归执行记录模板并纳入发布门禁。

### P2（中期）

- 仿真后端扩展：Verilator/XSIM/ModelSim/Questa 统一任务抽象。
- 建立更细粒度的工程索引增量刷新与耗时观测。
- 增加跨文件语义检查（参数联动、接口协议一致性）。

### P3（长期）

- 文档流水线化：README 主入口 + 自动生成详细文档站点。
- 质量数据看板化：命令耗时、扫描稳定性、诊断命中率趋势。
- 生成器平台化：统一 schema + 插件化 emitter。

## 6. 风险与注意事项

- snippets 迁移后仍需防止新旧前缀混用回流。
- 仿真生态跨工具差异大，建议先做能力矩阵再逐步接入。
- 文档双源已合并，但仍需约束“README 为唯一主入口”的维护纪律。

## 7. 发布与归档记录

- 文档合并动作：README.md + hdl-helper-description.md（archive 化）
- 报告文件：PROJECT_REPORT_2026-04-11.md
- Git 提交哈希：fe4b9ba
- Git 推送状态：main -> origin/main（成功）
- 远端迁移记录：origin 已更新为 https://github.com/MengyuanQiu/hdl-helper.git
- 对应日志条目：log.md（Iteration 23）