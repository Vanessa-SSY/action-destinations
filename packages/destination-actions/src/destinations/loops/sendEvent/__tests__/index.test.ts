import nock from 'nock'
import { createTestIntegration } from '@segment/actions-core'
import Destination from '../../index'

const testDestination = createTestIntegration(Destination)

const LOOPS_API_KEY = 'some random secret'

describe('Loops.sendEvent', () => {
  it('should validate action fields', async () => {
    try {
      await testDestination.testAction('sendEvent', {
        settings: { apiKey: LOOPS_API_KEY }
      })
    } catch (err: unknown) {
      if (err instanceof Error) {
        expect(err.message).toContain("missing the required field 'userId'.")
        expect(err.message).toContain("missing the required field 'eventName'.")
      }
    }
  })

  it('should work', async () => {
    const testPayload = {
      email: 'test@example.com',
      eventName: 'signup',
      userId: 'some-id-1'
    }
    nock('https://app.loops.so/api/v1').post('/events/send', testPayload).reply(200, {
      success: true
    })

    const responses = await testDestination.testAction('sendEvent', {
      mapping: testPayload,
      settings: { apiKey: LOOPS_API_KEY }
    })

    expect(responses.length).toBe(1)
    expect(responses[0].status).toBe(200)
  })

  it('should work without optional fields', async () => {
    const testPayload = {
      userId: 'some-id-1',
      eventName: 'signup'
    }
    nock('https://app.loops.so/api/v1').post('/events/send', testPayload).reply(200, {
      success: true
    })

    const responses = await testDestination.testAction('sendEvent', {
      mapping: testPayload,
      settings: { apiKey: LOOPS_API_KEY }
    })

    expect(responses.length).toBe(1)
    expect(responses[0].status).toBe(200)
  })

  it('should work with event properties', async () => {
    const testPayload = {
      userId: 'some-id-1',
      eventName: 'signup',
      eventProperties: {
        someField: true, // boolean
        someField1: 'hello', // string
        someField2: '2024-04-01T10:09:65Z' // date
      }
    }
    nock('https://app.loops.so/api/v1').post('/events/send', testPayload).reply(200, {
      success: true
    })

    const responses = await testDestination.testAction('sendEvent', {
      mapping: testPayload,
      settings: { apiKey: LOOPS_API_KEY }
    })

    expect(responses.length).toBe(1)
    expect(responses[0].status).toBe(200)
  })

  it('should work with contact properties', async () => {
    const testPayload = {
      userId: 'some-id-1',
      eventName: 'signup',
      eventProperties: {
        someField: true, // boolean
        someField1: 'hello', // string
        someField2: '2024-04-01T10:09:65Z' // date
      },
      contactProperties: {
        firstName: 'Bob',
        anIntegerProperty: 1
      }
    }
    const testPayloadOut = {
      userId: 'some-id-1',
      eventName: 'signup',
      eventProperties: {
        someField: true,
        someField1: 'hello',
        someField2: '2024-04-01T10:09:65Z'
      },
      firstName: 'Bob',
      anIntegerProperty: 1
    }
    nock('https://app.loops.so/api/v1').post('/events/send', testPayloadOut).reply(200, {
      success: true
    })

    const responses = await testDestination.testAction('sendEvent', {
      mapping: testPayload,
      settings: { apiKey: LOOPS_API_KEY }
    })

    expect(responses.length).toBe(1)
    expect(responses[0].status).toBe(200)
  })
})
