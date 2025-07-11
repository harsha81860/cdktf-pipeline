import { App, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import {
  AwsProvider,
  codepipeline,
  codebuild,
} from '@cdktf/provider-aws';

class PipelineStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, 'AWS', {
      region: 'eu-west-2',
    });
    const artifactBucketName = 'codepipeline-eu-west-2-919922704011';

    const codeBuildRoleArn = 'arn:aws:iam::567404226201:role/service-role/gateway_automation';

    const buildProject = new codebuild.CodebuildProject(this, 'BuildProject', {
      name: 'cdktf-build-project',
      serviceRole: codeBuildRoleArn,
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

    const pipelineRoleArn = 'arn:aws:iam::567404226201:role/service-role/codebuild-stage_gateway_automation-service-role';

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
                OAuthToken: process.env.GITHUB_TOKEN ?? '',
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
              outputArtifacts: [],
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
