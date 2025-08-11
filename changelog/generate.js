#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Configuration
const RELEASES_FILE = path.join(__dirname, 'releases.yml');
const CHANGELOG_HTML_FILE = path.join(__dirname, '..', 'landing', 'changelog.html');
const WELCOME_SCREEN_FILE = path.join(__dirname, '..', 'src', 'components', 'Welcome', 'WelcomeScreen.tsx');
const WELCOME_CONTENT_FILE = path.join(__dirname, '..', 'src', 'constants', 'welcomeContent.ts');

/**
 * Format date for display
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

/**
 * Generate badge HTML based on release type
 */
function generateBadge(type) {
  const badges = {
    latest: '<span class="badge latest">Latest</span>',
    beta: '<span class="badge beta">Beta</span>',
    alpha: '<span class="badge alpha">Alpha</span>',
    release: '<span class="badge release">Release</span>'
  };
  return badges[type] || '';
}

/**
 * Generate changelog entry HTML
 */
function generateChangelogEntry(release, index) {
  const isLatest = index === 0;
  const entryClass = release.type === 'latest' ? 'latest' : release.type;
  const headerSize = isLatest ? 'text-2xl' : 'text-xl';
  
  let html = `
          <!-- Version ${release.version} -->
          <div class="changelog-entry ${entryClass}">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <div class="flex items-center gap-3 mb-2 sm:mb-0">
                <h2 class="${headerSize} font-bold text-white">v${release.version}</h2>
                ${generateBadge(release.type)}
              </div>
              <span class="text-gray-400 text-sm">${formatDate(release.date)}</span>
            </div>
            <h3 class="text-lg font-semibold ${release.type === 'latest' ? 'text-blue-400' : (release.type === 'beta' || release.type === 'release') ? 'text-gray-300' : 'text-gray-400'} mb-4">${release.headline}</h3>
            <div class="changelog-content text-gray-300">
              <p class="mb-4">${release.description}</p>`;

  // Add categories and changes
  release.categories.forEach(category => {
    html += `
              
              <h4 class="text-white">${category.name}</h4>
              <ul class="list-disc">`;
    
    category.changes.forEach(change => {
      // Convert markdown bold (**text**) to HTML bold (<strong>text</strong>)
      const formattedChange = change.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html += `
                <li>${formattedChange}</li>`;
    });
    
    html += `
              </ul>`;
  });

  html += `
            </div>
          </div>`;

  return html;
}

/**
 * Generate the complete changelog HTML content
 */
function generateChangelogHTML(releases, maxVersions) {
  const releasesToShow = releases.slice(0, maxVersions);
  
  let html = `
          
          ${releasesToShow.map((release, index) => generateChangelogEntry(release, index)).join('\n')}

          <!-- Footer -->
          <div class="text-center pt-8 border-t border-gray-700">
            <p class="text-gray-400 text-sm mb-4">
              Want to suggest a feature or report a bug?
            </p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://github.com/spectra-g/scratch-tabs-feedback/issues" target="_blank"
                class="inline-flex items-center justify-center px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <use href="#icon-github"></use>
                </svg>
                Open GitHub Issue
              </a>
              <a href="https://discord.gg/HwsfpTzMVS" target="_blank"
                class="inline-flex items-center justify-center px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <use href="#icon-discord"></use>
                </svg>
                Join Discord
              </a>
            </div>
          </div>
          `;

  return html;
}

/**
 * Update the changelog.html file with new content
 */
function updateChangelogFile(changelogHTML) {
  try {
    const htmlContent = fs.readFileSync(CHANGELOG_HTML_FILE, 'utf8');
    
    // Find the changelog content section
    const startMarker = '<div class="max-w-4xl mx-auto">';
    const endMarker = '</div>\n      </div>\n    </section>\n\n    <!-- CTA Section -->';
    
    const startIndex = htmlContent.indexOf(startMarker);
    const endIndex = htmlContent.indexOf(endMarker);
    
    if (startIndex === -1 || endIndex === -1) {
      throw new Error('Could not find changelog content markers in HTML file');
    }
    
    const beforeContent = htmlContent.substring(0, startIndex + startMarker.length);
    const afterContent = htmlContent.substring(endIndex);
    
    const newContent = beforeContent + changelogHTML + afterContent;
    
    fs.writeFileSync(CHANGELOG_HTML_FILE, newContent, 'utf8');
    console.log('✅ Updated changelog.html successfully');
  } catch (error) {
    console.error('❌ Error updating changelog.html:', error.message);
    process.exit(1);
  }
}

