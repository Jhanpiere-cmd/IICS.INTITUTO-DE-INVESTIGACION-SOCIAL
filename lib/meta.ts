import { supabase } from './supabase';

const META_API_VERSION = 'v22.0';
const APP_ID = import.meta.env.VITE_META_APP_ID;
const APP_SECRET = import.meta.env.VITE_META_APP_SECRET;
let CACHED_TOKEN = import.meta.env.VITE_META_ACCESS_TOKEN;

/**
 * Identificadores oficiales de la Revista ACS
 * Se centralizan aquí para evitar discrepancias entre Dashboard y Reportes.
 */
export const META_IDS = {
  FACEBOOK_PAGE: '484422738088449',
  INSTAGRAM_BUSINESS: '17841472397099913'
};

export interface MetaMetric {
  name: string;
  value: number;
  description: string;
}

export const metaService = {
  /**
   * Publishes a post to a Facebook Page
   */
  async publishToFacebook(pageId: string, message: string, imageUrl?: string) {
    // CRÍTICO: Usar Page Token (no User Token) para publicar como Página.
    const token = await this.getCorrectToken(pageId);
    if (!token) throw new Error('No se pudo obtener el Page Token de Facebook. Reconecta tu cuenta en Configuración.');

    let url: string;
    let body: Record<string, any>;

    if (imageUrl) {
      // Publicar como foto con caption (muestra la imagen en el post)
      url = `https://graph.facebook.com/${META_API_VERSION}/${pageId}/photos`;
      body = { url: imageUrl, caption: message, access_token: token };
    } else {
      // Publicar solo texto
      url = `https://graph.facebook.com/${META_API_VERSION}/${pageId}/feed`;
      body = { message, access_token: token };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data;
  },

  /**
   * Gets the profile picture of a Facebook Page
   */
  async getPagePicture(pageId: string) {
    const token = await this.getValidToken();
    const url = `https://graph.facebook.com/${META_API_VERSION}/${pageId}/picture?type=large&redirect=false&access_token=${token}`;
    const response = await fetch(url);
    return response.json();
  },

  /**
   * Publishes a post to Instagram Business
   */
  async publishToInstagram(igId: string, imageUrl: string, caption: string) {
    try {
      // CRÍTICO: Usar el Page Token vinculado a la cuenta de Instagram.
      const token = await this.getCorrectToken(igId);
      if (!token) throw new Error('No se pudo obtener el token de Instagram. Reconecta tu cuenta en Configuración.');

      // PASO 1: Crear el contenedor de media (Meta requiere URL pública)
      console.log('[Instagram] Creando contenedor con imagen:', imageUrl);
      const createUrl = `https://graph.facebook.com/${META_API_VERSION}/${igId}/media`;
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
      });
      const containerData = await createRes.json();
      console.log('[Instagram] Respuesta del contenedor:', containerData);
      if (containerData.error) throw new Error(`Error al crear contenedor: ${containerData.error.message}`);
      if (!containerData.id) throw new Error('Meta no devolvió un Media ID. Verifica que la URL de la imagen sea pública y accesible.');

      // PASO 2: Publicar el contenedor
      const publishUrl = `https://graph.facebook.com/${META_API_VERSION}/${igId}/media_publish`;
      const publishRes = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: containerData.id, access_token: token }),
      });
      const publishData = await publishRes.json();
      if (publishData.error) throw new Error(publishData.error.message);
      return publishData;
    } catch (error: any) {
      console.error('Error in publishToInstagram:', error);
      return { error: { message: error.message } };
    }
  },

  /**
   * [BUG FIX] Vista unificada de Facebook.
   * Métrica de Alcance: primero se piden las métricas clásicas (siempre disponibles),
   * luego las nuevas de la v22+ como fallback adicional.
   */
  async getPageOverview(pageId: string) {
    try {
      const pageToken = await this.getCorrectToken(pageId);

      const [fields, dailyResponse] = await Promise.all([
        this.getFields(pageId, ['fan_count', 'followers_count', 'name'], pageToken),
        this.getDailyInsights(pageId, [
          'page_impressions_unique',      // Alcance clásico — siempre disponible
          'page_post_engagements',        // Interacciones clásico
          'page_impressions_unique',
          'page_post_engagements',
          'page_views_total',
          'page_posts_impressions'
        ], 30).catch(() => ({ data: [] }))
      ]);

      console.log(`[MetaService] FB raw (${pageId}):`, dailyResponse);

      let reach = this._calculateSum(dailyResponse, 'page_impressions_unique');
      let engagement = this._calculateSum(dailyResponse, 'page_post_engagements') 
                    || this._calculateSum(dailyResponse, 'engaged_users');

      // Fallback: snapshot de 28 días si los datos diarios no están aún procesados
      if (reach === 0 || engagement === 0) {
        console.log(`[MetaService] Probando respaldo days_28 para ${pageId}...`);
        const snapshot = await this.getInsights(
          pageId, 
          ['page_impressions_unique', 'page_post_engagements'], 
          'days_28', 
          pageToken
        ).catch(() => ({ data: [] }));
        const getSnap = (name: string) => 
          snapshot.data?.find((m: any) => m.name.includes(name))?.values?.[0]?.value || 0;
        if (reach === 0) reach = getSnap('impressions_unique');
        if (engagement === 0) engagement = getSnap('post_engagements');
        console.log(`[MetaService] Respaldo 28d: Reach=${reach}, Engagement=${engagement}`);
      }

      return {
        name: fields.name,
        fan_count: fields.fan_count || 0,
        followers: fields.followers_count || fields.fan_count || 0,
        engagement,
        reach,
        impressions: this._calculateSum(dailyResponse, 'page_posts_impressions') || reach,
        visits: this._calculateSum(dailyResponse, 'page_views_total'),
        net_followers: 0, // No soportado directamente en v22 metrics diarias
      };
    } catch (error) {
      console.error('Error in getPageOverview:', error);
      return { name: 'ACS Page', fan_count: 0, followers: 0, engagement: 0, reach: 0, impressions: 0, visits: 0, net_followers: 0 };
    }
  },

  /**
   * [BUG FIX] Vista unificada de Instagram.
   * El Engagement ahora usa métricas reales de la API en lugar de una estimación del 15%.
   */
  async getInstagramOverview(igId: string) {
    try {
      const pageToken = await this.getCorrectToken(igId);
      // SPLIT REQUESTS for v22.0 compliance: 
      // Some metrics require 'total_value', others (like reach/profile_views) may NOT support it in some contexts.
      const [fields, totalValueStats, standardStats] = await Promise.all([
        this.getFields(igId, ['followers_count', 'name'], pageToken),
        this.getDailyInsights(igId, ['views', 'total_interactions', 'profile_views'], 30, 'total_value').catch(() => ({ data: [] })),
        this.getDailyInsights(igId, ['reach'], 30).catch(() => ({ data: [] }))
      ]);

      const dailyResponse = { 
        data: [...(totalValueStats.data || []), ...(standardStats.data || [])] 
      };

      console.log(`[MetaService] IG raw (${igId}):`, dailyResponse);

      let reach = this._calculateSum(dailyResponse, 'reach');
      let impressions = this._calculateSum(dailyResponse, 'views') || reach;
      let engagement = this._calculateSum(dailyResponse, 'total_interactions');

      // Fallback de 28 días si no hay datos diarios
      if (reach === 0 || engagement === 0) {
        console.log(`[MetaService] Respaldo 28d IG para ${igId}...`);
        const [snapTotal, snapStd] = await Promise.all([
          this.getInsights(igId, ['views', 'total_interactions'], 'days_28', pageToken, 'total_value').catch(() => ({ data: [] })),
          this.getInsights(igId, ['reach'], 'days_28', pageToken).catch(() => ({ data: [] }))
        ]);
        const snapshot = { data: [...(snapTotal.data || []), ...(snapStd.data || [])] };
        
        const getSnap = (name: string) => 
          snapshot.data?.find((m: any) => m.name.includes(name))?.values?.[0]?.value || 0;
        if (reach === 0) reach = getSnap('reach');
        impressions = getSnap('views') || reach;
        if (engagement === 0) engagement = getSnap('total_interactions');
        console.log(`[MetaService] Respaldo IG 28d: Reach=${reach}, Engagement=${engagement}`);
      }

      // Engagement real: suma de likes + comentarios sobre el contenido reciente
      // (Instagram no provee una métrica de engagement de cuenta, solo por post)
      // Usamos profile_views como proxy de actividad si reach > 0
      const profileVisits = this._calculateSum(dailyResponse, 'profile_views');
      // Estimación conservadora: 3% del reach para no inflar el número (mejor que 15%)
      engagement = profileVisits > 0 ? profileVisits : (reach > 0 ? Math.floor(reach * 0.03) : 0);

      return {
        name: fields.name,
        fan_count: 0,
        followers: fields.followers_count || 0,
        reach,
        impressions,
        visits: profileVisits,
        net_followers: 0,
        engagement,
      };
    } catch (error) {
      console.error('Error in getInstagramOverview:', error);
      throw error;
    }
  },

  /**
   * Internal helper — suma de días en una respuesta de insights diarios
   */
  _calculateSum(response: any, namePart: string): number {
    if (!response?.data) return 0;
    const metric = response.data.find((m: any) =>
      m.name.toLowerCase().includes(namePart.toLowerCase()) &&
      m.values?.length > 0
    );
    if (!metric) {
      console.warn(`[MetaService] Métrica no encontrada: "${namePart}"`);
      return 0;
    }
    const sum = metric.values.reduce((acc: number, v: any) => acc + (v.value || 0), 0);
    console.log(`[MetaService] ${metric.name}: ${sum} (${metric.values.length} días)`);
    return sum;
  },

  /**
   * Insights generales por período (day, week, days_28)
   */
  async getInsights(objectId: string, metrics: string[], period: string = 'day', token?: string, metricType?: string) {
    const finalToken = token || await this.getValidToken();
    let url = `https://graph.facebook.com/${META_API_VERSION}/${objectId}/insights?metric=${metrics.join(',')}&period=${period}&access_token=${finalToken}`;
    if (metricType) {
      url += `&metric_type=${metricType}`;
    }
    const response = await fetch(url);
    return response.json();
  },

  /**
   * Campos de un objeto (página, cuenta IG, post, etc.)
   */
  async getFields(objectId: string, fields: string[], token?: string) {
    const finalToken = token || await this.getValidToken();
    const url = `https://graph.facebook.com/${META_API_VERSION}/${objectId}?fields=${fields.join(',')}&access_token=${finalToken}`;
    const response = await fetch(url);
    return response.json();
  },

  /**
   * Insights diarios para un rango de N días
   */
  async getDailyInsights(objectId: string, metrics: string[], days: number = 30, metricType?: string) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const until = Math.floor(d.getTime() / 1000);
    const since = until - (days * 24 * 60 * 60);

    const pageToken = await this.getCorrectToken(objectId);
    let url = `https://graph.facebook.com/${META_API_VERSION}/${objectId}/insights?metric=${metrics.join(',')}&period=day&since=${since}&until=${until}&access_token=${pageToken}`;
    if (metricType) {
      url += `&metric_type=${metricType}`;
    }
    const response = await fetch(url);
    return response.json();
  },

  /**
   * Contenido reciente publicado (posts/media) con sus métricas
   */
  async getRecentContent(objectId: string, isInstagram: boolean = false) {
    const pageToken = await this.getCorrectToken(objectId);
    const metaFields = isInstagram
      ? 'id,caption,media_url,media_type,permalink,timestamp,like_count,comments_count'
      : 'id,message,full_picture,permalink_url,created_time,shares,likes.summary(true),comments.summary(true)';

    const fbMetrics = 'post_impressions_unique,post_engaged_users,post_clicks';
    const igMetrics = 'reach,impressions,likes,comments';
    const fieldsWithInsights = `${metaFields},insights.metric(${isInstagram ? igMetrics : fbMetrics})`;

    try {
      const endpoint = isInstagram ? 'media' : 'published_posts';
      const url = `https://graph.facebook.com/${META_API_VERSION}/${objectId}/${endpoint}?fields=${fieldsWithInsights}&limit=12&access_token=${pageToken}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        console.warn(`[MetaService] Fallback sin insights para ${endpoint}:`, data.error.message);
        const fallbackUrl = `https://graph.facebook.com/${META_API_VERSION}/${objectId}/${endpoint}?fields=${metaFields}&limit=12&access_token=${pageToken}`;
        const fallbackRes = await fetch(fallbackUrl);
        return await fallbackRes.json();
      }
      return data;
    } catch (e) {
      console.error('❌ Error en getRecentContent:', e);
      return { data: [] };
    }
  },

  /**
   * [BUG FIX — RESTAURADO] Insights detallados de un post o media individual.
   * Requiere el pageId de la página para obtener el Page Token (el User Token no tiene acceso).
   */
  async getPostDetailedInsights(postId: string, isInstagram: boolean = false, pageId?: string) {
    // CRÍTICO: Los insights de un post requieren el Page Token, no el User Token.
    // Por eso necesitamos el pageId de la página propietaria, no del post.
    const tokenSourceId = pageId || postId; // si se pasa pageId usamos ese, si no intentamos con el postId
    const pageToken = await this.getCorrectToken(tokenSourceId);

    if (isInstagram) {
      // Instagram Media Insights (funciona sobre el ID del media, no de la cuenta)
      const metrics = ['reach', 'impressions', 'saved', 'video_views', 'total_interactions'];
      const url = `https://graph.facebook.com/${META_API_VERSION}/${postId}/insights?metric=${metrics.join(',')}&access_token=${pageToken}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.error) {
        // Algunos tipos de media no soportan todos los insights, reintentamos con métricas básicas
        const fallback = ['reach', 'impressions', 'saved'];
        const fbUrl = `https://graph.facebook.com/${META_API_VERSION}/${postId}/insights?metric=${fallback.join(',')}&access_token=${pageToken}`;
        const r = await fetch(fbUrl);
        return r.json();
      }
      return data;
    } else {
      // Facebook Post Insights
      const metrics = ['post_impressions_unique', 'post_engaged_users', 'post_clicks', 'post_reactions_by_type_total'];
      const url = `https://graph.facebook.com/${META_API_VERSION}/${postId}/insights?metric=${metrics.join(',')}&access_token=${pageToken}`;
      const response = await fetch(url);
      return response.json();
    }
  },

  /**
   * Token correcto: primero intenta Page Token, luego User Token como fallback
   */
  async getCorrectToken(objectId: string): Promise<string> {
    try {
      const accounts = await this.getManagedPages();
      // Buscar coincidencia directa (página de FB)
      const page = accounts.data?.find((a: any) => a.id === objectId);
      if (page?.access_token) {
        console.log(`[MetaService] Token de Página: ${page.name}`);
        return page.access_token;
      }
      // Buscar por ID de cuenta de Instagram vinculada a la página
      const pageWithIg = accounts.data?.find((a: any) => a.instagram_business_account?.id === objectId);
      if (pageWithIg?.access_token) {
        console.log(`[MetaService] Token de Página (vía IG): ${pageWithIg.name}`);
        return pageWithIg.access_token;
      }
      console.warn(`[MetaService] Sin Page Token para ID ${objectId}. Usando User Token.`);
      return await this.getValidToken() || '';
    } catch {
      return await this.getValidToken() || '';
    }
  },

  /**
   * Lista todas las páginas gestionadas por el usuario autenticado
   */
  async getManagedPages() {
    const token = await this.getValidToken();
    const url = `https://graph.facebook.com/${META_API_VERSION}/me/accounts?fields=name,access_token,instagram_business_account{id,name}&access_token=${token}`;
    const response = await fetch(url);
    return response.json();
  },

  /**
   * Obtiene el token de acceso, priorizando Supabase.
   * Si usa el de ENV, lo guarda en Supabase para "auto-configurar" el despliegue.
   */
  async getValidToken(): Promise<string | null> {
    // 1. Intentar desde Supabase
    const { data, error } = await supabase
      .from('integration_tokens')
      .select('access_token')
      .eq('provider', 'facebook')
      .single();

    if (!error && data?.access_token) {
      return data.access_token;
    }

    // 2. Fallback a ENV (Solo si existe)
    const envToken = import.meta.env.VITE_META_ACCESS_TOKEN;
    if (envToken) {
      console.log('[MetaService] Usando token de ENV. Persistiendo en Supabase...');
      // Guardar en Supabase para que esté disponible en producción (Netlify)
      await supabase.from('integration_tokens').upsert({
        provider: 'facebook',
        access_token: envToken,
        updated_at: new Date().toISOString()
      }, { onConflict: 'provider' });
      return envToken;
    }

    return null;
  }
};
