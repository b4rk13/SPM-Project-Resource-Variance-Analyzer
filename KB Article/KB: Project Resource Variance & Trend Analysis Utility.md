# Knowledge Article: Project Resource Variance & Trend Analysis Utility

**Article ID:** KB0011803  
**Category:** Projects & Portfolios
**Assigned Topic:** SPM > Project and Portfolio Management
**Version:** 2.0

## Introduction
In high-velocity project environments, understanding the gap between resource plans and actual execution is critical for maintaining budget health and delivery timelines. This article outlines the logic behind the **Project Resource Variance Analyzer**, an automated engine designed to identify persistent resource utilization trends at the individual project task level. Unlike simple "one-off" alerts, this engine utilizes a weighted trend-filtering approach to distinguish between minor weekly fluctuations and systemic delivery risks, providing Project Managers with actionable insights to remediate schedule slippage before it impacts milestones.

---

## 1. The Core Methodology: "Atomic" Analysis
The analyzer operates at the most granular level: the **Task-Resource Assignment**. It evaluates performance by comparing two primary ServiceNow data sources within a specific lookback window (defaulting to 4 weeks).

### Data Sources
* **Planned Hours:** Derived from the `resource_allocation_daily` table. This represents the granular effort a Resource Manager or PM has "booked" for a user on a specific task.
* **Actual Hours:** Derived from submitted and approved `time_card` entries. This represents the "ground truth" of effort logged by the resource.
> **Note:** The v2 engine includes 'submitted' timesheets, to avoid false positives caused by tardy timesheet approvals.

### The Variance Formula
For every week in the analysis window, the system calculates the **Variance Percentage ($vPct$):**

$$vPct = \left( \frac{\text{Actual Hours} - \text{Planned Hours}}{\text{Planned Hours}} \right) \times 100$$

---

## 2. Trend Filtering: Identifying the "Signal"
To ensure Project Managers are not overwhelmed with "noise," the engine applies a **Triple-Filter Logic** before flagging an anomaly.


### Filter 1: The Consistency Check
A single "bad week" (where variance exceeds the threshold, e.g., 20%) is ignored. The system requires a minimum number of bad weeks (default is **2 weeks**) within the lookback period to consider the data points a potential trend.

### Filter 2: The Directional Check
The system evaluates the **Directional Consistency**. Even if a resource has multiple bad weeks, they are only flagged if **75%** of those weeks move in the same direction (i.e., they are consistently *over* or consistently *under*). This prevents flagging resources who are simply shifting work between weeks but remaining balanced overall.

### Filter 3: Net Period Balance Check
To prevent "false positives" caused by front-loading or back-loading work, the engine performs a final Net Balance check. Even if individual weeks are inconsistent, if the Total Actual Hours for the entire lookback period are within the defined tolerance of the Total Planned Hours, the anomaly is suppressed.
>*Example*: If a user is planned for 10 hours/week over 4 weeks (Total 40) and they log all 40 hours in Week 1, the engine will recognize that the Net Variance is 0% and will not flag the user as an anomaly.

---

## 3. Understanding the Status Labels
When a trend passes both filters, it is assigned one of two status labels in your report:

* **📉 Persistent Over-allocation:** The resource is consistently logging significantly fewer hours than planned. This indicates **Unused Capacity**, a **Schedule Delay** (work is not being performed), or **Missing timesheet submissions**.
* **📈 Persistent Under-allocation:** The resource is consistently logging more hours than planned. This indicates a potential **Burnout Risk** or a **Budget Overrun**.

---

## 4. Analysis Deliver Methods
### Weekly Report (Email)
The analysis is scheduled every Monday morning, for all active projects in current year portfolios. The analysis is delivered in the form of an email with the detailed anomaly results. This scheduled analysis uses a 4 week lookback period, and 20% variance tolerance for 'bad' weeks.

### On-Demand Analysis (AI Agent)


Project Managers can invoke this analysis on-demand via the **Now Assist AI Agent** by requesting a "Project Resource Assignment Review." In the v2 engine, users can manually tune the following parameters via the agent:

* **Lookback Period:** How many weeks into the past the system should look (Minimum: 2 weeks).
* **Variance Tolerance:** The percentage threshold required to trigger a "bad week" (Minimum: 10%).

> **Note:** If requested parameters fall below the safety minimums, the system will automatically default to the minimums to maintain data integrity and reduce false positives.

---

## 5. Remediation Path
The root cause of flagged anomalies should be investigated and addressed. Potential root causes may include:

1. Genuine over- or under-allocations for the task.
2. Competing priorities. Resources may be assigned to multiple concurrent projects, resulting in the inability to work the assigned hours.
3. Missing time sheets. Anomalies may also be cause by resources not submitting timesheets in a timely manner.

Every analyzed project includes a direct deep-link to the **Project's Resource Board** (in the Resource Management Workspace). 

> **The Goal:** PMs should use this link to either adjust the **Planned Hours** to match reality or discuss **Priority** with the resource to ensure Actuals align with the Project Schedule.

---

### Knowledge Check: Utilization vs. Delivery Risk
While this analysis identifies **Utilization Trends** (Historical), it serves as the foundation for **Delivery Risk** (Forward-looking). If a resource is consistently under-allocating on a critical path task, the PM must assume the task finish date is at risk, even if the task status is currently "Green."
