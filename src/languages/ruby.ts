import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * Ruby language detector
 */
export class RubyLanguageDetector extends BaseLanguageDetector {
  id = 'ruby';
  name = 'Ruby';
  extensions = ['rb'];
  priority = 5;

  sampleContent(): string {
    return `class BankAccount
  attr_reader :balance
  
  def initialize(initial_balance = 0)
    @balance = initial_balance
    @transactions = []
  end
  
  def deposit(amount)
    raise ArgumentError, "Amount must be positive" if amount <= 0
    @balance += amount
    @transactions << { type: :deposit, amount: amount, date: Time.now }
  end
  
  def withdraw(amount)
    raise ArgumentError, "Amount must be positive" if amount <= 0
    raise "Insufficient funds" if amount > @balance
    @balance -= amount
    @transactions << { type: :withdrawal, amount: amount, date: Time.now }
  end
  
  def transaction_history
    puts "\\nTransaction History:"
    puts "-" * 40
    @transactions.each do |tx|
      puts "#{tx[:date].strftime("%Y-%m-%d %H:%M:%S")} | " +
           "#{tx[:type].to_s.capitalize}: $#{"%.2f" % tx[:amount]}"
    end
    puts "-" * 40
    puts "Current Balance: $#{"%.2f" % @balance}"
  end
end

# Test the BankAccount class
account = BankAccount.new(1000)

account.deposit(500)
account.withdraw(200)
account.deposit(1000)
account.withdraw(750)

account.transaction_history`;
  }

  isMatch(content: string): boolean {
    const rubyPatterns = [
      /class\s+[A-Z][a-zA-Z0-9_]*/m,           // Class definition
      /def\s+[a-z_][a-zA-Z0-9_]*/m,            // Method definition
      /attr_(reader|writer|accessor)/m,         // Attribute methods
      /@[a-zA-Z_][a-zA-Z0-9_]*/m,              // Instance variables
      /\b(if|unless|while|until)\b/m,           // Control structures
      /\bdo\s*\|[^|]*\|/m,                     // Block with parameters
      /\bend\b/m,                              // End keyword
      /->\s*{/m,                               // Lambda syntax
      /:[a-zA-Z_][a-zA-Z0-9_]*/m,             // Symbols
    ];

    const matchCount = rubyPatterns.reduce((count, pattern) =>
      count + (pattern.test(content) ? 1 : 0), 0);

    return matchCount >= 3;
  }

  countSpecificPatterns(content: string): number {
    const specificPatterns = [
      /class\s+[A-Z][a-zA-Z0-9_]*/m,           // Class definition
      /def\s+initialize/m,                      // Constructor
      /attr_(reader|writer|accessor)/m,         // Attribute methods
      /->\s*{[^}]*}/m,                         // Lambda expression
    ];

    return specificPatterns.reduce((count, pattern) =>
      count + (pattern.test(content) ? 1 : 0), 0);
  }

  registerProvider(monaco: any): void {
    monaco.languages.registerDocumentFormattingEditProvider('ruby', {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split('\n');
        let indentLevel = 0;

        const formattedLines = lines.map((line: string) => {
          const trimmedLine = line.trim();

          // Decrease indent for end keywords and closing braces
          if (/^(end|else|elsif|rescue|ensure|\}|\])/.test(trimmedLine)) {
            indentLevel = Math.max(0, indentLevel - 1);
          }

          // Calculate current line's indentation
          const indent = '  '.repeat(indentLevel);
          const formattedLine = trimmedLine ? indent + trimmedLine : '';

          // Increase indent after certain keywords and opening braces
          if (/(\bdo|\bclass|\bmodule|\bdef|\bif|\bunless|\bcase|\bwhile|\buntil|\bfor|\bbegin|\{|\[)(\s|$)/.test(trimmedLine)) {
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
const rubyDetector = new RubyLanguageDetector();
languageRegistry.register(rubyDetector);

// Export for backward compatibility
export const registerRubyProvider = (monaco: any) => {
  rubyDetector.registerProvider(monaco);
};