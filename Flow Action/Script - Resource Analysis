(function(inputs, outputs) {
    
    // 1. Instantiate the V2 Engine
    var analyzer = new global.ResourceVarianceAnalyzerV2();

    // 2. Invoke the V2 Health Analysis
    var results = analyzer.analyzeProjectHealthV2(
        inputs.projectSysId, 
        inputs.lookbackWeeks, 
        inputs.pctThreshold
    );

    // 3. Set the Outputs
    // We pass the full object {parameters: {}, project_data: []}
    outputs.project_health_json = JSON.parse(JSON.stringify(results));

    // 4. Set the Logic Flag
    // In V2, we must check the length of the nested 'project_data' array
    var anomalyCount = (results.project_data) ? results.project_data.length : 0;
    outputs.has_anomalies = (anomalyCount > 0);

    // 5. Hardened Debugging
    if (analyzer.DEBUG) {
        gs.info("[ResourceVarianceAnalyzer] Flow Action: Found anomalies for " + anomalyCount + " projects.");
        if (results.parameters && results.parameters.message) {
            gs.info("[ResourceVarianceAnalyzer] Parameter Note: " + results.parameters.message);
        }
    }

})(inputs, outputs);
