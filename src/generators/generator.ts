export interface GeneratedFile {
    relativePath: string;
    content: string;
}

export interface CodeGenerator<TConfig> {
    /**
     * Generate files based on the provided configuration.
     * @param config The configuration gathered from the user wizard.
     */
    generate(config: TConfig): Promise<GeneratedFile[]>;
}
