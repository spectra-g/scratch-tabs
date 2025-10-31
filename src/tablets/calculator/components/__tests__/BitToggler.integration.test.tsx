// src/tablets/calculator/components/__tests__/BitToggler.integration.test.tsx

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BitToggler } from "../BitToggler";

describe("BitToggler Integration Tests", () => {
  describe("Decimal (DEC) mode - bit toggling behavior", () => {
    it("should correctly toggle bit 0 on value 0", () => {
      const mockOnBitToggle = jest.fn();

      render(
        <BitToggler
          currentNumber="0"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={32}
        />
      );

      // Find and click bit 0 (rightmost bit)
      const bit0 = screen.getByRole("button", { name: "Bit 0, value: 0" });
      fireEvent.click(bit0);

      // Should toggle to 1
      expect(mockOnBitToggle).toHaveBeenCalledWith("1");
      expect(mockOnBitToggle).toHaveBeenCalledTimes(1);
    });

    it("should correctly toggle bit 0 on value 7", () => {
      const mockOnBitToggle = jest.fn();

      render(
        <BitToggler
          currentNumber="7"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={32}
        />
      );

      // Value 7 = binary 111 (bits 0, 1, 2 are set)
      // Verify the bits are displayed correctly
      expect(screen.getByRole("button", { name: "Bit 0, value: 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Bit 1, value: 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Bit 2, value: 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Bit 3, value: 0" })).toBeInTheDocument();

      // Toggle bit 0 off (should become 6)
      const bit0 = screen.getByRole("button", { name: "Bit 0, value: 1" });
      fireEvent.click(bit0);

      expect(mockOnBitToggle).toHaveBeenCalledWith("6"); // 7 - 1 = 6
    });

    it("should correctly toggle bit 5 on value 7 (user reported bug)", () => {
      const mockOnBitToggle = jest.fn();

      render(
        <BitToggler
          currentNumber="7"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={32}
        />
      );

      // Value 7 = binary 00000111
      // Toggling bit 5 should add 32
      // Expected: 7 + 32 = 39
      const bit5 = screen.getByRole("button", { name: "Bit 5, value: 0" });
      fireEvent.click(bit5);

      // Should be 39, NOT 73 (the bug value)
      expect(mockOnBitToggle).toHaveBeenCalledWith("39");
      expect(mockOnBitToggle).not.toHaveBeenCalledWith("73");
      expect(mockOnBitToggle).not.toHaveBeenCalledWith("79");
    });

    it("should correctly toggle bit 3 on value 7", () => {
      const mockOnBitToggle = jest.fn();

      render(
        <BitToggler
          currentNumber="7"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={32}
        />
      );

      // Toggling bit 3 should add 8
      // Expected: 7 + 8 = 15
      const bit3 = screen.getByRole("button", { name: "Bit 3, value: 0" });
      fireEvent.click(bit3);

      expect(mockOnBitToggle).toHaveBeenCalledWith("15");
    });

    it("should correctly toggle bit 6 on value 7", () => {
      const mockOnBitToggle = jest.fn();

      render(
        <BitToggler
          currentNumber="7"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={32}
        />
      );

      // Toggling bit 6 should add 64
      // Expected: 7 + 64 = 71
      const bit6 = screen.getByRole("button", { name: "Bit 6, value: 0" });
      fireEvent.click(bit6);

      expect(mockOnBitToggle).toHaveBeenCalledWith("71");
    });

    it("should handle multiple toggles correctly", () => {
      const mockOnBitToggle = jest.fn();

      const { rerender } = render(
        <BitToggler
          currentNumber="7"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={32}
        />
      );

      // First toggle: bit 3 (7 + 8 = 15)
      const bit3 = screen.getByRole("button", { name: "Bit 3, value: 0" });
      fireEvent.click(bit3);
      expect(mockOnBitToggle).toHaveBeenLastCalledWith("15");

      // Simulate parent component updating the value
      rerender(
        <BitToggler
          currentNumber="15"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={32}
        />
      );

      // Second toggle: bit 0 (15 - 1 = 14)
      const bit0 = screen.getByRole("button", { name: "Bit 0, value: 1" });
      fireEvent.click(bit0);
      expect(mockOnBitToggle).toHaveBeenLastCalledWith("14");

      expect(mockOnBitToggle).toHaveBeenCalledTimes(2);
    });
  });

  describe("Hexadecimal (HEX) mode - bit toggling", () => {
    it("should toggle bits and return hex values correctly", () => {
      const mockOnBitToggle = jest.fn();

      render(
        <BitToggler
          currentNumber="F"
          currentBase="HEX"
          onBitToggle={mockOnBitToggle}
          bitWidth={32}
        />
      );

      // F = 15 = binary 1111 (bits 0-3 set)
      // Toggle bit 4 (add 16) → 31 = 0x1F
      const bit4 = screen.getByRole("button", { name: "Bit 4, value: 0" });
      fireEvent.click(bit4);

      expect(mockOnBitToggle).toHaveBeenCalledWith("1F");
    });

    it("should handle large hex values", () => {
      const mockOnBitToggle = jest.fn();

      render(
        <BitToggler
          currentNumber="FF"
          currentBase="HEX"
          onBitToggle={mockOnBitToggle}
          bitWidth={32}
        />
      );

      // FF = 255 = binary 11111111 (bits 0-7 set)
      // Toggle bit 8 (add 256) → 511 = 0x1FF
      const bit8 = screen.getByRole("button", { name: "Bit 8, value: 0" });
      fireEvent.click(bit8);

      expect(mockOnBitToggle).toHaveBeenCalledWith("1FF");
    });
  });

  describe("Binary (BIN) mode - bit toggling", () => {
    it("should toggle bits and return binary values correctly", () => {
      const mockOnBitToggle = jest.fn();

      render(
        <BitToggler
          currentNumber="111"
          currentBase="BIN"
          onBitToggle={mockOnBitToggle}
          bitWidth={32}
        />
      );

      // 111 (binary) = 7 (decimal)
      // Toggle bit 3 (add 8) → 15 = 1111 (binary)
      const bit3 = screen.getByRole("button", { name: "Bit 3, value: 0" });
      fireEvent.click(bit3);

      expect(mockOnBitToggle).toHaveBeenCalledWith("1111");
    });

    it("should toggle bit off correctly", () => {
      const mockOnBitToggle = jest.fn();

      render(
        <BitToggler
          currentNumber="1010"
          currentBase="BIN"
          onBitToggle={mockOnBitToggle}
          bitWidth={32}
        />
      );

      // 1010 (binary) = 10 (decimal), bits 1 and 3 are set
      // Toggle bit 1 off (subtract 2) → 8 = 1000 (binary)
      const bit1 = screen.getByRole("button", { name: "Bit 1, value: 1" });
      fireEvent.click(bit1);

      expect(mockOnBitToggle).toHaveBeenCalledWith("1000");
    });
  });

  describe("Octal (OCT) mode - bit toggling", () => {
    it("should toggle bits and return octal values correctly", () => {
      const mockOnBitToggle = jest.fn();

      render(
        <BitToggler
          currentNumber="7"
          currentBase="OCT"
          onBitToggle={mockOnBitToggle}
          bitWidth={32}
        />
      );

      // 7 (octal) = 7 (decimal)
      // Toggle bit 3 (add 8) → 15 (decimal) = 17 (octal)
      const bit3 = screen.getByRole("button", { name: "Bit 3, value: 0" });
      fireEvent.click(bit3);

      expect(mockOnBitToggle).toHaveBeenCalledWith("17");
    });
  });

  describe("Edge cases", () => {
    it("should handle toggling different bits individually", () => {
      const mockOnBitToggle = jest.fn();

      render(
        <BitToggler
          currentNumber="0"
          currentBase="DEC"
          onBitToggle={mockOnBitToggle}
          bitWidth={32}
        />
      );

      // Each toggle is independent (component doesn't re-render between clicks in this test)
      // Click bit 0: 0 + 1 = 1
      const bit0 = screen.getByRole("button", { name: "Bit 0, value: 0" });
      fireEvent.click(bit0);
      expect(mockOnBitToggle).toHaveBeenLastCalledWith("1");

      // Click bit 7: 0 + 128 = 128 (still based on initial value 0)
      const bit7 = screen.getByRole("button", { name: "Bit 7, value: 0" });
      fireEvent.click(bit7);
      expect(mockOnBitToggle).toHaveBeenLastCalledWith("128");

      expect(mockOnBitToggle).toHaveBeenCalledTimes(2);
    });

    it("should handle toggling MSB (bit 31 for 32-bit)", () => {
      const mockOnBitToggle = jest.fn();

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
  });

  describe("Bit display verification", () => {
    it("should display correct bit pattern for value 7", () => {
      render(
        <BitToggler
          currentNumber="7"
          currentBase="DEC"
          onBitToggle={jest.fn()}
          bitWidth={32}
        />
      );

      // 7 = binary 00000111
      // Verify first 3 bits are 1, rest are 0
      expect(screen.getByRole("button", { name: "Bit 0, value: 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Bit 1, value: 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Bit 2, value: 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Bit 3, value: 0" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Bit 4, value: 0" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Bit 5, value: 0" })).toBeInTheDocument();
    });

    it("should display correct summary for value 7", () => {
      const { container } = render(
        <BitToggler
          currentNumber="7"
          currentBase="DEC"
          onBitToggle={jest.fn()}
          bitWidth={32}
        />
      );

      // Check summary information - use more specific queries
      expect(screen.getByText(/DEC:/)).toBeInTheDocument();
      expect(screen.getByText(/HEX:/)).toBeInTheDocument();
      expect(screen.getByText(/0x7/)).toBeInTheDocument();
      expect(screen.getByText(/Bits set:/)).toBeInTheDocument();
      expect(screen.getByText(/3\/32/)).toBeInTheDocument();

      // Verify decimal value is displayed (check in summary section specifically)
      const summarySection = container.querySelector('.border-t');
      expect(summarySection).toHaveTextContent('7');
    });
  });
});
