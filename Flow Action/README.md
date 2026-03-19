# Flow Action: SPM - Project Resource Variance Analyzer

## Inputs
- *Project SysId* {string} - SysId of the project to be analyzed
- *Lookback Weeks* {integer} - Number of weeks to look back [Default = 4] [Minimum = 2]
- *Percent Variance Threshold* {integer} - Percentage variance threshold to flag a 'bad week' [Default = 20] [Minimum = 10]

## Steps
1. **Script - Resource Analysis** - invokes the script include, passing in parameters. Step Outputs:
   - *project_health_json* {array.Object} - Object output from the script include with analysis results
   - *has_anomalies* {true/false} - Boolean indicator whether any anomalies were found
2. **Script - Email Body Generator** - Uses results object from previous step and generates HTML content for an email body. Step Output:
   - *email_body* {HTML} - styled HTML of the results, to be used as the body of an email to the Project Manager
  
## Outputs
- *has_anomalies* {true/false}
- *resource_variances* {JSON}
- *email_body* {HTML}
