import { ActionDefinition } from '@segment/actions-core'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'
import { formatPayload, hosts, sanitiseEventName } from '../utility'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Page Visit',
  description: `Sends Segment's page event to VWO`,
  fields: {
    url: {
      description: 'URL of the webpage',
      label: 'Page URL',
      required: false,
      type: 'string',
      default: {
        '@path': '$.context.page.url'
      }
    },
    vwoUuid: {
      description: 'VWO UUID',
      label: 'VWO UUID',
      required: true,
      type: 'string',
      default: {
        '@path': '$.properties.vwo_uuid'
      }
    },
    page: {
      description: 'Contains context information regarding a webpage',
      label: 'Page',
      required: false,
      type: 'object',
      default: {
        '@path': '$.context.page'
      }
    },
    ip: {
      description: 'IP address of the user',
      label: 'IP Address',
      required: false,
      type: 'string',
      default: {
        '@path': '$.context.ip'
      }
    },
    userAgent: {
      description: 'User-Agent of the user',
      label: 'User Agent',
      required: false,
      type: 'string',
      default: {
        '@path': '$.context.userAgent'
      }
    },
    timestamp: {
      description: 'Timestamp on the event',
      label: 'Timestamp',
      required: false,
      type: 'string',
      default: {
        '@path': '$.timestamp'
      }
    }
  },
  defaultSubscription: 'type = "page"',
  perform: (request, { settings, payload }) => {
    const eventName = sanitiseEventName('pageView')
    const { headers, structuredPayload } = formatPayload(
      eventName,
      payload,
      false,
      false,
      settings.apikey,
      settings.vwoAccountId
    )
    structuredPayload.d.event.props['url'] = payload.url
    const region = settings.region || 'US'
    const host = hosts[region]
    const endpoint = `${host}/events/t?en=${eventName}&a=${settings.vwoAccountId}`
    return request(endpoint, {
      method: 'POST',
      json: structuredPayload,
      headers
    })
  }
}

export default action
