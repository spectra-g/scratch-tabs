export const pythonSnippet = {
  name: "Python",
  code: `def calculate_fibonacci(n):
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence

def main():
    # Calculate first 10 Fibonacci numbers
    n = 10
    result = calculate_fibonacci(n)
    
    print(f"First {n} numbers in the Fibonacci sequence:")
    for i, num in enumerate(result):
        print(f"{i + 1}: {num}")

if __name__ == "__main__":
    main()`,
};