/**
 * Update the version in WelcomeScreen component
 */
function updateWelcomeScreenVersion(latestVersion) {
  try {
    // Try to update the welcome content file first
    if (fs.existsSync(WELCOME_CONTENT_FILE)) {
      let content = fs.readFileSync(WELCOME_CONTENT_FILE, 'utf8');
      
      // Look for version pattern in the content
      const versionRegex = /(Version\s+)[\d.-]+/i;
      if (versionRegex.test(content)) {
        content = content.replace(versionRegex, `$1${latestVersion}`);
        fs.writeFileSync(WELCOME_CONTENT_FILE, content, 'utf8');
        console.log(`✅ Updated version to ${latestVersion} in welcomeContent.ts`);
      }
    }
    
    // Try to update the WelcomeScreen component
    if (fs.existsSync(WELCOME_SCREEN_FILE)) {
      let content = fs.readFileSync(WELCOME_SCREEN_FILE, 'utf8');
      
      // Look for version patterns in JSX
      const versionPattern = /(Version\s+)([\d.-]+[\$\d]*)/g;
      
      let updated = false;
      if (versionPattern.test(content)) {
        content = content.replace(versionPattern, `$1${latestVersion}`);
        updated = true;
      }
      
      if (updated) {
        fs.writeFileSync(WELCOME_SCREEN_FILE, content, 'utf8');
        console.log(`✅ Updated version to ${latestVersion} in WelcomeScreen.tsx`);
      } else {
        console.log('⚠️  No version pattern found in WelcomeScreen.tsx');
      }
    }
  } catch (error) {
    console.error('❌ Error updating welcome screen version:', error.message);
  }
}

/**
 * Main function
 */
function main() {
  try {
    console.log('🚀 Generating changelog from YAML...');
    
    // Check if js-yaml is available
    try {
      require.resolve('js-yaml');
    } catch (e) {
      console.error('❌ js-yaml module not found. Please install it with: npm install js-yaml');
      process.exit(1);
    }
    
    // Read and parse YAML file
    const yamlContent = fs.readFileSync(RELEASES_FILE, 'utf8');
    const data = yaml.load(yamlContent);
    
    if (!data || !data.releases || !Array.isArray(data.releases)) {
      throw new Error('Invalid YAML structure. Expected releases array.');
    }
    
    // Filter out draft releases (where draft: true)
    const allReleases = data.releases;
    const releases = allReleases.filter(release => !release.draft);
    const draftCount = allReleases.length - releases.length;
    
    const maxVersions = data.config?.max_versions || 10;
    
    if (releases.length === 0) {
      throw new Error('No releases found in YAML file');
    }
    
    if (draftCount > 0) {
      console.log(`📋 Found ${allReleases.length} total releases (${draftCount} drafts excluded), showing latest ${Math.min(releases.length, maxVersions)}`);
    } else {
      console.log(`📋 Found ${releases.length} releases, showing latest ${Math.min(releases.length, maxVersions)}`);
    }
    
    // Generate changelog HTML
    const changelogHTML = generateChangelogHTML(releases, maxVersions);
    
    // Update changelog.html
    updateChangelogFile(changelogHTML);
    
    // Update version in welcome screen
    const latestVersion = releases[0].version;
    updateWelcomeScreenVersion(latestVersion);
    
    console.log('🎉 Changelog generation completed successfully!');
    console.log(`📝 Latest version: ${latestVersion}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Check if running as script
if (require.main === module) {
  main();
}

module.exports = {
  main,
  generateChangelogHTML,
  updateChangelogFile,
  updateWelcomeScreenVersion
};