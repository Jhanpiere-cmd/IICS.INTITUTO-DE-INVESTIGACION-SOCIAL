const WHATSAPP_API_VERSION = 'v22.0';
const PHONE_NUMBER_ID = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = import.meta.env.VITE_META_ACCESS_TOKEN;

export const whatsappService = {
  /**
   * Sends a template message (required for business-initiated conversations)
   */
  async sendTemplateMessage(to: string, templateName: string, languageCode: string = 'en_US', components?: any[]) {
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`;
    
    // Clean phone number (remove +, spaces, etc)
    const cleanTo = to.replace(/\D/g, '');

    const body = {
      messaging_product: 'whatsapp',
      to: cleanTo,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: components || []
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    });

    return response.json();
  },

  /**
   * Sends a simple text message (only works if the user replied in the last 24h)
   */
  async sendTextMessage(to: string, text: string) {
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`;
    const cleanTo = to.replace(/\D/g, '');

    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'text',
      text: { body: text }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    });

    return response.json();
  },

  /**
   * Sends a document message (like a PDF certificate) with an optional caption
   */
  async sendDocumentMessage(to: string, documentUrl: string, filename: string, caption?: string) {
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`;
    const cleanTo = to.replace(/\D/g, '');

    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'document',
      document: {
        link: documentUrl,
        filename: filename,
        ...(caption ? { caption } : {})
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    });

    return response.json();
  }
};
