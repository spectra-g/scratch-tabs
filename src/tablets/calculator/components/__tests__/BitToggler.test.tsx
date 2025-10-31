// src/tablets/calculator/components/__tests__/BitToggler.test.tsx

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BitToggler } from "../BitToggler";

describe("BitToggler", () => {
  let mockOnBitToggle: jest.Mock;

  beforeEach(() => {
    mockOnBitToggle = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render with default 64-bit width", () => {
      render(
        <BitToggler
          currentNumber="0"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
        />
      );

      expect(screen.getByText(/BIT TOGGLER \(64-BIT\)/i)).toBeInTheDocument();
    });

    it("should render with 32-bit width", () => {
      render(
        <BitToggler
          currentNumber="0"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={32}
        />
      );

      expect(screen.getByText(/BIT TOGGLER \(32-BIT\)/i)).toBeInTheDocument();
    });

    it("should display byte labels", () => {
      render(
        <BitToggler
          currentNumber="0"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      // Should have 8 bytes (B0 through B7)
      expect(screen.getByText(/B7:/)).toBeInTheDocument();
      expect(screen.getByText(/B0:/)).toBeInTheDocument();
    });

    it("should render 64 bit buttons for 64-bit width", () => {
      render(
        <BitToggler
          currentNumber="0"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      // All bits should be 0 initially
      const bitButtons = screen.getAllByRole("button", { name: /Bit \d+, value: 0/ });
      expect(bitButtons).toHaveLength(64);
    });

    it("should render 32 bit buttons for 32-bit width", () => {
      render(
        <BitToggler
          currentNumber="0"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={32}
        />
      );

      const bitButtons = screen.getAllByRole("button", { name: /Bit \d+, value: [01]/ });
      expect(bitButtons).toHaveLength(32);
    });
  });

  describe("decimal (DEC) mode", () => {
    it("should display correct bits for decimal 5", () => {
      render(
        <BitToggler
          currentNumber="5"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      // 5 in binary is 101, so bits 0, 2 should be 1
      const bit0 = screen.getByRole("button", { name: "Bit 0, value: 1" });
      const bit1 = screen.getByRole("button", { name: "Bit 1, value: 0" });
      const bit2 = screen.getByRole("button", { name: "Bit 2, value: 1" });

      expect(bit0).toBeInTheDocument();
      expect(bit1).toBeInTheDocument();
      expect(bit2).toBeInTheDocument();
    });

    it("should display correct bits for decimal 255", () => {
      render(
        <BitToggler
          currentNumber="255"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      // 255 in binary is 11111111, so first 8 bits should be 1
      for (let i = 0; i < 8; i++) {
        const bit = screen.getByRole("button", { name: `Bit ${i}, value: 1` });
        expect(bit).toBeInTheDocument();
      }
    });

    it("should toggle bit 0 from 0 to 1", () => {
      render(
        <BitToggler
          currentNumber="0"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      const bit0 = screen.getByRole("button", { name: "Bit 0, value: 0" });
      fireEvent.click(bit0);

      expect(mockOnBitToggle).toHaveBeenCalledWith("1");
    });

    it("should toggle bit 1 from 0 to 1", () => {
      render(
        <BitToggler
          currentNumber="0"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      const bit1 = screen.getByRole("button", { name: "Bit 1, value: 0" });
      fireEvent.click(bit1);

      expect(mockOnBitToggle).toHaveBeenCalledWith("2"); // 2^1 = 2
    });

    it("should toggle bit 0 from 1 to 0 for number 5", () => {
      render(
        <BitToggler
          currentNumber="5"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      // 5 = 101 in binary, toggle bit 0 off
      const bit0 = screen.getByRole("button", { name: "Bit 0, value: 1" });
      fireEvent.click(bit0);

      expect(mockOnBitToggle).toHaveBeenCalledWith("4"); // 5 - 1 = 4
    });

    it("should toggle multiple bits correctly", () => {
      const { rerender } = render(
        <BitToggler
          currentNumber="0"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      // Toggle bit 0 (value becomes 1)
      const bit0 = screen.getByRole("button", { name: "Bit 0, value: 0" });
      fireEvent.click(bit0);
      expect(mockOnBitToggle).toHaveBeenCalledWith("1");

      // Simulate parent updating currentNumber
      rerender(
        <BitToggler
          currentNumber="1"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      // Toggle bit 1 (value becomes 3)
      const bit1 = screen.getByRole("button", { name: "Bit 1, value: 0" });
      fireEvent.click(bit1);
      expect(mockOnBitToggle).toHaveBeenCalledWith("3"); // 1 + 2 = 3
    });
  });

  describe("hexadecimal (HEX) mode", () => {
    it("should display correct bits for hex FF", () => {
      render(
        <BitToggler
          currentNumber="FF"
          currentBase="HEX"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      // FF = 255, so first 8 bits should be 1
      for (let i = 0; i < 8; i++) {
        const bit = screen.getByRole("button", { name: `Bit ${i}, value: 1` });
        expect(bit).toBeInTheDocument();
      }
    });

    it("should toggle bit and return hex value", () => {
      render(
        <BitToggler
          currentNumber="F"
          currentBase="HEX"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      // F = 15 = 0b1111, toggle bit 4 (add 16)
      const bit4 = screen.getByRole("button", { name: "Bit 4, value: 0" });
      fireEvent.click(bit4);

      expect(mockOnBitToggle).toHaveBeenCalledWith("1F"); // 15 + 16 = 31 = 0x1F
    });

    it("should display correct bits for hex DEADBEEF", () => {
      render(
        <BitToggler
          currentNumber="DEADBEEF"
          currentBase="HEX"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      // DEADBEEF = 3735928559 in decimal
      // Should show correct bit pattern
      expect(screen.getByText(/DEC:/)).toBeInTheDocument();
      expect(screen.getByText(/3735928559/)).toBeInTheDocument();
    });
  });

  describe("binary (BIN) mode", () => {
    it("should display correct bits for binary 1010", () => {
      render(
        <BitToggler
          currentNumber="1010"
          currentBase="BIN"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      // 1010 = 10 in decimal, so bits 1 and 3 should be 1
      expect(screen.getByRole("button", { name: "Bit 1, value: 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Bit 3, value: 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Bit 0, value: 0" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Bit 2, value: 0" })).toBeInTheDocument();
    });

    it("should toggle bit and return binary value", () => {
      render(
        <BitToggler
          currentNumber="1010"
          currentBase="BIN"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      // 1010 = 10, toggle bit 0 (add 1) = 11 = 1011
      const bit0 = screen.getByRole("button", { name: "Bit 0, value: 0" });
      fireEvent.click(bit0);

      expect(mockOnBitToggle).toHaveBeenCalledWith("1011");
    });
  });

  describe("octal (OCT) mode", () => {
    it("should display correct bits for octal 77", () => {
      render(
        <BitToggler
          currentNumber="77"
          currentBase="OCT"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      // 77 octal = 63 decimal = 111111 binary
      // Bits 0-5 should be 1
      for (let i = 0; i < 6; i++) {
        expect(screen.getByRole("button", { name: `Bit ${i}, value: 1` })).toBeInTheDocument();
      }
    });

    it("should toggle bit and return octal value", () => {
      render(
        <BitToggler
          currentNumber="10"
          currentBase="OCT"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      // 10 octal = 8 decimal = 1000 binary
      // Toggle bit 0 (add 1) = 9 decimal = 11 octal
      const bit0 = screen.getByRole("button", { name: "Bit 0, value: 0" });
      fireEvent.click(bit0);

      expect(mockOnBitToggle).toHaveBeenCalledWith("11");
    });
  });

  describe("summary information", () => {
    it("should display decimal representation", () => {
      render(
        <BitToggler
          currentNumber="FF"
          currentBase="HEX"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      expect(screen.getByText(/DEC:/)).toBeInTheDocument();
      expect(screen.getByText(/255/)).toBeInTheDocument();
    });

    it("should display hex representation", () => {
      render(
        <BitToggler
          currentNumber="255"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      expect(screen.getByText(/HEX:/)).toBeInTheDocument();
      expect(screen.getByText(/0xFF/)).toBeInTheDocument();
    });

    it("should display bits set count", () => {
      render(
        <BitToggler
          currentNumber="7"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      // 7 = 111 in binary, so 3 bits set
      expect(screen.getByText(/Bits set:/)).toBeInTheDocument();
      expect(screen.getByText(/3\/64/)).toBeInTheDocument();
    });

    it("should display correct bits set for all ones (32-bit)", () => {
      render(
        <BitToggler
          currentNumber="FFFFFFFF"
          currentBase="HEX"
          onBitToggle={mockOnBitToggle}
          bitWidth={32}
        />
      );

      expect(screen.getByText(/32\/32/)).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle zero", () => {
      render(
        <BitToggler
          currentNumber="0"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      // All bits should be 0
      const bitButtons = screen.getAllByRole("button", { name: /Bit \d+, value: 0/ });
      expect(bitButtons).toHaveLength(64);

      expect(screen.getByText(/0\/64/)).toBeInTheDocument(); // 0 bits set
    });

    it("should handle invalid number gracefully", () => {
      render(
        <BitToggler
          currentNumber=""
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      // Should default to 0 - check summary info specifically
      expect(screen.getByText(/Bits set:/)).toBeInTheDocument();
      expect(screen.getByText(/0\/64/)).toBeInTheDocument();
    });

    it("should handle bit 31 toggle (highest bit for 32-bit)", () => {
      render(
        <BitToggler
          currentNumber="0"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={32}
        />
      );

      const bit31 = screen.getByRole("button", { name: "Bit 31, value: 0" });
      fireEvent.click(bit31);

      // 2^31 = 2147483648
      expect(mockOnBitToggle).toHaveBeenCalledWith("2147483648");
    });

    it("should handle large hex numbers", () => {
      render(
        <BitToggler
          currentNumber="FFFFFFFF"
          currentBase="HEX"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      // FFFFFFFF = 4294967295 decimal
      expect(screen.getByText(/4294967295/)).toBeInTheDocument();
      expect(screen.getByText(/32\/64/)).toBeInTheDocument(); // 32 bits set
    });
  });

  describe("accessibility", () => {
    it("should have aria-labels for all bit buttons", () => {
      render(
        <BitToggler
          currentNumber="5"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      const bit0 = screen.getByLabelText("Bit 0, value: 1");
      const bit1 = screen.getByLabelText("Bit 1, value: 0");
      const bit2 = screen.getByLabelText("Bit 2, value: 1");

      expect(bit0).toBeInTheDocument();
      expect(bit1).toBeInTheDocument();
      expect(bit2).toBeInTheDocument();
    });

    it("should be keyboard accessible", () => {
      render(
        <BitToggler
          currentNumber="0"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={64}
        />
      );

      const bit0 = screen.getByRole("button", { name: "Bit 0, value: 0" });
      bit0.focus();

      expect(document.activeElement).toBe(bit0);
    });
  });
});
