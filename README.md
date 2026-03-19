# ServiceNow SPM Project Resource Variance Analyzer (v2.1)

An automated "Atomic" analysis engine designed to identify persistent resource utilization trends and delivery risks at the project task level.

## 1. Methodology: "Atomic" Analysis
The analyzer operates at the most granular level of the ServiceNow Strategic Planning Workspace: the **Task-Resource Assignment**. It evaluates performance by comparing two primary data sources within a specific, bounded lookback window.

### Data Sources
* **Planned Hours:** Aggregated from the `resource_allocation_daily` table (using `date` and `hours` fields).
* **Actual Hours:** Aggregated from submitted/approved/processed `time_card` entries (using `week_starts_on` and `total` fields).
> **Note:** The v2 engine includes 'submitted' timesheets, to avoid false positives caused by tardy timesheet approvals.

### The Variance Formula
For every week in the analysis window, the system calculates the **Variance Percentage ($vPct$):**

$$vPct = \left( \frac{\text{Actual Hours} - \text{Planned Hours}}{\text{Planned Hours}} \right) \times 100$$

---

## 2. Trend Filtering & Noise Reduction
To ensure insights are actionable and "noise-free," the engine applies a triple-filter logic before flagging an anomaly.

### Filter 1: The Consistency Check
A single "bad week" (where variance exceeds the threshold) is ignored. The system requires a minimum number of bad weeks (default: **2**) within the lookback period to consider the data points a potential trend.

### Filter 2: The Directional Check
Even with multiple bad weeks, a resource is only flagged if **75%** of those weeks move in the same direction. This prevents flagging resources who are simply shifting work between weeks but remaining balanced overall.

### Filter 3: The Net Period Balance (Smoothing)
This filter caters to "Allocation Smoothing" scenarios (e.g., front-loading work). If the **Total Actual Hours** for the entire lookback period match the **Total Planned Hours** (within the tolerance threshold), the anomaly is suppressed, even if individual weeks were inconsistent.
>*Example*: If a user is planned for 10 hours/week over 4 weeks (Total 40) and they log all 40 hours in Week 1, the engine will recognize that the Net Variance is 0% and will not flag the user as an anomaly.

---

## 3. Status Labels
When a trend passes all filters, it is assigned a definitive status:

* **📉 Persistent Over-allocation:** The resource is consistently logging significantly fewer hours than planned. This indicates Unused Capacity or a Schedule Delay (work is not being performed).
* **📈 Persistent Under-allocation:** The resource is consistently logging more hours than planned. This indicates a potential Burnout Risk or a Budget Overrun.

---

## 4. Technical Specification: Inputs & Outputs

This engine is designed to be invoked by **Flow Designer**, **Scheduled Jobs**, or **Agentic AI (Now Assist)**.

### Script Include Inputs
The `analyzeProjectHealthV2` method accepts the following parameters:

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `projectSysId` | String | null | Optional. Limit analysis to a specific project. |
| `lookbackWeeks`| Integer| 4 | Number of weeks to analyze (Min: 2). |
| `pctThreshold` | Integer| 20 | Variance % to trigger a "bad week" (Min: 10). |

### Output JSON Schema
The engine returns a structured JSON object. The `project_data` array is designed to be mapped to a ServiceNow `Array.Object` for use as Data Pills in Flow Designer.

```json
{
  "parameters": {
    "lookback_weeks_used": 4,
    "pct_threshold_used": 20,
    "message": "String describing any auto-adjustments to minimums"
  },
  "project_data": [
    {
      "project_number": "PRJXXXXX",
      "project_name": "Example Project",
      "pm_name": "Project Manager Name",
      "pm_email": "pm@example.com",
      "remediation_link": "https://<instance>.service-now.com/...",
      "anomalies": [
        {
          "task_number": "PRJTASKXXXXX",
          "task_name": "Task Description",
          "user_name": "Resource Name",
          "status": "Persistent Over-allocation",
          "total_planned": "40.0",
          "total_actual": "55.5",
          "variance_pct": "38.8%"
        }
      ]
    }
  ]
}
```

---

## 5. Usage in Agentic Workflows
This code is optimized for **Now Assist**. By defining the `project_data` structure in the Flow Action's Output, the LLM can:
1. Identify the project in context.
2. Dynamically set the `lookbackWeeks` based on user request.
3. Summarize the "Top 10" anomalies for the Project Manager.
4. Provide the `remediation_link` as a direct Call to Action.

---

### Compatibility
This logic is compatible with the **ServiceNow Australia/Zurich** resource model. It relies on the presence of the `resource_allocation_daily` table, which is the cornerstone of the new SPM resource experience.
