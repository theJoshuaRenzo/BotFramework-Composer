export type ContentProviderMetadata = {
  [key: string]: any;
};

export abstract class ExternalContentProvider {
  constructor(protected metadata: ContentProviderMetadata = {}) {}

  /**
   * Downloads bot content and returns a path to the downloaded content.
   */
  abstract async downloadBotContent(): Promise<string>;

  /**
   * Cleans up any leftover downloaded bot content and performs any other needed cleanup.
   */
  abstract async cleanUp(): Promise<void>;
}