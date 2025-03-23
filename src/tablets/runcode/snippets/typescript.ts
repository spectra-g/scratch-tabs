export const typescriptSnippet = {
  name: 'TypeScript',
  code: `// Simple number guessing game
const targetNumber = Math.floor(Math.random() * 100) + 1;
let attempts = 0;
const maxAttempts = 5;

function makeGuess(guess: number): string {
    attempts++;
    
    if (guess === targetNumber) {
        return \`Congratulations! You found the number \${targetNumber} in \${attempts} attempts!\`;
    }
    
    if (attempts >= maxAttempts) {
        return \`Game Over! The number was \${targetNumber}. Better luck next time!\`;
    }
    
    if (guess < targetNumber) {
        return \`Too low! \${maxAttempts - attempts} attempts remaining.\`;
    }
    
    return \`Too high! \${maxAttempts - attempts} attempts remaining.\`;
}

// Test the game with some guesses
console.log("Number Guessing Game (1-100)\\n");

const guesses = [50, 75, 25, 37, 42];
for (const guess of guesses) {
    console.log(\`Guessing: \${guess}\`);
    console.log(makeGuess(guess));
    console.log("");
}`
};