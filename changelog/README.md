# Scratch Tabs Changelog Generator

This Node.js script generates the changelog HTML content for the Scratch Tabs landing page from a YAML configuration file.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

## Usage

1. Edit `releases.yml` to add new releases or modify existing ones
2. Run the generator:
   ```bash
   npm run generate
   # or
   node generate.js
   ```

## YAML Structure

The `releases.yml` file contains:

- `config.max_versions`: Number of versions to display (default: 10)
- `releases`: Array of release objects

### Release Object Structure

```yaml
- version: "1.0.0"           # Version number (string)
  type: "latest"             # Release type: latest, beta, alpha
  date: "2024-12-15"         # Release date (YYYY-MM-DD)
  headline: "🎉 Initial Public Release"  # Headline with emoji
  description: "Description of the release..."
  categories:                # Array of change categories
    - name: "✨ New Features" # Category name with emoji
      changes:               # Array of changes in this category
        - "Feature 1 description"
        - "**Bold text:** Feature 2 with bold formatting"
```

## Features

- ✅ Generates HTML content for changelog.html
- ✅ Updates version number in Welcome screen component
- ✅ Configurable number of versions to display
- ✅ Support for different release types (latest, beta, alpha)
- ✅ Markdown-to-HTML conversion (supports **bold** text)
- ✅ Professional GitHub-style layout
- ✅ Mobile-responsive design

## File Structure

```
changelog/
├── README.md          # This file
├── package.json       # Node.js dependencies
├── releases.yml       # Changelog data (YAML)
└── generate.js        # Generator script
```

## Adding a New Release

1. Open `releases.yml`
2. Add a new release object at the **top** of the releases array
3. Follow the existing structure and format
4. Run `npm run generate` to update the HTML files
5. Commit the changes

## Notes

- The script automatically limits the display to the configured `max_versions`
- The latest release should always be first in the array
- Version numbers should follow semantic versioning
- Use emojis in headlines and category names for visual appeal
- Support for **bold** text in change descriptions (automatically converts `**text**` to HTML)