declare module "nodemailer" {
  export type SendMailOptions = {
    from?: string;
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
  };

  export type Transporter = {
    sendMail(message: SendMailOptions): Promise<unknown>;
  };

  export type TransportOptions = {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user?: string;
      pass?: string;
    };
  };

  export function createTransport(options: TransportOptions): Transporter;

  const nodemailer: {
    createTransport: typeof createTransport;
  };

  export default nodemailer;
}
