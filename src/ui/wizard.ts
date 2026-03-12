import { QuickPickItem, window, Disposable, QuickInputButton, QuickInput, ExtensionContext, QuickInputButtons, ThemeIcon } from 'vscode';

// A simplified MultiStepWizard based on VS Code's QuickInput sample
export class MultiStepWizard {
    static async run<T>(steps: ((state: Partial<T>) => Promise<any>)[], initialState: Partial<T> = {}): Promise<T | undefined> {
        let currentStepIndex = 0;
        const state = { ...initialState };

        while (currentStepIndex >= 0 && currentStepIndex < steps.length) {
            const step = steps[currentStepIndex];
            try {
                const action = await step(state);
                if (action === 'back') {
                    currentStepIndex--;
                } else if (action === 'cancel') {
                    return undefined;
                } else {
                    currentStepIndex++;
                }
            } catch (err) {
                if (err === MultiStepWizard.InputFlowAction.back) {
                    currentStepIndex--;
                } else if (err === MultiStepWizard.InputFlowAction.cancel) {
                    return undefined;
                } else {
                    throw err;
                }
            }
        }

        return state as T;
    }

    static InputFlowAction = {
        back: new Error('back'),
        cancel: new Error('cancel')
    };

    static async showQuickPick<T extends QuickPickItem, P extends Partial<any>>({ title, step, totalSteps, items, placeholder, activeItem, shouldResume }: {
        title: string;
        step: number;
        totalSteps: number;
        items: T[];
        activeItem?: T;
        placeholder: string;
        shouldResume?: () => Thenable<boolean>;
    }): Promise<T> {
        const disposables: Disposable[] = [];
        try {
            return await new Promise<T>((resolve, reject) => {
                const input = window.createQuickPick<T>();
                input.title = title;
                input.step = step;
                input.totalSteps = totalSteps;
                input.placeholder = placeholder;
                input.items = items;
                if (activeItem) {
                    input.activeItems = [activeItem];
                }
                input.buttons = [
                    ...(step > 1 ? [QuickInputButtons.Back] : [])
                ];
                disposables.push(
                    input.onDidTriggerButton(item => {
                        if (item === QuickInputButtons.Back) {
                            reject(MultiStepWizard.InputFlowAction.back);
                        } else {
                            resolve(<any>item);
                        }
                    }),
                    input.onDidChangeSelection(items => resolve(items[0])),
                    input.onDidHide(() => {
                        reject(MultiStepWizard.InputFlowAction.cancel);
                    })
                );
                input.ignoreFocusOut = true;
                input.show();
            });
        } finally {
            disposables.forEach(d => d.dispose());
        }
    }

    static async showInputBox<P extends Partial<any>>({ title, step, totalSteps, value, prompt, validate, shouldResume }: {
        title: string;
        step: number;
        totalSteps: number;
        value: string;
        prompt: string;
        validate: (text: string) => Promise<string | undefined>;
        shouldResume?: () => Thenable<boolean>;
    }): Promise<string> {
        const disposables: Disposable[] = [];
        try {
            return await new Promise<string>((resolve, reject) => {
                const input = window.createInputBox();
                input.title = title;
                input.step = step;
                input.totalSteps = totalSteps;
                input.value = value || '';
                input.prompt = prompt;
                input.buttons = [
                    ...(step > 1 ? [QuickInputButtons.Back] : [])
                ];
                let validating = false;
                disposables.push(
                    input.onDidTriggerButton(item => {
                        if (item === QuickInputButtons.Back) {
                            reject(MultiStepWizard.InputFlowAction.back);
                        } else {
                            resolve(input.value);
                        }
                    }),
                    input.onDidAccept(async () => {
                        const value = input.value;
                        input.enabled = false;
                        input.busy = true;
                        if (!validating) {
                            validating = true;
                            const validationMessage = await validate(value);
                            if (validationMessage) {
                                input.validationMessage = validationMessage;
                                validating = false;
                                input.enabled = true;
                                input.busy = false;
                            } else {
                                resolve(value);
                            }
                        }
                    }),
                    input.onDidChangeValue(async text => {
                        const current = await validate(text);
                        if (current) {
                           input.validationMessage = current;
                        } else {
                           input.validationMessage = undefined;
                        }
                    }),
                    input.onDidHide(() => {
                        reject(MultiStepWizard.InputFlowAction.cancel);
                    })
                );
                input.ignoreFocusOut = true;
                input.show();
            });
        } finally {
            disposables.forEach(d => d.dispose());
        }
    }
}
