import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { 
  Home, 
  Landmark, 
  LineChart, 
  MapPin, 
  Bell, 
  BookOpen, 
  BookCopy,
  Settings, 
  ArrowUp, 
  ArrowDown, 
  AlertTriangle, 
  MessageSquare, 
  Flame, 
  User, 
  LogOut, 
  Database, 
  GraduationCap, 
  Briefcase,
  Clock, 
  Send, 
  Check, 
  FileDown, 
  Download,
  Copy, 
  PlusCircle, 
  UploadCloud, 
  X, 
  Search, 
  FileText, 
  AlertOctagon, 
  Sparkles, 
  ChevronRight, 
  Activity, 
  Cpu,
  Play,
  Video,
  Award,
  Calendar,
  Users,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProvinceData, Alert, EmergentTheme } from '../types';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import PublicationsSection from './PublicationsSection';

interface PortalWorkspaceProps {
  provinces: ProvinceData[];
  alerts: Alert[];
  themes: EmergentTheme[];
  selectedProvinceId: string;
  onSelectProvince: (id: string) => void;
  onLogout: () => void;
  onSubmitSimulatedAlert: (newAlert: Alert) => void;
  setAlerts: React.Dispatch<React.SetStateAction<Alert[]>>;
  setProvinces: React.Dispatch<React.SetStateAction<ProvinceData[]>>;
}

