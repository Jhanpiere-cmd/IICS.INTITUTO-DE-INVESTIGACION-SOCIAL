import { googleAuthService } from './googleAuth';

export interface YoutubeMetrics {
  subscribers: number;
  totalViews: number;
  videoCount: number;
  watchTime: number; 
  averageViewDuration: number;
}

export const youtubeService = {
  getAuthUrl() {
    return googleAuthService.getAuthUrl();
  },

  async exchangeCode(code: string) {
    return googleAuthService.exchangeCode(code);
  },

  async refreshAccessToken(refreshToken: string) {
    return googleAuthService.refreshAccessToken(refreshToken);
  },

  async saveTokens(tokens: any) {
    return googleAuthService.saveTokens(tokens);
  },

  async getValidToken(): Promise<string | null> {
    return googleAuthService.getValidToken();
  },

  /**
   * Obtiene métricas generales del canal (Data API v3)
   */
  async getChannelStats() {
    const token = await this.getValidToken();
    if (!token) throw new Error('No YouTube connection');

    const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = await response.json();
    if (!data.items?.length) return null;
    
    const stats = data.items[0].statistics;
    const snippet = data.items[0].snippet;

    const thumbnails = snippet.thumbnails;
    const thumbnailUrl = thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url;

    return {
      id: data.items[0].id,
      title: snippet.title,
      subscribers: parseInt(stats.subscriberCount),
      views: parseInt(stats.viewCount),
      videos: parseInt(stats.videoCount),
      thumbnail: thumbnailUrl
    };
  },

  /**
   * Obtiene métricas analíticas (Analytics API) de los últimos 30 días
   */
  async getAnalytics(channelId: string) {
    const token = await this.getValidToken();
    if (!token) throw new Error('No YouTube connection');

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const metrics = 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost';
    const dimensions = 'day';
    
    const url = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${startDate}&endDate=${endDate}&metrics=${metrics}&dimensions=${dimensions}&sort=day`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json();
    return data;
  }
};
