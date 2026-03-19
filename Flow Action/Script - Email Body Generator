(function(inputs, outputs) {
    // v2 Schema: inputs.project_data is the full object { parameters: {}, project_data: [] }
    var rootData = inputs.project_data;
    
    // Safety check for v2 structure
    if (!rootData || !rootData.project_data) {
        outputs.email_body = "<p style='font-family: sans-serif;'>No resource data available for analysis.</p>";
        return;
    }

    var params = rootData.parameters || {};
    var projects = rootData.project_data; 
    var html = "";

    // 1. INTRODUCTORY SENTENCE & KB LINK
    html += "<div style='font-family: Arial, sans-serif; margin-bottom: 20px; color: #333; line-height: 1.5;'>";
    html += "This analysis was performed using a <b>" + (params.lookback_weeks_used || "4") + " week</b> lookback period ";
    html += "and a <b>" + (params.pct_threshold_used || "20") + "%</b> variance tolerance. ";
    html += "For a detailed explanation of the methodology and trend logic, please refer to the ";
    html += "<a href='https://adtprod.service-now.com/esc?id=kb_article&sysparm_article=KB0011803' style='color: #0061AA; text-decoration: none; font-weight: bold;'>Resource Analyzer Utility Article</a>.";
    html += "</div>";

    if (projects.length === 0) {
        html += "<p style='font-family: sans-serif;'>No resource anomalies identified for the selected projects during this period.</p>";
        outputs.email_body = html;
        return;
    }

    // 2. CALCULATE GLOBAL SUMMARY COUNTS
    var totalOver = 0;
    var totalUnder = 0;
    var projectCount = projects.length;

    projects.forEach(function(p) {
        var pAnomalies = p.anomalies || [];
        pAnomalies.forEach(function(a) {
            if (a.status && a.status.indexOf("Over") > -1) totalOver++;
            else if (a.status && a.status.indexOf("Under") > -1) totalUnder++;
        });
    });

    // 3. RENDER SUMMARY BANNER
    html += "<div style='font-family: Arial, sans-serif; background-color: #ffffff; border: 1px solid #d1dbe5; border-radius: 6px; padding: 15px; margin-bottom: 25px;'>";
    html += "<h3 style='margin: 0 0 10px 0; color: #1d2d3d; font-size: 16px;'>Portfolio Resource Health Summary</h3>";
    html += "<table style='width: 100%; border-collapse: collapse;'><tr>";
    html += "<td style='width: 33%; border-right: 1px solid #d1dbe5; text-align: center;'>";
    html += "<span style='display: block; font-size: 24px; font-weight: bold; color: #1d2d3d;'>" + projectCount + "</span>";
    html += "<span style='font-size: 11px; color: #666; text-transform: uppercase;'>Projects Analyzed</span></td>";
    html += "<td style='width: 33%; border-right: 1px solid #d1dbe5; text-align: center;'>";
    html += "<span style='display: block; font-size: 24px; font-weight: bold; color: #d9534f;'>" + totalOver + "</span>";
    html += "<span style='font-size: 11px; color: #666; text-transform: uppercase;'>Over-Allocated Trends</span></td>";
    html += "<td style='width: 34%; text-align: center;'>";
    html += "<span style='display: block; font-size: 24px; font-weight: bold; color: #0061AA;'>" + totalUnder + "</span>";
    html += "<span style='font-size: 11px; color: #666; text-transform: uppercase;'>Under-Allocated Trends</span></td>";
    html += "</tr></table></div>";

    // 4. RENDER PROJECT DETAILS (Loop)
    for (var i = 0; i < projects.length; i++) {
        var proj = projects[i];
        if (typeof proj === 'string' || !proj) continue;

        html += "<div style='font-family: Arial, sans-serif; border: 1px solid #dee2e6; border-radius: 6px; padding: 20px; margin-bottom: 30px; background-color: #ffffff;'>";
        html += "<h2 style='color: #1d2d3d; margin: 0 0 5px 0; font-size: 18px;'>" + (proj.project_number || "N/A") + ": " + (proj.project_name || "Unknown") + "</h2>";
        html += "<p style='color: #6c757d; margin: 0 0 20px 0; font-size: 13px;'><b>Project Manager:</b> " + (proj.pm_name || "Unassigned") + "</p>";
        
        html += "<table style='width: 100%; border-collapse: collapse; font-size: 13px; color: #333;'>";
        html += "<thead><tr style='background-color: #f8f9fa; border-bottom: 2px solid #dee2e6; text-align: left;'>";
        html += "<th style='padding: 12px 10px;'>Task</th>";
        html += "<th style='padding: 12px 10px;'>Resource</th>";
        html += "<th style='padding: 12px 10px;'>Status</th>";
        html += "<th style='padding: 12px 10px; text-align: right;'>Planned (h)</th>";
        html += "<th style='padding: 12px 10px; text-align: right;'>Actual (h)</th>";
        html += "<th style='padding: 12px 10px; text-align: right;'>Var %</th>";
        html += "</tr></thead><tbody>";

        var anomalies = proj.anomalies || [];
        for (var j = 0; j < anomalies.length; j++) {
            var ano = anomalies[j];
            var statusColor = (ano.status && ano.status.indexOf("Over") > -1) ? "#B22222" : "#0061AA";
            
            html += "<tr style='border-bottom: 1px solid #eee;'>";
            html += "<td style='padding: 12px 10px;'><b>" + (ano.task_number || "") + "</b><br/><span style='color:#777; font-size: 11px;'>" + (ano.task_name || "") + "</span></td>";
            html += "<td style='padding: 12px 10px;'>" + (ano.user_name || "") + "</td>";
            html += "<td style='padding: 12px 10px; color: " + statusColor + "; font-weight: bold;'>" + (ano.status || "") + "</td>";
            html += "<td style='padding: 12px 10px; text-align: right;'>" + (ano.total_planned || "0.0") + "</td>";
            html += "<td style='padding: 12px 10px; text-align: right;'>" + (ano.total_actual || "0.0") + "</td>";
            html += "<td style='padding: 12px 10px; text-align: right; font-weight: bold;'>" + (ano.variance_pct || "0%") + "</td>";
            html += "</tr>";
        }
        
        html += "</tbody></table>";

        if (proj.remediation_link) {
            html += "<div style='margin-top: 25px; text-align: right;'>";
            html += "<a href='" + proj.remediation_link + "' style='background-color: #0061AA; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 13px; display: inline-block;'>Adjust Resources in Workspace &rarr;</a>";
            html += "</div>";
        }
        
        html += "</div>"; 
    }

    outputs.email_body = html;
})(inputs, outputs);
