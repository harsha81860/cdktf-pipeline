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
      region: 'us-east-1',
    });

    // Artifact bucket
    const artifactBucket = new s3.S3Bucket(this, 'ArtifactBucket', {
      bucketPrefix: 'cdktf-pipeline-artifacts-',
    });

    // CodeBuild IAM Role
    const cbRole = new iam.IamRole(this, 'CodeBuildRole', {
      name: 'codebuild-service-role',
      assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'codebuild.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          },
        ],
      }),
    });

    new iam.IamRolePolicyAttachment(this, 'CBPolicyAttach', {
      role: cbRole.name,
      policyArn: 'arn:aws:iam::aws:policy/AWSCodeBuildDeveloperAccess',
    });

    // CodeBuild project
    const buildProject = new codebuild.CodebuildProject(this, 'BuildProject', {
      name: 'cdktf-build-project',
      serviceRole: cbRole.arn,
      source: {
        type: 'GITHUB',
        location: 'https://github.com/your-org/your-repo.git',
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
    const pipelineRole = new iam.IamRole(this, 'PipelineRole', {
      name: 'codepipeline-service-role',
      assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'codepipeline.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          },
        ],
      }),
    });

    new iam.IamRolePolicyAttachment(this, 'PipelinePolicyAttach', {
      role: pipelineRole.name,
      policyArn: 'arn:aws:iam::aws:policy/AWSCodePipelineFullAccess',
    });

    // CodePipeline
    new codepipeline.Codepipeline(this, 'Pipeline', {
      name: 'cdktf-demo-pipeline',
      roleArn: pipelineRole.arn,
      artifactStore: {
        location: artifactBucket.bucket,
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
                Owner: 'your-org',
                Repo: 'your-repo',
                Branch: 'main',
                OAuthToken: '${var.github_token}',
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