export default function PortalWorkspace({
  provinces,
  alerts,
  themes,
  selectedProvinceId,
  onSelectProvince,
  onLogout,
  onSubmitSimulatedAlert,
  setAlerts,
  setProvinces
}: PortalWorkspaceProps) {
  // Navigation
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'provinces' | 'analytics' | 'map' | 'alerts' | 'library' | 'media' | 'afi' | 'consulting' | 'data' | 'settings'>('home');
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0);
  const [mapMode, setMapMode] = useState<'vector' | 'heatmap' | 'satellite'>('heatmap');
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  const getAlertSvgCoords = (al: Alert) => {
    const latitude = (al as any).latitude;
    const longitude = (al as any).longitude;
    if (latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null) {
      const minLon = -79.5;
      const maxLon = -77.5;
      const minLat = -4.5;
      const maxLat = -7.7;
      
      const x = 50 + ((longitude - minLon) / (maxLon - minLon)) * 400;
      const y = 50 + ((latitude - minLat) / (maxLat - minLat)) * 600;
      return { x, y };
    }
    
    const prov = provinces.find(p => p.name.toLowerCase() === al.province.toLowerCase());
    if (prov) {
      const numId = parseInt(al.id.replace(/\D/g, '') || '0') || 1;
      return {
        x: prov.coordinates.x + (Math.sin(numId * 17) * 15),
        y: prov.coordinates.y + (Math.cos(numId * 17) * 15)
      };
    }
    return null;
  };

  // Integrated subtabs and features states
  const [librarySubTab, setLibrarySubTab] = useState<'publications' | 'preprints' | 'datasets'>('publications');
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [afiForm, setAfiForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    institution: '',
    courseId: ''
  });
  const [submittingAfi, setSubmittingAfi] = useState(false);
  const [playingDoc, setPlayingDoc] = useState<any | null>(null);
  const [transmediaVideos, setTransmediaVideos] = useState<any[]>([]);
  const [loadingTransmedia, setLoadingTransmedia] = useState(true);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [socialConflicts, setSocialConflicts] = useState<any[]>([]);
  const [loadingConflicts, setLoadingConflicts] = useState(true);
  const [socialPosts, setSocialPosts] = useState<any[]>([]);
  const [historicalSeries, setHistoricalSeries] = useState<any[]>([]);
  const [loadingHistoricalSeries, setLoadingHistoricalSeries] = useState(true);
  const [statIndicators, setStatIndicators] = useState<any[]>([]);
  const [researchDatasets, setResearchDatasets] = useState<any[]>([]);
  const [selectedSentimentTopic, setSelectedSentimentTopic] = useState<'all' | 'mineria' | 'gobernabilidad' | 'cohesion'>('all');
  const [sentimentSearchQuery, setSentimentSearchQuery] = useState('');

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [proposalForm, setProposalForm] = useState({
    clientName: '',
    title: '',
    value: '',
    description: ''
  });
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [userProposals, setUserProposals] = useState<any[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);

  const fetchUserProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatarUrl')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      setAvatarUrl(data?.avatarUrl || null);
    } catch (err) {
      console.error('Error fetching user profile in portal:', err);
    }
  };

  const fetchUserProposals = async () => {
    if (!user?.id) return;
    setLoadingProposals(true);
    try {
      const { data, error } = await supabase
        .from('consulting_proposals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUserProposals(data || []);
    } catch (err) {
      console.error('Error fetching user proposals:', err);
    } finally {
      setLoadingProposals(false);
    }
  };

  useEffect(() => {
    fetchAfiCourses();
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    fetchTransmediaVideos();
  }, []);

  useEffect(() => { fetchSocialConflicts(); }, []);
  useEffect(() => { fetchSocialPosts(); }, []);
  useEffect(() => { fetchStatIndicators(); }, []);
  useEffect(() => { fetchResearchDatasets(); }, []);
  useEffect(() => { fetchHistoricalSeries(); }, [selectedProvinceId, provinces]);
  useEffect(() => {
    if (selectedProvince?.name) fetchProvinceDetail(selectedProvince.name);
  }, [selectedProvinceId]);
  useEffect(() => { fetchSystemLogs(); }, []);
  useEffect(() => { if (user?.id) fetchDraftSubmissions(); }, [user?.id]);
  useEffect(() => { if (user?.id) fetchUserProposals(); }, [user?.id]);
  useEffect(() => { fetchResearchLines(); }, []);

  const handleRegisterProposal = async (e: FormEvent) => {
    e.preventDefault();
    if (!proposalForm.clientName || !proposalForm.title) {
      alert('Por favor, determine los campos requeridos (*).');
      return;
    }
    setSubmittingProposal(true);
    try {
      const { error } = await supabase
        .from('consulting_proposals')
        .insert({
          title: proposalForm.title,
          client_name: proposalForm.clientName,
          value: 0,
          description: proposalForm.description,
          status: 'Borrador',
          user_id: user?.id || null
        });
      if (error) throw error;
      alert('¡Solicitud de propuesta registrada exitosamente! Podrá ver el estado y valorización de su proyecto en la lista de solicitudes.');
      setProposalForm({ clientName: '', title: '', value: '', description: '' });
      fetchUserProposals();
    } catch (err) {
      console.error('Error inserting consulting proposal:', err);
      alert('Hubo un error al procesar su solicitud de propuesta.');
    } finally {
      setSubmittingProposal(false);
    }
  };

  const fetchAfiCourses = async () => {
    try {
      setLoadingCourses(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCourses(data || []);
    } catch (e) {
      console.error('Error loading AFI courses in portal:', e);
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchSocialConflicts = async () => {
    try {
      setLoadingConflicts(true);
      const { data, error } = await supabase
        .from('social_conflicts')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSocialConflicts(data || []);
    } catch (e) {
      console.error('Error loading social conflicts in portal:', e);
    } finally {
      setLoadingConflicts(false);
    }
  };

  // Convert a social conflict's lat/lon (or province) to SVG coordinates
  const getConflictSvgCoords = (conflict: any) => {
    if (conflict.latitude !== null && conflict.latitude !== undefined &&
        conflict.longitude !== null && conflict.longitude !== undefined) {
      const minLon = -79.5;
      const maxLon = -77.5;
      const minLat = -4.5;
      const maxLat = -7.7;
      const x = 50 + ((conflict.longitude - minLon) / (maxLon - minLon)) * 400;
      const y = 50 + ((conflict.latitude - minLat) / (maxLat - minLat)) * 600;
      return { x, y };
    }
    const prov = provinces.find(p => p.name.toLowerCase() === (conflict.province || '').toLowerCase());
    if (prov) {
      const seed = conflict.id ? conflict.id.charCodeAt(0) + conflict.id.charCodeAt(1) : 1;
      return {
        x: prov.coordinates.x + (Math.sin(seed * 11) * 18),
        y: prov.coordinates.y + (Math.cos(seed * 11) * 18)
      };
    }
    return null;
  };

  const fetchStatIndicators = async () => {
    try {
      const { data, error } = await supabase
        .from('statistical_indicators')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setStatIndicators(data || []);
    } catch (e) { console.error('Error loading statistical_indicators:', e); }
  };

  const fetchHistoricalSeries = async () => {
    try {
      setLoadingHistoricalSeries(true);
      const provinceName = provinces.find((prov) => prov.id === selectedProvinceId)?.name || selectedProvince?.name || '';
      const { data, error } = await supabase
        .from('province_historical_series')
        .select('*')
        .eq('province', provinceName)
        .eq('status', 'published')
        .order('period_start', { ascending: true });
      if (error) throw error;
      setHistoricalSeries(data || []);
    } catch (e) {
      console.error('Error loading province_historical_series:', e);
      setHistoricalSeries([]);
    } finally {
      setLoadingHistoricalSeries(false);
    }
  };

  const fetchProvinceDetail = async (provinceName: string) => {
    try {
      setLoadingProvinceDetail(true);
      const [detailRes, districtsRes, indicatorsRes] = await Promise.all([
        supabase.from('province_details').select('*').eq('province_name', provinceName).single(),
        supabase.from('districts').select('*').eq('province_name', provinceName).order('tipo').order('nombre'),
        supabase.from('province_indicators').select('*').eq('province_name', provinceName).eq('status', 'published').order('categoria').order('nombre'),
      ]);
      setProvinceDetail(detailRes.data || null);
      setProvinceDistricts(districtsRes.data || []);
      setProvinceIndicators(indicatorsRes.data || []);
    } catch (e) { console.error('Error loading province detail:', e); }
    finally { setLoadingProvinceDetail(false); }
  };

  const fetchSystemLogs = async () => {
    try {
      const { data } = await supabase.from('system_logs').select('*').order('ts', { ascending: false }).limit(20);
      setSystemLogs(data || []);
    } catch (e) { console.error('Error loading system_logs:', e); }
  };

  const fetchDraftSubmissions = async () => {
    if (!user?.id) return;
    try {
      setLoadingDrafts(true);
      const { data } = await supabase
        .from('draft_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setSubmittedDrafts(data || []);
    } catch (e) { console.error('Error loading draft_submissions:', e); }
    finally { setLoadingDrafts(false); }
  };

  const fetchResearchLines = async () => {
    try {
      const { data } = await supabase
        .from('research_lines')
        .select('name')
        .eq('active', true)
        .order('order_index');
      if (data && data.length > 0) setResearchLines(data.map((r: any) => r.name));
    } catch (_) { /* usa STATIC_RESEARCH_LINES como fallback silencioso */ }
  };

  const fetchResearchDatasets = async () => {
    try {
      const { data, error } = await supabase
        .from('research_datasets')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setResearchDatasets(data || []);
    } catch (e) { console.error('Error loading research_datasets:', e); }
  };

  const fetchSocialPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('social_listening')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setSocialPosts(data || []);
    } catch (e) {
      console.error('Error loading social_listening in portal:', e);
    }
  };

  const fetchTransmediaVideos = async () => {
    try {
      setLoadingTransmedia(true);
      const { data, error } = await supabase
        .from('transmedia_videos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTransmediaVideos(data || []);
    } catch (e) {
      console.error('Error loading transmedia videos in portal:', e);
    } finally {
      setLoadingTransmedia(false);
    }
  };

  // States for citizen submitting simulated alert
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formProvince, setFormProvince] = useState(provinces[0]?.name || '');
  const [formType, setFormType] = useState<'Bajo' | 'Medio' | 'Alto'>('Medio');
  const [formSubmitted, setFormSubmitted] = useState(false);

  // States for student AFI paper uploader
  const [draftTitle, setDraftTitle] = useState('');
  const [draftLine, setDraftLine] = useState('Sociología Digital y Nuevas Tecnologías');
  const [draftFile, setDraftFile] = useState('');
  const [draftSubmitted, setDraftSubmitted] = useState(false);
  // submittedDrafts: loaded from draft_submissions table on mount
  const [submittedDrafts, setSubmittedDrafts] = useState<any[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);

  // Research lines: loaded from research_lines table, fallback to static list
  const STATIC_RESEARCH_LINES = [
    'Sociología Territorial',
    'Sociología Digital y Nuevas Tecnologías',
    'Desarrollo Urbano y Rural',
    'Conflictos Socioambientales',
    'Género y Sociedad',
    'Economía Social y Solidaria',
  ];
  const [researchLines, setResearchLines] = useState<string[]>(STATIC_RESEARCH_LINES);

  // Download simulation states
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState<string | null>(null);

  // Province tab states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'riskScore' | 'mencionesRedes'>('riskScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>('7d');

  const timeframeOptions = [
    { id: '24h', label: 'Últimas 24 horas' },
    { id: '7d', label: 'Últimos 7 días' },
    { id: '30d', label: 'Últimos 30 días' },
    { id: '90d', label: 'Último trimestre' },
  ];

  // Province detail states (new tables: province_details, districts, province_indicators)
  const [provinceDetail, setProvinceDetail] = useState<any>(null);
  const [provinceDistricts, setProvinceDistricts] = useState<any[]>([]);
  const [provinceIndicators, setProvinceIndicators] = useState<any[]>([]);
  const [loadingProvinceDetail, setLoadingProvinceDetail] = useState(false);
  const [detailDistrictFilter, setDetailDistrictFilter] = useState<'distrito'|'caserio'|'centro_poblado'|'all'>('all');
  const [detailIndicatorCategory, setDetailIndicatorCategory] = useState<string>('all');
  const [systemLogs, setSystemLogs] = useState<any[]>([]);

  const [mapZoomLevel, setMapZoomLevel] = useState(11);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapColorMode, setMapColorMode] = useState<'riskScore' | 'mencionesRedes'>('riskScore');

  const getTimeframeStart = (period: '24h' | '7d' | '30d' | '90d') => {
    const now = new Date();
    const start = new Date(now);
    if (period === '24h') start.setDate(now.getDate() - 1);
    if (period === '7d') start.setDate(now.getDate() - 7);
    if (period === '30d') start.setMonth(now.getMonth() - 1);
    if (period === '90d') start.setMonth(now.getMonth() - 3);
    return start;
  };

  const parsePostDate = (post: any) => {
    if (!post?.published_at) return null;
    const date = new Date(post.published_at);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const selectedProvince = provinces.find((p) => p.id === selectedProvinceId) || provinces[0];
  const selectedProvinceSocialPosts = socialPosts.filter((post: any) =>
    post.province?.toLowerCase() === selectedProvince.name.toLowerCase()
  );

  const selectedProvinceIndicators = useMemo(() => {
    return statIndicators.filter((item: any) =>
      item.provincia?.toLowerCase() === selectedProvince.name.toLowerCase()
    );
  }, [statIndicators, selectedProvince.name]);

  const getProvinceColor = (prov: ProvinceData) => {
    if (mapColorMode === 'riskScore') {
      return prov.riskScore >= 7
        ? '#ef4444'
        : prov.riskScore >= 4
        ? '#f59e0b'
        : '#06b6d4';
    }
    const mentions = prov.mencionesRedes || 0;
    if (mentions >= 2200) return '#a855f7';
    if (mentions >= 1200) return '#38bdf8';
    return '#22c55e';
  };

  const getProvinceHeatRadius = (prov: ProvinceData) => {
    if (mapColorMode === 'riskScore') {
      return prov.riskScore * 13 + 22;
    }
    const normalized = Math.min(1, (prov.mencionesRedes || 0) / 2500);
    return 20 + normalized * 38;
  };

  const timeframeStart = getTimeframeStart(selectedTimeframe);

  const timeframePosts = useMemo(() => {
    return selectedProvinceSocialPosts.filter((post: any) => {
      const date = parsePostDate(post);
      return date ? date >= timeframeStart : false;
    });
  }, [selectedProvinceSocialPosts, timeframeStart]);

  const timeframeConflicts = useMemo(() => {
    return socialConflicts.filter((conflict: any) => {
      const provinceMatches = (conflict.province || '').toLowerCase() === selectedProvince.name.toLowerCase();
      if (!provinceMatches) return false;
      const date = conflict.created_at ? new Date(conflict.created_at) : null;
      return date ? date >= timeframeStart : false;
    });
  }, [socialConflicts, selectedProvince.name, timeframeStart]);

  const topicPosts = useMemo(() => {
    return socialPosts.filter((post: any) => {
      const date = parsePostDate(post);
      return (
        (selectedSentimentTopic === 'all' || post.topic === selectedSentimentTopic) &&
        date && date >= timeframeStart
      );
    });
  }, [socialPosts, selectedSentimentTopic, timeframeStart]);

  const { trendSeries, trendPath, tensionPath, mentionMax, tensionMax } = useMemo(() => {
    const useHistorical = (selectedTimeframe === '30d' || selectedTimeframe === '90d') && historicalSeries.length > 0;

    if (useHistorical) {
      const mentionsRows = historicalSeries.filter((item: any) => item.metric === 'social_mentions');
      const tensionRows = historicalSeries.filter((item: any) => item.metric === 'tension_index');
      const series = mentionsRows.slice(-6).map((item: any, index: number) => {
        const tensionMatch = tensionRows[index] || tensionRows.find((row: any) => row.period_label === item.period_label);
        return {
          label: item.period_label || item.period_start?.slice(0, 7) || `P${index + 1}`,
          mentions: Number(item.value || 0),
          tension: Number(tensionMatch?.value || 0)
        };
      });

      const mMax = Math.max(...series.map((item) => item.mentions), 1);
      const chartWidth = 600;
      const chartHeight = 220;
      const chartPadding = 48;

      const tPath = series
        .map((point, idx) => {
          const x = chartPadding + idx * ((chartWidth - chartPadding * 2) / Math.max(series.length - 1, 1));
          const y = chartHeight - chartPadding - (point.mentions / mMax) * (chartHeight - chartPadding * 2);
          return `${x},${y}`;
        })
        .join(' ');

      const tensPath = series
        .map((point, idx) => {
          const x = chartPadding + idx * ((chartWidth - chartPadding * 2) / Math.max(series.length - 1, 1));
          const y = chartHeight - chartPadding - (point.tension / 10) * (chartHeight - chartPadding * 2);
          return `${x},${y}`;
        })
        .join(' ');

      return { trendSeries: series, trendPath: tPath, tensionPath: tensPath, mentionMax: mMax, tensionMax: 10 };
    }

    const bucketCount = selectedTimeframe === '24h' ? 6 : selectedTimeframe === '7d' ? 7 : 6;
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const now = new Date();
      let start = new Date(now);
      let end = new Date(now);

      if (selectedTimeframe === '24h') {
        start.setHours(now.getHours() - (bucketCount - 1 - index) * 4);
        end = new Date(start);
        end.setHours(start.getHours() + 4);
      } else if (selectedTimeframe === '7d') {
        start.setDate(now.getDate() - (bucketCount - 1 - index));
        end = new Date(start);
        end.setDate(start.getDate() + 1);
      } else if (selectedTimeframe === '30d') {
        start.setDate(now.getDate() - (bucketCount - 1 - index) * 5);
        end = new Date(start);
        end.setDate(start.getDate() + 5);
      } else {
        start.setMonth(now.getMonth() - (bucketCount - 1 - index));
        end = new Date(start);
        end.setMonth(start.getMonth() + 1);
      }

      const bucketPosts = timeframePosts.filter((post: any) => {
        const postDate = parsePostDate(post);
        return postDate && postDate >= start && postDate < end;
      });

      const negativePosts = bucketPosts.filter((post: any) => post.sentiment === 'negative').length;
      const positivePosts = bucketPosts.filter((post: any) => post.sentiment === 'positive').length;
      const baselineMentions = Math.max(40, Math.round((selectedProvince.mencionesRedes || 100) / Math.max(6, bucketCount)));
      const mentions = bucketPosts.length > 0
        ? Math.max(80, bucketPosts.length * 140 + positivePosts * 30 + negativePosts * 50)
        : Math.round(baselineMentions * (0.75 + index * 0.08));
      const tension = bucketPosts.length > 0
        ? Math.min(10, 2.2 + negativePosts * 0.8 + bucketPosts.length * 0.16 + selectedProvince.riskScore * 0.25)
        : Math.min(10, selectedProvince.riskScore * (0.6 + index * 0.05));

      let label = '';
      if (selectedTimeframe === '24h') {
        label = `${start.getHours().toString().padStart(2, '0')}h`;
      } else if (selectedTimeframe === '7d') {
        label = start.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
      } else if (selectedTimeframe === '30d') {
        label = `${start.getDate()}/${start.getMonth() + 1}`;
      } else {
        label = start.toLocaleDateString('es-PE', { month: 'short' });
      }

      return { label, mentions, tension };
    });

    const mMax = Math.max(...buckets.map((item) => item.mentions), 1);
    const chartWidth = 600;
    const chartHeight = 220;
    const chartPadding = 48;

    const tPath = buckets
      .map((point, idx) => {
        const x = chartPadding + idx * ((chartWidth - chartPadding * 2) / Math.max(buckets.length - 1, 1));
        const y = chartHeight - chartPadding - (point.mentions / mMax) * (chartHeight - chartPadding * 2);
        return `${x},${y}`;
      })
      .join(' ');

    const tensPath = buckets
      .map((point, idx) => {
        const x = chartPadding + idx * ((chartWidth - chartPadding * 2) / Math.max(buckets.length - 1, 1));
        const y = chartHeight - chartPadding - (point.tension / 10) * (chartHeight - chartPadding * 2);
        return `${x},${y}`;
      })
      .join(' ');

    return { trendSeries: buckets, trendPath: tPath, tensionPath: tensPath, mentionMax: mMax, tensionMax: 10 };
  }, [historicalSeries, timeframePosts, selectedProvince.mencionesRedes, selectedProvince.riskScore, selectedTimeframe]);

  // Rotate custom notices on the mini ticker automatically
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAlertIndex((prev) => {
        if (alerts.length === 0) return 0;
        return (prev + 1) % alerts.length;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [alerts.length]);

  // Handle reporting simulated incident
  const [reportingAlertToDb, setReportingAlertToDb] = useState(false);

  const handleAlertSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDescription) return;

    setReportingAlertToDb(true);
    try {
      const { error } = await supabase
        .from('alerts')
        .insert({
          title: formTitle,
          description: formDescription,
          province: formProvince,
          type: formType,
          status: 'pendiente'
        });
      if (error) throw error;

      setFormSubmitted(true);
      setTimeout(() => {
        setFormSubmitted(false);
        setFormTitle('');
        setFormDescription('');
      }, 2800);
    } catch (err) {
      console.error('Error reporting alert to database:', err);
    } finally {
      setReportingAlertToDb(false);
    }
  };

  // Filter & sort provinces for 'provinces' tab
  const filteredProvinces = provinces.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const blob = [
      p.name,
      (p as any).capital || '',
      (p as any).riskDescription || '',
      (p as any).activeAlert || '',
      ...(p.keyIssues || []),
      ...(p.indicators || []).map((ind: any) => `${ind.label} ${ind.value}`),
    ].join(' ').toLowerCase();
    return q.split(/\s+/).every((word) => blob.includes(word));
  }).sort((a, b) => {
    let order = 1;
    if (sortDirection === 'desc') order = -1;
    if (sortKey === 'name') {
      return a.name.localeCompare(b.name) * order;
    }
    return (a[sortKey] - b[sortKey]) * order;
  });

  // Master telemetry: from system_logs Supabase table (fetched in fetchSystemLogs useEffect)
  // systemLogs state is already set by fetchSystemLogs() called in useEffect on mount
  const telemetryLogs = systemLogs.length > 0
    ? systemLogs.map((log: any) => ({
        ts: new Date(log.ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        svc: log.service,
        msg: log.message,
        level: log.level,
      }))
    : [
        { ts: '—', svc: 'SISTEMA', msg: 'Conectando con sistema_logs en Supabase...', level: 'info' },
      ];

  const getDisplayName = () => {
    if (user?.fullName) {
      const parts = user.fullName.trim().split(/\s+/);
      return parts[0];
    }
    if (user?.email) {
      const prefix = user.email.split('@')[0];
      return prefix.slice(0, 8);
    }
    return 'Usuario';
  };

  // Top-bar logout helper (works with sync or async onLogout)
  const handleTopLogout = () => {
    // open internal modal instead of browser confirm
    setShowLogoutModal(true);
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutProcessing, setLogoutProcessing] = useState(false);

  const confirmLogout = async () => {
    try {
      setLogoutProcessing(true);
      const maybePromise: any = onLogout();
      if (maybePromise && typeof maybePromise.then === 'function') {
        await maybePromise;
      }
    } catch (e) {
      console.error('Error during logout:', e);
    } finally {
      setLogoutProcessing(false);
      setShowLogoutModal(false);
      window.location.href = '/';
    }
  };

  return (
    <div className="w-full h-screen bg-[#030304] text-gray-100 flex flex-col font-sans antialiased overflow-hidden">
      
      {showLogoutModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div className="relative bg-[#0b0b0d] border border-zinc-800 rounded-none p-5 w-full max-w-md text-zinc-100 shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-70">
            <h3 className="text-base font-black text-white mb-2">Cerrar sesión</h3>
            <p className="text-sm text-zinc-300 mb-4">¿Cerrar sesión y volver a la página principal?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowLogoutModal(false)} className="px-3 py-1.5 bg-transparent border border-zinc-700 text-zinc-300 hover:text-white">Cancelar</button>
              <button onClick={confirmLogout} disabled={logoutProcessing} className="px-3 py-1.5 bg-[#0099ff] text-white font-bold">Aceptar</button>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Inner App Frame */}
      <div className="flex-1 flex flex-col lg:flex-row shadow-2xl relative w-full h-full border-b border-zinc-900 overflow-hidden bg-[#030304]">
        
        {/* SIDEBAR TRAY - Left-side Navigation bar */}
        <div className="w-full lg:w-16 border-b lg:border-b-0 lg:border-r border-zinc-900 bg-[#030304] flex lg:flex-col items-center justify-between p-2.5 lg:py-3.5 lg:px-2 select-none shrink-0 overflow-x-auto lg:overflow-x-visible">
          
          {/* Logo badge / user profile */}
          <div className="hidden lg:flex flex-col items-center gap-1 pb-4 mb-4 border-b border-zinc-900 w-full">
            <img 
              src="/logo-iics-siglas.png" 
              alt="IICS Logo" 
              className="h-9 w-9 object-contain rounded-none"
            />
          </div>

          {/* Navigation group */}
          <div className="flex lg:flex-col gap-1.5 lg:w-full items-center">
            
            {/* Tab 1: Monitor Regional (Home) */}
            <button
              onClick={() => setActiveTab('home')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'home'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Monitor Regional Dashboard"
            >
              <Home className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [01] Monitor Regional
              </span>
            </button>

            {/* Tab 2: Provincias (Landmark) */}
            <button
              onClick={() => setActiveTab('provinces')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'provinces'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Análisis de Provincias"
            >
              <Landmark className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [02] Análisis Provincial
              </span>
            </button>

            {/* Tab 3: Estadísticas (LineChart) */}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'analytics'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Métricas Estadísticas"
            >
              <LineChart className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [03] Métricas y Coeficientes
              </span>
            </button>

            {/* Tab 4: Mapa de Alertas (MapPin) */}
            <button
              onClick={() => setActiveTab('map')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'map'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Zonificación Georreferenciada"
            >
              <MapPin className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [04] Zonificación GIS
              </span>
            </button>

            {/* Tab 5: Consola de Alertas (Bell) */}
            <button
              onClick={() => setActiveTab('alerts')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'alerts'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Monitoreo de Incidentes"
            >
              <div className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
              </div>
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [05] Consola de Alertas
              </span>
            </button>

            {/* Tab 6: Academia AFI & Datasets (BookCopy) */}
            <button
              onClick={() => setActiveTab('library')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'library'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Biblioteca y Datasets"
            >
              <BookCopy className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [06] Repositorio Científico
              </span>
            </button>

            {/* Tab: Difusión Transmedia (Video) */}
            <button
              onClick={() => setActiveTab('media')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'media'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Difusión Transmedia"
            >
              <Video className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [07] Difusión Transmedia
              </span>
            </button>

            {/* Tab: Academia AFI (GraduationCap) */}
            <button
              onClick={() => setActiveTab('afi')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'afi'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Academia AFI"
            >
              <GraduationCap className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [08] Academia AFI
              </span>
            </button>

            {/* Tab: Consultoría (Briefcase) */}
            <button
              onClick={() => setActiveTab('consulting')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'consulting'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Servicios de Consultoría"
            >
              <Briefcase className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [09] Consultoría & Sostenibilidad
              </span>
            </button>

            {/* Tab: Datos & Encuestas (Database) */}
            <button
              onClick={() => setActiveTab('data')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'data'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Datos & Encuestas"
            >
              <span className="material-symbols-outlined notranslate text-[20px]" translate="no">dataset</span>
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [10] Datos & Encuestas
              </span>
            </button>

            {/* Tab: Configuración (Settings) */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'settings'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Parámetros de Auditoría"
            >
              <Settings className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [11] Configuración Central
              </span>
            </button>

          </div>

          {/* Bottom user card / Logout button */}
          <div className="flex lg:flex-col lg:w-full items-center gap-4 lg:gap-1.5 lg:mt-auto pt-2.5 border-t lg:border-t border-zinc-900">
            
            {/* User Profile Avatar */}
            <div className="shrink-0 mb-1 lg:mb-1.5">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Avatar" 
                  className="h-9 w-9 rounded-full object-cover border border-cyan-800/30 shadow-[0_0_10px_rgba(0,153,255,0.1)]"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 font-bold text-xs uppercase font-mono">
                  {user?.email ? user.email.slice(0, 2) : 'IN'}
                </div>
              )}
            </div>

            <div className="flex flex-col text-right lg:text-center shrink-0">
              <span className="text-[10px] font-sans text-zinc-300 font-black block truncate max-w-[56px] notranslate uppercase" translate="no" title={user?.fullName || user?.email || 'Invitado'}>
                {getDisplayName()}
              </span>
              <span className="text-[8px] font-black text-cyan-400 bg-cyan-950/40 px-1 py-0.5 uppercase border border-cyan-800/20 rounded-none mt-0.5 block truncate max-w-[56px]" title={user?.role || 'Invitado'}>
                {user?.role || 'Invitado'}
              </span>
            </div>

            {user && ['Director', 'Subdirector', 'Docente', 'Secretaria', 'Gestor de Redes', 'Coordinador de Eventos', 'Auxiliar Técnico'].includes(user.role) && (
              <button
                onClick={() => window.location.href = '/admin'}
                className="flex h-10 w-10 items-center justify-center rounded-none text-cyan-400 hover:text-white bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-800/35 hover:border-cyan-500 transition-colors cursor-pointer"
                title="Ir a Gestión Interna (Admin)"
              >
                <Database className="h-5 w-5 animate-pulse" />
              </button>
            )}

            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex h-10 w-10 items-center justify-center rounded-none text-white bg-[#0099ff] hover:bg-[#007acc] transition-colors border border-transparent cursor-pointer"
              title="Cerrar Sesión Activa"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

        </div>

        {/* WORKSPACE CONTENT SHELF */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#030304] overflow-y-auto">
          
          {/* TOP INNER STATUS BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-zinc-900 p-4 gap-3 bg-black text-left">
            <div className="space-y-1">
              <h1 className="text-sm sm:text-base font-black text-white font-sans uppercase tracking-tight flex items-center gap-2">
                <nav className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase mb-1">
                  IICS / {activeTab}
                </nav>
                {activeTab === 'home' ? (
                  <span className="text-[#0099ff] font-mono tracking-widest font-black text-sm sm:text-base">MONITOR REGIONAL (IICS)</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                    <span className="text-xs sm:text-sm">
                      {activeTab === 'provinces' && 'CATASTRO REGIONAL (IICS)'}
                      {activeTab === 'analytics' && 'MÉTRICAS Y ANÁLISIS DE INCIDENCIA'}
                      {activeTab === 'map' && 'MAPEO GEORREFERENCIADO'}
                      {activeTab === 'alerts' && 'ALERTAS CÍVICAS'}
                      {activeTab === 'library' && 'REPOSITORIO GENERAL'}
                      {activeTab === 'media' && 'DIFUSIÓN TRANSMEDIA Y VIDEOTECA'}
                      {activeTab === 'afi' && 'ACADEMIA DE FORMACIÓN (AFI)'}
                      {activeTab === 'consulting' && 'SERVICIOS DE CONSULTORÍA Y SOSTENIBILIDAD'}
                      {activeTab === 'data' && 'BASE DE DATOS & ENCUESTAS — OBSERVATORIO IICS'}
                      {activeTab === 'settings' && 'CONFIGURACIÓN CENTRAL'}
                    </span>
                  </span>
                )}
              </h1>
            </div>

            {/* Quick action or filter */}
            <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
              <select
                value={selectedProvince.id}
                onChange={(e) => onSelectProvince(e.target.value)}
                className="bg-[#121214] hover:bg-[#18181b]/80 border border-zinc-800 text-xs text-zinc-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer font-sans"
              >
                {provinces.map((prov) => (
                  <option key={prov.id} value={prov.id}>
                    {prov.name}
                  </option>
                ))}
              </select>
              {/* Top logout button (always visible) */}
              <button
                onClick={handleTopLogout}
                className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-none bg-[#0099ff] text-white hover:bg-[#007acc] border border-transparent transition-colors"
                title="Cerrar sesión y volver a la landing"
                id="btn-top-logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </div>
          </div>

          {/* TAB ROUTER INLINE WRAPPER */}
          <div className="flex-1 p-4 lg:p-6 text-zinc-300">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="w-full h-full"
              >
                
                {/* VIEW 1: COGNITIVE DASHBOARD (HOME) */}
                {activeTab === 'home' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch h-full">
                    
                    {/* Left Column: Metric Core Indicators */}
                    <div className="lg:col-span-8 flex flex-col gap-5">
                      
                      {/* Conflict Index Gauge */}
                      <div className="bg-[#08080a] border border-[#16161a] rounded-none p-5 relative overflow-hidden group hover:border-[#0099ff]/25 transition-all text-left">
                        <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-cyan-400/5 to-transparent rounded-none"></div>
                        
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[9px] font-mono font-bold tracking-widest text-[#0099ff] uppercase bg-cyan-950/20 border border-cyan-800/10 px-2.5 py-0.5">
                              Métrica Integrada
                            </span>
                            <h2 className="text-base font-black text-white uppercase font-sans mt-3 tracking-wide">
                              Índice de Conflictividad y Tensión Coyuntural
                            </h2>
                            <p className="text-xs text-zinc-400 mt-1">
                              Suma promedio de demandas comunales, paros preventivos anotados y volatilidad de los reclamos en medios.
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 bg-emerald-950/30 border border-emerald-900/10 px-2.5 py-1 rounded-none">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>{timeframeConflicts.length} señal{timeframeConflicts.length !== 1 ? 'es' : ''} en {timeframeOptions.find((opt) => opt.id === selectedTimeframe)?.label.toLowerCase()}</span>
                          </div>
                        </div>

                        {/* Middle Stat Display */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center mt-6 py-4 border-y border-zinc-900/80">
                          
                          <div className="sm:col-span-4 flex items-baseline gap-1 bg-zinc-950/40 p-3 border border-zinc-900 select-none">
                            <span className="text-5xl font-black text-white font-mono leading-none tracking-tighter">
                              {selectedProvince.riskScore.toFixed(1)}
                            </span>
                            <span className="text-sm text-zinc-650">/10</span>
                            
                            <div className="ml-3">
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide rounded-none ${
                                selectedProvince.riskDescription === 'Alto'
                                  ? 'text-red-400 bg-red-950/40 border border-red-500/25'
                                  : selectedProvince.riskDescription === 'Moderado'
                                  ? 'text-yellow-400 bg-yellow-950/40 border border-yellow-500/25'
                                  : 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/20'
                              }`}>
                                {selectedProvince.riskDescription}
                              </span>
                              <span className="block text-[8px] font-mono text-zinc-550 mt-1 uppercase">Riesgo</span>
                            </div>
                          </div>

                          <div className="sm:col-span-5 text-xs text-zinc-400 leading-relaxed font-sans px-2">
                            <p className="font-semibold text-zinc-300">Determinación Territorial:</p>
                            <p>
                              La provincia de <b className="text-white">{selectedProvince.name}</b> registra un coeficiente de vulnerabilidad {selectedProvince.riskDescription.toLowerCase()}.
                              En este periodo hay <b className="text-white">{timeframePosts.length}</b> menciones reales en escucha social, <b className="text-white">{timeframeConflicts.length}</b> señal{timeframeConflicts.length !== 1 ? 'es' : ''} de conflicto y <b className="text-white">{selectedProvinceIndicators.length}</b> indicador{selectedProvinceIndicators.length !== 1 ? 'es' : ''} disponible{selectedProvinceIndicators.length !== 1 ? 's' : ''} en la base.
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/30 border border-cyan-800/15 px-2 py-0.5">Menciones: {timeframePosts.length}</span>
                              <span className="text-[10px] text-red-400 font-mono bg-red-950/30 border border-red-800/15 px-2 py-0.5">Conflictos: {timeframeConflicts.length}</span>
                              <span className="text-[10px] text-amber-400 font-mono bg-amber-950/30 border border-amber-800/15 px-2 py-0.5">Indicadores: {selectedProvinceIndicators.length}</span>
                            </div>
                          </div>

                          {/* Chart SVG */}
                          <div className="sm:col-span-3 flex flex-col items-end gap-2">
                            <div className="w-full max-w-[260px] bg-black/40 border border-zinc-900 p-2">
                              <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 mb-2">
                                <span className="uppercase tracking-[0.18em]">{historicalSeries.length > 0 && (selectedTimeframe === '30d' || selectedTimeframe === '90d') ? 'Series históricas' : 'Evolución real'}</span>
                                <span>{timeframePosts.length} menciones</span>
                              </div>
                              <svg viewBox="0 0 600 220" className="w-full h-[95px] overflow-visible">
                                <line x1="48" y1="176" x2="552" y2="176" stroke="#1f2937" strokeDasharray="3,3" />
                                <line x1="48" y1="132" x2="552" y2="132" stroke="#1f2937" strokeDasharray="3,3" />
                                <line x1="48" y1="88" x2="552" y2="88" stroke="#1f2937" strokeDasharray="3,3" />
                                <polyline
                                  fill="none"
                                  stroke="#0099ff"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={trendPath}
                                />
                                <polyline
                                  fill="none"
                                  stroke="#ef4444"
                                  strokeWidth="2"
                                  strokeDasharray="4,2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={tensionPath}
                                />
                                {trendSeries.map((point, idx) => {
                                  const chartWidth = 600;
                                  const chartHeight = 220;
                                  const chartPadding = 48;
                                  const x = chartPadding + idx * ((chartWidth - chartPadding * 2) / Math.max(trendSeries.length - 1, 1));
                                  const y = chartHeight - chartPadding - (point.mentions / mentionMax) * (chartHeight - chartPadding * 2);
                                  const tensionY = chartHeight - chartPadding - (point.tension / tensionMax) * (chartHeight - chartPadding * 2);
                                  return (
                                    <g key={`${point.label}-${idx}`}>
                                      <circle cx={x} cy={y} r="3" fill="#0099ff" />
                                      <circle cx={x} cy={tensionY} r="2.2" fill="#ef4444" />
                                      <text x={x - 10} y="208" fill="#71717a" fontSize="8" fontFamily="monospace">{point.label}</text>
                                    </g>
                                  );
                                })}
                              </svg>
                            </div>
                            <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500">
                              <span className="text-cyan-400">● Menciones</span>
                              <span className="text-red-400">● Tensión</span>
                            </div>
                          </div>

                        </div>

                        {/* Bottom elements active alerts */}
                        <div className="mt-4 space-y-3">
                          {selectedProvince.activeAlert ? (
                            <div className="flex items-start gap-3 bg-red-950/25 border border-red-500/15 p-3 rounded-none text-left">
                              <AlertTriangle className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-mono text-red-400 font-bold uppercase tracking-wider block">Alerta Territorial Activa de Alta Prioridad</span>
                                <p className="text-xs font-bold text-zinc-200">{selectedProvince.activeAlert}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5 bg-[#050506] border border-zinc-900 p-2 text-xs text-zinc-550 italic">
                              <span className="h-1.5 w-1.5 rounded-full bg-cyan-700 animate-pulse"></span>
                              <span>Canales fluidos sin eventos críticos graves identificados en las últimas 24 horas en esta provincia.</span>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2 pt-1.5">
                            <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase">Temas Críticos:</span>
                            {selectedProvince.keyIssues.map((issue) => (
                              <span key={issue} className="text-[10px] text-[#0099ff] font-mono bg-cyan-950/30 border border-cyan-800/15 px-2 py-0.5">
                                #{issue}
                              </span>
                            ))}
                          </div>
                        </div>

                      </div>

                      {/* Map preview */}
                      <div className="bg-[#08080a] border border-[#16161a] p-5 rounded-none text-left flex flex-col justify-between">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-zinc-900 pb-2 gap-2">
                          <div>
                            <span className="text-[9px] font-mono font-bold tracking-widest text-[#0099ff] uppercase bg-cyan-950/20 border border-cyan-800/10 px-2 py-0.5">Zonificación</span>
                            <h3 className="text-xs font-bold font-mono text-white tracking-wider uppercase mt-1">Esquema Cartográfico del Foco Regional</h3>
                          </div>
                          
                          {/* Map Toggles */}
                          <div className="flex items-center gap-1 bg-[#050507] border border-zinc-900 p-0.5 rounded-none self-start sm:self-center">
                            <button
                              onClick={() => setMapMode('vector')}
                              className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase transition-all duration-150 cursor-pointer ${
                                mapMode === 'vector' 
                                  ? 'bg-cyan-500 text-slate-950' 
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              Red Vectorial
                            </button>
                            <button
                              onClick={() => setMapMode('heatmap')}
                              className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase transition-all duration-150 cursor-pointer ${
                                mapMode === 'heatmap' 
                                  ? 'bg-cyan-500 text-slate-950' 
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              Mapa de Calor
                            </button>
                            <button
                              onClick={() => setMapMode('satellite')}
                              className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase transition-all duration-150 cursor-pointer ${
                                mapMode === 'satellite' 
                                  ? 'bg-cyan-500 text-slate-950' 
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              Satélite
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                          
                          {/* Mini Map area */}
                          <div className="sm:col-span-5 bg-[#050507] border border-zinc-900/40 p-1.5 h-48 flex items-center justify-center relative overflow-hidden rounded-none w-full">
                            {mapMode === 'satellite' ? (
                              <div className="w-full h-full relative z-10 font-mono">
                                <iframe
                                  title="Google Map Cajamarca mini"
                                  src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedProvince.name + ', Cajamarca, Peru')}&t=h&z=10&output=embed&iwloc=near`}
                                  className="w-full h-full border-0 filter grayscale-[15%] contrast-[110%]"
                                  allowFullScreen={false}
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                ></iframe>
                              </div>
                            ) : (
                              <>
                                <div className="absolute inset-0 bg-[#030304] bg-[linear-gradient(to_right,#111116_1px,transparent_1px),linear-gradient(to_bottom,#111116_1px,transparent_1px)] bg-[size:10px_10px] opacity-40 animate-pulse"></div>
                                
                                <svg viewBox="0 0 500 700" className="h-full w-auto max-w-[170px] text-zinc-800 z-10 opacity-90 transition-all duration-300">
                                  <defs>
                                    <radialGradient id="mini-heat-high" cx="50%" cy="50%" r="50%">
                                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.75" />
                                      <stop offset="35%" stopColor="#ef4444" stopOpacity="0.3" />
                                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                                    </radialGradient>
                                    <radialGradient id="mini-heat-mod" cx="50%" cy="50%" r="50%">
                                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.75" />
                                      <stop offset="35%" stopColor="#f59e0b" stopOpacity="0.3" />
                                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                                    </radialGradient>
                                    <radialGradient id="mini-heat-low" cx="50%" cy="50%" r="50%">
                                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.7" />
                                      <stop offset="35%" stopColor="#06b6d4" stopOpacity="0.2" />
                                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                                    </radialGradient>
                                  </defs>

                                  {/* Renders connecting vector links ONLY in vector mode */}
                                  {mapMode === 'vector' && (
                                    <g stroke="#1a1a24" strokeWidth="2.5" opacity="0.35">
                                      <line x1="190" y1="80" x2="280" y2="120" />
                                      <line x1="280" y1="120" x2="170" y2="190" />
                                      <line x1="170" y1="190" x2="220" y2="280" />
                                      <line x1="220" y1="280" x2="110" y2="310" />
                                      <line x1="220" y1="280" x2="230" y2="360" />
                                      <line x1="230" y1="360" x2="330" y2="350" />
                                      <line x1="110" y1="310" x2="100" y2="430" />
                                      <line x1="100" y1="430" x2="180" y2="450" />
                                      <line x1="180" y1="450" x2="270" y2="490" />
                                      <line x1="230" y1="360" x2="270" y2="490" />
                                      <line x1="330" y1="350" x2="270" y2="490" />
                                      <line x1="270" y1="490" x2="340" y2="540" />
                                      <line x1="270" y1="490" x2="90" y2="550" />
                                      <line x1="340" y1="540" x2="370" y2="620" />
                                    </g>
                                  )}

                                  {/* Renders heatmap glows under nodes in heatmap mode */}
                                  {mapMode === 'heatmap' && provinces.map((prov) => {
                                    const heatR = prov.riskScore * 13 + 18;
                                    const grad = prov.riskScore >= 7 
                                      ? 'url(#mini-heat-high)' 
                                      : prov.riskScore >= 4 
                                      ? 'url(#mini-heat-mod)' 
                                      : 'url(#mini-heat-low)';
                                    return (
                                      <circle
                                        key={`hm-mini-${prov.id}`}
                                        cx={prov.coordinates.x}
                                        cy={prov.coordinates.y}
                                        r={heatR}
                                        fill={grad}
                                        pointerEvents="none"
                                        className="mix-blend-screen"
                                      />
                                    );
                                  })}

                                  {/* Render points */}
                                  {provinces.map((prov) => (
                                    <g 
                                      key={prov.id} 
                                      className="cursor-pointer" 
                                      onClick={() => onSelectProvince(prov.id)}
                                    >
                                      <circle
                                        cx={prov.coordinates.x}
                                        cy={prov.coordinates.y}
                                        r="18"
                                        fill="transparent"
                                      />
                                      {/* Concentric targets representing thermal spot node */}
                                      <circle
                                        cx={prov.coordinates.x}
                                        cy={prov.coordinates.y}
                                        r={prov.id === selectedProvinceId ? '8' : '4'}
                                        fill={
                                          prov.riskScore >= 7
                                            ? '#ef4444'
                                            : prov.riskScore >= 4
                                            ? '#f59e0b'
                                            : '#06b6d4'
                                        }
                                        className={prov.id === selectedProvinceId ? 'animate-pulse' : ''}
                                      />
                                      {prov.id === selectedProvinceId && (
                                        <circle
                                          cx={prov.coordinates.x}
                                          cy={prov.coordinates.y}
                                          r="14"
                                          stroke="#0099ff"
                                          strokeWidth="1.2"
                                          fill="none"
                                          strokeDasharray="3,3"
                                        />
                                      )}
                                    </g>
                                  ))}
                                </svg>

                                <div className="absolute top-2/3 right-1/4 h-24 w-24 bg-red-600/10 rounded-full blur-2xl pointer-events-none animate-pulse"></div>
                              </>
                            )}
                          </div>

                          <div className="sm:col-span-7 space-y-4 text-xs text-zinc-400">
                            <div>
                              <span className="block text-[9px] font-mono text-zinc-550 font-bold uppercase">Ubicación Seleccionada:</span>
                              <span className="text-sm font-black text-white font-mono uppercase">{selectedProvince.name}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-left">
                              {selectedProvince.indicators.map((ind) => (
                                <div key={ind.label} className="bg-[#050506]/50 border border-zinc-900 p-2 rounded-none">
                                  <span className="block text-[9px] font-mono text-zinc-550 tracking-wide uppercase">{ind.label}</span>
                                  <span className="text-zinc-200 font-bold font-mono text-[11px] block mt-0.5">{ind.value}</span>
                                </div>
                              ))}
                            </div>

                            {(() => {
                              const hotspot = [...provinces].sort((a, b) => b.riskScore - a.riskScore)[0];
                              return hotspot ? (
                                <div className="bg-amber-950/20 border border-amber-900/15 p-2 rounded-none text-[10px] text-amber-300 flex items-center gap-1.5">
                                  <Flame className="h-4 w-4 text-amber-500 shrink-0" />
                                  <span>Foco Caliente Geolocalizado: <b>{hotspot.name.toUpperCase()} (Índice Combustión {hotspot.riskScore.toFixed(1)})</b></span>
                                </div>
                              ) : null;
                            })()}
                          </div>

                        </div>

                      </div>

                    </div>

                    {/* Right Column: Social metrics & Emergents */}
                    <div className="lg:col-span-4 flex flex-col gap-5">
                      
                      {/* Social Mentions Box */}
                      <div className="bg-[#08080a] border border-[#16161a] p-5 rounded-none text-left">
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-4">
                          <div>
                            <span className="text-[9px] font-mono font-black text-cyan-400 bg-cyan-950/20 border border-cyan-800/15 px-2 py-0.5">ESCUCHA ACTIVA API</span>
                            <h3 className="text-xs font-black text-white font-mono uppercase tracking-wider mt-1">Menciones Mediáticas</h3>
                          </div>
                          {(() => {
                            const now = Date.now();
                            const h48 = 48 * 3600 * 1000;
                            const recent = socialPosts.filter((p: any) => { const d = p.published_at ? new Date(p.published_at).getTime() : 0; return d > now - h48; }).length;
                            const prior  = socialPosts.filter((p: any) => { const d = p.published_at ? new Date(p.published_at).getTime() : 0; return d > now - h48 * 2 && d <= now - h48; }).length;
                            const delta  = prior > 0 ? Math.round(((recent - prior) / prior) * 100) : null;
                            if (delta === null) return null;
                            return (
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 border font-bold flex items-center gap-1 ${delta >= 0 ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/10' : 'text-red-400 bg-red-950/20 border-red-900/10'}`}>
                                {delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                <span>{delta >= 0 ? '+' : ''}{delta}%</span>
                              </span>
                            );
                          })()}
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-baseline justify-between">
                            <div>
                                <span className="text-4xl font-extrabold text-white font-mono tracking-tight leading-none">
                                  {selectedProvince.mencionesRedes.toLocaleString()}
                                </span>
                                <span className="block text-[9px] text-zinc-500 font-mono uppercase tracking-widest mt-1">Publicaciones Escaneadas</span>
                            </div>
                            <span className="text-xs text-zinc-400 font-mono">Últimas 48 horas</span>
                          </div>

                          {/* Sparkline mini bars — últimas 12 horas desde social_listening */}
                          <div className="flex items-end justify-between h-8 gap-1 p-1 bg-[#020203] border border-zinc-900/50">
                            {(() => {
                              const now = Date.now();
                              const SLOTS = 12;
                              const slotMs = 3600 * 1000;
                              const buckets = Array.from({ length: SLOTS }, (_, i) => {
                                const slotStart = now - (SLOTS - i) * slotMs;
                                const slotEnd   = now - (SLOTS - 1 - i) * slotMs;
                                return socialPosts.filter((p: any) => {
                                  const d = p.published_at ? new Date(p.published_at).getTime() : 0;
                                  return d >= slotStart && d < slotEnd;
                                }).length;
                              });
                              const maxVal = Math.max(...buckets, 1);
                              const hasData = buckets.some(b => b > 0);
                              const display = hasData
                                ? buckets.map(b => Math.max(5, Math.round((b / maxVal) * 100)))
                                : [15, 20, 17, 25, 20, 30, 22, 35, 28, 38, 30, 35];
                              return display.map((h, idx) => (
                                <div key={idx} className="flex-1 bg-zinc-900 h-full relative overflow-hidden group"
                                  title={hasData ? `Hora -${SLOTS - idx}: ${buckets[idx]} posts` : 'Sin datos aún'}>
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    transition={{ duration: 1.2, delay: idx * 0.04 }}
                                    className={`absolute bottom-0 left-0 right-0 transition-colors ${hasData ? 'bg-cyan-400 group-hover:bg-[#0099ff]' : 'bg-zinc-700 group-hover:bg-zinc-500'}`}
                                  />
                                </div>
                              ));
                            })()}
                          </div>
                        </div>

                      </div>

                      {/* Emergent Themes Indicator list */}
                      <div className="bg-[#08080a] border border-[#16161a] p-5 rounded-none text-left">
                        <span className="text-[9px] font-mono font-black text-cyan-400 bg-cyan-950/20 border border-cyan-800/15 px-2 py-0.5 uppercase">Modelamiento Temático</span>
                        <h3 className="text-xs font-black text-white font-mono uppercase mt-2.5 pb-2 border-b border-zinc-900">Áreas de Conflicto Clave</h3>
                        
                        <div className="space-y-3 pt-3">
                          {themes.map((theme) => (
                            <div key={theme.name} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-350 font-medium truncate">{theme.name}</span>
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-xs text-zinc-150 font-bold">{theme.percentage}%</span>
                                  {theme.trend === 'up' && <ArrowUp className="h-3 w-3 text-red-400" />}
                                  {theme.trend === 'down' && <ArrowDown className="h-3 w-3 text-emerald-400" />}
                                  {theme.trend === 'stable' && <span className="text-[8px] text-zinc-600">--</span>}
                                </div>
                              </div>
                              <div className="w-full bg-zinc-950 h-1.5 rounded-none overflow-hidden border border-zinc-900">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${theme.percentage}%` }}
                                  className="bg-cyan-500 h-full rounded-none"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Latest alerts revolving loop slider */}
                      <div className="bg-[#08080a] border border-[#16161a] p-4 rounded-none text-left flex-1 flex flex-col justify-between">
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase font-black tracking-widest">Últimas Alertas</span>
                          <Clock className="h-4 w-4 text-zinc-650" />
                        </div>

                        <div className="h-20 relative overflow-hidden my-3">
                          <AnimatePresence mode="wait">
                            {alerts.map((alert, idx) => {
                              if (idx !== currentAlertIndex) return null;
                              return (
                                <motion.div
                                  key={alert.id}
                                  initial={{ opacity: 0, x: 25 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -25 }}
                                  transition={{ duration: 0.3 }}
                                  className="absolute inset-0 flex flex-col justify-center text-xs"
                                >
                                  <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-550 mb-1 leading-none">
                                    <span className={`inline-block px-1.5 py-0.2 uppercase font-extrabold border ${
                                      alert.type === 'Alto'
                                        ? 'text-red-400 bg-red-950/30 border-red-900/30'
                                        : alert.type === 'Medio'
                                        ? 'text-yellow-400 bg-yellow-950/30 border-yellow-900/30'
                                        : 'text-cyan-400 bg-cyan-950/30 border-cyan-c800/20'
                                    }`}>
                                      {alert.type}
                                    </span>
                                    <span>{alert.time}</span>
                                    <span>•</span>
                                    <span className="text-cyan-500 font-bold">{alert.province}</span>
                                  </div>
                                  <h4 className="font-extrabold text-zinc-150 truncate max-w-full leading-tight">
                                    {alert.title}
                                  </h4>
                                  <p className="text-[10.5px] text-zinc-400 line-clamp-2 leading-relaxed mt-1">
                                    {alert.description}
                                  </p>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>

                        <button
                          onClick={() => setActiveTab('alerts')}
                          className="w-full text-center bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-[10px] tracking-wider font-mono font-bold text-cyan-400 hover:text-[#0099ff] uppercase py-2 py-1.5 transition-all text-left"
                        >
                          Ir a la consola de incidentes →
                        </button>
                      </div>

                    </div>

                  </div>
                )}

                {/* VIEW 2: CATASTRO PROVINCIAL (TABLE) */}
                {activeTab === 'provinces' && (
                  <div className="space-y-6 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-[#0099ff] font-bold uppercase bg-cyan-950/20 border border-cyan-800/10 px-2 py-0.5">Catastro</span>
                      <h2 className="text-base font-black text-white uppercase mt-1.5">Información Consolidada por Territorio</h2>
                      <p className="text-xs text-zinc-400">
                        Revise y filtre la base del IICS correspondiente a los coeficientes de calor, indicadores hídricos, volumen total de alertas registradas y nivel de cohesión indexado de las trece provincias cajamarquinas.
                      </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 items-stretch sm:items-center justify-between">
                      <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-550" />
                        <input
                          type="text"
                          placeholder="Buscar provincia o tema de interés (ej. cafés, contaminación)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-black border border-zinc-850 pl-10 pr-4 py-2 text-xs text-white outline-none focus:border-cyan-500 rounded-none placeholder-zinc-700"
                        />
                      </div>

                      <div className="flex gap-2 font-mono text-[11px] items-center">
                        <span className="text-zinc-555">Ordenar:</span>
                        <select
                          value={sortKey}
                          onChange={(e: any) => setSortKey(e.target.value)}
                          className="bg-black border border-zinc-850 text-zinc-200 p-2 text-xs cursor-pointer focus:border-cyan-500 rounded-none outline-none text-left"
                        >
                          <option value="name">Provincia (Nombre)</option>
                          <option value="riskScore">Índice Combustión</option>
                          <option value="mencionesRedes">Volatilidad de Redes</option>
                        </select>
                        <button
                          onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                          className="px-3 py-2 bg-black hover:bg-zinc-950 border border-zinc-c850 text-cyan-400 hover:text-white transition-colors uppercase font-bold"
                        >
                          {sortDirection === 'asc' ? 'Ascendente' : 'Descendente'}
                        </button>
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="border border-zinc-900 bg-black/40 overflow-hidden rounded-none">
                      <div className="grid grid-cols-12 bg-black border-b border-zinc-900 p-3.5 text-[10px] uppercase font-mono font-black text-zinc-400">
                        <span className="col-span-4 block text-left">Provincia</span>
                        <span className="col-span-3 block text-center">Índice de Riesgo</span>
                        <span className="col-span-2 block text-center">Alertas Totales</span>
                        <span className="col-span-3 block text-right">Menciones Redes</span>
                      </div>

                      <div className="divide-y divide-zinc-900 text-xs text-zinc-300 max-h-[350px] overflow-y-auto">
                        {filteredProvinces.map((prov) => (
                          <div 
                            key={prov.id} 
                            onClick={() => onSelectProvince(prov.id)}
                            className={`grid grid-cols-12 items-center p-3.5 hover:bg-zinc-900/40 cursor-pointer transition-colors ${
                              prov.id === selectedProvinceId ? 'bg-cyan-950/10 border-l-2 border-cyan-500' : ''
                            }`}
                          >
                            <div className="col-span-4 block text-left">
                              <span className="font-extrabold text-white text-sm block">{prov.name}</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {prov.keyIssues.map(issue => (
                                  <span key={issue} className="text-[8.5px] font-mono text-zinc-400 bg-zinc-900 px-1 py-0.2">
                                    #{issue}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <span className="col-span-3 block text-center">
                              <span className={`inline-block px-2.5 py-0.5 font-bold font-mono text-[10.5px] rounded-none border ${
                                prov.riskScore >= 7
                                  ? 'bg-red-950/30 text-red-200 border-red-500/20'
                                  : prov.riskScore >= 4
                                  ? 'bg-yellow-950/30 text-yellow-300 border-yellow-500/20'
                                  : 'bg-cyan-950/30 text-cyan-300 border-cyan-500/10'
                              }`}>
                                {prov.riskScore.toFixed(1)} / 10
                              </span>
                            </span>

                            <span className="col-span-2 block text-center font-mono font-medium text-zinc-150">
                              {prov.alertCount} alert(s)
                            </span>

                            <span className="col-span-3 block text-right font-mono text-cyan-400 font-bold text-sm">
                              {prov.mencionesRedes.toLocaleString()}
                            </span>

                          </div>
                        ))}

                        {filteredProvinces.length === 0 && (
                          <div className="p-12 text-center text-zinc-550 italic font-medium">
                            No se encontraron provincias con los criterios de búsqueda provistos.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ═══ PANEL DETALLE PROVINCIAL ROBUSTO ═══ */}
                    <div className="space-y-4">

                      {/* Hero — foto + KPIs básicos */}
                      <div className="bg-black border border-zinc-900 overflow-hidden">
                        <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)]">
                          {/* Foto + info básica */}
                          <div className="relative">
                            {(provinceDetail?.photo_url || selectedProvince.photoUrl) ? (
                              <img
                                src={provinceDetail?.photo_url || selectedProvince.photoUrl}
                                alt={selectedProvince.name}
                                className="w-full h-52 xl:h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-52 xl:h-full bg-gradient-to-br from-zinc-900 to-zinc-950 grid place-items-center">
                                <div className="text-center space-y-2">
                                  <MapPin className="h-10 w-10 text-zinc-700 mx-auto" />
                                  <span className="text-zinc-600 text-xs font-mono uppercase tracking-widest">Sin foto</span>
                                </div>
                              </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">Dossier Provincial IICS</span>
                              <h3 className="text-2xl font-black text-white font-mono uppercase leading-tight">{selectedProvince.name}</h3>
                              {provinceDetail?.capital && (
                                <span className="text-xs text-zinc-300 font-mono">Capital: {provinceDetail.capital}</span>
                              )}
                            </div>
                          </div>

                          {/* KPIs y descripción */}
                          <div className="p-5 space-y-4">
                            {/* Stats básicos */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="bg-zinc-950 border border-zinc-900 p-3 text-center">
                                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Riesgo IICS</span>
                                <span className={`text-xl font-black font-mono block mt-1 ${selectedProvince.riskScore >= 7 ? 'text-red-400' : selectedProvince.riskScore >= 4 ? 'text-yellow-400' : 'text-cyan-400'}`}>
                                  {selectedProvince.riskScore.toFixed(1)}
                                </span>
                                <span className="text-[9px] text-zinc-600 font-mono">/10 · {selectedProvince.riskDescription}</span>
                              </div>
                              <div className="bg-zinc-950 border border-zinc-900 p-3 text-center">
                                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Alertas</span>
                                <span className="text-xl font-black font-mono text-amber-400 block mt-1">{selectedProvince.alertCount}</span>
                                <span className="text-[9px] text-zinc-600 font-mono">activas</span>
                              </div>
                              <div className="bg-zinc-950 border border-zinc-900 p-3 text-center">
                                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Menciones</span>
                                <span className="text-xl font-black font-mono text-white block mt-1">{selectedProvince.mencionesRedes.toLocaleString()}</span>
                                <span className="text-[9px] text-zinc-600 font-mono">en redes</span>
                              </div>
                              <div className="bg-zinc-950 border border-zinc-900 p-3 text-center">
                                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Población</span>
                                <span className="text-xl font-black font-mono text-white block mt-1">
                                  {provinceDetail?.poblacion_estimada ? (provinceDetail.poblacion_estimada / 1000).toFixed(0) + 'k' : '—'}
                                </span>
                                <span className="text-[9px] text-zinc-600 font-mono">hab. estimados</span>
                              </div>
                            </div>

                            {/* Descripción de la BD */}
                            {provinceDetail?.descripcion && (
                              <div className="bg-zinc-950/50 border border-zinc-900 p-3">
                                <span className="text-[9px] font-mono text-cyan-500 uppercase tracking-widest block mb-1">Descripción Territorial</span>
                                <p className="text-xs text-zinc-300 leading-relaxed">{provinceDetail.descripcion}</p>
                              </div>
                            )}

                            {/* Economía + Fuentes */}
                            <div className="grid grid-cols-2 gap-3">
                              {provinceDetail?.economia_principal?.length > 0 && (
                                <div>
                                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1.5">Actividad Económica</span>
                                  <div className="flex flex-wrap gap-1">
                                    {provinceDetail.economia_principal.map((eco: string) => (
                                      <span key={eco} className="text-[9px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-900/20 px-1.5 py-0.5">{eco}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {(provinceDetail?.data_sources || selectedProvince.dataSources)?.length > 0 && (
                                <div>
                                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1.5">Fuentes de Datos</span>
                                  <div className="flex flex-wrap gap-1">
                                    {(provinceDetail?.data_sources || selectedProvince.dataSources || []).map((src: string) => (
                                      <span key={src} className="text-[9px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5">{src}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Filtro temporal */}
                            <div>
                              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1.5">Período de Análisis</span>
                              <div className="flex flex-wrap gap-2">
                                {timeframeOptions.map((opt) => (
                                  <button key={opt.id} type="button"
                                    onClick={() => setSelectedTimeframe(opt.id as any)}
                                    className={`text-[10px] border px-2.5 py-1.5 font-mono transition-colors cursor-pointer ${selectedTimeframe === opt.id ? 'bg-cyan-500 text-slate-950 border-cyan-500' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-cyan-500 hover:text-white'}`}>
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Historia & Cultura */}
                      {(provinceDetail?.historia || provinceDetail?.cultura) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {provinceDetail?.historia && (
                            <div className="bg-black border border-zinc-900 p-4">
                              <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest font-bold block mb-2 flex items-center gap-1.5">
                                Historia
                              </span>
                              <p className="text-xs text-zinc-400 leading-relaxed">{provinceDetail.historia}</p>
                            </div>
                          )}
                          {provinceDetail?.cultura && (
                            <div className="bg-black border border-zinc-900 p-4">
                              <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest font-bold block mb-2">
                                Cultura & Tradiciones
                              </span>
                              <p className="text-xs text-zinc-400 leading-relaxed">{provinceDetail.cultura}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Indicadores múltiples por categoría */}
                      {(provinceIndicators.length > 0 || selectedProvince.indicators.length > 0) && (
                        <div className="bg-black border border-zinc-900 p-5 space-y-4">
                          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                            <span className="text-xs font-bold font-mono text-white uppercase flex items-center gap-1.5">
                              <Activity className="h-4 w-4 text-cyan-400" />
                              Indicadores Territoriales
                            </span>
                            {/* Category filter */}
                            <div className="flex gap-1 flex-wrap">
                              {['all','economico','social','ambiental','seguridad','salud','educacion'].map(cat => (
                                <button key={cat} type="button"
                                  onClick={() => setDetailIndicatorCategory(cat)}
                                  className={`text-[8px] font-mono uppercase px-2 py-1 border cursor-pointer transition-all ${detailIndicatorCategory === cat ? 'bg-cyan-500 text-slate-950 border-cyan-500' : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-white hover:border-zinc-600'}`}>
                                  {cat === 'all' ? 'Todos' : cat}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* Real indicators from province_indicators table */}
                            {provinceIndicators
                              .filter(ind => detailIndicatorCategory === 'all' || ind.categoria === detailIndicatorCategory)
                              .map(ind => (
                              <div key={ind.id} className="bg-zinc-950 border border-zinc-900 p-3 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className={`text-[8px] font-mono uppercase font-bold px-1.5 py-0.5 ${
                                    ind.categoria === 'economico' ? 'text-emerald-400 bg-emerald-950/20' :
                                    ind.categoria === 'ambiental' ? 'text-green-400 bg-green-950/20' :
                                    ind.categoria === 'social'    ? 'text-blue-400 bg-blue-950/20' :
                                    ind.categoria === 'seguridad' ? 'text-red-400 bg-red-950/20' :
                                    ind.categoria === 'salud'     ? 'text-pink-400 bg-pink-950/20' :
                                    'text-purple-400 bg-purple-950/20'
                                  }`}>{ind.categoria}</span>
                                  {ind.tendencia === 'subida' && <ArrowUp className="h-3 w-3 text-red-400" />}
                                  {ind.tendencia === 'bajada' && <ArrowDown className="h-3 w-3 text-emerald-400" />}
                                  {ind.tendencia === 'estable' && <span className="text-[8px] text-zinc-600 font-mono">━</span>}
                                </div>
                                <span className="text-[10px] text-zinc-400 font-mono block">{ind.nombre}</span>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-base font-black text-white font-mono">
                                    {typeof ind.valor === 'number' ? ind.valor.toLocaleString() : ind.valor}
                                  </span>
                                  <span className="text-[9px] text-zinc-500 font-mono">{ind.unidad}</span>
                                </div>
                                {ind.fuente && <span className="text-[8px] text-zinc-600 font-mono block">Fuente: {ind.fuente} · {ind.periodo}</span>}
                              </div>
                            ))}
                            {/* Fallback: hardcoded indicators from province data */}
                            {provinceIndicators.length === 0 && selectedProvince.indicators.map((ind: any) => (
                              <div key={ind.label} className="bg-zinc-950 border border-zinc-900 p-3">
                                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">{ind.label}</span>
                                <span className="text-white font-extrabold font-mono text-sm block mt-1">{ind.value}</span>
                                <span className="text-[8px] text-zinc-700 font-mono">Fuente: datos locales</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Gráfica histórica provincial */}
                      {historicalSeries.length > 0 && (
                        <div className="bg-black border border-zinc-900 p-5 space-y-3">
                          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                            <span className="text-xs font-bold font-mono text-white uppercase">Tendencia Histórica</span>
                            <span className="text-[9px] font-mono text-zinc-500">province_historical_series · {selectedProvince.name}</span>
                          </div>
                          <svg viewBox="0 0 600 140" className="w-full h-32">
                            <line x1="0" y1="28" x2="600" y2="28" stroke="#18181b" strokeDasharray="3,3" />
                            <line x1="0" y1="70" x2="600" y2="70" stroke="#18181b" strokeDasharray="3,3" />
                            <line x1="0" y1="112" x2="600" y2="112" stroke="#18181b" strokeDasharray="3,3" />
                            {trendSeries.length > 0 && (
                              <>
                                <polyline fill="none" stroke="#06b6d4" strokeWidth="2.5" points={trendPath} />
                                <polyline fill="none" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="4,2" points={tensionPath} />
                                {trendSeries.map((pt, idx) => {
                                  const W = 600, H = 140, P = 30;
                                  const x = P + idx * ((W - P*2) / Math.max(trendSeries.length - 1, 1));
                                  const y1 = H - P - (pt.mentions / Math.max(mentionMax, 1)) * (H - P*2);
                                  const y2 = H - P - (pt.tension / 10) * (H - P*2);
                                  return (
                                    <g key={pt.label}>
                                      <circle cx={x} cy={y1} r="3" fill="#06b6d4" />
                                      <circle cx={x} cy={y2} r="3" fill="#ef4444" />
                                      <text x={x - 8} y={H - 2} fill="#71717a" fontSize="8" fontFamily="monospace">{pt.label}</text>
                                    </g>
                                  );
                                })}
                              </>
                            )}
                          </svg>
                          <div className="flex gap-4 text-[9px] font-mono">
                            <span className="flex items-center gap-1 text-cyan-400"><span className="w-3 h-0.5 bg-cyan-400 inline-block"></span>Menciones</span>
                            <span className="flex items-center gap-1 text-red-400"><span className="w-3 h-0.5 bg-red-400 inline-block"></span>Tensión</span>
                          </div>
                        </div>
                      )}

                      {/* Distritos y caseríos */}
                      {provinceDistricts.length > 0 && (
                        <div className="bg-black border border-zinc-900 p-5 space-y-4">
                          <div className="flex items-center justify-between border-b border-zinc-900 pb-2 flex-wrap gap-2">
                            <span className="text-xs font-bold font-mono text-white uppercase flex items-center gap-1.5">
                              <Landmark className="h-4 w-4 text-cyan-400" />
                              Distritos, Caseríos y Centros Poblados
                              <span className="text-zinc-600 font-normal">({provinceDistricts.length})</span>
                            </span>
                            <div className="flex gap-1">
                              {(['all','distrito','caserio','centro_poblado'] as const).map(tipo => (
                                <button key={tipo} type="button"
                                  onClick={() => setDetailDistrictFilter(tipo)}
                                  className={`text-[8px] font-mono uppercase px-2 py-1 border cursor-pointer transition-all ${detailDistrictFilter === tipo ? 'bg-cyan-500 text-slate-950 border-cyan-500' : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-white'}`}>
                                  {tipo === 'all' ? 'Todos' : tipo === 'centro_poblado' ? 'C. Poblado' : tipo}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                            {provinceDistricts
                              .filter(d => detailDistrictFilter === 'all' || d.tipo === detailDistrictFilter)
                              .map(d => (
                              <div key={d.id} className="bg-zinc-950 border border-zinc-900 p-3 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-white text-xs font-mono truncate">{d.nombre}</span>
                                  <span className={`text-[8px] font-mono px-1.5 py-0.5 ${
                                    d.tipo === 'distrito' ? 'text-cyan-400 bg-cyan-950/20' :
                                    d.tipo === 'caserio'  ? 'text-amber-400 bg-amber-950/20' :
                                    'text-purple-400 bg-purple-950/20'
                                  }`}>{d.tipo}</span>
                                </div>
                                {d.capital && <span className="text-[9px] text-zinc-500 font-mono block">Capital: {d.capital}</span>}
                                {d.poblacion && <span className="text-[9px] text-zinc-500 font-mono block">Pob: {d.poblacion.toLocaleString()} hab.</span>}
                                {d.altitud_msnm && <span className="text-[9px] text-zinc-600 font-mono block">{d.altitud_msnm} msnm</span>}
                                {d.descripcion && <p className="text-[9px] text-zinc-500 leading-relaxed line-clamp-2">{d.descripcion}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Provincial Social Listening Feed */}
                    <div className="bg-[#050506] border border-zinc-900 p-5 rounded-none text-left space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                        <span className="text-xs font-bold font-mono text-white uppercase flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-cyan-400" />
                          Escucha Territorial: {selectedProvince.name}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500">MENCIONES LOCALES EN TIEMPO REAL</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(() => {
                          const provincePosts = socialPosts.filter(
                            post => post.province?.toLowerCase() === selectedProvince.name.toLowerCase()
                          );
                          if (provincePosts.length === 0) {
                            return (
                              <div className="col-span-full py-8 text-center text-[10px] text-zinc-550 font-mono uppercase tracking-widest border border-dashed border-zinc-900">
                                No hay menciones registradas recientemente en la provincia de {selectedProvince.name}.
                              </div>
                            );
                          }
                          return provincePosts.slice(0, 6).map((post: any) => (
                            <div key={post.id} className="bg-black border border-zinc-950 p-4 space-y-2 text-left flex flex-col justify-between">
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-bold text-white font-mono">{post.author}</span>
                                <span className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider border ${
                                  post.sentiment === 'positive' ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30' :
                                  post.sentiment === 'negative' ? 'bg-red-950/20 text-red-400 border-red-900/30' :
                                  'bg-amber-950/20 text-amber-400 border-amber-900/30'
                                }`}>
                                  {post.sentiment === 'positive' ? 'Positivo' : post.sentiment === 'negative' ? 'Negativo' : 'Neutro'}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">{post.content}</p>
                              <span className="text-[9px] font-mono text-zinc-650 block text-right">
                                {post.published_at ? new Date(post.published_at).toLocaleDateString('es-PE', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '–'}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                  </div>
                )}

                {/* VIEW 3: ANALYTICS (CHARTS) */}
                {activeTab === 'analytics' && (
                  <div className="space-y-6 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-[#0099ff] font-bold uppercase bg-cyan-950/20 border border-cyan-800/10 px-2.5 py-0.5">Analítica Avanzada</span>
                      <h2 className="text-base font-black text-white uppercase mt-1.5">Métricas de Sentimiento y Progresión</h2>
                      <p className="text-xs text-zinc-400">
                        Visualización integrada de variables de conflictividad social versus tendencias de sentimiento andino en tiempo real (proyección semestral acumulada).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                      
                      {/* Interactive charting card */}
                      <div className="lg:col-span-8 bg-black border border-zinc-900 p-5 rounded-none flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-2">
                          <span className="text-xs font-bold font-mono text-white uppercase">Progresión Mensual de Conflicto vs Redes 2026</span>
                          <div className="flex items-center gap-4 text-[9px] font-mono">
                            <span className="flex items-center gap-1.5 text-cyan-400">
                              <span className="h-2 w-2 bg-cyan-400 rounded-none inline-block"></span> Menciones Redes (Miles)
                            </span>
                            <span className="flex items-center gap-1.5 text-red-400">
                              <span className="h-2 w-2 bg-red-400 rounded-none inline-block"></span> Incidencia de Tensión
                            </span>
                          </div>
                        </div>

                        {/* ── Dynamic Line Chart — usa trendSeries (useMemo real data) ── */}
                        <div className="h-64 bg-zinc-950/50 border border-zinc-900 flex items-end justify-between p-4 relative">
                          {/* Grid Y-axis labels */}
                          <div className="absolute top-2 left-2 flex flex-col justify-between h-56 text-[8px] font-mono text-zinc-650 opacity-80">
                            <span>10 (Altísimo)</span>
                            <span>7.5 (Elevado)</span>
                            <span>5.0 (Moderado)</span>
                            <span>2.5 (Estable)</span>
                            <span>0 (Nulo)</span>
                          </div>

                          {trendSeries.length === 0 ? (
                            <div className="w-full flex items-center justify-center h-full text-zinc-600 text-xs font-mono">
                              Sin datos para el período — agrega entradas en province_historical_series o social_listening
                            </div>
                          ) : (
                            <svg viewBox="0 0 600 220" className="w-full h-full text-zinc-700 overflow-visible z-10 px-6">
                              {/* Gridlines */}
                              <line x1="0" y1="44" x2="600" y2="44" stroke="#1c1917" strokeDasharray="3,3" />
                              <line x1="0" y1="88" x2="600" y2="88" stroke="#1c1917" strokeDasharray="3,3" />
                              <line x1="0" y1="132" x2="600" y2="132" stroke="#1c1917" strokeDasharray="3,3" />
                              <line x1="0" y1="176" x2="600" y2="176" stroke="#1c1917" strokeDasharray="3,3" />

                              {/* Menciones line (cyan) — from trendPath computed in useMemo */}
                              <polyline fill="none" stroke="#06b6d4" strokeWidth="3.2" points={trendPath} />
                              {/* Tensión line (red dashed) — from tensionPath computed in useMemo */}
                              <polyline fill="none" stroke="#ef4444" strokeWidth="3.2" strokeDasharray="4,2" points={tensionPath} />

                              {/* Data nodes with tooltips */}
                              {trendSeries.map((pt, idx) => {
                                const chartW = 600; const chartH = 220; const pad = 48;
                                const x  = pad + idx * ((chartW - pad * 2) / Math.max(trendSeries.length - 1, 1));
                                const y1 = chartH - pad - (pt.mentions / Math.max(mentionMax, 1)) * (chartH - pad * 2);
                                const y2 = chartH - pad - (pt.tension   / 10) * (chartH - pad * 2);
                                return (
                                  <g key={pt.label}>
                                    <circle cx={x} cy={y1} r="4" fill="#06b6d4">
                                      <title>{pt.label}: {pt.mentions.toLocaleString()} menciones</title>
                                    </circle>
                                    <circle cx={x} cy={y2} r="4" fill="#ef4444">
                                      <title>{pt.label}: tensión {pt.tension.toFixed(1)}/10</title>
                                    </circle>
                                    <text x={x - 8} y="215" fill="#a1a1aa" fontSize="9" fontFamily="monospace">{pt.label}</text>
                                  </g>
                                );
                              })}
                            </svg>
                          )}

                          <div className="absolute bottom-1 right-2 text-[8px] font-mono text-zinc-650 opacity-80 uppercase">
                            [ {historicalSeries.length > 0 ? 'Serie Histórica BD' : 'Social Listening'} · {selectedProvince.name} · {selectedTimeframe.toUpperCase()} ]
                          </div>
                        </div>

                      </div>

                      {/* Right Column: Sentiment Analysis & LSD Widget */}
                      <div className="lg:col-span-4 flex flex-col gap-4">
                        
                        <div className="bg-[#050506] border border-zinc-900 p-4 rounded-none text-left space-y-3">
                          <span className="block text-[9px] font-mono text-zinc-550 uppercase tracking-widest">LSD: Distribución de Sentimientos</span>
                          <h4 className="font-extrabold text-white font-mono uppercase">Análisis por Tópico Clave</h4>
                          
                          {/* Topic Selector */}
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            {[
                              { id: 'all', label: 'Todos' },
                              { id: 'mineria', label: 'Minería' },
                              { id: 'gobernabilidad', label: 'Gobernanza' },
                              { id: 'cohesion', label: 'Cohesión' }
                            ].map(t => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setSelectedSentimentTopic(t.id as any)}
                                className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                                  selectedSentimentTopic === t.id
                                    ? 'bg-cyan-950/40 text-cyan-400 border-cyan-850'
                                    : 'bg-black border-zinc-850 text-zinc-400 hover:text-white'
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>

                          {/* Dynamic Sentiments Distribution from social_listening DB */}
                          <div className="space-y-2 pt-2 border-t border-zinc-950">
                            {(() => {
                              const total = topicPosts.length || 1;
                              const pos = Math.round((topicPosts.filter((p: any) => p.sentiment === 'positive').length / total) * 100);
                              const neg = Math.round((topicPosts.filter((p: any) => p.sentiment === 'negative').length / total) * 100);
                              const neu = 100 - pos - neg;
                              const noRealData = socialPosts.length === 0;
                              const breakdown = noRealData
                                ? { pos: 0, neu: 0, neg: 0 }
                                : { pos, neu, neg };
                              return (
                                <div className="space-y-3">
                                  <div className="w-full h-3 bg-zinc-950 flex overflow-hidden border border-zinc-900">
                                    <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${breakdown.pos}%` }} title={`Positivo: ${breakdown.pos}%`} />
                                    <div className="bg-amber-500 h-full transition-all duration-500"  style={{ width: `${breakdown.neu}%` }} title={`Neutro: ${breakdown.neu}%`} />
                                    <div className="bg-red-500 h-full transition-all duration-500"    style={{ width: `${breakdown.neg}%` }} title={`Negativo: ${breakdown.neg}%`} />
                                  </div>
                                  <div className="flex justify-between items-center text-[9px] font-mono">
                                    <span className="text-emerald-400 font-bold">Positivo ({breakdown.pos}%)</span>
                                    <span className="text-amber-400 font-bold">Neutro ({breakdown.neu}%)</span>
                                    <span className="text-red-400 font-bold">Negativo ({breakdown.neg}%)</span>
                                  </div>
                                  {socialPosts.length > 0 && (
                                    <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wide">
                                      Basado en {topicPosts.length} entrada{topicPosts.length !== 1 ? 's' : ''} reales — IICS BD
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Local Media Listening Status */}
                        <div className="bg-[#050506] border border-zinc-900 p-4 rounded-none text-left">
                          <span className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Escucha de Medios Redes</span>
                          <h4 className="font-bold text-white font-mono uppercase mt-1">Robustez del Algoritmo</h4>
                          <p className="text-[11px] text-zinc-400 leading-relaxed mt-2.5 font-sans">
                            La asimetría de opiniones sobre proyectos territoriales se cataliza en Facebook y radios comunales locales un promedio de <b>7.2 días hábiles antes</b> de traducirse en paros o asambleas ronderas en campo.
                          </p>
                        </div>
                      </div>

                    </div>

                    {/* Live Social Listening simulated feed */}
                    <div className="bg-black border border-zinc-900 p-5 space-y-4 mt-6">
                      <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                        <span className="text-xs font-bold font-mono text-white uppercase flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-cyan-400" />
                          Escucha Activa Regional (Social Listening)
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500">CONECTADO AL CLÚSTER IICS</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(() => {
                          const filteredPosts = socialPosts.filter((p: any) =>
                            selectedSentimentTopic === 'all' || p.topic === selectedSentimentTopic
                          );
                          if (filteredPosts.length === 0) {
                            return (
                              <div className="col-span-full py-8 text-center text-[10px] text-zinc-550 font-mono uppercase tracking-widest border border-dashed border-zinc-900">
                                {socialPosts.length === 0
                                  ? 'Sin entradas en la BD — usa el módulo Escucha Social del admin para registrar la primera señal.'
                                  : 'No hay entradas para el tópico seleccionado.'}
                              </div>
                            );
                          }
                          return filteredPosts.slice(0, 6).map((post: any) => (
                            <div key={post.id} className="bg-[#030304] border border-zinc-900 p-4 space-y-2.5 text-left flex flex-col justify-between hover:border-zinc-800 transition-colors">
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-bold text-white font-mono">{post.author}</span>
                                <span className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider border ${
                                  post.sentiment === 'positive' ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30' :
                                  post.sentiment === 'negative' ? 'bg-red-950/20 text-red-400 border-red-900/30' :
                                  'bg-amber-950/20 text-amber-400 border-amber-900/30'
                                }`}>
                                  {post.sentiment === 'positive' ? 'Positivo' : post.sentiment === 'negative' ? 'Negativo' : 'Neutro'}
                                </span>
                              </div>
                              <p className="text-[11.5px] text-zinc-300 leading-relaxed font-sans">{post.content}</p>
                              <div className="flex justify-between items-center text-[9px] font-mono text-zinc-550 pt-2 border-t border-zinc-950">
                                <span>Ubicación: {post.province}</span>
                                <span>
                                  {post.published_at
                                    ? new Date(post.published_at).toLocaleDateString('es-PE', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
                                    : '–'}
                                </span>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                  </div>
                )}

                {/* VIEW 4: MAP DATA (MAP) */}
                {activeTab === 'map' && (
                  <div className="space-y-6 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-[#0099ff] font-bold uppercase bg-cyan-950/20 border border-cyan-800/10 px-2.5 py-0.5">Mapa GIS</span>
                      <h2 className="text-base font-black text-white uppercase mt-1.5 font-sans">Capas de Georreferenciación y Zonificación</h2>
                      <p className="text-xs text-zinc-400">
                        Zonificación multicapa del territorio. Examine las coordenadas relativas de criticidad, rumbos fluviales, y distribución espacial del IICS.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                      
                      {/* Large Map component representation */}
                      <div className={`lg:col-span-8 bg-black border border-zinc-900 p-5 rounded-none flex flex-col justify-between relative overflow-hidden min-h-[460px] ${mapFullscreen ? 'fixed inset-0 z-50 m-0 max-w-full w-full h-full p-6' : ''}`}>
                        
                        {/* Map Header with controls */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-zinc-900 mb-4 z-20 gap-2 w-full">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
                            <span className="text-[10px] font-mono font-bold text-zinc-400 tracking-wider uppercase">Visualizador de Campo en Tiempo Real</span>
                          </div>
                          
                          {/* Map Mode Buttons/Toggle */}
                          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4 items-center bg-[#050507] border border-zinc-900 p-1 rounded-none">
                            <button
                              onClick={() => setMapMode('vector')}
                              className={`px-2 py-1 text-[9px] font-mono font-bold uppercase transition-all duration-150 cursor-pointer ${
                                mapMode === 'vector' 
                                  ? 'bg-cyan-500 text-slate-950' 
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              Red Vectorial
                            </button>
                            <button
                              onClick={() => setMapMode('heatmap')}
                              className={`px-2 py-1 text-[9px] font-mono font-bold uppercase transition-all duration-150 cursor-pointer ${
                                mapMode === 'heatmap' 
                                  ? 'bg-cyan-500 text-slate-950' 
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              Mapa de Calor
                            </button>
                            <button
                              onClick={() => setMapMode('satellite')}
                              className={`px-2 py-1 text-[9px] font-mono font-bold uppercase transition-all duration-150 cursor-pointer ${
                                mapMode === 'satellite' 
                                  ? 'bg-cyan-500 text-slate-950' 
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              Satélite Live
                            </button>
                            <button
                              onClick={() => setMapColorMode(mapColorMode === 'riskScore' ? 'mencionesRedes' : 'riskScore')}
                              className={`px-2 py-1 text-[9px] font-mono font-bold uppercase transition-all duration-150 cursor-pointer ${
                                mapColorMode === 'riskScore' 
                                  ? 'bg-cyan-500 text-slate-950' 
                                  : 'bg-slate-700 text-white'
                              }`}
                            >
                              {mapColorMode === 'riskScore' ? 'Color por Riesgo' : 'Color por Menciones'}
                            </button>
                          </div>
                        </div>

                        {/* Map content area */}
                        <div className="flex-1 w-full flex items-center justify-center relative min-h-[380px]">
                          {mapMode === 'satellite' ? (
                            <div className="w-full h-full min-h-[380px] flex flex-col justify-between border border-zinc-900 bg-black z-10 relative overflow-hidden">
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,153,255,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),transparent_30%)] pointer-events-none"></div>
                              <iframe
                                title="Google Map Cajamarca Large"
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedProvince.name + ', Cajamarca, Peru')}&t=h&z=${mapZoomLevel}&output=embed&iwloc=near`}
                                className="w-full flex-1 min-h-[360px] border-0 filter brightness-95 contrast-[105%]"
                                allowFullScreen={false}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              ></iframe>
                              <div
                                className="pointer-events-none absolute inset-0"
                                style={{
                                  backgroundColor: getProvinceColor(selectedProvince),
                                  mixBlendMode: 'multiply',
                                  opacity: 0.14,
                                }}
                              />
                              <div className="bg-[#030304] border-t border-zinc-950 p-2.5 text-[10px] font-mono text-zinc-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <span className="uppercase">
                                  <b className="text-cyan-400">COORDENADAS SATELITALES:</b> {selectedProvince.name}, Cajamarca, Perú
                                </span>
                                <span className="text-[9px] text-zinc-500 italic hidden sm:inline">
                                  Zoom {mapZoomLevel}x • Vista regional en pantalla completa
                                </span>
                              </div>
                              <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                                <button
                                  onClick={() => setMapZoomLevel((prev) => Math.min(18, prev + 1))}
                                  className="px-2 py-1 bg-[#0099ff] text-white text-[10px] uppercase font-bold rounded-none border border-transparent"
                                >
                                  +Zoom
                                </button>
                                <button
                                  onClick={() => setMapZoomLevel((prev) => Math.max(8, prev - 1))}
                                  className="px-2 py-1 bg-[#111827] text-white text-[10px] uppercase font-bold rounded-none border border-zinc-800"
                                >
                                  -Zoom
                                </button>
                                <button
                                  onClick={() => setMapFullscreen((prev) => !prev)}
                                  className="px-2 py-1 bg-[#0f172a] text-white text-[10px] uppercase font-bold rounded-none border border-zinc-800"
                                >
                                  {mapFullscreen ? 'Salir F.C.' : 'Full Pant.'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="absolute inset-0 bg-[#0c0c0e] bg-[linear-gradient(to_right,#15151b_1px,transparent_1px),linear-gradient(to_bottom,#15151b_1px,transparent_1px)] bg-[size:15px_15px] opacity-30"></div>
                              
                              {/* Legend */}
                              <div className="absolute top-0 left-0 bg-black/95 border border-zinc-900 p-3.5 rounded-none text-[10px] font-mono text-zinc-400 space-y-1.5 z-20 text-left">
                                <span className="text-[9px] font-extrabold uppercase text-[#0099ff] tracking-wider block border-b border-zinc-850 pb-1 mb-1">
                                  {mapMode === 'heatmap' ? 'Leyenda Intensidad Térmica:' : 'Leyenda GIS:'}
                                </span>
                                <div className="flex items-center gap-2 text-red-500 font-bold font-mono">
                                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block animate-pulse"></span> {mapMode === 'heatmap' ? 'Foco Crítico (>= 7.0)' : 'Riesgo Alto (>= 7.0)'}
                                </div>
                                <div className="flex items-center gap-2 text-yellow-500 font-mono">
                                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 inline-block"></span> {mapMode === 'heatmap' ? 'Riesgo Elevado (4.0 - 6.9)' : 'Riesgo Moderado (4.0 - 6.9)'}
                                </div>
                                <div className="flex items-center gap-2 text-cyan-400 font-mono">
                                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 inline-block"></span> {mapMode === 'heatmap' ? 'Filtro Preventivo (< 4.0)' : 'Riesgo Bajo (< 4.0)'}
                                </div>
                              </div>

                              {/* Complete Cajamarca Map SVG */}
                              <svg viewBox="0 0 500 700" className="h-[380px] w-auto max-w-full text-zinc-850 z-10 transition-colors duration-300 relative">
                                <defs>
                                  <radialGradient id="heat-high" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.75" />
                                    <stop offset="35%" stopColor="#ef4444" stopOpacity="0.3" />
                                    <stop offset="75%" stopColor="#ef4444" stopOpacity="0.08" />
                                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                                  </radialGradient>
                                  <radialGradient id="heat-mod" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.75" />
                                    <stop offset="35%" stopColor="#f59e0b" stopOpacity="0.3" />
                                    <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.08" />
                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                                  </radialGradient>
                                  <radialGradient id="heat-low" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.7" />
                                    <stop offset="35%" stopColor="#06b6d4" stopOpacity="0.25" />
                                    <stop offset="75%" stopColor="#06b6d4" stopOpacity="0.05" />
                                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                                  </radialGradient>
                                </defs>

                                {/* Renders connecting vector links ONLY in vector mode */}
                                {mapMode === 'vector' && (
                                  <g stroke="#1e293b" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.4">
                                    <line x1="190" y1="80" x2="280" y2="120" />
                                    <line x1="280" y1="120" x2="170" y2="190" />
                                    <line x1="170" y1="190" x2="220" y2="280" />
                                    <line x1="220" y1="280" x2="110" y2="310" />
                                    <line x1="220" y1="280" x2="230" y2="360" />
                                    <line x1="230" y1="360" x2="330" y2="350" />
                                    <line x1="110" y1="310" x2="100" y2="430" />
                                    <line x1="100" y1="430" x2="180" y2="450" />
                                    <line x1="180" y1="450" x2="270" y2="490" />
                                    <line x1="230" y1="360" x2="270" y2="490" />
                                    <line x1="330" y1="350" x2="270" y2="490" />
                                    <line x1="270" y1="490" x2="340" y2="540" />
                                    <line x1="270" y1="490" x2="90" y2="550" />
                                    <line x1="340" y1="540" x2="370" y2="620" />
                                  </g>
                                )}

                                {/* Renders thermal heatmap gradients in heatmap mode */}
                                {mapMode === 'heatmap' && provinces.map((prov) => {
                                  const heatRadius = getProvinceHeatRadius(prov);
                                  const fillGradient = getProvinceColor(prov) === '#ef4444'
                                    ? 'url(#heat-high)'
                                    : getProvinceColor(prov) === '#f59e0b'
                                    ? 'url(#heat-mod)'
                                    : getProvinceColor(prov) === '#06b6d4'
                                    ? 'url(#heat-low)'
                                    : 'url(#heat-low)';
                                  
                                  return (
                                    <g key={`heatmap-glow-${prov.id}`} className="mix-blend-screen">
                                      <circle
                                        cx={prov.coordinates.x}
                                        cy={prov.coordinates.y}
                                        r={heatRadius}
                                        fill={fillGradient}
                                        pointerEvents="none"
                                      />
                                      {prov.id === selectedProvinceId && (
                                        <circle
                                          cx={prov.coordinates.x}
                                          cy={prov.coordinates.y}
                                          r={heatRadius + 12}
                                          stroke={getProvinceColor(prov)}
                                          strokeWidth="0.5"
                                          fill="none"
                                          opacity="0.3"
                                          className="animate-pulse"
                                        />
                                      )}
                                    </g>
                                  );
                                })}

                                {/* Render the province points */}
                                {provinces.map((prov) => {
                                  const isSelected = prov.id === selectedProvinceId;
                                  return (
                                    <g 
                                      key={prov.id} 
                                      className="cursor-pointer group" 
                                      onClick={() => onSelectProvince(prov.id)}
                                    >
                                      {/* Click target helper */}
                                      <circle
                                        cx={prov.coordinates.x}
                                        cy={prov.coordinates.y}
                                        r="24"
                                        fill="transparent"
                                      />
                                      
                                      {/* Concentric marker target representing focus center */}
                                      <circle
                                        cx={prov.coordinates.x}
                                        cy={prov.coordinates.y}
                                        r={isSelected ? '9' : '5'}
                                        fill={getProvinceColor(prov)}
                                        stroke={isSelected ? '#ffffff' : 'none'}
                                        strokeWidth="2"
                                        className="transition-all duration-300"
                                      />
                                      
                                      {isSelected && (
                                        <circle
                                          cx={prov.coordinates.x}
                                          cy={prov.coordinates.y}
                                          r="15"
                                          stroke="#0099ff"
                                          strokeWidth="1.2"
                                          fill="none"
                                          strokeDasharray="3,3"
                                        />
                                      )}

                                      {/* Province metadata indicators directly on map tag */}
                                      <text
                                        x={prov.coordinates.x + 11}
                                        y={prov.coordinates.y - 1}
                                        fill={isSelected ? '#0099ff' : '#ffffff'}
                                        fontSize="10"
                                        fontWeight={isSelected ? '900' : 'bold'}
                                        fontFamily="monospace"
                                        className="select-none tracking-tight pointer-events-none uppercase transition-colors duration-200"
                                      >
                                        {prov.name}
                                      </text>
                                      <text
                                        x={prov.coordinates.x + 11}
                                        y={prov.coordinates.y + 8}
                                        fill={getProvinceColor(prov)}
                                        fontSize="8"
                                        fontWeight="black"
                                        fontFamily="monospace"
                                        className="select-none pointer-events-none opacity-85"
                                      >
                                        {mapColorMode === 'riskScore'
                                          ? `R: ${prov.riskScore.toFixed(1)}`
                                          : `${prov.mencionesRedes}`}
                                      </text>
                                    </g>
                                  );
                                })}

                                {/* Geolocalized Alert Pinpoints overlay */}
                                {alerts.map((al) => {
                                  const coords = getAlertSvgCoords(al);
                                  if (!coords) return null;

                                  const isSelected = selectedAlertId === al.id;
                                  return (
                                    <g
                                      key={`alert-pin-${al.id}`}
                                      className="cursor-pointer group z-20"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedAlertId(isSelected ? null : al.id);
                                      }}
                                    >
                                      {/* Outer pulsating ring for active alerts */}
                                      <circle
                                        cx={coords.x}
                                        cy={coords.y}
                                        r={isSelected ? 16 : 8}
                                        fill="none"
                                        stroke={al.type === 'Alto' ? '#ef4444' : al.type === 'Medio' ? '#f59e0b' : '#10b981'}
                                        strokeWidth="1.5"
                                        className="animate-pulse"
                                        opacity="0.7"
                                      />
                                      {/* Small center pin */}
                                      <circle
                                        cx={coords.x}
                                        cy={coords.y}
                                        r={isSelected ? 5 : 3.5}
                                        fill={al.type === 'Alto' ? '#ef4444' : al.type === 'Medio' ? '#f59e0b' : '#10b981'}
                                        stroke="#ffffff"
                                        strokeWidth="1"
                                      />
                                      {/* Tiny map pin icon path */}
                                      <path
                                        d={`M ${coords.x} ${coords.y} L ${coords.x - 3} ${coords.y - 8} A 4 4 0 1 1 ${coords.x + 3} ${coords.y - 8} Z`}
                                        fill={al.type === 'Alto' ? '#ef4444' : al.type === 'Medio' ? '#f59e0b' : '#10b981'}
                                        stroke="#ffffff"
                                        strokeWidth="0.5"
                                        transform={`translate(0, -2) scale(${isSelected ? 1.5 : 1})`}
                                        transform-origin={`${coords.x} ${coords.y}`}
                                      />
                                    </g>
                                  );
                                })}
                                {/* ═══ SOCIAL CONFLICT PINS OVERLAY (real data) ═══ */}
                                {socialConflicts.map((conflict) => {
                                  const coords = getConflictSvgCoords(conflict);
                                  if (!coords) return null;
                                  const intensityColor =
                                    conflict.intensity === 'Crítico' ? '#ef4444' :
                                    conflict.intensity === 'Alto'    ? '#f97316' :
                                    conflict.intensity === 'Medio'   ? '#f59e0b' :
                                                                       '#06b6d4';
                                  return (
                                    <g key={`conflict-${conflict.id}`} className="cursor-default">
                                      <circle
                                        cx={coords.x}
                                        cy={coords.y}
                                        r={conflict.intensity === 'Crítico' ? 11 : 8}
                                        fill="none"
                                        stroke={intensityColor}
                                        strokeWidth="1.5"
                                        className={conflict.intensity === 'Crítico' ? 'animate-pulse' : ''}
                                        opacity="0.8"
                                      />
                                      <circle
                                        cx={coords.x}
                                        cy={coords.y}
                                        r={conflict.intensity === 'Crítico' ? 4 : 3}
                                        fill={intensityColor}
                                        stroke="#000"
                                        strokeWidth="1"
                                      />
                                      <text
                                        x={coords.x + 13}
                                        y={coords.y + 3}
                                        fill={intensityColor}
                                        fontSize="7"
                                        fontWeight="bold"
                                        fontFamily="monospace"
                                        className="select-none pointer-events-none uppercase"
                                      >
                                        {conflict.type?.slice(0,4)}
                                      </text>
                                    </g>
                                  );
                                })}

                              </svg>

                              {/* Water depth background aura */}
                              <div className="absolute top-1/2 left-1/3 h-32 w-32 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none animate-pulse"></div>

                              {/* Selected Alert Popup Detail */}
                              {selectedAlertId && (() => {
                                const selAlert = alerts.find(a => a.id === selectedAlertId);
                                if (!selAlert) return null;
                                return (
                                  <div className="absolute bottom-4 left-4 right-4 bg-[#0a0a0d] border border-zinc-800 p-3.5 z-30 font-sans text-xs text-left shadow-2xl animate-fade-in space-y-2">
                                    <div className="flex justify-between items-start border-b border-zinc-850 pb-1.5">
                                      <div>
                                        <span className={`px-1.5 py-0.2 text-[8px] font-mono font-bold uppercase rounded-none border mr-2 ${
                                          selAlert.type === 'Alto' ? 'bg-red-955/40 text-red-400 border-red-900/60' :
                                          selAlert.type === 'Medio' ? 'bg-yellow-955/40 text-yellow-400 border-yellow-900/60' :
                                          'bg-green-955/40 text-green-400 border-green-900/60'
                                        }`}>
                                          Prioridad {selAlert.type}
                                        </span>
                                        <span className="font-mono text-[9px] text-zinc-500 uppercase">{selAlert.province}</span>
                                      </div>
                                      <button 
                                        onClick={() => setSelectedAlertId(null)}
                                        className="text-zinc-500 hover:text-white"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                    <h4 className="font-bold text-white uppercase text-xs tracking-tight">{selAlert.title}</h4>
                                    <p className="text-zinc-400 leading-relaxed text-[11px]">{selAlert.description}</p>
                                    {selAlert.time && (
                                      <span className="block text-[8.5px] text-zinc-500 font-mono text-right">{selAlert.time}</span>
                                    )}
                                  </div>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right panel side drawer for information details */}
                      <div className="lg:col-span-4 bg-[#050506] border border-zinc-900 p-5 rounded-none flex flex-col justify-between text-left">
                        <div className="space-y-4">
                          <div className="border-b border-zinc-900 pb-3">
                            <span className="block text-[8px] font-mono text-zinc-500 uppercase tracking-widest">Información Satelital</span>
                            <h3 className="text-base font-black text-white font-mono uppercase tracking-tight mt-1">{selectedProvince.name}</h3>
                          </div>

                          <div className="grid grid-cols-1 gap-3 font-sans text-xs">
                            <div className="flex justify-between items-center bg-zinc-950 p-2.5 border border-zinc-900">
                              <span className="text-zinc-400 font-mono uppercase text-[9px]">Índice IICS:</span>
                              <span className="text-white font-mono font-bold">{selectedProvince.riskScore.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center bg-zinc-950 p-2.5 border border-zinc-900">
                              <span className="text-zinc-400 font-mono uppercase text-[9px]">Estatus Social:</span>
                              <span className={`font-mono font-bold uppercase text-[10px] px-1.5 py-0.2 ${selectedProvince.riskDescription === 'Alto' ? 'text-red-400' : selectedProvince.riskDescription === 'Moderado' ? 'text-yellow-400' : 'text-cyan-400'}`}>{selectedProvince.riskDescription}</span>
                            </div>
                            <div className="flex justify-between items-center bg-zinc-950 p-2.5 border border-zinc-900">
                              <span className="text-zinc-400 font-mono uppercase text-[9px]">Menciones Redes:</span>
                              <span className="text-zinc-100 font-mono">{selectedProvince.mencionesRedes.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center bg-zinc-950 p-2.5 border border-zinc-900">
                              <span className="text-zinc-400 font-mono uppercase text-[9px]">Color Mapa:</span>
                              <span className="text-cyan-400 font-bold uppercase text-[10px]">{mapColorMode === 'riskScore' ? 'Riesgo' : 'Menciones'}</span>
                            </div>
                            <div className="flex justify-between items-center bg-zinc-950 p-2.5 border border-zinc-900">
                              <span className="text-zinc-400 font-mono uppercase text-[9px]">Zoom Actual:</span>
                              <span className="text-zinc-100 font-mono">{mapZoomLevel}</span>
                            </div>
                          </div>

                          {selectedProvinceIndicators.length > 0 ? (
                            <div className="bg-[#030304] border border-zinc-900 p-3 text-[11px] text-zinc-400 leading-normal">
                              <span className="block font-mono font-bold text-zinc-500 text-[9px] uppercase tracking-wider mb-1">Indicadores Clave (provincia seleccionada)</span>
                              <div className="space-y-2">
                                {selectedProvinceIndicators.slice(0, 5).map((indicator: any) => (
                                  <div key={indicator.id} className="grid grid-cols-[1fr_auto] gap-2">
                                    <span className="text-[10px] text-zinc-300 font-mono uppercase">{indicator.indicador || indicator.categoria || 'Indicador'}</span>
                                    <span className={`text-[10px] ${indicator.valor ? 'text-emerald-400' : 'text-zinc-500'} font-bold font-mono`}>{indicator.valor ?? 'N/A'} {indicator.unidad || ''}</span>
                                  </div>
                                ))}
                                {selectedProvinceIndicators.length > 5 && (
                                  <div className="text-[9px] text-zinc-500 font-mono uppercase">+{selectedProvinceIndicators.length - 5} indicadores más</div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-[#030304] border border-zinc-900 p-3 text-[11px] text-zinc-400 leading-normal">
                              <span className="block font-mono font-bold text-zinc-500 text-[9px] uppercase tracking-wider mb-1">Indicadores Clave</span>
                              <p className="text-[10px] text-zinc-500">No hay indicadores cargados para esta provincia. Usa el módulo de datos para enlazar fuentes y agrupar métricas por territorio.</p>
                            </div>
                          )}

                          <div className="pt-4 border-t border-zinc-900 space-y-2">
                            <button
                              onClick={() => setActiveTab('provinces')}
                              className="w-full flex items-center justify-center gap-1 bg-[#101014] hover:bg-cyan-500 hover:text-slate-950 text-zinc-300 font-mono py-2 text-[10px] uppercase font-bold border border-zinc-850 hover:border-transparent transition-all cursor-pointer"
                            >
                              <span>Ver Ficha Técnica Consolidada</span>
                              <ChevronRight className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                              className="w-full flex items-center justify-center gap-1 bg-[#0f172a] hover:bg-[#111827] text-zinc-300 font-mono py-2 text-[10px] uppercase font-bold border border-zinc-850 transition-all cursor-pointer"
                            >
                              <span>Ir a vista completa</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW 5: ALERT CENTER (BELL & SUBMISSION FORM) */}
                {activeTab === 'alerts' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
                    
                    {/* Left Column: Notifications Stream Log */}
                    <div className="lg:col-span-7 space-y-4">
                      
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono tracking-widest text-amber-500 font-bold uppercase bg-amber-950/20 border border-amber-900/10 px-2 py-0.5">Consola Central</span>
                        <h2 className="text-base font-black text-white uppercase mt-1.5 font-sans">Historial de Incidentes Registrados</h2>
                        <p className="text-xs text-zinc-400">
                          Registro consolidado de asambleas ronderas, movilizaciones, tensiones y mesas multisectoriales. Los ingresos simulados fluyen instantáneamente en el sistema para evaluar simulacros de contingencia.
                        </p>
                      </div>

                      {/* Display Alert cards list */}
                      <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                        {alerts.map((al) => (
                          <div 
                            key={al.id} 
                            className="bg-black border border-zinc-900 hover:border-zinc-800 p-4 relative block text-left transition-colors"
                          >
                            <div className="flex items-center justify-between border-b border-zinc-950 pb-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`inline-block px-2 py-0.2 text-[9.5px] font-mono font-black uppercase text-[10px] rounded-none ${
                                  al.type === 'Alto'
                                    ? 'bg-red-950/30 text-red-400 border border-red-500/15'
                                    : al.type === 'Medio'
                                    ? 'bg-yellow-950/30 text-yellow-300 border border-yellow-500/15'
                                    : 'bg-cyan-950/30 text-cyan-400 border border-cyan-500/10'
                                }`}>
                                  {al.type}
                                </span>
                                <span className="text-xs font-bold text-white uppercase font-sans">{al.province}</span>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {al.time}
                              </span>
                            </div>

                            <h4 className="text-zinc-100 font-black text-xs uppercase leading-snug">{al.title}</h4>
                            <p className="text-zinc-400 text-[11px] leading-relaxed mt-2 font-sans">{al.description}</p>
                          </div>
                        ))}

                        {alerts.length === 0 && (
                          <div className="p-12 text-center text-zinc-550 italic font-medium border border-zinc-900 bg-black/40">
                            Ninguna alerta registrada o pendiente de auditar en el sistema.
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Right column: Incident creation pipeline (FORM) */}
                    <div className="lg:col-span-5 bg-black border border-zinc-900 p-5 rounded-none space-y-4">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-2.5">
                        <PlusCircle className="h-4.5 w-4.5 text-cyan-400 shrink-0" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Reportar Incidente Comunitario</h4>
                      </div>

                      <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                        Fomente la resiliencia territorial simulando reclamos. Al enviarla, será procesada por nuestro motor estadístico regional variando el índice de calor.
                      </p>

                      <form onSubmit={handleAlertSubmit} className="space-y-4 text-xs font-sans">
                        <div className="space-y-1">
                          <label className="text-[9.5px] font-mono font-bold text-zinc-500 uppercase block">Título de Alerta d Incidentes</label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Asamblea comunal extraordinaria sobre licencias hídricas..."
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            className="w-full bg-[#030304] border border-zinc-850 p-2.5 text-xs text-white placeholder-zinc-700 outline-none focus:border-cyan-500 rounded-none font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-500 uppercase block">Provincia</label>
                            <select
                              value={formProvince}
                              onChange={(e) => setFormProvince(e.target.value)}
                              className="w-full bg-[#030304] border border-zinc-850 p-2.5 text-xs text-white outline-none cursor-pointer rounded-none text-left"
                            >
                              {provinces.map((prov) => (
                                <option key={prov.id} value={prov.name}>{prov.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-500 uppercase block">Gravedad</label>
                            <select
                              value={formType}
                              onChange={(e: any) => setFormType(e.target.value)}
                              className="w-full bg-[#030304] border border-zinc-850 p-2.5 text-xs text-white outline-none cursor-pointer rounded-none text-left"
                            >
                              <option value="Bajo">Baja (Mesa Informativa)</option>
                              <option value="Medio">Media (Tensión / Reclamo)</option>
                              <option value="Alto">Alta (Paro / Movilización)</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9.5px] font-mono font-bold text-zinc-500 uppercase block">Descripción y Contextualización</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Fije los hechos, cuenca fluvial involucrada, y entidades con quienes se busca establecer conciliación en campo..."
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            className="w-full bg-[#030304] border border-zinc-850 p-2.5 text-xs text-white placeholder-zinc-700 outline-none focus:border-cyan-500 rounded-none resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={formSubmitted}
                          className="w-full flex items-center justify-center gap-2 bg-[#0099ff] hover:bg-cyan-400 text-slate-950 font-bold uppercase py-2.5 text-xs rounded-none transition-all cursor-pointer"
                        >
                          <Send className="h-4 w-4" />
                          <span>Enviar Alerta de Monitoreo</span>
                        </button>
                      </form>

                      <AnimatePresence>
                        {formSubmitted && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[10.5px] p-2.5 rounded-none text-center flex items-center justify-center gap-2 font-mono font-semibold"
                          >
                            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span>¡Ingreso Procesado! Reflejado en las métricas e índices.</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>

                  </div>
                )}

                {/* VIEW 6: RESEARCH LOGS & DATASETS (BOOKOPEN) */}
                {activeTab === 'library' && (
                  <div className="space-y-6 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-[#0099ff] font-bold uppercase bg-cyan-950/20 border border-cyan-800/10 px-2.5 py-0.5">Repositorio</span>
                      <h2 className="text-base font-black text-white uppercase mt-1.5 font-sans">Consola Virtual de Datos y Academia AFI</h2>
                      <p className="text-xs text-zinc-400">
                        Acceso directo a raw datasets científicos del IICS, publicaciones indexadas, pre-prints de investigadores y el portal de inscripción de la AFI.
                      </p>
                    </div>

                    {/* Local Sub-Navigation Tabs */}
                    <div className="flex border-b border-zinc-900 mb-6 gap-2 overflow-x-auto whitespace-nowrap">
                      <button
                        onClick={() => setLibrarySubTab('publications')}
                        className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                          librarySubTab === 'publications'
                            ? 'border-cyan-500 text-cyan-400 font-black'
                            : 'border-transparent text-gray-500 hover:text-white'
                        }`}
                      >
                        Buscador de Publicaciones
                      </button>
                      <button
                        onClick={() => setLibrarySubTab('preprints')}
                        className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                          librarySubTab === 'preprints'
                            ? 'border-cyan-500 text-cyan-400 font-black'
                            : 'border-transparent text-gray-500 hover:text-white'
                        }`}
                      >
                        Buzón de Pre-prints
                      </button>
                      <button
                        onClick={() => setLibrarySubTab('datasets')}
                        className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                          librarySubTab === 'datasets'
                            ? 'border-cyan-500 text-cyan-400 font-black'
                            : 'border-transparent text-gray-500 hover:text-white'
                        }`}
                      >
                        Datos Abiertos
                      </button>
                    </div>

                    {/* Render Subtab contents */}
                    {librarySubTab === 'publications' && (
                      <div className="bg-black border border-zinc-900 p-6">
                        <PublicationsSection isSubPage={true} onCloseSubPage={() => setActiveTab('home')} />
                      </div>
                    )}

                    {librarySubTab === 'preprints' && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Preprints upload & Academic Becarios info */}
                        <div className="lg:col-span-7 space-y-4">
                          <div className="space-y-1 text-left pb-1 border-b border-zinc-900">
                            <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                              <GraduationCap className="h-4.5 w-4.5 text-[#0099ff]" />
                              Buzón Academia AFI (Borradores & Pre-prints)
                            </h4>
                          </div>

                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!draftTitle || !draftFile) { alert('Determina un título y un archivo.'); return; }
                              setDraftSubmitted(true);
                              try {
                                const { error } = await supabase.from('draft_submissions').insert({
                                  user_id: user?.id || null,
                                  title: draftTitle, line: draftLine, filename: draftFile,
                                  status: 'En Cola de Revisión de Pares',
                                });
                                if (error) throw error;
                                await fetchDraftSubmissions();
                                setDraftTitle(''); setDraftFile('');
                                alert(`✅ Pre-print "${draftTitle}" registrado en el sistema IICS.`);
                              } catch (err: any) {
                                console.warn('draft_submissions no disponible, guardando en memoria:', err.message);
                                setSubmittedDrafts([{ id: Math.random().toString(), title: draftTitle, line: draftLine, filename: draftFile, date: 'Hoy', status: 'En Cola de Revisión de Pares' }, ...submittedDrafts]);
                                setDraftTitle(''); setDraftFile('');
                              } finally { setDraftSubmitted(false); }
                            }}
                            className="bg-[#030304] border border-zinc-900 p-5 space-y-4"
                          >
                            <div className="space-y-1 text-left">
                              <label className="text-[9.5px] font-mono font-bold text-zinc-550 uppercase">Título del Artículo / Propuesta</label>
                              <input 
                                type="text"
                                required
                                value={draftTitle}
                                onChange={(e) => setDraftTitle(e.target.value)}
                                className="w-full bg-black border border-zinc-850 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none placeholder-zinc-700"
                                placeholder="Ej. Dinámicas de fricción social en cuencas altas..."
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1 text-left">
                                <label className="text-[9.5px] font-mono font-bold text-zinc-550 uppercase">Línea del IICS Correspondiente</label>
                                <select
                                  value={draftLine}
                                  onChange={(e) => setDraftLine(e.target.value)}
                                  className="w-full bg-black border border-zinc-850 p-2.5 text-xs text-zinc-300 outline-none cursor-pointer rounded-none text-left"
                                >
                                   {researchLines.map((line, i) => (
                                     <option key={line} value={line}>Línea {i + 1}: {line}</option>
                                   ))}
                                </select>
                              </div>

                              <div className="space-y-1 text-left">
                                <label className="text-[9.5px] font-mono font-bold text-zinc-550 uppercase">Nombre de Archivo / Referencia del Manuscrito</label>
                                <input 
                                  type="text"
                                  required
                                  value={draftFile}
                                  onChange={(e) => setDraftFile(e.target.value)}
                                  className="w-full bg-black border border-zinc-850 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none placeholder-zinc-700 font-mono"
                                  placeholder="Ej. articulo_rondas_chota_draft.pdf"
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={draftSubmitted}
                              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-mono font-black py-3 text-[10.5px] uppercase tracking-widest border-none cursor-pointer transition-colors"
                            >
                              {draftSubmitted ? 'Procesando Envío...' : 'Enviar Borrador para Arbitraje'}
                            </button>
                          </form>
                        </div>

                        {/* Right column: Submitted Preprints list */}
                        <div className="lg:col-span-5 space-y-4">
                          <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider pb-1 border-b border-zinc-900 flex items-center justify-between">
                            <span>Mis Borradores ({submittedDrafts.length})</span>
                            {loadingDrafts && <span className="text-[9px] text-cyan-500 animate-pulse normal-case font-normal">Cargando...</span>}
                          </h4>
                          <div className="space-y-2">
                            {submittedDrafts.length === 0 && !loadingDrafts && (
                              <div className="py-10 text-center border border-dashed border-zinc-900">
                                <p className="text-zinc-600 text-[10px] font-mono">Aún no has enviado borradores.</p>
                                <p className="text-zinc-700 text-[9px] font-mono mt-1">Usa el formulario para registrar tu pre-print.</p>
                              </div>
                            )}
                            {submittedDrafts.map((d) => (
                              <div key={d.id} className="bg-black border border-zinc-900 p-3 flex justify-between items-start gap-2 text-left hover:border-zinc-700 transition-colors">
                                <div className="space-y-0.5 flex-1 min-w-0">
                                  <h6 className="font-extrabold text-[#0099ff] line-clamp-2 text-xs leading-snug">{d.title}</h6>
                                  <p className="text-[9.5px] text-zinc-500 font-mono truncate">{d.line}</p>
                                  <p className="text-[9px] text-zinc-600 font-mono truncate">{d.filename || d.file_url || '—'}</p>
                                  <p className="text-[9px] text-zinc-700 font-mono">
                                    {d.created_at ? new Date(d.created_at).toLocaleDateString('es-PE') : (d.date || 'Hoy')}
                                  </p>
                                </div>
                                <span className={`text-[8px] font-mono whitespace-nowrap px-2 py-1 uppercase font-bold shrink-0 ${
                                  d.status === 'Aprobado' || d.status === 'Publicado'
                                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40'
                                    : d.status === 'Rechazado'
                                    ? 'bg-red-950/40 text-red-400 border border-red-900/40'
                                    : 'bg-amber-950/40 text-amber-500 border border-amber-900/40'
                                }`}>
                                  {d.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {librarySubTab === 'datasets' && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Datasets repository download */}
                        <div className="lg:col-span-12 space-y-4">
                          <div className="space-y-1 text-left pb-1 border-b border-zinc-900">
                            <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                              <Database className="h-4 w-4 text-[#0099ff]" />
                              Bases de Datos Descargables (Ciudadanos)
                            </h4>
                          </div>

                          {downloadSuccessNotice && (
                            <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center gap-2">
                              <Check className="h-4 w-4 text-emerald-400" />
                              <span>{downloadSuccessNotice}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {(researchDatasets.length > 0 ? researchDatasets : [
                              { id: 'fb-1', filename: 'IICS_social_conflict_indicators_2026_Q1.xlsx', descripcion: 'Indicadores agregados mensuales de tensiones socioambientales.', size_mb: 4.2, categoria: 'conflictos', hash_sha256: '8f9e2b1c4a037b5e', download_url: '' },
                              { id: 'fb-2', filename: 'Cajamarca_GIS_Vulnerability_v2.zip', descripcion: 'Capas vectoriales georreferenciadas con pasivos ambientales y cuencas.', size_mb: 18.5, categoria: 'gis', hash_sha256: 'd5a49e2fc8e331b0', download_url: '' },
                              { id: 'fb-3', filename: 'Cohesion_Social_Cajamarca_SPSS.sav', descripcion: 'Resultado de encuestas sobre cohesión agraria y confianza institucional (1,100 familias).', size_mb: 1.1, categoria: 'encuestas', hash_sha256: '1a9c0d4bb8e2bc77', download_url: '' },
                            ]).map((ds: any) => {
                              const isDownloading = downloadingId === ds.id;
                              return (
                                <div key={ds.id} className="bg-[#030304] border border-zinc-900 p-4 flex flex-col justify-between min-h-[220px]">
                                  <div className="space-y-1.5 text-left">
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                      <span className="text-cyan-400 font-extrabold block uppercase">{ds.categoria}</span>
                                      <span className="text-zinc-500 block">{ds.size_mb ? `${ds.size_mb} MB` : '—'}</span>
                                    </div>
                                    <h5 className="text-xs font-bold text-white font-mono break-all leading-snug">{ds.filename}</h5>
                                    <p className="text-[11px] text-zinc-400 leading-normal">{ds.descripcion}</p>
                                    {ds.hash_sha256 && (
                                      <div className="flex items-center justify-between bg-black border border-zinc-950 p-2 text-[9px] font-mono text-zinc-600">
                                        <span className="truncate w-10/12">SHA256: {ds.hash_sha256}</span>
                                        <button onClick={() => navigator.clipboard.writeText(ds.hash_sha256)} className="text-cyan-500 hover:text-white cursor-pointer bg-transparent border-none outline-none" title="Copiar">
                                          <Copy className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-4 pt-3 border-t border-zinc-950">
                                    {isDownloading ? (
                                      <div className="space-y-1.5 font-mono text-[9px]">
                                        <div className="flex justify-between text-cyan-400">
                                          <span>Preparando descarga...</span>
                                          <span>{downloadProgress}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-zinc-950 overflow-hidden border border-zinc-900">
                                          <div className="bg-cyan-400 h-full transition-all duration-200" style={{ width: `${downloadProgress}%` }} />
                                        </div>
                                      </div>
                                    ) : ds.download_url ? (
                                      <a href={ds.download_url} target="_blank" rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center gap-1.5 bg-zinc-950 hover:bg-cyan-500 text-zinc-400 hover:text-slate-950 font-mono py-2 text-[10px] uppercase font-bold border border-zinc-900 hover:border-transparent transition-all">
                                        <FileDown className="h-3.5 w-3.5" /><span>Descargar Dataset</span>
                                      </a>
                                    ) : (
                                      <button type="button" onClick={() => {
                                          setDownloadingId(ds.id); setDownloadProgress(0);
                                          const iv = setInterval(() => {
                                            setDownloadProgress((p) => {
                                              if (p >= 100) { clearInterval(iv); setTimeout(() => { setDownloadingId(null); setDownloadSuccessNotice(`Dataset "${ds.filename}" descargado con éxito.`); setTimeout(() => setDownloadSuccessNotice(null), 4000); }, 300); return 100; }
                                              return p + 25;
                                            });
                                          }, 180);
                                        }}
                                        className="w-full flex items-center justify-center gap-1.5 bg-zinc-950 hover:bg-cyan-500 text-zinc-400 hover:text-slate-950 font-mono py-2 text-[10px] uppercase font-bold border border-zinc-900 hover:border-transparent transition-all cursor-pointer">
                                        <FileDown className="h-3.5 w-3.5" /><span>Simular Descarga</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}



                  </div>
                )}

                {/* VIEW: MEDIA TRANSMEDIA & VIDEOTECA */}
                {activeTab === 'media' && (
                  <div className="space-y-6 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-[#0099ff] font-bold uppercase bg-cyan-950/20 border border-cyan-800/10 px-2.5 py-0.5">Difusión Transmedia</span>
                      <h2 className="text-base font-black text-white uppercase mt-1.5 font-sans">Videoteca de Sociología Territorial</h2>
                      <p className="text-xs text-zinc-400">
                        Explore los documentales y reportajes de campo producidos por el IICS sobre problemáticas de Cajamarca y del norte peruano.
                      </p>
                    </div>

                    {/* Cinematic Video Player Overlay */}
                    {playingDoc && (
                      <div className="bg-[#050506] border border-zinc-900 p-4 md:p-6 rounded-none relative">
                        <button
                          onClick={() => setPlayingDoc(null)}
                          className="absolute top-4 right-4 z-55 p-1.5 bg-black border border-zinc-850 text-gray-400 hover:text-white hover:border-zinc-750 transition-colors cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>

                        <div className="relative aspect-video w-full max-w-4xl mx-auto bg-black border border-zinc-900 flex flex-col justify-center items-center overflow-hidden">
                          {loadingVideo ? (
                            <div className="flex flex-col items-center gap-3">
                              <span className="text-xs font-mono text-cyan-400 animate-pulse">Cargando reproductor transmedia...</span>
                            </div>
                          ) : (
                            (() => {
                              const youtubeRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                              const match = playingDoc.video_url?.match(youtubeRegex);
                              const embedId = match && match[2].length === 11 ? match[2] : null;
                              if (embedId) {
                                return (
                                  <iframe
                                    src={`https://www.youtube.com/embed/${embedId}?autoplay=1`}
                                    className="absolute inset-0 w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={playingDoc.title}
                                  />
                                );
                              }
                              return (
                                <div className="absolute inset-0 flex flex-col justify-center items-center p-8 bg-zinc-950">
                                  <Play className="h-16 w-16 text-cyan-400 opacity-80 hover:opacity-100 transition-opacity mb-4 cursor-pointer" />
                                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">{playingDoc.title}</h3>
                                  <p className="text-xs text-zinc-400 max-w-xl text-center mt-2">{playingDoc.desc}</p>
                                  <p className="text-[10px] text-zinc-550 font-mono mt-4">Autoría: {playingDoc.authors} ({playingDoc.year})</p>
                                </div>
                              );
                            })()
                          )}
                        </div>
                      </div>
                    )}

                    {loadingTransmedia ? (
                      <div className="h-48 flex items-center justify-center">
                        <span className="text-xs font-mono text-cyan-400 animate-pulse">Cargando videoteca transmedia...</span>
                      </div>
                    ) : transmediaVideos.length === 0 ? (
                      <div className="border border-zinc-900 p-12 text-center text-zinc-550 font-mono text-xs">
                        No hay documentales ni cápsulas transmedia disponibles en este momento.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {transmediaVideos.map(doc => (
                          <div key={doc.id} className="bg-[#030304] border border-zinc-900 overflow-hidden flex flex-col md:flex-row group hover:border-zinc-800 transition-colors">
                            <div className="md:w-1/3 aspect-video md:aspect-auto relative overflow-hidden bg-zinc-950">
                              <img src={doc.thumbnail_url} alt={doc.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-85 transition-opacity duration-300" />
                              <span className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 text-[9px] font-mono text-zinc-300">{doc.duration}</span>
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-between text-left">
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap gap-1">
                                  {doc.tags && doc.tags.map(t => (
                                    <span key={t} className="text-[8px] font-mono text-cyan-400 bg-cyan-950/20 border border-cyan-900/10 px-1.5 py-0.2 uppercase">{t}</span>
                                  ))}
                                </div>
                                <h4 className="text-xs font-bold text-white uppercase group-hover:text-cyan-400 transition-colors">{doc.title}</h4>
                                <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">{doc.desc}</p>
                              </div>
                              <div className="flex justify-between items-center text-[9px] font-mono text-zinc-650 pt-3 border-t border-zinc-950 mt-3">
                                <span>{doc.authors}</span>
                                <button
                                  onClick={() => {
                                    setPlayingDoc(doc);
                                    setLoadingVideo(true);
                                    setTimeout(() => setLoadingVideo(false), 800);
                                  }}
                                  className="text-cyan-400 hover:text-white flex items-center gap-1 cursor-pointer bg-transparent border-none outline-none font-bold"
                                >
                                  <Play size={10} /> REPRODUCIR
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* VIEW: ACADEMIA DE FORMACIÓN (AFI) */}
                {activeTab === 'afi' && (
                  <div className="space-y-6 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-[#0099ff] font-bold uppercase bg-cyan-950/20 border border-cyan-800/10 px-2.5 py-0.5">Formación Académica</span>
                      <h2 className="text-base font-black text-white uppercase mt-1.5 font-sans">Academia de Formación Científica (AFI)</h2>
                      <p className="text-xs text-zinc-400">
                        Inscríbase de forma gratuita en los cursos especializados de formación científica del IICS.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left column: Courses list */}
                      <div className="lg:col-span-7 space-y-4">
                        <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider border-b border-zinc-900 pb-1">
                          Cursos Disponibles ({courses.length})
                        </h4>
                        {loadingCourses ? (
                          <div className="text-center py-8 text-xs text-cyan-400 font-mono">Cargando cursos desde Supabase...</div>
                        ) : courses.length > 0 ? (
                          <div className="grid grid-cols-1 gap-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                            {courses.map(c => (
                              <div key={c.id} className="bg-[#030304] border border-zinc-900 p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wider">Materia Académica</span>
                                    <h5 className="text-sm font-extrabold text-white uppercase">{c.title}</h5>
                                  </div>
                                  <span className="px-2 py-0.5 text-[9px] font-bold font-mono uppercase bg-cyan-950/20 text-cyan-400 border border-cyan-800/10">
                                    {c.modality || 'Virtual'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-400 line-clamp-3">{c.description || 'Sin descripción disponible.'}</p>
                                <div className="flex justify-between items-center text-[10px] text-zinc-550 pt-2 border-t border-zinc-950 font-mono">
                                  <span>Duración: {c.duration || '4 semanas'}</span>
                                  <button
                                    onClick={() => setAfiForm({ ...afiForm, courseId: c.id })}
                                    className="text-cyan-400 hover:text-white cursor-pointer bg-transparent border-none font-bold"
                                  >
                                    Seleccionar Curso ➔
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-xs text-zinc-500 font-mono">No hay cursos publicados actualmente.</div>
                        )}
                      </div>

                      {/* Right column: Enrollment form */}
                      <div className="lg:col-span-5 bg-[#050506] border border-zinc-900 p-5 space-y-4">
                        <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider border-b border-zinc-900 pb-1 flex items-center gap-1.5">
                          <GraduationCap className="h-4.5 w-4.5 text-[#0099ff]" />
                          Postulación a AFI (Público General)
                        </h4>

                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!afiForm.fullName || !afiForm.email || !afiForm.courseId) {
                              alert('Por favor, determine los campos requeridos (*).');
                              return;
                            }
                            setSubmittingAfi(true);
                            try {
                              const { error } = await supabase
                                .from('training_applicants')
                                .insert({
                                  full_name: afiForm.fullName,
                                  email: afiForm.email,
                                  phone: afiForm.phone,
                                  institution: afiForm.institution,
                                  course_id: afiForm.courseId,
                                  status: 'Pending'
                                });
                              if (error) throw error;
                              alert('¡Solicitud de matrícula registrada con éxito! El comité evaluará su vacante.');
                              setAfiForm({ fullName: '', email: '', phone: '', institution: '', courseId: '' });
                            } catch (e) {
                              console.error(e);
                              alert('Hubo un error al procesar su postulación.');
                            } finally {
                              setSubmittingAfi(false);
                            }
                          }}
                          className="space-y-4"
                        >
                          <div className="space-y-1.5">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-550 uppercase block">Nombre Completo *</label>
                            <input
                              type="text"
                              required
                              value={afiForm.fullName}
                              onChange={e => setAfiForm({ ...afiForm, fullName: e.target.value })}
                              className="w-full bg-[#030304] border border-zinc-850 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none uppercase"
                              placeholder="Ej. Juan Pérez"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-555 uppercase block">Correo Electrónico *</label>
                            <input
                              type="email"
                              required
                              value={afiForm.email}
                              onChange={e => setAfiForm({ ...afiForm, email: e.target.value })}
                              className="w-full bg-[#030304] border border-zinc-850 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none"
                              placeholder="juan.perez@example.com"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-555 uppercase block">Teléfono / WhatsApp</label>
                            <input
                              type="text"
                              value={afiForm.phone}
                              onChange={e => setAfiForm({ ...afiForm, phone: e.target.value })}
                              className="w-full bg-[#030304] border border-zinc-850 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none"
                              placeholder="+51 987654321"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-555 uppercase block">Institución de procedencia</label>
                            <input
                              type="text"
                              value={afiForm.institution}
                              onChange={e => setAfiForm({ ...afiForm, institution: e.target.value })}
                              className="w-full bg-[#030304] border border-zinc-850 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none uppercase"
                              placeholder="Particular / Universidad / Empresa"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-555 uppercase block">Seleccione el Curso *</label>
                            <select
                              required
                              value={afiForm.courseId}
                              onChange={e => setAfiForm({ ...afiForm, courseId: e.target.value })}
                              className="w-full bg-[#030304] border border-zinc-850 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none cursor-pointer text-left"
                            >
                              <option value="">-- Elija un curso --</option>
                              {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="submit"
                            disabled={submittingAfi}
                            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-mono text-[10px] uppercase font-black tracking-widest transition-all cursor-pointer rounded-none"
                          >
                            {submittingAfi ? 'Enviando Solicitud...' : 'Enviar Solicitud de Vacante'}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'consulting' && (
                  <div className="space-y-8 text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Header */}
                    <div className="space-y-2 border-b border-zinc-900 pb-5">
                      <span className="text-[9px] font-mono tracking-widest text-cyan-400 font-bold uppercase bg-cyan-950/20 border border-cyan-800/10 px-2.5 py-0.5">
                        Sostenibilidad Científica Privada
                      </span>
                      <h2 className="text-xl font-black text-white uppercase mt-1.5 font-sans tracking-tight">
                        Consultoría de Precisión & Sostenibilidad
                      </h2>
                      <p className="text-xs text-zinc-400 leading-relaxed max-w-4xl font-sans">
                        El IICS es un{' '}
                        <strong className="text-zinc-100 font-extrabold">
                          instituto científico privado e independiente
                        </strong>
                        . Financiamos el sostenimiento técnico del{' '}
                        <em className="text-cyan-400 font-sans not-italic font-bold">
                          Observatorio Regional
                        </em>{' '}
                        y el{' '}
                        <em className="text-cyan-400 font-sans not-italic font-bold">
                          Laboratorio de Sociología Digital
                        </em>{' '}
                        a través de consultorías especializadas de alta precisión para el sector privado, cooperación internacional y desarrollo territorial.
                      </p>
                    </div>

                    {/* Main Layout Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      {/* Left Column (8 cols): Projects Tracker / Empty State */}
                      <div className="lg:col-span-8 space-y-6">
                        <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                          <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <Activity className="h-4 w-4 text-cyan-400" />
                            Mis Proyectos & Consultorías Solicitadas
                          </h3>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {userProposals.length} Registros
                          </span>
                        </div>

                        {loadingProposals ? (
                          <div className="py-12 flex justify-center items-center border border-zinc-900">
                            <Clock className="h-5 w-5 text-cyan-400 animate-spin mr-2" />
                            <span className="text-xs text-zinc-500 font-mono uppercase">Cargando proyectos...</span>
                          </div>
                        ) : userProposals.length === 0 ? (
                          <div className="py-16 px-6 text-center border border-dashed border-zinc-900 bg-zinc-950/20 flex flex-col items-center justify-center space-y-4">
                            <div className="p-4 bg-zinc-900 border border-zinc-800 text-zinc-600 animate-pulse">
                              <Briefcase className="h-8 w-8" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">No tienes proyectos o consultorías activas</h4>
                              <p className="text-[11px] text-zinc-500 max-w-md mx-auto leading-relaxed">
                                Desde aquí podrás seguir en tiempo real la valorización (precio), el estado comercial y la fase operativa de tus proyectos.
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                const formEl = document.getElementById('solicitar-consultoria-form');
                                if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="px-4 py-2 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-black font-mono text-[9px] uppercase font-black tracking-widest transition-all rounded-none cursor-pointer"
                            >
                              Solicitar Nueva Consultoría
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4">
                            {userProposals.map((p) => {
                              // Phase percentages helper
                              const getPercent = (fase: string) => {
                                switch (fase) {
                                  case 'Diseño Metodológico': return 20;
                                  case 'Trabajo de Campo': return 40;
                                  case 'Análisis de Datos / NLP': return 65;
                                  case 'Entregable Final': return 85;
                                  case 'Completado': return 100;
                                  default: return 5;
                                }
                              };
                              const pct = getPercent(p.fase);

                              return (
                                <div key={p.id} className="bg-[#030304] border border-zinc-900 hover:border-zinc-800 p-5 space-y-4 transition-all">
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                    <div>
                                      <h4 className="text-sm font-extrabold text-white uppercase tracking-wide leading-tight">{p.title}</h4>
                                      <span className="text-[9px] text-zinc-500 font-mono mt-1 block">
                                        Registrado: {new Date(p.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                                      </span>
                                    </div>
                                    <div className="shrink-0">
                                      <span className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase border ${
                                        p.status === 'Aprobada' ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400' :
                                        p.status === 'En Negociación' ? 'bg-amber-950/20 border-amber-900/40 text-amber-400' :
                                        p.status === 'Rechazada' ? 'bg-red-950/20 border-red-900/40 text-red-400' :
                                        'bg-zinc-900 border-zinc-800 text-zinc-400'
                                      }`}>
                                        {p.status === 'Borrador' ? 'En Evaluación' : p.status}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="space-y-1 text-xs">
                                    <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block">Alcance Técnico del Requerimiento</span>
                                    <p className="text-zinc-400 leading-relaxed font-sans text-[11px] whitespace-pre-line">{p.description}</p>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-zinc-900/60 items-end">
                                    <div>
                                      <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block mb-0.5">Valorización Asignada</span>
                                      {Number(p.value) === 0 ? (
                                        <div className="flex items-center text-amber-500/95 gap-1.5 font-mono text-[10px] uppercase font-bold animate-pulse">
                                          <Clock className="h-3.5 w-3.5" />
                                          <span>Pendiente de Valorización</span>
                                        </div>
                                      ) : (
                                        <span className="text-base font-black text-white font-mono">
                                          S/ {Number(p.value).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                        </span>
                                      )}
                                    </div>

                                    <div>
                                      <div className="flex justify-between text-[8px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">
                                        <span>Fase: {p.fase || 'No Iniciado'}</span>
                                        <span>{pct}%</span>
                                      </div>
                                      <div className="w-full h-1 bg-zinc-900 rounded-none overflow-hidden border border-zinc-800/40">
                                        <div 
                                          className={`h-full transition-all duration-500 ${
                                            p.status === 'Rechazada' ? 'bg-red-900' : 'bg-cyan-500'
                                          }`} 
                                          style={{ width: `${pct}%` }} 
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Right Column (4 cols): Solicitar form */}
                      <div id="solicitar-consultoria-form" className="lg:col-span-4 bg-[#050506] border border-zinc-900 p-5 space-y-4 text-left">
                        <div className="space-y-1">
                          <h4 className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider border-b border-zinc-900 pb-1.5 flex items-center gap-1.5">
                            <PlusCircle className="h-4.5 w-4.5 text-cyan-400" />
                            Nueva Solicitud de Proyecto
                          </h4>
                          <p className="text-[10px] text-zinc-550 leading-relaxed font-mono">
                            Asociado a tu cuenta corporativa: <span className="text-zinc-400 font-bold">{user?.email}</span>
                          </p>
                        </div>

                        <form onSubmit={handleRegisterProposal} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-500 uppercase block">Nombre de Empresa o Entidad *</label>
                            <input
                              type="text"
                              required
                              value={proposalForm.clientName}
                              onChange={e => setProposalForm({ ...proposalForm, clientName: e.target.value })}
                              className="w-full bg-[#030304] border border-zinc-855 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none uppercase transition-all"
                              placeholder="Ej. Minera Michiquillay o Entidad Privada"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-500 uppercase block">Título del Proyecto / Asunto *</label>
                            <input
                              type="text"
                              required
                              value={proposalForm.title}
                              onChange={e => setProposalForm({ ...proposalForm, title: e.target.value })}
                              className="w-full bg-[#030304] border border-zinc-855 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none uppercase transition-all"
                              placeholder="Ej. Catastro SIG Hualgayoc"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-500 uppercase block">Alcance, Objetivos y Requerimiento *</label>
                            <textarea
                              value={proposalForm.description}
                              onChange={e => setProposalForm({ ...proposalForm, description: e.target.value })}
                              required
                              rows={6}
                              className="w-full bg-[#030304] border border-zinc-855 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none resize-none transition-all"
                              placeholder="Describa a detalle las necesidades del servicio, la zona geográfica o comunidad, y los resultados esperados..."
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={submittingProposal}
                            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-mono text-[10px] uppercase font-black tracking-widest transition-all cursor-pointer rounded-none"
                          >
                            {submittingProposal ? 'Procesando Requerimiento...' : 'Enviar Solicitud al IICS'}
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Specialties Section - Shifted to Bottom as a minor showcase */}
                    <div className="space-y-4 pt-6 border-t border-zinc-900">
                      <h4 className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                        Nuestras Especialidades Científicas & Capacidades
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          {
                            title: 'Inteligencia Territorial & GIS',
                            desc: 'Modelamiento geoespacial, catastro multitemporal, cartografía social de disputas y análisis mediante drones y QGIS.',
                            icon: MapPin
                          },
                          {
                            title: 'Ciencia de Datos & NLP Social',
                            desc: 'Minería de opinión pública en tiempo real mediante algoritmos NLP y análisis de sentimientos de precisión territorial.',
                            icon: LineChart
                          },
                          {
                            title: 'Estudios de Impacto & RC',
                            desc: 'Diagnósticos socioeconómicos de línea base, etnografía directa y mediación científica de conflictos para el sector extractivo.',
                            icon: Landmark
                          },
                          {
                            title: 'Capacitación Metodológica',
                            desc: 'Programas corporativos avanzados y diseño metodológico en Atlas.ti, QGIS y sociología digital de precisión.',
                            icon: BookOpen
                          }
                        ].map((svc, idx) => {
                          const SvcIcon = svc.icon;
                          return (
                            <div key={idx} className="bg-[#030304]/60 border border-zinc-900 p-4 space-y-2 hover:border-zinc-800 transition-all flex flex-col justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-zinc-900 border border-zinc-800 text-cyan-400">
                                  <SvcIcon className="h-4 w-4" />
                                </div>
                                <h5 className="text-[11px] font-extrabold text-white uppercase tracking-wider">{svc.title}</h5>
                              </div>
                              <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">{svc.desc}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}


                {/* VIEW: DATOS & ENCUESTAS */}
                {activeTab === 'data' && (
                  <div className="space-y-8 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-cyan-400 font-bold uppercase bg-cyan-950/20 border border-cyan-800/10 px-2.5 py-0.5">Repositorio IICS</span>
                      <h2 className="text-base font-black text-white uppercase mt-1.5 font-sans">Indicadores Estadísticos & Datasets</h2>
                      <p className="text-xs text-zinc-400">Datos secundarios cargados desde INEI, MINEM, Defensoría del Pueblo y ANA-SENAMHI. Encuestas de percepción y repositorio de datasets de campo del IICS.</p>
                    </div>

                    {/* ── A: Indicadores por Fuente ─────────────────── */}
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest border-b border-zinc-900 pb-2">
                        A — Indicadores Estadísticos Externos
                      </h3>
                      {statIndicators.length === 0 ? (
                        <div className="py-10 text-center border border-dashed border-zinc-900">
                          <span className="material-symbols-outlined notranslate text-zinc-700 text-4xl block mb-2" translate="no">analytics</span>
                          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Sin indicadores cargados aún — usa el módulo "Ingesta de Datos" del admin.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Stats row */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { label: 'Total Indicadores', value: statIndicators.length, color: 'text-cyan-400' },
                              { label: 'Fuentes', value: [...new Set(statIndicators.map((i:any) => i.fuente))].length, color: 'text-emerald-400' },
                              { label: 'Provincias', value: [...new Set(statIndicators.map((i:any) => i.provincia))].length, color: 'text-yellow-400' },
                              { label: 'Periodos', value: [...new Set(statIndicators.map((i:any) => i.periodo))].length, color: 'text-purple-400' },
                            ].map(s => (
                              <div key={s.label} className="bg-black border border-zinc-900 p-3">
                                <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest">{s.label}</p>
                                <p className={`text-2xl font-light mt-1 ${s.color}`}>{s.value}</p>
                              </div>
                            ))}
                          </div>
                          {/* Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-zinc-900">
                                  {['Provincia','Fuente','Categoría','Indicador','Valor','Período'].map(h => (
                                    <th key={h} className="pb-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest pr-4">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {statIndicators.map((item: any) => (
                                  <tr key={item.id} className="border-b border-zinc-950 hover:bg-white/[0.01] transition-colors">
                                    <td className="py-2 pr-4 text-[11px] text-cyan-400 font-bold">{item.provincia}</td>
                                    <td className="py-2 pr-4 text-[11px] text-zinc-300 font-mono">{item.fuente}</td>
                                    <td className="py-2 pr-4">
                                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400">{item.categoria}</span>
                                    </td>
                                    <td className="py-2 pr-4 text-[11px] text-white max-w-[200px] truncate">{item.indicador}</td>
                                    <td className="py-2 pr-4 text-[11px] text-emerald-400 font-bold font-mono">{item.valor} {item.unidad}</td>
                                    <td className="py-2 pr-4 text-[11px] text-zinc-500 font-mono">{item.periodo}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-wide text-right">
                            {statIndicators.length} registros — IICS BD — Actualizado en tiempo real
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ── B: Datasets del Repositorio ───────────────── */}
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest border-b border-zinc-900 pb-2">
                        B — Repositorio de Datasets de Campo
                      </h3>
                      {researchDatasets.length === 0 ? (
                        <div className="py-10 text-center border border-dashed border-zinc-900">
                          <span className="material-symbols-outlined notranslate text-zinc-700 text-4xl block mb-2" translate="no">folder_open</span>
                          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Sin datasets registrados — usa el módulo "Ingesta de Datos" del admin.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {researchDatasets.map((ds: any) => (
                            <div key={ds.id} className="bg-[#030304] border border-zinc-900 p-4 flex flex-col justify-between min-h-[200px] hover:border-zinc-800 transition-all">
                              <div className="space-y-1.5 text-left">
                                <div className="flex items-center justify-between text-[10px] font-mono">
                                  <span className="text-cyan-400 font-extrabold block uppercase">{ds.categoria}</span>
                                  <span className="text-zinc-500 block">{ds.size_mb ? `${ds.size_mb} MB` : '—'}</span>
                                </div>
                                <h5 className="text-xs font-bold text-white font-mono break-all leading-snug">{ds.filename}</h5>
                                <p className="text-[11px] text-zinc-400 leading-normal line-clamp-2">{ds.descripcion}</p>
                                {ds.hash_sha256 && (
                                  <div className="flex items-center gap-1 bg-black border border-zinc-950 p-2 text-[9px] font-mono text-zinc-600">
                                    <span className="truncate flex-1">SHA256: {ds.hash_sha256.slice(0,20)}…</span>
                                    <button onClick={() => navigator.clipboard.writeText(ds.hash_sha256)}
                                      className="text-cyan-600 hover:text-white cursor-pointer bg-transparent border-none outline-none flex-shrink-0" title="Copiar Hash">
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="mt-4 pt-3 border-t border-zinc-950">
                                {ds.download_url ? (
                                  <a href={ds.download_url} target="_blank" rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider transition-all">
                                    <Download className="h-3.5 w-3.5" /> Descargar Dataset
                                  </a>
                                ) : (
                                  <button disabled className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-zinc-950 border border-zinc-900 text-[10px] font-mono font-bold text-zinc-700 uppercase cursor-not-allowed">
                                    <Download className="h-3.5 w-3.5" /> Sin URL de descarga
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── C: Encuestas Publicadas ────────────────────── */}
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest border-b border-zinc-900 pb-2">
                        C — Encuestas de Percepción Ciudadana
                      </h3>
                      <div className="bg-zinc-950/50 border border-zinc-900 p-5 flex flex-col md:flex-row items-start md:items-center gap-4">
                        <span className="material-symbols-outlined notranslate text-yellow-400 text-3xl flex-shrink-0" translate="no">poll</span>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-white uppercase tracking-wider">Encuestas de campo IICS</p>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">
                            Las encuestas de percepción ciudadana sobre confianza institucional, cohesión agraria, riesgo ambiental
                            y malestar social territorial son gestionadas desde el módulo <span className="text-white font-mono">Encuestas</span> del sistema interno.
                            Sus resultados agregados estarán visibles aquí una vez publicados.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW 7: SYSTEM AUDIT & PARAMETERS (SETTINGS) */}
                {activeTab === 'settings' && (

                  <div className="space-y-6 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-[#0099ff] font-bold uppercase bg-cyan-950/20 border border-cyan-800/10 px-2.5 py-0.5">Parámetros Centrales</span>
                      <h2 className="text-base font-black text-white uppercase mt-1.5 font-sans">Panel de Auditoría del Servidor</h2>
                      <p className="text-xs text-zinc-400">
                        Inspección interna de los endpoints de la API de escucha, los sockets de georreferencia, parámetros del modelo de Procesamiento de Lenguaje Natural (NLP).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                      
                      {/* Telemetry live simulation logs */}
                      <div className="md:col-span-8 bg-black border border-zinc-900 p-5 rounded-none flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-2">
                          <span className="text-xs font-bold font-mono text-white uppercase flex items-center gap-1.5">
                            <Activity className="h-4 w-4 text-cyan-400" />
                            Registro de Telemetría Compartida del Sistema
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500">Filtrando: ALL_SYSTEM_SOCKETS</span>
                        </div>

                        <div className="bg-[#030304] border border-zinc-950 p-3.5 font-mono text-[10.5px] space-y-2.5 max-h-[220px] overflow-y-auto leading-relaxed">
                          {telemetryLogs.map((log, idx) => (
                            <div key={idx} className="flex gap-2 text-left">
                              <span className="text-zinc-600 shrink-0">[{log.ts}]</span>
                              <span className={`font-extrabold font-mono shrink-0 ${
                                log.level === 'error' ? 'text-red-400' :
                                log.level === 'warn'  ? 'text-yellow-400' :
                                'text-cyan-500'
                              }`}>[{log.svc}]</span>
                              <span className="text-zinc-300 break-all">{log.msg}</span>
                            </div>
                          ))}
                          {systemLogs.length === 0 && (
                            <div className="text-zinc-700 italic text-[10px]">
                              Ejecuta la migración SQL para poblar system_logs con eventos reales.
                            </div>
                          )}
                        </div>

                        <div className="bg-cyan-950/10 border border-cyan-850/20 p-3 rounded-none text-[10px] text-zinc-400 flex items-center gap-2 mt-4">
                          <Cpu className="h-4.5 w-4.5 text-cyan-400 shrink-0" />
                          <span>Motor de Escucha Social activo: clasificación de sentimientos aplicada sobre <code className="text-cyan-400">social_listening</code> · Supabase PostgreSQL · IICS 2026.</span>
                        </div>
                      </div>

                      {/* Right credentials panel */}
                      <div className="md:col-span-4 bg-[#050506]/80 border border-zinc-900 p-5 rounded-none flex flex-col justify-between text-left font-sans text-xs">
                        <div className="space-y-4">
                          <div className="border-b border-zinc-900 pb-2 mb-2">
                            <span className="text-[9px] font-mono text-zinc-550 uppercase font-black">Estado del Clúster</span>
                            <h4 className="font-extrabold text-white uppercase mt-1">Nodos Computacionales</h4>
                          </div>

                          <div className="divide-y divide-zinc-900 text-[11px] space-y-2">
                            <div className="pt-2 flex justify-between">
                              <span className="text-zinc-500">Servidor API principal:</span>
                              <span className="text-emerald-450 font-mono font-bold">CONECTADO</span>
                            </div>
                            <div className="pt-2 flex justify-between">
                              <span className="text-zinc-500">Base de Datos Supabase:</span>
                              <span className="text-emerald-450 font-mono font-bold">CONECTADO (PostgreSQL)</span>
                            </div>
                            <div className="pt-2 flex justify-between">
                              <span className="text-zinc-500">Cuádruple Hélice Auth:</span>
                              <span className="text-emerald-455 font-mono font-bold">HABILITADA</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-900">
                          <span className="block text-[8.5px] font-mono text-zinc-650 leading-relaxed uppercase">La autenticación se realiza mediante firmas RSA cifradas y cifrado TLS de extremo a extremo.</span>
                        </div>
                      </div>

                    </div>

                  </div>
                )}

              </motion.div>
            </AnimatePresence>

          </div>

          {/* INSTANT FOOTER AT THE VERY BOTTOM OF THE WORKSPACE SCREEN */}
          <div className="border-t border-zinc-900 bg-black/40 py-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left select-none text-[10px] text-zinc-550 shrink-0">
            <p className="font-mono uppercase font-semibold">
              IICS • Corporación Privada e Independiente © 2026 • Analista Conectado
            </p>
            <p className="font-mono uppercase text-zinc-600 font-bold">
              CONSOLA DE INVESTIGACIÓN DE VANGUARDIA SOCIAL
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
