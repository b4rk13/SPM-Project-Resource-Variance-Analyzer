# Contributing to SPM Resource Variance Analyzer

Thank you for your interest in improving the Resource Variance Analyzer. This project was born out of a need for "Atomic" resource visibility in the Australia/Zurich releases.

## How to Contribute
1. **Report Bugs:** Open an issue describing the behavior and provide the `[ResourceVarianceAnalyzer]` logs from your system.
2. **Feature Requests:** We are currently looking to expand the "Walk" phase of the maturity model (Schedule Integrity).
3. **Pull Requests:** - Ensure all logic remains compatible with the `resource_allocation_daily` table schema.
    - Maintain the "Net Period Balance" logic to ensure noise reduction for front-loaded tasks.
    - Update the version number in the Script Include header.

## Development Standards
- **Naming Conventions:** Use camelCase for variables and PascalCase for Class names.
- **Logging:** All logs must be prefixed with `[ResourceVarianceAnalyzer]` and respect the `this.DEBUG` flag.
- **Agentic Compatibility:** Any changes to the JSON output must be reflected in the JSON Schema section of the README.md to avoid breaking Now Assist workflows.

## Questions?
Reach out via the GitHub Issues tab for architectural discussions.
