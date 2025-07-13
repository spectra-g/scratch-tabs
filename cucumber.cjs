/**
 * @type {import('@cucumber/cucumber').IConfiguration}
 */
module.exports = {
  default: {
    paths: ['tests/e2e/features/**/*.feature'],
    require: ['dist/e2e/steps/**/*.cjs', 'dist/e2e/support/**/*.cjs'],
    format: [
      'summary',
      'progress-bar',
      ['html', 'reports/cucumber-report.html'],
    ],
  },
}; 