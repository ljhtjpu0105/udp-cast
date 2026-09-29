export interface CoapMessage {
    isCoap: boolean;
    version: number;
    type: number;
    code: number;
    detail: number;
    messageId: number;
    token: string;
    options: Record<string, string>;
    payload: unknown;
}
export interface CoapBuildOptions {
    path?: string;
    method?: number;
    type?: number;
    payload?: string;
}
export declare function parseCoap(data: ArrayBuffer): CoapMessage | null;
export declare function buildCoap(options?: CoapBuildOptions): ArrayBuffer;
