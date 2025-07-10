export const rustSnippet = {
  name: "Rust",
  code: `fn calculate_stats(numbers: &[i32]) -> (f64, i32, i32) {
    if numbers.is_empty() {
        return (0.0, 0, 0);
    }
    
    // Calculate average
    let sum: i32 = numbers.iter().sum();
    let avg = sum as f64 / numbers.len() as f64;
    
    // Find min and max
    let min = *numbers.iter().min().unwrap();
    let max = *numbers.iter().max().unwrap();
    
    (avg, min, max)
}

fn main() {
    let numbers = vec![23, 45, 12, 67, 89, 34, 56, 78, 90, 11];
    
    println!("Analyzing numbers: {:?}\\n", numbers);
    
    let (average, minimum, maximum) = calculate_stats(&numbers);
    
    println!("Statistical Analysis:");
    println!("--------------------");
    println!("Average: {:.2}", average);
    println!("Minimum: {}", minimum);
    println!("Maximum: {}", maximum);
}`,
};
