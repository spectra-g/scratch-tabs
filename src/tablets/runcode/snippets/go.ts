export const goSnippet = {
  name: 'Go',
  code: `package main

import (
    "fmt"
    "strings"
)

func wordFrequency(text string) map[string]int {
    // Convert to lowercase and split into words
    words := strings.Fields(strings.ToLower(text))
    
    // Count frequency of each word
    frequency := make(map[string]int)
    for _, word := range words {
        // Remove punctuation from word
        word = strings.Trim(word, ".,!?';:()")
        if word != "" {
            frequency[word]++
        }
    }
    
    return frequency
}

func main() {
    text := \`The quick brown fox jumps over the lazy dog.
             The dog sleeps while the fox runs away.\`
    
    freq := wordFrequency(text)
    
    fmt.Println("Word Frequency Analysis:")
    fmt.Println("------------------------")
    
    // Print results
    for word, count := range freq {
        fmt.Printf("%-10s: %d\\n", word, count)
    }
}`
};