import '@testing-library/jest-dom';

declare global {
    namespace jest {
        interface Matchers<R = void> {
            toBeInTheDocument(): R;
            toHaveTextContent(text: string | RegExp): R;
            toHaveClass(...classNames: string[]): R;
        }
    }
}

