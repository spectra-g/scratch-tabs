import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import { DetectionResult, LanguageDetector } from './types';

/**
 * HCL (Terraform, Packer, etc.) language detector
 */
export class HclLanguageDetector extends BaseLanguageDetector implements LanguageDetector {
  id = 'hcl'; // Monaco uses 'hcl' for Terraform syntax
  name = 'HCL (Terraform/Packer)';
  extensions = ['tf', 'hcl', 'pkr.hcl', 'pkr', 'nomad', 'sentinel', 'consul.hcl', 'vault.hcl']; // Common HCL extensions
  priority = 6; // High priority, fairly unique syntax

  sampleContent(): string {
    return `# main.tf (Terraform example)
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.0.0"
}

provider "aws" {
  region = "us-west-2"
}

resource "aws_instance" "web_server" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t2.micro"
  count         = 2

  tags = {
    Name        = "WebServer-\${count.index + 1}"
    Environment = var.environment
  }

  user_data = <<-EOF
              #!/bin/bash
              echo "Hello, World from \${var.server_name}!" > /tmp/hello.txt
              EOF
}

variable "environment" {
  type        = string
  description = "The deployment environment (e.g., dev, staging, prod)"
  default     = "dev"
}

output "instance_ips" {
  value = aws_instance.web_server[*].public_ip
}

locals {
  common_tags = {
    Owner = "Terraform User"
  }
}

data "aws_ami" "latest_amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}`;
  }

  /**
   * Detects if the given content matches HCL patterns and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 10) { // e.g., "foo {}"
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0; // Count of distinct pattern types hit
    let strongSignalFound = false;

    // 1. Core HCL block types (very strong indicators)
    //    Looks for keyword "label1" "label2" { ... }
    //    or keyword "label" { ... } or keyword { ... }
    const blockKeywords = [
      "resource", "provider", "variable", "output", "locals", "data", "module",
      "terraform", "packer", "source", "build", "provisioner", "post-processor", // Packer
      "job", "group", "task", "service", "check", // Nomad
      "policy", "rule", // Sentinel
    ];
    const blockRegex = new RegExp(
      `^\\s*(?:#.*\\r?\\n\\s*)*(${blockKeywords.join('|')})\\s*(?:(?:["'][^"']+["']\\s*)?(?:["'][^"']+["']\\s*)?)\\{`,
      "gim"
    );

    const blockMatches = content.match(blockRegex);
    if (blockMatches && blockMatches.length > 0) {
      confidenceScore += 0.5; // Strong base for finding any HCL block
      confidenceScore += Math.min(blockMatches.length, 5) * 0.08; // Bonus for multiple blocks
      patternsMatched++;
      strongSignalFound = true;
    }

    // 2. Attribute assignments: identifier = value
    //    value can be string, number, bool, list, map, heredoc, or variable reference
    const attributePattern = /^\s*([a-zA-Z_][\w-]*)\s*=\s*(?:".*?"|'.*?'|\d+\.?\d*|true|false|\[.*?\]|\{.*?\}|<<-?\w+[\s\S]*?\n\w+|[\w.-]+)/gm;
    const attributeMatches = content.match(attributePattern);
    if (attributeMatches && attributeMatches.length > 0) {
      confidenceScore += 0.15;
      confidenceScore += Math.min(attributeMatches.length, 10) * 0.02;
      patternsMatched++;
      if (attributeMatches.length >= 3) strongSignalFound = true;
    }

    // 3. String interpolation: "${...}" or var.name or local.name
    if (/\$\{.*?\}|\bvar\.[\w.-]+|\blocal\.[\w.-]+/.test(content)) {
      confidenceScore += 0.15;
      patternsMatched++;
      strongSignalFound = true;
    }

    // 4. Heredoc syntax: <<-EOF ... EOF
    if (/<<-?\w+[\s\S]*?\n\s*\w+\s*$/m.test(content)) {
      confidenceScore += 0.2;
      patternsMatched++;
      strongSignalFound = true;
    }

    // 5. Comments (# or // or /* */)
    if (/^\s*#/.test(content)) confidenceScore += 0.05; // # is most common
    if (/\/\//.test(content)) confidenceScore += 0.03; // // also used
    if (/\/\*[\s\S]*?\*\//.test(content)) confidenceScore += 0.03; // Block comments


    // 6. Anti-patterns
    const antiPatterns = [
      { pattern: /<\w.*?>/g, weight: -0.6 },                      // HTML/XML tags
      { pattern: /\b(function|class|public|private|protected|static)\s+\w+/i, weight: -0.4 }, // Common OOP keywords from other langs
      { pattern: /^\s*import\s+(?:[\w.{}\s,]+from\s*)?['"][\w./-]+["'];?/im, weight: -0.3}, // JS/TS/Python/Java import
      { pattern: /=>\s*\{/g, weight: -0.5 }, // JS arrow
      { pattern: /System\.out\.println/i, weight: -0.5 }, // Java print
      { pattern: /console\.log/i, weight: -0.4 },        // JS print
    ];

    for (const ap of antiPatterns) {
      if (ap.pattern.test(content)) {
        confidenceScore += ap.weight;
      }
    }

    // 7. Final Adjustments and Clamping
    if (patternsMatched >= 2 && strongSignalFound) {
      confidenceScore += 0.1; // Bonus for multiple strong signals
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Determine match status
    const isMatch = (strongSignalFound && confidenceScore >= 0.5) || (patternsMatched >= 2 && confidenceScore >= 0.6);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongSignalFound
    };
  }

  getFileExtension(): string {
    return 'tf'; // Common default for HCL, especially Terraform
  }

  registerProvider(monaco: any): void {
    const languageId = this.id; // 'hcl'

    // Monaco has built-in support for 'hcl' which is used for Terraform.
    // It might be sufficient for general HCL highlighting.
    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === languageId)) {
      monaco.languages.register({ id: languageId });
    }

    // The built-in HCL/Terraform tokenizer in Monaco is usually pretty good.
    // You generally don't need to provide a custom Monarch tokenizer unless you
    // have specific needs for other HCL variants or want to customize highlighting heavily.
    // If you did, it would be similar to the other Monarch examples.

    // HCL formatting is best done by tools like `terraform fmt` or `hclfmt`.
    // A simple regex-based formatter would be very limited.
    // For now, we'll not register a custom formatter.
  }
}

// Create and register the detector
const hclDetector = new HclLanguageDetector();
languageRegistry.register(hclDetector);

// Export for backward compatibility (optional)
export const registerHclProvider = (monaco: any) => {
  hclDetector.registerProvider(monaco);
};