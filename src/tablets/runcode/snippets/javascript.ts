export const javascriptSnippet = {
  name: "JavaScript",
  code: `function isPalindrome(str) {
    // Remove non-alphanumeric characters and convert to lowercase
    str = str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    
    // Compare string with its reverse
    return str === str.split('').reverse().join('');
}

function testPalindromes() {
    const testCases = [
        "A man, a plan, a canal: Panama",
        "race a car",
        "Was it a car or a cat I saw?",
        "hello world"
    ];
    
    console.log("Palindrome Test Results:");
    console.log("------------------------");
    
    testCases.forEach((test, index) => {
        const result = isPalindrome(test);
        console.log(\`Test \${index + 1}: "\${test}"\`);
        console.log(\`Result: \${result ? "Is a palindrome" : "Not a palindrome"}\n\`);
    });
}

testPalindromes();`,
};
