import { App, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import {
  AwsProvider,
  s3,
  iam,
  codepipeline,
  codebuild,
} from '@cdktf/provider-aws';

class PipelineStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, 'AWS', {
      region: 'eu-west-2',
    });

    // Artifact bucket
    const artifactBucketName = 'codepipeline-eu-west-2-919922704011';

    // CodeBuild IAM Role
    const pipelineRoleArn = 'arn:aws:iam::567404226201:role/service-role/gateway_automation';

    // CodeBuild project
    const buildProject = new codebuild.CodebuildProject(this, 'BuildProject', {
      name: 'cdktf-build-project',
      serviceRole: 'arn:aws:iam::567404226201:role/service-role/gateway_automation',
      source: {
        type: 'GITHUB',
        location: 'https://github.com/harsha81860/cdktf-pipeline',
        buildspec: 'buildspec.yml',
      },
      artifacts: {
        type: 'NO_ARTIFACTS',
      },
      environment: {
        computeType: 'BUILD_GENERAL1_SMALL',
        image: 'aws/codebuild/standard:7.0',
        type: 'LINUX_CONTAINER',
      },
    });

    // Pipeline IAM Role
const pipelineRoleArn = 'arn:aws:iam::567404226201:role/service-role/codebuild-stage_gateway_automation-service-role';

    // CodePipeline
    new codepipeline.Codepipeline(this, 'Pipeline', {
      name: 'cdktf-demo-pipeline',
      roleArn: pipelineRoleArn,
      artifactStore: {
        location: artifactBucketName,
        type: 'S3',
      },
      stage: [
        {
          name: 'Source',
          action: [
            {
              name: 'Source',
              category: 'Source',
              owner: 'ThirdParty',
              provider: 'GitHub',
              version: '1',
              outputArtifacts: ['source_output'],
              configuration: {
                Owner: 'harsha81860',
                Repo: 'cdktf-pipeline',
                Branch: 'main',
                OAuthToken: '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',
              },
              runOrder: 1,
            },
          ],
        },
        {
          name: 'Build',
          action: [
            {
              name: 'Build',
              category: 'Build',
              owner: 'AWS',
              provider: 'CodeBuild',
              inputArtifacts: ['source_output'],
              outputArtifacts: ['build_output'],
              version: '1',
              configuration: {
                ProjectName: buildProject.name,
              },
              runOrder: 1,
            },
          ],
        },
      ],
    });
  }
}

const app = new App();
new PipelineStack(app, 'CdktfPipelineStack');
app.synth();
