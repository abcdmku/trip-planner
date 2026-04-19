declare module '@storybook/react-vite' {
  import type { ComponentType, ReactElement } from 'react';

  type Args<T> = T extends ComponentType<infer TProps> ? TProps : T;

  export interface StoryContext<TArgs = Record<string, unknown>> {
    args: TArgs;
    canvasElement: HTMLElement;
    step?: (
      label: string,
      play: () => Promise<void> | void,
    ) => Promise<void>;
  }

  export interface Meta<TComponentOrArgs = unknown> {
    title?: string;
    component?: TComponentOrArgs extends ComponentType<any>
      ? TComponentOrArgs
      : ComponentType<any>;
    tags?: string[];
    args?: Partial<Args<TComponentOrArgs>>;
    argTypes?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    render?: (args: Args<TComponentOrArgs>) => ReactElement;
    decorators?: Array<(story: () => ReactElement) => ReactElement>;
  }

  export interface StoryObj<TMetaOrComponent = unknown> {
    args?: Record<string, unknown>;
    argTypes?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    render?: (args: Args<TMetaOrComponent>) => ReactElement;
    play?: (context: StoryContext<Args<TMetaOrComponent>>) => Promise<void> | void;
  }
}

declare module '@storybook/test' {
  export const expect: typeof import('vitest')['expect'];
  export const within: (element: HTMLElement) => {
    getByRole: (role: string, options?: Record<string, unknown>) => HTMLElement;
  };
  export const userEvent: {
    click: (element: Element) => Promise<void>;
    clear: (element: Element) => Promise<void>;
    type: (element: Element, text: string) => Promise<void>;
    keyboard: (text: string) => Promise<void>;
  };
}
