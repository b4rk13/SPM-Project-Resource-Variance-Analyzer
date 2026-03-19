/**
 * ServiceNow SPM Resource Variance Analyzer v2
 * Purpose: Identifies persistent over/under-utilization at the task level with tunable parameters.
 * Release: Compatible with Zurich/Australia (New Resource Model)
 */
var ResourceVarianceAnalyzerV2 = Class.create();
ResourceVarianceAnalyzerV2.prototype = {
    initialize: function() {
        this.DEBUG = true;
        this.TEST_MODE = false; // Limits analysis to 5 projects for testing
    },

    /**
     * Executes the task-granular variance analysis with tunable parameters.
     * @param {string} projectSysId - (Optional) Limit analysis to a specific project.
     * @param {integer} lookbackWeeks - (Optional) Number of weeks to look back (e.g., 4). If below minimum, minimum is used.
     * @param {integer} pctThreshold - (Optional) Percentage variance threshold to flag a "bad week" (e.g., 20). If below minimum, minimum is used.
     * @return {Object} Structured JSON output with analysis parameters and results array.
     */
    analyzeProjectHealthV2: function(projectSysId, lookbackWeeks, pctThreshold) {
        // --- 1. DEFINE & VALIDATE TUNABLE PARAMETERS ---
        // Hardcoded Safety Minimums
        this._MIN_LOOKBACK_WEEKS = 2; // Analysis requires at least 2 weeks of history
        this._MIN_PCT_THRESHOLD = 10;   // Noise reduction threshold (variance < 10% not flagged)
        this._MIN_BAD_WEEKS = 2;      // Consistency required (at least 2 bad weeks over lookback)
        this._MIN_DIRECTIONAL_RATIO = 0.75; // Trend required (75% bad weeks in same direction)

        var parametersUsed = {
            requested_lookback_weeks: lookbackWeeks,
            requested_pct_threshold: pctThreshold
        };
        var message = "";
        var lookbackWeeksUsed = lookbackWeeks;
        var pctThresholdUsed = pctThreshold;

        // Validation & Message Accumulation for low/missing inputs
        if (!lookbackWeeksUsed || lookbackWeeksUsed < this._MIN_LOOKBACK_WEEKS) {
            lookbackWeeksUsed = this._MIN_LOOKBACK_WEEKS;
            message += "Project Manager requested a lookback period of " + (lookbackWeeks || "null") + " weeks, which is below the safe minimum. We have used the minimum required lookback of " + this._MIN_LOOKBACK_WEEKS + " weeks for analysis stability. ";
        }
        if (!pctThresholdUsed || pctThresholdUsed < this._MIN_PCT_THRESHOLD) {
            pctThresholdUsed = this._MIN_PCT_THRESHOLD;
            message += "Project Manager requested a variance tolerance of " + (pctThreshold || "null") + "%, which is below the safe minimum for noise reduction. We have used the minimum tolerance of " + this._MIN_PCT_THRESHOLD + "% to ensure insights are truly actionable. ";
        }

        // Store validated parameters for output description
        parametersUsed.lookback_weeks_used = lookbackWeeksUsed;
        parametersUsed.pct_threshold_used = pctThresholdUsed;
        parametersUsed.message = message.trim();

        // If DEBUG is on, log the validated parameters
        if (this.DEBUG) gs.info("[ResourceVarianceAnalyzerV2] Analysis initiated with Lookback: " + lookbackWeeksUsed + " weeks, Tolerance: " + pctThresholdUsed + "%");

        // --- 2. PERFORM BOUNDED ANALYSIS ---
        // Calculate Bounded Date Window based on validated/minimum Lookback
        var gdt = new GlideDateTime();
        var windowEnd = gdt.getDate(); // Window ends today
        gdt.addWeeksLocalTime(lookbackWeeksUsed * -1);
        var dow = gdt.getDayOfWeekLocalTime();
        var offset = (dow == 7) ? 0 : dow; // Saturday start normalization (assuming 7=Sat)
        gdt.addDaysLocalTime(offset * -1);
        var windowStart = gdt.getDate();

        if (this.DEBUG) gs.info("[ResourceVarianceAnalyzerV2] Look-back bounded windowStart: " + windowStart + ", windowEnd: " + windowEnd);

        var projectResultsArray = [];
        var grProj = new GlideRecord('pm_project');
        grProj.addActiveQuery();
        if (projectSysId) grProj.addQuery('sys_id', projectSysId);
        if (this.TEST_MODE) grProj.setLimit(5);
        grProj.query();

        while (grProj.next()) {
            if (this.DEBUG) gs.info("[ResourceVarianceAnalyzerV2] Analyzing Project: " + grProj.number);
            
            // Collect project & child task IDs recursively
            var projectTaskIds = this._getProjectTaskIds(grProj.getUniqueValue());
            
            // 2. Collect Bounded Weekly Data with correct schema & validated parameters
            // Passed lookback and threshold down for calculation
            var projectAnomalies = this._getProjectResourceData(projectTaskIds, windowStart, windowEnd, pctThresholdUsed);
            
            if (this.DEBUG) gs.info("[ResourceVarianceAnalyzerV2] Project Anomaly Data (Internal): " + JSON.stringify(projectAnomalies, null, 2));
            
            if (projectAnomalies.length > 0) {
                // Return original project structure, variance is already stringified %
                projectResultsArray.push({
                    project_number: grProj.getValue('number'),
                    project_name: grProj.getValue('short_description'),
                    pm_email: grProj.project_manager ? grProj.project_manager.email.toString() : "",
                    pm_name: grProj.project_manager.getDisplayValue() || "No PM Assigned",
                    remediation_link: this._generateResourceWorkspaceLink(grProj.getUniqueValue()),
                    anomalies: projectAnomalies
                });
            }
        }

        // --- 3. CONSTRUCT STRUCTURED OUTPUT ---
        var output = {
            parameters: parametersUsed,
            project_data: projectResultsArray // Contains array of project objects with nested anomalies
        };

        if (this.DEBUG) gs.info("[ResourceVarianceAnalyzerV2] Final Output: " + JSON.stringify(output, null, 2));
        return output;
    },

    _getProjectTaskIds: function(projectId) {
        var ids = [projectId];
        var grTask = new GlideRecord('pm_project_task');
        grTask.addQuery('top_task', projectId);
        grTask.query();
        while (grTask.next()) {
            ids.push(grTask.getUniqueValue());
        }
        return ids;
    },

    /**
     * Aggregates daily allocations & time cards weekly, then calculates variance and trend.
     * @param {Array} taskIds - Array of task SysIDs to analyze.
     * @param {string} windowStart - Validated lookback window start date.
     * @param {string} windowEnd - Validated lookback window end date.
     * @param {integer} pctThreshold - Validated variance percentage tolerance.
     * @return {Array} Atomic anomaly data including task, resource, status, variance %.
     */
    _getProjectResourceData: function(taskIds, windowStart, windowEnd, pctThreshold) {
        var anomalies = [];
        var taskUserWeeklyStats = {}; // Composite Key: taskId + "|" + userId
        
        // 1. Collect Planned (Daily) - Use CORRECT schema: 'date' and 'hours'
        var grDaily = new GlideRecord('resource_allocation_daily');
        grDaily.addQuery('task', 'IN', taskIds); 
        grDaily.addQuery('date', '>=', windowStart); 
        grDaily.addQuery('date', '<=', windowEnd); // Preserve bounded query fix
        grDaily.query();

        while (grDaily.next()) {
            var dateVal = grDaily.getValue('date');
            var weekKey = this._getWeekKey(dateVal);
            if (!weekKey) continue;

            var userId = grDaily.getValue('user');
            var key = grDaily.getValue('task') + "|" + userId;
            
            this._initTaskUserWeek(taskUserWeeklyStats, key, weekKey);
            
            // Use correct schema: 'hours', not 'allocated_hours'
            taskUserWeeklyStats[key][weekKey].planned += parseFloat(grDaily.getValue('hours') || 0);
        }

        // 2. Collect Actuals (Time Cards) - Stays same
        var grTC = new GlideRecord('time_card');
        grTC.addQuery('task', 'IN', taskIds);
        grTC.addQuery('week_starts_on', '>=', windowStart);
        grTC.addQuery('week_starts_on', '<=', windowEnd); // Preserve bounded query fix
        grTC.addQuery('state', 'IN', 'approved,processed');
        grTC.query();

        while (grTC.next()) {
            var userId = grTC.getValue('user');
            var key = grTC.getValue('task') + "|" + userId;
            var weekKey = grTC.getValue('week_starts_on');
            
            this._initTaskUserWeek(taskUserWeeklyStats, key, weekKey);
            taskUserWeeklyStats[key][weekKey].actual += parseFloat(grTC.getValue('total') || 0);
        }

        // 3. Evaluation Logic with validated percentage tolerance passed down
        for (var compositeKey in taskUserWeeklyStats) {
            var ids = compositeKey.split("|");
            // Pass pctThreshold to evaluateTrend for variance check
            var trend = this._evaluateTrend(taskUserWeeklyStats[compositeKey], pctThreshold);
            
            if (this.DEBUG) gs.info("[ResourceVarianceAnalyzerV2] taskUserWeeklyStat trend internal: " + JSON.stringify(trend, null, 2));
            
            if (trend.isAnomaly) {
                var taskDetails = this._getTaskDetails(ids[0]);
                anomalies.push({
                    task_number: taskDetails.number,
                    task_name: taskDetails.name,
                    user_name: this._getUserName(ids[1]),
                    status: trend.label,
                    total_planned: trend.totalPlanned.toFixed(1),
                    total_actual: trend.totalActual.toFixed(1),
                    variance_pct: trend.totalVariance.toFixed(1) + "%" // variance % as string preserve
                });
            }
        }
        return anomalies;
    },

/**
     * Checks directional trend of bad weeks AND validates net period balance.
     * @param {Object} weeksMap - Dictionary of weekly data.
     * @param {integer} pctThreshold - Validated percentage threshold tolerance.
     * @return {Object} Dictionary with anomaly flag, directional label, and totals.
     */
    _evaluateTrend: function(weeksMap, pctThreshold) {
        var badWeeks = 0, overCount = 0, underCount = 0, sumP = 0, sumA = 0;
        
        for (var wk in weeksMap) {
            var p = weeksMap[wk].planned, a = weeksMap[wk].actual;
            sumP += p; sumA += a;
            
            if (p === 0 && a === 0) continue;
            var vPct = (p > 0) ? ((a - p) / p) * 100 : (a > 0 ? 100 : 0);
            
            if (Math.abs(vPct) >= pctThreshold) {
                badWeeks++;
                if (vPct > 0) underCount++; else overCount++;
            }
        }

        // --- NEW: NET PERIOD BALANCE LOGIC ---
        // Calculate the variance for the entire lookback window combined
        var totalVariance = (sumP > 0) ? ((sumA - sumP) / sumP) * 100 : (sumA > 0 ? 100 : 0);
        
        var isAnomaly = false;
        var label = "Balanced";

        // Step 1: Check if the weekly trend exists
        if (badWeeks >= this._MIN_BAD_WEEKS) {
            if ((overCount / badWeeks) >= this._MIN_DIRECTIONAL_RATIO) {
                isAnomaly = true;
                label = "Persistent Over-allocation";
            } else if ((underCount / badWeeks) >= this._MIN_DIRECTIONAL_RATIO) {
                isAnomaly = true;
                label = "Persistent Under-allocation";
            }
        }

        // Step 2: The "Net Balance" Kill-Switch
        // If the total hours for the period "match" (within tolerance), suppress the anomaly
        if (isAnomaly && Math.abs(totalVariance) < pctThreshold) {
            if (this.DEBUG) gs.info("[ResourceVarianceAnalyzer] Suppressing anomaly due to Net Period Balance. Total Planned: " + sumP + ", Total Actual: " + sumA);
            isAnomaly = false;
            label = "Balanced (Net Period)";
        }

        return { 
            isAnomaly: isAnomaly, 
            label: label, 
            totalPlanned: sumP, 
            totalActual: sumA, 
            totalVariance: totalVariance 
        };
    },

    _getWeekKey: function(dateStr) {
        if (!dateStr) return null;
        var gdt = new GlideDateTime(dateStr);
        var day = gdt.getDayOfWeekLocalTime();
        var offset = (day == 7) ? 0 : day; // assuming 7=Sat
        gdt.addDaysLocalTime(offset * -1);
        return gdt.getDate().toString();
    },

    _getTaskDetails: function(taskId) {
        var gr = new GlideRecord('task');
        return gr.get(taskId) ? { number: gr.getValue('number'), name: gr.getValue('short_description') } : { number: "N/A", name: "Unknown" };
    },

    _generateResourceWorkspaceLink: function(projectId) {
        // Link to New Resource Board URI for Zurich/Australia release
        return "https://" + gs.getProperty('instance_name') + ".service-now.com/now/workspace/rm/resource_board/project_resource-" + projectId + '-pm_project';
    },

    _initTaskUserWeek: function(obj, key, wk) {
        if (!obj[key]) obj[key] = {};
        if (!obj[key][wk]) obj[key][wk] = { planned: 0, actual: 0 };
    },

    _getUserName: function(uId) {
        var gr = new GlideRecord('sys_user');
        return gr.get(uId) ? gr.getDisplayValue() : "Unknown";
    },

    type: 'ResourceVarianceAnalyzerV2'
};
