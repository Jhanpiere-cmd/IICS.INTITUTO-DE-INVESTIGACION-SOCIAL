import { googleAuthService } from './googleAuth';

export interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string }>;
  conferenceData?: any;
}

export const googleCalendarService = {
  /**
   * Crea un evento en el calendario principal del usuario
   */
  async createEvent(event: CalendarEvent) {
    const token = await googleAuthService.getValidToken();
    if (!token) throw new Error('No Google connection. Please connect your Google account.');

    // Configuración para generar enlace de Google Meet
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.append('conferenceDataVersion', '1');

    const body = {
      ...event,
      conferenceData: {
        createRequest: {
          requestId: `hoyr-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (data.error) {
      console.error('Google Calendar Error:', data.error);
      throw new Error(data.error.message);
    }

    return {
      id: data.id,
      htmlLink: data.htmlLink,
      meetLink: data.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri || null
    };
  },

  /**
   * Lista los próximos 10 eventos
   */
  async listUpcomingEvents() {
    const token = await googleAuthService.getValidToken();
    if (!token) return [];

    const now = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=10&orderBy=startTime&singleEvents=true`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    return data.items || [];
  }
};
