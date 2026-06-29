import { supabase } from './supabase';

const CLIENT_ID = import.meta.env.VITE_YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = typeof window !== 'undefined' 
  ? `${window.location.origin}/api/youtube/callback` 
  : '';

export const googleAuthService = {
  /**
   * Genera la URL para que el usuario inicie sesión en Google con todos los scopes necesarios
   */
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];
    
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.append('client_id', CLIENT_ID);
    url.searchParams.append('redirect_uri', REDIRECT_URI);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('scope', scopes.join(' '));
    url.searchParams.append('access_type', 'offline');
    url.searchParams.append('prompt', 'select_account');
    
    return url.toString();
  },

  async exchangeCode(code: string) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error_description || data.error);
    
    await this.saveTokens(data);
    return data;
  },

  async refreshAccessToken(refreshToken: string) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error_description || data.error);
    
    const updateData = {
      access_token: data.access_token,
      expires_in: data.expires_in,
      ...(data.refresh_token && { refresh_token: data.refresh_token })
    };
    
    await this.saveTokens(updateData);
    return data.access_token;
  },

  async saveTokens(tokens: any) {
    const { error } = await supabase
      .from('integration_tokens')
      .upsert({
        provider: 'youtube', // Mantenemos 'youtube' como ID en DB para no romper compatibilidad por ahora
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || undefined,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'provider' });

    if (error) throw error;
  },

  async getValidToken(): Promise<string | null> {
    const { data, error } = await supabase
      .from('integration_tokens')
      .select('*')
      .eq('provider', 'youtube')
      .single();

    if (error || !data) return null;

    const expiresAt = new Date(data.expires_at).getTime();
    const now = Date.now();

    if (expiresAt - now < 300000) {
      if (!data.refresh_token) return null;
      return await this.refreshAccessToken(data.refresh_token);
    }

    return data.access_token;
  }
};
