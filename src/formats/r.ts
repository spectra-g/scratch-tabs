import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule  } from "./types";

/**
 * R language detector
 */
export class RFormatDetector extends BaseFormatDetector implements FormatModule
{
  id = "r"; // Monaco's built-in ID for R
  name = "R";
  extensions = ["r", "R"];
  priority = 4; // R syntax is quite distinct

  sampleContent(): string {
    return `# R Script Example for Statistical Analysis

# Load necessary libraries
library(dplyr)
library(ggplot2)
library(lubridate)

# Sample data frame (tibble)
data <- tibble::tibble(
  id = 1:10,
  category = factor(sample(c("A", "B", "C"), 10, replace = TRUE)),
  value = rnorm(10, mean = 100, sd = 15),
  measurement_date = Sys.Date() - sample(0:30, 10, replace = TRUE),
  is_valid = sample(c(TRUE, FALSE, NA), 10, replace = TRUE)
)

# Data manipulation with dplyr
processed_data <- data %>%
  filter(!is.na(is_valid) & is_valid == TRUE) %>%
  mutate(
    year_month = floor_date(measurement_date, "month"),
    value_log = log(value)
  ) %>%
  group_by(category, year_month) %>%
  summarise(
    mean_value = mean(value_log, na.rm = TRUE),
    count = n(),
    .groups = 'drop'
  )

# Print processed data
print(processed_data)

# Create a plot with ggplot2
plot <- ggplot(processed_data, aes(x = year_month, y = mean_value, color = category, group = category)) +
  geom_line() +
  geom_point(size = 3) +
  labs(
    title = "Mean Log Value by Category Over Time",
    x = "Month",
    y = "Mean Log Value",
    color = "Category"
  ) +
  theme_minimal() +
  scale_x_date(date_labels = "%b %Y")

# Display the plot
# In an interactive session, just 'plot' would work. For scripts, use print or ggsave.
print(plot)
# ggsave("my_plot.png", plot, width = 8, height = 6)

# Custom function
calculate_ci <- function(data_vector, conf_level = 0.95) {
  if (length(data_vector) < 2) {
    return(list(mean = NA, lower = NA, upper = NA))
  }
  sample_mean <- mean(data_vector, na.rm = TRUE)
  sample_sd <- sd(data_vector, na.rm = TRUE)
  n <- sum(!is.na(data_vector))
  if (n < 2) return(list(mean = sample_mean, lower = NA, upper = NA))
  
  error_margin <- qt((1 + conf_level) / 2, df = n - 1) * sample_sd / sqrt(n)
  return(list(
    mean = sample_mean,
    lower = sample_mean - error_margin,
    upper = sample_mean + error_margin
  ))
}

# Example usage of custom function
value_ci <- calculate_ci(data$value)
cat(sprintf("Confidence Interval for 'value': [%.2f, %.2f]\\n", value_ci$lower, value_ci$upper))

# End of script
message("Analysis complete.")
`;
  }

