// services/email.service.ts
// Servicio de email para Vase Business
// Actualmente stub — integrar con Nodemailer, Resend, o SendGrid en producción

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer | string; contentType?: string }[]
}

class EmailService {
  private configured: boolean

  constructor() {
    this.configured = !!(process.env.SMTP_HOST && process.env.SMTP_USER)
  }

  async sendInvoice(options: {
    to: string
    customerName: string
    invoiceNumber: string
    invoiceLetter: string
    totalAmount: string
    htmlContent: string
  }): Promise<boolean> {
    if (!this.configured) {
      console.log(`[EMAIL STUB] Factura ${options.invoiceLetter}${options.invoiceNumber} a ${options.to}`)
      return true
    }
    // TODO: Implementar con nodemailer cuando SMTP esté configurado
    return this.send({
      to: options.to,
      subject: `Factura ${options.invoiceLetter} ${options.invoiceNumber} — ${options.totalAmount}`,
      html: options.htmlContent,
    })
  }

  async send(options: EmailOptions): Promise<boolean> {
    if (!this.configured) {
      console.log('[EMAIL STUB] Email no enviado (SMTP no configurado):', options.subject, '->', options.to)
      return false
    }

    try {
      // Implementación con nodemailer:
      // const transporter = nodemailer.createTransporter({ ... })
      // await transporter.sendMail({ ... })
      console.log('[EMAIL] Enviando:', options.subject, '->', options.to)
      return true
    } catch (err) {
      console.error('[EMAIL] Error al enviar:', err)
      return false
    }
  }
}

export const emailService = new EmailService()
