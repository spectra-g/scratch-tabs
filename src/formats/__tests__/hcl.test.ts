import { HclFormatDetector } from "../hcl";

describe("HclFormatDetector", () => {
  let detector: HclFormatDetector;

  beforeEach(() => {
    detector = new HclFormatDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("hcl");
      expect(detector.name).toBe("HCL (Terraform)");
      expect(detector.extensions).toEqual(["tf", "hcl", "tfvars"]);
      expect(detector.priority).toBe(4);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("hcl");
    });
  });

  describe("Detection Logic", () => {
    test("should detect Terraform configuration", () => {
      const terraformCode = `resource "aws_instance" "example" {
  ami           = "ami-0c02fb55956c7d316"
  instance_type = "t2.micro"

  tags = {
    Name = "HelloWorld"
  }
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}`;
      const result = detector.detect(terraformCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should detect provider configuration", () => {
      const providerConfig = `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}`;
      const result = detector.detect(providerConfig);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should handle empty content", () => {
      expect(detector.detect("").match).toBe(false);
    });
  });
});