  /**
   * Detects if the given content matches R patterns and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length < 3) {
      // e.g., "a<-1"
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let strongSignalFound = false;

    // Remove quoted strings to avoid false positives with JSON property names
    // This helps prevent matching "service.id" as if it were service$id
    const contentWithoutQuotes = content.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '""').replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "''");

    // 1. Core R Syntax (Definitive)
    const definitivePatterns = [
      { pattern: /<-\s*/g, weight: 0.4, perMatch: 0.05 }, // Assignment operator `<-`
      {
        pattern: /\b(?:library|require)\s*\([\w."']+\)/g,
        weight: 0.35,
        perMatch: 0.05,
      }, // library() or require()
      { pattern: /\bfunction\s*\([^)]*\)\s*\{/g, weight: 0.2, perMatch: 0.03 }, // function() { ... }
      {
        pattern: /\b(?:if|for|while|repeat|switch)\s*\(.*?\)\s*\{?/g,
        weight: 0.1,
        perMatch: 0.01,
      }, // Control flow
      { pattern: /\w+(?:\$[\w.]+)?\s*<-\s*/g, weight: 0.25, perMatch: 0.03 }, // More specific assignment: var$item <- or var <-
      {
        pattern: /\b(TRUE|FALSE|NULL|NA|NaN|Inf)\b/g,
        weight: 0.15,
        perMatch: 0.02,
      }, // R-specific logical/null constants
      { pattern: /%%|%in%|%o%|%\*%|%x%|%\/%/g, weight: 0.2, perMatch: 0.05 }, // Special operators (R's binary operators)
      {
        pattern: /\b(c|list|data\.frame|matrix|array|factor|vector)\s*\(/g,
        weight: 0.15,
        perMatch: 0.02,
      }, // Common data structure functions
      { pattern: /\w+\$[\w.]+/g, weight: 0.1, perMatch: 0.01 }, // Accessing elements with $
    ];

    for (const dp of definitivePatterns) {
      // Use content without quotes for $ patterns and % patterns to avoid JSON false positives
      const searchContent = (dp.pattern.source.includes('\\$') || dp.pattern.source.includes('%')) ? contentWithoutQuotes : content;
      const matches = searchContent.match(dp.pattern);
      if (matches) {
        confidenceScore += dp.weight;
        if (dp.perMatch) {
          confidenceScore += Math.min(matches.length, 5) * dp.perMatch;
        }
        patternsMatched++;
        if (dp.weight >= 0.2) {
          // Consider these as stronger signals
          strongSignalFound = true;
        }
      }
    }

    // 2. Common R package usage (e.g., dplyr, ggplot2)
    const packagePatterns = [
      {
        pattern:
          /\b(ggplot|dplyr|tidyr|readr|purrr|stringr|lubridate|forcats|data\.table|shiny|rmarkdown|knitr|devtools|roxygen2|testthat)\b/g,
        weight: 0.1,
        perMatch: 0.02,
      }, // Common package names
      { pattern: /%>%/g, weight: 0.25, perMatch: 0.05 }, // Pipe operator from magrittr/dplyr (very common in modern R)
      { pattern: /\baes\s*\(/g, weight: 0.15, perMatch: 0.03 }, // ggplot2 aesthetic mapping
    ];
    for (const pp of packagePatterns) {
      const matches = content.match(pp.pattern);
      if (matches) {
        confidenceScore += pp.weight;
        if (pp.perMatch) {
          confidenceScore += Math.min(matches.length, 3) * pp.perMatch;
        }
        patternsMatched++;
        if (pp.weight >= 0.15) strongSignalFound = true;
      }
    }

    // 3. Comments (R uses #)
    if (/^\s*#.*$/m.test(content)) {
      confidenceScore += 0.05; // Small boost, as many languages use #
      patternsMatched++;
    }

    // 4. Anti-patterns (Syntax from other languages not typical in R)
    const antiPatterns = [
      { pattern: /<\?php/i, weight: -0.7 },
      {
        pattern: /^\s*import\s+(?:{[\s\S]*?}|[\w*]+)\s+from\s*['"].*?['"];?/im,
        weight: -0.5,
      }, // JS/TS imports
      { pattern: /^\s*package\s+\w+;/m, weight: -0.6 }, // Java package
      { pattern: /System\.out\.println/i, weight: -0.5 }, // Java print
      { pattern: /console\.log/i, weight: -0.4 }, // JavaScript console.log
      { pattern: /\b(var|let|const)\s+\w+\s*=/g, weight: -0.4 }, // JS var declarations
      { pattern: /=>\s*\{/g, weight: -0.5 }, // JS arrow
      { pattern: /def\s+\w+\s*\(.*?\)\s*:/m, weight: -0.5 }, // Python def func():
      { pattern: /<\w.*?>/g, weight: -0.6 }, // HTML/XML tags
    ];

    for (const ap of antiPatterns) {
      if (ap.pattern.test(content)) {
        confidenceScore += ap.weight;
      }
    }

    // 5. Final Adjustments and Clamping
    if (patternsMatched >= 2 && strongSignalFound) {
      confidenceScore += 0.15;
    }
    if (
      content.includes("<-") &&
      (content.includes("library(") || content.includes("require("))
    ) {
      confidenceScore += 0.2; // Good combination
      strongSignalFound = true;
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Determine match status
    const isMatch =
      (strongSignalFound && confidenceScore >= 0.4) ||
      (patternsMatched >= 2 && confidenceScore >= 0.5);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongSignalFound,
    };
  }

  getFileExtension(): string {
    return "r";
  }

  registerProvider(monaco: any): void {
    const languageId = this.id; // 'r'

    // Monaco has built-in support for 'r'.
    if (
      !monaco.languages
        .getLanguages()
        .some((lang: any) => lang.id === languageId)
    ) {
      monaco.languages.register({ id: languageId });
    }

    // Formatting R code programmatically is complex.
    // Tools like styler or formatR are typically used.
    // For a scratchpad, relying on Monaco's built-in indentation or no formatter might be best.
  }
}

// Create and register the detector
const rDetector = new RFormatDetector();
formatRegistry.register(rDetector);

// Export for backward compatibility (optional)
export const registerRProvider = (monaco: any) => {
  rDetector.registerProvider(monaco);
};
