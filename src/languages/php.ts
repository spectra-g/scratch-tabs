import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * PHP language detector
 */
export class PhpLanguageDetector extends BaseLanguageDetector {
  id = 'php';
  name = 'PHP';
  extensions = ['php'];
  priority = 5;

  sampleContent(): string {
    return `<?php

class ShoppingCart {
    private array $items = [];
    private float $total = 0.0;
    
    public function addItem(string $name, float $price, int $quantity = 1): void {
        $this->items[] = [
            'name' => $name,
            'price' => $price,
            'quantity' => $quantity,
            'subtotal' => $price * $quantity
        ];
        
        $this->calculateTotal();
    }
    
    private function calculateTotal(): void {
        $this->total = array_reduce(
            $this->items,
            fn($sum, $item) => $sum + $item['subtotal'],
            0
        );
    }
    
    public function removeItem(int $index): void {
        if (isset($this->items[$index])) {
            unset($this->items[$index]);
            $this->items = array_values($this->items);
            $this->calculateTotal();
        }
    }
    
    public function displayCart(): void {
        echo "Shopping Cart\\n";
        echo str_repeat('-', 40) . "\\n";
        
        foreach ($this->items as $index => $item) {
            printf(
                "%d. %s (x%d) - $%.2f\\n",
                $index + 1,
                $item['name'],
                $item['quantity'],
                $item['subtotal']
            );
        }
        
        echo str_repeat('-', 40) . "\\n";
        printf("Total: $%.2f\\n", $this->total);
    }
}

// Test the shopping cart
$cart = new ShoppingCart();

$cart->addItem("Book", 29.99);
$cart->addItem("Coffee", 4.99, 2);
$cart->addItem("Headphones", 59.99);

$cart->displayCart();

// Remove an item
$cart->removeItem(1);
echo "\\nAfter removing item:\\n";
$cart->displayCart();`;
  }

  isMatch(content: string): boolean {
    const phpPatterns = [
      /^<\?php/m,                                // PHP opening tag
      /class\s+[A-Z][a-zA-Z0-9_]*/m,            // Class definition
      /function\s+[a-zA-Z_][a-zA-Z0-9_]*/m,     // Function definition
      /\$this->/m,                              // $this reference
      /private|protected|public/m,               // Access modifiers
      /array\s+\$[a-zA-Z_][a-zA-Z0-9_]*/m,      // Typed array property
      /fn\s*\([^)]*\)\s*=>/m,                   // Arrow function
      /echo|print|printf/m,                      // Output functions
    ];

    const matchCount = phpPatterns.reduce((count, pattern) =>
      count + (pattern.test(content) ? 1 : 0), 0);

    return matchCount >= 3;
  }

  countSpecificPatterns(content: string): number {
    const specificPatterns = [
      /^<\?php/m,                                // PHP opening tag
      /private|protected|public/m,               // Access modifiers
      /fn\s*\([^)]*\)\s*=>/m,                   // Arrow function
      /:\s*(void|string|int|float|bool|array)/m, // Return type hints
    ];

    return specificPatterns.reduce((count, pattern) =>
      count + (pattern.test(content) ? 1 : 0), 0);
  }

  registerProvider(monaco: any): void {
    monaco.languages.registerDocumentFormattingEditProvider('php', {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split('\n');
        let indentLevel = 0;

        const formattedLines = lines.map((line: string) => {
          const trimmedLine = line.trim();

          // Decrease indent for closing braces
          if (trimmedLine.startsWith('}')) {
            indentLevel = Math.max(0, indentLevel - 1);
          }

          // Calculate current line's indentation
          const indent = '    '.repeat(indentLevel);
          const formattedLine = trimmedLine ? indent + trimmedLine : '';

          // Increase indent after opening braces
          if (trimmedLine.endsWith('{')) {
            indentLevel++;
          }

          return formattedLine;
        });

        return [{
          range: model.getFullModelRange(),
          text: formattedLines.join('\n')
        }];
      }
    });
  }
}

// Create and register the detector
const phpDetector = new PhpLanguageDetector();
languageRegistry.register(phpDetector);

// Export for backward compatibility
export const registerPhpProvider = (monaco: any) => {
  phpDetector.registerProvider(monaco);
};