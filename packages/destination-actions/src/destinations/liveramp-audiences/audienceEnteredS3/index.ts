import { ActionDefinition, PayloadValidationError } from '@segment/actions-core'
import { isValidS3Path, isValidS3BucketName, normalizeS3Path, uploadS3 } from './s3'
import { generateFile } from '../operations'
import { sendEventToAWS } from '../awsClient'
import { LIVERAMP_MIN_RECORD_COUNT, LIVERAMP_LEGACY_FLOW_FLAG_NAME } from '../properties'

import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'
import type { RawData, ExecuteInputRaw, ProcessDataInput } from '../operations'
import { SubscriptionMetadata } from '@segment/actions-core/destination-kit'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Audience Entered (S3)',
  description: 'Uploads audience membership data to a file in S3 for LiveRamp ingestion.',
  defaultSubscription: 'event = "Audience Entered"',
  fields: {
    s3_aws_access_key: {
      label: 'AWS Access Key ID',
      description: 'IAM user credentials with write permissions to the S3 bucket.',
      type: 'string'
    },
    s3_aws_secret_key: {
      label: 'AWS Secret Access Key',
      description: 'IAM user credentials with write permissions to the S3 bucket.',
      type: 'password'
    },
    s3_aws_bucket_name: {
      label: 'AWS Bucket Name',
      description: 'Name of the S3 bucket where the files will be uploaded to.',
      type: 'string'
    },
    s3_aws_region: {
      label: 'AWS Region (S3 only)',
      description: 'Region where the S3 bucket is hosted.',
      type: 'string',
      required: true
    },
    audience_key: {
      label: 'LiveRamp Audience Key',
      description:
        'Unique ID that identifies members of an audience. A typical audience key might be client customer IDs, email addresses, or phone numbers. See more information on [LiveRamp Audience Key](https://docs.liveramp.com/connect/en/onboarding-terms-and-concepts.html#audience-key) ',
      type: 'string',
      required: true,
      default: { '@path': '$.userId' }
    },
    identifier_data: {
      label: 'Identifier Data',
      description: `Additional data pertaining to the user to be written to the file.`,
      type: 'object',
      required: false,
      defaultObjectUI: 'keyvalue:only'
    },
    unhashed_identifier_data: {
      label: 'Hashable Identifier Data',
      description: `Additional data pertaining to the user to be hashed before written to the file. Use field name **phone_number** or **email** to apply LiveRamp's specific hashing rules.`,
      type: 'object',
      required: false,
      defaultObjectUI: 'keyvalue:only'
    },
    delimiter: {
      label: 'Delimeter',
      description: `Character used to separate tokens in the resulting file.`,
      type: 'string',
      required: true,
      default: ','
    },
    filename: {
      label: 'Filename',
      description: `Name of the CSV file to upload for LiveRamp ingestion. For multiple subscriptions, make sure to use a unique filename for each subscription.`,
      type: 'string',
      required: true,
      default: { '@template': '{{properties.audience_key}}.csv' }
    },
    enable_batching: {
      type: 'boolean',
      label: 'Batch data',
      description: 'Receive events in a batch payload. This is required for LiveRamp audiences ingestion.',
      unsafe_hidden: true,
      required: true,
      default: true
    },
    batch_size: {
      label: 'Batch Size',
      description: 'Maximum number of events to include in each batch. Actual batch sizes may be lower.',
      type: 'number',
      unsafe_hidden: true,
      required: false,
      default: 170000
    },
    s3_aws_bucket_path: {
      label: 'AWS Bucket Path [optional]',
      description:
        'Optional path within the S3 bucket where the files will be uploaded to. If not provided, files will be uploaded to the root of the bucket. Example: "folder1/folder2"',
      required: false,
      type: 'string'
    }
  },
  perform: async (
    request,
    { payload, features, rawData, subscriptionMetadata }: ExecuteInputRaw<Settings, Payload, RawData>
  ) => {
    return processData(
      {
        request,
        payloads: [payload],
        features,
        rawData: rawData ? [rawData] : []
      },
      subscriptionMetadata
    )
  },
  performBatch: (
    request,
    { payload, features, rawData, subscriptionMetadata }: ExecuteInputRaw<Settings, Payload[], RawData[]>
  ) => {
    return processData(
      {
        request,
        payloads: payload,
        features,
        rawData
      },
      subscriptionMetadata
    )
  }
}

async function processData(input: ProcessDataInput<Payload>, subscriptionMetadata?: SubscriptionMetadata) {
  if (input.payloads.length < LIVERAMP_MIN_RECORD_COUNT) {
    throw new PayloadValidationError(
      `received payload count below LiveRamp's ingestion limits. expected: >=${LIVERAMP_MIN_RECORD_COUNT} actual: ${input.payloads.length}`
    )
  }
  //validate s3 bucket name
  if (input.payloads[0].s3_aws_bucket_name && !isValidS3BucketName(input.payloads[0].s3_aws_bucket_name)) {
    throw new PayloadValidationError(
      `Invalid S3 bucket name: "${input.payloads[0].s3_aws_bucket_name}". Bucket names cannot contain '/' characters, must be lowercase, and follow AWS naming conventions.`
    )
  }

  // validate s3 path
  input.payloads[0].s3_aws_bucket_path = normalizeS3Path(input.payloads[0].s3_aws_bucket_path)
  if (input.payloads[0].s3_aws_bucket_path && !isValidS3Path(input.payloads[0].s3_aws_bucket_path)) {
    throw new PayloadValidationError(
      `Invalid S3 bucket path. It must be a valid S3 object key, avoid leading/trailing slashes and forbidden characters (e.g., \\ { } ^ [ ] % \` " < > # | ~). Use a relative path like "folder1/folder2".`
    )
  }

  const { filename, fileContents } = generateFile(input.payloads)

  if (input.features && input.features[LIVERAMP_LEGACY_FLOW_FLAG_NAME] === true) {
    //------------
    // LEGACY FLOW
    // -----------
    return uploadS3(input.payloads[0], filename, fileContents, input.request)
  } else {
    //------------
    // AWS FLOW
    // -----------
    return sendEventToAWS(input.request, {
      audienceComputeId: input.rawData?.[0].context?.personas?.computation_id,
      uploadType: 's3',
      filename: filename,
      destinationInstanceID: subscriptionMetadata?.destinationConfigId,
      subscriptionId: subscriptionMetadata?.actionConfigId,
      fileContents,
      s3Info: {
        s3BucketName: input.payloads[0].s3_aws_bucket_name,
        s3Region: input.payloads[0].s3_aws_region,
        s3AccessKeyId: input.payloads[0].s3_aws_access_key,
        s3SecretAccessKey: input.payloads[0].s3_aws_secret_key,
        s3BucketPath: input.payloads[0].s3_aws_bucket_path
      }
    })
  }
}

export default action
