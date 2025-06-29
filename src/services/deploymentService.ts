const deploymentUrl = terraformResult.output
  ? this.extractDeploymentUrl(terraformResult.output)
  : null; 