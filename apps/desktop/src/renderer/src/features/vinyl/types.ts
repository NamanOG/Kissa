export interface VinylLayerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Optional inline styles for dynamic properties like transforms.
   */
  style?: React.CSSProperties
  /**
   * Size of the layer as a percentage or string.
   */
  size?: string
}

export interface VinylEngineProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The album artwork URL to display on the record label.
   */
  albumArt?: string
  /**
   * Controls if the record should appear active.
   * For the static milestone, this is false by default.
   */
  isActive?: boolean
}
