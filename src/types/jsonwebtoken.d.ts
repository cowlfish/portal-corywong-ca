declare module "jsonwebtoken" {
  export interface SignOptions {
    expiresIn?: string | number;
    algorithm?: string;
  }
  export function sign(payload: string | object | Buffer, secret: string, options?: SignOptions): string;
  export function verify(token: string, secret: string): object;
}
