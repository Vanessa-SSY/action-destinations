import nock from 'nock'
import { createTestEvent, createTestIntegration } from '@segment/actions-core'
import Destination from '../../index'
import { Settings } from '../../generated-types'
import { randomUUID } from 'crypto'

const testDestination = createTestIntegration(Destination)

const DATABASE_ID = 'test-database'
const SETTINGS: Settings = {
  databaseId: DATABASE_ID,
  privateToken: 'VALID_TOKEN',
  databaseRegion: 'eu-west'
}

describe('setViewPortion', () => {
  it('should validate action fields', async () => {
    nock('https://rapi-eu-west.recombee.com/')
      .post(`/${DATABASE_ID}/viewportions/`)
      .query({
        hmac_timestamp: /.*/,
        hmac_sign: /.*/
      })
      .reply(200, 'ok')

    const event = createTestEvent({
      userId: 'user-id',
      properties: {
        product_id: 'product-id',
        portion: 0.5
      },
      timestamp: '2021-09-01T00:00:00.000Z'
    })

    const response = await testDestination.testAction('setViewPortion', {
      event,
      settings: SETTINGS,
      useDefaultMappings: true
    })

    expect(await response[0].request.json()).toMatchObject({
      userId: 'user-id',
      itemId: 'product-id',
      timestamp: '2021-09-01T00:00:00.000Z',
      portion: 0.5,
      cascadeCreate: true
    })
  })

  it('should validate action fields with recommId and additionalData', async () => {
    nock('https://rapi-eu-west.recombee.com/')
      .post(`/${DATABASE_ID}/viewportions/`)
      .query({
        hmac_timestamp: /.*/,
        hmac_sign: /.*/
      })
      .reply(200, 'ok')

    const recommId = randomUUID()

    const event = createTestEvent({
      userId: 'user-id',
      properties: {
        product_id: 'product-id',
        recomm_id: recommId,
        portion: 0.5,
        session: 'session-id'
      },
      traits: {
        region: 'region'
      },
      timestamp: '2021-09-01T00:00:00.000Z'
    })

    const response = await testDestination.testAction('setViewPortion', {
      event,
      settings: SETTINGS,
      useDefaultMappings: true,
      mapping: {
        additionalData: {
          region: {
            '@path': '$.traits.region'
          }
        }
      }
    })

    expect(await response[0].request.json()).toMatchObject({
      userId: 'user-id',
      itemId: 'product-id',
      timestamp: '2021-09-01T00:00:00.000Z',
      portion: 0.5,
      sessionId: 'session-id',
      cascadeCreate: true,
      recommId,
      additionalData: {
        region: 'region'
      }
    })
  })

  it('should fail when portion is larger than 1', async () => {
    nock('https://rapi-eu-west.recombee.com/')
      .post(`/${DATABASE_ID}/viewportions/`)
      .query({
        hmac_timestamp: /.*/,
        hmac_sign: /.*/
      })
      .reply(400, { message: 'Invalid numeric value "1.5" for property portion: must be from interval [0,1]' })

    const event = createTestEvent({
      userId: 'user-id',
      properties: {
        product_id: 'product-id',
        portion: 1.5
      },
      timestamp: '2021-09-01T00:00:00.000Z'
    })

    await expect(
      testDestination.testAction('setViewPortion', {
        event,
        settings: SETTINGS,
        useDefaultMappings: true
      })
    ).rejects.toThrow()
  })

  it('should fail when portion is negative', async () => {
    nock('https://rapi-eu-west.recombee.com/')
      .post(`/${DATABASE_ID}/viewportions/`)
      .query({
        hmac_timestamp: /.*/,
        hmac_sign: /.*/
      })
      .reply(400, { message: 'Invalid numeric value "-1" for property portion: must be from interval [0,1]' })

    const event = createTestEvent({
      userId: 'user-id',
      properties: {
        product_id: 'product-id',
        portion: -1
      },
      timestamp: '2021-09-01T00:00:00.000Z'
    })

    await expect(
      testDestination.testAction('setViewPortion', {
        event,
        settings: SETTINGS,
        useDefaultMappings: true
      })
    ).rejects.toThrow()
  })
})
