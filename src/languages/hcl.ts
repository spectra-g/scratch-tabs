import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * HCL/Terraform language detector
 */
export class HclLanguageDetector extends BaseLanguageDetector {
  id = 'hcl';
  name = 'HCL';
  extensions = ['tf'];
  priority = 3;

  sampleContent(): string {
    return `resource "aws_instance" "example" {
  ami           = "ami-12345678"
  instance_type = "t2.micro"
}`;
  }

  isMatch(content: string): boolean {
    if (!content) return false;
    return /\bresource\s+"[^"]+"\s+"[^"]+"\s*\{/.test(content)
        || /\bvariable\s+"[^"]+"\s*\{/.test(content);
  }

  registerProvider(monaco: any): void {
    // No Monaco provider for HCL/Terraform by default
  }
}

const hclDetector = new HclLanguageDetector();
languageRegistry.register(hclDetector);
export const registerHclProvider = (monaco: any) => {
  hclDetector.registerProvider(monaco);
}; 