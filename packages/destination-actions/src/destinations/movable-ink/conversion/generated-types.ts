// Generated file. DO NOT MODIFY IT BY HAND.

export interface Payload {
  /**
   * The Movable Ink URL to send data to. This field overrides the "Movable Ink URL" setting.
   */
  movable_ink_url?: string
  /**
   * The unique identifier of the profile that triggered this event.
   */
  user_id?: string
  /**
   * A unique identifier of the anonymous profile that triggered this event.
   */
  anonymous_id?: string
  /**
   * Timestamp for the event. Must be in ISO 8601 format. For example '2023-09-18T11:45:59.533Z'. Segment will convert to Unix time before sending to Movable Ink.
   */
  timestamp: string | number
  /**
   * The timezone of where the event took place (TZ database name in the IANA Time Zone Database)
   */
  timezone?: string
  /**
   * Product details to associate with the event.
   */
  products: {
    /**
     * The unique identifier of the product.
     */
    id: string
    /**
     * The title or name of the product.
     */
    title?: string
    /**
     * The product price.
     */
    price?: number
    /**
     * The URL of the product.
     */
    url?: string
    /**
     * The quantity of the product.
     */
    quantity?: number
    [k: string]: unknown
  }[]
  /**
   * Unique ID for the purchase
   */
  order_id: string
  /**
   * The revenue generated by the purchase
   */
  revenue: number
  /**
   * A map of meta data to provide additional context about the event.
   */
  meta?: {
    [k: string]: unknown
  }
}