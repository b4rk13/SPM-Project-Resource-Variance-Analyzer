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


## Conversational Settings
Skill definition for use by a Now Assist AI Agent

### General Settings
- [X] *Is conversational*
- *Action skill name*: Project Resource Variance Analyzer
- *Action skill description*: Identifies persistent over/under-utilization at the task level for a given project. Returns a JSON array with raw results, and an HTML formatted version that can be used for email.
- *Assistants where action is discoverable*: Now Assist Panel - Platform, Now Assist in Virtual Agent, Now Assist Panel - Developer
- *Roles which can access this*: project_manager, portfolio_manager, it_pps_admin

### Inputs and Outputs
**Conversational inputs**
1. *Project SysID*
    - Describe this input: Project SysId (GUID)
    - Default value:
2. *Lookback Weeks*
    - Describe this input: Number of weeks to look back for the analysis. Default is 4, minimum is 2.
    - Default value: 4
3. *Percent Variance Threshold*
    - Describe this input: Percentage variance threshold to flag a "bad week". Default is 20, minimum is 10.
    - Default value: 20

**Conversational outputs**
1. *Has Anomalies*
    - Describe this output: Boolean flag to indicate whether any anomalies were found
    - Default value: false
2. *Resource Variances*
    - Describe this output: JSON array with parameters, project details and anomalies found. JSON schema: {"parameters": {"lookback_weeks_used": 4,"pct_threshold_used": 20,"message": "String describing any auto-adjustments to minimums"},"project_data": [{"project_number": "PRJXXXXX","project_name": "Example Project","pm_name": "Project Manager Name","pm_email": "pm@example.com","remediation_link": "https://<instance>.service-now.com/...","anomalies": [{"task_number": "PRJTASKXXXXX","task_name": "Task Description","user_name": "Resource Name","status": "Persistent Over-allocation","total_planned": "40.0","total_actual": "55.5","variance_pct": "38.8%"}]}]}
3. *Email Body*
    - Describe this output: An HTML formatted representation of results that can be uses as a presentation layer, e.g. email content
    - Default value: 

### Advanced Settings
- [X] *Include in discovery*
- [X] *Include in list of topics*
- [ ] *Promote skill*: false
- [X] *Use autonomous mode*: true
- [X] *Show errors from subfloss and actions*: true
- *Channels*: All default channels
